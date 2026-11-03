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
2. World state is plain data: `World` and everything inside it is JSON-serialisable. A save game is `JSON.stringify(world)`, covering every pilot.
3. There is no "player". The world holds pilots (`World.pilots`), each owning ships (`Ship.ownerId`) and flying one (`Pilot.shipId`). See the multiplayer section of `docs/design.md`.
4. `stepWorld(world, inputs)` is pure. It returns a new `World` and never mutates its argument. There is a test for this.
5. The sim advances by a fixed tick (`FIXED_DT`, 1/60 s). Callers never pass a variable `dt`.
6. Anything that affects feel is a named constant in `constants.ts` or a field on a `HullSpec`. No magic numbers inside functions.

### Modules

| File | Responsibility |
| --- | --- |
| `types.ts` | All world state types and the `ShipInput` contract |
| `vec2.ts`, `angle.ts` | Maths helpers, immutable |
| `constants.ts` | Tuning constants |
| `hulls.ts` | Hull catalogue (data) |
| `flight.ts` | Flight computer: input and flight mode to thruster throttles. Assist and brake logic |
| `ship.ts` | Physics: applies throttles as acceleration, enforces hull speed and spin limits |
| `docking.ts` | Dock range check, dock and undock transitions |
| `world.ts` | World construction, pilots joining (`joinPilot`), lookups (`pilotShip`), starter sector content |
| `step.ts` | The tick: steps every ship with its input (or none), collects events |
| `index.ts` | Public API |

### Events

Each tick produces a fresh `events` array on the world (`docked`, `dockRefused`, `flightModeChanged`, and so on). Every event carries a `shipId`; the client shows only events about its own ship, as toasts or (later) sounds. Events are facts about what happened in the tick, not requests to the UI.

### Input contract

The client hands the sim a map of ship id to `ShipInput` each tick, containing only the ship it controls. Ships with no entry are stepped with an empty input, so their flight computer still runs. Each input contains the rotate and thrust booleans and edge-triggered actions such as `toggleDock` and `cycleFlightMode`. The sim never reads keys or the mouse. This is what keeps replays, tests and AI-controlled ships possible: anything that can produce a `ShipInput` can fly a ship.

## The client

### Loop (`main.ts`)

A fixed-timestep accumulator drives `stepWorld` at exactly 60 Hz regardless of monitor refresh rate. Rendering happens every animation frame and interpolates between the previous and current world by the accumulator's leftover fraction, so motion is smooth at 120 Hz and consistent at 30 Hz. Frame time is clamped to 250 ms so a background tab does not catch up with a burst of ticks.

Two world references are kept, `previous` and `current`. Because `stepWorld` returns a new object, this costs nothing.

### Modules

| File | Responsibility |
| --- | --- |
| `main.ts` | Loop, wiring, interpolation. Joins as the local pilot and sends input for that pilot's ship only. The only file that knows both sim and DOM |
| `identity.ts` | The local pilot's stable id and name, kept in browser storage |
| `bindings.ts` | Every control in the game, in one table. Single source of truth for input and the controls panel |
| `input.ts` | Keyboard state sampled into a `ShipInput`; interface actions sent to a callback |
| `controls-panel.ts` | Developer controls panel (F1), generated from `bindings.ts` |
| `camera.ts` | World to screen mapping, smoothed follow |
| `render/starfield.ts` | Infinite hashed parallax starfield |
| `render/draw.ts` | Vector drawing of ships and stations |
| `ui.ts` | HUD text, docked panel, toasts (DOM, not canvas) |
| `style.css` | Theme variables and overlay layout |

### Rendering

Canvas 2D, vector line art, device-pixel-ratio aware. Colours are defined once as CSS variables and mirrored in `draw.ts`. There is no sprite pipeline and none is planned until the core loop is proven.

## Path to a shared world

Today the world runs inside the browser in `main.ts`. For the private-server model (see `docs/design.md`), the same sim moves into a Node server process on the host's machine, which also serves the client files. Clients then send their `ShipInput` over a connection and receive world state back; `main.ts` swaps calling `stepWorld` for that exchange. Because the sim already takes per-ship inputs and has no player concept, this is a transport change rather than a rewrite.

## Build and deploy

`npm run build` type-checks both packages and emits a static site to `packages/client/dist` with a relative base path, so it can be dropped on GitHub Pages, itch.io or any static host without configuration.

## Testing

The sim is tested with Vitest (`npm test`). Tests cover pilots (joining, spawn spacing, returning pilots keeping their ship, inputs only moving their own ship), the physics (acceleration, no drag, speed and spin limits, braking, angular momentum, heading wrap), each flight mode's assist behaviour, angle helpers, docking rules, and purity of `stepWorld`. The client is checked visually; there is no DOM test harness yet.

## Adding things

- **A new hull**: add an entry to `hulls.ts`. Nothing else.
- **A new station in the starter sector**: add it in `createStarterWorld`. When sectors become data files this moves there.
- **A new flight control**: add a field to `ShipInput`, a row in `bindings.ts`, map it in `InputController.sample`, and handle it in the sim. The controls panel updates itself. Update `docs/controls.md`.
- **A new interface control**: add a `UiAction`, a row in `bindings.ts`, and handle it in the callback in `main.ts`.
- **A new world event**: add a variant to `WorldEvent`, emit it from the sim, handle it in `ui.ts`.
