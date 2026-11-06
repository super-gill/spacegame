import {
  applyUpdate,
  type CommandReply,
  type WorldUpdate,
  type PilotCommand,
  activationSlots,
  arenaFits,
  type AdminRefusal,
  stepOutRefusal,
  type StepOutRefusal,
  boardableShips,
  isEmptyShip,
  STARTER_STATION_ID,
  occupiedPads,
  type WorldEvent,
  distance,
  type TradeRefusal,
  leadPoint,
  incomingMunitions,
  isMainGun,
  lockReadout,
  cargoUsed,
  holdCapacity,
  SEAM_HALF_ARC,
  BLAST_RADIUS,
  rockAt,
  type HangarRefusal,
  lootClaim,
  hopperRejects,
  tractorTakes,
  asteroidPositions,
  navReadout,
  nearestDockableStation,
  pilotShip,
  flightWarnings,
  shipStats,
  wrapAngle,
  type Ship,
  type ShipInput,
  type Vec2,
  type World,
} from '@spacegame/sim';
import { Camera } from './camera.js';
import { ControlsPanel } from './controls-panel.js';
import { chooseCharacter } from './login-screen.js';
import { keyFor } from './net/characters.js';
import { serverAddress } from './net/link.js';
import { Timeline } from './net/timeline.js';
import { OwnShipView } from './net/own-ship.js';
import { ConnectionMeter, showDisconnected } from './hud/connection.js';
import { MenuPanel } from './menu-panel.js';
import { DronePanel } from './hud/drone-panel.js';
import { HoldPanel } from './hud/hold-panel.js';
import { WindowManager } from './hud/windows.js';
import { loadSettings, saveSettings } from './settings.js';
import { InputController } from './input.js';
import { SLOT_ACTIONS } from './bindings.js';
import { MarketPanel, type TradeRequest } from './market-panel.js';
import { FIT_REFUSALS, FLIGHT_WARNINGS, OutfittingPanel, stationFitContext, type RefitRequest } from './outfitting-panel.js';
import {
  COLOUR,
  drawExplosion,
  drawHealthBars,
  drawLoot,
  drawLeadMarker,
  drawPads,
  drawPodBeacon,
  drawDecoy,
  drawMunition,
  drawProjectile,
  drawShieldArc,
  drawShip,
  drawStation,
  drawTargetBracket,
  drawMiningBeam,
  drawSeam,
  drawBreachPoints,
  drawTractor,
  drawVelocityVector,
  drawWreck,
  type ShipStyle,
} from './render/draw.js';
import { drawAsteroids, drawBodies, drawNav } from './render/bodies.js';
import { drawStarfield } from './render/starfield.js';
import { BUY_REFUSALS, ShipMartPanel } from './ship-mart-panel.js';
import { FlightHud } from './hud/flight-hud.js';
import { Radar } from './hud/radar.js';
import { TargetCard } from './hud/target-card.js';
import { Ui, shipLabel, shipName } from './ui.js';
import { BOARD_REFUSALS, YourShipsPanel } from './your-ships-panel.js';

/**
 * Game loop.
 *
 * The world runs on the server (docs/shared-world.md). This client logs
 * in as one character, sends that pilot's controls 60 times a second and
 * their commands when they act, and draws the world the server sends
 * about 20 times a second, interpolating between the last two updates so
 * motion is smooth. This is the only file that knows about both the sim
 * and the DOM.
 *
 * The sim has no "player". This client is one pilot in the world: it
 * sends input for that pilot's ship only, and shows events involving
 * that ship only.
 */

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D not supported');

