import type { LockReadout, Ship, TargetLock, World } from '@spacegame/sim';
import { FRAGILE_STRENGTH, contactSize, distance, droneStrength, lockReadout, occupiedPads, shipStats } from '@spacegame/sim';
import { el, setAttr, setText, show, svg } from './dom.js';
import { arcPath, fraction, silhouettePoints } from './geometry.js';
import type { NavTarget } from './plot.js';
import { arrivalSeconds, clockWords, closingSpeed, plotName, plotPosition } from './plot-rows.js';

/**
 * Target locks on the right edge.
 *
 * - The lock strip: one small card per lock, the active one outlined,
 *   a bar on any still locking, and a dashed card per free slot up to
 *   your ship's `maxLocks`. Click a card to make that lock active.
 * - The selection window under it (docs/interface.md, section 3): what
 *   you selected (a click in the Plot, a right-click in space), or your
 *   active lock when nothing is selected. Selecting is also setting the
 *   nav target (Jason, 6 November 2026). A row of actions under it:
 *   lock, make active, dock, send a drone, clear.
 *
 * Everything shown about a locked target comes from `lockReadout`, so
 * from your targeting computer: nothing until the lock completes, then
 * only the parts your computer reads (identity, motion, rough condition,
 * exact combat figures, cargo). The hull drawing comes from the
 * catalogue once identity says which hull it is. For something not
 * locked, only what the radar gives: where it is and how it moves, and
 * what a ship showing its colours tells everyone (its name and hull).
 * This never reads a locked target ship directly.
 */

/** What the selection window's buttons ask main.ts to do. */
export interface SelectionActions {
  /** Make a held lock the active one (a click on its card, or MAKE ACTIVE). */
  activate: (targetId: string) => void;
  /** Drop a lock. */
  unlock: (targetId: string) => void;
  /** Start a lock. */
  lock: (targetId: string) => void;
  /** Ask to dock (the sim docks at the nearest station in range, or refuses). */
  dock: () => void;
  /** Send the next free drone to the active lock's rock. */
  sendDrone: () => void;
  /** Clear the selection (and with it the nav target). */
  clear: () => void;
}

const SIZE_NAMES: Record<string, string> = { S: 'Small', M: 'Medium', L: 'Large' };
const SILHOUETTE = 120;
const SIL_MID = SILHOUETTE / 2;
const SIL_RING = 52;
const CHIP_SIL = 26;
const NONE = '-';

/** How a target reads, from its identity readout; `unknown` without one. */
export type TargetStance = 'hostile' | 'neutral' | 'watch' | 'pilot' | 'empty' | 'unknown' | 'rock';

const FLOWN_BY_STANCE: Record<NonNullable<LockReadout['identity']>['flownBy'], TargetStance> = {
  pirate: 'hostile',
  arena: 'hostile',
  trader: 'neutral',
  watch: 'watch',
  pilot: 'pilot',
  drone: 'pilot',
  miner: 'neutral',
  nobody: 'empty',
};

const STANCE_WORDS: Record<TargetStance, string> = {
  hostile: 'HOSTILE',
  neutral: 'NEUTRAL',
  watch: 'CALDER WATCH',
  pilot: 'PILOT',
  empty: 'EMPTY',
  unknown: 'UNIDENTIFIED',
  rock: 'ROCK',
};

const FLOWN_BY_WORDS: Record<NonNullable<LockReadout['identity']>['flownBy'], string> = {
  pirate: 'PIRATE',
  arena: 'ARENA',
  trader: 'TRADER',
  watch: 'PATROL',
  pilot: 'PILOT',
  drone: 'DRONE',
  miner: 'MINER',
  nobody: 'NOBODY ABOARD',
};

const SHIELD_WORDS = { up: 'UP', down: 'DOWN', none: 'NONE' } as const;
const HULL_WORDS = { sound: 'SOUND', damaged: 'DAMAGED', critical: 'CRITICAL' } as const;

export function readoutStance(read: LockReadout | null): TargetStance {
  return read?.identity ? FLOWN_BY_STANCE[read.identity.flownBy] : 'unknown';
}

