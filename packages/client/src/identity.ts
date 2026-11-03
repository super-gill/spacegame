/**
 * Local pilot identity.
 *
 * Each person is a pilot with a stable id, kept in this browser between
 * sessions. When a shared-world server exists, this id is what the
 * server keys the person's progress on, so it must not change from one
 * session to the next. There are no accounts or passwords: like a
 * Minecraft LAN world, it is built for friends who trust each other.
 *
 * If browser storage is unavailable (private window, blocked site data)
 * a fresh id is used for this session only.
 */

export interface LocalPilot {
  id: string;
  name: string;
}

const STORAGE_KEY = 'spacegame.pilot';
const DEFAULT_NAME = 'Pilot';

function newId(): string {
  return `pilot-${crypto.randomUUID()}`;
}

function isLocalPilot(value: unknown): value is LocalPilot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['id'] === 'string' && typeof v['name'] === 'string';
}

/** Load this browser's pilot, creating and storing one on first run. */
export function loadLocalPilot(): LocalPilot {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (isLocalPilot(stored)) return stored;
  } catch {
    // Unreadable or blocked storage: fall through to a fresh pilot.
  }

  const pilot: LocalPilot = { id: newId(), name: DEFAULT_NAME };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pilot));
  } catch {
    // Storage blocked: this pilot lasts for this session only.
  }
  return pilot;
}

/** Store a changed pilot (e.g. a new display name). The id must not change. Returns false if storage is blocked. */
export function saveLocalPilot(pilot: LocalPilot): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pilot));
    return true;
  } catch {
    return false;
  }
}
