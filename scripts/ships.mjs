#!/usr/bin/env node
/**
 * Stage 2 of the ship pipeline (docs/ship-pipeline.md): the in-game
 * sprites, built from the art's export.
 *
 *   node scripts/ships.mjs          build what changed
 *   node scripts/ships.mjs --all    rebuild everything
 *
 * Reads `art/ships/` (written by art/registry/export.py and committed) and
 * writes PNGs and an index into `packages/client/public/ships/`, which
 * Vite copies into the built client. That folder is build output: never
 * committed, never edited. Node only: SVG is drawn with resvg, no browser
 * and no Python, so the server builds its own sprites on every update.
 *
 * Each hull gets three pictures per livery, centred on its origin with the
 * nose to the right (docs/ship-pipeline.md, "Stage 2"):
 *   flight  3 pixels per world unit, at most MAX_PIXELS a side
 *   far     1 pixel per world unit, at least MIN_FAR_PIXELS a side
 *   card    CARD_PIXELS a side
 * and each turret one picture at 3 pixels per world unit.
 *
 * A picture is only drawn again when its SVG or its size changed (a hash
 * of both is kept beside the output), so an update where no ship changed
 * costs nothing.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(REPO, 'art', 'ships');
const OUT = join(REPO, 'packages', 'client', 'public', 'ships');
const HASHES = join(OUT, 'hashes.json');

/** Pixels per world unit for flying: the camera's closest zoom (1.5) on a screen at twice the pixel density. */
const FLIGHT_SCALE = 3;
const FAR_SCALE = 1;
const MAX_PIXELS = 2048;
const MIN_FAR_PIXELS = 24;
const CARD_PIXELS = 256;
const TURRET_SCALE = 3;

const all = process.argv.includes('--all');

/**
 * Fonts for the hulls' stencils (a few letters of registry text). resvg
 * would otherwise load every font on the machine for every picture, which
 * was most of the build's time; stencils are a few pixels tall at flight
 * size, so they fall back to the renderer's default family.
 */
const FONTS = { loadSystemFonts: false, defaultFontFamily: 'monospace' };

function say(text) {
  console.log(`[ships] ${text}`);
}

/** The pixel sizes a hull of `radius` gets: its frame is a square of plus and minus the radius. */
function hullSizes(radius) {
  const across = 2 * radius;
  return {
    flight: Math.min(MAX_PIXELS, Math.round(across * FLIGHT_SCALE)),
    far: Math.max(MIN_FAR_PIXELS, Math.round(across * FAR_SCALE)),
    card: CARD_PIXELS,
  };
}

function hash(text, pixels) {
  return createHash('sha256').update(`${pixels}\n${text}`).digest('hex').slice(0, 16);
}

function main() {
  const shipsFile = join(ART, 'ships.json');
  if (!existsSync(shipsFile)) {
    say('No art/ships/ships.json: run art/registry/export.py first. Nothing built.');
    return;
  }
  const { hulls } = JSON.parse(readFileSync(shipsFile, 'utf8'));
  const turrets = JSON.parse(readFileSync(join(ART, 'turrets.json'), 'utf8'));
  mkdirSync(OUT, { recursive: true });
  const before = !all && existsSync(HASHES) ? JSON.parse(readFileSync(HASHES, 'utf8')) : {};
  const after = {};
  const index = { note: 'Built by scripts/ships.mjs from art/ships; never edit (docs/ship-pipeline.md).', hulls: {}, turrets: {} };
  const failed = [];
  let drawn = 0;
  let kept = 0;
  const started = Date.now();

  /** Draw `svg` at `pixels` square into `file` (relative to OUT), unless it is unchanged. */
  const picture = (svg, pixels, file) => {
    const key = hash(svg, pixels);
    after[file] = key;
    if (before[file] === key && existsSync(join(OUT, file))) {
      kept++;
      return true;
    }
    try {
      const png = new Resvg(svg, { fitTo: { mode: 'width', value: pixels }, font: FONTS }).render().asPng();
      mkdirSync(dirname(join(OUT, file)), { recursive: true });
      writeFileSync(join(OUT, file), png);
      drawn++;
      return true;
    } catch (error) {
      failed.push(`${file}: ${String(error).slice(0, 120)}`);
      return false;
    }
  };

  for (const id of Object.keys(hulls).sort()) {
    const hull = hulls[id];
    const sizes = hullSizes(hull.radius);
    const liveries = {};
    for (const livery of hull.liveries) {
      const svg = readFileSync(join(ART, 'svg', `${id}-${livery}.svg`), 'utf8');
      const pictures = {};
      for (const [size, pixels] of Object.entries(sizes)) {
        const file = `${id}/${livery}-${size}.png`;
        if (picture(svg, pixels, file)) pictures[size] = { file, pixels, unitsPerPixel: (2 * hull.radius) / pixels };
      }
      liveries[livery] = pictures;
    }
    // The mounts the art marks, so the game draws fitted weapons where the picture has its sockets.
    index.hulls[id] = { radius: hull.radius, liveries, mounts: hull.mounts.map((m) => ({ id: m.id, type: m.type, x: m.x, y: m.y })) };
  }

  for (const stem of Object.keys(turrets).sort()) {
    const t = turrets[stem];
    const svg = readFileSync(join(ART, 'turrets', `${stem}.svg`), 'utf8');
    const pixels = Math.round(2 * t.frame * TURRET_SCALE);
    const file = `turrets/${stem}.png`;
    if (picture(svg, pixels, file)) index.turrets[stem] = { file, pixels, unitsPerPixel: (2 * t.frame) / pixels, barrel: t.barrel };
  }

  // Pictures of hulls or turrets that are no longer in the art go.
  for (const entry of readdirSync(OUT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of readdirSync(join(OUT, entry.name))) {
      const rel = `${entry.name}/${file}`;
      if (!(rel in after)) rmSync(join(OUT, rel));
    }
    if (readdirSync(join(OUT, entry.name)).length === 0) rmSync(join(OUT, entry.name), { recursive: true });
  }

  writeFileSync(join(OUT, 'sprites.json'), JSON.stringify(index) + '\n');
  writeFileSync(HASHES, JSON.stringify(after, null, 1) + '\n');
  say(`${Object.keys(index.hulls).length} hulls, ${Object.keys(index.turrets).length} turrets: ${drawn} pictures drawn, ${kept} unchanged, in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
  if (failed.length > 0) {
    say(`${failed.length} pictures failed to draw:`);
    for (const f of failed) say(`  ${f}`);
    process.exit(1);
  }
}

main();
