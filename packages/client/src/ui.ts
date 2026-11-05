import type { BoardRefusal, LockRefusal, Ship, Station, World, WorldEvent } from '@spacegame/sim';
import {
  BOARD_MAX_RELATIVE_SPEED,
  GOODS,
  CORE_LIFETIME,
  PLANT_REACH,
  SAFE_DISTANCE,
  BOARD_RANGE,
  FLIGHT_MODE_LABELS,
  boardRefusal,
  boardableShips,
  claimRefusal,
  distance,
  isEmptyShip,
  isEscapePod,
  length,
  ownedShips,
  shipPilot,
  sub,
} from '@spacegame/sim';

/**
 * DOM overlay: HUD text, docked panel, death panel and transient toasts.
 * Pure presentation; reads the world and never changes it. Buttons call
 * back into main.ts, which owns the world.
 */

/** Why a lock could not start, in words. */
const LOCK_REFUSALS: Record<LockRefusal, string> = {
  invalid: 'Cannot lock that.',
  already: 'Already locked.',
  maxLocks: 'No lock slots free. Esc drops the active lock.',
  outOfRange: 'Out of sensor range.',
  noComputer: 'No targeting computer fitted.',
  docked: 'Cannot lock while docked.',
};

/** Why docking was refused, in words. */
const CHARGE_REFUSALS: Record<Extract<WorldEvent, { type: 'chargeRefused' }>['reason'], string> = {
  noCharges: 'No breach charges in the hold. Buy them at Ridge or Harbour.',
  noRock: 'Lock a rock and make it your active lock to plant a charge.',
  tooFar: `Get within ${PLANT_REACH} units of the rock's surface to plant a charge.`,
  tooClose: `Too close to set them off: get ${SAFE_DISTANCE} units clear of the rock.`,
  tooSmall: 'That rock is too small to breach.',
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

  /**
   * Refresh the docked and death panels. `ship` is null while the pilot
   * has no ship (destroyed). The flight HUD lives in hud/flight-hud.ts.
   */
  update(world: World, ship: Ship | null): void {
    this.deathPanel.classList.toggle('hidden', ship !== null);
    if (!ship) {
      this.dockPanel.classList.add('hidden');
      return;
    }
    const pilot = shipPilot(world, ship.id);
    const inPod = isEscapePod(world, ship);
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
   * Toasts for events involving this pilot's ship: things that happened to
   * it (`shipId`) or that it caused (`by`).
   */
  /** A good's display name, from the catalogue. */
  private goodName(id: string): string {
    return GOODS[id]?.name ?? id;
  }

  /** Rocks seen breaking up (breached, mined out, collapsed); their lost locks go unannounced. */
  private brokenRocks = new Set<string>();

  handleEvents(events: WorldEvent[], myShipId: string): void {
    if (this.brokenRocks.size > 200) this.brokenRocks.clear();
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
      // A rock that broke up already says so: no "Lock lost" over the top of it.
      if (e.type === 'breached' || e.type === 'rockCrumbled' || e.type === 'coreCollapsed') this.brokenRocks.add(e.rockId);
      if (e.type === 'lockLost' && this.brokenRocks.has(e.targetId)) continue;
      if (e.type === 'coreCollapsed') {
        // Nobody's in particular; only pilots breach, so say so.
        this.showToast(`Exposed gate-glass collapsed: ${e.amount} units lost.`, 2500, 'warn');
        continue;
      }
      if (!mine) continue;
      if (e.type === 'chargePlaced') {
        this.showToast(`Charge planted (${e.placed} on this rock). Get ${SAFE_DISTANCE} units clear, then press again to detonate.`, 2500, 'info');
      } else if (e.type === 'chargeRefused') {
        this.showToast(CHARGE_REFUSALS[e.reason], 2000);
      } else if (e.type === 'breached') {
        const glass = e.glass > 0 ? ` ${e.glass} units of gate-glass exposed (${Math.round(e.quality * 100)}% of the breach points hit). It collapses in ${Math.round(CORE_LIFETIME / 60)} minutes and heavy lasers shatter it.` : '';
        this.showToast(`Rock breached into ${e.chunks} chunks.${glass} The blast will draw pirates.`, 5000, 'warn');
      } else if (e.type === 'glassShattered') {
        this.showToast(`Gate-glass shattered: ${e.amount} units lost. Your laser is too strong for it.`, 2000, 'warn');
      } else if (e.type === 'damaged' && e.cause === 'blast') {
        this.showToast('Caught in the blast.', 1500, 'warn');
      } else if (e.type === 'dockRefused') {
        this.showToast(DOCK_REFUSALS[e.reason]);
      } else if (e.type === 'flightModeChanged') {
        this.showToast(`Flight mode: ${FLIGHT_MODE_LABELS[e.mode]}`, 1200, 'info');
      } else if (e.type === 'huntStarted') {
        this.showToast('Pirate closing in. Run for station security.', 3000);
      } else if (e.type === 'huntEnded') {
        this.showToast('The pirate has broken off.', 2000, 'info');
      } else if (e.type === 'droneLost') {
        this.showToast(e.reason === 'destroyed' ? `Drone ${e.droneId} destroyed.` : `Drone ${e.droneId} left behind and lost.`, 2500, 'warn');
      } else if (e.type === 'droneRefused') {
        const why = { noBay: 'No drone bay fitted.', noneStowed: 'No drones in the bay.', control: 'The bay controls no more drones at once.', noRock: 'Lock a rock and make it your active lock first.', docked: 'Undock to launch drones.' }[e.reason];
        this.showToast(why, 2000);
      } else if (e.type === 'cacheDropped') {
        this.showToast(`Cache left: ${e.units} units of ore. It lasts an hour and shows on your radar.`, 2500, 'info');
      } else if (e.type === 'tractorModeChanged') {
        const say = { off: 'Tractor off.', mine: 'Tractor on: your own loot only.', all: "Tractor on: everything in reach, other people's too." }[e.mode];
        this.showToast(say, 1500, e.mode === 'all' ? 'warn' : 'info');
      } else if (e.type === 'hopperFilterChanged') {
        const names = e.drop.map((g) => this.goodName(g)).join(', ');
        this.showToast(e.on && e.drop.length > 0 ? `Hopper: spitting out ${names}.` : 'Hopper: keeping everything.', 1500, 'info');
      } else if (e.type === 'jettisoned') {
        this.showToast(`Jettisoned ${e.amount} ${this.goodName(e.item)}. Anyone can take it.`, 2000, 'info');
      } else if (e.type === 'jettisonRefused') {
        this.showToast(e.reason === 'docked' ? 'Undock to jettison.' : 'Nothing of that aboard.', 1500);
      } else if (e.type === 'oreTradedUp') {
        this.showToast(`Hopper: traded ${e.amount} ${this.goodName(e.dropped)} for ${this.goodName(e.item)}.`, 1200, 'info');
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
      } else if (e.type === 'launchRefused') {
        this.showToast('Launchers need a complete lock to fire at.', 1500);
      } else if (e.type === 'munitionSpoofed') {
        this.showToast('Countermeasure drew a missile off.', 1500, 'info');
      } else if (e.type === 'surveyed') {
        this.showToast(e.found === 0 ? 'Survey: nothing but plain rock in reach.' : `Survey: ${e.found} rock${e.found === 1 ? '' : 's'} worth a look.`, 2000, 'info');
      } else if (e.type === 'surveyRefused') {
        this.showToast(e.reason === 'capacitor' ? 'Survey scanner: not enough capacitor.' : 'Survey scanner still cycling.', 1200);
      } else if (e.type === 'miningTooHard') {
        this.showToast('Too hard for your mining laser. Find a smaller rock, or a stronger laser.', 2000);
      } else if (e.type === 'rockCrumbled') {
        this.showToast('Rock mined out.', 1500, 'info');
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
    if (e.type === 'adminRuleChanged') {
      const value = typeof e.value === 'number' ? `${Math.round(e.value * 100)}%` : e.value ? 'on' : 'off';
      this.showToast(`Admin: ${e.rule} ${value}.`, 2000, 'info');
    } else if (e.type === 'adminCreditsGranted') {
      this.showToast(`Admin: +${e.amount.toLocaleString('en-GB')} cr.`, 2000, 'info');
    } else if (e.type === 'adminShipSpawned') {
      const pad = ship?.padId ? ` It is on pad ${ship.padId.toUpperCase()}; board it with B.` : '';
      this.showToast(`Admin: spawned your ${name}.${pad}`, 3000, 'info');
    } else if (e.type === 'shipBought') {
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
