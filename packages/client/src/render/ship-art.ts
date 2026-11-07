import { hullPicture, spritesFor, turretPicture } from './sprites.js';
import type { HullSpec, ManufacturerSpec, ModuleKind, ModuleSize, ModuleSpec, MountPoint, PowerId, ShipStats, Thrusters, WeaponState } from '@spacegame/sim';

/**
 * Ship art: a ship is drawn as its hull outline plus each fitted module's
 * universal silhouette at its mount point (the "module grammar" board on
 * the ship concepts canvas). Function shows by shape, the same for every
 * maker; the maker's home power shows in the module's fill colour.
 *
 * Everything here draws in hull space: the caller has translated the
 * context to the ship centre, rotated it to the heading and scaled it to
 * pixels per world unit. `px` converts a screen width in pixels into hull
 * units so lines stay crisp at any scale.
 */

/**
 * Power colours (docs/races.md, "The powers"). Earth keeps Kessari's
 * steel blue and the Belt the Free Belt's rust orange; Mars's rust red and
 * Venus's green are first proposals, for Jason to confirm. Independent
 * makers use the ship's own colour.
 */
export const POWER_COLOUR: Record<PowerId, string> = {
  earth: '#5b8fc7',
  mars: '#b8483a',
  venus: '#6fbf8e',
  belt: '#c8642e',
  aurel: '#cfefff',
};

const FLAME = '#e0a458';
/** Lifeboat orange, for escape pods. */
const POD_ORANGE = '#ff7a2e';
const SOCKET = '#6f8580';

/** How much bigger each size class draws than S. */
const SIZE_SCALE: Record<ModuleSize, number> = { S: 1, M: 1.5, L: 2, XL: 2.6 };

export interface ShipArt {
  hull: HullSpec;
  fit: Readonly<Record<string, string>>;
  modules: Readonly<Record<string, ModuleSpec>>;
  manufacturers: Readonly<Record<string, ManufacturerSpec>>;
  /** Line colour for the hull and module outlines. */
  colour: string;
  /** Ship heading, to turn turret aims (world bearings) into hull space. */
  heading: number;
  weapons?: readonly WeaponState[];
  /** What fired this tick, for engine plumes and thruster puffs. */
  thrusters?: Thrusters;
  /** Used to skip flames for thrust the ship does not have. */
  stats?: ShipStats;
  /** Outfitting view: draw empty mounts as dashed sockets. */
  showMounts?: boolean;
  /** Outfitting view: mount to ring. */
  highlightMount?: string | null;
  /** Draw the hull outline dashed: an empty ship, nobody aboard. */
  dashedHull?: boolean;
}

/** Fill colour for a module: its maker's home power, or the line colour for independents. */
function moduleFill(art: ShipArt, module: ModuleSpec): string {
  const power = art.manufacturers[module.manufacturer]?.power;
  return power ? POWER_COLOUR[power] : art.colour;
}

