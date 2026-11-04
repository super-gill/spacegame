import type { Ship, TargetLock, World } from '@spacegame/sim';
import { distance, shipStats } from '@spacegame/sim';
import { shipLabel, shipName } from '../ui.js';
import { el, setAttr, setText, show, svg } from './dom.js';
import { arcPath, closingSpeed, fraction, silhouettePoints } from './geometry.js';

/**
 * Target locks on the right edge.
 *
 * - The lock strip: one small card per lock, the active one outlined,
 *   a bar on any still locking, and a dashed card per free slot up to
 *   your ship's `maxLocks`. Click a card to make that lock active.
 * - The target card under it, for the active lock: stance, name, its
 *   silhouette inside its shield ring, shield and hull bars, range and
 *   closing speed, and whether it is still locking.
 *
 * Both show only while you hold a lock.
 */

const SIZE_NAMES: Record<string, string> = { S: 'Small', M: 'Medium', L: 'Large' };
const SILHOUETTE = 120;
const SIL_MID = SILHOUETTE / 2;
const SIL_RING = 52;
const CHIP_SIL = 26;

/** How a target reads: hostile, neutral trader, or a pilot's ship. */
export type TargetStance = 'hostile' | 'neutral' | 'pilot';

export function targetStance(world: World, ship: Ship): TargetStance {
  const brain = world.npcs[ship.id];
  if (brain?.kind === 'pirate') return 'hostile';
  if (brain) return 'neutral';
  return 'pilot';
}

const STANCE_WORDS: Record<TargetStance, string> = { hostile: 'HOSTILE', neutral: 'NEUTRAL', pilot: 'PILOT' };

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
  private readonly shieldBar = el('div', 'bar-fill shield');
  private readonly hullBar = el('div', 'bar-fill hull');
  private readonly shieldValue = el('span', 'num');
  private readonly hullValue = el('span', 'num');
  private readonly range = el('span', 'num');
  private readonly closing = el('span', 'num');
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

    const grid = el('div', 'hud-target-grid');
    const bar = (fill: HTMLDivElement) => {
      const track = el('div', 'bar');
      track.append(fill);
      return track;
    };
    grid.append(
      el('span', 'hud-dim', 'SHIELD'), bar(this.shieldBar), this.shieldValue,
      el('span', 'hud-dim', 'HULL'), bar(this.hullBar), this.hullValue,
      el('span', 'hud-dim', 'RANGE'), el('span'), this.range,
      el('span', 'hud-dim', 'CLOSING'), el('span'), this.closing,
    );

    this.root.append(head, this.name, this.who, pic, grid);
    const column = el('div', 'hud-right');
    column.append(this.locks, this.root);
    parent.append(column);
  }

  update(world: World, ship: Ship | null): void {
    const locks = ship?.locks ?? [];
    show(this.locks, ship !== null && locks.length > 0);
    if (ship && locks.length > 0) this.updateStrip(world, ship, locks);

    const target = ship?.activeLock ? world.ships[ship.activeLock] : undefined;
    const lock = locks.find((l) => l.targetId === ship?.activeLock);
    const hull = target ? world.hulls[target.hullId] : undefined;
    show(this.root, Boolean(ship && target && hull && lock));
    if (!ship || !target || !hull || !lock) return;

    const stance = targetStance(world, target);
    setAttr(this.root, 'data-stance', stance);
    setText(this.stance, STANCE_WORDS[stance]);
    setText(this.lockState, lock.progress < 1 ? `LOCKING ${Math.floor(lock.progress * 100)}%` : 'LOCKED');
    setText(this.name, shipName(world, target));
    const brain = world.npcs[target.id];
    const who = brain ? brain.kind.toUpperCase() : shipLabel(world, target);
    setText(this.who, `${who} · ${SIZE_NAMES[hull.sizeClass] ?? hull.sizeClass}`);

    if (this.hullId !== hull.id) {
      this.hullId = hull.id;
      setAttr(this.outline, 'points', silhouettePoints(hull.outline, SIL_RING * 1.4));
    }

    const stats = shipStats(world, target);
    const shieldF = fraction(target.shield, stats.shield);
    const hullF = fraction(target.structure, stats.structure);
    setAttr(this.shieldRing, 'd', arcPath(0, 0, SIL_RING, shieldF, -90, 360));
    setAttr(this.shieldBar, 'style', `width: ${(shieldF * 100).toFixed(1)}%`);
    setAttr(this.hullBar, 'style', `width: ${(hullF * 100).toFixed(1)}%`);
    setText(this.shieldValue, `${Math.ceil(target.shield)}/${Math.round(stats.shield)}`);
    setText(this.hullValue, `${Math.ceil(target.structure)}/${Math.round(stats.structure)}`);
    setText(this.range, Math.round(distance(ship.position, target.position)).toLocaleString('en-GB'));
    const close = Math.round(closingSpeed(ship, target));
    setText(this.closing, `${close > 0 ? '+' : ''}${close} u/s`);
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
      const target = world.ships[lock.targetId];
      if (!chip || !target) continue;
      const hull = world.hulls[target.hullId];
      const active = lock.targetId === ship.activeLock;
      const stance = targetStance(world, target);
      setAttr(chip.root, 'data-stance', stance);
      chip.root.classList.toggle('active', active);
      setAttr(chip.root, 'aria-pressed', String(active));
      if (hull && chip.outline.dataset['hull'] !== hull.id) {
        chip.outline.dataset['hull'] = hull.id;
        setAttr(chip.outline, 'points', silhouettePoints(hull.outline, CHIP_SIL));
      }
      const name = (hull?.name ?? 'Ship').split(' ').pop()!.toUpperCase();
      setText(chip.name, name);
      setAttr(chip.root, 'aria-label', `${shipName(world, target)}${active ? ', active lock' : ''}`);
      const locking = lock.progress < 1;
      show(chip.bar, locking);
      show(chip.detail, !locking);
      if (locking) setAttr(chip.fill, 'style', `width: ${(lock.progress * 100).toFixed(0)}%`);
      else setText(chip.detail, Math.round(distance(ship.position, target.position)).toLocaleString('en-GB'));
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
