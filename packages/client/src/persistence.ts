import { deserializeWorld, serializeWorld, type LoadRefusal, type World } from '@spacegame/sim';

/**
 * Where saves live on this machine.
 *
 * - Browser storage holds one world, written by autosave and Save now.
 * - Export downloads the same text as a .json file; Import reads one back.
 *   A file exported here is exactly what a shared-world host would load.
 *
 * Browser storage can be blocked or full (private windows, cleared site
 * data), so every call here reports failure instead of throwing, and the
 * game carries on unsaved.
 */

const WORLD_KEY = 'spacegame.world';
/** Where an unreadable save is moved, so starting fresh never destroys it. */
const UNREADABLE_KEY = 'spacegame.world.unreadable';

export type StoredLoad =
  | { kind: 'none' }
  | { kind: 'loaded'; world: World; savedAt: string }
  | { kind: 'unreadable'; reason: LoadRefusal | 'storage' };

/** Read the world in browser storage, if there is one. */
export function loadStoredWorld(): StoredLoad {
  let text: string | null;
  try {
    text = localStorage.getItem(WORLD_KEY);
  } catch {
    return { kind: 'unreadable', reason: 'storage' };
  }
  if (text === null) return { kind: 'none' };
  const r = deserializeWorld(text);
  if (r.ok) return { kind: 'loaded', world: r.world, savedAt: r.savedAt };
  // Keep the bad save aside rather than overwriting it at the next autosave.
  try {
    localStorage.setItem(UNREADABLE_KEY, text);
    localStorage.removeItem(WORLD_KEY);
  } catch {
    // Nothing more we can do.
  }
  return { kind: 'unreadable', reason: r.reason };
}

/** Write the world to browser storage. Returns false if it could not be saved. */
export function storeWorld(world: World, now: Date): boolean {
  try {
    localStorage.setItem(WORLD_KEY, serializeWorld(world, now.toISOString()));
    return true;
  } catch {
    return false;
  }
}

/** Forget the stored world (for New game). */
export function clearStoredWorld(): void {
  try {
    localStorage.removeItem(WORLD_KEY);
  } catch {
    // Already effectively gone.
  }
}

/** Offer the world as a downloaded .json file. */
export function exportWorld(world: World, now: Date): void {
  const text = serializeWorld(world, now.toISOString());
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const stamp = now.toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `spacegame-world-${stamp}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Read a chosen file and turn it into a world. */
export async function importWorld(file: File): Promise<{ ok: true; world: World } | { ok: false; reason: LoadRefusal }> {
  const r = deserializeWorld(await file.text());
  return r.ok ? { ok: true, world: r.world } : { ok: false, reason: r.reason };
}

/** Plain-English reasons for the player. */
export const LOAD_REFUSALS: Record<LoadRefusal | 'storage', string> = {
  notJson: 'That file is not a save.',
  notASave: 'That file is not a spacegame world.',
  tooNew: 'That save is from a newer version of the game.',
  tooOld: 'That save is from an older version that cannot be loaded any more.',
  damaged: 'That save is damaged.',
  storage: 'Browser storage is not available.',
};
