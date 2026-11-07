import { BURN_ACCELERATION } from './constants.js';
import { laneLegs, worldLanes, type Lane } from './lanes.js';
import { SATURN_ID } from './sol-layout.js';
import type { Station, StationHolder, World } from './types.js';
import { add, distance, length, scale, sub, type Vec2 } from './vec2.js';

/**
 * The Accord's Relay and security computed from it (lore,
 * docs/infrastructure.md, "The Relay" and "Security from connectivity";
 * docs/sol-build.md, slice 2, push 3).
 *
 * The Relay is buoys. Each hears ships within `RELAY_RANGE` and talks to
 * the others within `RELAY_LINK_RANGE`; buoys that can reach each other
 * form a network. In Sol the Ceres Accord laid them: dense rings round
 * the ports on its lanes and the powers' bases, a chain along every lane,
 * a single buoy at the other ports, none at the clans' ports and none past
 * Saturn but along the Gate Lane. Nobody else builds relays in Sol.
 *
 * A place's security is a live reading of that net, never painted on:
 * - **Open**: no buoy hears you, or the ones that do are cut off from any
 *   base of whoever holds the place. Nobody hears.
 * - **Contested**: off a lane, where neighbouring ports near you belong to
 *   different holders (Jupiter's moons), or one belongs to nobody agreed
 *   (Psyche). The Accord's peace holds on its lanes, so a lane is never
 *   contested.
 * - **Core**: at least two buoys hear you (redundancy), and the holder has
 *   a base within a short burn (`CORE_BURN_SECONDS`).
 * - **Held**: covered and linked home, but thin or far from a base.
 *
 * Who holds a place: the Accord on its lanes; elsewhere whoever holds the
 * nearest port within `CLAIM_RANGE`. A holder's bases are its capital
 * ports, navy yards and depots; the Accord's are all four powers' (the
 * free ports are policed by the powers, the Accord having no ships).
 *
 * The buoys are design data for now, like the lanes: worked out from the
 * system and its stations, not saved. When relays become targets (parked
 * until after Open Lanes) they move into the world with their health.
 * Everything here takes the buoys as an argument, so a cut buoy already
 * changes the reading.
 */

/** How far a buoy hears a ship, units. */
export const RELAY_RANGE = 1_500_000;
/** How far apart two buoys can be and still talk, units. Long, tight-beam links: a remote port's single buoy still reaches the net. */
export const RELAY_LINK_RANGE = 40_000_000;
/** Buoys along a lane: one every this many units. Under `RELAY_RANGE`, so the lane's line is always heard by two. */
export const RELAY_LANE_SPACING = 1_000_000;
/** A dense ring round a port: this many buoys at this radius from it. */
export const RELAY_RING_COUNT = 3;
export const RELAY_RING_RADIUS = 200_000;
/** A lane's corridor: within this of its line, units. About where two of its buoys still hear you. */
export const LANE_CORRIDOR = 1_000_000;
/**
 * Ports within this of a place say who holds it, units. Two of them with
 * different holders dispute it only if they are also this close to each
 * other: neighbours quarrel (Jupiter's moons, 3.3 to 3.6 million apart),
 * while deep space between two powers' worlds is nobody's quarrel.
 */
export const CLAIM_RANGE = 4_000_000;
/** Core needs a holder's base within this burn, seconds (at the standard burn). */
export const CORE_BURN_SECONDS = 300;

export type SecurityLevel = 'core' | 'held' | 'contested' | 'open';

/** A relay buoy: where it is (ridden on a port or along a lane leg, so it follows them), who laid it, and whether it is down. */
export interface RelayNode {
  id: string;
  anchor: { kind: 'station'; stationId: string; offset: Vec2 } | { kind: 'lane'; laneId: string; leg: number; along: number };
  owner: 'accord';
  /** A cut or jammed buoy hears nothing and links nothing. Nothing cuts one yet (relays as targets are parked). */
  down?: boolean;
}

/** Whether a station is a base for its holder's navy (docs/navy.md, "Bases"). */
export function isBase(station: Pick<Station, 'rank'>): boolean {
  return station.rank === 'capital' || station.rank === 'navalYard' || station.rank === 'depot';
}

