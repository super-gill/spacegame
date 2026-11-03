import type { HullSpec } from './types.js';

/**
 * Hull catalogue. Data only. Add hulls here; nothing else needs to change.
 *
 * Accelerations are force / mass, so a heavier hull with the same engines
 * is slower to speed up, stop and turn.
 */
export const HULLS: Record<string, HullSpec> = {
  sparrow: {
    id: 'sparrow',
    name: 'Sparrow',
    mass: 10,
    mainThrust: 1000, // 100 u/s^2
    reverseThrust: 500, // 50 u/s^2
    lateralThrust: 600, // 60 u/s^2
    maxSpeed: 350,
    rotationThrust: 60, // 6 rad/s^2: full spin in about 0.4 s
    maxTurnRate: 2.4, // about 140 degrees per second
    radius: 18,
    shield: 60,
    shieldRegen: 8,
    shieldRegenDelay: 3,
    structure: 100,
    defaultWeapons: ['pulse-cannon', 'light-turret'],
  },
  mule: {
    // Slow bulk hauler: heavy, modest engines, ponderous to turn.
    id: 'mule',
    name: 'Mule',
    mass: 30,
    mainThrust: 1800, // 60 u/s^2
    reverseThrust: 900, // 30 u/s^2
    lateralThrust: 900, // 30 u/s^2
    maxSpeed: 220,
    rotationThrust: 90, // 3 rad/s^2
    maxTurnRate: 1.2, // about 70 degrees per second
    radius: 26,
    shield: 80,
    shieldRegen: 6,
    shieldRegenDelay: 4,
    structure: 300,
    defaultWeapons: ['light-turret'],
  },
  jackal: {
    // Raider: quicker off the mark and nimbler than a Sparrow, but a
    // lower top speed, so a pilot who sees it coming can run.
    id: 'jackal',
    name: 'Jackal',
    mass: 12,
    mainThrust: 1500, // 125 u/s^2
    reverseThrust: 720, // 60 u/s^2
    lateralThrust: 840, // 70 u/s^2
    maxSpeed: 320,
    rotationThrust: 84, // 7 rad/s^2
    maxTurnRate: 2.8, // about 160 degrees per second
    radius: 16,
    shield: 50,
    shieldRegen: 6,
    shieldRegenDelay: 3,
    structure: 90,
    defaultWeapons: ['pulse-cannon'],
  },
};
