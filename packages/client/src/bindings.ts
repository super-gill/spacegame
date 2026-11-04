import { BOARD_MAX_RELATIVE_SPEED, BOARD_RANGE } from '@spacegame/sim';

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
  | 'toggleDock'
  | 'fireFixed'
  | 'toggleWeaponsHot'
  | 'launchCountermeasure'
  | 'afterburner'
  | 'tractor';

/**
 * Actions the client handles itself. Target locking is worked out in
 * the client (it needs the camera and the pointer) and reaches the sim as
 * `lock`, `unlock` and `activateLock` inputs. Boarding is a pilot command, like trading, not
 * a flight input.
 */
export type UiAction =
  | 'toggleControls'
  | 'toggleMenu'
  | 'cycleTarget'
  | 'clearTarget'
  | 'board'
  | 'stepOut'
  | 'zoomIn'
  | 'zoomOut'
  | 'slot1'
  | 'slot2'
  | 'slot3'
  | 'slot4'
  | 'slot5'
  | 'slot6'
  | 'slot7'
  | 'slot8'
  | 'slot9';

/** The activation tile actions, in key order (sim `activationSlots`). */
export const SLOT_ACTIONS: readonly UiAction[] = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6', 'slot7', 'slot8', 'slot9'];

export type Action = SimAction | UiAction;

