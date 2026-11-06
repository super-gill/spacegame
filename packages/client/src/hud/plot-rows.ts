import type { Ship, World } from '@spacegame/sim';
import { asteroidStates, distance, isEmptyShip, normalise, shipPilot, shipStats, sub, type Vec2 } from '@spacegame/sim';

/**
 * The Plot's contents (docs/interface.md, section 3): one row for
 * everything around you worth acting on, worked out from the client's
 * own view of the world. Pure, so it is tested without a DOM; the window
 * itself is plot.ts.
 *
 * The window rule holds: a ship running dark that you have not
 * identified reaches the client as a contact (`Ship.contact`), so all a
 * row can say about it is its size, where it is and how it moves.
 */

/** What a row is. */
export type PlotKind = 'ship' | 'station' | 'rock' | 'cache' | 'drone';

/** Whose it is, for its colour: hostile red, the Watch white, others neutral, stations bright, your own kit ink, unknown amber. */
export type PlotSide = 'hostile' | 'watch' | 'neutral' | 'station' | 'own' | 'rock' | 'unknown';

/** Your lock on it, if any. */
export type PlotLock = 'active' | 'locked' | 'locking' | null;

export interface PlotRow {
  /** The ship, station or rock id; a cache is named by its first canister. */
  id: string;
  kind: PlotKind;
  /** Units from your ship. */
  dist: number;
  /** Units a second, positive while it comes towards you. */
  closing: number;
  /** The TYPE column: hull, STATION, ROCK r 24, CACHE, or RADAR · SMALL for an unidentified contact. */
  type: string;
  /** The NAME column. */
  name: string;
  side: PlotSide;
  lock: PlotLock;
  /** True for a contact running dark that you have not identified. */
  dark: boolean;
  /** True if a lock can be put on it (ships and rocks). */
  lockable: boolean;
}

/** A tab of the Plot: which kinds it lists and how it orders them. Data, so saved layouts can follow. */
export interface PlotPreset {
  id: string;
  label: string;
  kinds: readonly PlotKind[];
  /** Sorted by distance, hostiles come first, then unknown contacts, then the rest. */
  threatsFirst?: boolean;
  /** Kinds listed ahead of the rest whatever the sort, as their own group (your drones on the mining tab). */
  groupFirst?: readonly PlotKind[];
}

export const PLOT_PRESETS: readonly PlotPreset[] = [
  { id: 'general', label: 'GENERAL', kinds: ['ship', 'station', 'cache'] },
  { id: 'combat', label: 'COMBAT', kinds: ['ship'], threatsFirst: true },
  { id: 'mining', label: 'MINING', kinds: ['rock', 'cache', 'drone'], groupFirst: ['drone'] },
];

export type PlotColumnId = 'dist' | 'type' | 'name' | 'closing' | 'lock';

/** A column: its head, alignment and width in pixels (`fill` takes what is left). Data, like the presets. */
export interface PlotColumn {
  id: PlotColumnId;
  label: string;
  align: 'left' | 'right';
  width: number | 'fill';
}

export const PLOT_COLUMNS: readonly PlotColumn[] = [
  { id: 'dist', label: 'DIST', align: 'right', width: 56 },
  { id: 'type', label: 'TYPE', align: 'left', width: 118 },
  { id: 'name', label: 'NAME', align: 'left', width: 'fill' },
  { id: 'closing', label: 'CLOSE', align: 'right', width: 46 },
  { id: 'lock', label: 'LOCK', align: 'left', width: 56 },
];

/** Rocks listed at most, nearest first: the belt has hundreds. */
export const PLOT_MAX_ROCKS = 40;
/** Cache canisters of one owner closer than this are one cache, units. */
const CACHE_GROUPING = 300;

const SIZE_WORDS = { small: 'SMALL', medium: 'MEDIUM', large: 'LARGE' } as const;

/**
 * Every row the Plot could show for the pilot flying `mine`, unsorted
 * and unfiltered: other ships in flight (yours too), your drones,
 * every station, rocks within sensor range and caches in view.
 */
