import { runsDark } from './colours.js';
import { pilotsAboard } from './ownership.js';
import { currentRelayNet, RELAY_RANGE } from './relay.js';
import type { PowerId, World } from './types.js';
import { distance, type Vec2 } from './vec2.js';

/**
 * Traffic on the chart (docs/sol-build.md, slice 2, push 4; Jason, 7
 * November 2026): what a pilot knows about ships beyond their radar.
 *
 * A transponder broadcasts locally. A squawking ship is on your chart if
 * a live Relay buoy hears it (the network passes it to everyone), or if
 * you are within its transponder's own range (`TRANSPONDER_RANGE`). A ship
 * running dark is on neither: only your radar sees it, up close. A burning
 * ship is the exception: its plume is seen across the whole system, dark
 * or not (sol-build.md, "Travel: the burn"), so it is always on the chart,
 * named only if it squawks.
 *
 * The server sends this list about once a second, separately from each
 * player's view (which holds only what their radar sees), so the chart can
 * show Sol's traffic without every ship going to every player every tick.
 */

/** How far a transponder's own broadcast reaches, units: well beyond radar, nowhere near system-wide. */
export const TRANSPONDER_RANGE = 200_000;

export interface TrafficContact {
  id: string;
  position: Vec2;
  velocity: Vec2;
  /** What it is, as far as its transponder says: null for a dark ship (only its plume is seen). */
  label: string | null;
  /** Its role, for its colour on the chart; `unknown` when dark. */
  role: 'trader' | 'patrol' | 'pirate' | 'miner' | 'pilot' | 'unknown';
  /** Whose navy, for a patrol. */
  power?: PowerId;
  /** Where it is burning to (a port or world id), or null if not burning. */
  burningTo: string | null;
  /** How the chart knows: through the Relay, its own transponder, or its plume. */
  heard: 'relay' | 'transponder' | 'plume';
}

/** Navy names by power (sol.md, "The navies in Sol"). */
export const NAVY_NAMES: Record<PowerId, string> = { earth: 'ECF', mars: 'MRN', venus: 'VSG', belt: 'UDF', aurel: 'AUREL' };

/** The ships `pilotId`'s chart shows, not counting their own. Sol only; empty elsewhere. */
export function chartTraffic(world: World, pilotId: string): TrafficContact[] {
  if (world.system !== 'sol') return [];
  const net = currentRelayNet(world);
  const own = world.pilots[pilotId]?.shipId ?? null;
  const from = own ? world.ships[own]?.position : undefined;
  const aboard = pilotsAboard(world);
  const out: TrafficContact[] = [];
  for (const id of Object.keys(world.ships).sort()) {
    const ship = world.ships[id]!;
    if (id === own || ship.state !== 'flying') continue;
    const brain = world.npcs[id];
    // Drones fly with their mother; arena ships are not in Sol.
    if (brain?.kind === 'drone' || brain?.kind === 'arena' || ship.motherId) continue;
    const dark = runsDark(world, ship);
    const burningTo = ship.burn ? ship.burn.targetId : null;
    let heard: TrafficContact['heard'] | null = null;
    if (!dark && net.nodes.some((n) => distance(n.at, ship.position) <= RELAY_RANGE)) heard = 'relay';
    else if (!dark && from && distance(from, ship.position) <= TRANSPONDER_RANGE) heard = 'transponder';
    else if (ship.burn) heard = 'plume';
    if (!heard) continue;
    const pilot = aboard[id] ? world.pilots[aboard[id]!] : undefined;
    const role: TrafficContact['role'] = dark
      ? 'unknown'
      : pilot
        ? 'pilot'
        : brain?.kind === 'trader'
          ? 'trader'
          : brain?.kind === 'watch'
            ? 'patrol'
            : brain?.kind === 'pirate'
              ? 'pirate'
              : brain?.kind === 'miner'
                ? 'miner'
                : 'unknown';
    const hull = world.hulls[ship.hullId]?.name ?? 'Ship';
    const power = brain?.kind === 'watch' ? brain.power : undefined;
    const label = dark ? null : pilot ? `${pilot.name.toUpperCase()} · ${hull.toUpperCase()}` : role === 'patrol' ? `${power ? NAVY_NAMES[power] : 'WATCH'} PATROL · ${hull.toUpperCase()}` : `${role.toUpperCase()} · ${hull.toUpperCase()}`;
    out.push({ id, position: ship.position, velocity: ship.velocity, label, role, ...(power ? { power } : {}), burningTo, heard });
  }
  return out;
}
