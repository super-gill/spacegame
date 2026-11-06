/**
 * Back to the mode screen after leaving a world (docs/worlds.md,
 * "Screens"). Leaving reloads the page, the one clean way to drop a
 * whole world's worth of state; this note, kept for the tab only, tells
 * the reloaded page who was playing, so it logs them straight back in
 * and opens the mode screen instead of character select.
 */

const RESUME_KEY = 'spacegame.resume';

/** Remember who is playing, then reload to the mode screen. */
export function reloadToModes(name: string): void {
  try {
    sessionStorage.setItem(RESUME_KEY, name);
  } catch {
    // Storage blocked: the reload lands on character select instead.
  }
  location.reload();
}

/** Who to log back in after a reload to the mode screen, once only; null for a normal start. */
export function takeResume(): string | null {
  try {
    const name = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    return name;
  } catch {
    return null;
  }
}
