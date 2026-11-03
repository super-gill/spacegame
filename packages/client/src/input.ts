import type { PlayerInput } from '@spacegame/sim';

/**
 * Keyboard state, sampled once per sim tick into a PlayerInput.
 *
 * Flight is keyboard only so the mouse stays free for targeting,
 * interacting with objects and UI in later versions.
 *
 * Bindings live in KEYS so they can be remapped from one place later.
 * Edge-triggered actions (dock) are latched between samples so a quick
 * tap between two ticks is never lost.
 */

const KEYS = {
  turnLeft: ['KeyQ', 'ArrowLeft'],
  turnRight: ['KeyE', 'ArrowRight'],
  thrustForward: ['KeyW', 'ArrowUp'],
  thrustReverse: ['KeyS', 'ArrowDown'],
  strafeLeft: ['KeyA'],
  strafeRight: ['KeyD'],
  brake: ['Space', 'KeyX'],
  toggleDock: ['KeyF'],
} as const;

export class InputController {
  private readonly down = new Set<string>();
  private dockLatched = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  /** Allow UI buttons (e.g. Undock) to trigger the same latch as the key. */
  requestToggleDock(): void {
    this.dockLatched = true;
  }

  /** Build this tick's PlayerInput. Consumes latched edge actions. */
  sample(): PlayerInput {
    const input: PlayerInput = {
      turnLeft: this.any(KEYS.turnLeft),
      turnRight: this.any(KEYS.turnRight),
      thrustForward: this.any(KEYS.thrustForward),
      thrustReverse: this.any(KEYS.thrustReverse),
      strafeLeft: this.any(KEYS.strafeLeft),
      strafeRight: this.any(KEYS.strafeRight),
      brake: this.any(KEYS.brake),
      toggleDock: this.dockLatched,
    };
    this.dockLatched = false;
    return input;
  }

  private any(codes: readonly string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if ((KEYS.toggleDock as readonly string[]).includes(e.code)) this.dockLatched = true;
    this.down.add(e.code);
    // Stop the page scrolling on space and arrows.
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  private onBlur = (): void => {
    this.down.clear();
  };
}
