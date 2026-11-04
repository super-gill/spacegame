import type { HullSpec, World } from '@spacegame/sim';
import { RACE_COLOUR, drawShipArt } from './ship-art.js';

/**
 * A small fixed-size drawing of a ship from its hull and fit, nose to the
 * right, for lists in the docked panel. The canvas is always the same
 * size whatever the hull, so a row never changes height.
 */

const INK = '#9fd3c7';

/** Make a canvas of `width` by `height` CSS pixels and draw the ship in it. */
export function shipThumb(world: World, hull: HullSpec, fit: Readonly<Record<string, string>>, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'ship-thumb';
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Fit the hull outline and mounts, with the same margin for every hull.
  const points = [...hull.outline, ...hull.mounts.map((m) => m.position)];
  const extentX = Math.max(...points.map((p) => Math.abs(p.x)), 1);
  const extentY = Math.max(...points.map((p) => Math.abs(p.y)), 1);
  const scale = Math.min((width * 0.42) / extentX, (height * 0.42) / extentY);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);
  drawShipArt(ctx, scale, {
    hull,
    fit,
    modules: world.modules,
    manufacturers: world.manufacturers,
    colour: hull.race ? RACE_COLOUR[hull.race] : INK,
    heading: 0,
  });
  return canvas;
}