/** The ports on any lane. */
function lanePorts(lanes: readonly Lane[]): Set<string> {
  return new Set(lanes.flatMap((l) => l.stops));
}

/**
 * The Accord's buoys in a world's system, laid as the lore says. Calder
 * has none. Deterministic: the same stations give the same buoys.
 */
export function worldRelays(world: Pick<World, 'system' | 'stations' | 'bodies'>): RelayNode[] {
  if (world.system !== 'sol') return [];
  const lanes = worldLanes(world);
  const onLane = lanePorts(lanes);
  // Past Saturn's orbit the Accord laid nothing but the Gate Lane.
  const saturn = world.bodies[SATURN_ID]?.orbit?.radius ?? Infinity;
  const sunDistance = (p: Vec2): number => length(p);
  const nodes: RelayNode[] = [];
  for (const id of Object.keys(world.stations).sort()) {
    const st = world.stations[id]!;
    if (st.holder === 'clans') continue;
    const lane = onLane.has(id);
    if (!lane && sunDistance(st.position) > saturn * 1.2) continue;
    if (lane || isBase(st)) {
      for (let k = 0; k < RELAY_RING_COUNT; k++) {
        const a = (2 * Math.PI * k) / RELAY_RING_COUNT;
        nodes.push({ id: `relay-${id}-${k}`, anchor: { kind: 'station', stationId: id, offset: { x: Math.cos(a) * RELAY_RING_RADIUS, y: Math.sin(a) * RELAY_RING_RADIUS } }, owner: 'accord' });
      }
    } else {
      nodes.push({ id: `relay-${id}-0`, anchor: { kind: 'station', stationId: id, offset: { x: 0, y: 0 } }, owner: 'accord' });
    }
  }
  for (const lane of lanes) {
    laneLegs(lane, world.stations).forEach((leg, i) => {
      const n = Math.floor(distance(leg.from, leg.to) / RELAY_LANE_SPACING);
      for (let j = 1; j < n; j++) nodes.push({ id: `relay-${lane.id}-${i}-${j}`, anchor: { kind: 'lane', laneId: lane.id, leg: i, along: j / n }, owner: 'accord' });
    });
  }
  return nodes;
}

/** Where a buoy is now, or null if what it rides is gone. */
export function relayPosition(world: Pick<World, 'system' | 'stations'>, node: RelayNode): Vec2 | null {
  if (node.anchor.kind === 'station') {
    const st = world.stations[node.anchor.stationId];
    return st ? add(st.position, node.anchor.offset) : null;
  }
  const { laneId, leg, along } = node.anchor;
  const lane = worldLanes(world).find((l) => l.id === laneId);
  const legs = lane ? laneLegs(lane, world.stations) : [];
  const l = legs[leg];
  return l ? add(l.from, scale(sub(l.to, l.from), along)) : null;
}

/**
 * The Relay as it stands: the live buoys with their places, which network
 * each is in, and which holders each network reaches a base of. Work it
 * out once and ask it many questions (`securityAt`).
 */
export interface RelayNet {
  nodes: { node: RelayNode; at: Vec2; net: number }[];
  /** For each network, the holders it reaches a base of. */
  reaches: Set<StationHolder>[];
  /** The lanes' legs, for the corridor test. */
  legs: { from: Vec2; to: Vec2 }[];
  /** Ports with a holder, for claims; and bases by holder. */
  ports: { at: Vec2; holder: StationHolder | null }[];
  bases: { at: Vec2; holder: StationHolder }[];
}

/** The four powers: an Accord place takes any of their bases. */
const POWERS: readonly StationHolder[] = ['earth', 'mars', 'venus', 'belt'];