const camera = new Camera();
// The wheel zooms the view; it never scrolls the page.
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    camera.zoomBy(e.deltaY < 0 ? 1 : -1);
  },
  { passive: false },
);
const controlsPanel = new ControlsPanel(document.body, document.getElementById('controls-button') as HTMLButtonElement);
const input = new InputController(
  canvas,
  (action) => {
    if (action === 'toggleControls') controlsPanel.toggle();
    else if (action === 'toggleMenu') menu.toggle();
    else if (action === 'cycleTarget') cycleTarget();
    else if (action === 'clearTarget') {
      // Esc closes the top window first; with none open it drops the active lock.
      if (!windows.closeTop()) unlockActive();
    }
    else if (action === 'toggleHeadingLock') toggleHeadingLock();
    else if (action === 'toggleDrones') dronePanel.toggle();
    else if (action === 'toggleHold') holdPanel.toggle();
    else if (action === 'board') boardNearest();
    else if (action === 'stepOut') stepOutPressed();
    else if (SLOT_ACTIONS.includes(action)) pressTile(SLOT_ACTIONS.indexOf(action));
    else if (action === 'zoomIn') camera.zoomBy(1);
    else if (action === 'zoomOut') camera.zoomBy(-1);
  },
  (point) => clickTarget(point),
);
const ui = new Ui(
  () => input.requestToggleDock(),
  () => respawn(),
  () => claimStarter(),
);
const hudLayer = document.getElementById('hud-layer')!;
// The connection meter (docs/shared-world.md): round trip to the server, in a corner.
const meter = new ConnectionMeter(hudLayer);
const flightHud = new FlightHud(hudLayer);
// Windows (hud/windows.ts): the hold and the drone manager, with a launcher strip.
const windows = new WindowManager(hudLayer);
const holdPanel = new HoldPanel(windows.add('hold', 'Hold', 'I', { x: 16, y: 120 }), {
  jettison: (good) => input.requestJettison(good),
  setHopper: (drop) => input.requestHopperDrop(drop),
  pressTile: (mountId) => input.requestToggleModule(mountId),
  dropCache: () => input.requestDropCache(),
  store: (good, quantity) => send({ type: 'storeGoods', good, quantity }),
  take: (good, quantity) => send({ type: 'takeGoods', good, quantity }),
});
const dronePanel = new DronePanel(windows.add('drones', 'Drones', 'N', { x: 330, y: 120 }), (command) => input.requestDroneCommand(command));
const targetCard = new TargetCard(
  hudLayer,
  (id) => input.requestActivate(id),
  (id) => input.requestUnlock(id),
);
const radar = new Radar(hudLayer, (id) => lockOrActivate(id));

// Character select first: nothing below runs until this tab is logged in.
const session = await chooseCharacter();
const link = session.link;
const me = { id: session.welcome.pilotId, name: session.welcome.name };
const settings = loadSettings();
canvas.classList.toggle('mouse-steering', settings.mouseSteering);
input.mouseSteering = settings.mouseSteering;

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
  droneBay: 'Your drone bays are full: fit another bay to carry more drones.',
  notHeld: 'You do not have that many.',
};

const HANGAR_REFUSALS: Record<HangarRefusal, string> = {
  noShip: 'You have no ship.',
  notDocked: 'Dock first.',
  badQuantity: 'Nothing to move.',
  notHeld: 'Not that much here.',
  space: 'Not enough room in the hold.',
};

/**
 * Pilot commands (docs/shared-world.md). Everything the pilot asks for
 * that is not flying goes to the server through `send` as a
 * `PilotCommand`; its outcome comes back to `received`, and the change to
 * the world arrives with the next update.
 */
function send(command: PilotCommand): void {
  link.sendCommand(command);
}

/** Why a command was refused, in the pilot's words, by the command that was refused. */
function refusalText(command: PilotCommand, reason: string): string | null {
  const table: Record<string, string> | null = (() => {
    switch (command.type) {
      case 'buyGood':
      case 'sellGood':
        return REFUSALS;
      case 'storeGoods':
      case 'takeGoods':
        return HANGAR_REFUSALS;
      case 'fitModule':
      case 'unfitModule':
      case 'buyModule':
      case 'sellModule':
        return FIT_REFUSALS;
      case 'buyShip':
        return BUY_REFUSALS;
      case 'boardShip':
        return BOARD_REFUSALS;
      case 'stepOut':
        return STEP_OUT_REFUSALS;
      case 'adminGrantCredits':
      case 'adminSetRule':
      case 'adminSpawnShip':
        return { ...ADMIN_REFUSALS, notAdmin: 'Only the host can do that.' };
      case 'adminArena':
      case 'adminArenaEnd':
        return {
          notAdmin: 'Only the host can do that.',
          unknownFit: 'No reference fit by that name.',
          badCount: 'Pick 1 to 8 enemies.',
          notInArena: 'You are not in an arena.',
        };
      // The buttons for these only show when they would work.
      case 'claimStarter':
      case 'wake':
        return null;
    }
  })();
  return table ? (table[reason] ?? `Refused: ${reason}.`) : null;
}