export function plotRows(world: World, mine: Ship, pilotId: string): PlotRow[] {
  const rows: PlotRow[] = [];
  const lockOf = (id: string): PlotLock => {
    const lock = mine.locks.find((l) => l.targetId === id);
    if (!lock) return null;
    if (lock.progress < 1) return 'locking';
    return mine.activeLock === id ? 'active' : 'locked';
  };
  const motion = (position: Vec2, velocity: Vec2): { dist: number; closing: number } => ({
    dist: distance(mine.position, position),
    closing: closingSpeed(mine.position, mine.velocity, position, velocity),
  });

  for (const ship of Object.values(world.ships)) {
    if (ship.id === mine.id || ship.state !== 'flying') continue;
    const at = motion(ship.position, ship.velocity);
    const lock = lockOf(ship.id);
    if (ship.contact) {
      rows.push({ id: ship.id, kind: 'ship', ...at, type: `RADAR · ${SIZE_WORDS[ship.contact]}`, name: 'Unknown contact', side: 'unknown', lock, dark: true, lockable: true });
      continue;
    }
    const brain = world.npcs[ship.id];
    const hull = world.hulls[ship.hullId];
    const type = (hull?.name ?? 'Ship').toUpperCase();
    if (ship.motherId === mine.id) {
      rows.push({ id: ship.id, kind: 'drone', ...at, type, name: `Drone ${(ship.droneId ?? '').toUpperCase()}${droneState(ship, brain)}`, side: 'own', lock, dark: false, lockable: true });
      continue;
    }
    rows.push({ id: ship.id, kind: 'ship', ...at, type, name: shipWho(world, ship, pilotId), side: shipSide(world, ship, pilotId), lock, dark: false, lockable: true });
  }

  for (const station of Object.values(world.stations)) {
    rows.push({ id: station.id, kind: 'station', ...motion(station.position, station.velocity), type: 'STATION', name: station.name, side: 'station', lock: null, dark: false, lockable: false });
  }

  // Rocks your radar reaches, nearest first.
  const range = shipStats(world, mine).sensorRange;
  const states = asteroidStates(world.bodies, world.asteroids, world.tick, world.dt);
  const rocks: PlotRow[] = [];
  world.asteroids.forEach((rock, i) => {
    const s = states[i]!;
    const at = motion(s.position, s.velocity);
    if (at.dist > range) return;
    rocks.push({ id: rock.id, kind: 'rock', ...at, type: `ROCK r ${Math.round(rock.radius)}`, name: 'Rock', side: 'rock', lock: lockOf(rock.id), dark: false, lockable: true });
  });
  rocks.sort((a, b) => a.dist - b.dist);
  rows.push(...rocks.slice(0, PLOT_MAX_ROCKS));

  // Caches: an owner's canisters close together are one cache.
  const groups: { ownerId: string; first: { id: string; position: Vec2; velocity: Vec2 } }[] = [];
  for (const l of world.loot) {
    if (!l.cache) continue;
    const near = groups.find((g) => g.ownerId === l.cache!.ownerId && distance(g.first.position, l.position) <= CACHE_GROUPING);
    if (!near) groups.push({ ownerId: l.cache.ownerId, first: l });
  }
  for (const g of groups) {
    const yours = g.ownerId === pilotId;
    rows.push({ id: g.first.id, kind: 'cache', ...motion(g.first.position, g.first.velocity), type: 'CACHE', name: yours ? 'Your cache' : 'Cache', side: yours ? 'own' : 'neutral', lock: null, dark: false, lockable: false });
  }
  return rows;
}

/**
 * Rows closer together than this in distance, units, keep the order they
 * were last shown in, so two rocks at nearly the same range do not swap
 * back and forth as you drift (Jason saw the list fidget in the belt).
 */
export const PLOT_DISTANCE_BAND = 50;

/**
 * The rows one tab shows, in order. Column heads sort; distance sorts
 * nearest first, closing speed fastest closing first, lock state locked
 * first. A tab with `threatsFirst` puts hostiles, then unknown contacts,
 * ahead of the rest when sorted by distance; one with `groupFirst` lists
 * those kinds first, as their own group. Pass the ids in the order last
 * shown as `previous`: sorted by distance, rows within
 * `PLOT_DISTANCE_BAND` of each other keep that order.
 */
