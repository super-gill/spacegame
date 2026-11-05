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
  {
    name: 'Warrant brawler',
    hullId: 'kessari-wedge',
    role: 'combat',
    note: 'Close range: autocannon and blaster, shield and armour.',
    fit: { ...WARRANT_CORE, w1: 'union-autocannon-m', w2: 'commonwealth-retort-m', w3: 'paragon-turret-s', i1: 'itomarr-shield-m', i2: 'cantorvell-armour-m', i3: 'meridian-reactor-s', u2: 'paragon-fairwarning-s' },
  },
  {
    name: 'Warrant kiter',
    hullId: 'kessari-wedge',
    role: 'combat',
    note: 'Long range and an afterburner: railgun and artillery.',
    fit: { ...WARRANT_CORE, w1: 'commonwealth-answer-m', w2: 'union-lockout-m', i1: 'itomarr-shield-m', i3: 'meridian-reactor-s', i4: 'meridian-reactor-s', u1: 'itomarr-surge-m' },
  },
  {
    name: 'Warrant glass cannon',
    hullId: 'kessari-wedge',
    role: 'combat',
    note: 'Every gun it can power and nothing else.',
    fit: { ...WARRANT_CORE, w1: 'cantorvell-verse-m', w2: 'cantorvell-verse-m', w3: 'cantorvell-verse-s', i1: 'itomarr-reactor-m', i2: 'itomarr-reactor-m', i3: 'meridian-reactor-s', i4: 'meridian-reactor-s' },
  },
  {
    name: 'Manifest brick',
    hullId: 'tessaract-spine',
    role: 'hauling',
    note: 'Armour everywhere it fits: survive long enough to reach security.',
    fit: { ...LOADOUTS['tessaract-trader']!.fit, i1: 'itomarr-shield-m', i2: 'rookrivet-armour-s', i3: 'rookrivet-armour-s', i4: 'rookrivet-armour-s' },
  },
];