/** One lock's card in the strip. */
interface LockChip {
  root: HTMLButtonElement;
  outline: SVGPolygonElement;
  name: HTMLSpanElement;
  detail: HTMLSpanElement;
  bar: HTMLSpanElement;
  fill: HTMLSpanElement;
}

export class TargetCard {
  private readonly locks = el('div', 'hud-locks hidden');
  private readonly locksHead = el('div', 'hud-locks-head');
  private readonly locksCount = el('span');
  private readonly chips = el('div', 'hud-lock-chips');
  private chipKey = '';
  private chipFor = new Map<string, LockChip>();

  private readonly root = el('div', 'hud-target hidden');
  private readonly stance = el('span', 'hud-target-stance');
  private readonly lockState = el('span', 'hud-dim');
  private readonly name = el('div', 'hud-target-name');
  private readonly who = el('div', 'hud-dim');
  private readonly outline = svg('polygon', { class: 'silhouette' });
  private readonly shieldRing = svg('path', { class: 'ring shield' });
  private readonly shieldTrack = el('div', 'bar');
  private readonly hullTrack = el('div', 'bar');
  private readonly shieldBar = el('div', 'bar-fill shield');
  private readonly hullBar = el('div', 'bar-fill hull');
  private readonly shieldValue = el('span', 'num');
  private readonly hullValue = el('span', 'num');
  private readonly range = el('span', 'num');
  private readonly closing = el('span', 'num');
  private readonly armed = el('div', 'hud-target-extra hidden');
  private readonly cargo = el('div', 'hud-target-extra hidden');
  private readonly reads = el('div', 'hud-target-reads');
  private hullId = '';
  /** Drops the lock on show, so it can be done without the keyboard. */
  private readonly unlock = el('button', 'hud-target-unlock', 'UNLOCK ✕') as HTMLButtonElement;
  /** The actions for what is shown, under the readings. */
  private readonly actions = el('div', 'hud-target-actions');
  private actionKey = '';
  private shownId: string | null = null;
  private readonly onActivate: (targetId: string) => void;
  private readonly onUnlock: (targetId: string) => void;

