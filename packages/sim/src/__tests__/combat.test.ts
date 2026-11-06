import { describe, expect, it } from 'vitest';
import { PIRATE_TUNING } from '../ai/pirate.js';
import { applyDamage, fireWeapons, regenerateShield, stepProjectiles } from '../combat.js';
import { collideShips, collideWithStations } from '../collision.js';
import { CARGO_SURVIVAL_FRACTION, FIXED_DT, IMPACT_SAFE_DELTA_V, LOOT_LIFETIME } from '../constants.js';
import { MODULES } from '../modules.js';

/** The starter's tractor reach (a Meridian Gleaner). */
const TRACTOR_RANGE = MODULES['meridian-gleaner-s']!.stats.tractorRange!;
import { buildShip } from '../factory.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { shipStats } from '../stats.js';
import { TEST_CATALOGUES, loadoutStats } from './fixtures.js';
import { stepWorld } from '../step.js';
import type { PirateBrain, Projectile, Ship, ShipStats, Station, World, WorldEvent } from '../types.js';
import { distance, length, sub } from '../vec2.js';
import { PLANET_ID } from '../bodies.js';
import { bodyVelocity } from '../rails.js';
import { isGun, WEAPONS, weaponDps } from '../weapons.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip, respawnPilot } from '../world.js';

const SECOND = 60;
/** Short names for the loadouts these tests build ships from. */
const FITS = { sparrow: 'aurel-tacet-dev', hauler: 'tessaract-trader', starter: 'meridian-starter', raider: 'kessari-raider' } as const;
const sparrow = loadoutStats(FITS.sparrow);
const hauler = loadoutStats(FITS.hauler);
const starter = loadoutStats(FITS.starter);
const statsOf = (s: Ship) => shipStats(TEST_CATALOGUES, s);

function ship(id: string, fit: keyof typeof FITS = 'sparrow', overrides: Partial<Ship> = {}): Ship {
  return {
    ...buildShip(TEST_CATALOGUES, {
      id,
      loadout: LOADOUTS[FITS[fit]]!,
      ownerId: null,
      position: { x: 0, y: 0 },
      heading: 0,
      flightMode: 'manual',
    }),
    ...overrides,
  };
}

/** A world with no NPCs or spawners and one pilot, for controlled combat tests. */
function quietWorld(): { w: World; me: string } {
  const base = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
  const w = joinPilot(base, 'ana', 'Ana');
  return { w, me: pilotShip(w, 'ana')!.id };
}

describe('weapon catalogue', () => {
  it('fixed guns hit harder per shot than swivels, and out-damage their own turreted version', () => {
    const all = Object.values(WEAPONS);
    // Launchers and dispensers are fixed but not guns: the rule is about guns.
    for (const fixed of all.filter((w) => w.kind === 'fixed' && isGun(w))) {
      for (const swivel of all.filter((w) => w.family === 'pointDefence')) {
        expect(fixed.damage).toBeGreaterThan(swivel.damage);
      }
      const turreted = WEAPONS[fixed.id.replace(/-(m|l)$/, '-turret-$1')];
      if (turreted && turreted !== fixed) expect(weaponDps(fixed)).toBeGreaterThan(weaponDps(turreted));
    }
  });

  it('the Aurel Tacet carries one fixed gun and one turret', () => {
    const s = ship('s');
    expect(s.weapons.map((w) => sparrow.weapons[w.mountId]!.kind).sort()).toEqual(['fixed', 'turret']);
  });
});