export function plotView(rows: readonly PlotRow[], preset: PlotPreset, sort: PlotColumnId, previous: readonly string[] = []): PlotRow[] {
  const listed = rows.filter((r) => preset.kinds.includes(r.kind));
  const was = new Map(previous.map((id, i) => [id, i]));
  const group = (r: PlotRow): number => (preset.groupFirst?.includes(r.kind) ? 0 : 1);
  const byDistance = (a: PlotRow, b: PlotRow): number => {
    const ia = was.get(a.id);
    const ib = was.get(b.id);
    if (ia !== undefined && ib !== undefined && Math.abs(a.dist - b.dist) < PLOT_DISTANCE_BAND) return ia - ib;
    return a.dist - b.dist;
  };
  const lockRank = (r: PlotRow): number => (r.lock === 'active' ? 0 : r.lock === 'locked' ? 1 : r.lock === 'locking' ? 2 : 3);
  const threat = (r: PlotRow): number => (r.side === 'hostile' ? 0 : r.side === 'unknown' ? 1 : 2);
  const by: Record<PlotColumnId, (a: PlotRow, b: PlotRow) => number> = {
    dist: (a, b) => (preset.threatsFirst ? threat(a) - threat(b) : 0) || byDistance(a, b),
    type: (a, b) => a.type.localeCompare(b.type) || a.dist - b.dist,
    name: (a, b) => a.name.localeCompare(b.name) || a.dist - b.dist,
    closing: (a, b) => b.closing - a.closing || a.dist - b.dist,
    lock: (a, b) => lockRank(a) - lockRank(b) || a.dist - b.dist,
  };
  return listed.sort((a, b) => group(a) - group(b) || by[sort](a, b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The LOCK column's words. A dark contact you are not locking reads DARK. */
export function lockWords(row: Pick<PlotRow, 'lock' | 'dark'>): string {
  if (row.lock === 'active') return 'ACTIVE';
  if (row.lock === 'locked') return 'LOCKED';
  if (row.lock === 'locking') return 'LOCKING';
  return row.dark ? 'DARK' : '';
}

/** How fast `there` comes towards `here`, units a second: positive closing, negative opening. */
export function closingSpeed(here: Vec2, hereVelocity: Vec2, there: Vec2, thereVelocity: Vec2): number {
  const towards = normalise(sub(here, there));
  const relative = sub(thereVelocity, hereVelocity);
  return relative.x * towards.x + relative.y * towards.y;
}

/**
 * Seconds to reach something at this distance at this closing speed, or
 * null if it is not getting closer.
 */
export function arrivalSeconds(dist: number, closing: number): number | null {
  return closing > 0.5 ? dist / closing : null;
}

/** Seconds as m:ss (or h:mm:ss), `--` for never. */
export function clockWords(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '--';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Who a ship showing its colours is: NPCs by role, players by name, empty ships as empty. */
function shipWho(world: World, ship: Ship, pilotId: string): string {
  const brain = world.npcs[ship.id];
  if (brain?.kind === 'pirate') return 'PIRATE';
  if (brain?.kind === 'arena') return 'ARENA';
  if (brain?.kind === 'watch') return 'CALDER WATCH';
  if (brain?.kind === 'trader') return 'TRADER';
  if (brain?.kind === 'miner') return 'MINER';
  if (brain?.kind === 'drone') return 'DRONE';
  const pilot = shipPilot(world, ship.id);
  if (pilot) return pilot.name;
  if (isEmptyShip(world, ship)) {
    if (ship.ownerId === pilotId) return 'Yours · empty';
    const owner = ship.ownerId ? world.pilots[ship.ownerId] : undefined;
    return owner ? `Empty · ${owner.name}` : 'Empty';
  }
  return 'Unknown';
}

function shipSide(world: World, ship: Ship, pilotId: string): PlotSide {
  const brain = world.npcs[ship.id];
  if (brain?.kind === 'pirate' || brain?.kind === 'arena') return 'hostile';
  if (brain?.kind === 'watch') return 'watch';
  if (ship.ownerId === pilotId) return 'own';
  return 'neutral';
}

/** A drone's job, after its name, in the drone manager's words. */
function droneState(ship: Ship, brain: World['npcs'][string] | undefined): string {
  if (brain?.kind !== 'drone') return '';
  if (brain.mode === 'return') return ' · RETURNING';
  if (!brain.rockId) return ' · WAITING';
  return ship.beams?.some((b) => b.cutting) ? ' · CUTTING' : ' · TO ROCK';
}

/** Where a row's thing is now in this view, or null if it has gone (for the nav target). */
export function plotPosition(world: World, kind: PlotKind, id: string): { position: Vec2; velocity: Vec2 } | null {
  if (kind === 'ship' || kind === 'drone') {
    const s = world.ships[id];
    return s ? { position: s.position, velocity: s.velocity } : null;
  }
  if (kind === 'station') {
    const s = world.stations[id];
    return s ? { position: s.position, velocity: s.velocity } : null;
  }
  if (kind === 'cache') {
    const l = world.loot.find((x) => x.id === id);
    return l ? { position: l.position, velocity: l.velocity } : null;
  }
  const i = world.asteroids.findIndex((a) => a.id === id);
  if (i < 0) return null;
  const s = asteroidStates(world.bodies, [world.asteroids[i]!], world.tick, world.dt)[0]!;
  return { position: s.position, velocity: s.velocity };
}

/** A row's NAME for one thing, without building the whole list (the nav marker, every frame). */
export function plotName(world: World, kind: PlotKind, id: string, pilotId: string): string {
  if (kind === 'station') return world.stations[id]?.name ?? 'Station';
  if (kind === 'rock') return 'Rock';
  if (kind === 'cache') return world.loot.find((l) => l.id === id)?.cache?.ownerId === pilotId ? 'Your cache' : 'Cache';
  const ship = world.ships[id];
  if (!ship) return 'Nav target';
  if (ship.contact) return 'Unknown contact';
  if (kind === 'drone') return `Drone ${(ship.droneId ?? '').toUpperCase()}`;
  return shipWho(world, ship, pilotId);
}
