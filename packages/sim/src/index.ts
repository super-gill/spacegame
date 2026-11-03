/**
 * @spacegame/sim public API.
 *
 * Rule of the package: nothing in here may import from the DOM, canvas,
 * timers or any browser or Node API. The tsconfig enforces this by
 * compiling against the ES2022 lib only. Keep it that way.
 */

export * from './types.js';
export * from './vec2.js';
export * from './angle.js';
export * from './constants.js';
export { HULLS } from './hulls.js';
export { createStarterWorld, emptyInput, playerShip } from './world.js';
export { stepWorld } from './step.js';
export { stepShip, linearAcceleration, angularAcceleration } from './ship.js';
export {
  FLIGHT_MODES,
  FLIGHT_MODE_LABELS,
  nextFlightMode,
  computeThrusters,
  idleThrusters,
} from './flight.js';
export { nearestDockableStation, tryDock, undock, bearingFromStation } from './docking.js';
