import { GOODS } from './goods.js';
import { HULLS } from './hulls.js';
import { LOADOUTS } from './loadouts.js';
import { MANUFACTURERS } from './manufacturers.js';
import { MODULES } from './modules.js';
import { ROCK_FIELDS, rockCore, rockMakeup, screeAsteroids } from './asteroids.js';
import { seededRandom } from './random.js';
import { starterBodies } from './bodies.js';
import { FIXED_DT, UNDOCK_CLEARANCE } from './constants.js';
import { idleThrusters } from './flight.js';
import { freePadFor, launchPoint, onPad } from './docking.js';
import { runSpawners } from './lifecycle.js';
import { defaultPads, defaultShipMart, HARBOUR_ID, starterStations } from './stations.js';
import type { MountType, Pilot, Ship, Spawner, Station, World } from './types.js';
import { mountRefusal, weaponStatesFor } from './fitting.js';
import { add, fromAngle, scale } from './vec2.js';
import { setOrbitsMoving } from './rails.js';
import { createStarterWorld, DEFAULT_RULES } from './world.js';
import { WEAPONS } from './weapons.js';

/**
 * Save format.
 *
 * A save is the whole world, every pilot included, never one pilot's
 * career. That is the same thing a shared-world host will load, so solo
 * saves and server worlds are one format.
 *
 * The file is JSON with a small envelope:
 *
 *   { "format": "spacegame-world", "version": 1, "savedAt": "...", "world": { ... } }
 *
 * On load:
 * - The envelope is checked: right format, a version we know.
 * - Older versions are brought up to date by MIGRATIONS, one step at a
 *   time. Pre-1.0, a change that is not worth migrating bumps the version
 *   with no migration, and old saves are refused with a clear reason.
 * - Catalogues (hulls, modules, loadouts, manufacturers, weapons, goods)
 *   are replaced with the ones in the code, so tuning any of them applies
 *   to existing saves. Ships refer to specs by id (a hull id, and module
 *   ids in their fit) for exactly this reason, and stats are derived, never
 *   saved. Stations, markets
 *   and everything else in the world are kept as saved.
 * - Per-tick events are dropped.
 */

export const SAVE_FORMAT = 'spacegame-world';

/**
 * Bump when the shape of the saved world changes.
 *
 * History:
 * - 1: 0.5.0 to 0.6.x.
 * - 2: 0.7.0, modular ships. Ships carry a fit, spawners a loadout,
 *   stations an outfitting flag. Version 1 saves are refused (no
 *   migration: their hulls no longer exist).
 * - 3: 0.7.1, owned modules. Pilots carry module storage by station.
 *   Version 2 saves migrate: every pilot starts with empty storage.
 * - 4: 0.8.0, ships you own, pads, ship marts and escape pods. Stations
 *   carry pads and ship mart stock, ships the pad they are docked on.
 *   Version 3 saves migrate: see `migrate3to4`.
 * - 5: 0.9.0, the living system. The world has bodies; stations ride
 *   orbits and carry their velocity; pirate brains may have a home on a
 *   rail; ships hold target locks instead of one target. Version 4 saves
 *   migrate: see `migrate4to5`.
 * - 6 (6f): ship systems. Hulls have slot budgets and fixed flight,
 *   pod bay and fire control mounts; armour moved to internal mounts.
 *   Version 5 saves migrate: see `migrate5to6`.
 * - 7 (mining part 1): rocks hold ore, have a hardness and belong to a
 *   field. Version 6 saves migrate: see `migrate6to7`.
 */
export const SAVE_VERSION = 11;

