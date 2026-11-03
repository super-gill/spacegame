# Architecture

## Overview

Two packages in an npm workspace:

```
@spacegame/sim      the game, as data and pure functions
@spacegame/client   the browser, as a renderer and an input device
```

Dependency direction is one way: the client imports the sim. The sim imports nothing.

## The sim

### Rules

1. No DOM, no canvas, no timers, no `Math.random` without a seeded source, no Node APIs. `packages/sim/tsconfig.json` compiles against `lib: ["ES2022"]` only, so referencing `document` or `window` is a type error.
2. World state is plain data: `World` and everything inside it is JSON-serialisable. A save game is `JSON.stringify(world)`.
3. `stepWorld(world, input)` is pure. It returns a new `World` and never mutates its argument. There is a test for this.
4. The sim advances by a fixed tick (`FIXED_DT`, 1/60 s). Callers never pass a variable `dt`.
5. Anything that affects feel is a named constant in `constants.ts` or a field on a `HullSpec`. No magic numbers inside functions.

### Modules

| File | Responsibility |
| --- | --- |
| `types.ts` | All world state types and the `PlayerInput` contract |
| `vec2.ts`, `angle.ts` | Maths helpers, immutable |
| `constants.ts` | Tuning constants |
| `hulls.ts` | Hull catalogue (data) |
| `ship.ts` | Flight model: turning, thrust, drag, integration |
| `docking.ts` | Dock range check, dock and undock transitions |
| `world.ts` | World construction and lookups, starter sector content |
| `step.ts` | The tick: applies input, runs ship step, collects events |
| `index.ts` | Public API |

### Events

Each tick produces a fresh `events` array on the world (`docked`, `dockRefused`, and so on). The client reads it to show toasts or play sounds. Events are facts about what happened in the tick, not requests to the UI.

### Input contract

The client hands the sim one `PlayerInput` per tick. It contains the rotate and thrust booleans and edge-triggered actions such as `toggleDock`. The sim never reads keys or the mouse. This is what keeps replays, tests and AI-controlled ships possible: anything that can produce a `PlayerInput` can fly a ship.

## The client

### Loop (`main.ts`)

A fixed-timestep accumulator drives `stepWorld` at exactly 60 Hz regardless of monitor refresh rate. Rendering happens every animation frame and interpolates between the previous and current world by the accumulator's leftover fraction, so motion is smooth at 120 Hz and consistent at 30 Hz. Frame time is clamped to 250 ms so a background tab does not catch up with a burst of ticks.

Two world references are kept, `previous` and `current`. Because `stepWorld` returns a new object, this costs nothing.

### Modules

| File | Responsibility |
| --- | --- |
| `main.ts` | Loop, wiring, interpolation. The only file that knows both sim and DOM |
| `input.ts` | Keyboard state sampled into a `PlayerInput`. Key bindings in one table |
| `camera.ts` | World to screen mapping, smoothed follow |
| `render/starfield.ts` | Infinite hashed parallax starfield |
| `render/draw.ts` | Vector drawing of ships and stations |
| `ui.ts` | HUD text, docked panel, toasts (DOM, not canvas) |
| `style.css` | Theme variables and overlay layout |

### Rendering

Canvas 2D, vector line art, device-pixel-ratio aware. Colours are defined once as CSS variables and mirrored in `draw.ts`. There is no sprite pipeline and none is planned until the core loop is proven.

## Build and deploy

`npm run build` type-checks both packages and emits a static site to `packages/client/dist` with a relative base path, so it can be dropped on GitHub Pages, itch.io or any static host without configuration.

## Testing

The sim is tested with Vitest (`npm test`). Tests cover the flight model (acceleration, drift, terminal velocity, braking, rotation rate and direction, heading wrap), angle helpers, docking rules, and purity of `stepWorld`. The client is checked visually; there is no DOM test harness yet.

## Adding things

- **A new hull**: add an entry to `hulls.ts`. Nothing else.
- **A new station in the starter sector**: add it in `createStarterWorld`. When sectors become data files this moves there.
- **A new control**: add a field to `PlayerInput`, a binding in `input.ts` `KEYS`, and handle it in the sim. Update `docs/controls.md`.
- **A new world event**: add a variant to `WorldEvent`, emit it from the sim, handle it in `ui.ts`.