describe('firing', () => {
  it('fixed guns fire along the heading and inherit the ship velocity', () => {
    const s = ship('s', 'sparrow', { heading: Math.PI / 2, velocity: { x: 50, y: 0 } });
    const r = fireWeapons(s, sparrow, { ...emptyInput(), fireFixed: true }, () => null, FIXED_DT, 1);
    expect(r.projectiles).toHaveLength(1);
    const p = r.projectiles[0]!;
    expect(p.velocity.x).toBeCloseTo(50, 9);
    expect(p.velocity.y).toBeCloseTo(WEAPONS['pulse-laser-s']!.projectileSpeed, 9);
  });

  it('respects the fire interval', () => {
    let s = ship('s');
    let shots = 0;
    for (let i = 0; i < SECOND; i++) {
      const r = fireWeapons(s, sparrow, { ...emptyInput(), fireFixed: true }, () => null, FIXED_DT, i);
      s = r.ship;
      shots += r.projectiles.length;
    }
    const interval = WEAPONS['pulse-laser-s']!.fireInterval;
    expect(shots).toBeGreaterThanOrEqual(Math.floor(1 / interval) - 1);
    expect(shots).toBeLessThanOrEqual(Math.ceil(1 / interval) + 1);
  });

  const turretAim = (s: Ship) => s.weapons.find((w) => sparrow.weapons[w.mountId]!.kind === 'turret')!.aim;

  it('hot turrets slew towards the target no faster than their turn rate', () => {
    const s = ship('s', 'sparrow', { weaponsHot: true, locks: [{ targetId: 't', progress: 1 }], activeLock: 't' });
    const t = ship('t', 'sparrow', { position: { x: 0, y: 500 } });
    const r = fireWeapons(s, sparrow, emptyInput(), () => t, FIXED_DT, 1);
    expect(turretAim(r.ship)).toBeCloseTo(WEAPONS['swivel-s']!.turretTurnRate * FIXED_DT, 9);
    expect(r.projectiles).toEqual([]); // not on target yet
  });

  it('hot turrets fire by themselves once on target and in range', () => {
    let s = ship('s', 'sparrow', { weaponsHot: true, locks: [{ targetId: 't', progress: 1 }], activeLock: 't' });
    const t = ship('t', 'sparrow', { position: { x: 0, y: 400 } });
    let shots = 0;
    for (let i = 0; i < SECOND; i++) {
      const r = fireWeapons(s, sparrow, emptyInput(), () => t, FIXED_DT, i);
      s = r.ship;
      shots += r.projectiles.length;
    }
    expect(shots).toBeGreaterThan(2);
  });

  it('cold turrets never fire, and turrets never fire out of range', () => {
    const t = ship('t', 'sparrow', { position: { x: 400, y: 0 } });
    const far = ship('far', 'sparrow', { position: { x: 5000, y: 0 } });
    let cold = ship('s', 'sparrow', { weaponsHot: false, locks: [{ targetId: 't', progress: 1 }], activeLock: 't' });
    let outOfRange = ship('s', 'sparrow', { weaponsHot: true, locks: [{ targetId: 'far', progress: 1 }], activeLock: 'far' });
    let shots = 0;
    for (let i = 0; i < SECOND; i++) {
      const a = fireWeapons(cold, sparrow, emptyInput(), () => t, FIXED_DT, i);
      const b = fireWeapons(outOfRange, sparrow, emptyInput(), () => far, FIXED_DT, i);
      cold = a.ship;
      outOfRange = b.ship;
      shots += a.projectiles.length + b.projectiles.length;
    }
    expect(shots).toBe(0);
  });

  it('a fast target crossing close by can outrun a turret (tracking)', () => {
    // Target circling 60 units away at 300 u/s needs 5 rad/s of slew; the light turret has 4.
    const orbitRadius = 60;
    const speed = 300;
    let s = ship('s', 'sparrow', { weaponsHot: true, locks: [{ targetId: 't', progress: 1 }], activeLock: 't' });
    let worst = 0;
    for (let i = 0; i < SECOND * 2; i++) {
      const a = (i * FIXED_DT * speed) / orbitRadius;
      const t = ship('t', 'sparrow', {
        position: { x: Math.cos(a) * orbitRadius, y: Math.sin(a) * orbitRadius },
        velocity: { x: -Math.sin(a) * speed, y: Math.cos(a) * speed },
      });
      s = fireWeapons(s, sparrow, emptyInput(), () => t, FIXED_DT, i).ship;
      if (i > SECOND) worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(a - turretAim(s)), Math.cos(a - turretAim(s)))));
    }
    expect(worst).toBeGreaterThan(0.3);
  });
});