/** Build the net from the world and its buoys (`worldRelays(world)` unless some are cut). */
export function relayNet(world: Pick<World, 'system' | 'stations' | 'bodies'>, relays: readonly RelayNode[] = worldRelays(world)): RelayNet {
  const live = relays
    .filter((n) => !n.down)
    .map((node) => ({ node, at: relayPosition(world, node) }))
    .filter((x): x is { node: RelayNode; at: Vec2 } => x.at !== null);
  // Networks: buoys within link range of each other, by flood fill.
  const net = new Array<number>(live.length).fill(-1);
  let count = 0;
  for (let i = 0; i < live.length; i++) {
    if (net[i] !== -1) continue;
    net[i] = count;
    const queue = [i];
    while (queue.length > 0) {
      const a = queue.pop()!;
      for (let b = 0; b < live.length; b++) {
        if (net[b] === -1 && distance(live[a]!.at, live[b]!.at) <= RELAY_LINK_RANGE) {
          net[b] = count;
          queue.push(b);
        }
      }
    }
    count++;
  }
  const stations = Object.values(world.stations).filter((s) => s.holder !== undefined);
  const bases = stations.filter((s) => isBase(s) && s.holder).map((s) => ({ at: s.position, holder: s.holder! }));
  // A network reaches a base if one of its buoys hears the base.
  const reaches = Array.from({ length: count }, () => new Set<StationHolder>());
  live.forEach((x, i) => {
    for (const b of bases) if (distance(x.at, b.at) <= RELAY_RANGE) reaches[net[i]!]!.add(b.holder);
  });
  const lanes = worldLanes(world);
  return {
    nodes: live.map((x, i) => ({ ...x, net: net[i]! })),
    reaches,
    legs: lanes.flatMap((l) => laneLegs(l, world.stations)),
    ports: stations.map((s) => ({ at: s.position, holder: s.holder ?? null })),
    bases,
  };
}

/** How far `p` is from the segment `a`–`b`. */
function segmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2)) : 0;
  return distance(p, add(a, scale(ab, t)));
}

/** What the net says about one place. */
export interface SecurityReading {
  level: SecurityLevel;
  /** Who holds it: the Accord on a lane, else the nearest port's holder within `CLAIM_RANGE`, else null. */
  holder: StationHolder | null;
  /** How many live buoys hear it. */
  coverage: number;
  onLane: boolean;
  /** Seconds to burn from the holder's nearest base, or null with none. */
  baseSeconds: number | null;
}

/** The security at `p` (docs/infrastructure.md, "Security from connectivity"). */
export function securityAt(net: RelayNet, p: Vec2): SecurityReading {
  const hearing = net.nodes.filter((n) => distance(n.at, p) <= RELAY_RANGE);
  const onLane = net.legs.some((leg) => segmentDistance(p, leg.from, leg.to) <= LANE_CORRIDOR);
  // Claims: the ports near here.
  const near = net.ports.filter((port) => distance(port.at, p) <= CLAIM_RANGE).sort((a, b) => distance(a.at, p) - distance(b.at, p));
  const holder: StationHolder | null = onLane ? 'accord' : (near[0]?.holder ?? null);
  // Disputed: a port nobody agrees on, or two neighbouring ports of different holders (the Accord quarrels with nobody).
  const claimants = near.filter((x) => x.holder !== 'accord');
  const disputed =
    near.some((x) => x.holder === null) ||
    claimants.some((a, i) => claimants.some((b, j) => j > i && a.holder !== b.holder && distance(a.at, b.at) <= CLAIM_RANGE));
  // A holder's bases; the Accord's are the four powers'.
  const theirs = holder === 'accord' ? net.bases.filter((b) => POWERS.includes(b.holder)) : net.bases.filter((b) => b.holder === holder);
  const nearestBase = theirs.length > 0 ? Math.min(...theirs.map((b) => distance(b.at, p))) : null;
  const baseSeconds = nearestBase === null ? null : 2 * Math.sqrt(nearestBase / BURN_ACCELERATION);
  const reading = { holder, coverage: hearing.length, onLane, baseSeconds };
  if (hearing.length === 0) return { level: 'open', ...reading };
  if (!onLane && disputed) return { level: 'contested', ...reading };
  // Linked home: a network that hears you reaches one of the holder's bases.
  const home = holder === 'accord' ? POWERS : holder ? [holder] : POWERS;
  const linked = hearing.some((n) => home.some((h) => net.reaches[n.net]!.has(h)));
  if (!linked) return { level: 'open', ...reading };
  if (hearing.length >= 2 && baseSeconds !== null && baseSeconds <= CORE_BURN_SECONDS) return { level: 'core', ...reading };
  return { level: 'held', ...reading };
}
