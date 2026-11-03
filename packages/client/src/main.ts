import {
  createStarterWorld,
  joinPilot,
  nearestDockableStation,
  pilotShip,
  stepWorld,
  wrapAngle,
  type Ship,
  type World,
} from '@spacegame/sim';
import { Camera } from './camera.js';
import { ControlsPanel } from './controls-panel.js';
import { loadLocalPilot } from './identity.js';
import { InputController } from './input.js';
import { drawShip, drawStation, drawVelocityVector } from './render/draw.js';
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
 * and shows events about that ship only. Today the world runs here in the
 * browser; for a shared world it will run on the host's server instead and
 * this loop will send inputs and receive states over the network.
 */

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D not supported');

const camera = new Camera();
const controlsPanel = new ControlsPanel(
  document.body,
  document.getElementById('controls-button') as HTMLButtonElement,
);
const input = new InputController((action) => {
  if (action === 'toggleControls') controlsPanel.toggle();
});
const ui = new Ui(() => input.requestToggleDock());

const me = loadLocalPilot();

let previous: World = joinPilot(createStarterWorld(), me.id, me.name);
let current: World = previous;

/** The ship this client is flying. Throws if the pilot has lost it, which cannot happen yet. */
function myShip(world: World): Ship {
  const ship = pilotShip(world, me.id);
  if (!ship) throw new Error(`Pilot "${me.id}" has no ship`);
  return ship;
}

camera.snapTo(myShip(current).position);

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

function frame(nowMs: number): void {
  const frameSeconds = Math.min((nowMs - lastFrameMs) / 1000, MAX_FRAME_SECONDS);
  lastFrameMs = nowMs;
  accumulator += frameSeconds;
  fpsSmoothed += (1 / Math.max(frameSeconds, 1e-6) - fpsSmoothed) * 0.05;

  while (accumulator >= current.dt) {
    previous = current;
    const shipId = myShip(current).id;
    current = stepWorld(current, { [shipId]: input.sample() });
    ui.handleEvents(current.events.filter((e) => e.shipId === shipId));
    accumulator -= current.dt;
  }

  const alpha = accumulator / current.dt;
  render(alpha, frameSeconds);
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

function render(alpha: number, frameSeconds: number): void {
  const shipNow = myShip(current);
  const view = interpolate(shipNow, previous.ships[shipNow.id], alpha);

  camera.follow(view.position, frameSeconds);

  const w = camera.viewportWidth;
  const h = camera.viewportHeight;
  ctx!.fillStyle = '#05070a';
  ctx!.fillRect(0, 0, w, h);

  drawStarfield(ctx!, camera);

  const near = nearestDockableStation(shipNow, current.stations);
  for (const station of Object.values(current.stations)) {
    drawStation(ctx!, camera, station, near?.id === station.id);
  }

  drawVelocityVector(ctx!, camera, shipNow, view);
  for (const ship of Object.values(current.ships)) {
    const hull = current.hulls[ship.hullId]!;
    const shipView = ship.id === shipNow.id ? view : interpolate(ship, previous.ships[ship.id], alpha);
    drawShip(ctx!, camera, shipView, hull, ship.thrusters, ship.state === 'docked');
  }

  ui.update(current, shipNow, fpsSmoothed);
}

requestAnimationFrame(frame);
