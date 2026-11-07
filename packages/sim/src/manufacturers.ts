import type { ManufacturerSpec } from './types.js';

/**
 * Manufacturer catalogue. Data only. The full roster is in docs/races.md;
 * only makers with something in the hull or module catalogues are listed.
 */
export const MANUFACTURERS: Record<string, ManufacturerSpec> = {
  meridian: { id: 'meridian', name: 'Meridian Yards', power: null },
  paragon: { id: 'paragon', name: 'Paragon Arms', power: null },
  kessariOrbital: { id: 'kessariOrbital', name: 'Kessari Orbital Defence', power: 'earth' },
  itoMarr: { id: 'itoMarr', name: 'Ito-Marr Dynamics', power: 'earth' },
  tessaract: { id: 'tessaract', name: 'Tessaract Logistics', power: 'earth' },
  novum: { id: 'novum', name: 'Novum Systems', power: 'earth' },
  slagline: { id: 'slagline', name: 'Slagline Motors', power: 'belt' },
  rookRivet: { id: 'rookRivet', name: 'Rook and Rivet', power: 'belt' },
  beltForge: { id: 'beltForge', name: 'Belt Forge Collective', power: 'belt' },
  corvane: { id: 'corvane', name: 'Corvane Heavy Industries', power: null },
  unionDefence: { id: 'unionDefence', name: 'Union Defence Works', power: 'belt' },
  cantorVell: { id: 'cantorVell', name: 'Cantor-Vell Arms', power: 'mars' },
  commonwealth: { id: 'commonwealth', name: 'Ishtar Fleet Works', power: 'venus' },
  // The Aurel have no manufacturers: the Chorus shapes every ship. Every hull needs a maker, so this is simply "Aurel".
  aurel: { id: 'aurel', name: 'Aurel', power: 'aurel' },
};