/** A command's outcome: a toast, or why it was refused. */
function received(command: PilotCommand, outcome: CommandReply): void {
  if (!outcome.ok) {
    const text = refusalText(command, outcome.reason);
    if (text) ui.notify(text, 'warn');
    return;
  }
  const e = outcome.event;
  const cr = (n: number) => `${n.toLocaleString('en-GB')} cr`;
  const moduleName = (id: string) => current.modules[id]?.name ?? id;
  const goodName = (id: string) => current.goods[id]?.name ?? id;
  if (e.type === 'traded') {
    ui.notify(`${e.side === 'buy' ? 'Bought' : 'Sold'} ${e.quantity} ${goodName(e.good)} for ${cr(e.quantity * e.unitPrice)}`);
  } else if (e.type === 'goodsStored' || e.type === 'goodsTaken') {
    ui.notify(`${e.type === 'goodsStored' ? 'Stored' : 'Loaded'} ${e.quantity} ${goodName(e.good)}`);
  } else if (e.type === 'fitted') {
    const stored = e.replaced ? `; ${moduleName(e.replaced)} to storage` : '';
    ui.notify(e.bought ? `Bought and fitted ${moduleName(e.moduleId)} for ${cr(e.cost)}${stored}` : `Fitted ${moduleName(e.moduleId)} from storage${stored}`);
  } else if (e.type === 'moduleBought') {
    ui.notify(`Bought ${e.quantity} ${moduleName(e.moduleId)} into storage here for ${cr(e.cost)}`);
  } else if (e.type === 'unfitted') {
    ui.notify(`Unfitted ${moduleName(e.moduleId)} to storage`);
  } else if (e.type === 'moduleSold') {
    ui.notify(`Sold ${moduleName(e.moduleId)} for ${cr(e.credits)}`);
  } else {
    ui.announce(current, e);
  }
  // Waking or boarding can put us somewhere new: look there when the next update lands.
  if (command.type === 'wake' || command.type === 'boardShip' || command.type === 'claimStarter') snapOnNextUpdate = true;
}

/** Set by a command that moves us: the next update snaps the camera and skips interpolating. */
let snapOnNextUpdate = false;

/** Pilot command: buy or sell at the station we are docked at. */
function trade(request: TradeRequest): void {
  send({ type: request.side === 'buy' ? 'buyGood' : 'sellGood', good: request.good, quantity: request.quantity });
}

/** Pilot command: fit, unfit, buy or sell a module at the station we are docked at. */
function refit(request: RefitRequest): void {
  if (request.kind === 'sell') send({ type: 'sellModule', moduleId: request.moduleId });
  else if (request.kind === 'buy') send({ type: 'buyModule', moduleId: request.moduleId });
  else if (request.moduleId) send({ type: 'fitModule', mountId: request.mountId, moduleId: request.moduleId });
  else send({ type: 'unfitModule', mountId: request.mountId });
}

/** Pilot command: buy a ship from the ship mart where we are docked. */
function buy(loadoutId: string): void {
  send({ type: 'buyShip', loadoutId });
}

/** Pilot command: board a ship we own that nobody is flying. */
function board(shipId: string): void {
  send({ type: 'boardShip', shipId });
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
  send({ type: 'stepOut' });
}

/** B: board the nearest ship we could board right now, or say why nothing is in reach. */
function boardNearest(): void {
  const next = boardableShips(current, me.id)[0];
  if (next) board(next.id);
  else if (myShip(current)) ui.notify('No ship of yours in reach to board.', 'warn');
}

/** Pilot command: in a pod at Harbour, owning nothing, take the free starter Tern. */
function claimStarter(): void {
  send({ type: 'claimStarter' });
}

