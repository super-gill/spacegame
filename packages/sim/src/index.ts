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
export { WEAPONS, weaponDps, isGun } from './weapons.js';
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
export { GOODS, goodsFitting } from './goods.js';
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
export { lockSeconds, lockRefusal, stepLocks, isLocked, weaponTarget, activeTarget, lockReadout, type LockStep, type LockReadout } from './locks.js';
export { applyDamage, fireWeapons, leadPoint, leadFor, loadedGoodOf, nextAmmo, stepProjectiles, regenerateShield } from './combat.js';
export { decoySignature, incomingMunitions, launchMunition, dropDecoy, stepMunitions, stepDecoys, spoofRadar, type MunitionHit } from './munitions.js';
export { collideShips } from './collision.js';
export {
  createStarterWorld,
  DEFAULT_RULES,
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
  migrate4to5,
  type LoadRefusal,
  type LoadResult,
  type Migration,
  type SaveEnvelope,
} from './save.js';
export { collideWithStations, collideWithSurfaces, insideSurface, type Surface } from './collision.js';
export {
  navReadout,
  predictPath,
  orbitElements,
  gravityTier,
  GRAVITY_TIERS,
  PATH_STEP_SECONDS,
  type NavReadout,
  type OrbitReadout,
  type PathReadout,
  type GravityTier,
} from './nav.js';
export { thinkNpcs, PIRATE_TUNING, TRADER_TUNING, inSecurityZone } from './ai/index.js';
export { stepShip, linearAcceleration, angularAcceleration } from './ship.js';
export {
  FLIGHT_MODES,
  FLIGHT_MODE_LABELS,
  nextFlightMode,
  computeThrusters,
  idleThrusters,
} from './flight.js';
export {
  nearestDockableStation,
  tryDock,
  undock,
  bearingFromStation,
  padFits,
  freePadFor,
  occupiedPads,
  padWorldPosition,
  launchPoint,
  onPad,
  ridePad,
  speedRelativeTo,
  type DockingView,
} from './docking.js';
export { pilotsAboard, shipPilot, isEmptyShip, isEscapePod, ownedShips } from './ownership.js';
export {
  shipPrice,
  buyShip,
  buyRefusal,
  adminGrantCredits,
  adminSpawnShip,
  adminSetRule,
  type AdminRefusal,
  boardShip,
  boardRefusal,
  boardableShips,
  wakePilot,
  claimStarterShip,
  claimRefusal,
  stepOut,
  stepOutRefusal,
  ESCAPE_POD_LOADOUT_ID,
  type StepOutRefusal,
  type CommandResult,
  type BuyRefusal,
  type BoardRefusal,
  type ClaimRefusal,
  type WakeRefusal,
} from './pilots.js';
export { starterStations, padRing, HARBOUR_ID, RIDGE_ID, LANTERN_ID, HARBOUR_ORBIT_RADIUS } from './stations.js';
export { screeAsteroids, asteroidStates, asteroidPositions, SCREE_SEED } from './asteroids.js';
export { seededRandom } from './random.js';
export { starterBodies, STAR_ID, PLANET_ID, MOON_ID, BELT_ID, BELT_RING_RADIUS, BELT_PERIOD } from './bodies.js';
export {
  railTime,
  circularPeriod,
  orbitAngle,
  orbitState,
  bodyState,
  bodyStates,
  stationState,
  placeStations,
  innermostBody,
  carriesForTick,
  tickRails,
  applyCarry,
  bodyPosition,
  bodyVelocity,
  sphereBodyAt,
  localFrame,
  frameVelocity,
  relativeVelocity,
  pirateHome,
  gravityAt,
  gravityFrom,
  gravityEase,
  surfacesNext,
  type RailState,
  type Carry,
  type TickRails,
  type LocalFrame,
} from './rails.js';