describe('projectiles', () => {
  const target = ship('t', 'sparrow', { position: { x: 300, y: 0 } });
  const shot = (overrides: Partial<Projectile> = {}): Projectile => ({
    id: 'p1',
    ownerShipId: 'shooter',
    position: { x: 290, y: -200 },
    velocity: { x: 0, y: 900 },
    damage: 6,
    damageType: 'kinetic',
    ticksLeft: 100,
    ...overrides,
  });

  it('hits a ship in its path even if it would skip past it in one tick', () => {
    // 900 u/s covers 15 units per tick; start just before the hull edge so the path crosses it.
    const r = stepProjectiles([shot({ position: { x: 300, y: -25 } })], { t: target }, HULLS, {}, FIXED_DT);
    expect(r.damage).toEqual([{ shipId: 't', amount: 6, by: 'shooter', cause: 'weapon', type: 'kinetic', from: { x: 300, y: -25 } }]);
    expect(r.projectiles).toEqual([]);
  });

  it('never hits the ship that fired it', () => {
    const own = ship('shooter', 'sparrow', { position: { x: 300, y: 0 } });
    const r = stepProjectiles([shot({ position: { x: 300, y: -25 } })], { shooter: own }, HULLS, {}, FIXED_DT);
    expect(r.damage).toEqual([]);
  });

  it('is absorbed by a station in the way', () => {
    const st: Station = { id: 'st', name: 'St', position: { x: 300, y: -10 }, velocity: { x: 0, y: 0 }, orbit: null, radius: 10, dockRange: 0, securityRadius: 0, market: {}, outfitting: false, pads: [], shipMart: [] };
    const r = stepProjectiles([shot({ position: { x: 300, y: -25 } })], { t: target }, HULLS, { st }, FIXED_DT);
    expect(r.damage).toEqual([]);
    expect(r.projectiles).toEqual([]);
  });

  it('fizzles when out of range', () => {
    const r = stepProjectiles([shot({ ticksLeft: 1 })], {}, HULLS, {}, FIXED_DT);
    expect(r.projectiles).toEqual([]);
  });
});

describe('damage and shields', () => {
  /** The Tacet's stats with nothing resisting, so damage sums are plain. */
  const bare: ShipStats = { ...sparrow, shieldResists: {}, armourResists: {} };

  it('takes damage on shields first, then structure', () => {
    const s = applyDamage(ship('s'), bare, bare.shield + 10, FIXED_DT);
    expect(s.shield).toBe(0);
    expect(s.structure).toBe(bare.structure - 10);
  });

  it('resists by damage type: shields stop heat, armour stops rounds', () => {
    const shielded: ShipStats = { ...bare, shieldResists: { thermal: 0.5 }, armourResists: { kinetic: 0.5 } };
    const heat = applyDamage(ship('s'), shielded, 20, FIXED_DT, 'thermal');
    expect(heat.shield).toBe(bare.shield - 10);
    const rounds = applyDamage({ ...ship('s'), shield: 0 }, shielded, 20, FIXED_DT, 'kinetic');
    expect(rounds.structure).toBe(bare.structure - 10);
  });

  it('recharges shields only after the delay, and never structure', () => {
    let s = applyDamage(ship('s'), bare, bare.shield + 10, FIXED_DT);
    for (let i = 0; i < SECOND * (bare.shieldRegenDelay - 0.5); i++) s = regenerateShield(s, bare, FIXED_DT);
    expect(s.shield).toBe(0);
    for (let i = 0; i < SECOND * 60; i++) s = regenerateShield(s, bare, FIXED_DT);
    expect(s.shield).toBe(bare.shield);
    expect(s.structure).toBe(bare.structure - 10);
  });

  it('shield recharge draws on the capacitor, and stops when it is empty', () => {
    const hit = applyDamage({ ...ship('s'), capacitor: 2 }, bare, 40, FIXED_DT);
    let s = hit;
    for (let i = 0; i < SECOND * 30; i++) s = regenerateShield(s, bare, FIXED_DT);
    expect(s.shield).toBeLessThan(bare.shield);
    expect(s.capacitor).toBeCloseTo(0, 6);
  });

  it('docked ships are repaired', () => {
    let { w, me } = quietWorld();
    const st = w.stations['station-harbour']!;
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'docked', dockedAt: st.id, structure: 10, shield: 0 } } };
    for (let i = 0; i < SECOND * 20; i++) w = stepWorld(w, {});
    expect(w.ships[me]!.structure).toBe(starter.structure);
    expect(w.ships[me]!.shield).toBe(starter.shield);
  });
});

