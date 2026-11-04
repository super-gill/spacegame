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
    name: 'Meridian Tern, Registry issue',
    hullId: 'meridian-courier',
    fit: {
      n1: 'meridian-nav-s',
      r1: 'meridian-radar-s',
      t1: 'meridian-computer-s',
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
    name: 'Tessaract Manifest, Calder supply run',
    hullId: 'tessaract-spine',
    fit: {
      n1: 'meridian-nav-s',
      r1: 'tessaract-radar-m',
      t1: 'meridian-computer-s',
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
    name: 'Kessari Warrant, Black Strike trophy',
    hullId: 'kessari-wedge',
    fit: {
      n1: 'meridian-nav-s',
      r1: 'meridian-radar-s',
      t1: 'meridian-computer-s',
      w1: 'paragon-pulse-s',
      e1: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'meridian-reactor-s',
      i1: 'meridian-shield-s',
      u1: 'rookrivet-armour-s',
      b1: 'meridian-pod-s',
    },
  },
  'calder-watch': {
    // The Calder Watch: a Port Authority Warrant fitted to police, not to
    // raid. One heavy fixed gun, a full-size Marksman so it locks fast and
    // reads what it locks, a medium shield and armour. No cargo.
    id: 'calder-watch',
    name: 'Kessari Warrant, Calder Watch',
    hullId: 'kessari-wedge',
    fit: {
      r1: 'meridian-radar-s',
      t1: 'paragon-computer-m',
      n1: 'meridian-nav-s',
      w1: 'union-autocannon-m',
      e1: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'itomarr-reactor-m',
      i1: 'itomarr-shield-m',
      u1: 'cantorvell-armour-m',
    },
  },
  'aurel-tacet-dev': {
    id: 'aurel-tacet-dev',
    name: 'Aurel Tacet, test voice',
    hullId: 'aurel-tacet',
    fit: {
      n1: 'meridian-nav-s',
      r1: 'meridian-radar-s',
      t1: 'meridian-computer-s',
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
    name: 'Meridian Ark',
    hullId: 'escape-pod',
    fit: {
      n1: 'meridian-nav-s',
      r1: 'meridian-beacon-s',
      e1: 'meridian-engine-s',
      c1: 'meridian-thrusters-s',
      c2: 'meridian-reactor-s',
    },
  },
};
