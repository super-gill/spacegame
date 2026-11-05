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
  buyModule,
  weaponStatesFor,
  type FitRefusal,
  type FitResult,
  type RefitPlan,
} from './fitting.js';
export { GOODS, goodsFitting, oreGoods } from './goods.js';
export {
  buyGood,
  sellGood,
  maxBuyable,
  cargoUsed,
  cargoFree,
  holdCapacity,
  holdSpaceFor,
  holdFits,
  holdUse,
  scriptedPrices,
  type PriceSource,
  type TradeRefusal,
  type TradeResult,
} from './trade.js';
export { buildShip } from './factory.js';
export { lockSeconds, lockRefusal, stepLocks, isLocked, weaponTarget, activeTarget, lockReadout, type LockStep, type LockReadout } from './locks.js';
export { applyDamage, shieldCovers, fireWeapons, leadPoint, leadFor, loadedGoodOf, nextAmmo, stepProjectiles, regenerateShield } from './combat.js';
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
export { activationSlots, isSwitchedOn, ACTIVATION_KEYS, type ActivationSlot } from './systems.js';
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
export { lootClaim, pilotsAboard, shipPilot, isEmptyShip, isEscapePod, ownedShips, tractorTakes } from './ownership.js';
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
export { screeAsteroids, asteroidStates, asteroidPositions, rockAt, rockSeam, oreLeft, bestTier, stepRockfall, ROCK_FIELDS, ROCKFALL_SECONDS, SCREE_SEED } from './asteroids.js';
export { droneIdleReason, dronesOut, droneRoom, droneStrength, stepDrones } from './drones.js';
export { duel, fitProblems, fitSummary, type DuelResult, type DuelRun, type FitProblem, type FitSpec, type FitSummary } from './fitlab.js';
export { REFERENCE_FITS } from './reference-fits.js';
export { storeGoods, takeGoods, storedGoods, type HangarRefusal, type HangarResult } from './hangar.js';
export { breachAction, BLAST_RADIUS, BLOOM_RANGE, BREACH_MIN_RADIUS, CORE_LIFETIME, FRAGILE_STRENGTH, PLANT_REACH, SAFE_DISTANCE, type BreachAction } from './breach.js';
export { cutRocks, cutRate, dropCache, hopperRejects, hopperList, nextHopperFilter, tradeUpFor, surveyPulse, CACHE_LIFETIME, CANISTER_UNITS, ORE_LOOT_LIFETIME, SEAM_HALF_ARC, SEAM_MULTIPLIER, SOFT_ROCK_BONUS, SURVEY_CYCLE_SECONDS, SURVEY_SHOW_SECONDS } from './mining.js';
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
  setOrbitsMoving,
  withOrbitMoving,
  gravityFrom,
  gravityEase,
  surfacesNext,
  type RailState,
  type Carry,
  type TickRails,
  type LocalFrame,
} from './rails.js';
export { applyCommand, readCommand, type PilotCommand, type CommandOutcome } from './commands.js';
