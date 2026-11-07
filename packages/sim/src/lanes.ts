import { CERES_ACCORD_ID, EARTH_ORBITAL_EXCHANGE_ID, ELYSIUM_ID, SLAGLINE_ID, THETIS_ORBITAL_ID, TITAN_FREE_PORT_ID } from './sol-layout.js';
import { CALLISTO_DEPOT_ID, ECF_TOLL_ID } from './sol-ports.js';
import type { PowerId, Station, World } from './types.js';
import type { Vec2 } from './vec2.js';

/**
 * The Accord lanes (docs/sol.md, "The Accord lanes"): corridors between
 * ports that the Ceres Accord opened to all. A lane is its stops in order;
 * its line is the straight legs between them wherever the stations are
 * now, so it follows them if orbits run. Lanes are design data for a
 * system, like its stations, so they are not saved: a world reads its own
 * system's with `worldLanes`.
 *
 * What a lane is for comes in later pushes of Sol slice 2: the Relay's
 * buoys are dense along them and security follows from that (lore,
 * `infrastructure.md`), NPC traffic burns along them, and a lane's
 * `patrol` is the power whose ships fly it.
 */
export interface Lane {
  id: string;
  name: string;
  /** Station ids in order along the lane. */
  stops: readonly string[];
  /** Whose patrols fly it (sol.md: the MRN Sol-wide, the Belt on its own lane). */
  patrol: PowerId;
}

/** Sol's five Accord lanes, as `sol.md` lists them. */
export const SOL_LANES: readonly Lane[] = [
  { id: 'lane-inner', name: 'The Inner Lane', stops: [THETIS_ORBITAL_ID, EARTH_ORBITAL_EXCHANGE_ID, ELYSIUM_ID], patrol: 'mars' },
  { id: 'lane-ceres', name: 'The Ceres Lane', stops: [ELYSIUM_ID, CERES_ACCORD_ID], patrol: 'mars' },
  { id: 'lane-belt', name: 'The Belt Lane', stops: [CERES_ACCORD_ID, SLAGLINE_ID], patrol: 'belt' },
  { id: 'lane-long', name: 'The Long Lane', stops: [CERES_ACCORD_ID, CALLISTO_DEPOT_ID, TITAN_FREE_PORT_ID], patrol: 'mars' },
  { id: 'lane-gate', name: 'The Gate Lane', stops: [TITAN_FREE_PORT_ID, ECF_TOLL_ID], patrol: 'mars' },
];

/** The lanes of a world's own system: Sol's, or none (Calder has no lanes). */
export function worldLanes(world: Pick<World, 'system'>): readonly Lane[] {
  return world.system === 'sol' ? SOL_LANES : [];
}

/**
 * A lane's legs as they stand now: each pair of neighbouring stops that
 * both exist in `stations`. A lane missing a stop (a view without it, say)
 * just has fewer legs.
 */
export function laneLegs(lane: Lane, stations: Readonly<Record<string, Pick<Station, 'position'>>>): { from: Vec2; to: Vec2 }[] {
  const legs: { from: Vec2; to: Vec2 }[] = [];
  for (let i = 1; i < lane.stops.length; i++) {
    const a = stations[lane.stops[i - 1]!];
    const b = stations[lane.stops[i]!];
    if (a && b) legs.push({ from: a.position, to: b.position });
  }
  return legs;
}