export interface KeyBinding {
  action: Action;
  /**
   * `KeyboardEvent.code` values, or `Mouse0` / `Mouse2` for the left and
   * right mouse buttons. The first is shown first in the panel.
   */
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
  { action: 'turnLeft', codes: ['KeyA', 'ArrowLeft'], group: 'Flight', label: 'Spin left', kind: 'hold', note: 'With mouse steering on (the default), strafes left instead: the nose follows the pointer' },
  { action: 'turnRight', codes: ['KeyD', 'ArrowRight'], group: 'Flight', label: 'Spin right', kind: 'hold', note: 'With mouse steering on, strafes right instead' },
  { action: 'strafeLeft', codes: ['KeyQ'], group: 'Flight', label: 'Lateral thrust left', kind: 'hold' },
  { action: 'strafeRight', codes: ['KeyE'], group: 'Flight', label: 'Lateral thrust right', kind: 'hold' },
  { action: 'brake', codes: ['KeyX'], group: 'Flight', label: 'Brake', kind: 'hold', note: 'Stops drift and spin in any mode' },
  { action: 'fireFixed', codes: ['Space'], group: 'Weapons', label: 'Fire the selected group', kind: 'hold', note: 'Or hold the left mouse button, with mouse steering. Guns fire where the nose points; launchers fire at your active lock' },
  { action: 'launchCountermeasure', codes: ['KeyC'], group: 'Weapons', label: 'Drop a countermeasure', kind: 'press', note: 'Chaff draws radar missiles, flares heat seekers; needs a dispenser' },
  { action: 'toggleWeaponsHot', codes: ['KeyH'], group: 'Weapons', label: 'Weapons hot / cold', kind: 'press', note: 'Hot: turrets engage your target on their own' },
  { action: 'cycleTarget', codes: ['Tab'], group: 'Targeting', label: 'Next lock', kind: 'press', note: 'Switches the active lock; with none, locks the nearest ship' },
  { action: 'clearTarget', codes: ['Escape'], group: 'Targeting', label: 'Unlock the active lock', kind: 'press' },
  { action: 'tractor', codes: ['KeyR'], group: 'Systems', label: 'Tractor beam', kind: 'hold', note: 'If one is fitted: pulls in nearby loot while held; its tile leaves it running' },
  { action: 'cycleFlightMode', codes: ['KeyZ'], group: 'Flight computer', label: 'Cycle flight mode', kind: 'press', note: 'Full assist, rotation assist, manual' },
  { action: 'toggleDock', codes: ['KeyF'], group: 'Station', label: 'Dock / undock', kind: 'press', note: 'Inside the range ring and slow enough' },
  { action: 'board', codes: ['KeyB'], group: 'Ships', label: 'Board your nearest empty ship', kind: 'press', note: `Docked at the same station, or in space within ${BOARD_RANGE} units, under ${BOARD_MAX_RELATIVE_SPEED} u/s relative` },
  { action: 'stepOut', codes: ['KeyG'], group: 'Ships', label: 'Step out in an escape pod', kind: 'press', note: 'In space only. Press twice. Your ship stays where it is, empty; slow down first to park it' },
  { action: 'slot1', codes: ['Digit1'], group: 'Systems', label: 'Tile 1', kind: 'press', note: 'The numbered tiles on the HUD: fire groups first (selects the group the fire button fires), then active modules (switches a tractor on or off, drops a charge)' },
  { action: 'slot2', codes: ['Digit2'], group: 'Systems', label: 'Tile 2', kind: 'press' },
  { action: 'slot3', codes: ['Digit3'], group: 'Systems', label: 'Tile 3', kind: 'press' },
  { action: 'slot4', codes: ['Digit4'], group: 'Systems', label: 'Tile 4', kind: 'press' },
  { action: 'slot5', codes: ['Digit5'], group: 'Systems', label: 'Tile 5', kind: 'press' },
  { action: 'slot6', codes: ['Digit6'], group: 'Systems', label: 'Tile 6', kind: 'press' },
  { action: 'slot7', codes: ['Digit7'], group: 'Systems', label: 'Tile 7', kind: 'press' },
  { action: 'slot8', codes: ['Digit8'], group: 'Systems', label: 'Tile 8', kind: 'press' },
  { action: 'slot9', codes: ['Digit9'], group: 'Systems', label: 'Tile 9', kind: 'press' },
  { action: 'afterburner', codes: ['ShiftLeft', 'ShiftRight'], group: 'Systems', label: 'Afterburner', kind: 'hold', note: 'If one is fitted: a higher top speed and more thrust while held, paid for from the capacitor' },
  { action: 'zoomIn', codes: ['Equal', 'NumpadAdd'], group: 'Interface', label: 'Zoom in', kind: 'press', note: 'Or the mouse wheel' },
  { action: 'zoomOut', codes: ['Minus', 'NumpadSubtract'], group: 'Interface', label: 'Zoom out', kind: 'press', note: 'Or the mouse wheel' },
  { action: 'toggleControls', codes: ['F1', 'Backquote'], group: 'Interface', label: 'Show / hide this panel', kind: 'press' },
  { action: 'toggleMenu', codes: ['F2'], group: 'Interface', label: 'Menu: pilot name, settings, save', kind: 'press' },
];

export const POINTER_CONTROLS: readonly PointerControl[] = [
  { input: 'Move the mouse', group: 'Flight', label: 'With mouse steering (the default), the nose follows the pointer. It holds its aim while the pointer is over a panel or card' },
  { input: 'Left button (hold)', group: 'Weapons', label: 'With mouse steering, fires the selected group, like Space' },
  { input: 'Right click', group: 'Targeting', label: 'With mouse steering, right-click a ship to lock it (locking takes a moment); right-click a locked ship to make it active. Without mouse steering, left click does this' },
  { input: 'Click', group: 'Station', label: 'Undock button (when docked)' },
  { input: 'Click', group: 'Ships', label: 'Ship mart and Your ships tabs (when docked): buy, board, claim the free Tern' },
  { input: 'Click', group: 'Interface', label: 'Controls and Menu buttons, top right' },
  { input: 'Mouse wheel', group: 'Interface', label: 'Zoom in and out' },
];

const KEY_NAMES: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  Backquote: '`',
  Escape: 'Esc',
  Mouse0: 'Left click',
  Mouse2: 'Right click',
};

/** True for the pseudo-codes used for mouse buttons. */
export function isMouseCode(code: string): boolean {
  return code.startsWith('Mouse');
}

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
  'F2',
  'Tab',
]);
