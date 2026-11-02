import type { Camera } from '../camera.js';

/**
 * Infinite parallax starfield.
 *
 * Stars are generated per world-space tile from a hash of the tile
 * coordinates, so the field is deterministic and endless without storing
 * anything. Each layer scrolls at a fraction of camera speed for depth.
 */

interface Layer {
  parallax: number; // 0 = fixed to screen, 1 = fixed to world
  density: number; // stars per tile
  size: number;
  alpha: number;
}

const TILE = 512;

const LAYERS: Layer[] = [
  { parallax: 0.2, density: 14, size: 1, alpha: 0.35 },
  { parallax: 0.45, density: 9, size: 1.3, alpha: 0.6 },
  { parallax: 0.8, density: 4, size: 1.8, alpha: 0.9 },
];

/** Small integer hash -> [0, 1). Good enough for star placement. */
function hash(x: number, y: number, k: number): number {
  let h = (x * 374761393 + y * 668265263 + k * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function drawStarfield(ctx: CanvasRenderingContext2D, camera: Camera): void {
  const w = camera.viewportWidth;
  const h = camera.viewportHeight;

  for (const layer of LAYERS) {
    // Camera position as seen by this layer.
    const cx = camera.position.x * layer.parallax;
    const cy = camera.position.y * layer.parallax;

    const left = cx - w / 2;
    const top = cy - h / 2;
    const tx0 = Math.floor(left / TILE);
    const ty0 = Math.floor(top / TILE);
    const tx1 = Math.floor((left + w) / TILE);
    const ty1 = Math.floor((top + h) / TILE);

    ctx.fillStyle = `rgba(223, 251, 243, ${layer.alpha})`;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        for (let i = 0; i < layer.density; i++) {
          const sx = (tx + hash(tx, ty, i * 2)) * TILE - left;
          const sy = (ty + hash(tx, ty, i * 2 + 1)) * TILE - top;
          ctx.fillRect(sx, sy, layer.size, layer.size);
        }
      }
    }
  }
}
