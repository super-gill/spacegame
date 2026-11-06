import { RETICLE_STYLES, type ReticleStyle } from './render/reticle.js';

/**
 * Client settings: how this browser shows the game. Not part of the
 * world, so they are not in saves and are not shared with other pilots.
 * The pilot's name is stored with the pilot identity (identity.ts).
 */

export interface Settings {
  /** Show TRADER / PIRATE / pilot-name labels under ships. */
  showLabels: boolean;
  /**
   * Steer with the mouse: the nose follows the pointer (the flight
   * computer turns to `ShipInput.aimHeading`), and A and D strafe. Off:
   * A and D spin the ship. On by default since 4 November 2026.
   */
  mouseSteering: boolean;
  /** Warning sounds (hud/tones.ts): volume 0 to 1, and off altogether. */
  soundVolume: number;
  soundMuted: boolean;
  /** The aim reticle drawn at the pointer with mouse steering (render/reticle.ts); `plain` is the browser's crosshair. */
  reticle: ReticleStyle;
}

const KEY = 'spacegame.settings';
const DEFAULTS: Settings = { showLabels: true, mouseSteering: true, soundVolume: 0.5, soundMuted: false, reticle: 'ring' };

export function loadSettings(): Settings {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (typeof stored === 'object' && stored !== null) {
      const s = stored as Partial<Settings>;
      return {
        showLabels: typeof s.showLabels === 'boolean' ? s.showLabels : DEFAULTS.showLabels,
        mouseSteering: typeof s.mouseSteering === 'boolean' ? s.mouseSteering : DEFAULTS.mouseSteering,
        soundVolume: typeof s.soundVolume === 'number' && s.soundVolume >= 0 && s.soundVolume <= 1 ? s.soundVolume : DEFAULTS.soundVolume,
        soundMuted: typeof s.soundMuted === 'boolean' ? s.soundMuted : DEFAULTS.soundMuted,
        reticle: RETICLE_STYLES.some((r) => r.id === s.reticle) ? s.reticle! : DEFAULTS.reticle,
      };
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
