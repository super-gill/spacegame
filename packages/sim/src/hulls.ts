import type { HullSpec, MountPoint, MountService, MountType, ModuleSize } from './types.js';
import type { Vec2 } from './vec2.js';

/**
 * Hull catalogue. Data only. Add hulls here; nothing else needs to change.
 *
 * Coordinates are hull space: world units from the hull centre, nose
 * along +x, +y to the ship's right. Outlines and mount positions for the
 * Kessari hulls are taken from the "Spacegame ship concepts" canvas at
 * one fifth scale.
 *
 * A hull has no thrust, shields, power, cargo or guns of its own: those
 * come from the modules fitted to it (see stats.ts).
 */

const FORWARD = 0;
const AFT = Math.PI;

function mount(id: string, type: MountType, size: ModuleSize, x: number, y: number, services: MountService[], facing = FORWARD): MountPoint {
  return { id, type, size, position: { x, y }, facing, services };
}

/** A weapon mount with a turret arc: `arc` radians wide, centred on `facing`. */
function gunMount(id: string, size: ModuleSize, x: number, y: number, services: MountService[], facing: number, arc: number): MountPoint {
  return { ...mount(id, 'weapon', size, x, y, services, facing), arc };
}

const FULL_ARC = Math.PI * 2;
const BROAD_ARC = Math.PI * 1.5; // 270 degrees: a blind spot behind
const HALF_ARC = Math.PI; // the forward half

function outline(points: ReadonlyArray<readonly [number, number]>): Vec2[] {
  return points.map(([x, y]) => ({ x, y }));
}

