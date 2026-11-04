import type { BoardRefusal, LockRefusal, Ship, Station, World, WorldEvent } from '@spacegame/sim';
import {
  BOARD_MAX_RELATIVE_SPEED,
  BOARD_RANGE,
  FLIGHT_MODE_LABELS,
  boardRefusal,
  boardableShips,
  cargoUsed,
  claimRefusal,
  distance,
  isEmptyShip,
  isEscapePod,
  length,
  localFrame,
  lockReadout,
  nearestDockableStation,
  ownedShips,
  relativeVelocity,
  shipPilot,
  shipStats,
  sub,
} from '@spacegame/sim';

/**
 * DOM overlay: HUD text, docked panel, death panel and transient toasts.
 * Pure presentation; reads the world and never changes it. Buttons call
 * back into main.ts, which owns the world.
 */

/** Why docking was refused, in words. */
/** Why a lock could not start, in words. */
const LOCK_REFUSALS: Record<LockRefusal, string> = {
  invalid: 'Cannot lock that.',
  already: 'Already locked.',
  maxLocks: 'No lock slots free. Esc drops the active lock.',
  outOfRange: 'Out of sensor range.',
  noComputer: 'No targeting computer fitted.',
  docked: 'Cannot lock while docked.',
};

const DOCK_REFUSALS: Record<'tooFar' | 'tooFast' | 'noPad', string> = {
  tooFar: 'No station in range.',
  tooFast: 'Too fast to dock. Slow down.',
  noPad: 'No free pad here fits this hull.',
};

/**
 * Who a ship is, for labels: the pilot flying it, or for an empty ship
 * its owner marked as empty. Owning is not flying; never label an empty
 * ship with its owner's name alone.
 */
export function shipLabel(world: World, ship: Ship): string {
  const pilot = shipPilot(world, ship.id);
  if (pilot) return pilot.name.toUpperCase();
  const owner = ship.ownerId ? world.pilots[ship.ownerId] : undefined;
  return owner ? `EMPTY · ${owner.name.toUpperCase()}` : 'UNKNOWN';
}

/**
 * A ship's name for people: its hull, and its number in the owner's
 * sequence so two of the same hull can be told apart ("Kessari Warrant #3").
 * Ships have no names of their own yet.
 */
export function shipName(world: World, ship: Ship): string {
  const hull = world.hulls[ship.hullId]?.name ?? 'Ship';
  const n = /-(\d+)$/.exec(ship.id)?.[1];
  return n ? `${hull} #${n}` : hull;
}

/** Distances in "where" text are rounded to this, so drifting ships do not redraw lists every frame. */
const WHERE_ROUNDING = 50;

/**
 * Where a ship is, in words: on which pad of which station, or in space
 * and how far from the nearest station. `hereShipId` is the ship the
 * reader is in; ships docked at the same station read "Here".
 */
export function shipWhere(world: World, ship: Ship, hereShipId: string | null): string {
  if (ship.state === 'docked' && ship.dockedAt) {
    const station = world.stations[ship.dockedAt];
    const pad = ship.padId ? `, pad ${ship.padId.toUpperCase()}` : '';
    const here = hereShipId ? world.ships[hereShipId] : undefined;
    if (here && here.state === 'docked' && here.dockedAt === ship.dockedAt) return `Here${pad}`;
    return `Docked at ${station?.name ?? 'a station'}${pad}`;
  }
  if (ship.id === hereShipId) return 'In flight';
  let nearest: Station | null = null;
  for (const s of Object.values(world.stations)) {
    if (!nearest || distance(ship.position, s.position) < distance(ship.position, nearest.position)) nearest = s;
  }
  if (!nearest) return 'In space';
  const d = Math.round(distance(ship.position, nearest.position) / WHERE_ROUNDING) * WHERE_ROUNDING;
  return `In space, ${d.toLocaleString('en-GB')} from ${nearest.name}`;
}

/** How far out the HUD starts naming an empty ship of yours you cannot board yet. */
export const BOARD_PROMPT_RANGE = BOARD_RANGE * 4;

