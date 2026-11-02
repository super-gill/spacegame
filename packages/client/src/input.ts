import type { PlayerInput } from '@spacegame/sim';
import { toAngle } from '@spacegame/sim';
import type { Camera } from './camera.js';

/**
 * Keyboard and mouse state, sampled once per sim tick into a PlayerInput.
 *
 * Bindings live in KEYS so they can be remapped from one place later.
 * Edge-triggered actions (dock) are latched between samples so a quick
 * tap between two ticks is never lost.
 */

const KEYS = {
  thrustForward: ['KeyW', 'ArrowUp'],
  thrustReverse: ['KeyS', 'ArrowDown'],
  strafeLeft: ['KeyA', 'ArrowLeft'],
  strafeRight: ['KeyD', 'ArrowRight'],
  brake: ['Space', 'KeyX'],
  toggleDock: ['KeyF'],
} as const;

export class InputController {
  private readonly down = new Set<string>();
  private dockLatched = false;
  private mouseScreen = { x: 0, y: 0 };
  private hasMouse = false;

  constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    target.addEventListener('mousemove', this.onMouseMove);
    target.addEventListener('mouseleave', () => (this.hasMouse = false));
  }

  /** Allow UI buttons (e.g. Undock) to trigger the same latch as the key. */
  requestToggleDock(): void {
    this.dockLatched = true;
  }

  /** Build this tick's PlayerInput. Consumes latched edge actions. */
  sample(camera: Camera, shipWorldPos: { x: number; y: number }): PlayerInput {
    let aimHeading: number | null = null;
    if (this.hasMouse) {
      const world = camera.screenToWorld(this.mouseScreen);
      aimHeading = toAngle({ x: world.x - shipWorldPos.x, y: world.y - shipWorldPos.y });
    }

    const input: PlayerInput = {
      aimHeading,
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

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.target.getBoundingClientRect();
    this.mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.hasMouse = true;
  };
}
