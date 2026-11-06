import { isLocked } from './locks.js';
import { shipStats } from './stats.js';
import type { ContactSize, HullClass, HullSpec, NpcBrain, Ship, World } from './types.js';

/**
 * Colours: every ship's Registry beacon (docs/interface.md, section 3;
 * lore.md, "Colours"). A ship showing its colours tells everyone in
 * sensor range its name and hull. A ship running dark is only a radar
 * contact, a size and a place, until someone locks it and their
 * targeting computer identifies it.
 *
 * The beacon is part of every ship, not a module: a switch, on unless
 * `Ship.dark` is set. Whether running dark is legal belongs to law (7).
 */

/** True if this ship is running dark. A drone runs dark when its mother does: it has no beacon of its own. */
export function runsDark(world: Pick<World, 'ships'>, ship: Ship): boolean {
  const mother = ship.motherId ? world.ships[ship.motherId] : undefined;
  return (mother ?? ship).dark === true;
}

/**
 * Whether an NPC with this brain starts dark (Jason, 6 November 2026):
 * pirates run dark, and so do arena enemies, which fight like pirates;
 * traders, miners and the Watch show their colours.
 */
export function startsDark(brain: NpcBrain | undefined): boolean {
  return brain?.kind === 'pirate' || brain?.kind === 'arena';
}

/**
 * The size a dark ship shows as, from its hull class, in the game's own
 * terms (the approved Plot mockup; "medium hulls and up" carry swivels):
 * cutters, sloops, drones, pods and the Aurel's small craft are small;
 * brigs, merchantmen and hulks medium; frigates and bigger large.
 */
export function contactSize(hull: Pick<HullSpec, 'class'> | undefined): ContactSize {
  return hull ? CONTACT_SIZE_BY_CLASS[hull.class] : 'small';
}

const CONTACT_SIZE_BY_CLASS: Record<HullClass, ContactSize> = {
  pod: 'small',
  drone: 'small',
  cutter: 'small',
  sloop: 'small',
  aurel: 'small',
  brig: 'medium',
  merchantman: 'medium',
  hulk: 'medium',
  frigate: 'large',
  lineShip: 'large',
  capital: 'large',
};

/** Radius to draw and click an unidentified contact at, units: roughly a hull of that size. */
export const CONTACT_RADIUS: Record<ContactSize, number> = { small: 14, medium: 24, large: 40 };

/**
 * True if `viewer` has identified `targetId`: a complete lock and a
 * targeting computer that reads identity. Every targeting computer today
 * does, so in practice a complete lock identifies.
 */
export function identifies(world: World, viewer: Ship, targetId: string): boolean {
  return isLocked(viewer, targetId) && shipStats(world, viewer).readouts.includes('identity');
}
