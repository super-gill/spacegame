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
      f1: 'meridian-helm-s',
      x1: 'paragon-director-s',
      p1: 'meridian-podbay-s',
      w1: 'paragon-pulse-s',
      w2: 'paragon-turret-s',
      e1: 'meridian-engine-s',
      c1: 'meridian-thrusters-s',
      c2: 'meridian-reactor-s',
      i1: 'meridian-shield-s',
      i2: 'rookrivet-armour-s',
      u1: 'meridian-gleaner-s',
      u2: 'slagline-kick-s',
      b1: 'meridian-pod-s',
    },
  },
  'tessaract-trader': {
    // Four of six bays: a working trader that still handles. A swivel
    // forward and a chaff screen aft.
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
      u1: 'itomarr-screen-m',
      f1: 'meridian-helm-s',
      x1: 'paragon-director-s',
      p1: 'meridian-podbay-s',
    },
  },
  'kessari-raider': {
    // A stripped frigate on cheap parts: one light gun in a medium mount,
    // a small launcher with one box of missiles (it never docks to buy
    // more), a small shield, a pod for loot. Quick, not tough.
    id: 'kessari-raider',
    name: 'Kessari Warrant, Black Strike trophy',
    hullId: 'kessari-wedge',
    fit: {
      n1: 'meridian-nav-s',
      r1: 'meridian-radar-s',
      t1: 'meridian-computer-s',
      w1: 'paragon-pulse-s',
      w2: 'itomarr-magazine-s',
      e1: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'itomarr-reactor-m',
      i1: 'meridian-shield-s',
      i2: 'rookrivet-armour-s',
      b1: 'meridian-pod-s',
      f1: 'meridian-helm-s',
      p1: 'meridian-podbay-s',
    },
  },
  'rookrivet-prospector': {
    // Sold at Ridge and Harbour: everything a new miner needs to find and
    // cut the easy rocks, and a swivel for company.
    id: 'rookrivet-prospector',
    name: 'Rook and Rivet Prospector, Collective issue',
    hullId: 'rookrivet-prospector',
    fit: {
      n1: 'meridian-nav-s',
      r1: 'meridian-radar-s',
      t1: 'rookrivet-assay-s',
      f1: 'meridian-helm-s',
      x1: 'paragon-director-s',
      p1: 'meridian-podbay-s',
      w1: 'rookrivet-pick-s',
      w2: 'paragon-turret-s',
      e1: 'meridian-engine-s',
      c1: 'meridian-thrusters-s',
      c2: 'meridian-reactor-s',
      i1: 'meridian-shield-s',
      // A hopper instead of armour: 40 more units for ore.
      i2: 'rookrivet-hopper-s',
      u1: 'meridian-gleaner-s',
      u2: 'rookrivet-survey-s',
      b1: 'meridian-pod-s',
    },
  },
  'rookrivet-hulk': {
    // Sold at Ridge Outpost: two heavy turrets, an eight-rock assay, four
    // ore holds, a long-reach tractor and a deep survey scanner.
    id: 'rookrivet-hulk',
    name: 'Rook and Rivet Hulk, Collective issue',
    hullId: 'rookrivet-hulk',
    fit: {
      n1: 'itomarr-nav-m',
      r1: 'tessaract-radar-m',
      t1: 'rookrivet-assay-l',
      f1: 'itomarr-coxswain-m',
      x1: 'paragon-director-m',
      p1: 'meridian-podbay-s',
      w1: 'paragon-turret-m',
      m1: 'rookrivet-excavator-l',
      m2: 'rookrivet-excavator-l',
      e1: 'slagline-engine-m',
      e2: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'rookrivet-reactor-l',
      i1: 'itomarr-shield-m',
      i2: 'cantorvell-armour-m',
      i3: 'rookrivet-hopper-m',
      // A second reactor: the turrets, assay and sensors draw more than the Furnace gives.
      i4: 'itomarr-reactor-m',
      u1: 'tessaract-gleaner-m',
      u2: 'tessaract-survey-m',
      u3: 'paragon-fairwarning-s',
      b1: 'rookrivet-orehold-l',
      b2: 'rookrivet-orehold-l',
      b3: 'rookrivet-orehold-l',
      b4: 'rookrivet-orehold-l',
    },
  },
  'calder-watch': {
    // The Calder Watch: a Port Authority Warrant fitted to police, not to
    // raid. One heavy fixed gun and a Magazine for the hull's missile
    // bonus, a full-size Marksman so it locks fast and reads what it
    // locks, a medium shield and armour, chaff. No cargo.
    id: 'calder-watch',
    name: 'Kessari Warrant, Calder Watch',
    hullId: 'kessari-wedge',
    fit: {
      r1: 'meridian-radar-s',
      t1: 'paragon-computer-m',
      n1: 'meridian-nav-s',
      w1: 'union-autocannon-m',
      w2: 'itomarr-magazine-m',
      e1: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'itomarr-reactor-m',
      i1: 'itomarr-shield-m',
      i2: 'cantorvell-armour-m',
      u2: 'paragon-fairwarning-s',
      f1: 'meridian-helm-s',
      p1: 'meridian-podbay-s',
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
      f1: 'paragon-helmsman-s',
      x1: 'paragon-director-s',
      p1: 'meridian-podbay-s',
      i2: 'meridian-reactor-s',
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
      f1: 'meridian-helm-s',
    },
  },
};
