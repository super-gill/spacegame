/**
 * The aim reticle for mouse steering (docs/interface.md, section 4).
 * Jason asked for something subtle and on theme that does not dominate
 * the pointer, so every style is thin lines in the HUD's ink at low
 * opacity. All four are a player preference in the Controls panel (F1),
 * Ring the default (Jason, 6 November 2026: he liked them all); `plain`
 * keeps the browser's crosshair. Over windows and panels the normal pointer shows: the
 * reticle is drawn only while the pointer is over open space.
 */

export type ReticleStyle = 'plain' | 'ring' | 'brackets' | 'dot';

export const RETICLE_STYLES: readonly { id: ReticleStyle; label: string; note: string }[] = [
  { id: 'ring', label: 'Ring', note: 'A small open ring, with a tick showing where your nose points now' },
  { id: 'brackets', label: 'Brackets', note: 'Four small corners round the aim point, with the nose tick' },
  { id: 'dot', label: 'Dot', note: 'A dot in a faint broken ring: the least in the way' },
  { id: 'plain', label: 'Plain', note: "The browser's crosshair, as before" },
];

const INK = '#9fd3c7';
const WARN = '#e0a458';
/** How strong the reticle is: present, never louder than the ships. */
const ALPHA = 0.7;
/** Ring radius, px. */
const R = 8;

/**
 * Draw the reticle at the pointer. `nose` is your ship's heading on
 * screen (radians, 0 is east, clockwise positive), so the tick shows how
 * far the nose still has to turn. With the heading locked (V) the
 * reticle turns amber and dashed: the pointer is not steering.
 */
export function drawReticle(ctx: CanvasRenderingContext2D, style: ReticleStyle, at: { x: number; y: number }, nose: number | null, headingLocked: boolean): void {
  if (style === 'plain') return;
  ctx.save();
  ctx.translate(Math.round(at.x) + 0.5, Math.round(at.y) + 0.5);
  ctx.strokeStyle = headingLocked ? WARN : INK;
  ctx.fillStyle = headingLocked ? WARN : INK;
  ctx.globalAlpha = ALPHA;
  ctx.lineWidth = 1.2;
  if (headingLocked) ctx.setLineDash([2, 3]);

  if (style === 'ring') {
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
  } else if (style === 'brackets') {
    const s = R;
    const leg = 4;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      ctx.moveTo(sx * s, sy * (s - leg));
      ctx.lineTo(sx * s, sy * s);
      ctx.lineTo(sx * (s - leg), sy * s);
    }
    ctx.stroke();
  } else {
    // Dot: a small dot in a faint ring broken at the four points.
    ctx.beginPath();
    ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = ALPHA * 0.6;
    ctx.beginPath();
    for (let q = 0; q < 4; q++) {
      const from = q * (Math.PI / 2) + 0.35;
      ctx.moveTo(Math.cos(from) * R, Math.sin(from) * R);
      ctx.arc(0, 0, R, from, from + Math.PI / 2 - 0.7);
    }
    ctx.stroke();
  }

  // Where the nose points now: a short tick outside the reticle.
  if (nose !== null && style !== 'dot') {
    ctx.setLineDash([]);
    // Brackets reach their corners at R times root 2: start the tick outside them.
    const from = style === 'brackets' ? R * 1.45 + 2 : R + 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(nose) * from, Math.sin(nose) * from);
    ctx.lineTo(Math.cos(nose) * (from + 4), Math.sin(nose) * (from + 4));
    ctx.stroke();
  }
  ctx.restore();
}