/** HUD words for why the nearest ship of yours cannot be boarded yet. */
const BOARD_PROMPT_REASONS: Partial<Record<BoardRefusal, (gap: number, relative: number) => string>> = {
  tooFar: (gap) => `CLOSE TO ${BOARD_RANGE} (${Math.round(gap)})`,
  tooFast: (_gap, relative) => `MATCH SPEED (${Math.round(relative)}/${BOARD_MAX_RELATIVE_SPEED} u/s)`,
};

/**
 * The HUD's boarding line: the ship B would board, or, in space, the
 * nearest empty ship of yours within BOARD_PROMPT_RANGE and why it cannot
 * be boarded yet. Empty when there is nothing to say.
 */
export function boardPrompt(world: World, pilotId: string, ship: Ship): string {
  const ready = boardableShips(world, pilotId)[0];
  if (ready) return `BOARD ${shipName(world, ready).toUpperCase()}  [B]`;
  if (ship.state !== 'flying') return '';
  let near: Ship | null = null;
  for (const s of ownedShips(world, pilotId)) {
    if (s.id === ship.id || s.state !== 'flying' || !isEmptyShip(world, s)) continue;
    if (!near || distance(ship.position, s.position) < distance(ship.position, near.position)) near = s;
  }
  if (!near) return '';
  const gap = distance(ship.position, near.position);
  if (gap > BOARD_PROMPT_RANGE) return '';
  const reason = boardRefusal(world, pilotId, near.id);
  const say = reason ? BOARD_PROMPT_REASONS[reason] : undefined;
  if (!say) return '';
  return `BOARD ${shipName(world, near).toUpperCase()}: ${say(gap, length(sub(ship.velocity, near.velocity)))}`;
}

/** Which station service the docked panel shows. */
export type DockTab = 'market' | 'outfitting' | 'shipMart' | 'ships';

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

export class Ui {
  private readonly hud = must<HTMLDivElement>('hud');
  private readonly targetPanel = must<HTMLDivElement>('target-panel');
  private readonly dockPanel = must<HTMLDivElement>('dock-panel');
  private readonly dockStationName = must<HTMLHeadingElement>('dock-station-name');
  private readonly undockButton = must<HTMLButtonElement>('undock-button');
  private readonly tabs: Record<DockTab, HTMLButtonElement> = {
    market: must<HTMLButtonElement>('tab-market'),
    outfitting: must<HTMLButtonElement>('tab-outfitting'),
    shipMart: must<HTMLButtonElement>('tab-ship-mart'),
    ships: must<HTMLButtonElement>('tab-ships'),
  };
  private readonly containers: Record<DockTab, HTMLDivElement> = {
    market: must<HTMLDivElement>('market-container'),
    outfitting: must<HTMLDivElement>('outfitting-container'),
    shipMart: must<HTMLDivElement>('ship-mart-container'),
    ships: must<HTMLDivElement>('ships-container'),
  };
  private readonly podBlock = must<HTMLDivElement>('pod-block');
  private readonly podText = must<HTMLParagraphElement>('pod-text');
  private readonly claimButton = must<HTMLButtonElement>('claim-button');
  /** Which station service the docked panel shows. */
  dockTab: DockTab = 'market';
  private readonly deathPanel = must<HTMLDivElement>('death-panel');
  private readonly respawnButton = must<HTMLButtonElement>('respawn-button');
  private readonly toast = must<HTMLDivElement>('toast');
  private toastTimer: number | null = null;

  constructor(onUndock: () => void, onRespawn: () => void, onClaim: () => void) {
    this.undockButton.addEventListener('click', onUndock);
    this.respawnButton.addEventListener('click', onRespawn);
    this.claimButton.addEventListener('click', onClaim);
    for (const [tab, button] of Object.entries(this.tabs) as [DockTab, HTMLButtonElement][]) {
      button.addEventListener('click', () => (this.dockTab = tab));
    }
  }