/** Upgrade a world from version N to N + 1, keyed by N. */
export type Migration = (world: unknown) => unknown;
export const MIGRATIONS: Record<number, Migration> = {
  // 2 to 3: pilots gain module storage.
  2: (world) => {
    if (!isRecord(world) || !isRecord(world['pilots'])) return world;
    const pilots: Record<string, unknown> = {};
    for (const [id, p] of Object.entries(world['pilots'])) pilots[id] = isRecord(p) ? { storage: {}, ...p } : p;
    return { ...world, pilots };
  },
  3: (world) => migrate3to4(world),
  4: (world) => migrate4to5(world),
  5: (world) => migrate5to6(world),
  6: (world) => migrate6to7(world),
  7: (world) => migrate7to8(world),
  8: (world) => migrate8to9(world),
  9: (world) => migrate9to10(world),
  10: (world) => migrate10to11(world),
};

/**
 * 6 to 7: mining part 1 (docs/mining.md). Each rock without contents is
 * given what a rock of its size holds, seeded from its id so every load
 * of the same save agrees, and a field: the first 120 the belt made are
 * the ring's, the rest Ridge's, as `screeAsteroids` made them. Nothing
 * else changes; the belt starts topping itself up from now on.
 */
export function migrate6to7(world: unknown): unknown {
  if (!isRecord(world) || !Array.isArray(world['asteroids'])) return world;
  const ring = ROCK_FIELDS[0]!.target;
  const asteroids = world['asteroids'].map((a: unknown) => {
    if (!isRecord(a) || isRecord(a['contents'])) return a;
    const id = String(a['id'] ?? '');
    const radius = typeof a['radius'] === 'number' ? a['radius'] : 20;
    const n = Number(id.replace(/^rock-/, ''));
    const field = Number.isFinite(n) && n > ring ? 'ridge' : 'ring';
    return { ...a, ...rockMakeup(seededRandom(idSeed(id)), radius), field };
  });
  return { ...world, asteroids };
}

/**
 * 7 to 8: breaching (docs/mining.md, "Breaching"). Big rocks in an older
 * belt may now hide a gate-glass core, drawn from the rock's id so every
 * load of the same save agrees. A rock already part mined keeps its core
 * too: the glass is deep. No charges are planted.
 */
export function migrate7to8(world: unknown): unknown {
  if (!isRecord(world) || !Array.isArray(world['asteroids'])) return world;
  const asteroids = world['asteroids'].map((a: unknown) => {
    if (!isRecord(a) || a['core'] !== undefined || typeof a['radius'] !== 'number') return a;
    const core = rockCore(seededRandom(idSeed(`${String(a['id'] ?? '')}:core`)), a['radius']);
    return core ? { ...a, core } : a;
  });
  return { ...world, asteroids, charges: [] };
}

/**
 * 8 to 9: cores retuned (smaller in smaller rocks, more breach points in
 * bigger ones, some fractured). Every whole rock big enough draws its core
 * again from its id, as 7 to 8 did, so older belts play like new ones.
 * Exposed glass and rocks with charges on them keep what they have.
 */
export function migrate8to9(world: unknown): unknown {
  if (!isRecord(world) || !Array.isArray(world['asteroids'])) return world;
  const charged = new Set((Array.isArray(world['charges']) ? world['charges'] : []).map((c: unknown) => (isRecord(c) ? String(c['rockId']) : '')));
  const asteroids = world['asteroids'].map((a: unknown) => {
    if (!isRecord(a) || a['fragile'] || typeof a['radius'] !== 'number' || charged.has(String(a['id']))) return a;
    const { core: _old, ...rest } = a;
    const core = rockCore(seededRandom(idSeed(`${String(a['id'] ?? '')}:core`)), a['radius']);
    return core ? { ...rest, core } : rest;
  });
  return { ...world, asteroids };
}

/**
 * 9 to 10: holds (docs/mining.md, "Holds"). Mining hulls carry their ore
 * hold built in, so the Ore Hold L modules are gone: each one fitted or
 * stored becomes a Tessaract Standard L container in the same place. An
 * ore hopper's one-ore filter (`hopperEject`) becomes its list (`hopper`).
 */