export const HULLS: Record<string, HullSpec> = {
  'meridian-courier': {
    // Civilian starter. Light, forgiving, a little of everything and room
    // for one upgrade (the empty armour mount).
    id: 'meridian-courier',
    name: 'Meridian Tern',
    race: null,
    manufacturer: 'meridian',
    role: 'civilian',
    sizeClass: 'S',
    mass: 5,
    structure: 220,
    price: 1500,
    radius: 18,
    outline: outline([[18, 0], [10, -8], [-12, -10], [-16, -6], [-16, 6], [-12, 10], [10, 8]]),
    maxSpeed: 340,
    maxTurnRate: 2.4, // about 140 degrees per second
    signature: 18,
    class: 'cutter',
    // Small pool, steady recovery: never strands a new pilot, never lets them show off.
    capacitor: 80,
    capacitorRecharge: 5,
    mounts: [
      mount('n1', 'nav', 'S', -1, 0, ['power']),
      mount('r1', 'radar', 'S', 8, -3, ['power']),
      mount('t1', 'computer', 'S', 8, 3, ['power']),
      mount('f1', 'flight', 'S', 4, -5, ['power']),
      mount('x1', 'fireControl', 'S', 4, 5, ['power']),
      mount('p1', 'podBay', 'S', -11, -6, []),
      // Cutter budget: 2 weapon, 2 utility, 3 internal, 1 bay.
      mount('w1', 'weapon', 'S', 14, 0, ['power']),
      gunMount('w2', 'S', 2, 0, ['power'], FORWARD, BROAD_ARC),
      mount('e1', 'engine', 'S', -16, 0, ['power'], AFT),
      mount('c1', 'core', 'S', -7, -4, ['power']),
      mount('c2', 'core', 'S', -7, 4, ['power']),
      mount('i1', 'internal', 'S', -12, 0, ['power']),
      mount('i2', 'internal', 'S', -3, -4, ['power']),
      mount('i3', 'internal', 'S', -3, 4, ['power']),
      mount('u1', 'utility', 'S', -3, -11, ['power']),
      mount('u2', 'utility', 'S', -3, 11, ['power']),
      mount('b1', 'bay', 'S', -11, 6, []),
    ],
    bonuses: [{ source: 'role', label: '+25% cargo from full-size pods', stat: 'cargoCapacity', amount: 0.25, kind: 'cargoPod' }],
  },

  'kessari-wedge': {
    // Kessari Orbital Defence frigate: two medium gun mounts forward of the
    // wing roots, a light turret on the nose, twin engines.
    id: 'kessari-wedge',
    name: 'Kessari Warrant',
    race: 'kessari',
    manufacturer: 'kessariOrbital',
    role: 'combat',
    sizeClass: 'M',
    price: 6000,
    mass: 12,
    structure: 300,
    radius: 25,
    outline: outline([[24, 0], [-18.8, -10], [-24, -8.4], [-20.8, 0], [-24, 8.4], [-18.8, 10]]),
    maxSpeed: 320,
    maxTurnRate: 2.2,
    signature: 28,
    class: 'sloop',
    // Tight pool, quick recovery: short, sharp exchanges with shields up, then breathe.
    capacitor: 90,
    capacitorRecharge: 9,
    mounts: [
      mount('n1', 'nav', 'S', -2, 0, ['power']),
      mount('r1', 'radar', 'S', 15, -2, ['power']),
      mount('t1', 'computer', 'M', 15, 2, ['power']),
      mount('f1', 'flight', 'M', 11, -3, ['power']),
      mount('x1', 'fireControl', 'M', 11, 3, ['power']),
      mount('p1', 'podBay', 'S', -19, -5, []),
      // Sloop budget: 3 weapon, 3 utility, 4 internal, 1 bay.
      mount('w1', 'weapon', 'M', -5, -4.4, ['power']),
      mount('w2', 'weapon', 'M', -5, 4.4, ['power']),
      gunMount('w3', 'S', 8, 0, ['power'], FORWARD, BROAD_ARC),
      mount('e1', 'engine', 'M', -23, -4, ['power'], AFT),
      mount('e2', 'engine', 'M', -23, 4, ['power'], AFT),
      mount('c1', 'core', 'M', -11, -3, ['power']),
      mount('c2', 'core', 'M', -11, 3, ['power']),
      mount('i1', 'internal', 'M', -16, 0, ['power']),
      mount('i2', 'internal', 'M', -8, -7, ['power']),
      mount('i3', 'internal', 'S', -8, 7, ['power']),
      mount('i4', 'internal', 'S', 3, 0, ['power']),
      mount('u1', 'utility', 'M', 2, -7, ['power']),
      mount('u2', 'utility', 'S', 2, 7, ['power']),
      mount('u3', 'utility', 'S', -19, 5, ['power']),
      mount('b1', 'bay', 'S', -14, 13, []),
    ],
    bonuses: [
      { source: 'role', label: '+25% missile damage from full-size launchers', stat: 'damage', amount: 0.25, kind: 'weapon', tag: 'missile' },
      { source: 'role', label: '+25% lock speed from a full-size targeting computer', stat: 'scanResolution', amount: 0.25, kind: 'targetingComputer' },
      { source: 'race', label: '+20% shield from full-size shield tech', stat: 'shield', amount: 0.2, tag: 'shield' },
    ],
  },

  'tessaract-spine': {
    // Tessaract Logistics hauler: a cab, a bare spine with six container
    // bays, twin engines. Best hauler there is full; handles far better
    // half loaded.
    id: 'tessaract-spine',
    name: 'Tessaract Manifest',
    race: 'kessari',
    manufacturer: 'tessaract',
    role: 'transport',
    sizeClass: 'L',
    price: 9000,
    mass: 18,
    structure: 520,
    radius: 30,
    outline: outline([
      [27.8, 0], [22.6, -4], [18.2, -4], [18.2, -1.6], [-21.8, -1.6], [-21.8, -4.4], [-24.6, -4.4],
      [-24.6, 4.4], [-21.8, 4.4], [-21.8, 1.6], [18.2, 1.6], [18.2, 4], [22.6, 4],
    ]),
    maxSpeed: 220,
    maxTurnRate: 1.2, // about 70 degrees per second
    signature: 40,
    class: 'merchantman',
    // Deep pool, slow recovery: freight reactors are big and lazy.
    capacitor: 160,
    capacitorRecharge: 3,
    mounts: [
      mount('n1', 'nav', 'M', 16, 0, ['power']),
      mount('r1', 'radar', 'M', -8, 0, ['power']),
      mount('t1', 'computer', 'S', 4, 0, ['power']),
      mount('b1', 'bay', 'M', 10.2, -5.4, ['heavyLoad']),
      mount('b2', 'bay', 'M', 10.2, 5.4, ['heavyLoad']),
      mount('b3', 'bay', 'M', -2.2, -5.4, ['heavyLoad']),
      mount('b4', 'bay', 'M', -2.2, 5.4, ['heavyLoad']),
      mount('b5', 'bay', 'M', -14.6, -5.4, ['heavyLoad']),
      mount('b6', 'bay', 'M', -14.6, 5.4, ['heavyLoad']),
      mount('e1', 'engine', 'M', -26.6, -2.6, ['power'], AFT),
      mount('e2', 'engine', 'M', -26.6, 2.6, ['power'], AFT),
      mount('c1', 'core', 'M', 20.4, -2, ['power']),
      mount('c2', 'core', 'M', 20.4, 2, ['power']),
      mount('f1', 'flight', 'M', 25, -2.5, ['power']),
      mount('x1', 'fireControl', 'M', 25, 2.5, ['power']),
      mount('p1', 'podBay', 'S', -4, 0, []),
      // Merchantman budget: 1 weapon, 2 utility, 4 internal, 6 bays.
      mount('i1', 'internal', 'M', 24.5, 0, ['power']),
      mount('i2', 'internal', 'S', 7, 0, ['power']),
      mount('i3', 'internal', 'S', -10, 0, ['power']),
      mount('i4', 'internal', 'S', -18, 0, ['power']),
      mount('u1', 'utility', 'M', -23.2, 0, ['power']),
      mount('u2', 'utility', 'S', 21, 0, ['power']),
      // One swivel forward: a pirate learns to come from behind.
      gunMount('w1', 'S', 15, 0, ['power'], FORWARD, HALF_ARC),
    ],
    bonuses: [
      { source: 'role', label: '+25% cargo from full-size containers', stat: 'cargoCapacity', amount: 0.25, kind: 'cargoPod' },
      { source: 'race', label: '+20% shield from full-size shield tech', stat: 'shield', amount: 0.2, tag: 'shield' },
    ],
  },

  'rookrivet-prospector': {
    // Rook and Rivet prospector (docs/mining.md; name provisional, a lore
    // ask): the Collective's belt cutter. A survey scanner, an assay
    // computer and a light mining laser; a small hold, so it finds rock and
    // picks the easy ones, or scouts for a hulk. A swivel for company.
    id: 'rookrivet-prospector',
    name: 'Rook and Rivet Prospector',
    race: 'freeBelt',
    manufacturer: 'rookRivet',
    role: 'civilian',
    sizeClass: 'S',
    mass: 6,
    structure: 200,
    price: 2600,
    radius: 19,
    outline: outline([[17, 0], [12, -9], [2, -11], [-14, -9], [-17, -4], [-17, 4], [-14, 9], [2, 11], [12, 9]]),
    maxSpeed: 300,
    maxTurnRate: 2.2,
    signature: 20,
    class: 'cutter',
    // A deeper pool than the Tern's: lasers and pulses run on it.
    capacitor: 110,
    capacitorRecharge: 7,
    mounts: [
      mount('n1', 'nav', 'S', -1, 0, ['power']),
      mount('r1', 'radar', 'S', 8, -3, ['power']),
      mount('t1', 'computer', 'S', 8, 3, ['power']),
      mount('f1', 'flight', 'S', 4, -6, ['power']),
      mount('x1', 'fireControl', 'S', 4, 6, ['power']),
      mount('p1', 'podBay', 'S', -12, -6, []),
      // Cutter budget: 2 weapon, 2 utility, 3 internal, 1 bay.
      mount('w1', 'weapon', 'S', 15, 0, ['power']),
      gunMount('w2', 'S', 0, 0, ['power'], FORWARD, BROAD_ARC),
      mount('e1', 'engine', 'S', -17, 0, ['power'], AFT),
      mount('c1', 'core', 'S', -8, -4, ['power']),
      mount('c2', 'core', 'S', -8, 4, ['power']),
      mount('i1', 'internal', 'S', -13, 0, ['power']),
      mount('i2', 'internal', 'S', -4, -5, ['power']),
      mount('i3', 'internal', 'S', -4, 5, ['power']),
      mount('u1', 'utility', 'S', -3, -11, ['power']),
      mount('u2', 'utility', 'S', -3, 11, ['power']),
      mount('b1', 'bay', 'S', -12, 6, []),
    ],
    bonuses: [
      { source: 'role', label: '+25% ore cut from full-size mining lasers', stat: 'damage', amount: 0.25, kind: 'weapon', tag: 'mining' },
      { source: 'role', label: '+25% cargo from full-size pods', stat: 'cargoCapacity', amount: 0.25, kind: 'cargoPod' },
    ],
  },

  'aurel-tacet': {
    // Development and test ship: a living Aurel ship whose voice has never
    // sung to anyone (docs/lore.md, "Names"). Complete, sealed, outside
    // the economy; nobody is issued one. Aurel ships are floating
    // segments: a long keel and two vanes, with gaps between. Flies like
    // the Sparrow it replaced, so tests that lean on it keep their meaning.
    id: 'aurel-tacet',
    name: 'Aurel Tacet',
    race: 'aurel',
    manufacturer: 'aurel',
    role: 'development',
    sizeClass: 'S',
    price: 0,
    mass: 5,
    structure: 260,
    radius: 18,
    outline: outline([[18, 0], [6, -3], [-14, -3], [-10, 0], [-14, 3], [6, 3]]),
    maxSpeed: 350,
    maxTurnRate: 2.4,
    signature: 12,
    class: 'aurel',
    // The voice is the power: vast and near-instant. A dev ship, outside balance.
    capacitor: 1000,
    capacitorRecharge: 100,
    mounts: [
      mount('n1', 'nav', 'M', -2, 0, ['power']),
      mount('r1', 'radar', 'S', 8, -3, ['power']),
      mount('t1', 'computer', 'S', 8, 3, ['power']),
      mount('w1', 'weapon', 'S', 12, 0, ['power']),
      gunMount('w2', 'S', 0, 0, ['power'], FORWARD, FULL_ARC),
      mount('e1', 'engine', 'S', -8, 0, ['power'], AFT),
      mount('c1', 'core', 'S', -4, -4, ['power']),
      mount('c2', 'core', 'S', -4, 4, ['power']),
      mount('i1', 'internal', 'S', 4, 0, ['power']),
      mount('b1', 'bay', 'S', -6, 8, []),
      mount('f1', 'flight', 'S', 6, -2, ['power']),
      mount('x1', 'fireControl', 'S', 6, 2, ['power']),
      mount('p1', 'podBay', 'S', -10, 0, []),
      // A second internal mount for the dev ship's extra reactor: it carries every system.
      mount('i2', 'internal', 'S', -2, 0, ['power']),
    ],
    bonuses: [],
    sealed: true,
  },

  'escape-pod': {
    // Lifeboat. Every ship a pilot flies carries one; when the ship is
    // destroyed the pilot is ejected in it. Sealed: it cannot be bought,
    // sold or refitted. Slow and fragile, enough to limp home on.
    id: 'escape-pod',
    name: 'Meridian Ark',
    race: null,
    manufacturer: 'meridian',
    role: 'civilian',
    sizeClass: 'S',
    price: 0,
    mass: 3,
    structure: 40,
    radius: 9,
    outline: outline([[9, 0], [5, -5], [-6, -5], [-8, -3], [-8, 3], [-6, 5], [5, 5]]),
    maxSpeed: 180,
    maxTurnRate: 2,
    signature: 8,
    class: 'pod',
    // A trickle: enough for the beacon and a little shield.
    capacitor: 15,
    capacitorRecharge: 1,
    mounts: [
      mount('n1', 'nav', 'S', -3, 0, ['power']),
      mount('r1', 'radar', 'S', 2, 0, ['power']),
      mount('e1', 'engine', 'S', -8, 0, ['power'], AFT),
      mount('c1', 'core', 'S', -2, -2, ['power']),
      mount('c2', 'core', 'S', -2, 2, ['power']),
      // A pod is flown by hand, but its little computer still steers to the mouse.
      mount('f1', 'flight', 'S', 4, 0, ['power']),
    ],
    bonuses: [],
    sealed: true,
    escapePod: true,
  },
};