  /** Refresh the HUD. `ship` is null while the pilot has no ship (destroyed). */
  update(world: World, ship: Ship | null, fps: number): void {
    this.deathPanel.classList.toggle('hidden', ship !== null);
    this.updateTarget(world, ship);
    if (!ship) {
      this.dockPanel.classList.add('hidden');
      this.hud.textContent = `NO SHIP\n${fps.toFixed(0)} fps  tick ${world.tick}`;
      return;
    }
    const stats = shipStats(world, ship);
    const hold = Object.entries(ship.hold)
      .filter(([, n]) => n > 0)
      .map(([item, n]) => `${item} ${n}`)
      .join(', ');
    // Speed against the local frame (6c): the station in dock range, else the body whose sphere you are in.
    const frame = localFrame(world, ship);
    const rel = relativeVelocity(world, ship);
    const speed = Math.hypot(rel.x, rel.y);
    const frameName = frame.kind === 'station' ? world.stations[frame.id]?.name : frame.kind === 'body' ? world.bodies[frame.id]?.name : undefined;
    const near = nearestDockableStation(ship, world.stations);
    const secure = Object.values(world.stations).find((s) => distance(ship.position, s.position) < s.securityRadius);
    const hunted = Object.values(world.npcs).some((b) => b.kind === 'pirate' && b.mode === 'hunt' && b.targetId === ship.id);
    const pilot = shipPilot(world, ship.id);
    const inPod = isEscapePod(world, ship);
    const lines = [
      hunted ? '!! PIRATE ON YOUR TAIL' : '',
      inPod
        ? pilot && boardableShips(world, pilot.id).length > 0
          ? '>> ESCAPE POD: BOARD YOUR SHIP [B]'
          : '>> ESCAPE POD: DOCK AT A STATION'
        : `SHIP ${shipName(world, ship).toUpperCase()}`,
      `ZONE ${secure ? `${secure.name.toUpperCase()} SECURITY` : 'OPEN SPACE'}`,
      `SHD ${Math.ceil(ship.shield).toString().padStart(3)}/${Math.round(stats.shield)}  HUL ${Math.ceil(ship.structure).toString().padStart(3)}/${Math.round(stats.structure)}`,
      `CR  ${(pilot?.credits ?? 0).toLocaleString('en-GB')}`,
      `CARGO ${cargoUsed(ship)}/${stats.cargoCapacity}${hold ? `  ${hold}` : ''}`,
      `VEL ${speed.toFixed(0).padStart(4)} u/s${frameName ? `  REL ${frameName.toUpperCase()}` : ''}`,
      `POS ${ship.position.x.toFixed(0).padStart(6)} ${ship.position.y.toFixed(0).padStart(6)}`,
      `HDG ${((ship.heading * 180) / Math.PI).toFixed(0).padStart(4)}°`,
      `ROT ${((ship.angularVelocity * 180) / Math.PI).toFixed(0).padStart(4)}°/s`,
      `FLT ${FLIGHT_MODE_LABELS[ship.flightMode].toUpperCase()}  [Z]`,
      `WPN ${ship.weaponsHot ? 'HOT' : 'COLD'}  [H]`,
      near && ship.state === 'flying' ? `DOCK ${near.name.toUpperCase()}  [F]` : '',
      pilot ? boardPrompt(world, pilot.id, ship) : '',
      `${fps.toFixed(0)} fps  tick ${world.tick}`,
    ];
    this.hud.textContent = lines.filter(Boolean).join('\n');

    const docked = ship.state === 'docked';
    this.dockPanel.classList.toggle('hidden', !docked);
    if (docked && ship.dockedAt) {
      const station: Station | undefined = world.stations[ship.dockedAt];
      this.dockStationName.textContent = station?.name ?? 'Station';
      // Outfitting and the ship mart only where the station offers them.
      const offers: Record<DockTab, boolean> = {
        market: true,
        outfitting: station?.outfitting ?? false,
        shipMart: (station?.shipMart.length ?? 0) > 0,
        ships: true,
      };
      if (!offers[this.dockTab]) this.dockTab = 'market';
      this.tabs.outfitting.title = offers.outfitting ? '' : 'No outfitting at this station';
      this.tabs.shipMart.title = offers.shipMart ? '' : 'No ship mart at this station';
      for (const tab of Object.keys(this.tabs) as DockTab[]) {
        this.tabs[tab].disabled = !offers[tab];
        this.tabs[tab].setAttribute('aria-selected', String(tab === this.dockTab));
        this.containers[tab].classList.toggle('hidden', tab !== this.dockTab);
      }
      // One width on every tab: the panel is centred, so a width change
      // would slide the tab row sideways under the pointer.
      this.dockPanel.classList.add('wide');
      this.updatePodBlock(world, pilot?.id ?? null, inPod);
    }
  }