  constructor(
    parent: HTMLElement,
    private readonly act: SelectionActions,
  ) {
    this.onActivate = act.activate;
    this.onUnlock = act.unlock;
    this.unlock.type = 'button';
    this.unlock.setAttribute('aria-label', 'Unlock this target');
    this.unlock.title = 'Unlock this target (Esc)';
    this.unlock.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.shownId) this.onUnlock(this.shownId);
    });
    this.locksHead.append(this.locksCount, el('span', '', 'ESC unlock'));
    this.locks.append(this.locksHead, this.chips);

    const head = el('div', 'hud-target-head');
    const right = el('span', 'hud-target-head-right');
    right.append(this.lockState, this.unlock);
    head.append(this.stance, right);

    const pic = svg('svg', {
      width: SILHOUETTE,
      height: SILHOUETTE,
      viewBox: `${-SIL_MID} ${-SIL_MID} ${SILHOUETTE} ${SILHOUETTE}`,
      class: 'hud-target-pic',
      'aria-hidden': 'true',
    });
    pic.append(svg('circle', { r: SIL_RING, class: 'ring track thin' }), this.shieldRing, this.outline);

    this.shieldTrack.append(this.shieldBar);
    this.hullTrack.append(this.hullBar);
    const grid = el('div', 'hud-target-grid');
    grid.append(
      el('span', 'hud-dim', 'SHIELD'), this.shieldTrack, this.shieldValue,
      el('span', 'hud-dim', 'HULL'), this.hullTrack, this.hullValue,
      el('span', 'hud-dim', 'RANGE'), el('span'), this.range,
      el('span', 'hud-dim', 'CLOSING'), el('span'), this.closing,
    );

    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Selection');
    this.root.append(head, this.name, this.who, pic, grid, this.armed, this.cargo, this.reads, this.actions);
    const column = el('div', 'hud-right');
    column.append(this.locks, this.root);
    parent.append(column);
  }

  /**
   * Refresh. `selected` is the client's selection (also the nav
   * target); with none, the active lock is shown, if there is one.
   */
  update(world: World, ship: Ship | null, selected: NavTarget | null = null): void {
    const locks = ship?.locks ?? [];
    show(this.locks, ship !== null && locks.length > 0);
    if (ship && locks.length > 0) this.updateStrip(world, ship, locks);

    const target: NavTarget | null = selected ?? (ship?.activeLock ? { kind: isRock(world, ship.activeLock) ? 'rock' : 'ship', id: ship.activeLock } : null);
    show(this.root, Boolean(ship && target && ship.state === 'flying'));
    this.shownId = target?.id ?? null;
    if (!ship || !target || ship.state !== 'flying') return;

    const lock = locks.find((l) => l.targetId === target.id);
    show(this.unlock, lock !== undefined);
    // Stations, caches and anything not locked have no condition to show: no picture rows of dashes.
    const plain = !lock && !(target.kind === 'ship' && world.ships[target.id] && !world.ships[target.id]!.contact) ? 'yes' : 'no';
    setAttr(this.root, 'data-plain', plain);
    this.updateActions(world, ship, target, lock, selected !== null);
    if (!lock) {
      this.showUnlocked(world, ship, target);
      return;
    }
    const read = lockReadout(world, ship, lock.targetId);
    if (isRock(world, lock.targetId)) {
      this.showRock(world, ship, lock, read);
      return;
    }
    const stance = readoutStance(read);
    setAttr(this.root, 'data-stance', stance);
    setText(this.stance, lock.progress < 1 ? 'CONTACT' : STANCE_WORDS[stance]);
    setText(this.lockState, lock.progress < 1 ? `LOCKING ${Math.floor(lock.progress * 100)}%` : 'LOCKED');

    // Identity: name, who, size, and the hull drawing from the catalogue.
    const id = read?.identity;
    setText(this.name, id ? (id.escapePod ? 'Escape pod' : id.hullName) : lock.progress < 1 ? 'Locking…' : 'Unidentified');
    // Size in the same words a contact shows (small, medium, large), so identifying one does not change its size.
    const size = id ? contactSize(world.hulls[id.hullId]) : null;
    setText(this.who, id ? `${FLOWN_BY_WORDS[id.flownBy]} · ${size ? size[0]!.toUpperCase() + size.slice(1) : (SIZE_NAMES[id.sizeClass] ?? id.sizeClass)}` : 'No identity reading');
    const hullId = id?.hullId ?? '';
    if (this.hullId !== hullId) {
      this.hullId = hullId;
      const hull = hullId ? world.hulls[hullId] : undefined;
      setAttr(this.outline, 'points', hull ? silhouettePoints(hull.outline, SIL_RING * 1.4) : '');
    }

    // Condition: exact figures from a combat readout, words from a condition one.
    const combat = read?.combat;
    const condition = read?.condition;
    // Hidden but kept in the grid, so the rows never shift.
    this.shieldTrack.classList.toggle('invisible', !combat);
    this.hullTrack.classList.toggle('invisible', !combat);
    if (combat) {
      const shieldF = fraction(combat.shield, combat.maxShield);
      const hullF = fraction(combat.structure, combat.maxStructure);
      setAttr(this.shieldRing, 'd', arcPath(0, 0, SIL_RING, shieldF, -90, 360));
      setAttr(this.shieldBar, 'style', `width: ${(shieldF * 100).toFixed(1)}%`);
      setAttr(this.hullBar, 'style', `width: ${(hullF * 100).toFixed(1)}%`);
      setText(this.shieldValue, `${Math.ceil(combat.shield)}/${Math.round(combat.maxShield)}`);
      setText(this.hullValue, `${Math.ceil(combat.structure)}/${Math.round(combat.maxStructure)}`);
    } else {
      // Without exact figures the ring is whole while shields are up, gone when down.
      setAttr(this.shieldRing, 'd', condition?.shield === 'up' ? arcPath(0, 0, SIL_RING, 1, -90, 360) : '');
      setText(this.shieldValue, condition ? SHIELD_WORDS[condition.shield] : NONE);
      setText(this.hullValue, condition ? HULL_WORDS[condition.hull] : NONE);
    }
    this.hullValue.classList.toggle('critical', condition?.hull === 'critical' || (combat !== undefined && fraction(combat.structure, combat.maxStructure) < 0.25));

    const motion = read?.motion;
    setText(this.range, motion ? Math.round(motion.range).toLocaleString('en-GB') : NONE);
    const close = motion ? Math.round(motion.closingSpeed) : 0;
    setText(this.closing, motion ? `${close > 0 ? '+' : ''}${close} u/s` : NONE);

    show(this.armed, Boolean(combat));
    if (combat) {
      setText(this.armed, combat.weapons.length === 0 ? 'UNARMED' : `ARMED ${combat.weapons.length} · DPS ${Math.round(combat.gunDps + combat.pointDefenceDps)}`);
    }
    const hold = read?.cargo;
    show(this.cargo, Boolean(hold));
    if (hold) {
      const goods = Object.entries(hold.hold)
        .filter(([, n]) => n > 0)
        .map(([item, n]) => `${item} ${n}`)
        .join(', ');
      setText(this.cargo, `CARGO ${hold.used}/${hold.capacity}${goods ? ` · ${goods}` : ''}`);
    }

    // Which readings your computer gives, so a missing one reads as a limit, not a fault.
    const kinds = shipStats(world, ship).readouts;
    setText(this.reads, lock.progress < 1 ? 'Readings when locked' : `READS ${kinds.map((k) => k.toUpperCase()).join(' · ')}`);
  }

  /**
   * A locked rock (docs/mining.md): where it is and, with a mining
   * computer, what it holds and whether your laser can cut it.
   */
  private showRock(world: World, ship: Ship, lock: TargetLock, read: LockReadout | null): void {
    setAttr(this.root, 'data-stance', 'rock');
    setText(this.stance, lock.progress < 1 ? 'CONTACT' : 'ROCK');
    setText(this.lockState, lock.progress < 1 ? `LOCKING ${Math.floor(lock.progress * 100)}%` : 'LOCKED');
    const comp = read?.composition;
    setText(this.name, comp ? `Rock, ${comp.total} units` : 'Rock');
    // A deep assay also reads a gate-glass core and its breach points.
    const core = comp?.core ? ` · ${comp.core.fractured ? 'FRACTURED ' : ''}GLASS CORE, ${comp.core.points.length} BREACH POINTS` : comp?.core === null ? ' · no core' : '';
    setText(this.who, comp ? `Hardness ${Math.round(comp.hardness * 100)}%${core}` : lock.progress < 1 ? 'Locking…' : 'No composition reading');
    if (comp?.fragile) setText(this.name, `Exposed gate-glass · collapses in ${Math.ceil(comp.fragile.secondsLeft ?? 0)}s`);
    if (this.hullId !== 'rock') {
      this.hullId = 'rock';
      setAttr(this.outline, 'points', rockPoints(SIL_RING * 0.8));
    }
    setAttr(this.shieldRing, 'd', '');
    this.shieldTrack.classList.add('invisible');
    this.hullTrack.classList.add('invisible');
    setText(this.shieldValue, NONE);
    setText(this.hullValue, NONE);
    this.hullValue.classList.remove('critical');
    const motion = read?.motion;
    setText(this.range, motion ? Math.round(motion.range).toLocaleString('en-GB') : NONE);
    const close = motion ? Math.round(motion.closingSpeed) : 0;
    setText(this.closing, motion ? `${close > 0 ? '+' : ''}${close} u/s` : NONE);
    show(this.armed, Boolean(comp));
    if (comp) {
      // Can any fitted mining laser cut it?
      const strength = Math.max(0, ...Object.values(shipStats(world, ship).weapons).map((w) => w.mining?.strength ?? 0));
      setText(this.armed, strength <= 0 ? 'NO MINING LASER FITTED' : strength >= comp.hardness ? `YOUR LASER CUTS IT (${Math.round(strength * 100)}%)` : `TOO HARD FOR YOUR LASER (${Math.round(strength * 100)}%)`);
      // Brittle glass: a heavy laser shatters what it cuts.
      if (comp.fragile && strength > FRAGILE_STRENGTH) setText(this.armed, `BRITTLE: YOUR LASER (${Math.round(strength * 100)}%) WILL SHATTER IT: USE DRONES OR A LIGHT LASER`);
      // And the drones, which cut softer rock than most turrets.
      const drones = droneStrength(world, ship);
      if (drones > 0 && !comp.fragile) setText(this.armed, `${this.armed.textContent ?? ''} · ${drones >= comp.hardness ? 'DRONES CUT IT' : `TOO HARD FOR DRONES (${Math.round(drones * 100)}%)`}`);
    }
    show(this.cargo, true);
    setText(
      this.cargo,
      comp
        ? 'ORE ' +
            Object.entries(comp.ores)
              .sort((a, b) => b[1] - a[1])
              .map(([good, n]) => `${world.goods[good]?.name ?? good} ${n}`)
              .join(' · ')
        : 'A mining computer reads what it holds',
    );
    const kinds = shipStats(world, ship).readouts;
    setText(this.reads, lock.progress < 1 ? 'Readings when locked' : `READS ${kinds.map((k) => k.toUpperCase()).join(' · ')}`);
  }

  /**
   * Something selected but not locked: a station, a cache, a ship or a
   * rock. Only what the radar gives (where it is, how it moves), and for
   * a ship showing its colours, its name and hull; a dark ship is a
   * contact of a size. A station adds its services and free pads.
   */
  private showUnlocked(world: World, ship: Ship, target: NavTarget): void {
    const where = plotPosition(world, target.kind, target.id);
    const other = target.kind === 'ship' || target.kind === 'drone' ? world.ships[target.id] : undefined;
    const station = target.kind === 'station' ? world.stations[target.id] : undefined;
    const body = target.kind === 'body' ? world.bodies[target.id] : undefined;
    const stance = station ? 'station' : body ? 'station' : target.kind === 'cache' ? 'cache' : target.kind === 'rock' ? 'rock' : other?.contact ? 'unknown' : 'unlocked';
    setAttr(this.root, 'data-stance', stance);
    setText(this.stance, station ? 'STATION' : body ? 'WORLD' : target.kind === 'cache' ? 'CACHE' : target.kind === 'rock' ? 'ROCK' : other?.contact ? 'CONTACT' : 'NOT LOCKED');
    setText(this.lockState, station ? 'BEACON ON' : target.kind === 'cache' || station || body ? '' : 'NOT LOCKED');

    const name = plotName(world, target.kind, target.id, '');
    if (other?.contact) {
      setText(this.name, 'Unknown contact');
      setText(this.who, `RADAR · ${other.contact.toUpperCase()} · running dark: lock it to identify it`);
    } else if (other) {
      const hull = world.hulls[other.hullId];
      setText(this.name, hull?.name ?? 'Ship');
      setText(this.who, `${name.toUpperCase()} · squawking · lock it for more`);
    } else if (station) {
      setText(this.name, station.name);
      setText(this.who, 'Broadcasting its beacon');
    } else if (body) {
      setText(this.name, body.name);
      setText(this.who, `${body.kind === 'moon' ? 'Moon' : 'Planet'} · radius ${Math.round(body.radius).toLocaleString('en-GB')} u · a burn stops above its well (U)`);
    } else if (target.kind === 'rock') {
      const rock = world.asteroids.find((a) => a.id === target.id);
      setText(this.name, rock ? `Rock, radius ${Math.round(rock.radius)}` : 'Rock');
      setText(this.who, 'Lock it to read what it holds');
    } else {
      setText(this.name, name);
      setText(this.who, 'Loose canisters: scoop them with a tractor');
    }

    // The picture: a hull outline for a ship showing colours, a rock's lumps, nothing else.
    const pic = other && !other.contact ? other.hullId : target.kind === 'rock' ? 'rock' : '';
    if (this.hullId !== pic) {
      this.hullId = pic;
      const hull = other && !other.contact ? world.hulls[other.hullId] : undefined;
      setAttr(this.outline, 'points', pic === 'rock' ? rockPoints(SIL_RING * 0.8) : hull ? silhouettePoints(hull.outline, SIL_RING * 1.4) : '');
    }
    setAttr(this.shieldRing, 'd', '');
    this.shieldTrack.classList.add('invisible');
    this.hullTrack.classList.add('invisible');
    setText(this.shieldValue, NONE);
    setText(this.hullValue, NONE);
    this.hullValue.classList.remove('critical');

    const range = where ? distance(ship.position, where.position) : null;
    const close = where ? closingSpeed(ship.position, ship.velocity, where.position, where.velocity) : null;
    setText(this.range, range === null ? NONE : Math.round(range).toLocaleString('en-GB'));
    const c = close === null ? 0 : Math.round(close);
    setText(this.closing, close === null ? NONE : `${c > 0 ? '+' : ''}${c} u/s`);

    // A third line: when you get there, and for a station what it offers.
    const eta = range !== null && close !== null ? clockWords(arrivalSeconds(range, close)) : '--';
    show(this.armed, true);
    setText(this.armed, `ARRIVE ${eta}`);
    show(this.cargo, station !== undefined);
    if (station) {
      const services = [station.market && Object.keys(station.market).length > 0 ? 'MARKET' : '', station.outfitting ? 'OUTFITTING' : '', station.shipMart.length > 0 ? 'SHIP MART' : ''].filter(Boolean).join(' · ');
      const free = station.pads.length - occupiedPads(station, world.ships).size;
      setText(this.cargo, `${services || 'NO SERVICES'} · PADS ${free} of ${station.pads.length} free`);
    }
    setText(this.reads, target.kind === 'station' || target.kind === 'cache' || target.kind === 'body' ? 'Selected: also your nav target' : 'Not locked: radar only');
  }

  /**
   * The buttons for what is shown: lock or make active, dock at a
   * station, send a drone to a rock, and clear the selection. Rebuilt
   * only when the set of buttons changes, so one never moves under the
   * pointer mid-click.
   */
  private updateActions(world: World, ship: Ship, target: NavTarget, lock: TargetLock | undefined, selected: boolean): void {
    const lockable = target.kind === 'ship' || target.kind === 'rock' || target.kind === 'drone';
    const want: { id: string; label: string; title: string; run: () => void }[] = [];
    if (lockable && !lock) want.push({ id: 'lock', label: 'LOCK', title: 'Start a lock (right-click does the same)', run: () => this.act.lock(target.id) });
    if (lock && ship.activeLock !== target.id) want.push({ id: 'active', label: 'MAKE ACTIVE', title: 'Make this the active lock', run: () => this.act.activate(target.id) });
    if (target.kind === 'station') want.push({ id: 'dock', label: 'DOCK', title: 'Dock here, inside the range ring and slow enough (F)', run: () => this.act.dock() });
    if (target.kind === 'rock' && lock && lock.progress >= 1 && shipStats(world, ship).droneCapacity > 0) {
      want.push({ id: 'drone', label: 'SEND DRONE', title: 'Send the next free drone to this rock (make it your active lock first)', run: () => this.act.sendDrone() });
    }
    if (selected) want.push({ id: 'clear', label: 'CLEAR', title: 'Clear the selection and the nav target', run: () => this.act.clear() });
    const key = `${target.id}|${want.map((w) => w.id).join(',')}`;
    if (key === this.actionKey) return;
    this.actionKey = key;
    this.actions.replaceChildren(
      ...want.map((w) => {
        const b = el('button', 'hud-target-action', w.label) as HTMLButtonElement;
        b.type = 'button';
        b.title = w.title;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          w.run();
        });
        return b;
      }),
    );
    show(this.actions, want.length > 0);
  }

  /**
   * The lock strip. Cards are rebuilt only when the set of locks or the
   * slot count changes; otherwise only their text and bars move, so a
   * card never shifts under the pointer while it is being clicked.
   */
  private updateStrip(world: World, ship: Ship, locks: TargetLock[]): void {
    const max = shipStats(world, ship).maxLocks;
    setText(this.locksCount, `LOCKS ${locks.filter((l) => l.progress >= 1).length}/${max} · TAB switch`);
    const key = `${max}|${locks.map((l) => l.targetId).join(',')}`;
    if (key !== this.chipKey) {
      this.chipKey = key;
      this.chips.replaceChildren();
      this.chipFor = new Map();
      for (const lock of locks) {
        const chip = lockChip(() => this.onActivate(lock.targetId));
        this.chipFor.set(lock.targetId, chip);
        this.chips.append(chip.root);
      }
      for (let i = locks.length; i < max; i++) this.chips.append(el('div', 'hud-lock-free', 'FREE'));
    }
    for (const lock of locks) {
      const chip = this.chipFor.get(lock.targetId);
      if (!chip) continue;
      const read = lockReadout(world, ship, lock.targetId);
      const id = read?.identity;
      const active = lock.targetId === ship.activeLock;
      const rock = isRock(world, lock.targetId);
      setAttr(chip.root, 'data-stance', rock ? 'rock' : readoutStance(read));
      chip.root.classList.toggle('active', active);
      setAttr(chip.root, 'aria-pressed', String(active));
      const hullId = rock ? 'rock' : (id?.hullId ?? '');
      if (chip.outline.dataset['hull'] !== hullId) {
        chip.outline.dataset['hull'] = hullId;
        const hull = hullId && !rock ? world.hulls[hullId] : undefined;
        setAttr(chip.outline, 'points', rock ? rockPoints(CHIP_SIL * 0.4) : hull ? silhouettePoints(hull.outline, CHIP_SIL) : '');
      }
      const name = rock ? 'ROCK' : id ? (id.escapePod ? 'POD' : id.hullName.split(' ').pop()!.toUpperCase()) : 'CONTACT';
      setText(chip.name, name);
      setAttr(chip.root, 'aria-label', `${rock ? 'Rock' : id ? id.hullName : 'Contact'}${active ? ', active lock' : ''}`);
      const locking = lock.progress < 1;
      show(chip.bar, locking);
      show(chip.detail, !locking);
      if (locking) setAttr(chip.fill, 'style', `width: ${(lock.progress * 100).toFixed(0)}%`);
      else setText(chip.detail, read?.motion ? Math.round(read.motion.range).toLocaleString('en-GB') : NONE);
    }
  }
}

