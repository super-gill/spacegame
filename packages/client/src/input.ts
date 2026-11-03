import type { ShipInput } from '@spacegame/sim';
import { KEY_BINDINGS, SUPPRESS_DEFAULT, type Action, type UiAction } from './bindings.js';

/**
 * Keyboard and mouse state, sampled once per sim tick into a ShipInput.
 *
 * Flight is keyboard only. The mouse aims the turret and fires: mouse
 * buttons appear in bindings.ts as the codes `Mouse0` (left) and `Mouse2`
 * (right) so they work exactly like keys. Buttons only count when pressed
 * over the game canvas, so clicking UI buttons never fires a weapon. The
 * pointer is never captured or hidden.
 *
 * `press` actions are latched between samples so a quick tap between two
 * ticks is never lost. Interface actions are not sent to the sim; they go
 * straight to a callback.
 */

const UI_ACTIONS: ReadonlySet<Action> = new Set<UiAction>(['toggleControls']);

/** Which action, if any, a code triggers. Built once from the table. */
const ACTION_BY_CODE = new Map<string, (typeof KEY_BINDINGS)[number]>();
for (const binding of KEY_BINDINGS) {
  for (const code of binding.codes) ACTION_BY_CODE.set(code, binding);
}

export class InputController {
  private readonly held = new Set<Action>();
  private readonly latched = new Set<Action>();
  private readonly downCodes = new Set<string>();
  /** Pointer position in CSS pixels relative to the canvas, or null if it has not moved yet. */
  pointer: { x: number; y: number } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onUiAction: (action: UiAction) => void,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    // Right click fires the turret, so the browser menu must not open over the game.
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Allow UI buttons (e.g. Undock) to trigger the same latch as the key. */
  requestToggleDock(): void {
    this.latched.add('toggleDock');
  }

  /**
   * Build this tick's ShipInput. Consumes latched press actions. `aimAt`
   * is left null; the caller fills it in, because turning a screen point
   * into a world point needs the camera.
   */
  sample(): ShipInput {
    const input: ShipInput = {
      thrustForward: this.held.has('thrustForward'),
      thrustReverse: this.held.has('thrustReverse'),
      strafeLeft: this.held.has('strafeLeft'),
      strafeRight: this.held.has('strafeRight'),
      turnLeft: this.held.has('turnLeft'),
      turnRight: this.held.has('turnRight'),
      brake: this.held.has('brake'),
      cycleFlightMode: this.latched.has('cycleFlightMode'),
      toggleDock: this.latched.has('toggleDock'),
      fireFixed: this.held.has('fireFixed'),
      fireTurret: this.held.has('fireTurret'),
      tractor: this.held.has('tractor'),
      aimAt: null,
    };
    this.latched.clear();
    return input;
  }

  /** Recompute held actions from the codes currently down, so two codes for one action behave. */
  private refreshHeld(): void {
    this.held.clear();
    for (const code of this.downCodes) {
      const binding = ACTION_BY_CODE.get(code);
      if (binding?.kind === 'hold') this.held.add(binding.action);
    }
  }

  private press(code: string): void {
    const binding = ACTION_BY_CODE.get(code);
    if (!binding) return;
    if (binding.kind === 'press') {
      if (UI_ACTIONS.has(binding.action)) this.onUiAction(binding.action as UiAction);
      else this.latched.add(binding.action);
      return;
    }
    this.downCodes.add(code);
    this.refreshHeld();
  }

  private release(code: string): void {
    this.downCodes.delete(code);
    this.refreshHeld();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (SUPPRESS_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.press(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => this.release(e.code);

  private onMouseDown = (e: MouseEvent): void => {
    this.press(`Mouse${e.button}`);
  };

  private onMouseUp = (e: MouseEvent): void => this.release(`Mouse${e.button}`);

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  private onBlur = (): void => {
    this.downCodes.clear();
    this.held.clear();
  };
}
