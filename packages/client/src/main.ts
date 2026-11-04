import {
  boardShip,
  stepOut,
  stepOutRefusal,
  type StepOutRefusal,
  boardableShips,
  buyShip,
  claimStarterShip,
  isEmptyShip,
  isEscapePod,
  STARTER_STATION_ID,
  occupiedPads,
  type WorldEvent,
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
  lockReadout,
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
  drawPads,
  drawPodBeacon,
  drawProjectile,
  drawShip,
  drawStation,
  drawTargetBracket,
  drawTractor,
  drawVelocityVector,
  drawWreck,
  type ShipStyle,
} from './render/draw.js';
import { bodyMarkers, drawBodies, drawNav } from './render/bodies.js';
import { drawStarfield } from './render/starfield.js';
import { BUY_REFUSALS, ShipMartPanel } from './ship-mart-panel.js';
import { FlightHud } from './hud/flight-hud.js';
import { TargetCard } from './hud/target-card.js';
import { Ui, shipLabel, shipName } from './ui.js';
import { BOARD_REFUSALS, YourShipsPanel } from './your-ships-panel.js';

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
    else if (action === 'clearTarget') unlockActive();
    else if (action === 'board') boardNearest();
    else if (action === 'stepOut') stepOutPressed();
  },
  (point) => clickTarget(point),
);
const ui = new Ui(
  () => input.requestToggleDock(),
  () => respawn(),
  () => claimStarter(),
);
const hudLayer = document.getElementById('hud-layer')!;
const flightHud = new FlightHud(hudLayer);
const targetCard = new TargetCard(hudLayer, (id) => input.requestActivate(id));

let me = loadLocalPilot();
const settings = loadSettings();

const market = new MarketPanel(document.getElementById('market-container')!, (request) => trade(request));
const outfitting = new OutfittingPanel(document.getElementById('outfitting-container')!, (request) => refit(request));
const shipMart = new ShipMartPanel(document.getElementById('ship-mart-container')!, (loadoutId) => buy(loadoutId));
const yourShips = new YourShipsPanel(document.getElementById('ships-container')!, (shipId) => board(shipId));

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

/**
 * After a pilot command that may have moved us into another ship: toast
 * its event, and treat the new state as the previous one too so nothing
 * interpolates from the old ship's place.
 */
function commanded(world: World, event: WorldEvent): void {
  current = world;
  previous = current;
  ui.announce(current, event);
}

/** Pilot command: buy a ship from the ship mart where we are docked. */
function buy(loadoutId: string): void {
  const r = buyShip(current, me.id, loadoutId);
  if (!r.ok) {
    ui.notify(BUY_REFUSALS[r.reason], 'warn');
    return;
  }
  commanded(r.world, r.event);
}

/** Pilot command: board a ship we own that nobody is flying. */
function board(shipId: string): void {
  const r = boardShip(current, me.id, shipId);
  if (!r.ok) {
    ui.notify(BOARD_REFUSALS[r.reason], 'warn');
    return;
  }
  commanded(r.world, r.event);
}

/** Words for why the pilot cannot step out. */
const STEP_OUT_REFUSALS: Record<StepOutRefusal, string> = {
  noShip: 'You have no ship to step out of.',
  docked: 'Docked: board another ship here instead, from Your ships.',
  inPod: 'You are already in an escape pod.',
};

/** How long the second G press has to confirm stepping out, ms. */
const STEP_OUT_CONFIRM_MS = 2000;
let stepOutArmedAt = -Infinity;

/** G: step out in a pod, after a second press to confirm. */
function stepOutPressed(): void {
  const reason = stepOutRefusal(current, me.id);
  if (reason) {
    ui.notify(STEP_OUT_REFUSALS[reason], 'warn');
    return;
  }
  const now = performance.now();
  if (now - stepOutArmedAt > STEP_OUT_CONFIRM_MS) {
    stepOutArmedAt = now;
    ui.notify('Press G again to step out. Your ship stays here, empty.', 'warn');
    return;
  }
  stepOutArmedAt = -Infinity;
  const r = stepOut(current, me.id);
  if (!r.ok) {
    ui.notify(STEP_OUT_REFUSALS[r.reason], 'warn');
    return;
  }
  commanded(r.world, r.event);
}

