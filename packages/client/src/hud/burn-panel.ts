import { burnAcceleration, burnStatus, burnTarget, railTime, type Ship, type World } from '@spacegame/sim';
import { bigDistance, minutesSeconds } from './chart.js';

/**
 * The burn on the HUD (approved mockup, 7 November 2026, "Mid-burn"):
 * while the ship burns, a banner across the top says where to, how fast,
 * when the flip comes and when it arrives, with a bar that fills over the
 * burn and a mark at the flip. Cancel is the burn key again.
 *
 * Coasting fast with no burn (after a cancel, or a pod thrown clear at
 * speed), the same banner says so and that U brakes: ordinary thrusters
 * take minutes to kill burn speeds, a braking burn about twenty seconds.
 *
 * The numbers come from `burnStatus` (burn.ts): the route the ship is
 * steering by from where it is now, so a pass round a world shows in the
 * time and the banner says which world it is rounding.
 */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Where a burn stands: speed, seconds to the flip (0 once braking), seconds to arrival, distance left along the route, the world being passed. */
export function burnProgress(world: World, ship: Ship): { speed: number; flipIn: number; arriveIn: number; left: number; braking: boolean; passing: string | null; to: string | null } | null {
  const status = burnStatus(world, ship);
  if (!status) return null;
  const to = status.target ? (status.target.kind === 'body' ? `${status.target.name.toUpperCase()} · ABOVE THE WELL` : status.target.name.toUpperCase()) : null;
  return { speed: status.speed, flipIn: status.flipSeconds, arriveIn: status.seconds, left: status.left, braking: status.braking, passing: status.passing, to };
}

/** Faster than this and not burning, the banner says you are coasting and how to stop. Units a second. */
const COASTING_SPEED = 2000;

export class BurnPanel {
  private readonly root = el('div', 'burn-panel hidden');
  private readonly to = el('span', 'burn-to');
  private readonly fill = el('div', 'burn-fill');
  private readonly flipMark = el('div', 'burn-flip');
  private readonly numbers = el('div', 'burn-numbers');
  private readonly state = el('span', 'burn-state', 'BURNING');
  private readonly bar = el('div', 'burn-bar');
  private readonly note = el('div', 'burn-note');

  constructor(parent: HTMLElement) {
    const head = el('div', 'burn-head');
    head.append(this.state, this.to);
    this.bar.append(this.fill, this.flipMark);
    this.root.append(head, this.bar, this.numbers, this.note);
    this.root.setAttribute('role', 'status');
    parent.append(this.root);
  }

  /**
   * `coastingTarget` names the nav target port, if any, for the coasting
   * line: U burns for it if there is one, and brakes to a stop if not.
   */
  update(world: World, ship: Ship | null, coastingTarget: string | null = null): void {
    const progress = ship ? burnProgress(world, ship) : null;
    const speed = ship ? Math.hypot(ship.velocity.x, ship.velocity.y) : 0;
    const coasting = Boolean(ship && !ship.burn && ship.state === 'flying' && speed > COASTING_SPEED);
    this.root.classList.toggle('hidden', !progress && !coasting);
    this.bar.classList.toggle('hidden', coasting);
    if (coasting && ship) {
      this.state.textContent = 'COASTING';
      this.to.textContent = '';
      const target = coastingTarget ? burnTarget(world, world.stations, coastingTarget, railTime(world.tick, world.dt)) : null;
      const brakeIn = speed / burnAcceleration(world, ship);
      this.numbers.replaceChildren(
        el('span', undefined, `${Math.round(speed).toLocaleString('en-GB')} u/s`),
        el('span', 'bright', target ? `U · BURN FOR ${target.name.toUpperCase()}` : `U · BRAKE TO A STOP IN ${minutesSeconds(brakeIn)}`),
      );
      this.note.textContent = 'THRUSTERS ALONE TAKE MINUTES AT THIS SPEED';
      return;
    }
    this.state.textContent = 'BURNING';
    this.note.textContent = 'WEAPONS, LOCKS AND DOCKING OFF · U TO CANCEL';
    if (!ship?.burn || !progress) return;
    this.to.textContent = progress.to ? `→ ${progress.to}` : 'BRAKING TO A STOP';
    const elapsed = (world.tick - ship.burn.startTick) * world.dt;
    const total = elapsed + progress.arriveIn;
    const done = total > 0 ? Math.min(1, elapsed / total) : 1;
    this.fill.style.width = `${(done * 100).toFixed(1)}%`;
    const flipAt = total > 0 ? (elapsed + progress.flipIn) / total : 0.5;
    this.flipMark.style.left = `${((progress.braking ? 0.5 : flipAt) * 100).toFixed(1)}%`;
    this.flipMark.classList.toggle('passed', progress.braking);
    const parts = [
      `${Math.round(progress.speed).toLocaleString('en-GB')} u/s`,
      progress.passing ? `ROUNDING ${progress.passing.toUpperCase()}` : progress.braking ? 'BRAKING' : `FLIP IN ${minutesSeconds(progress.flipIn)}`,
      `ARRIVE IN ${minutesSeconds(progress.arriveIn)}`,
      `${bigDistance(progress.left)} TO GO`,
    ];
    this.numbers.replaceChildren(...parts.map((p, i) => el('span', i === 1 ? 'bright' : undefined, p)));
  }
}
