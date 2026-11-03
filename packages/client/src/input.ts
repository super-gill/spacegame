import type { PlayerInput } from '@spacegame/sim';
import { KEY_BINDINGS, SUPPRESS_DEFAULT, type Action, type UiAction } from './bindings.js';

/**
 * Keyboard state, sampled once per sim tick into a PlayerInput.
 *
 * Flight is keyboard only so the mouse stays free for targeting,
 * interacting with objects and UI in later versions.
 *
 * Bindings come from bindings.ts. `press` actions are latched between
 * samples so a quick tap between two ticks is never lost. Interface
 * actions are not sent to the sim; they go straight to a callback.
 */

const UI_ACTIONS: ReadonlySet<Action> = new Set<UiAction>(['toggleControls']);

/** Which action, if any, a key code triggers. Built once from the table. */
const ACTION_BY_CODE = new Map<string, (typeof KEY_BINDINGS)[number]>();
for (const binding of KEY_BINDINGS) {
  for (const code of binding.codes) ACTION_BY_CODE.set(code, binding);
}

export class InputController {
  private readonly held = new Set<Action>();
  private readonly latched = new Set<Action>();
  private readonly downCodes = new Set<string>();

  constructor(private readonly onUiAction: (action: UiAction) => void) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  /** Allow UI buttons (e.g. Undock) to trigger the same latch as the key. */
  requestToggleDock(): void {
    this.latched.add('toggleDock');
  }

  /** Build this tick's PlayerInput. Consumes latched press actions. */
  sample(): PlayerInput {
    const input: PlayerInput = {
      thrustForward: this.held.has('thrustForward'),
      thrustReverse: this.held.has('thrustReverse'),
      strafeLeft: this.held.has('strafeLeft'),
      strafeRight: this.held.has('strafeRight'),
      turnLeft: this.held.has('turnLeft'),
      turnRight: this.held.has('turnRight'),
      brake: this.held.has('brake'),
      cycleFlightMode: this.latched.has('cycleFlightMode'),
      toggleDock: this.latched.has('toggleDock'),
    };
    this.latched.clear();
    return input;
  }

  /** Recompute held actions from the keys currently down, so two keys for one action behave. */
  private refreshHeld(): void {
    this.held.clear();
    for (const code of this.downCodes) {
      const binding = ACTION_BY_CODE.get(code);
      if (binding?.kind === 'hold') this.held.add(binding.action);
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (SUPPRESS_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    const binding = ACTION_BY_CODE.get(e.code);
    if (!binding) return;

    if (binding.kind === 'press') {
      if (UI_ACTIONS.has(binding.action)) this.onUiAction(binding.action as UiAction);
      else this.latched.add(binding.action);
      return;
    }
    this.downCodes.add(e.code);
    this.refreshHeld();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.downCodes.delete(e.code);
    this.refreshHeld();
  };

  private onBlur = (): void => {
    this.downCodes.clear();
    this.held.clear();
  };
}