describe('ramming', () => {
  it('a heavy ship ramming a light one comes off far better', () => {
    const heavy = ship('a-heavy', 'hauler', { position: { x: 0, y: 0 }, velocity: { x: 150, y: 0 } });
    const light = ship('b-light', 'sparrow', { position: { x: hauler.radius + sparrow.radius - 2, y: 0 } });
    const r = collideShips({ [heavy.id]: heavy, [light.id]: light }, statsOf);
    const dmg = (id: string) => r.damage.filter((d) => d.shipId === id).reduce((n, d) => n + d.amount, 0);
    expect(dmg('b-light')).toBeGreaterThan(dmg('a-heavy') * 3);
    expect(r.damage.every((d) => d.cause === 'ram')).toBe(true);
  });

  it('conserves momentum', () => {
    const a = ship('a', 'hauler', { velocity: { x: 120, y: 10 } });
    const b = ship('b', 'sparrow', { position: { x: 40, y: 5 }, velocity: { x: -60, y: 0 } });
    const before = { x: a.velocity.x * hauler.mass + b.velocity.x * sparrow.mass, y: a.velocity.y * hauler.mass + b.velocity.y * sparrow.mass };
    const r = collideShips({ a, b }, statsOf);
    const a2 = r.ships['a']!;
    const b2 = r.ships['b']!;
    expect(a2.velocity.x * hauler.mass + b2.velocity.x * sparrow.mass).toBeCloseTo(before.x, 6);
    expect(a2.velocity.y * hauler.mass + b2.velocity.y * sparrow.mass).toBeCloseTo(before.y, 6);
  });

  it('a gentle bump does no damage', () => {
    const a = ship('a', 'sparrow', { velocity: { x: 20, y: 0 } });
    const b = ship('b', 'sparrow', { position: { x: 30, y: 0 } });
    expect(collideShips({ a, b }, statsOf).damage).toEqual([]);
  });

  it('hitting a station hard hurts; touching it does not', () => {
    const st: Station = { id: 'st', name: 'St', position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, orbit: null, radius: 90, dockRange: 0, securityRadius: 0, market: {}, outfitting: false, pads: [], shipMart: [] };
    const hard = collideWithStations(ship('s', 'sparrow', { position: { x: 100, y: 0 }, velocity: { x: -200, y: 0 } }), sparrow, { st });
    const soft = collideWithStations(ship('s', 'sparrow', { position: { x: 100, y: 0 }, velocity: { x: -IMPACT_SAFE_DELTA_V / 2, y: 0 } }), sparrow, { st });
    expect(hard.damage[0]!.amount).toBeGreaterThan(0);
    expect(soft.damage).toEqual([]);
  });
});

