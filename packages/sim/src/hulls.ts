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

function outline(points: ReadonlyArray<readonly [number, number]>): Vec2[] {
  return points.map(([x, y]) => ({ x, y }));
}

export const HULLS: Record<string, HullSpec> = {
  'meridian-courier': {
    // Civilian starter. Light, forgiving, a little of everything and room
    // for one upgrade (the empty armour mount).
    id: 'meridian-courier',
    name: 'Meridian Courier',
    race: null,
    manufacturer: 'meridian',
    role: 'civilian',
    sizeClass: 'S',
    mass: 5,
    structure: 90,
    radius: 18,
    outline: outline([[18, 0], [10, -8], [-12, -10], [-16, -6], [-16, 6], [-12, 10], [10, 8]]),
    maxSpeed: 340,
    maxTurnRate: 2.4, // about 140 degrees per second
    mounts: [
      mount('w1', 'weapon', 'S', 14, 0, ['power']),
      mount('w2', 'weapon', 'S', 2, 0, ['power', 'fireControl']),
      mount('e1', 'engine', 'S', -16, 0, ['power'], AFT),
      mount('c1', 'core', 'S', -7, -4, ['power']),
      mount('c2', 'core', 'S', -7, 4, ['power']),
      mount('i1', 'internal', 'S', -12, 0, ['power']),
      mount('u1', 'utility', 'S', -3, -11, []),
      mount('b1', 'bay', 'S', -3, 11, []),
    ],
    bonuses: [{ source: 'role', label: '+25% cargo from full-size pods', stat: 'cargoCapacity', amount: 0.25, kind: 'cargoPod' }],
  },

  'kessari-wedge': {
    // Kessari Orbital Defence frigate: two medium gun mounts forward of the
    // wing roots, a light turret on the nose, twin engines.
    id: 'kessari-wedge',
    name: 'Kessari Wedge',
    race: 'kessari',
    manufacturer: 'kessariOrbital',
    role: 'combat',
    sizeClass: 'M',
    mass: 12,
    structure: 110,
    radius: 25,
    outline: outline([[24, 0], [-18.8, -10], [-24, -8.4], [-20.8, 0], [-24, 8.4], [-18.8, 10]]),
    maxSpeed: 320,
    maxTurnRate: 2.2,
    mounts: [
      mount('w1', 'weapon', 'M', -5, -4.4, ['power']),
      mount('w2', 'weapon', 'M', -5, 4.4, ['power']),
      mount('w3', 'weapon', 'S', 8, 0, ['power', 'fireControl']),
      mount('e1', 'engine', 'M', -23, -4, ['power'], AFT),
      mount('e2', 'engine', 'M', -23, 4, ['power'], AFT),
      mount('c1', 'core', 'M', -11, -3, ['power']),
      mount('c2', 'core', 'M', -11, 3, ['power']),
      mount('i1', 'internal', 'M', -16, 0, ['power']),
      mount('u1', 'utility', 'M', 2, -7, []),
      mount('u2', 'utility', 'S', 2, 7, []),
      mount('b1', 'bay', 'S', -14, 13, []),
    ],
    bonuses: [
      { source: 'role', label: '+15% weapon damage from full-size weapons', stat: 'damage', amount: 0.15, kind: 'weapon' },
      { source: 'race', label: '+20% shield from full-size shield tech', stat: 'shield', amount: 0.2, tag: 'shield' },
    ],
  },

  'tessaract-spine': {
    // Tessaract Logistics hauler: a cab, a bare spine with six container
    // bays, twin engines. Best hauler there is full; handles far better
    // half loaded.
    id: 'tessaract-spine',
    name: 'Tessaract Spine',
    race: 'kessari',
    manufacturer: 'tessaract',
    role: 'transport',
    sizeClass: 'L',
    mass: 18,
    structure: 220,
    radius: 30,
    outline: outline([
      [27.8, 0], [22.6, -4], [18.2, -4], [18.2, -1.6], [-21.8, -1.6], [-21.8, -4.4], [-24.6, -4.4],
      [-24.6, 4.4], [-21.8, 4.4], [-21.8, 1.6], [18.2, 1.6], [18.2, 4], [22.6, 4],
    ]),
    maxSpeed: 220,
    maxTurnRate: 1.2, // about 70 degrees per second
    mounts: [
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
      mount('i1', 'internal', 'M', 24.5, 0, ['power']),
      mount('u1', 'utility', 'M', -23.2, 0, []),
      mount('w1', 'weapon', 'S', 15, 0, ['power', 'fireControl']),
    ],
    bonuses: [
      { source: 'role', label: '+25% cargo from full-size containers', stat: 'cargoCapacity', amount: 0.25, kind: 'cargoPod' },
      { source: 'race', label: '+20% shield from full-size shield tech', stat: 'shield', amount: 0.2, tag: 'shield' },
    ],
  },

  sparrow: {
    // Development ship: complete, sealed, outside the economy. Kept for
    // testing; nobody is issued one.
    id: 'sparrow',
    name: 'Sparrow',
    race: null,
    manufacturer: 'meridian',
    role: 'development',
    sizeClass: 'S',
    mass: 5,
    structure: 100,
    radius: 18,
    outline: outline([[18, 0], [-12.6, -11.7], [-7.2, 0], [-12.6, 11.7]]),
    maxSpeed: 350,
    maxTurnRate: 2.4,
    mounts: [
      mount('w1', 'weapon', 'S', 12, 0, ['power']),
      mount('w2', 'weapon', 'S', 0, 0, ['power', 'fireControl']),
      mount('e1', 'engine', 'S', -8, 0, ['power'], AFT),
      mount('c1', 'core', 'S', -4, -4, ['power']),
      mount('c2', 'core', 'S', -4, 4, ['power']),
      mount('i1', 'internal', 'S', 4, 0, ['power']),
      mount('b1', 'bay', 'S', -6, 8, []),
    ],
    bonuses: [],
    sealed: true,
  },
};
