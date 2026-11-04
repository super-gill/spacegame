import type { Loadout } from './types.js';

/**
 * Named fits. Data only. New pilots are issued the starter; NPC spawners
 * name the loadout they fly. Keys are mount ids from the hull.
 */
export const LOADOUTS: Record<string, Loadout> = {
  'meridian-starter': {
    // Armoured so a new pilot outlasts the raider the way the old Sparrow
    // outlasted the Jackal: 180 HP and 70 dps against 160 HP and 50 dps.
    id: 'meridian-starter',
    name: 'Meridian Courier, starter fit',
    hullId: 'meridian-courier',
    fit: {
      w1: 'paragon-pulse-s',
      w2: 'paragon-turret-s',
      e1: 'meridian-engine-s',
      c1: 'meridian-thrusters-s',
      c2: 'meridian-reactor-s',
      i1: 'meridian-shield-s',
      u1: 'rookrivet-armour-s',
      b1: 'meridian-pod-s',
    },
  },
  'tessaract-trader': {
    // Four of six bays: a working trader that still handles.
    id: 'tessaract-trader',
    name: 'Tessaract Spine, trader fit',
    hullId: 'tessaract-spine',
    fit: {
      b1: 'tessaract-container-m',
      b2: 'tessaract-container-m',
      b3: 'tessaract-container-m',
      b4: 'tessaract-container-m',
      e1: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'itomarr-reactor-m',
      i1: 'itomarr-shield-m',
      w1: 'paragon-turret-s',
    },
  },
  'kessari-raider': {
    // A stripped frigate on cheap parts: one light gun in a medium mount,
    // a small shield, a pod for loot. Quick, not tough.
    id: 'kessari-raider',
    name: 'Kessari Wedge, raider fit',
    hullId: 'kessari-wedge',
    fit: {
      w1: 'paragon-pulse-s',
      e1: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'meridian-reactor-s',
      i1: 'meridian-shield-s',
      b1: 'meridian-pod-s',
    },
  },
  'sparrow-dev': {
    id: 'sparrow-dev',
    name: 'Sparrow, development fit',
    hullId: 'sparrow',
    fit: {
      w1: 'paragon-pulse-s',
      w2: 'paragon-turret-s',
      e1: 'slagline-engine-s',
      c1: 'meridian-thrusters-s',
      c2: 'meridian-reactor-s',
      i1: 'meridian-shield-s',
      b1: 'meridian-pod-s',
    },
  },
  'escape-pod': {
    // The fixed fit every pod has: a small engine and thrusters, power for
    // them, nothing else. No guns, no cargo, no shield.
    id: 'escape-pod',
    name: 'Escape pod',
    hullId: 'escape-pod',
    fit: {
      e1: 'meridian-engine-s',
      c1: 'meridian-thrusters-s',
      c2: 'meridian-reactor-s',
    },
  },
};
