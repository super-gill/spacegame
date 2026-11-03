/**
 * Every control in the game, in one table.
 *
 * Input handling and the on-screen controls panel both read from here, so
 * the panel can never drift out of date with what the keys actually do.
 * To add or change a control, edit this file and nothing else in the
 * client; then handle the action in the sim (flight actions) or in
 * main.ts (interface actions), and update docs/controls.md.
 */

/** Actions handed to the sim each tick via ShipInput. */
export type SimAction =
  | 'thrustForward'
  | 'thrustReverse'
  | 'strafeLeft'
  | 'strafeRight'
  | 'turnLeft'
  | 'turnRight'
  | 'brake'
  | 'cycleFlightMode'
  | 'toggleDock';

/** Actions the client handles itself; the sim never sees them. */
export type UiAction = 'toggleControls';

export type Action = SimAction | UiAction;

export interface KeyBinding {
  action: Action;
  /** `KeyboardEvent.code` values. The first is the one shown first in the panel. */
  codes: readonly string[];
  group: string;
  label: string;
  /**
   * `hold`: active while the key is down. `press`: fires once per key
   * press, and is latched so a tap between two sim ticks is never lost.
   */
  kind: 'hold' | 'press';
  note?: string;
}

/** A mouse or on-screen control, listed in the panel for completeness. */
export interface PointerControl {
  input: string;
  group: string;
  label: string;
}

export const KEY_BINDINGS: readonly KeyBinding[] = [
  { action: 'thrustForward', codes: ['KeyW', 'ArrowUp'], group: 'Flight', label: 'Main engine', kind: 'hold' },
  { action: 'thrustReverse', codes: ['KeyS', 'ArrowDown'], group: 'Flight', label: 'Reverse thrust', kind: 'hold', note: 'Weaker than the main engine' },
  { action: 'strafeLeft', codes: ['KeyA'], group: 'Flight', label: 'Lateral thrust left', kind: 'hold' },
  { action: 'strafeRight', codes: ['KeyD'], group: 'Flight', label: 'Lateral thrust right', kind: 'hold' },
  { action: 'turnLeft', codes: ['KeyQ', 'ArrowLeft'], group: 'Flight', label: 'Spin left', kind: 'hold' },
  { action: 'turnRight', codes: ['KeyE', 'ArrowRight'], group: 'Flight', label: 'Spin right', kind: 'hold' },
  { action: 'brake', codes: ['Space', 'KeyX'], group: 'Flight', label: 'Brake', kind: 'hold', note: 'Stops drift and spin in any mode' },
  { action: 'cycleFlightMode', codes: ['KeyZ'], group: 'Flight computer', label: 'Cycle flight mode', kind: 'press', note: 'Full assist, rotation assist, manual' },
  { action: 'toggleDock', codes: ['KeyF'], group: 'Station', label: 'Dock / undock', kind: 'press', note: 'Inside the range ring and slow enough' },
  { action: 'toggleControls', codes: ['F1', 'Backquote'], group: 'Interface', label: 'Show / hide this panel', kind: 'press' },
];

export const POINTER_CONTROLS: readonly PointerControl[] = [
  { input: 'Click', group: 'Station', label: 'Undock button (when docked)' },
  { input: 'Click', group: 'Interface', label: 'Controls button, top right' },
];

const KEY_NAMES: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  Backquote: '`',
  Escape: 'Esc',
};

/** Human name for a `KeyboardEvent.code`, e.g. KeyW -> W. */
export function keyName(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code]!;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

/** Codes whose default browser behaviour must be suppressed (scrolling, help). */
export const SUPPRESS_DEFAULT: ReadonlySet<string> = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'F1',
]);
