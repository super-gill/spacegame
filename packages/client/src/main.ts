import {
  createStarterWorld,
  emptyInput,
  nearestDockableStation,
  playerShip,
  stepWorld,
  wrapAngle,
  type PlayerInput,
  type World,
} from '@spacegame/sim';
import { Camera } from './camera.js';
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
 */

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D not supported');

const camera = new Camera();
const input = new InputController(canvas);
const ui = new Ui(() => input.requestToggleDock());

let previous: World = createStarterWorld();
let current: World = previous;
let lastInput: PlayerInput = emptyInput();
camera.snapTo(playerShip(current).position);

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
    lastInput = input.sample(camera, playerShip(current).position);
    previous = current;
    current = stepWorld(current, lastInput);
    ui.handleEvents(current.events);
    accumulator -= current.dt;
  }

  const alpha = accumulator / current.dt;
  render(alpha, frameSeconds);
  requestAnimationFrame(frame);
}

function render(alpha: number, frameSeconds: number): void {
  const shipNow = playerShip(current);
  const shipPrev = playerShip(previous);
  const hull = current.hulls[shipNow.hullId]!;

  // Interpolated view of the ship for drawing only; the sim is untouched.
  const view = {
    position: {
      x: shipPrev.position.x + (shipNow.position.x - shipPrev.position.x) * alpha,
      y: shipPrev.position.y + (shipNow.position.y - shipPrev.position.y) * alpha,
    },
    heading: shipPrev.heading + wrapAngle(shipNow.heading - shipPrev.heading) * alpha,
  };

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
  drawShip(ctx!, camera, view, hull, lastInput, shipNow.state === 'docked');

  ui.update(current, shipNow, fpsSmoothed);
}

requestAnimationFrame(frame);