export function migrate9to10(world: unknown): unknown {
  if (!isRecord(world)) return world;
  const OLD = 'rookrivet-orehold-l';
  const NEW = 'tessaract-container-l';
  const ships: Record<string, unknown> = {};
  for (const [id, ship] of Object.entries(isRecord(world['ships']) ? world['ships'] : {})) {
    if (!isRecord(ship)) {
      ships[id] = ship;
      continue;
    }
    const { hopperEject, ...rest } = ship;
    const fit = isRecord(rest['fit']) ? Object.fromEntries(Object.entries(rest['fit']).map(([m, v]) => [m, v === OLD ? NEW : v])) : rest['fit'];
    ships[id] = { ...rest, fit, ...(typeof hopperEject === 'string' ? { hopper: { drop: [hopperEject] } } : {}) };
  }
  const pilots: Record<string, unknown> = {};
  for (const [id, pilot] of Object.entries(isRecord(world['pilots']) ? world['pilots'] : {})) {
    if (!isRecord(pilot) || !isRecord(pilot['storage'])) {
      pilots[id] = pilot;
      continue;
    }
    const storage: Record<string, unknown> = {};
    for (const [station, held] of Object.entries(pilot['storage'])) {
      if (!isRecord(held) || typeof held[OLD] !== 'number') {
        storage[station] = held;
        continue;
      }
      const { [OLD]: count, ...others } = held;
      storage[station] = { ...others, [NEW]: (typeof others[NEW] === 'number' ? others[NEW] : 0) + (count as number) };
    }
    pilots[id] = { ...pilot, storage };
  }
  return { ...world, ships, pilots };
}

/**
 * 10 to 11: slot tiers (docs/fitting.md). Hulls now have core systems and
 * high, mid and low slots. Every module that still fits where it is stays;
 * the rest move to the first free slot that takes them (a tractor from
 * its old utility mount to a high slot, a shield from an internal mount
 * to a mid), keeping a switched-on tractor on; anything with nowhere to go
 * goes to its owner's storage where the ship is docked, else at Harbour.
 * Weapon states are rebuilt, keeping those whose mount and module did not
 * change.
 */
export function migrate10to11(world: unknown): unknown {
  if (!isRecord(world) || !isRecord(world['ships'])) return world;
  const pilots: Record<string, Pilot> = isRecord(world['pilots']) ? { ...(world['pilots'] as Record<string, Pilot>) } : {};
  const ships: Record<string, unknown> = {};
  for (const [id, raw] of Object.entries(world['ships'])) {
    const ship = raw as unknown as Ship;
    const hull = isRecord(raw) ? HULLS[ship.hullId] : undefined;
    if (!hull) {
      ships[id] = raw;
      continue;
    }
    const oldFit = ship.fit ?? {};
    const fit: Record<string, string> = {};
    const homeless: { from: string; moduleId: string }[] = [];
    for (const [mountId, moduleId] of Object.entries(oldFit)) {
      const mount = hull.mounts.find((m) => m.id === mountId);
      const module = MODULES[moduleId];
      if (!module) continue;
      if (mount && mountRefusal(mount, module) === null) fit[mountId] = moduleId;
      else homeless.push({ from: mountId, moduleId });
    }
    // Biggest first, so a large module is not shut out by small ones taking its slot.
    const size = { S: 0, M: 1, L: 2, XL: 3 } as const;
    homeless.sort((a, b) => size[MODULES[b.moduleId]!.size] - size[MODULES[a.moduleId]!.size]);
    const moved: Record<string, string> = {};
    const leftover: string[] = [];
    for (const h of homeless) {
      const module = MODULES[h.moduleId]!;
      // The smallest free slot that takes it, so it does not squat a bigger one.
      const free = hull.mounts
        .filter((m) => !fit[m.id] && mountRefusal(m, module) === null)
        .sort((a, b) => size[a.size] - size[b.size])[0];
      if (free) {
        fit[free.id] = h.moduleId;
        moved[h.from] = free.id;
      } else leftover.push(h.moduleId);
    }
    const owner = ship.ownerId ? pilots[ship.ownerId] : undefined;
    if (owner && leftover.length > 0) {
      const stationId = ship.state === 'docked' && ship.dockedAt ? ship.dockedAt : HARBOUR_ID;
      const shelf = { ...(owner.storage?.[stationId] ?? {}) };
      for (const moduleId of leftover) shelf[moduleId] = (shelf[moduleId] ?? 0) + 1;
      pilots[owner.id] = { ...owner, storage: { ...(owner.storage ?? {}), [stationId]: shelf } };
    }
    const switchedOn = (ship.switchedOn ?? []).map((m) => moved[m] ?? m).filter((m) => fit[m]);
    const weapons = weaponStatesFor({ modules: MODULES, weapons: WEAPONS, goods: GOODS }, hull, fit, ship.heading ?? 0, { fit: oldFit, weapons: ship.weapons ?? [] });
    const { switchedOn: _old, ...rest } = ship;
    ships[id] = { ...rest, fit, weapons, ...(switchedOn.length > 0 ? { switchedOn } : {}) };
  }
  return { ...world, ships, pilots };
}