  /**
   * Bottom of the docked panel, below Undock so it never moves anything
   * above it: in a pod, either the free Tern claim or why there is
   * none here.
   */
  private updatePodBlock(world: World, pilotId: string | null, inPod: boolean): void {
    const refusal = pilotId ? claimRefusal(world, pilotId) : 'noShip';
    this.podBlock.classList.toggle('hidden', !inPod);
    this.claimButton.classList.toggle('hidden', refusal !== null);
    const text =
      refusal === null
        ? 'You own no ships. Harbour will give you a Meridian Tern for free.'
        : refusal === 'ownsShips'
          ? 'You still own a ship, so there is no free Tern. Find it under Your ships and fetch it, or buy another.'
          : 'The free Tern is given at Harbour Station, to pilots who own no ships.';
    if (this.podText.textContent !== text) this.podText.textContent = text;
  }

  /**
   * Bottom-right readout for the active lock. It shows only what the
   * ship's targeting computer reads (`lockReadout`): a civil plotter
   * gives rough condition, a fire director exact shields and guns, a
   * manifest reader the hold. While locking, only the progress.
   */
  private updateTarget(world: World, ship: Ship | null): void {
    const lock = ship?.locks.find((l) => l.targetId === ship.activeLock);
    if (!ship || !lock || !world.ships[lock.targetId]) {
      this.targetPanel.classList.add('hidden');
      return;
    }
    const footer = `LOCKS ${ship.locks.length}/${shipStats(world, ship).maxLocks}  [Tab] next  [Esc] unlock`;
    const r = lockReadout(world, ship, lock.targetId);
    const lines: string[] = [];
    if (!r) {
      lines.push(`LOCKING ${Math.floor(lock.progress * 100)}%`);
    } else {
      const who = r.identity ? (r.identity.escapePod ? 'POD' : r.identity.flownBy === 'nobody' ? 'EMPTY' : r.identity.flownBy.toUpperCase()) : 'CONTACT';
      lines.push(`TARGET ${who}  LOCKED`);
      if (r.identity) lines.push(`HULL   ${r.identity.hullName.toUpperCase()} (${r.identity.sizeClass})`);
      if (r.motion) {
        lines.push(`RANGE  ${r.motion.range.toFixed(0).padStart(5)}`);
        lines.push(`CLOSE  ${r.motion.closingSpeed.toFixed(0).padStart(5)} u/s`);
      }
      if (r.combat) {
        lines.push(`SHD ${Math.ceil(r.combat.shield).toString().padStart(3)}/${Math.round(r.combat.maxShield)}  HUL ${Math.ceil(r.combat.structure).toString().padStart(3)}/${Math.round(r.combat.maxStructure)}`);
        lines.push(`GUNS   ${r.combat.weapons.length}  FIXED ${r.combat.fixedDps.toFixed(0)} dps  TURRET ${r.combat.turretDps.toFixed(0)} dps`);
      } else if (r.condition) {
        lines.push(`SHIELD ${r.condition.shield.toUpperCase()}  HULL ${r.condition.hull.toUpperCase()}`);
      }
      if (r.cargo) {
        const goods = Object.entries(r.cargo.hold).filter(([, n]) => n > 0).map(([g, n]) => `${g} ${n}`).join(', ');
        lines.push(`HOLD   ${r.cargo.used}/${r.cargo.capacity}${goods ? `  ${goods}` : '  empty'}`);
      }
    }
    lines.push(footer);
    this.targetPanel.textContent = lines.join('\n');
    this.targetPanel.classList.remove('hidden');
  }

