/**
 * The characters this browser remembers (docs/shared-world.md,
 * "Characters"): name and key, so the player is not asked every time.
 * The player is also shown the key to keep, because browser storage can
 * be cleared; this is a convenience, never the only copy.
 *
 * Kept per server address, since a key belongs to one server.
 */

export interface RememberedCharacter {
  name: string;
  key: string;
}

const STORAGE_KEY = 'spacegame.characters';

type Store = Record<string, RememberedCharacter[]>;

function read(): Store {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage blocked: the player has their key to type in.
  }
}

/** Characters remembered for this server, most recently used first. */
export function rememberedCharacters(server: string): RememberedCharacter[] {
  const list = read()[server];
  return Array.isArray(list) ? list.filter((c) => typeof c?.name === 'string' && typeof c?.key === 'string') : [];
}

/** Remember a character for this server, moving it to the front. */
export function rememberCharacter(server: string, character: RememberedCharacter): void {
  const store = read();
  const rest = rememberedCharacters(server).filter((c) => c.name.toLowerCase() !== character.name.toLowerCase());
  store[server] = [character, ...rest];
  write(store);
}

/** Forget a character on this browser (the server keeps it; the key still works). */
export function forgetCharacter(server: string, name: string): void {
  const store = read();
  store[server] = rememberedCharacters(server).filter((c) => c.name.toLowerCase() !== name.toLowerCase());
  write(store);
}

/** The key this browser holds for a character, if any. */
export function keyFor(server: string, name: string): string | null {
  return rememberedCharacters(server).find((c) => c.name.toLowerCase() === name.toLowerCase())?.key ?? null;
}