// The world as the server last sent it (`current`) and the update before
// (`previous`), drawn in between; and when the last update arrived.
// The worlds the server sent, drawn a little in the past on a steady clock
// so uneven arrivals do not stutter (net/timeline.ts). `previous` and
// `current` are the two drawn between this frame; `current` is also what
// the HUD and panels read.
const timeline = new Timeline(session.welcome.world);
// Your own ship is drawn from the newest update instead, carried forward (net/own-ship.ts).
const own = new OwnShipView();
let previous: World = session.welcome.world;
let current: World = previous;

const menu = new MenuPanel(document.body, document.getElementById('menu-button') as HTMLButtonElement, { name: me.name, key: keyFor(serverAddress(), me.name), admin: session.welcome.admin }, settings, {
  showMeter() {
    meter.setHidden(false);
  },
  switchCharacter() {
    // Back to character select: the simplest clean way is a fresh page.
    link.close();
    location.reload();
  },
  setShowLabels(show) {
    settings.showLabels = show;
    saveSettings(settings);
  },
  setMouseSteering(on) {
    settings.mouseSteering = on;
    saveSettings(settings);
    canvas.classList.toggle('mouse-steering', on);
    input.mouseSteering = on;
  },
  grantCredits(amount) {
    send({ type: 'adminGrantCredits', amount });
  },
  setManoeuvreSpeed(share) {
    send({ type: 'adminSetRule', rule: 'manoeuvreSpeed', value: share });
  },
  setOrbits(on) {
    send({ type: 'adminSetRule', rule: 'orbits', value: on });
  },
  setGravity(on) {
    send({ type: 'adminSetRule', rule: 'gravity', value: on });
  },
  spawnShip(loadoutId) {
    send({ type: 'adminSpawnShip', loadoutId });
  },
  startArena(playerFit, enemyFit, count) {
    send({ type: 'adminArena', playerFit, enemyFit, count });
  },
  endArena() {
    send({ type: 'adminArenaEnd' });
  },
}, Object.values(current.loadouts)
  // Escape pods are issued, not flown by choice.
  .filter((l) => !current.hulls[l.hullId]?.escapePod)
  .map((l) => ({ id: l.id, name: l.name }))
  .sort((a, b) => a.name.localeCompare(b.name)), arenaFits());

/**
 * A numbered activation tile was pressed (sim `activationSlots`): select
 * a fire group, or switch a module on or off (a dispenser drops a charge).
 */
function pressTile(index: number): void {
  const ship = myShip(current);
  if (!ship) return;
  const slot = activationSlots(current, ship)[index];
  if (!slot) return;
  if (slot.kind === 'group') input.requestGroup(slot.group);
  else input.requestToggleModule(slot.mountId);
}

/** Why an admin command was refused, for the pilot. */
const ADMIN_REFUSALS: Record<AdminRefusal, string> = {
  unknownPilot: 'No pilot.',
  badAmount: 'Not a whole, positive amount.',
  noShip: 'You need a ship to spawn one beside.',
  notDocked: 'Dock first: spawned ships appear on a pad where you are docked.',
  unknownLoadout: 'No such ship.',
  noPad: 'No free pad here fits that ship.',
};

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
  send({ type: 'wake' });
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

/** Click to lock: the ship under the pointer, else the rock under it. Clicking empty space leaves the target alone. */
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
  if (best) {
    lockOrActivate(best.id);
    return;
  }
  // No ship there: a rock, for a mining computer to read.
  for (const rock of asteroidPositions(current)) {
    const p = camera.worldToScreen(rock.position);
    const d = Math.hypot(p.x - point.x, p.y - point.y);
    if (d <= rock.radius * camera.zoom + CLICK_SLOP_PX) {
      lockOrActivate(rock.id);
      return;
    }
  }
}