/** True if a lock's target is one of the belt's rocks. */
function isRock(world: World, targetId: string): boolean {
  return !world.ships[targetId] && world.asteroids.some((a) => a.id === targetId);
}

/** A lumpy rock outline of radius `r`, as SVG polygon points. */
function rockPoints(r: number): string {
  const lumps = [1, 0.82, 0.95, 0.74, 1, 0.88, 0.8, 0.97, 0.85];
  return lumps
    .map((k, i) => {
      const a = (i / lumps.length) * Math.PI * 2;
      return `${(Math.cos(a) * r * k).toFixed(1)},${(Math.sin(a) * r * k).toFixed(1)}`;
    })
    .join(' ');
}

function lockChip(onClick: () => void): LockChip {
  const root = el('button', 'hud-lock');
  root.type = 'button';
  root.addEventListener('click', onClick);
  const pic = svg('svg', { width: CHIP_SIL + 4, height: CHIP_SIL + 4, viewBox: `${-CHIP_SIL / 2 - 2} ${-CHIP_SIL / 2 - 2} ${CHIP_SIL + 4} ${CHIP_SIL + 4}`, 'aria-hidden': 'true' });
  const outline = svg('polygon', { class: 'silhouette' });
  pic.append(outline);
  const name = el('span', 'hud-lock-name');
  const detail = el('span', 'hud-dim');
  const bar = el('span', 'bar hud-lock-bar');
  const fill = el('span', 'bar-fill');
  bar.append(fill);
  root.append(pic, name, detail, bar);
  return { root, outline, name, detail, bar, fill };
}