  /**
   * Toasts for events involving this pilot's ship: things that happened to
   * it (`shipId`) or that it caused (`by`).
   */
  handleEvents(events: WorldEvent[], myShipId: string): void {
    for (const e of events) {
      const mine = e.shipId === myShipId;
      if (e.type === 'podEjected' && e.from === myShipId) {
        this.showToast('Your ship was destroyed. You got away in an escape pod.', 4000);
        continue;
      }
      if (e.type === 'destroyed') {
        if (mine) this.showToast('Your ship was destroyed.', 3000);
        else if (e.by === myShipId) this.showToast('Target destroyed.', 2000, 'info');
        continue;
      }
      if (!mine) continue;
      if (e.type === 'dockRefused') {
        this.showToast(DOCK_REFUSALS[e.reason]);
      } else if (e.type === 'flightModeChanged') {
        this.showToast(`Flight mode: ${FLIGHT_MODE_LABELS[e.mode]}`, 1200, 'info');
      } else if (e.type === 'huntStarted') {
        this.showToast('Pirate closing in. Run for station security.', 3000);
      } else if (e.type === 'huntEnded') {
        this.showToast('The pirate has broken off.', 2000, 'info');
      } else if (e.type === 'collided') {
        this.showToast(`Hull contact at ${Math.round(e.speed)} u/s`, 1200);
      } else if (e.type === 'rammed') {
        this.showToast(`Collision at ${Math.round(e.speed)} u/s`, 1200);
      } else if (e.type === 'weaponsHotChanged') {
        this.showToast(e.hot ? 'Weapons hot' : 'Weapons cold', 1000, e.hot ? 'warn' : 'info');
      } else if (e.type === 'lockRefused') {
        this.showToast(LOCK_REFUSALS[e.reason], 1500);
      } else if (e.type === 'lockLost' && e.reason !== 'unlocked') {
        this.showToast(e.reason === 'outOfRange' ? 'Lock lost: out of sensor range.' : 'Lock lost.', 1500, 'info');
      } else if (e.type === 'lootCollected') {
        this.showToast(`+${e.amount} ${e.item}`, 1200, 'info');
      }
    }
  }

  /**
   * Toast the event a pilot command returned: buying, boarding, claiming
   * the free starter, waking. These come from commands, not from a tick,
   * so they never appear in `world.events`.
   */
  announce(world: World, e: WorldEvent): void {
    const ship = world.ships[e.shipId];
    const name = ship ? shipName(world, ship) : 'ship';
    if (e.type === 'shipBought') {
      const pad = ship?.padId ? ` It is on pad ${ship.padId.toUpperCase()}.` : '';
      this.showToast(`Bought a ${name} for ${e.price.toLocaleString('en-GB')} cr.${pad}`, 3000, 'info');
    } else if (e.type === 'boarded') {
      const left = world.ships[e.from];
      const after = !left
        ? 'Your escape pod is used up.'
        : left.state === 'docked'
          ? `Your ${shipName(world, left)} stays on its pad.`
          : `Your ${shipName(world, left)} is left drifting, empty.`;
      this.showToast(`Boarded your ${name}. ${after}`, 3000, 'info');
    } else if (e.type === 'steppedOut') {
      const left = world.ships[e.from];
      const moving = left ? Math.hypot(left.velocity.x, left.velocity.y) : 0;
      const where = left ? `Your ${shipName(world, left)} is left empty${moving >= 1 ? `, drifting at ${Math.round(moving)} u/s` : ' where it is'}.` : '';
      this.showToast(`You step out in an escape pod. ${where} Press B beside it to board again.`, 3500, 'info');
    } else if (e.type === 'starterClaimed') {
      this.showToast(`You claim a free ${name}. Your escape pod is used up.`, 3000, 'info');
    } else if (e.type === 'pilotWoke') {
      this.showToast(
        ship && isEscapePod(world, ship)
          ? 'You wake at Harbour in a new escape pod. Your ships are where you left them.'
          : `You wake at Harbour with a free ${name}.`,
        3500,
        'info',
      );
    }
  }

  /** Show a message from outside the sim's events, e.g. the result of a trade. */
  notify(text: string, tone: 'warn' | 'info' = 'info'): void {
    this.showToast(text, 1600, tone);
  }

  private showToast(text: string, ms = 1800, tone: 'warn' | 'info' = 'warn'): void {
    this.toast.textContent = text;
    this.toast.classList.toggle('info', tone === 'info');
    this.toast.classList.remove('hidden');
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.add('hidden'), ms);
  }
}