describe('destruction, loot and respawn', () => {
  function destroyMe(w: World, me: string): World {
    return stepWorld({ ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, shield: 0, structure: 0.01 } }, projectiles: [
      { id: 'px', ownerShipId: 'nobody', position: { x: w.ships[me]!.position.x, y: w.ships[me]!.position.y - 10 }, velocity: { x: 0, y: 900 }, damage: 50, damageType: 'kinetic', ticksLeft: 10 },
    ] }, {});
  }

  it('a destroyed ship leaves a wreck and scrap, and its pilot gets away in a pod', () => {
    const { w, me } = quietWorld();
    const next = destroyMe(w, me);
    expect(next.ships[me]).toBeUndefined();
    const pod = pilotShip(next, 'ana')!;
    expect(pod.hullId).toBe('escape-pod');
    expect(next.wrecks).toHaveLength(1);
    // Scrap from the hull, plus the surviving part of the starter's boxes of rounds.
    const rounds = Math.floor(w.ships[me]!.hold['rounds']! * CARGO_SURVIVAL_FRACTION);
    expect(next.loot.reduce((n, l) => n + l.amount, 0)).toBe(Math.round(starter.mass * 0.5) + rounds);
    expect(next.events).toContainEqual({ type: 'destroyed', shipId: me, by: 'nobody' });
  });

  it('losing the pod too and waking gives the pilot a fresh starter with a new id', () => {
    const { w, me } = quietWorld();
    const inPod = destroyMe(w, me);
    expect(respawnPilot(inPod, 'ana')).toBe(inPod); // still has a ship (the pod): no change
    const dead = destroyMe(inPod, pilotShip(inPod, 'ana')!.id);
    expect(dead.pilots['ana']!.shipId).toBeNull();
    const back = respawnPilot(dead, 'ana');
    const s = pilotShip(back, 'ana')!;
    expect(s.id).not.toBe(me);
    expect(s.structure).toBe(starter.structure);
    expect(respawnPilot(back, 'ana')).toBe(back); // already has a ship: no change
  });

  it('the tractor beam pulls loot in and scoops it into the hold', () => {
    let { w, me } = quietWorld();
    const pos = w.ships[me]!.position;
    w = { ...w, loot: [{ id: 'l1', item: 'scrap', amount: 3, position: { x: pos.x + TRACTOR_RANGE - 20, y: pos.y }, velocity: { x: 0, y: 0 }, ticksLeft: 1000 }] };
    const events: WorldEvent[] = [];
    for (let i = 0; i < SECOND * 5; i++) {
      w = stepWorld(w, { [me]: { ...emptyInput(), tractor: true } });
      events.push(...w.events);
    }
    expect(w.loot).toEqual([]);
    expect(w.ships[me]!.hold['scrap']).toBe(3);
    expect(events).toContainEqual({ type: 'lootCollected', shipId: me, item: 'scrap', amount: 3 });
  });

  it('loot out of tractor range stays put, and eventually drifts away for good', () => {
    let { w, me } = quietWorld();
    // No gravity: this is about the tractor, not falling.
    w = { ...w, bodies: Object.fromEntries(Object.entries(w.bodies).map(([id, b]) => [id, { ...b, gravity: 0 }])) };
    const pos = w.ships[me]!.position;
    // At rest in the planet's frame: carried with it, never pulled.
    w = { ...w, loot: [{ id: 'l1', item: 'scrap', amount: 3, position: { x: pos.x + TRACTOR_RANGE + 100, y: pos.y }, velocity: bodyVelocity(w, PLANET_ID), ticksLeft: 120 }] };
    w = stepWorld(w, { [me]: { ...emptyInput(), tractor: true } });
    expect(length(sub(w.loot[0]!.velocity, bodyVelocity(w, PLANET_ID)))).toBeLessThan(1e-9);
    for (let i = 0; i < 200; i++) w = stepWorld(w, {});
    expect(w.loot).toEqual([]);
    expect(LOOT_LIFETIME).toBeGreaterThan(0);
  });

  it('a destroyed NPC is replaced by its spawner after the respawn time', () => {
    let w = createStarterWorld();
    const pirateId = 'npc-pirate-1';
    const spawner = w.spawners.find((s) => s.id === 'pirate')!;
    w = { ...w, ships: { ...w.ships, [pirateId]: { ...w.ships[pirateId]!, structure: 0 } } };
    w = stepWorld(w, {});
    expect(w.ships[pirateId]).toBeUndefined();
    for (let i = 0; i < SECOND * spawner.respawnSeconds + 5; i++) w = stepWorld(w, {});
    expect(w.ships['npc-pirate-2']).toBeDefined();
    expect(w.npcs['npc-pirate-2']?.kind).toBe('pirate');
  });
});

