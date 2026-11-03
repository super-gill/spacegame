import type { Loadout } from './types.js';

/**
 * Named fits. Data only. New pilots are issued the starter; NPC spawners
 * name the loadout they fly. Keys are mount ids from the hull.
 */
export const LOADOUTS: Record<string, Loadout> = {
  'meridian-starter': {
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
};
