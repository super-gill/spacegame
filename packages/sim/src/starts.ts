import { EARTH_ORBITAL_EXCHANGE_ID, CERES_ACCORD_ID, ELYSIUM_ID, SLAGLINE_ID, THETIS_ORBITAL_ID } from './sol-layout.js';
import { ECF_YARD_L5_ID, LAVINIA_ALPHA_ID, MRN_YARD_PHOBOS_ID } from './sol-ports.js';
import type { PilotLicence, PowerId, StartId, StartPath } from './types.js';

/**
 * The eight starts (Open Lanes step 3; docs/sol.md, "Where a new pilot
 * starts"): a power and a path set the home station, the first ship, the
 * standing and, on a navy path, the licence. Origin gives no bonuses; all
 * bonuses live on ships. The first ship of a navy start is the pilot's and
 * is never taken back; losing everything later wakes the pilot at home in
 * a Registry Tern, like anyone else.
 */
export interface StartSpec {
  id: StartId;
  power: PowerId;
  path: StartPath;
  /** The power as the picker shows it, and a line under it. */
  powerName: string;
  powerLine: string;
  /** The path as the picker shows it, and a line under it. */
  pathName: string;
  pathLine: string;
  /** Home station: where the pilot arrives, wakes and claims a free starter. */
  home: string;
  /** The home station's name, for the picker (it has no world to look it up in). */
  homeName: string;
  /** The first ship, a loadout id. */
  loadoutId: string;
  standing: Partial<Record<PowerId, number>>;
  licence?: PilotLicence;
  /** The first work nearby, one line, for the picker. */
  work: string;
}

/** Standing a start gives with its own power: a citizen, and more for one in service. */
export const START_STANDING = { private: 10, navy: 25 } as const;

const POWERS: Record<'earth' | 'mars' | 'belt' | 'venus', { name: string; line: string }> = {
  earth: { name: 'Earth', line: 'The Accord capital' },
  mars: { name: 'Mars', line: 'The Republic' },
  belt: { name: 'The Belt', line: 'The cooperatives' },
  venus: { name: 'Venus', line: 'The Assembly' },
};

function start(power: keyof typeof POWERS, path: StartPath, home: string, homeName: string, loadoutId: string, work: string, service?: { name: string; line: string; short: string }): StartSpec {
  return {
    id: `${power}-${path}` as StartId,
    power,
    path,
    powerName: POWERS[power].name,
    powerLine: POWERS[power].line,
    pathName: service?.name ?? 'Private',
    pathLine: service?.line ?? 'Registry pilot',
    home,
    homeName,
    loadoutId,
    standing: { [power]: START_STANDING[path] },
    ...(service ? { licence: { power, service: service.short, rung: 1 } } : {}),
    work,
  };
}

export const STARTS: Record<StartId, StartSpec> = {
  'earth-private': start('earth', 'private', EARTH_ORBITAL_EXCHANGE_ID, 'Earth Orbital Exchange', 'meridian-starter', 'Freight round Earth, Luna and the Lagrange yards; salvage in the Shell; a Dunlin from Tycho for the Near Field.'),
  'earth-navy': start('earth', 'navy', ECF_YARD_L5_ID, 'ECF Yard L5', 'kessari-citation', 'Toll and patrol work on the Inner Lane.', { name: 'Earth Charter Fleet', line: 'Navy, under contract', short: 'ECF' }),
  'mars-private': start('mars', 'private', ELYSIUM_ID, 'Republic Station Elysium', 'meridian-starter', 'Freight round Mars and its moons; the Eureka Trojans for a miner.'),
  'mars-navy': start('mars', 'navy', MRN_YARD_PHOBOS_ID, 'MRN Yard Phobos', 'seraphine-picket', 'Pickets and lane patrols.', { name: 'Martian Republic Navy', line: 'Navy, commissioned', short: 'MRN' }),
  'belt-private': start('belt', 'private', CERES_ACCORD_ID, 'Ceres Accord Station', 'meridian-starter', 'The middle Belt with a Prospector; Belt freight; the Belt Lane.'),
  'belt-navy': start('belt', 'navy', SLAGLINE_ID, 'Slagline', 'union-wildcat-rota', 'Rota shifts on the Belt Lane; cooperative work off shift.', { name: 'UDF rota', line: 'Defence, by rota', short: 'UDF rota' }),
  'venus-private': start('venus', 'private', LAVINIA_ALPHA_ID, 'Lavinia Alpha Dock', 'meridian-starter', "The first dive into Venus's upper air; chemical and medical freight."),
  'venus-navy': start('venus', 'navy', THETIS_ORBITAL_ID, 'Thetis Orbital', 'ishtar-sedna-vsg', 'Rescue: pods, distress beacons, escorts. The guns come second.', { name: 'Venusian Space Guard', line: 'Guard, rescue first', short: 'VSG' }),
};

/** The start a new pilot gets in Sol when none was chosen (an older client): Earth, private, as before starts. */
export const DEFAULT_START: StartId = 'earth-private';

/** A start id from outside (a client's message), or null. */
export function readStartId(value: unknown): StartId | null {
  return typeof value === 'string' && value in STARTS ? (value as StartId) : null;
}
