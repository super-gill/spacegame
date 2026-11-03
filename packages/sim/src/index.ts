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
export { MODULES } from './modules.js';
export { LOADOUTS } from './loadouts.js';
export { MANUFACTURERS } from './manufacturers.js';
export { WEAPONS, weaponDps } from './weapons.js';
export { fitStats, shipStats, cargoMass, bonusApplies, flightWarnings, type Catalogues, type FlightWarning } from './stats.js';
export {
  fitModule,
  unfitModule,
  planRefit,
  mountRefusal,
  resaleValue,
  fitFee,
  storedCount,
  sellModule,
  weaponStatesFor,
  type FitRefusal,
  type FitResult,
  type RefitPlan,
} from './fitting.js';
export { GOODS } from './goods.js';
export {
  buyGood,
  sellGood,
  maxBuyable,
  cargoUsed,
  cargoFree,
  scriptedPrices,
  type PriceSource,
  type TradeRefusal,
  type TradeResult,
} from './trade.js';
export { buildShip } from './factory.js';
export { applyDamage, fireWeapons, leadPoint, stepProjectiles, regenerateShield } from './combat.js';
export { collideShips } from './collision.js';
export {
  createStarterWorld,
  emptyInput,
  joinPilot,
  respawnPilot,
  pilotShip,
  pilotShipId,
  starterShipId,
  STARTER_STATION_ID,
  STARTER_LOADOUT_ID,
} from './world.js';
export { stepWorld } from './step.js';
export {
  serializeWorld,
  deserializeWorld,
  SAVE_FORMAT,
  SAVE_VERSION,
  MIGRATIONS,
  type LoadRefusal,
  type LoadResult,
  type Migration,
  type SaveEnvelope,
} from './save.js';
export { collideWithStations } from './collision.js';
export { thinkNpcs, PIRATE_TUNING, TRADER_TUNING, inSecurityZone } from './ai/index.js';
export { stepShip, linearAcceleration, angularAcceleration } from './ship.js';
export {
  FLIGHT_MODES,
  FLIGHT_MODE_LABELS,
  nextFlightMode,
  computeThrusters,
  idleThrusters,
} from './flight.js';
export { nearestDockableStation, tryDock, undock, bearingFromStation } from './docking.js';
