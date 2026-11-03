/**
 * Client settings: how this browser shows the game. Not part of the
 * world, so they are not in saves and are not shared with other pilots.
 * The pilot's name is stored with the pilot identity (identity.ts).
 */

export interface Settings {
  /** Show TRADER / PIRATE / pilot-name labels under ships. */
  showLabels: boolean;
}

const KEY = 'spacegame.settings';
const DEFAULTS: Settings = { showLabels: true };

export function loadSettings(): Settings {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (typeof stored === 'object' && stored !== null) {
      const s = stored as Partial<Settings>;
      return { showLabels: typeof s.showLabels === 'boolean' ? s.showLabels : DEFAULTS.showLabels };
    }
  } catch {
    // Fall back to defaults.
  }
  return { ...DEFAULTS };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Settings last for this session only.
  }
}
