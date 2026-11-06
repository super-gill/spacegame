import { asteroidStates, cargoUsed, holdCapacity, IMPACT_SAFE_DELTA_V, incomingMunitions, type NavReadout, type Ship, type ShipStats, type Vec2, type World, type WorldEvent } from '@spacegame/sim';

/**
 * Warnings (docs/interface.md, "Audible warnings"). Two kinds:
 *
 * - **Conditions** hold for as long as something is true (shields down,
 *   a missile coming, a rock ahead). They show in the banner at the top
 *   centre, highest tier first, and sound when they start.
 * - **Event sounds** mark something that just happened (a lock complete,
 *   a drone lost). Their message is the toast the client already shows
 *   (ui.ts), so they only add a sound and never sit in the banner.
 *
 * Everything here reads the world the client has, so a warning never
 * knows more than the pilot's own view.
 */

export type Tier = 'alarm' | 'warning' | 'caution' | 'advisory';

export const TIER_ORDER: readonly Tier[] = ['alarm', 'warning', 'caution', 'advisory'];

/** Something true now, with the banner line that says so. `key` stays the same while it holds. */
export interface Condition {
  key: string;
  tier: Tier;
  text: string;
}

/** Thresholds. Working numbers, to tune in play. */
export const WARNING_TUNING = {
  /** Hull under this share: warning; under `hullCritical`: alarm. The dial's ring changes colour at the same points. */
  hullLow: 0.5,
  hullCritical: 0.25,
  /** Shields under this share: caution; at nothing: warning. */
  shieldLow: 0.25,
  /** A munition this many seconds from you: alarm. */
  munitionImpactSeconds: 2,
  /** Collision this many seconds ahead at your present velocity: caution, warning, alarm. */
  collisionCaution: 6,
  collisionWarning: 3,
  collisionAlarm: 1.5,
  /** Only obstacles this close are tested for collision, units. */
  collisionReach: 2500,
  /** Capacitor under this many units counts as empty. */
  capacitorEmpty: 1,
};

/**
 * Every condition holding for the pilot's `ship` now, highest tier first.
 * `nav` is its nav readout (gravity tiers), or null without a nav computer.
 */
export function conditions(world: World, ship: Ship, stats: ShipStats, nav: NavReadout | null): Condition[] {
  if (ship.state !== 'flying') return [];
  const out: Condition[] = [];
  const t = WARNING_TUNING;

  // Munitions homing on you.
  const inbound = incomingMunitions(world.munitions, ship.id);
  if (inbound.length > 0) {
    const torpedo = inbound.some((m) => world.goods[m.goodId]?.munition?.class === 'torpedo');
    const what = torpedo ? 'TORPEDO' : 'MISSILE';
    const soonest = Math.min(...inbound.map((m) => secondsToReach(m.position, m.velocity, ship.position, ship.velocity, stats.radius)));
    const nearest = Math.min(...inbound.map((m) => distance(m.position, ship.position)));
    if (soonest <= t.munitionImpactSeconds) out.push({ key: 'munitionImpact', tier: 'alarm', text: `${what} IMPACT · C COUNTERMEASURE` });
    else out.push({ key: 'munitionInbound', tier: 'warning', text: `${what} INBOUND ×${inbound.length} · ${Math.round(nearest).toLocaleString('en-GB')} u · C COUNTERMEASURE` });
  }

  // Hull and shields.
  const hull = stats.structure > 0 ? ship.structure / stats.structure : 1;
  if (hull < t.hullCritical) out.push({ key: 'hull', tier: 'alarm', text: 'HULL CRITICAL' });
  else if (hull < t.hullLow) out.push({ key: 'hull', tier: 'warning', text: 'HULL LOW' });
  if (stats.shield > 0) {
    if (ship.shield <= 0) out.push({ key: 'shield', tier: 'warning', text: 'SHIELDS DOWN' });
    else if (ship.shield / stats.shield < t.shieldLow) out.push({ key: 'shield', tier: 'caution', text: 'SHIELDS LOW' });
  }

  // Someone locking you, or locked on.
  const lockers = Object.values(world.ships).filter((s) => s.id !== ship.id && s.state === 'flying' && s.locks.some((l) => l.targetId === ship.id));
  if (lockers.length > 0) {
    const locked = lockers.some((s) => s.locks.some((l) => l.targetId === ship.id && l.progress >= 1));
    const count = lockers.length > 1 ? ` ×${lockers.length}` : '';
    out.push({ key: 'lockedOn', tier: 'warning', text: locked ? `TARGET LOCK ON YOU${count}` : `BEING LOCKED${count}` });
  }

  // Collision ahead at your present velocity.
  const crash = soonestCollision(world, ship, stats);
  if (crash) {
    const tier: Tier | null = crash.seconds <= t.collisionAlarm ? 'alarm' : crash.seconds <= t.collisionWarning ? 'warning' : crash.seconds <= t.collisionCaution ? 'caution' : null;
    if (tier) out.push({ key: 'collision', tier, text: `COLLISION · ${crash.what} · ${crash.seconds.toFixed(1)} s` });
  }

  // Hunted.
  if (Object.values(world.npcs).some((b) => b.kind === 'pirate' && b.mode === 'hunt' && b.targetId === ship.id)) {
    out.push({ key: 'hunted', tier: 'caution', text: 'PIRATE HUNTING YOU' });
  }

  // Performance limits: only when the ship cannot do what you asked.
  if (stats.capacitor > 0 && ship.capacitor < t.capacitorEmpty) out.push({ key: 'capacitor', tier: 'caution', text: 'CAPACITOR EMPTY · SHIELDS AND AFTERBURNER OUT' });
  if (ship.tractorActive && cargoUsed(ship) >= holdCapacity(stats)) out.push({ key: 'holdFull', tier: 'caution', text: 'HOLD FULL · THE TRACTOR HAS NOWHERE TO PUT IT' });
  const gravity = nav?.gravity;
  if (gravity && gravity.tier !== 'none' && gravity.bodyId) {
    const name = (world.bodies[gravity.bodyId]?.name ?? 'BODY').toUpperCase();
    const say = { advisory: `GRAVITY WELL · ${name}`, caution: `GRAVITY · ${name} PULLING HARD`, warning: `GRAVITY · CLIMB NOW`, alarm: `GRAVITY · CANNOT ESCAPE ${name}` }[gravity.tier];
    out.push({ key: 'gravity', tier: gravity.tier, text: say });
  }

  return out.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
}

