import type { FitSpec } from './fitlab.js';
import { LOADOUTS } from './loadouts.js';

/**
 * Reference fits (docs/fitting.md, "The fitter"): the stock ships plus a
 * few archetypes, shared by the fitter page, the audit and the tests. Add
 * a fit here when a build is worth keeping an eye on; a fit Jason exports
 * from the fitter pastes straight in.
 */

const stock = (loadoutId: string, role: string, note: string): FitSpec => {
  const l = LOADOUTS[loadoutId]!;
  return { name: l.name, hullId: l.hullId, fit: { ...l.fit }, role, note };
};

/** Core systems a Warrant archetype needs, so the archetypes differ only where they mean to. */
const WARRANT_CORE = {
  n1: 'meridian-nav-s',
  r1: 'meridian-radar-s',
  t1: 'paragon-computer-m',
  f1: 'meridian-helm-s',
  x1: 'paragon-director-m',
  p1: 'meridian-podbay-s',
  e1: 'slagline-engine-m',
  c1: 'slagline-thrusters-m',
  c2: 'itomarr-reactor-m',
};

export const REFERENCE_FITS: FitSpec[] = [
  stock('meridian-starter', 'combat', 'What a new pilot flies.'),
  stock('kessari-raider', 'combat', 'The pirate.'),
  stock('calder-watch', 'combat', 'The police.'),
  stock('tessaract-trader', 'hauling', 'The NPC trader.'),
  stock('rookrivet-prospector', 'mining', 'The cheap miner.'),
  stock('rookrivet-breacher', 'mining', 'The breaching miner.'),
  stock('rookrivet-hulk', 'mining', 'The strip miner.'),
  stock('kessari-brig', 'combat', 'The Kessari brig as the yard sells it.'),
  stock('union-frigate', 'combat', 'The Free Belt militia frigate as sold.'),
  {
    name: 'Warrant brawler',
    hullId: 'kessari-wedge',
    role: 'combat',
    note: 'Close range: autocannon and blaster, shield and armour.',
    fit: { ...WARRANT_CORE, w1: 'union-autocannon-m', w2: 'commonwealth-retort-m', w3: 'paragon-turret-s', u1: 'itomarr-shield-m', u2: 'paragon-fairwarning-s', i1: 'cantorvell-armour-m', i3: 'meridian-reactor-s' },
  },
  {
    name: 'Warrant kiter',
    hullId: 'kessari-wedge',
    role: 'combat',
    note: 'Long range and an afterburner: railgun and artillery.',
    fit: { ...WARRANT_CORE, w1: 'commonwealth-answer-m', w2: 'union-lockout-m', u1: 'itomarr-surge-m', u2: 'meridian-shield-s', i1: 'itomarr-reactor-m', i3: 'meridian-reactor-s' },
  },
  {
    name: 'Warrant glass cannon',
    hullId: 'kessari-wedge',
    role: 'combat',
    note: 'Every gun it can power and nothing else.',
    fit: { ...WARRANT_CORE, w1: 'cantorvell-verse-m', w2: 'cantorvell-verse-m', w3: 'cantorvell-verse-s', i1: 'itomarr-reactor-m', i2: 'itomarr-reactor-m', i3: 'meridian-reactor-s' },
  },
  {
    name: 'Manifest brick',
    hullId: 'tessaract-spine',
    role: 'hauling',
    note: 'Armour everywhere it fits, four cargo bays given up for plate: survive two raiders long enough to reach security (about 90 s; Jason, 6 November).',
    fit: {
      ...LOADOUTS['tessaract-trader']!.fit,
      i1: 'itomarr-shield-m',
      i2: 'rookrivet-armour-s',
      i3: 'rookrivet-armour-s',
      i4: 'rookrivet-armour-s',
      b1: 'cantorvell-armour-m',
      b2: 'cantorvell-armour-m',
      b3: 'cantorvell-armour-m',
      b4: 'cantorvell-armour-m',
    },
  },
  {
    name: 'Brig brawler',
    hullId: 'kessari-brig',
    role: 'combat',
    note: 'Every high slot a gun for close range, plate below: how hard a brig can hit its own size.',
    fit: { ...LOADOUTS['kessari-brig']!.fit, w1: 'union-autocannon-m', w2: 'commonwealth-retort-m', w3: 'paragon-turret-s', w4: 'paragon-turret-s', w5: 'paragon-turret-s', u2: 'paragon-fairwarning-s', u3: 'slagline-kick-s', i4: 'itomarr-reactor-m' },
  },
  {
    name: 'Frigate anti-small',
    hullId: 'union-frigate',
    role: 'combat',
    note: 'Undersized guns in the big slots and every swivel manned: built to swat cutters and sloops.',
    fit: { ...LOADOUTS['union-frigate']!.fit, w1: 'union-autocannon-m', w2: 'union-autocannon-m', w6: 'paragon-turret-s', x1: 'paragon-director-l' },
  },
  {
    name: 'Frigate turrets',
    hullId: 'union-frigate',
    role: 'combat',
    note: 'The militia fit with its two big guns on turrets: they bear without turning the hull, but slew slowly and hit a quarter softer.',
    fit: { ...LOADOUTS['union-frigate']!.fit, w1: 'union-picket-l-turret', w2: 'union-picket-l-turret' },
  },
  {
    name: 'Frigate crowd clearer',
    hullId: 'union-frigate',
    role: 'combat',
    note: 'Every high a swivel (Jason: a heavy ship fitted only to clear small ships will be a doctrine).',
    fit: { ...LOADOUTS['union-frigate']!.fit, w1: 'paragon-turret-s', w2: 'paragon-turret-s', w3: 'paragon-turret-s', w4: 'paragon-turret-s', w5: 'paragon-turret-s', w6: 'paragon-turret-s' },
  },
];