describe('NPC combat', () => {
  it('a hunting pirate shoots its target', () => {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    const pirate = w.ships['npc-pirate-1']!.position;
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, position: { x: pirate.x + 300, y: pirate.y }, velocity: { x: 0, y: 0 }, shield: 1e6 } } };
    let hits = 0;
    for (let i = 0; i < SECOND * 15; i++) {
      w = stepWorld(w, {});
      hits += w.events.filter((e) => e.type === 'damaged' && e.shipId === me && e.by === 'npc-pirate-1').length;
    }
    // Attack runs: it fires on the way in and breaks away, so hits come in bursts, two runs' worth here.
    expect(hits).toBeGreaterThanOrEqual(8);
  });

  it('a pirate turns on whoever shoots it', () => {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    // Put the pirate on cooldown so only provocation can start a hunt, and park the pilot nearby in the open.
    const brain = { ...(w.npcs['npc-pirate-1'] as PirateBrain), cooldownTicks: 1e6 };
    const pirate = w.ships['npc-pirate-1']!;
    w = {
      ...w,
      npcs: { ...w.npcs, 'npc-pirate-1': brain },
      ships: { ...w.ships, [me]: { ...w.ships[me]!, position: { x: pirate.position.x - 300, y: pirate.position.y }, heading: 0, shield: 1e6 } },
    };
    let hunted = false;
    for (let i = 0; i < SECOND * 3 && !hunted; i++) {
      w = stepWorld(w, { [me]: { ...emptyInput(), fireFixed: true } }); // nose is on the pirate
      hunted = w.events.some((e) => e.type === 'huntStarted' && e.shipId === me);
    }
    expect(hunted).toBe(true);
  });

  it('a trader shoots back at a pirate ahead of it, but its swivel cannot cover its stern', () => {
    // The Manifest's one swivel faces forward with a half-circle arc: a pirate ahead is engaged, one astern is in the blind spot.
    const base = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
    const trader = buildShip(base, { id: 't', loadout: LOADOUTS['tessaract-trader']!, ownerId: null, position: { x: -7000, y: -7000 }, heading: 0, flightMode: 'manual' });
    const shots = (where: { x: number; y: number }) => {
      const foe = buildShip(base, { id: 'foe', loadout: LOADOUTS['kessari-raider']!, ownerId: null, position: { x: -7000 + where.x, y: -7000 + where.y }, heading: Math.PI, flightMode: 'manual' });
      let w: World = { ...base, ships: { t: { ...trader, hold: { rounds: 4 }, weaponsHot: true, locks: [{ targetId: 'foe', progress: 1 }], activeLock: 'foe' }, foe: { ...foe, shield: 1e6, structure: 1e6 } } };
      let fired = 0;
      for (let i = 0; i < SECOND * 5; i++) {
        w = stepWorld(w, {});
        fired += w.events.filter((e) => e.type === 'damaged' && e.by === 't').length;
      }
      return fired;
    };
    expect(shots({ x: 300, y: 0 })).toBeGreaterThan(5); // ahead
    expect(shots({ x: -300, y: 0 })).toBe(0); // astern
  });

  it('a badly damaged pirate goes home and leaves the sector, then a new one arrives', () => {
    let w = createStarterWorld();
    const id = 'npc-pirate-1';
    const brain = w.npcs[id] as PirateBrain;
    w = { ...w, ships: { ...w.ships, [id]: { ...w.ships[id]!, structure: loadoutStats(FITS.raider).structure * 0.3, position: brain.home } } };
    let departed = false;
    for (let i = 0; i < SECOND * 5 && !departed; i++) {
      w = stepWorld(w, {});
      departed = w.events.some((e) => e.type === 'departed' && e.shipId === id);
    }
    expect(departed).toBe(true);
    expect(w.wrecks).toEqual([]); // leaving is not dying
    for (let i = 0; i < SECOND * 50; i++) w = stepWorld(w, {});
    expect(w.ships['npc-pirate-2']).toBeDefined();
    expect(distance(w.ships['npc-pirate-2']!.position, brain.home)).toBeLessThan(PIRATE_TUNING.patrolRadius + 200);
  });
});
