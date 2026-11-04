import {
  buyGood,
  createStarterWorld,
  fitModule,
  sellModule,
  unfitModule,
  distance,
  sellGood,
  type TradeRefusal,
  joinPilot,
  leadPoint,
  nearestDockableStation,
  pilotShip,
  wakePilot,
  flightWarnings,
  shipStats,
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
import { loadLocalPilot, saveLocalPilot } from './identity.js';
import { MenuPanel } from './menu-panel.js';
import { LOAD_REFUSALS, clearStoredWorld, exportWorld, importWorld, loadStoredWorld, storeWorld } from './persistence.js';
import { loadSettings, saveSettings } from './settings.js';
import { InputController } from './input.js';
import { MarketPanel, type TradeRequest } from './market-panel.js';
import { FIT_REFUSALS, FLIGHT_WARNINGS, OutfittingPanel, type RefitRequest } from './outfitting-panel.js';
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
  drawVelocityVector,
  drawWreck,
  type ShipStyle,
} from './render/draw.js';
import { drawStarfield } from './render/starfield.js';
import { Ui, shipLabel } from './ui.js';

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
    else if (action === 'toggleMenu') menu.toggle();
    else if (action === 'cycleTarget') cycleTarget();
    else if (action === 'clearTarget') input.requestTarget(null);
  },
  (point) => clickTarget(point),
);
const ui = new Ui(
  () => input.requestToggleDock(),
  () => respawn(),
);

let me = loadLocalPilot();
const settings = loadSettings();

const market = new MarketPanel(document.getElementById('market-container')!, (request) => trade(request));
const outfitting = new OutfittingPanel(document.getElementById('outfitting-container')!, (request) => refit(request));

const REFUSALS: Record<TradeRefusal, string> = {
  noShip: 'You have no ship.',
  notDocked: 'Dock first.',
  notTraded: 'This station does not trade that.',
  badQuantity: 'Nothing to trade.',
  credits: 'Not enough credits.',
  space: 'Not enough cargo space.',
  notHeld: 'You do not have that many.',
};

/** Pilot command: buy or sell at the station we are docked at. */
function trade(request: TradeRequest): void {
  const r = request.side === 'buy'
    ? buyGood(current, me.id, request.good, request.quantity)
    : sellGood(current, me.id, request.good, request.quantity);
  if (!r.ok) {
    ui.notify(REFUSALS[r.reason], 'warn');
    return;
  }
  current = r.world;
  if (r.event.type === 'traded') {
    const name = current.goods[r.event.good]?.name ?? r.event.good;
    const total = r.event.quantity * r.event.unitPrice;
    ui.notify(`${r.event.side === 'buy' ? 'Bought' : 'Sold'} ${r.event.quantity} ${name} for ${total.toLocaleString('en-GB')} cr`);
  }
}

/** Pilot command: fit, unfit or sell a module at the station we are docked at. */
function refit(request: RefitRequest): void {
  const r =
    request.kind === 'sell'
      ? sellModule(current, me.id, request.moduleId)
      : request.moduleId
        ? fitModule(current, me.id, request.mountId, request.moduleId)
        : unfitModule(current, me.id, request.mountId);
  if (!r.ok) {
    ui.notify(FIT_REFUSALS[r.reason], 'warn');
    return;
  }
  current = r.world;
  const e = r.event;
  const cr = (n: number) => `${n.toLocaleString('en-GB')} cr`;
  const name = current.modules[e.type === 'fitted' || e.type === 'unfitted' || e.type === 'moduleSold' ? e.moduleId : '']?.name;
  if (e.type === 'fitted') {
    const stored = e.replaced ? `; ${current.modules[e.replaced]?.name ?? e.replaced} to storage` : '';
    ui.notify(`${e.bought ? 'Bought and fitted' : 'Fitted'} ${name ?? e.moduleId} for ${cr(e.cost)}${stored}`);
  } else if (e.type === 'unfitted') {
    ui.notify(`Unfitted ${name ?? e.moduleId} to storage for ${cr(e.fee)}`);
  } else if (e.type === 'moduleSold') {
    ui.notify(`Sold ${name ?? e.moduleId} for ${cr(e.credits)}`);
  }
}

// Start from the saved world if there is one. joinPilot leaves a returning
// pilot exactly as they were, and gives a new one a starter ship.
const stored = loadStoredWorld();
let previous: World = joinPilot(stored.kind === 'loaded' ? stored.world : createStarterWorld(), me.id, me.name);
let current: World = previous;
if (stored.kind === 'unreadable') {
  ui.notify(`${LOAD_REFUSALS[stored.reason]} Starting a new world; the old save was kept aside.`, 'warn');
}

