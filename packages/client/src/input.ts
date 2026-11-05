import type { ShipInput } from '@spacegame/sim';
import { KEY_BINDINGS, SLOT_ACTIONS, SUPPRESS_DEFAULT, type Action, type UiAction } from './bindings.js';

/**
 * Keyboard and mouse state, sampled once per sim tick into a ShipInput.
 *
 * With mouse steering (the default) the pointer aims the nose (main.ts),
 * the left button on the game fires the selected group and the right
 * button chooses: it is passed to `onCanvasClick` (main.ts locks the ship
 * under it). Without mouse steering the left button chooses and Space
 * fires. Clicks on UI never reach the game. The pointer is never captured
 * or hidden. Mouse buttons can still be bound in bindings.ts as the codes
 * `Mouse0` (left) and `Mouse2` (right).
 *
 * `press` actions are latched between samples so a quick tap between two
 * ticks is never lost. Interface actions are not sent to the sim; they go
 * straight to a callback.
 */

const UI_ACTIONS: ReadonlySet<Action> = new Set<UiAction>(['toggleControls', 'toggleMenu', 'cycleTarget', 'toggleHeadingLock', 'clearTarget', 'board', 'stepOut', 'zoomIn', 'zoomOut', ...SLOT_ACTIONS]);

/** True while the person is typing in a text field, when keys must not fly the ship. */
function typingInField(e: KeyboardEvent): boolean {
  const t = e.target;
  if (t instanceof HTMLInputElement) return t.type === 'text';
  return t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
}

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
  /** False while the pointer is over a panel, card or button rather than space: mouse steering holds its aim then. */
  pointerOnGame = true;
  /**
   * Mouse steering's button layout (settings.ts): the left button fires
   * the selected group and the right button chooses (locks a ship). Off,
   * the left button chooses and only Space fires.
   */
  mouseSteering = false;
  /** Left button held on the game, with mouse steering: fire. */
  private mouseFire = false;

  /** Target change to send with the next sample, or null for no change. */
  private pendingLock: Pick<ShipInput, 'lock' | 'unlock' | 'activateLock'> = { lock: null, unlock: null, activateLock: null };
  /** Fire group to select with the next sample, or null. */
  private pendingGroup: number | null = null;
  /** Module to switch on or off (or fire) with the next sample, by mount, or null. */
  private pendingToggle: string | null = null;

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

  /** Start locking a ship and make it the active lock, on the next tick. */
  requestLock(id: string): void {
    this.pendingLock = { ...this.pendingLock, lock: id, activateLock: id };
  }

  /** Make an existing lock the active one, on the next tick. */
  requestActivate(id: string): void {
    this.pendingLock = { ...this.pendingLock, activateLock: id };
  }

  /** Select a fire group on the next tick. */
  requestGroup(group: number): void {
    this.pendingGroup = group;
  }

  /** Switch a module on or off, or fire it, on the next tick (an activation tile). */
  requestToggleModule(mountId: string): void {
    this.pendingToggle = mountId;
  }

  /** Drop the lock on a ship, on the next tick. */
  requestUnlock(id: string): void {
    this.pendingLock = { ...this.pendingLock, unlock: id };
  }

  /** Build this tick's ShipInput. Consumes latched press actions and any pending lock change. */
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
      fireFixed: this.held.has('fireFixed') || this.mouseFire,
      toggleWeaponsHot: this.latched.has('toggleWeaponsHot'),
      launchCountermeasure: this.latched.has('launchCountermeasure'),
      aimHeading: null, // mouse steering is added by main.ts, which knows the camera
      toggleModule: this.pendingToggle,
      afterburner: this.held.has('afterburner'),
      ...this.pendingLock,
      selectGroup: this.pendingGroup,
      tractor: this.held.has('tractor'),
      dropCache: this.latched.has('dropCache'),
    };
    this.latched.clear();
    this.pendingLock = { lock: null, unlock: null, activateLock: null };
    this.pendingGroup = null;
    this.pendingToggle = null;
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
    if (typingInField(e)) return;
    if (SUPPRESS_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.press(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => this.release(e.code);

  /**
   * Buttons on the game itself (clicks on panels, cards and buttons never
   * get here). With mouse steering the left button acts (fire) and the
   * right button chooses; without it the left button chooses.
   */
  private onMouseDown = (e: MouseEvent): void => {
    this.press(`Mouse${e.button}`);
    const rect = this.canvas.getBoundingClientRect();
    const at = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (this.mouseSteering) {
      if (e.button === 0) this.mouseFire = true;
      else if (e.button === 2) this.onCanvasClick(at);
    } else if (e.button === 0) {
      this.onCanvasClick(at);
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.release(`Mouse${e.button}`);
    if (e.button === 0) this.mouseFire = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // The HUD layer lets the pointer through to the canvas; anything else that catches it is interface.
    this.pointerOnGame = e.target === this.canvas;
  };

  private onBlur = (): void => {
    this.downCodes.clear();
    this.held.clear();
    this.mouseFire = false;
  };
}
