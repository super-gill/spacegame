import { burnAcceleration, burnEndPoint, type Ship, type World } from '@spacegame/sim';
import { bigDistance, minutesSeconds } from './chart.js';

/**
 * The burn on the HUD (approved mockup, 7 November 2026, "Mid-burn"):
 * while the ship burns, a banner across the top says where to, how fast,
 * when the flip comes and when it arrives, with a bar that fills over the
 * burn and a mark at the flip. Cancel is the burn key again.
 *
 * The numbers are worked out from the ship as it is, the same way the
 * sim steers (burn.ts): it closes at the speed it could still brake from,
 * √(2ad), so before that speed it is still accelerating towards the flip,
 * and past it braking.
 */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Where a burn stands: speed, seconds to the flip (0 once braking), seconds to arrival, distance left. */
export function burnProgress(world: World, ship: Ship): { speed: number; flipIn: number; arriveIn: number; left: number; braking: boolean } | null {
  if (!ship.burn) return null;
  const a = burnAcceleration(world, ship);
  const station = ship.burn.targetId ? world.stations[ship.burn.targetId] : undefined;
  const end = station ? burnEndPoint(station, ship.position) : ship.position;
  const endVelocity = station?.velocity ?? { x: 0, y: 0 };
  const left = Math.hypot(end.x - ship.position.x, end.y - ship.position.y);
  const speed = Math.hypot(ship.velocity.x - endVelocity.x, ship.velocity.y - endVelocity.y);
  if (a <= 0) return { speed, flipIn: 0, arriveIn: 0, left, braking: true };
  // The top speed this burn will reach: accelerating from v over the rest, then braking, covers d when v_top² = a·d + v²/2.
  const top = Math.sqrt(a * left + (speed * speed) / 2);
  const braking = speed >= Math.sqrt(2 * a * left) * 0.97 || top <= speed;
  if (braking) return { speed, flipIn: 0, arriveIn: speed / a, left, braking };
  const flipIn = (top - speed) / a;
  return { speed, flipIn, arriveIn: flipIn + top / a, left, braking };
}

export class BurnPanel {
  private readonly root = el('div', 'burn-panel hidden');
  private readonly to = el('span', 'burn-to');
  private readonly fill = el('div', 'burn-fill');
  private readonly flipMark = el('div', 'burn-flip');
  private readonly numbers = el('div', 'burn-numbers');

  constructor(parent: HTMLElement) {
    const head = el('div', 'burn-head');
    head.append(el('span', 'burn-state', 'BURNING'), this.to);
    const bar = el('div', 'burn-bar');
    bar.append(this.fill, this.flipMark);
    this.root.append(head, bar, this.numbers, el('div', 'burn-note', 'WEAPONS, LOCKS AND DOCKING OFF · U TO CANCEL'));
    this.root.setAttribute('role', 'status');
    parent.append(this.root);
  }

  update(world: World, ship: Ship | null): void {
    const progress = ship ? burnProgress(world, ship) : null;
    this.root.classList.toggle('hidden', !progress);
    if (!ship?.burn || !progress) return;
    const station = ship.burn.targetId ? world.stations[ship.burn.targetId] : undefined;
    this.to.textContent = station ? `→ ${station.name.toUpperCase()}` : 'BRAKING TO A STOP';
    const elapsed = (world.tick - ship.burn.startTick) * world.dt;
    const total = elapsed + progress.arriveIn;
    const done = total > 0 ? Math.min(1, elapsed / total) : 1;
    this.fill.style.width = `${(done * 100).toFixed(1)}%`;
    const flipAt = total > 0 ? (elapsed + progress.flipIn) / total : 0.5;
    this.flipMark.style.left = `${((progress.braking ? 0.5 : flipAt) * 100).toFixed(1)}%`;
    this.flipMark.classList.toggle('passed', progress.braking);
    const parts = [
      `${Math.round(progress.speed).toLocaleString('en-GB')} u/s`,
      progress.braking ? 'BRAKING' : `FLIP IN ${minutesSeconds(progress.flipIn)}`,
      `ARRIVE IN ${minutesSeconds(progress.arriveIn)}`,
      `${bigDistance(progress.left)} TO GO`,
    ];
    this.numbers.replaceChildren(...parts.map((p, i) => el('span', i === 1 ? 'bright' : undefined, p)));
  }
}
