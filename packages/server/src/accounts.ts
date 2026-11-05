import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { cleanName, type LoginRefusal } from '@spacegame/sim';

/**
 * Characters on this server (docs/shared-world.md, "Characters"): a name,
 * the pilot it plays in the world, and a key that proves you are it.
 *
 * The key is made here, shown to the player once to keep, and never
 * stored: only its hash is, so a copy of this file does not let anyone in.
 */

export interface Character {
  name: string;
  /** The `Pilot` this character plays. */
  pilotId: string;
  /** SHA-256 of the key, hex. */
  keyHash: string;
  /** When it was made, ISO 8601. */
  created: string;
  /** May use the admin switches. The first character made on a new server is the host's, and gets this. */
  admin?: boolean;
}

export interface AccountsData {
  version: 1;
  characters: Character[];
}

/** Letters and digits that cannot be mistaken for each other when copied by hand (no 0/O, 1/I/L). */
const KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** Four groups of four: 20 bits short of 80, plenty for a game among friends. */
const KEY_GROUPS = 4;
const KEY_GROUP_LENGTH = 4;

/** A new key, like `K7QD-M2XA-9PTE-RW4H`. */
export function newKey(): string {
  const bytes = randomBytes(KEY_GROUPS * KEY_GROUP_LENGTH);
  const chars = [...bytes].map((b) => KEY_ALPHABET[b % KEY_ALPHABET.length]!);
  const groups: string[] = [];
  for (let g = 0; g < KEY_GROUPS; g++) groups.push(chars.slice(g * KEY_GROUP_LENGTH, (g + 1) * KEY_GROUP_LENGTH).join(''));
  return groups.join('-');
}

/** A key as typed: upper case, spaces and dashes ignored, so "k7qd m2xa..." still works. */
function normaliseKey(key: string): string {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hashKey(key: string): string {
  return createHash('sha256').update(normaliseKey(key)).digest('hex');
}

/** Names compare without case: "Jason" and "jason" are the same name. */
function sameName(a: string, b: string): boolean {
  return a.toLocaleLowerCase('en-GB') === b.toLocaleLowerCase('en-GB');
}

export class Accounts {
  private readonly characters: Character[];

  constructor(data: AccountsData | null) {
    this.characters = data ? [...data.characters] : [];
  }

  /** The data to save. */
  toData(): AccountsData {
    return { version: 1, characters: [...this.characters] };
  }

  /** Make a character: its record and the key to give the player. */
  create(name: string): { ok: true; character: Character; key: string } | { ok: false; reason: LoginRefusal } {
    const clean = cleanName(name);
    if (!clean) return { ok: false, reason: 'badName' };
    if (this.characters.some((c) => sameName(c.name, clean))) return { ok: false, reason: 'nameTaken' };
    const key = newKey();
    const first = this.characters.length === 0;
    const character: Character = { name: clean, pilotId: `pilot-${randomUUID()}`, keyHash: hashKey(key), created: new Date().toISOString(), ...(first ? { admin: true } : {}) };
    this.characters.push(character);
    return { ok: true, character, key };
  }

  /** The character with this name and key, or null. */
  login(name: string, key: string): Character | null {
    const found = this.characters.find((c) => sameName(c.name, name.trim()));
    if (!found) return null;
    const given = Buffer.from(hashKey(key), 'hex');
    const kept = Buffer.from(found.keyHash, 'hex');
    return given.length === kept.length && timingSafeEqual(given, kept) ? found : null;
  }

  /** Make a character an operator (admin controls) or a player; false if there is no such character. */
  setOperator(name: string, on: boolean): boolean {
    const found = this.characters.find((c) => sameName(c.name, name.trim()));
    if (!found) return false;
    if (on) found.admin = true;
    else delete found.admin;
    return true;
  }

  /** Everyone, for the console's list. */
  list(): readonly Character[] {
    return this.characters;
  }

  /** Whether a name is free to take. */
  nameFree(name: string): boolean {
    const clean = cleanName(name);
    return clean !== null && !this.characters.some((c) => sameName(c.name, clean));
  }
}
