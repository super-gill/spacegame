import type { ShipInput } from '@spacegame/sim';
import { KEY_BINDINGS, SUPPRESS_DEFAULT, type Action, type UiAction } from './bindings.js';

/**
 * Keyboard and mouse state, sampled once per sim tick into a ShipInput.
 *
 * Flying and shooting are keyboard only. The mouse is for choosing: a
 * left click on the game canvas is passed to `onCanvasClick` (main.ts uses
 * it to select a target), and clicks on UI buttons never reach it. The
 * pointer is never captured or hidden. Mouse buttons can still be bound in
 * bindings.ts as the codes `Mouse0` (left) and `Mouse2` (right).
 *
 * `press` actions are latched between samples so a quick tap between two
 * ticks is never lost. Interface actions are not sent to the sim; they go
 * straight to a callback.
 */

const UI_ACTIONS: ReadonlySet<Action> = new Set<UiAction>(['toggleControls', 'cycleTarget', 'clearTarget']);

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

  /** Target change to send with the next sample, or null for no change. */
  private pendingTarget: { id: string | null } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onUiAction: (action: UiAction) => void,
    private readonly onCanvasClick: (point: { x: number; y: number }) => void,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    // Keep the browser menu off the game so right click is free for later use.
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Allow UI buttons (e.g. Undock) to trigger the same latch as the key. */
  requestToggleDock(): void {
    this.latched.add('toggleDock');
  }

  /** Select a target (or clear it with null) on the next tick. */
  requestTarget(id: string | null): void {
    this.pendingTarget = { id };
  }

  /** Build this tick's ShipInput. Consumes latched press actions and any pending target change. */
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
      toggleWeaponsHot: this.latched.has('toggleWeaponsHot'),
      selectTarget: this.pendingTarget,
      tractor: this.held.has('tractor'),
    };
    this.latched.clear();
    this.pendingTarget = null;
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
    if (e.button === 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.onCanvasClick({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
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