/** A click on a ship, in space or on the radar: make it active if already locked, else start a lock. */
function lockOrActivate(id: string): void {
  const mine = myShip(current);
  if (!mine) return;
  if (mine.locks.some((l) => l.targetId === id)) input.requestActivate(id);
  else input.requestLock(id);
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
/** Whether the hold was full last frame, so "hold full" is said once. */
let wasHoldFull = false;

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

/** The bearing the pointer last asked for, kept while it sits on the ship itself. */
let lastAim: number | null = null;
/** Heading lock (V): the nose holds its bearing and the pointer moves freely. */
let headingLocked = false;

function toggleHeadingLock(): void {
  if (!settings.mouseSteering) {
    ui.notify('Heading lock is for mouse steering (Menu, F2).', 'info');
    return;
  }
  headingLocked = !headingLocked;
  // Lock on the bearing the nose is holding now.
  const ship = myShip(current);
  if (headingLocked && lastAim === null && ship) lastAim = ship.heading;
  ui.notify(headingLocked ? 'Heading locked: move the pointer freely. V to release.' : 'Heading follows the pointer.', 'info');
}
/** Pointer this close to the ship (screen pixels) keeps the last aim rather than spinning on the spot. */
const AIM_DEAD_ZONE_PX = 24;

/**
 * Mouse steering (settings.ts): the nose follows the pointer through
 * `ShipInput.aimHeading`, and the turn keys strafe instead. Off, the
 * input goes through as the keys made it.
 */
function steer(sampled: ShipInput, ship: Ship): ShipInput {
  if (!settings.mouseSteering) return sampled;
  if (input.pointer && ship.state === 'flying') {
    const at = camera.worldToScreen(ship.position);
    const dx = input.pointer.x - at.x;
    const dy = input.pointer.y - at.y;
    // Over a panel or card the aim holds: reaching for the interface must not swing the ship.
    if (!headingLocked && input.pointerOnGame && Math.hypot(dx, dy) > AIM_DEAD_ZONE_PX) lastAim = Math.atan2(dy, dx);
  }
  return {
    ...sampled,
    strafeLeft: sampled.strafeLeft || sampled.turnLeft,
    strafeRight: sampled.strafeRight || sampled.turnRight,
    turnLeft: false,
    turnRight: false,
    aimHeading: ship.state === 'flying' ? lastAim : null,
  };
}

/** One client tick: the pilot's controls to the server. */
function tick(): void {
  const ship = myShip(current);
  if (ship) link.sendInput(steer(input.sample(), ship));
  else input.sample(); // drain latched presses so they do not fire on respawn
}

/** The server sent what changed: step our copy of the world, and react to the events. */
function updated(changed: WorldUpdate, events: WorldEvent[], nowMs: number): void {
  // Note where ships are before they can be gone from this update, for explosions.
  const last = timeline.latest;
  const before = last.ships;
  const flying = new Map(last.munitions.map((m) => [m.id, m]));
  const now: World = applyUpdate(last, changed, events);
  timeline.add(now);
  const mineNow = myShip(now);
  if (mineNow) own.update(mineNow, nowMs);
  else own.clear();
  if (snapOnNextUpdate) {
    snapOnNextUpdate = false;
    timeline.jump();
    own.clear();
    if (mineNow) own.update(mineNow, nowMs);
    previous = current = now;
    const ship = myShip(now);
    if (ship) camera.snapTo(ship.position);
  }

  for (const e of events) {
    if (e.type === 'destroyed') {
      const gone = before[e.shipId];
      if (gone) explosions.push({ at: gone.position, radius: now.hulls[gone.hullId]?.radius ?? 20, startMs: nowMs });
    } else if (e.type === 'breached') {
      // The blast: as wide as it hurts.
      explosions.push({ at: e.position, radius: BLAST_RADIUS, startMs: nowMs });
    } else if (e.type === 'munitionDestroyed') {
      // Shot down, spent on a decoy, or burnt out: a small burst where it was.
      const m = flying.get(e.munitionId);
      if (m) explosions.push({ at: m.position, radius: 6, startMs: nowMs });
    } else if (e.type === 'damaged' && e.cause === 'munition') {
      const hit = now.ships[e.shipId] ?? before[e.shipId];
      if (hit) explosions.push({ at: hit.position, radius: 10, startMs: nowMs });
    }
  }
  const ship = myShip(now) ?? myShip(last);
  if (ship) {
    ui.handleEvents(events, ship.id);
    // Undocking in a ship that cannot fly is allowed, but never silent.
    if (events.some((e) => e.type === 'undocked' && e.shipId === ship.id)) {
      for (const w of flightWarnings(shipStats(now, ship))) {
        if (w !== 'noWeapons') ui.notify(FLIGHT_WARNINGS[w], 'warn');
      }
    }
  }
}

link.listen({
  update: (_tick, changed, events) => updated(changed, events, performance.now()),
  outcome: (command, outcome) => received(command, outcome),
  latency: (ms) => meter.show(ms),
  closed: (reason) => showDisconnected(reason),
});

// Controls go out at the sim's own rate, whatever the display's refresh.
let accumulator = 0;
let lastFrameMs = performance.now();
const MAX_FRAME_SECONDS = 0.25; // clamp so a background tab does not spiral
const TICK_SECONDS = current.dt;

// FPS smoothing for the HUD.
let fpsSmoothed = 60;

function frame(nowMs: number): void {
  const frameSeconds = Math.min((nowMs - lastFrameMs) / 1000, MAX_FRAME_SECONDS);
  lastFrameMs = nowMs;
  menu.setGravity(current.rules.gravity);
  menu.setOrbits(current.rules.orbits);
  menu.setManoeuvreSpeed(current.rules.manoeuvreSpeed);
  accumulator += frameSeconds;
  fpsSmoothed += (1 / Math.max(frameSeconds, 1e-6) - fpsSmoothed) * 0.05;

  while (accumulator >= TICK_SECONDS) {
    tick();
    accumulator -= TICK_SECONDS;
  }

  // Draw a steady moment a little in the past, between the updates either side of it.
  const moment = timeline.advance(frameSeconds, TICK_SECONDS);
  previous = moment.from;
  current = moment.to;
  render(moment.alpha, frameSeconds, nowMs);
  requestAnimationFrame(frame);
}

/**
 * The world and the fraction of a tick to draw bodies at: updates are
 * several ticks apart, and the body drawing moves on by a fraction of one
 * tick from `world.tick`.
 */
function bodiesAt(alpha: number): [World, number] {
  const at = previous.tick + (current.tick - previous.tick) * alpha;
  const whole = Math.floor(at);
  return [{ ...current, tick: whole + 1 }, at - whole];
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
  if (brain?.kind === 'arena') return { colour: COLOUR.hostile, label: 'ARENA' };
  if (brain?.kind === 'trader') return { colour: COLOUR.neutral, label: 'TRADER' };
  if (brain?.kind === 'miner') return { colour: COLOUR.neutral, label: 'MINER' };
  if (brain?.kind === 'drone') return { colour: ship.ownerId === me.id ? COLOUR.ink : COLOUR.inkDim, label: `DRONE ${(ship.droneId ?? '').toUpperCase()}` };
  // The Watch flies the pirates' hull, so it must read differently: Port Authority white.
  if (brain?.kind === 'watch') return { colour: '#f2f5f7', label: 'CALDER WATCH' };
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
  // Your own ship from the newest update, carried forward; everything else a moment behind.
  const view = mine ? (own.pose(nowMs) ?? interpolate(mine, previous.ships[mine.id], alpha)) : null;
  if (view) lastSeen = view.position;
  const eye = view?.position ?? lastSeen;

  camera.follow(eye, frameSeconds);
  camera.easeZoom(frameSeconds);

  ctx!.fillStyle = '#05070a';
  ctx!.fillRect(0, 0, camera.viewportWidth, camera.viewportHeight);
  drawStarfield(ctx!, camera);

  drawBodies(ctx!, camera, ...bodiesAt(alpha));
  drawAsteroids(ctx!, camera, current, mine);

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
  for (const l of current.loot) drawLoot(ctx!, camera, l, l.cache !== undefined && l.cache.ownerId === me.id);
  // The tractor's reach and pull lines, only while there is room in the hold to pull into.
  const holdFull = mine ? cargoUsed(mine) >= holdCapacity(shipStats(current, mine)) : false;
  if (mine?.tractorActive && view) {
    // Beams only to what it will take: not its hopper's rejects, not other people's loot unless set to ALL.
    const claim = lootClaim(current, mine.id);
    const pulled = holdFull ? [] : current.loot.filter((l) => !(l.ejectedBy === mine.id && (hopperRejects(mine).includes(l.item) || (l.jettisoned && mine.tractorMode !== 'all'))) && tractorTakes(mine, claim, l));
    drawTractor(ctx!, camera, view.position, shipStats(current, mine).tractorRange, pulled);
  }
  if (mine?.tractorActive && holdFull && !wasHoldFull) ui.notify('Hold full: the tractor has nowhere to put anything.', 'warn');
  wasHoldFull = holdFull;

  if (mine && view) drawVelocityVector(ctx!, camera, mine, view);
  if (mine) drawNav(ctx!, camera, bodiesAt(alpha)[0], mine, bodiesAt(alpha)[1]);
  // Every ship, flying or docked: a docked ship's position is its pad.
  for (const ship of Object.values(current.ships)) {
    const hull = current.hulls[ship.hullId]!;
    const stats = shipStats(current, ship);
    const style = shipStyle(current, ship, mine);
    const shipView = mine && ship.id === mine.id && view ? view : interpolate(ship, previous.ships[ship.id], alpha);
    const art = { hull, fit: ship.fit, modules: current.modules, manufacturers: current.manufacturers, weapons: ship.weapons, thrusters: ship.thrusters, stats };
    drawShip(ctx!, camera, shipView, art, labelShown(style, ship) ? style : { colour: style.colour, empty: style.empty === true });
    // Shield cover with its open stern: yours always, others' only if your targeting computer reads their shield.
    const reads = mine && ship.id !== mine.id && ship.state === 'flying' ? lockReadout(current, mine, ship.id) : null;
    if (ship.state === 'flying' && (ship.id === mine?.id || reads?.condition?.shield === 'up' || reads?.combat)) {
      drawShieldArc(ctx!, camera, shipView.position, shipView.heading, hull.radius, stats.shieldArc, stats.shield > 0 ? ship.shield / stats.shield : 0);
    }
    if (hull.escapePod && ship.state === 'flying') drawPodBeacon(ctx!, camera, shipView.position, hull.radius, nowMs);
    // Health bars only for ships your targeting computer can read: a complete lock with combat readout.
    const read = mine && ship.state === 'flying' && ship.id !== mine.id ? lockReadout(current, mine, ship.id) : null;
    if (read?.combat) drawHealthBars(ctx!, camera, ship, stats, shipView.position);
  }

  // Mining lasers: a bright line while cutting, a faint one when there is nothing to cut.
  for (const ship of Object.values(current.ships)) {
    if (!ship.beams) continue;
    const shipView = mine && ship.id === mine.id && view ? view : interpolate(ship, previous.ships[ship.id], alpha);
    for (const beam of ship.beams) drawMiningBeam(ctx!, camera, shipView.position, beam.bearing, beam.length, beam.cutting, nowMs);
  }

  for (const p of current.projectiles) {
    const isMine = mine && p.ownerShipId === mine.id;
    const shooterBrain = current.npcs[p.ownerShipId];
    drawProjectile(ctx!, camera, p, isMine ? COLOUR.inkBright : shooterBrain?.kind === 'pirate' || shooterBrain?.kind === 'arena' ? COLOUR.hostile : COLOUR.neutral);
  }

  for (const d of current.decoys) drawDecoy(ctx!, camera, d, nowMs);
  for (const m of current.munitions) {
    const coming = mine && (m.homingOn === mine.id || m.targetId === mine.id);
    const colour = mine && m.ownerShipId === mine.id ? COLOUR.inkBright : coming ? COLOUR.hostile : COLOUR.neutral;
    drawMunition(ctx!, camera, m, current.goods[m.goodId]?.munition?.class === 'torpedo', colour);
  }
  // Stopgap (lead, 6e part 2): a warning while something is homing on you.
  // The interface workstream's munition warnings replace it.
  const inbound = mine ? incomingMunitions(current.munitions, mine.id) : [];
  if (mine && inbound.length > 0) {
    const nearest = Math.min(...inbound.map((m) => distance(m.position, mine.position)));
    const kind = inbound.some((m) => m.guidance === 'heat') ? (inbound.some((m) => m.guidance === 'radar') ? 'RADAR + HEAT' : 'HEAT') : 'RADAR';
    ctx!.save();
    ctx!.fillStyle = COLOUR.hostile;
    ctx!.globalAlpha = 0.65 + 0.35 * Math.sin(nowMs / 90);
    ctx!.font = '13px ui-monospace, monospace';
    ctx!.textAlign = 'center';
    ctx!.fillText(`MISSILE INBOUND ×${inbound.length} · ${kind} · ${Math.round(nearest)} u · C COUNTERMEASURE`, camera.viewportWidth / 2, 64);
    ctx!.restore();
  }

  explosions = explosions.filter((x) => nowMs - x.startMs < EXPLOSION_MS);
  for (const x of explosions) drawExplosion(ctx!, camera, x.at, x.radius, (nowMs - x.startMs) / EXPLOSION_MS);

  // No edge markers: the radar (hud/radar.ts) shows what your sensors and charts know.

  // Target bracket on the active lock (locking or locked) and, for fixed guns, the lead marker.
  const target = mine?.activeLock ? current.ships[mine.activeLock] : undefined;
  // A locked rock gets the bracket too.
  const lockedRock = mine?.activeLock && !target ? rockAt(current, mine.activeLock) : null;
  if (lockedRock) {
    drawTargetBracket(ctx!, camera, lockedRock.position, lockedRock.rock.radius, false);
    // Its seam, if your mining computer reads it: aim the beam there for half as much ore again.
    const seam = mine ? lockReadout(current, mine, lockedRock.rock.id)?.composition?.seam : undefined;
    if (seam !== undefined) drawSeam(ctx!, camera, lockedRock.position, lockedRock.rock.radius, seam, SEAM_HALF_ARC);
  }
  // Breach charges: every rock you have charges on, and a locked rock's breach points if your assay reads them.
  if (mine) {
    const planted = new Map<string, number[]>();
    for (const c of current.charges ?? []) if (c.shipId === mine.id) planted.set(c.rockId, [...(planted.get(c.rockId) ?? []), c.bearing]);
    const points = lockedRock && mine ? lockReadout(current, mine, lockedRock.rock.id)?.composition?.core?.points : undefined;
    if (lockedRock && points && !planted.has(lockedRock.rock.id)) planted.set(lockedRock.rock.id, []);
    const tolerance = shipStats(current, mine).breachTolerance;
    for (const [rockId, bearings] of planted) {
      const at = rockAt(current, rockId);
      if (!at) continue;
      const marks = rockId === lockedRock?.rock.id ? (points ?? []) : [];
      drawBreachPoints(ctx!, camera, at.position, at.rock.radius, marks, tolerance, bearings);
    }
  }
  if (mine && target && view) {
    const targetView = interpolate(target, previous.ships[target.id], alpha);
    drawTargetBracket(ctx!, camera, targetView.position, current.hulls[target.hullId]?.radius ?? 16, mine.weaponsHot);
    const gun = Object.values(shipStats(current, mine).weapons).find((w) => isMainGun(w));
    if (gun && distance(mine.position, target.position) <= gun.range * 1.5) {
      drawLeadMarker(ctx!, camera, leadPoint(mine, target, gun.projectileSpeed), target.position);
    }
  }

  if (mine?.state === 'docked') {
    if (ui.dockTab === 'market') market.update(current, me.id);
    else if (ui.dockTab === 'outfitting') outfitting.update(current, stationFitContext(current, me.id));
    else if (ui.dockTab === 'shipMart') shipMart.update(current, me.id);
    else yourShips.update(current, me.id);
  } else {
    market.invalidate();
    outfitting.invalidate();
    shipMart.invalidate();
    yourShips.invalidate();
  }
  ui.update(current, mine);
  dronePanel.update(current, mine);
  holdPanel.update(current, mine, me.id);
  flightHud.headingLock = settings.mouseSteering ? headingLocked : null;
  flightHud.update(current, mine, mine ? navReadout(current, mine) : null, fpsSmoothed);
  targetCard.update(current, mine);
  radar.update(current, mine, me.id, camera, eye);
}

requestAnimationFrame(frame);
