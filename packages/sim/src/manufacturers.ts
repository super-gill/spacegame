import type { ManufacturerSpec } from './types.js';

/**
 * Manufacturer catalogue. Data only. The full roster is in docs/races.md;
 * only makers with something in the hull or module catalogues are listed.
 */
export const MANUFACTURERS: Record<string, ManufacturerSpec> = {
  meridian: { id: 'meridian', name: 'Meridian Civil Yards', race: null },
  paragon: { id: 'paragon', name: 'Paragon Arms', race: null },
  kessariOrbital: { id: 'kessariOrbital', name: 'Kessari Orbital Defence', race: 'kessari' },
  itoMarr: { id: 'itoMarr', name: 'Ito-Marr Dynamics', race: 'kessari' },
  tessaract: { id: 'tessaract', name: 'Tessaract Logistics', race: 'kessari' },
  novum: { id: 'novum', name: 'Novum Systems', race: 'kessari' },
  slagline: { id: 'slagline', name: 'Slagline Motors', race: 'freeBelt' },
  rookRivet: { id: 'rookRivet', name: 'Rook and Rivet', race: 'freeBelt' },
  unionDefence: { id: 'unionDefence', name: 'Union Defence Works', race: 'freeBelt' },
  cantorVell: { id: 'cantorVell', name: 'Cantor-Vell Arms', race: 'halcyon' },
  commonwealth: { id: 'commonwealth', name: 'Commonwealth Fleet Works', race: 'vael' },
  // The Aurel have no manufacturers: the Chorus shapes every ship. Every hull needs a maker, so this is simply "Aurel".
  aurel: { id: 'aurel', name: 'Aurel', race: 'aurel' },
};