/** Replace the whole world (load, import, new game) and point the camera at our ship. */
function replaceWorld(world: World): void {
  current = joinPilot(world, me.id, me.name);
  previous = current;
  const ship = myShip(current);
  if (ship) camera.snapTo(ship.position);
  market.invalidate();
  outfitting.invalidate();
}

// Saving: autosave every few seconds and whenever the tab is hidden or closed.
const AUTOSAVE_MS = 10_000;
let lastSaveMs = performance.now();
let lastSaveOk = true;
function saveNow(): void {
  lastSaveOk = storeWorld(current, new Date());
  lastSaveMs = performance.now();
}
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveNow();
});

const menu = new MenuPanel(document.body, document.getElementById('menu-button') as HTMLButtonElement, me.name, settings.showLabels, {
  rename(name) {
    me = { ...me, name };
    saveLocalPilot(me);
    current = joinPilot(current, me.id, me.name);
    ui.notify(`Pilot name: ${name}`);
  },
  setShowLabels(show) {
    settings.showLabels = show;
    saveSettings(settings);
  },
  saveNow() {
    saveNow();
    ui.notify(lastSaveOk ? 'World saved.' : 'Could not save: browser storage is not available.', lastSaveOk ? 'info' : 'warn');
  },
  exportSave() {
    exportWorld(current, new Date());
  },
  importSave(file) {
    void importWorld(file).then((r) => {
      if (!r.ok) {
        ui.notify(LOAD_REFUSALS[r.reason], 'warn');
        return;
      }
      replaceWorld(r.world);
      saveNow();
      ui.notify('World imported.');
    });
  },
  newGame() {
    clearStoredWorld();
    replaceWorld(createStarterWorld());
    saveNow();
    ui.notify('New world started.');
  },
});

/** The ship this client is flying, or null while the pilot has none (destroyed). */
function myShip(world: World): Ship | null {
  return pilotShip(world, me.id);
}

/** Where the camera looks while there is no ship to follow. */
let lastSeen: Vec2 = myShip(current)!.position;
camera.snapTo(lastSeen);

/** Pilot command: wake at Harbour after losing your escape pod. */
function respawn(): void {
  const woke = wakePilot(current, me.id);
  if (!woke.ok) return;
  current = woke.world;
  ui.notify(woke.world.ships[woke.event.shipId]?.hullId === 'escape-pod' ? 'You wake at Harbour in a new escape pod. Your ships are where you left them.' : 'You wake at Harbour with a free Meridian Courier.');
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
  if (ship) {
    ui.handleEvents(current.events, ship.id);
    // Undocking in a ship that cannot fly is allowed, but never silent.
    if (current.events.some((e) => e.type === 'undocked' && e.shipId === ship.id)) {
      for (const w of flightWarnings(shipStats(current, ship))) {
        if (w !== 'noWeapons') ui.notify(FLIGHT_WARNINGS[w], 'warn');
      }
    }
  }
}

function frame(nowMs: number): void {
  const frameSeconds = Math.min((nowMs - lastFrameMs) / 1000, MAX_FRAME_SECONDS);
  lastFrameMs = nowMs;
  if (nowMs - lastSaveMs >= AUTOSAVE_MS) saveNow();
  const ago = Math.round((nowMs - lastSaveMs) / 1000);
  menu.setSavedStatus(lastSaveOk ? `Saved ${ago} s ago, in this browser.` : 'Not saving: browser storage is not available.');
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
  const label = shipLabel(world, ship);
  return label === 'UNKNOWN' ? { colour: COLOUR.ink } : { colour: COLOUR.ink, label };
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
    if (ship.state !== 'flying') continue;
    const hull = current.hulls[ship.hullId]!;
    const stats = shipStats(current, ship);
    const style = shipStyle(current, ship, mine);
    const shipView = mine && ship.id === mine.id && view ? view : interpolate(ship, previous.ships[ship.id], alpha);
    const art = { hull, fit: ship.fit, modules: current.modules, manufacturers: current.manufacturers, weapons: ship.weapons, thrusters: ship.thrusters, stats };
    drawShip(ctx!, camera, shipView, art, false, settings.showLabels ? style : { colour: style.colour });
    if (!mine || ship.id !== mine.id) drawHealthBars(ctx!, camera, ship, stats, shipView.position);
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
    const gun = Object.values(shipStats(current, mine).weapons).find((w) => w.kind === 'fixed');
    if (gun && distance(mine.position, target.position) <= gun.range * 1.5) {
      drawLeadMarker(ctx!, camera, leadPoint(mine, target, gun.projectileSpeed), target.position);
    }
  }

  if (mine?.state === 'docked') {
    if (ui.dockTab === 'market') market.update(current, me.id);
    else outfitting.update(current, me.id);
  } else {
    market.invalidate();
    outfitting.invalidate();
  }
  ui.update(current, mine, fpsSmoothed);
}

requestAnimationFrame(frame);
