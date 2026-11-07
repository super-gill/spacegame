import type { HullSpec, ModuleSpec } from '@spacegame/sim';

/**
 * Ship sprites (docs/ship-pipeline.md): pictures built from the art
 * registry by scripts/ships.mjs and served beside the game page. The index
 * (`ships/sprites.json`) is fetched once; each picture the first time it
 * is wanted. Until a picture has loaded, or for a hull with none, callers
 * draw the vector ship as before.
 *
 * A hull is drawn from its sprite only when it is **ready**: every weapon
 * mount the game gives it is marked in the art, so the picture's own guns
 * are the ones the game replaces (docs/ship-standards.md, "Mounts"). A PDC
 * the art does not draw is still drawn, at the game's position.
 */

export type SpriteSize = 'far' | 'card' | 'flight';

export interface SpritePicture {
  file: string;
  pixels: number;
  unitsPerPixel: number;
}

export interface HullSprites {
  radius: number;
  liveries: Record<string, Partial<Record<SpriteSize, SpritePicture>>>;
  mounts: { id: string; type: string; x: number; y: number }[];
}

export interface SpriteIndex {
  hulls: Record<string, HullSprites>;
  turrets: Record<string, SpritePicture & { barrel: number }>;
}

/** Where the built sprites are, relative to the game page. */
const BASE = './ships/';

let index: SpriteIndex | null = null;
let asked = false;
const images = new Map<string, HTMLImageElement | 'loading' | 'failed'>();

/** Fetch the index once. Quietly nothing if the server has no sprites (an old build, or tests). */
function ensureIndex(): void {
  if (asked || typeof fetch === 'undefined') return;
  asked = true;
  fetch(`${BASE}sprites.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data: SpriteIndex | null) => {
      index = data;
    })
    .catch(() => {
      index = null;
    });
}

/** The picture in `file`, or null while it loads (it is asked for now) or if it failed. */
function image(file: string): HTMLImageElement | null {
  const known = images.get(file);
  if (known instanceof HTMLImageElement) return known;
  if (known) return null;
  if (typeof Image === 'undefined') return null;
  images.set(file, 'loading');
  const img = new Image();
  img.onload = () => images.set(file, img);
  img.onerror = () => images.set(file, 'failed');
  img.src = `${BASE}${file}`;
  return null;
}

/**
 * Which picture to use when the hull's frame (twice its radius) covers
 * `devicePixels` on screen: the smallest that is not much smaller than
 * that, so the picture is only ever scaled down or a little up.
 */
export function pickSize(pictures: Partial<Record<SpriteSize, SpritePicture>>, devicePixels: number): SpritePicture | null {
  const all = (['far', 'card', 'flight'] as const).map((s) => pictures[s]).filter((p): p is SpritePicture => p !== undefined).sort((a, b) => a.pixels - b.pixels);
  return all.find((p) => p.pixels >= devicePixels * 0.9) ?? all.at(-1) ?? null;
}

/** The turret picture's name for a weapon: its id, with `-s` added for the few ids with no size. */
export function turretStem(weaponId: string): string {
  return /-(s|m|l|xl)$/.test(weaponId) ? weaponId : `${weaponId}-s`;
}

/** Whether a hull's art marks every weapon mount the game gives it. */
export function hullReady(hull: Pick<HullSpec, 'mounts'>, sprites: Pick<HullSprites, 'mounts'>): boolean {
  const marked = new Set(sprites.mounts.map((m) => m.id));
  return hull.mounts.every((m) => m.type !== 'high' || marked.has(m.id));
}

/** A ready hull's sprites, or null (not ready, not built, or the index has not arrived yet). */
export function spritesFor(hull: HullSpec): HullSprites | null {
  ensureIndex();
  const s = index?.hulls[hull.id];
  return s && hullReady(hull, s) ? s : null;
}

/** The hull picture to draw at `devicePixels` across, or null while it loads. */
export function hullPicture(sprites: HullSprites, devicePixels: number, livery = 'base'): { img: HTMLImageElement; picture: SpritePicture } | null {
  const pictures = sprites.liveries[livery] ?? sprites.liveries['base'];
  const picture = pictures ? pickSize(pictures, devicePixels) : null;
  const img = picture ? image(picture.file) : null;
  return img && picture ? { img, picture } : null;
}

/** The turret picture for a fitted weapon module, or null (no picture, or still loading). */
export function turretPicture(module: Pick<ModuleSpec, 'weaponId'>): { img: HTMLImageElement; picture: SpritePicture } | null {
  if (!module.weaponId || !index) return null;
  const picture = index.turrets[turretStem(module.weaponId)];
  const img = picture ? image(picture.file) : null;
  return img && picture ? { img, picture } : null;
}
