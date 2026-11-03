import type { HullSpec, ManufacturerSpec, ModuleKind, ModuleSize, ModuleSpec, MountPoint, RaceId, ShipStats, Thrusters, WeaponState } from '@spacegame/sim';

/**
 * Ship art: a ship is drawn as its hull outline plus each fitted module's
 * universal silhouette at its mount point (the "module grammar" board on
 * the ship concepts canvas). Function shows by shape, the same for every
 * maker; the maker's race shows in the module's fill colour.
 *
 * Everything here draws in hull space: the caller has translated the
 * context to the ship centre, rotated it to the heading and scaled it to
 * pixels per world unit. `px` converts a screen width in pixels into hull
 * units so lines stay crisp at any scale.
 */

/** Race colours from the races design. Multi-race makers use the ship's own colour. */
export const RACE_COLOUR: Record<RaceId, string> = {
  halcyon: '#d9b45a',
  kessari: '#5b8fc7',
  freeBelt: '#c8642e',
  vael: '#6fbf8e',
  oru: '#a77be0',
  drifter: '#c23a3a',
  aurel: '#cfefff',
};

const FLAME = '#e0a458';
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
}

/** Fill colour for a module: its maker's race, or the line colour for multi-race makers. */
function moduleFill(art: ShipArt, module: ModuleSpec): string {
  const race = art.manufacturers[module.manufacturer]?.race;
  return race ? RACE_COLOUR[race] : art.colour;
}

/** Draw the whole ship in hull space. `scale` is screen pixels per world unit. */
export function drawShipArt(ctx: CanvasRenderingContext2D, scale: number, art: ShipArt): void {
  const px = (pixels: number): number => pixels / scale;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (art.thrusters) drawThrust(ctx, px, art);

  // Hull.
  ctx.beginPath();
  art.hull.outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = art.colour;
  ctx.globalAlpha = 0.06;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = art.colour;
  ctx.lineWidth = px(1.5);
  ctx.stroke();

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

/** Hull-space aim of the turret on this mount, or null if it is not a turret. */
function turretAim(art: ShipArt, mount: MountPoint): number | null {
  const state = art.weapons?.find((w) => w.mountId === mount.id);
  const spec = art.stats?.weapons[mount.id];
  if (spec && spec.kind !== 'turret') return null;
  if (!spec && !art.modules[art.fit[mount.id] ?? '']?.needs.includes('fireControl')) return null;
  return state ? state.aim - art.heading : mount.facing;
}

function socketRadius(mount: MountPoint): number {
  return 2.2 * SIZE_SCALE[mount.size];
}

/** An empty mount: a dashed socket, round for guns and gear, square for bays and internals. */
function drawSocket(ctx: CanvasRenderingContext2D, px: (n: number) => number, mount: MountPoint): void {
  const k = SIZE_SCALE[mount.size];
  ctx.strokeStyle = SOCKET;
  ctx.lineWidth = px(1);
  ctx.setLineDash([px(2), px(2)]);
  ctx.beginPath();
  if (mount.type === 'bay') ctx.rect(-3.75 * k, -2 * k, 7.5 * k, 4 * k);
  else if (mount.type === 'internal' || mount.type === 'core') ctx.rect(-1.4 * k, -1.4 * k, 2.8 * k, 2.8 * k);
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
  const body = (draw: () => void, alpha = 0.3): void => {
    ctx.beginPath();
    draw();
    ctx.fillStyle = fill;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
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
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(-1.25 * k, -2 * k);
      ctx.lineTo(-1.25 * k, 2 * k);
      ctx.moveTo(1.25 * k, -2 * k);
      ctx.lineTo(1.25 * k, 2 * k);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    case 'armour':
      // Armour: overlapping plates.
      body(() => {
        ctx.rect(-3 * k, -1 * k, 3.2 * k, 2 * k);
        ctx.rect(-0.2 * k, -1 * k, 3.2 * k, 2 * k);
      }, 0.35);
      return;
    case 'thrusters':
    case 'reactor':
    case 'shieldGenerator':
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
