import {
  createStarterWorld,
  distance,
  joinPilot,
  leadPoint,
  nearestDockableStation,
  pilotShip,
  respawnPilot,
  stepWorld,
  TRACTOR_RANGE,
  wrapAngle,
  type Ship,
  type ShipInput,
  type Vec2,
  type World,
} from '@spacegame/sim';
import { Camera } from './camera.js';
import { ControlsPanel } from './controls-panel.js';
import { loadLocalPilot } from './identity.js';
import { InputController } from './input.js';
import {
  COLOUR,
  drawExplosion,
  drawHealthBars,
  drawLoot,
  drawOffscreenMarker,
  drawLeadMarker,
  drawProjectile,
  drawShip,
  drawStation,
  drawTargetBracket,
  drawTractor,
  drawTurret,
  drawVelocityVector,
  drawWreck,
  type ShipStyle,
} from './render/draw.js';
import { drawStarfield } from './render/starfield.js';
import { Ui } from './ui.js';

/**
 * Game loop.
 *
 * The sim runs at a fixed 60 Hz regardless of display refresh. Rendering
 * runs on requestAnimationFrame and interpolates between the previous and
 * current sim states so motion is smooth on 120 Hz screens and stable on
 * slow ones. This is the only file that knows about both sim and DOM.
 *
 * The sim has no "player". This client is one pilot in the world: it
 * joins with its local identity, sends input for that pilot's ship only,
 * and shows events involving that ship only. Today the world runs here in
 * the browser; for a shared world it will run on the host's server instead
 * and this loop will send inputs and pilot commands (like respawn) and
 * receive states over the network.
 */

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D not supported');

const camera = new Camera();
const controlsPanel = new ControlsPanel(document.body, document.getElementById('controls-button') as HTMLButtonElement);
const input = new InputController(
  canvas,
  (action) => {
    if (action === 'toggleControls') controlsPanel.toggle();
    else if (action === 'cycleTarget') cycleTarget();
    else if (action === 'clearTarget') input.requestTarget(null);
  },
  (point) => clickTarget(point),
);
const ui = new Ui(
  () => input.requestToggleDock(),
  () => respawn(),
);

const me = loadLocalPilot();

let previous: World = joinPilot(createStarterWorld(), me.id, me.name);
let current: World = previous;

/** The ship this client is flying, or null while the pilot has none (destroyed). */
function myShip(world: World): Ship | null {
  return pilotShip(world, me.id);
}

/** Where the camera looks while there is no ship to follow. */
let lastSeen: Vec2 = myShip(current)!.position;
camera.snapTo(lastSeen);

/** Pilot command: take a new ship after losing one. */
function respawn(): void {
  current = respawnPilot(current, me.id);
  previous = current;
  const ship = myShip(current);
  if (ship) camera.snapTo(ship.position);
}

/** Ships that can be targeted from this ship, nearest first. */
function targetable(world: World, mine: Ship): Ship[] {
  return Object.values(world.ships)
    .filter((s) => s.id !== mine.id && s.state === 'flying')
    .sort((a, b) => distance(mine.position, a.position) - distance(mine.position, b.position) || (a.id < b.id ? -1 : 1));
}

/** Tab: the next target outward from the current one, wrapping back to the nearest. */
function cycleTarget(): void {
  const mine = myShip(current);
  if (!mine) return;
  const list = targetable(current, mine);
  if (list.length === 0) return;
  const at = list.findIndex((s) => s.id === mine.targetId);
  input.requestTarget(list[(at + 1) % list.length]!.id);
}