/**
 * The sounds for one update's events about the pilot's ship: each a tier.
 * The words are the toasts ui.ts already shows.
 */
export function eventSounds(events: readonly WorldEvent[], shipId: string, world: World): Tier[] {
  const out: Tier[] = [];
  for (const e of events) {
    if (e.type === 'destroyed' && e.by === shipId) out.push('advisory');
    if (e.shipId !== shipId && !(e.type === 'droneLost' && world.ships[e.shipId]?.motherId === shipId)) continue;
    switch (e.type) {
      case 'locked':
      case 'dronesLaunched':
      case 'droneStowed':
      case 'surveyed':
      case 'dockRefused':
        out.push('advisory');
        break;
      case 'droneLost':
      case 'outOfAmmo':
        out.push('caution');
        break;
      default:
        break;
    }
  }
  return out;
}

/** Which rock or station is about to be hit, and how soon, at the ship's present velocity; null if nothing within the caution horizon. */
export function soonestCollision(world: World, ship: Ship, stats: ShipStats): { what: string; seconds: number } | null {
  const reach = WARNING_TUNING.collisionReach;
  const horizon = WARNING_TUNING.collisionCaution;
  let best: { what: string; seconds: number } | null = null;
  const consider = (what: string, position: Vec2, velocity: Vec2, radius: number): void => {
    if (distance(position, ship.position) > reach) return;
    const rel = { x: ship.velocity.x - velocity.x, y: ship.velocity.y - velocity.y };
    // A bump slower than this does no harm (collision.ts): no need to shout.
    if (Math.hypot(rel.x, rel.y) < IMPACT_SAFE_DELTA_V) return;
    const seconds = secondsToReach(ship.position, rel, position, { x: 0, y: 0 }, radius + stats.radius);
    if (seconds <= horizon && (!best || seconds < best.seconds)) best = { what, seconds };
  };
  const rocks = asteroidStates(world.bodies, world.asteroids, world.tick, world.dt);
  world.asteroids.forEach((a, i) => consider('ROCK', rocks[i]!.position, rocks[i]!.velocity, a.radius));
  for (const s of Object.values(world.stations)) consider('STATION', s.position, s.velocity, s.radius);
  // Not other ships: they steer, and a fighter's attack run looks like a
  // collision on a straight line every pass (seen in the arena, 6 November 2026).
  return best;
}

/**
 * Seconds until something at `from` moving at `velocity` comes within
 * `radius` of something at `to` moving at `toVelocity`; Infinity if it
 * never does. Already within `radius`: 0.
 */
export function secondsToReach(from: Vec2, velocity: Vec2, to: Vec2, toVelocity: Vec2, radius = 0): number {
  const p = { x: to.x - from.x, y: to.y - from.y };
  const v = { x: velocity.x - toVelocity.x, y: velocity.y - toVelocity.y };
  const c = p.x * p.x + p.y * p.y - radius * radius;
  if (c <= 0) return 0;
  const a = v.x * v.x + v.y * v.y;
  if (a < 1e-9) return Infinity;
  const b = p.x * v.x + p.y * v.y;
  // |p - v t| = radius: a t^2 - 2 b t + c = 0; the earlier root, if real and ahead.
  const disc = b * b - a * c;
  if (b <= 0 || disc < 0) return Infinity;
  return (b - Math.sqrt(disc)) / a;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