/** B: board the nearest ship we could board right now, or say why nothing is in reach. */
function boardNearest(): void {
  const next = boardableShips(current, me.id)[0];
  if (next) board(next.id);
  else if (myShip(current)) ui.notify('No ship of yours in reach to board.', 'warn');
}

/** Pilot command: in a pod at Harbour, owning nothing, take the free starter Tern. */
function claimStarter(): void {
  const r = claimStarterShip(current, me.id);
  if (!r.ok) return; // the button only shows when the claim would succeed
  commanded(r.world, r.event);
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
  shipMart.invalidate();
  yourShips.invalidate();
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

/**
 * Where the camera looks while there is no ship to follow. A pilot who
 * lost their pod before the last save loads with no ship at all, so fall
 * back to the station they will wake at.
 */
let lastSeen: Vec2 = myShip(current)?.position ?? current.stations[STARTER_STATION_ID]?.position ?? { x: 0, y: 0 };
camera.snapTo(lastSeen);

/** Pilot command: wake at Harbour after losing your escape pod. */
function respawn(): void {
  const woke = wakePilot(current, me.id);
  if (!woke.ok) return;
  commanded(woke.world, woke.event);
  const ship = myShip(current);
  if (ship) camera.snapTo(ship.position);
}

/** Ships that can be targeted from this ship, nearest first. */
function targetable(world: World, mine: Ship): Ship[] {
  return Object.values(world.ships)
    .filter((s) => s.id !== mine.id && s.state === 'flying')
    .sort((a, b) => distance(mine.position, a.position) - distance(mine.position, b.position) || (a.id < b.id ? -1 : 1));
}

/**
 * Tab: switch the active lock to the next one held. With no locks, lock
 * the nearest ship instead. (Stopgap until the interface workstream's
 * lock controls land.)
 */
function cycleTarget(): void {
  const mine = myShip(current);
  if (!mine) return;
  if (mine.locks.length > 0) {
    const at = mine.locks.findIndex((l) => l.targetId === mine.activeLock);
    input.requestActivate(mine.locks[(at + 1) % mine.locks.length]!.targetId);
    return;
  }
  const range = shipStats(current, mine).sensorRange;
  const nearest = targetable(current, mine).find((s) => distance(mine.position, s.position) <= range);
  if (nearest) input.requestLock(nearest.id);
  else ui.notify('Nothing in sensor range to lock.');
}

/** Esc: drop the active lock. */
function unlockActive(): void {
  const mine = myShip(current);
  if (mine?.activeLock) input.requestUnlock(mine.activeLock);
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
  if (!best) return;
  // Clicking a ship already locked makes it active; anything else starts a lock.
  if (mine.locks.some((l) => l.targetId === best!.id)) input.requestActivate(best.id);
  else input.requestLock(best.id);
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
function lerp(a: Vec2, b: Vec2, alpha: number): Vec2 {
  return { x: a.x + (b.x - a.x) * alpha, y: a.y + (b.y - a.y) * alpha };
}

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
  if (isEmptyShip(world, ship)) {
    // Yours stand out from other pilots' parked ships.
    if (ship.ownerId === me.id) return { colour: COLOUR.ink, label: `YOUR ${shipName(world, ship).toUpperCase()} · EMPTY`, empty: true };
    return { colour: COLOUR.inkDim, label: shipLabel(world, ship), empty: true };
  }
  const label = shipLabel(world, ship);
  return label === 'UNKNOWN' ? { colour: COLOUR.ink } : { colour: COLOUR.ink, label };
}

/** Labels are a setting, except on your own empty ships, which you need to find. */
function labelShown(style: ShipStyle, ship: Ship): boolean {
  return settings.showLabels || (style.empty === true && ship.ownerId === me.id);
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

  drawBodies(ctx!, camera, current, alpha);

  // Stations move on rails: draw them between ticks like ships, so docked ships stay on their pads.
  const near = mine ? nearestDockableStation(mine, current.stations) : null;
  for (const station of Object.values(current.stations)) {
    const prev = previous.stations[station.id];
    const drawn = prev ? { ...station, position: lerp(prev.position, station.position, alpha) } : station;
    drawStation(ctx!, camera, drawn, near?.id === station.id);
    drawPads(ctx!, camera, drawn, occupiedPads(station, current.ships));
  }

  // Wrecks fade over their last WRECK_FADE_SECONDS.
  for (const w of current.wrecks) {
    const hull = current.hulls[w.hullId];
    if (hull) drawWreck(ctx!, camera, w, hull, Math.min(1, (w.ticksLeft * current.dt) / WRECK_FADE_SECONDS));
  }
  for (const l of current.loot) drawLoot(ctx!, camera, l);
  if (mine?.tractorActive && view) drawTractor(ctx!, camera, view.position, TRACTOR_RANGE, current.loot);

  if (mine && view) drawVelocityVector(ctx!, camera, mine, view);
  if (mine) drawNav(ctx!, camera, current, mine, alpha);
  // Every ship, flying or docked: a docked ship's position is its pad.
  for (const ship of Object.values(current.ships)) {
    const hull = current.hulls[ship.hullId]!;
    const stats = shipStats(current, ship);
    const style = shipStyle(current, ship, mine);
    const shipView = mine && ship.id === mine.id && view ? view : interpolate(ship, previous.ships[ship.id], alpha);
    const art = { hull, fit: ship.fit, modules: current.modules, manufacturers: current.manufacturers, weapons: ship.weapons, thrusters: ship.thrusters, stats };
    drawShip(ctx!, camera, shipView, art, labelShown(style, ship) ? style : { colour: style.colour, empty: style.empty === true });
    if (hull.escapePod && ship.state === 'flying') drawPodBeacon(ctx!, camera, shipView.position, hull.radius, nowMs);
    // Health bars only for ships your targeting computer can read: a complete lock with combat readout.
    const read = mine && ship.state === 'flying' && ship.id !== mine.id ? lockReadout(current, mine, ship.id) : null;
    if (read?.combat) drawHealthBars(ctx!, camera, ship, stats, shipView.position);
  }

  for (const p of current.projectiles) {
    const isMine = mine && p.ownerShipId === mine.id;
    const shooterBrain = current.npcs[p.ownerShipId];
    drawProjectile(ctx!, camera, p, isMine ? COLOUR.inkBright : shooterBrain?.kind === 'pirate' ? COLOUR.hostile : COLOUR.neutral);
  }

  explosions = explosions.filter((x) => nowMs - x.startMs < EXPLOSION_MS);
  for (const x of explosions) drawExplosion(ctx!, camera, x.at, x.radius, (nowMs - x.startMs) / EXPLOSION_MS);

  // Edge markers for anything off screen, so the system is navigable.
  for (const b of bodyMarkers(current)) {
    drawOffscreenMarker(ctx!, camera, b.position, b.name.toUpperCase(), distance(eye, b.position), '#6f8f9a', b.radius);
  }
  for (const station of Object.values(current.stations)) {
    drawOffscreenMarker(ctx!, camera, station.position, station.name.toUpperCase(), distance(eye, station.position), COLOUR.ink, station.radius);
  }
  for (const ship of Object.values(current.ships)) {
    if ((mine && ship.id === mine.id) || ship.state !== 'flying') continue;
    const style = shipStyle(current, ship, mine);
    const label = style.label ?? (isEscapePod(current, ship) ? 'POD' : 'SHIP');
    drawOffscreenMarker(ctx!, camera, ship.position, label, distance(eye, ship.position), style.colour, current.hulls[ship.hullId]?.radius ?? 0);
  }

  // Target bracket on the active lock (locking or locked) and, for fixed guns, the lead marker.
  const target = mine?.activeLock ? current.ships[mine.activeLock] : undefined;
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
    else if (ui.dockTab === 'outfitting') outfitting.update(current, me.id);
    else if (ui.dockTab === 'shipMart') shipMart.update(current, me.id);
    else yourShips.update(current, me.id);
  } else {
    market.invalidate();
    outfitting.invalidate();
    shipMart.invalidate();
    yourShips.invalidate();
  }
  ui.update(current, mine);
  flightHud.update(current, mine, fpsSmoothed);
  targetCard.update(current, mine);
}

requestAnimationFrame(frame);
