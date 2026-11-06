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
      w2: 'union-picket-s', // rounds, not capacitor: two lasers would run the Tern's small pool dry
      e1: 'meridian-engine-s',
      c1: 'meridian-thrusters-s',
      c2: 'meridian-reactor-s',
      u1: 'meridian-shield-s',
      i2: 'rookrivet-armour-s',
      w3: 'meridian-gleaner-s',
      u2: 'slagline-kick-s',
      b1: 'meridian-pod-s',
    },
  },
  'tessaract-trader': {
    // Four of six bays: a working trader that still handles. A CIWS on
    // each beam and a chaff screen aft; the forward slot left free.
    id: 'tessaract-trader',
    name: 'Tessaract Manifest, Calder supply run',
    hullId: 'tessaract-spine',
    fit: {
      // Close-in weapon systems on every CIWS hardpoint (docs/turrets.md).
      d1: 'paragon-ciws-m',
      d2: 'paragon-ciws-m',
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
      u1: 'itomarr-screen-m',
      f1: 'meridian-helm-s',
      x1: 'paragon-director-m', // runs three CIWS, so both of the Manifest's
      b5: 'meridian-reactor-s', // a small second reactor in the fifth bay: the two CIWS draw more than the main one spares
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
      u1: 'meridian-shield-s',
      i2: 'rookrivet-armour-s',
      b1: 'meridian-pod-s',
      f1: 'meridian-helm-s',
      p1: 'meridian-podbay-s',
    },
  },
  'kessari-brig': {
    // Sold at Harbour: a Kessari Orbital Defence brig in its yard fit. A
    // launcher and an autocannon forward, an autocannon on each flank and
    // one aft, a CIWS on each beam, a medium shield, an afterburner and
    // chaff, plate, and a second and third reactor below. Fights its own
    // size and still swats small things: beats one Warrant, loses to two
    // (docs/turrets.md, "As built: step 4").
    id: 'kessari-brig',
    name: 'Kessari Injunction, yard issue',
    hullId: 'kessari-brig',
    fit: {
      // Close-in weapon systems on every CIWS hardpoint (docs/turrets.md).
      d1: 'paragon-ciws-m',
      d2: 'paragon-ciws-m',
      n1: 'meridian-nav-s',
      r1: 'tessaract-radar-m',
      t1: 'paragon-computer-m',
      f1: 'itomarr-coxswain-m',
      x1: 'paragon-director-m',
      p1: 'meridian-podbay-s',
      w1: 'itomarr-magazine-m',
      w2: 'union-autocannon-m',
      w3: 'union-autocannon-m',
      w4: 'union-autocannon-m',
      w5: 'union-autocannon-m',
      e1: 'slagline-engine-m',
      e2: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'itomarr-reactor-m',
      u1: 'itomarr-shield-m',
      u2: 'itomarr-surge-m',
      u3: 'paragon-fairwarning-s',
      i1: 'itomarr-reactor-m',
      i2: 'rookrivet-armour-s',
      i3: 'rookrivet-armour-s',
      i4: 'tessaract-container-m',
      i5: 'meridian-reactor-s', // a small third reactor for the flank and aft guns
      b1: 'meridian-pod-s',
    },
  },
  'union-frigate': {
    // Sold at Harbour: a Free Belt militia frigate. Two heavy autocannons
    // forward, an autocannon on each flank and one aft, a CIWS on every
    // quarter, a big shield, a lot of plate, a second medium reactor where
    // a cargo bay was, and a tractor for what is left of the other side.
    // Beats four Warrants, loses to six (docs/turrets.md, "As built: step 4").
    id: 'union-frigate',
    name: 'Union Defence Works Walkout, militia issue',
    hullId: 'union-frigate',
    fit: {
      // Close-in weapon systems on every CIWS hardpoint (docs/turrets.md).
      d1: 'paragon-ciws-m',
      d2: 'paragon-ciws-m',
      d3: 'paragon-ciws-m',
      d4: 'paragon-ciws-m',
      n1: 'meridian-nav-s',
      r1: 'tessaract-radar-m',
      t1: 'paragon-computer-m',
      f1: 'itomarr-coxswain-m',
      x1: 'paragon-director-l',
      p1: 'meridian-podbay-s',
      w1: 'union-picket-l',
      w2: 'union-picket-l',
      w3: 'union-autocannon-m',
      w4: 'union-autocannon-m',
      w5: 'union-autocannon-m',
      w6: 'tessaract-gleaner-m',
      e1: 'slagline-engine-l',
      e2: 'slagline-engine-l',
      c1: 'slagline-thrusters-l',
      c2: 'rookrivet-reactor-l',
      u1: 'itomarr-shield-l',
      u2: 'itomarr-surge-m',
      u3: 'itomarr-screen-m',
      u4: 'paragon-fairwarning-s',
      i1: 'union-armour-l',
      i2: 'union-armour-l',
      i3: 'itomarr-reactor-m',
      i4: 'rookrivet-armour-s',
      i5: 'rookrivet-armour-s',
      i6: 'itomarr-reactor-m', // was a cargo bay: the flank and aft guns need the power
      b1: 'meridian-pod-s',
    },
  },
  'rookrivet-prospector': {
    // Sold at Ridge and Harbour: everything a new miner needs to find and
    // cut the easy rocks; the second high slot is free (a gun there would
    // join fire group 1, ahead of the laser in group 3).
    id: 'rookrivet-prospector',
    name: 'Belt Forge Prospector, Collective issue',
    hullId: 'rookrivet-prospector',
    drones: { loadoutId: 'rookrivet-mining-drone', count: 1 },
    fit: {
      n1: 'meridian-nav-s',
      r1: 'meridian-radar-s',
      t1: 'rookrivet-assay-s',
      f1: 'meridian-helm-s',
      x1: 'paragon-director-s',
      p1: 'meridian-podbay-s',
      w1: 'rookrivet-pick-s',
      e1: 'meridian-engine-s',
      c1: 'meridian-thrusters-s',
      c2: 'meridian-reactor-s',
      i1: 'meridian-shield-s',
      // A hopper instead of armour: it spits out one ore you do not want.
      i2: 'rookrivet-hopper-s',
      // One drone, which works a second rock beside you.
      i3: 'rookrivet-dronebay-s',
      w3: 'meridian-gleaner-s',
      u2: 'rookrivet-survey-s',
      b1: 'meridian-pod-s',
    },
  },
  'rookrivet-breacher': {
    // Sold at Ridge Outpost: two medium lasers, three drones, a deep assay
    // and a charge rig. Breach charges are bought separately.
    id: 'rookrivet-breacher',
    name: 'Belt Forge Sinker, Collective issue',
    hullId: 'rookrivet-breacher',
    drones: { loadoutId: 'rookrivet-mining-drone', count: 3 },
    fit: {
      n1: 'meridian-nav-s',
      r1: 'meridian-radar-s',
      t1: 'rookrivet-deepassay-m',
      f1: 'paragon-helmsman-s',
      x1: 'paragon-director-s',
      p1: 'meridian-podbay-s',
      w1: 'rookrivet-pick-m',
      w2: 'rookrivet-pick-m',
      e1: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'itomarr-reactor-m',
      i1: 'itomarr-shield-m',
      i2: 'rookrivet-hopper-m',
      i3: 'rookrivet-dronebay-m',
      i4: 'meridian-reactor-s',
      w4: 'tessaract-gleaner-m',
      w5: 'rookrivet-chargerig-s',
      u3: 'rookrivet-survey-s',
      b1: 'tessaract-container-m',
    },
  },
  'rookrivet-mining-drone': {
    // A drone as it comes out of the box (docs/drones.md).
    id: 'rookrivet-mining-drone',
    name: 'Belt Forge Knocker',
    hullId: 'rookrivet-drone',
    fit: {
      w1: 'rookrivet-drone-laser',
      f1: 'meridian-helm-s',
      e1: 'meridian-engine-s',
      c1: 'meridian-thrusters-s',
      c2: 'meridian-reactor-s',
    },
  },
  'rookrivet-hulk': {
    // Sold at Ridge Outpost: two heavy turrets, an eight-rock assay, the
    // big hopper, a long-reach tractor and a deep survey scanner.
    id: 'rookrivet-hulk',
    name: 'Belt Forge Collier, Collective issue',
    hullId: 'rookrivet-hulk',
    drones: { loadoutId: 'rookrivet-mining-drone', count: 4 },
    fit: {
      // Close-in weapon systems on every CIWS hardpoint (docs/turrets.md).
      d1: 'paragon-ciws-m',
      d2: 'paragon-ciws-m',
      n1: 'itomarr-nav-m',
      r1: 'tessaract-radar-m',
      t1: 'rookrivet-assay-l',
      f1: 'itomarr-coxswain-m',
      x1: 'paragon-director-m',
      p1: 'meridian-podbay-s',
      m1: 'rookrivet-excavator-l',
      m2: 'rookrivet-excavator-l',
      e1: 'slagline-engine-m',
      e2: 'slagline-engine-m',
      c1: 'slagline-thrusters-m',
      c2: 'rookrivet-reactor-l',
      // The big hopper in the big slot: sorts, and trades up when the ore hold is full.
      i1: 'rookrivet-hopper-l',
      // Four drones out of six aboard, in place of armour.
      i2: 'rookrivet-dronebay-m',
      i3: 'itomarr-shield-m',
      // A second reactor: the turrets, assay and sensors draw more than the Furnace gives.
      i4: 'itomarr-reactor-m',
      w2: 'tessaract-gleaner-m',
      u2: 'tessaract-survey-m',
      u3: 'paragon-fairwarning-s',
      // The ore hold is built in; one container for charges, ammunition and trade.
      b1: 'tessaract-container-l',
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
      u1: 'itomarr-shield-m',
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
      w2: 'paragon-pulse-s',
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
