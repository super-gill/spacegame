import type { LockReadout, Ship, TargetLock, World } from '@spacegame/sim';
import { lockReadout, shipStats } from '@spacegame/sim';
import { el, setAttr, setText, show, svg } from './dom.js';
import { arcPath, fraction, silhouettePoints } from './geometry.js';

/**
 * Target locks on the right edge.
 *
 * - The lock strip: one small card per lock, the active one outlined,
 *   a bar on any still locking, and a dashed card per free slot up to
 *   your ship's `maxLocks`. Click a card to make that lock active.
 * - The target card under it, for the active lock.
 *
 * Everything shown about a target comes from `lockReadout`, so from your
 * targeting computer: nothing until the lock completes, then only the
 * parts your computer reads (identity, motion, rough condition, exact
 * combat figures, cargo). The hull drawing comes from the catalogue
 * once identity says which hull it is. This never reads the target ship.
 */

const SIZE_NAMES: Record<string, string> = { S: 'Small', M: 'Medium', L: 'Large' };
const SILHOUETTE = 120;
const SIL_MID = SILHOUETTE / 2;
const SIL_RING = 52;
const CHIP_SIL = 26;
const NONE = '-';

/** How a target reads, from its identity readout; `unknown` without one. */
export type TargetStance = 'hostile' | 'neutral' | 'watch' | 'pilot' | 'empty' | 'unknown';

const FLOWN_BY_STANCE: Record<NonNullable<LockReadout['identity']>['flownBy'], TargetStance> = {
  pirate: 'hostile',
  trader: 'neutral',
  watch: 'watch',
  pilot: 'pilot',
  nobody: 'empty',
};

const STANCE_WORDS: Record<TargetStance, string> = {
  hostile: 'HOSTILE',
  neutral: 'NEUTRAL',
  watch: 'CALDER WATCH',
  pilot: 'PILOT',
  empty: 'EMPTY',
  unknown: 'UNIDENTIFIED',
};

const FLOWN_BY_WORDS: Record<NonNullable<LockReadout['identity']>['flownBy'], string> = {
  pirate: 'PIRATE',
  trader: 'TRADER',
  watch: 'PATROL',
  pilot: 'PILOT',
  nobody: 'NOBODY ABOARD',
};

const SHIELD_WORDS = { up: 'UP', down: 'DOWN', none: 'NONE' } as const;
const HULL_WORDS = { sound: 'SOUND', damaged: 'DAMAGED', critical: 'CRITICAL' } as const;

export function readoutStance(read: LockReadout | null): TargetStance {
  return read?.identity ? FLOWN_BY_STANCE[read.identity.flownBy] : 'unknown';
}

/**
 * Who flies a ship, in a word, as your targeting computer reads it: PIRATE,
 * TRADER, CALDER WATCH, PILOT, EMPTY. Null until a lock reads its identity.
 * For labels in space and the contacts list.
 */
export function readoutWho(read: LockReadout | null): string | null {
  if (!read?.identity) return null;
  const by = read.identity.flownBy;
  return by === 'watch' ? 'CALDER WATCH' : by === 'nobody' ? 'EMPTY' : FLOWN_BY_WORDS[by];
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

  /** `onActivate` makes a lock the active one (a click on its card). */
  constructor(parent: HTMLElement, private readonly onActivate: (targetId: string) => void) {
    this.locksHead.append(this.locksCount, el('span', '', 'ESC unlock'));
    this.locks.append(this.locksHead, this.chips);

    const head = el('div', 'hud-target-head');
    head.append(this.stance, this.lockState);

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

    this.root.append(head, this.name, this.who, pic, grid, this.armed, this.cargo, this.reads);
    const column = el('div', 'hud-right');
    column.append(this.locks, this.root);
    parent.append(column);
  }

  update(world: World, ship: Ship | null): void {
    const locks = ship?.locks ?? [];
    show(this.locks, ship !== null && locks.length > 0);
    if (ship && locks.length > 0) this.updateStrip(world, ship, locks);

    const lock = locks.find((l) => l.targetId === ship?.activeLock);
    show(this.root, Boolean(ship && lock));
    if (!ship || !lock) return;

    const read = lockReadout(world, ship, lock.targetId);
    const stance = readoutStance(read);
    setAttr(this.root, 'data-stance', stance);
    setText(this.stance, lock.progress < 1 ? 'CONTACT' : STANCE_WORDS[stance]);
    setText(this.lockState, lock.progress < 1 ? `LOCKING ${Math.floor(lock.progress * 100)}%` : 'LOCKED');

    // Identity: name, who, size, and the hull drawing from the catalogue.
    const id = read?.identity;
    setText(this.name, id ? (id.escapePod ? 'Escape pod' : id.hullName) : lock.progress < 1 ? 'Locking…' : 'Unidentified');
    setText(this.who, id ? `${FLOWN_BY_WORDS[id.flownBy]} · ${SIZE_NAMES[id.sizeClass] ?? id.sizeClass}` : 'No identity reading');
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
      const fixed = combat.weapons.filter((w) => w.kind === 'fixed').length;
      const turrets = combat.weapons.length - fixed;
      setText(this.armed, combat.weapons.length === 0 ? 'UNARMED' : `ARMED ${fixed} FIXED · ${turrets} TURRET · DPS ${Math.round(combat.fixedDps + combat.turretDps)}`);
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
      setAttr(chip.root, 'data-stance', readoutStance(read));
      chip.root.classList.toggle('active', active);
      setAttr(chip.root, 'aria-pressed', String(active));
      const hullId = id?.hullId ?? '';
      if (chip.outline.dataset['hull'] !== hullId) {
        chip.outline.dataset['hull'] = hullId;
        const hull = hullId ? world.hulls[hullId] : undefined;
        setAttr(chip.outline, 'points', hull ? silhouettePoints(hull.outline, CHIP_SIL) : '');
      }
      const name = id ? (id.escapePod ? 'POD' : id.hullName.split(' ').pop()!.toUpperCase()) : 'CONTACT';
      setText(chip.name, name);
      setAttr(chip.root, 'aria-label', `${id ? id.hullName : 'Contact'}${active ? ', active lock' : ''}`);
      const locking = lock.progress < 1;
      show(chip.bar, locking);
      show(chip.detail, !locking);
      if (locking) setAttr(chip.fill, 'style', `width: ${(lock.progress * 100).toFixed(0)}%`);
      else setText(chip.detail, read?.motion ? Math.round(read.motion.range).toLocaleString('en-GB') : NONE);
    }
  }
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