/** A seed from an id, FNV-1a. */
function idSeed(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** The stock systems a ship is given free on new fixed mounts in `migrate5to6`, by mount type. */
const STOCK_SYSTEMS: Partial<Record<MountType, string>> = {
  flight: 'meridian-helm-s',
  podBay: 'meridian-podbay-s',
  fireControl: 'paragon-director-s',
};

/** The tractor every ship had built in until 6f, fitted free on a spare utility mount by `migrate5to6`. */
const STOCK_TRACTOR = 'meridian-gleaner-s';

/**
 * 5 to 6: ship systems (6f, docs/ship-systems.md).
 *
 * For every ship, against its hull as it now is:
 * - each module stays on its mount if the mount still takes it;
 * - one that no longer fits there (armour from a utility mount, say)
 *   moves to the first free mount of the same hull that takes it;
 * - one with nowhere to go goes into its pilot's storage at the station
 *   the ship is docked at, else at Harbour (NPC ships just drop it: their
 *   spawners fit them afresh);
 * - new fixed mounts get the stock flight computer, pod bay and fire
 *   control free (a pod only has a flight mount), and a spare utility
 *   mount gets the stock tractor, which every ship had built in before;
 * - weapon states are rebuilt for the new fit, keeping those whose
 *   mount and module did not change.
 */
export function migrate5to6(world: unknown): unknown {
  if (!isRecord(world) || !isRecord(world['ships'])) return world;
  const pilots: Record<string, Pilot> = isRecord(world['pilots']) ? { ...(world['pilots'] as Record<string, Pilot>) } : {};
  const ships: Record<string, unknown> = {};
  for (const [id, raw] of Object.entries(world['ships'])) {
    if (!isRecord(raw)) {
      ships[id] = raw;
      continue;
    }
    const ship = raw as unknown as Ship;
    const hull = HULLS[ship.hullId];
    if (!hull) {
      ships[id] = raw;
      continue;
    }
    const oldFit = ship.fit ?? {};
    const fit: Record<string, string> = {};
    const homeless: string[] = [];
    // Keep what still fits where it is.
    for (const [mountId, moduleId] of Object.entries(oldFit)) {
      const mount = hull.mounts.find((m) => m.id === mountId);
      const module = MODULES[moduleId];
      if (!module) continue;
      if (mount && mountRefusal(mount, module) === null) fit[mountId] = moduleId;
      else homeless.push(moduleId);
    }
    // Rehouse the rest on free mounts that take them.
    const leftover: string[] = [];
    for (const moduleId of homeless) {
      const module = MODULES[moduleId]!;
      const free = hull.mounts.find((m) => !fit[m.id] && mountRefusal(m, module) === null);
      if (free) fit[free.id] = moduleId;
      else leftover.push(moduleId);
    }
    // Stock systems on the new fixed mounts, and the tractor ships used to have built in.
    for (const mount of hull.mounts) {
      if (fit[mount.id]) continue;
      const stock = STOCK_SYSTEMS[mount.type];
      if (stock && MODULES[stock] && mountRefusal(mount, MODULES[stock]!) === null) fit[mount.id] = stock;
    }
    if (!hull.escapePod && !Object.values(fit).some((m) => MODULES[m]?.kind === 'tractor')) {
      const spare = hull.mounts.find((m) => m.type === 'high' && !fit[m.id] && mountRefusal(m, MODULES[STOCK_TRACTOR]!) === null);
      if (spare) fit[spare.id] = STOCK_TRACTOR;
    }
    // What could not be rehoused goes to the owner's storage.
    const owner = ship.ownerId ? pilots[ship.ownerId] : undefined;
    if (owner && leftover.length > 0) {
      const stationId = ship.state === 'docked' && ship.dockedAt ? ship.dockedAt : HARBOUR_ID;
      const shelf = { ...(owner.storage?.[stationId] ?? {}) };
      for (const moduleId of leftover) shelf[moduleId] = (shelf[moduleId] ?? 0) + 1;
      pilots[owner.id] = { ...owner, storage: { ...(owner.storage ?? {}), [stationId]: shelf } };
    }
    const weapons = weaponStatesFor({ modules: MODULES, weapons: WEAPONS, goods: GOODS }, hull, fit, ship.heading ?? 0, { fit: oldFit, weapons: ship.weapons ?? [] });
    ships[id] = { ...ship, fit, weapons };
  }
  return { ...world, ships, pilots };
}

/**
 * A ship with target locks in place of the old single target. Version 5
 * worlds saved from `main` before locks landed (6c part 2, same version)
 * have neither; their ships start with no locks.
 */
function withLocks(ship: Ship): Ship {
  const { targetId: _old, ...rest } = ship as Ship & { targetId?: unknown };
  return { ...rest, locks: Array.isArray(rest.locks) ? rest.locks : [], activeLock: rest.activeLock ?? null };
}

/**
 * A ship with 6e's power and guns in place: a full capacitor (the hull's,
 * from the catalogue), fire group 1, and every weapon's magazine loaded.
 * Version 5 worlds saved before 6e have none of these.
 */
function withPower(ship: Ship): Ship {
  const hull = HULLS[ship.hullId];
  const capacitor = typeof ship.capacitor === 'number' ? ship.capacitor : (hull?.capacitor ?? 0);
  const weapons = (ship.weapons ?? []).map((w) => {
    const moduleId = ship.fit[w.mountId];
    const weapon = moduleId ? WEAPONS[MODULES[moduleId]?.weaponId ?? ''] : undefined;
    return {
      ...w,
      loaded: typeof w.loaded === 'number' ? w.loaded : (weapon?.magazine ?? 0),
      reloadTicks: w.reloadTicks ?? 0,
      group: w.group ?? 1,
    };
  });
  return { ...ship, capacitor, fireGroup: ship.fireGroup ?? 1, weapons };
}

/**
 * 0.9.0 makes sensing a fitted system: a hull with no radar sees nothing
 * and one with no targeting computer locks nothing. Ships from version 4
 * had neither (their hulls had built-in sensors), so they are given the
 * stock sets free on their new sensor and nav mounts: a pod its beacon,
 * any other ship Meridian's radar and plotter, and every ship Meridian's
 * nav computer.
 */
function withSensors(ship: Ship): Ship {
  const hull = HULLS[ship.hullId];
  if (!hull) return ship;
  const fit = { ...ship.fit };
  for (const mount of hull.mounts) {
    if (fit[mount.id]) continue;
    if (mount.type === 'radar') fit[mount.id] = hull.escapePod ? 'meridian-beacon-s' : 'meridian-radar-s';
    if (mount.type === 'computer') fit[mount.id] = 'meridian-computer-s';
    if (mount.type === 'nav') fit[mount.id] = 'meridian-nav-s';
  }
  return { ...ship, fit };
}

/** How far apart ships towed to Harbour with no free pad are left, units. */
const TOW_SPACING = 60;

/**
 * 4 to 5: the flat sector becomes the Calder system.
 *
 * Every pilot keeps their credits, storage and ships; everything else
 * starts fresh in the new system, at the saved tick:
 *
 * - The world gains the starter bodies. Harbour and Ridge are replaced by
 *   their new copies on their orbits (same ids, pads, markets and ship
 *   mart). Any other station is kept where it was, fixed in place.
 * - Pilots' ships gain the stock sensor sets on their new sensor mounts
 *   (`withSensors`): sensing is now a fitted system.
 * - Pilots' ships docked at a station stay on the same pad there (or the
 *   smallest free pad that fits, if that one is gone or taken).
 * - Pilots' ships in space, flown or empty, are towed to Harbour: set
 *   down on a free pad that fits, or left at rest just off its pads if
 *   none is free. Their old positions mean nothing in the new system.
 * - NPC ships, their brains and spawners are replaced by the new
 *   system's, which spawn at once. Projectiles, wrecks and loot in
 *   flight are lost.
 */
export function migrate4to5(world: unknown): unknown {
  if (!isRecord(world) || !isRecord(world['ships']) || !isRecord(world['stations'])) return world;
  const tick = typeof world['tick'] === 'number' ? world['tick'] : 0;
  const dt = typeof world['dt'] === 'number' ? world['dt'] : FIXED_DT;
  const npcs = isRecord(world['npcs']) ? world['npcs'] : {};

  const stations: Record<string, Station> = {};
  for (const [id, st] of Object.entries(world['stations'])) {
    if (isRecord(st)) stations[id] = { ...(st as unknown as Station), velocity: { x: 0, y: 0 }, orbit: null };
  }
  Object.assign(stations, starterStations(tick, dt));
  const harbour = stations[HARBOUR_ID]!;

  // Pilot-owned ships only; NPCs are replaced. Docked ships go first, so
  // a towed ship never takes the pad a docked one was already on.
  const kept = Object.entries(world['ships'])
    .filter(([id, sh]) => isRecord(sh) && npcs[id] === undefined)
    .map(([, sh]) => ({ ...withPower(withSensors(withLocks(sh as unknown as Ship))), velocity: { x: 0, y: 0 }, angularVelocity: 0, thrusters: idleThrusters() }))
    .sort((a, b) => Number(b.state === 'docked') - Number(a.state === 'docked') || (a.id < b.id ? -1 : 1));

  const ships: Record<string, Ship> = {};
  let adrift = 0;
  for (const ship of kept) {
    const size = HULLS[ship.hullId]?.sizeClass ?? 'S';
    const home = ship.state === 'docked' && ship.dockedAt ? stations[ship.dockedAt] : undefined;
    if (home) {
      const same = home.pads.find((p) => p.id === ship.padId);
      const pad = (same && freePadFor({ ...home, pads: [same] }, size, ships)) ?? freePadFor(home, size, ships);
      if (pad) {
        ships[ship.id] = onPad(ship, home, pad);
        continue;
      }
    }
    // In space, or nowhere to put it: tow to Harbour.
    const pad = freePadFor(harbour, size, ships);
    if (pad) {
      ships[ship.id] = onPad(ship, harbour, pad);
      continue;
    }
    const near = harbour.pads[adrift % Math.max(1, harbour.pads.length)];
    const at = near ? launchPoint(harbour, near) : add(harbour.position, scale(fromAngle(0), harbour.radius + UNDOCK_CLEARANCE));
    const out = near ? fromAngle(near.facing) : fromAngle(0);
    const position = add(at, scale(out, TOW_SPACING * Math.floor(adrift / Math.max(1, harbour.pads.length))));
    adrift++;
    ships[ship.id] = {
      ...ship,
      state: 'flying',
      dockedAt: null,
      padId: null,
      position,
      heading: near?.facing ?? 0,
      velocity: { ...harbour.velocity },
    };
  }

  // The new system's NPCs, spawned now at the saved tick.
  const fresh = createStarterWorld();
  const spawners: Spawner[] = fresh.spawners.map((sp) => ({ ...sp, shipId: null, timerTicks: 0, spawned: 0 }));
  const migrated = {
    ...(world as unknown as World),
    tick,
    dt,
    bodies: starterBodies(),
    asteroids: screeAsteroids(),
    stations,
    ships,
    npcs: {},
    spawners,
    projectiles: [],
    munitions: [],
    decoys: [],
    wrecks: [],
    loot: [],
    hulls: { ...HULLS },
    modules: { ...MODULES },
    loadouts: { ...LOADOUTS },
    manufacturers: { ...MANUFACTURERS },
    weapons: { ...WEAPONS },
    goods: { ...GOODS },
    events: [],
  };
  return runSpawners(migrated);
}

/**
 * 3 to 4: pads and ship marts.
 *
 * - Stations gain the pads and ship mart stock their starter-sector
 *   layout has (stations.ts), or a default ring of pads and no ship mart
 *   if the station is not one of ours.
 * - Every ship gains `padId`. Docked ships, in id order, are set down on
 *   the smallest free pad that fits, exactly as docking would. A docked
 *   ship with no pad left for it is moved just outside the station,
 *   at rest and flying, rather than lost.
 * - Nothing else changes. A pilot whose ship was destroyed under version
 *   3 has none, and wakes as version 4 pilots do.
 */
export function migrate3to4(world: unknown): unknown {
  if (!isRecord(world) || !isRecord(world['stations']) || !isRecord(world['ships'])) return world;

  const stations: Record<string, Station> = {};
  for (const [id, st] of Object.entries(world['stations'])) {
    if (!isRecord(st)) continue;
    const station = st as unknown as Station;
    stations[id] = {
      ...station,
      pads: Array.isArray(st['pads']) ? station.pads : defaultPads(station),
      shipMart: Array.isArray(st['shipMart']) ? station.shipMart : defaultShipMart(id),
    };
  }

  // Undocked ships first get a null pad, so docked ones are placed against a clean slate.
  const ships: Record<string, Ship> = {};
  for (const [id, sh] of Object.entries(world['ships'])) {
    if (!isRecord(sh)) continue;
    ships[id] = { ...(sh as unknown as Ship), padId: null };
  }
  for (const id of Object.keys(ships).sort()) {
    const ship = ships[id]!;
    if (ship.state !== 'docked' || !ship.dockedAt) continue;
    const station = stations[ship.dockedAt];
    const hull = HULLS[ship.hullId];
    const pad = station && hull ? freePadFor(station, hull.sizeClass, ships) : null;
    if (station && pad) {
      ships[id] = onPad(ship, station, pad);
    } else if (station) {
      const out = fromAngle(ship.heading);
      ships[id] = {
        ...ship,
        state: 'flying',
        dockedAt: null,
        position: add(station.position, scale(out, station.radius + UNDOCK_CLEARANCE)),
        velocity: { x: 0, y: 0 },
        angularVelocity: 0,
      };
    }
  }
  return { ...world, stations, ships };
}

export interface SaveEnvelope {
  format: string;
  version: number;
  savedAt: string;
  world: World;
}

export type LoadRefusal =
  | 'notJson' // could not be parsed at all
  | 'notASave' // parsed, but not a spacegame world file
  | 'tooNew' // saved by a newer version of the game
  | 'tooOld' // saved by an older version with no migration path
  | 'damaged'; // the world inside is missing parts it must have

export type LoadResult = { ok: true; world: World; savedAt: string } | { ok: false; reason: LoadRefusal };

/** Turn a world into save-file text. `savedAt` is passed in so the sim stays clock-free. */
export function serializeWorld(world: World, savedAt: string): string {
  const envelope: SaveEnvelope = { format: SAVE_FORMAT, version: SAVE_VERSION, savedAt, world: { ...world, events: [] } };
  return JSON.stringify(envelope);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** The parts of a world without which nothing works. Not a full schema check. */
function looksLikeWorld(w: unknown): w is World {
  if (!isRecord(w)) return false;
  return (
    typeof w['tick'] === 'number' &&
    typeof w['dt'] === 'number' &&
    typeof w['nextEntityId'] === 'number' &&
    isRecord(w['pilots']) &&
    isRecord(w['ships']) &&
    isRecord(w['npcs']) &&
    isRecord(w['stations']) &&
    isRecord(w['bodies']) &&
    Array.isArray(w['spawners']) &&
    Array.isArray(w['projectiles']) &&
    Array.isArray(w['wrecks']) &&
    Array.isArray(w['loot'])
  );
}

/** Read save-file text back into a world, migrating and checking it on the way. */
export function deserializeWorld(text: string, migrations: Record<number, Migration> = MIGRATIONS): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  if (!isRecord(parsed) || parsed['format'] !== SAVE_FORMAT || typeof parsed['version'] !== 'number') {
    return { ok: false, reason: 'notASave' };
  }

  let version = parsed['version'];
  if (version > SAVE_VERSION) return { ok: false, reason: 'tooNew' };
  let world: unknown = parsed['world'];
  while (version < SAVE_VERSION) {
    const step = migrations[version];
    if (!step) return { ok: false, reason: 'tooOld' };
    world = step(world);
    version++;
  }

  if (!looksLikeWorld(world)) return { ok: false, reason: 'damaged' };
  const savedAt = typeof parsed['savedAt'] === 'string' ? parsed['savedAt'] : '';
  const ships: Record<string, Ship> = {};
  for (const [id, ship] of Object.entries(world.ships)) ships[id] = withPower(withLocks(ship));
  const projectiles = world.projectiles.map((p) => ({ ...p, damageType: p.damageType ?? 'kinetic' }));
  // Version 5 worlds saved from main before the Scree had rocks get them now.
  const asteroids = Array.isArray(world.asteroids) ? world.asteroids : screeAsteroids();
  // Prices and stock are design data until the economy arrives (milestone
  // 10): the starter stations' markets are refreshed from the catalogue on
  // load, like hulls and modules, so a save picks up rebalanced prices.
  // Everything else about a station (where it is, its pads) stays as saved.
  const current = starterStations();
  const stations: Record<string, Station> = {};
  // Ship mart stock too: what a starter station sells is design data.
  for (const [id, st] of Object.entries(world.stations)) stations[id] = current[id] ? { ...st, market: { ...current[id]!.market }, shipMart: [...current[id]!.shipMart] } : st;
  // NPC spawners added since the save was made join it (miners, say); those it has keep their state.
  const known = new Set(world.spawners.map((sp) => sp.id));
  const spawners = [...world.spawners, ...createStarterWorld().spawners.filter((sp) => !known.has(sp.id)).map((sp) => ({ ...sp, shipId: null, timerTicks: Math.round(10 / world.dt), spawned: 0 }))];
  const loaded: World = {
      ...world,
      ships,
      stations,
      spawners,
      projectiles,
      // Worlds saved before the rules existed take the defaults (gravity off).
      rules: { ...DEFAULT_RULES, ...(world.rules ?? {}) },
      // Worlds saved before 6e part 2 had nothing in flight but shots.
      munitions: Array.isArray(world.munitions) ? world.munitions : [],
      decoys: Array.isArray(world.decoys) ? world.decoys : [],
      asteroids,
      hulls: { ...HULLS },
      modules: { ...MODULES },
      loadouts: { ...LOADOUTS },
      manufacturers: { ...MANUFACTURERS },
      weapons: { ...WEAPONS },
      goods: { ...GOODS },
      events: [],
  };
  // Worlds saved before the orbits rule had moving orbits: stop them where they stand.
  const orbitsKnown = typeof (world.rules as Partial<World['rules']> | undefined)?.orbits === 'boolean';
  return { ok: true, savedAt, world: orbitsKnown ? loaded : setOrbitsMoving({ ...loaded, rules: { ...loaded.rules, orbits: true } }, false) };
}
