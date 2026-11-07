/**
 * Sol's ids and scale (docs/sol-build.md, "Scale"), shared by the bodies
 * (sol.ts) and the ports (sol-ports.ts) so neither has to import the other.
 */

/** Distance from the Sun for a real distance in AU: 30 million units × AU^0.6. */
export function solDistance(au: number): number {
  return Math.round(30_000_000 * au ** 0.6);
}

/** A planet's year, seconds, real time: Earth's is a week, the rest by Kepler. Only matters with orbits running. */
export function solYear(au: number): number {
  return Math.round(604_800 * au ** 1.5);
}

/** Gravity's strength for a body of `radius` whose surface pull is `surface` units/s². */
export function gm(radius: number, surface: number): number {
  return surface * radius * radius;
}

export const SUN_ID = 'body-sol-sun';
export const MERCURY_ID = 'body-sol-mercury';
export const VENUS_ID = 'body-sol-venus';
export const EARTH_ID = 'body-sol-earth';
export const LUNA_ID = 'body-sol-luna';
export const MARS_ID = 'body-sol-mars';
export const PHOBOS_ID = 'body-sol-phobos';
export const DEIMOS_ID = 'body-sol-deimos';
export const VESTA_ID = 'body-sol-vesta';
export const CERES_ID = 'body-sol-ceres';
export const PALLAS_ID = 'body-sol-pallas';
export const PSYCHE_ID = 'body-sol-psyche';
export const HYGIEA_ID = 'body-sol-hygiea';
export const JUPITER_ID = 'body-sol-jupiter';
export const IO_ID = 'body-sol-io';
export const EUROPA_ID = 'body-sol-europa';
export const GANYMEDE_ID = 'body-sol-ganymede';
export const CALLISTO_ID = 'body-sol-callisto';
export const SATURN_ID = 'body-sol-saturn';
export const ENCELADUS_ID = 'body-sol-enceladus';
export const TITAN_ID = 'body-sol-titan';
export const URANUS_ID = 'body-sol-uranus';
export const NEPTUNE_ID = 'body-sol-neptune';
export const TRITON_ID = 'body-sol-triton';
/** The field round Ceres: the belt body Ceres Accord Station's rocks ride. */
export const CERES_FIELD_ID = 'body-sol-ceres-field';

/** The field round Ceres: a ring 16,000 units from its centre, Ceres Accord Station on it. */
export const CERES_FIELD_RADIUS = 16_000;
export const CERES_FIELD_PERIOD = 5_400;
export const CERES_STATION_PHASE = 0.6;

// The ports' ids (sol-ports.ts). Ids never change with names.
export const EARTH_ORBITAL_EXCHANGE_ID = 'station-earth-orbital-exchange';
export const THETIS_ORBITAL_ID = 'station-thetis-orbital';
export const ELYSIUM_ID = 'station-republic-elysium';
export const CERES_ACCORD_ID = 'station-ceres-accord';
export const SLAGLINE_ID = 'station-slagline';
export const TITAN_FREE_PORT_ID = 'station-titan-free-port';