/** Draw the whole ship in hull space. `scale` is screen pixels per world unit. */
export function drawShipArt(ctx: CanvasRenderingContext2D, scale: number, art: ShipArt): void {
  const px = (pixels: number): number => pixels / scale;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (art.thrusters) drawThrust(ctx, px, art);
  // The hull's picture from the art, once it has one and it has loaded (render/sprites.ts); the vector drawing until then.
  if (drawSprite(ctx, scale, px, art)) return;
  if (art.hull.escapePod) {
    drawPod(ctx, px, art);
    return;
  }

  // Hull. Callers set the overall alpha (an empty ship is faded), so
  // fills multiply it rather than replace it.
  const alpha = ctx.globalAlpha;
  ctx.beginPath();
  art.hull.outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = art.colour;
  ctx.globalAlpha = alpha * 0.06;
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = art.colour;
  ctx.lineWidth = px(1.5);
  if (art.dashedHull) ctx.setLineDash([px(4), px(3)]);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const mount of art.hull.mounts) {
    const id = art.fit[mount.id];
    const module = id ? art.modules[id] : undefined;
    ctx.save();
    ctx.translate(mount.position.x, mount.position.y);
    if (module) {
      const aim = module.kind === 'weapon' ? turretAim(art, mount) : null;
      drawModule(ctx, px, module, mount, art, aim);
    } else if (art.showMounts) {
      ctx.rotate(mount.facing);
      drawSocket(ctx, px, mount);
    }
    if (art.highlightMount === mount.id) {
      ctx.beginPath();
      ctx.arc(0, 0, socketRadius(mount) + px(5), 0, Math.PI * 2);
      ctx.strokeStyle = FLAME;
      ctx.lineWidth = px(1.5);
      ctx.setLineDash([px(3), px(3)]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

/**
 * An escape pod reads as a lifeboat, not a small ship: a capsule in
 * lifeboat orange with two hazard bands and a round viewport at the
 * nose. Its fitted parts are sealed and not drawn, apart from the
 * nozzle at the stern. The distress beacon is drawn by the caller in
 * screen space (`drawPodBeacon`), so it shows at any zoom.
 */
function drawPod(ctx: CanvasRenderingContext2D, px: (n: number) => number, art: ShipArt): void {
  const alpha = ctx.globalAlpha;
  const outline = art.hull.outline;
  const trace = (): void => {
    ctx.beginPath();
    outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  };
  // Orange body.
  trace();
  ctx.fillStyle = POD_ORANGE;
  ctx.globalAlpha = alpha * 0.4;
  ctx.fill();
  // Hazard bands, clipped to the hull.
  ctx.save();
  trace();
  ctx.clip();
  ctx.strokeStyle = POD_ORANGE;
  ctx.globalAlpha = alpha * 0.9;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const x of [-4, -0.5]) {
    ctx.moveTo(x, -6);
    ctx.lineTo(x + 2.5, 6);
  }
  ctx.stroke();
  ctx.restore();
  // Outline.
  ctx.globalAlpha = alpha;
  trace();
  ctx.strokeStyle = art.colour;
  ctx.lineWidth = px(1.5);
  if (art.dashedHull) ctx.setLineDash([px(4), px(3)]);
  ctx.stroke();
  ctx.setLineDash([]);
  // Viewport.
  ctx.beginPath();
  ctx.arc(5, 0, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = art.colour;
  ctx.fill();
  // Stern nozzle.
  const stern = Math.min(...outline.map((p) => p.x));
  ctx.beginPath();
  ctx.moveTo(stern, -2);
  ctx.lineTo(stern - 2, -2.6);
  ctx.lineTo(stern - 2, 2.6);
  ctx.lineTo(stern, 2);
  ctx.stroke();
}

/**
 * The ship from its sprite (docs/ship-pipeline.md): the bare hull picture,
 * then each fitted weapon's picture at its mount, turned to its aim. Mounts
 * sit where the art marks them, else where the game's table has them (a
 * PDC the art does not draw). Other modules are inside the hull and not
 * drawn. Returns false, drawing nothing, if the hull has no ready sprite
 * or its picture has not loaded: the caller draws the vector ship. The
 * outfitting view keeps the vector drawing for its sockets and highlights.
 */
function drawSprite(ctx: CanvasRenderingContext2D, scale: number, px: (n: number) => number, art: ShipArt): boolean {
  if (art.showMounts) return false;
  const sprites = spritesFor(art.hull);
  if (!sprites) return false;
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const hull = hullPicture(sprites, 2 * sprites.radius * scale * dpr);
  if (!hull) return false;
  const across = hull.picture.pixels * hull.picture.unitsPerPixel;
  ctx.drawImage(hull.img, -across / 2, -across / 2, across, across);

  const marked = new Map(sprites.mounts.map((m) => [m.id, m]));
  for (const mount of art.hull.mounts) {
    const id = art.fit[mount.id];
    const module = id ? art.modules[id] : undefined;
    if (!module || module.kind !== 'weapon') continue;
    const at = marked.get(mount.id) ?? mount.position;
    const aim = turretAim(art, mount) ?? mount.facing;
    ctx.save();
    ctx.translate(at.x, at.y);
    const turret = turretPicture(module);
    if (turret) {
      ctx.rotate(aim);
      const size = turret.picture.pixels * turret.picture.unitsPerPixel;
      ctx.drawImage(turret.img, -size / 2, -size / 2, size, size);
    } else {
      drawModule(ctx, px, module, mount, art, aim);
    }
    ctx.restore();
  }
  return true;
}

/** Hull-space aim of the turret on this mount, or null if it is not a turret. */
function turretAim(art: ShipArt, mount: MountPoint): number | null {
  const state = art.weapons?.find((w) => w.mountId === mount.id);
  const spec = art.stats?.weapons[mount.id];
  if (spec && spec.kind !== 'turret') return null;
  // No stats to hand (a thumbnail): draw the gun pointing ahead.
  if (!spec) return null;
  return state ? state.aim - art.heading : mount.facing;
}

function socketRadius(mount: MountPoint): number {
  return 2.2 * SIZE_SCALE[mount.size];
}

/** An empty mount: a dashed socket, round for high and mid slots, square for lows and core systems. */
function drawSocket(ctx: CanvasRenderingContext2D, px: (n: number) => number, mount: MountPoint): void {
  const k = SIZE_SCALE[mount.size];
  ctx.strokeStyle = SOCKET;
  ctx.lineWidth = px(1);
  ctx.setLineDash([px(2), px(2)]);
  ctx.beginPath();
  if (mount.type === 'low' && mount.size !== 'S') ctx.rect(-3.75 * k, -2 * k, 7.5 * k, 4 * k);
  else if (mount.type === 'low' || mount.type === 'core' || mount.type === 'computer' || mount.type === 'nav') ctx.rect(-1.4 * k, -1.4 * k, 2.8 * k, 2.8 * k);
  else ctx.arc(0, 0, socketRadius(mount), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Draw one module at the origin (its mount), in its universal silhouette. */
function drawModule(
  ctx: CanvasRenderingContext2D,
  px: (n: number) => number,
  module: ModuleSpec,
  mount: MountPoint,
  art: ShipArt,
  turret: number | null,
): void {
  const k = SIZE_SCALE[module.size];
  const fill = moduleFill(art, module);
  ctx.strokeStyle = art.colour;
  ctx.lineWidth = px(1.2);
  // The caller's alpha (an empty ship is faded) scales every fill.
  const base = ctx.globalAlpha;
  const body = (draw: () => void, alpha = 0.3): void => {
    ctx.beginPath();
    draw();
    ctx.fillStyle = fill;
    ctx.globalAlpha = base * alpha;
    ctx.fill();
    ctx.globalAlpha = base;
    ctx.stroke();
  };
  const kind: ModuleKind = module.kind;

  if (kind === 'weapon' && turret !== null) {
    // Turret: round base and a barrel along its aim.
    body(() => ctx.arc(0, 0, 1.6 * k, 0, Math.PI * 2));
    ctx.lineWidth = px(2);
    ctx.beginPath();
    ctx.moveTo(Math.cos(turret) * 1.2 * k, Math.sin(turret) * 1.2 * k);
    ctx.lineTo(Math.cos(turret) * 5 * k, Math.sin(turret) * 5 * k);
    ctx.stroke();
    return;
  }

  ctx.rotate(mount.facing);
  switch (kind) {
    case 'weapon':
      // Fixed weapon: a block with two barrels along the heading.
      body(() => ctx.rect(-1.5 * k, -1.2 * k, 3 * k, 2.4 * k));
      ctx.lineWidth = px(1.6);
      ctx.beginPath();
      ctx.moveTo(1.5 * k, -0.6 * k);
      ctx.lineTo(5.5 * k, -0.6 * k);
      ctx.moveTo(1.5 * k, 0.6 * k);
      ctx.lineTo(5.5 * k, 0.6 * k);
      ctx.stroke();
      return;
    case 'engine':
      // Engine: a nozzle opening aft (the mount faces aft, so +x is out).
      body(() => {
        ctx.moveTo(-1.5 * k, -1.6 * k);
        ctx.lineTo(1.5 * k, -2 * k);
        ctx.lineTo(1.5 * k, 2 * k);
        ctx.lineTo(-1.5 * k, 1.6 * k);
        ctx.closePath();
      });
      return;
    case 'cargoPod':
      // Cargo pod: a solid block with bands.
      body(() => ctx.rect(-3.75 * k, -2 * k, 7.5 * k, 4 * k), 0.4);
      ctx.globalAlpha = base * 0.7;
      ctx.beginPath();
      ctx.moveTo(-1.25 * k, -2 * k);
      ctx.lineTo(-1.25 * k, 2 * k);
      ctx.moveTo(1.25 * k, -2 * k);
      ctx.lineTo(1.25 * k, 2 * k);
      ctx.stroke();
      ctx.globalAlpha = base;
      return;
    case 'armour':
      // Armour: overlapping plates.
      body(() => {
        ctx.rect(-3 * k, -1 * k, 3.2 * k, 2 * k);
        ctx.rect(-0.2 * k, -1 * k, 3.2 * k, 2 * k);
      }, 0.35);
      return;
    case 'radar':
      // Radar: a dish, an arc facing the way the mount faces.
      ctx.lineWidth = px(1.2);
      ctx.beginPath();
      ctx.arc(-0.6 * k, 0, 1.6 * k, -Math.PI / 2.4, Math.PI / 2.4);
      ctx.moveTo(-0.6 * k, 0);
      ctx.lineTo(1.2 * k, 0);
      ctx.stroke();
      return;
    case 'navComputer':
      // Nav computer: a small box with a compass needle.
      body(() => ctx.rect(-1 * k, -1 * k, 2 * k, 2 * k), 0.2);
      ctx.lineWidth = px(0.8);
      ctx.beginPath();
      ctx.moveTo(-0.7 * k, 0.7 * k);
      ctx.lineTo(0.7 * k, -0.7 * k);
      ctx.stroke();
      return;
    case 'targetingComputer':
      // Targeting computer: a box with crosshairs.
      body(() => ctx.rect(-1.2 * k, -1.2 * k, 2.4 * k, 2.4 * k), 0.2);
      ctx.lineWidth = px(0.8);
      ctx.beginPath();
      ctx.moveTo(-1.2 * k, 0);
      ctx.lineTo(1.2 * k, 0);
      ctx.moveTo(0, -1.2 * k);
      ctx.lineTo(0, 1.2 * k);
      ctx.stroke();
      return;
    case 'thrusters':
    case 'reactor':
    case 'shieldGenerator':
    case 'flightComputer':
    case 'podBay':
    case 'fireControl':
    case 'tractor':
    case 'surveyScanner':
    case 'oreHopper':
    case 'afterburner':
      // Internal module: a marker only. Reactors are a solid dot,
      // shield generators a ring, thruster packages an open square.
      ctx.beginPath();
      ctx.rect(-1.2 * k, -1.2 * k, 2.4 * k, 2.4 * k);
      ctx.lineWidth = px(1);
      ctx.stroke();
      ctx.fillStyle = fill;
      ctx.beginPath();
      if (kind === 'reactor') {
        ctx.arc(0, 0, 0.6 * k, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'shieldGenerator') {
        ctx.arc(0, 0, 0.7 * k, 0, Math.PI * 2);
        ctx.strokeStyle = fill;
        ctx.stroke();
      }
      return;
  }
}

/**
 * Flames from what actually fired this tick, so assist and brake burns
 * show as well as the pilot's own. Main thrust plumes come out of each
 * fitted engine; the smaller vents are drawn round the hull edge. Thrust
 * the ship has no module for is not drawn, even if the computer asked.
 */
function drawThrust(ctx: CanvasRenderingContext2D, px: (n: number) => number, art: ShipArt): void {
  const t = art.thrusters!;
  const r = art.hull.radius;
  const len = (throttle: number): number => 0.25 + 0.75 * throttle;
  const has = (stat: 'mainThrust' | 'reverseThrust' | 'lateralThrust' | 'rotationThrust'): boolean =>
    !art.stats || art.stats[stat] > 0;
  ctx.strokeStyle = FLAME;

  if (t.main > 0 && has('mainThrust')) {
    for (const mount of art.hull.mounts) {
      const module = art.modules[art.fit[mount.id] ?? ''];
      if (module?.kind !== 'engine') continue;
      const k = SIZE_SCALE[module.size];
      ctx.save();
      ctx.translate(mount.position.x, mount.position.y);
      ctx.rotate(mount.facing);
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      ctx.moveTo(1.5 * k, -1.5 * k);
      ctx.lineTo(1.5 * k + 6 * k * len(t.main), 0);
      ctx.lineTo(1.5 * k, 1.5 * k);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.lineWidth = px(1);
  if (t.reverse > 0 && has('reverseThrust')) {
    const l = 0.35 * r * len(t.reverse);
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.4);
    ctx.lineTo(r * 0.5 + l, -r * 0.45);
    ctx.moveTo(r * 0.5, r * 0.4);
    ctx.lineTo(r * 0.5 + l, r * 0.45);
    ctx.stroke();
  }
  // Lateral vents fire on the side opposite the push.
  if (has('lateralThrust')) {
    for (const [throttle, side] of [
      [t.strafeRight, -1],
      [t.strafeLeft, 1],
    ] as const) {
      if (throttle <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, side * r * 0.5);
      ctx.lineTo(-r * 0.2, side * r * (0.5 + 0.4 * len(throttle)));
      ctx.stroke();
    }
  }
  // Rotation vents: a puff near the nose on the side opposite the turn.
  if (has('rotationThrust')) {
    for (const [throttle, side] of [
      [t.rotateRight, -1],
      [t.rotateLeft, 1],
    ] as const) {
      if (throttle <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, side * r * 0.2);
      ctx.lineTo(r * 0.45, side * r * (0.2 + 0.3 * len(throttle)));
      ctx.stroke();
    }
  }
}