/** Left click: target the ship under the pointer, if any. Clicking empty space leaves the target alone. */
const CLICK_SLOP_PX = 10;
function clickTarget(point: { x: number; y: number }): void {
  const mine = myShip(current);
  if (!mine) return;
  let best: Ship | null = null;
  let bestDist = Infinity;
  for (const s of targetable(current, mine)) {
    const p = camera.worldToScreen(s.position);
    const d = Math.hypot(p.x - point.x, p.y - point.y);
    const reach = (current.hulls[s.hullId]?.radius ?? 0) * camera.zoom + CLICK_SLOP_PX;
    if (d <= reach && d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  if (best) input.requestTarget(best.id);
}

/** Explosions are a client-side effect, started from `destroyed` events. */
interface Explosion {
  at: Vec2;
  radius: number;
  startMs: number;
}
const EXPLOSION_MS = 700;
const WRECK_FADE_SECONDS = 10;
let explosions: Explosion[] = [];

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  camera.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

// Fixed-timestep accumulator.
let accumulator = 0;
let lastFrameMs = performance.now();
const MAX_FRAME_SECONDS = 0.25; // clamp so a background tab does not spiral

// FPS smoothing for the HUD.
let fpsSmoothed = 60;

function tick(nowMs: number): void {
  const ship = myShip(current);
  const inputs: Record<string, ShipInput> = {};
  if (ship) {
    inputs[ship.id] = input.sample();
  } else {
    input.sample(); // drain latched presses so they do not fire on respawn
  }

  // Note where ships are before they can be destroyed this tick, for explosions.
  const before = current.ships;
  previous = current;
  current = stepWorld(current, inputs);

  for (const e of current.events) {
    if (e.type !== 'destroyed') continue;
    const gone = before[e.shipId];
    if (gone) explosions.push({ at: gone.position, radius: current.hulls[gone.hullId]?.radius ?? 20, startMs: nowMs });
  }
  if (ship) ui.handleEvents(current.events, ship.id);
}

function frame(nowMs: number): void {
  const frameSeconds = Math.min((nowMs - lastFrameMs) / 1000, MAX_FRAME_SECONDS);
  lastFrameMs = nowMs;
  accumulator += frameSeconds;
  fpsSmoothed += (1 / Math.max(frameSeconds, 1e-6) - fpsSmoothed) * 0.05;

  while (accumulator >= current.dt) {
    tick(nowMs);
    accumulator -= current.dt;
  }

  render(accumulator / current.dt, frameSeconds, nowMs);
  requestAnimationFrame(frame);
}

/** Interpolated position and heading of a ship, for drawing only; the sim is untouched. */
function interpolate(now: Ship, prev: Ship | undefined, alpha: number) {
  if (!prev) return { position: now.position, heading: now.heading };
  return {
    position: {
      x: prev.position.x + (now.position.x - prev.position.x) * alpha,
      y: prev.position.y + (now.position.y - prev.position.y) * alpha,
    },
    heading: prev.heading + wrapAngle(now.heading - prev.heading) * alpha,
  };
}

/** Colour and label for a ship, from who flies it. Labels are a dev aid for now. */
function shipStyle(world: World, ship: Ship, mine: Ship | null): ShipStyle {
  if (mine && ship.id === mine.id) return { colour: COLOUR.inkBright };
  const brain = world.npcs[ship.id];
  if (brain?.kind === 'pirate') {
    const hunting = brain.mode === 'hunt' ? (mine && brain.targetId === mine.id ? ' · HUNTING YOU' : ' · HUNTING') : '';
    return { colour: COLOUR.hostile, label: `PIRATE${hunting}` };
  }
  if (brain?.kind === 'trader') return { colour: COLOUR.neutral, label: 'TRADER' };
  const owner = ship.ownerId ? world.pilots[ship.ownerId] : undefined;
  return owner ? { colour: COLOUR.ink, label: owner.name.toUpperCase() } : { colour: COLOUR.ink };
}

function render(alpha: number, frameSeconds: number, nowMs: number): void {
  const mine = myShip(current);
  const view = mine ? interpolate(mine, previous.ships[mine.id], alpha) : null;
  if (view) lastSeen = view.position;
  const eye = view?.position ?? lastSeen;

  camera.follow(eye, frameSeconds);

  ctx!.fillStyle = '#05070a';
  ctx!.fillRect(0, 0, camera.viewportWidth, camera.viewportHeight);
  drawStarfield(ctx!, camera);

  const near = mine ? nearestDockableStation(mine, current.stations) : null;
  for (const station of Object.values(current.stations)) drawStation(ctx!, camera, station, near?.id === station.id);

  // Wrecks fade over their last WRECK_FADE_SECONDS.
  for (const w of current.wrecks) {
    const hull = current.hulls[w.hullId];
    if (hull) drawWreck(ctx!, camera, w, hull, Math.min(1, (w.ticksLeft * current.dt) / WRECK_FADE_SECONDS));
  }
  for (const l of current.loot) drawLoot(ctx!, camera, l);
  if (mine?.tractorActive && view) drawTractor(ctx!, camera, view.position, TRACTOR_RANGE, current.loot);

  if (mine && view) drawVelocityVector(ctx!, camera, mine, view);
  for (const ship of Object.values(current.ships)) {
    const hull = current.hulls[ship.hullId]!;
    const style = shipStyle(current, ship, mine);
    const shipView = mine && ship.id === mine.id && view ? view : interpolate(ship, previous.ships[ship.id], alpha);
    drawShip(ctx!, camera, shipView, hull, ship.thrusters, ship.state === 'docked', style);
    if (ship.state !== 'flying') continue;
    for (const w of ship.weapons) {
      if (current.weapons[w.weaponId]?.kind === 'turret') drawTurret(ctx!, camera, shipView.position, w.aim, hull, style.colour);
    }
    if (!mine || ship.id !== mine.id) drawHealthBars(ctx!, camera, ship, hull, shipView.position);
  }

  for (const p of current.projectiles) {
    const isMine = mine && p.ownerShipId === mine.id;
    const shooterBrain = current.npcs[p.ownerShipId];
    drawProjectile(ctx!, camera, p, isMine ? COLOUR.inkBright : shooterBrain?.kind === 'pirate' ? COLOUR.hostile : COLOUR.neutral);
  }

  explosions = explosions.filter((x) => nowMs - x.startMs < EXPLOSION_MS);
  for (const x of explosions) drawExplosion(ctx!, camera, x.at, x.radius, (nowMs - x.startMs) / EXPLOSION_MS);

  // Edge markers for anything off screen, so the sector is navigable.
  for (const station of Object.values(current.stations)) {
    drawOffscreenMarker(ctx!, camera, station.position, station.name.toUpperCase(), distance(eye, station.position), COLOUR.ink, station.radius);
  }
  for (const ship of Object.values(current.ships)) {
    if ((mine && ship.id === mine.id) || ship.state !== 'flying') continue;
    const style = shipStyle(current, ship, mine);
    drawOffscreenMarker(ctx!, camera, ship.position, style.label ?? 'SHIP', distance(eye, ship.position), style.colour, current.hulls[ship.hullId]?.radius ?? 0);
  }

  // Target bracket and, for fixed guns, the lead marker.
  const target = mine?.targetId ? current.ships[mine.targetId] : undefined;
  if (mine && target && view) {
    const targetView = interpolate(target, previous.ships[target.id], alpha);
    drawTargetBracket(ctx!, camera, targetView.position, current.hulls[target.hullId]?.radius ?? 16, mine.weaponsHot);
    const gun = mine.weapons.map((w) => current.weapons[w.weaponId]).find((w) => w?.kind === 'fixed');
    if (gun && distance(mine.position, target.position) <= gun.range * 1.5) {
      drawLeadMarker(ctx!, camera, leadPoint(mine, target, gun.projectileSpeed), target.position);
    }
  }

  ui.update(current, mine, fpsSmoothed);
}

requestAnimationFrame(frame);
