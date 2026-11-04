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
6. Anything that affects feel is a named constant in `constants.ts` or catalogue data (hulls, modules, weapons). No magic numbers inside functions.
7. Ship performance is never stored. Anything that needs it calls `shipStats(world, ship)`, which derives it from hull, fit and cargo.

### Modules

| File | Responsibility |
| --- | --- |
| `types.ts` | All world state types and the `ShipInput` contract |
| `vec2.ts`, `angle.ts` | Maths helpers, immutable |
| `constants.ts` | Tuning constants |
| `hulls.ts` | Hull catalogue (data): frame mass, structure, outline, flight limits, mount points and bonuses. Meridian Tern, Kessari Warrant, Tessaract Manifest, Aurel Tacet (sealed dev hull) |
| `modules.ts` | Module catalogue (data): type, size, mounts it fits, services it needs, mass, power, price, maker, stats |
| `loadouts.ts` | Named fits (data): the starter, NPC fits, the dev fit |
| `manufacturers.ts` | Manufacturer catalogue (data): name and race |
| `stats.ts` | Derived stats: `fitStats` for any hull and fit, `shipStats` for a ship as it flies, bonus rules |
| `fitting.ts` | Fitting rules and refits: `mountRefusal`, `planRefit` (previews), `fitModule`, `unfitModule`, `sellModule`, fees (`fitFee`), module storage per station, weapon states across refits |
| `flight.ts` | Flight computer: input and flight mode to thruster throttles. Assist and brake logic |
| `ship.ts` | Physics: applies throttles as acceleration, enforces hull speed and spin limits |
| `docking.ts` | Dock range check, pads (`freePadFor`, `padWorldPosition`, `launchPoint`, `onPad`), dock and undock transitions |
| `world.ts` | World construction, pilots joining (`joinPilot`), lookups (`pilotShip`), starter sector spawners |
| `stations.ts` | Starter system stations as data: orbits, markets, pads (`padRing`), ship mart stock; defaults for save migrations |
| `bodies.ts` | Starter system bodies as data: Calder (star), planet, moon, belt; `boundOrbit` for orbits whose period comes from the parent's gravity |
| `asteroids.ts` | The Scree's rocks: `screeAsteroids` (seeded, once), `asteroidStates`, `asteroidPositions` |
| `random.ts` | `seededRandom` for content generated once from a seed; the running sim uses no randomness |
| `nav.ts` | The nav computer: `navReadout` (frame, relative speed, gravity tier, orbit, predicted path), `predictPath`, `orbitElements`, `gravityTier` |
| `locks.ts` | Target locks (from the fitted radar and targeting computer): `lockSeconds`, `lockRefusal`, `stepLocks` (inputs, progress, drops), `weaponTarget` and `activeTarget` for what turrets engage |
| `rails.ts` | Rails, frames and gravity (`gravityAt`, `gravityFrom`, `gravityEase`, `surfacesNext`): body and station positions as pure functions of the tick (`bodyState`, `stationState`, `placeStations`, `circularPeriod`), carrying inside spheres (`tickRails`, `applyCarry`), the local frame (`localFrame`, `frameVelocity`, `relativeVelocity`), pirate homes on rails |
| `ownership.ts` | Owning versus flying: `pilotsAboard`, `shipPilot`, `isEmptyShip`, `isEscapePod`, `ownedShips` |
| `pilots.ts` | Pilot ship commands: `buyShip`, `boardShip`, `wakePilot` (and `respawnPilot`), `claimStarterShip`, their `...Refusal` previews, pod ejection, ship prices |
| `step.ts` | The tick, in a fixed order: stations move on rails; NPCs decide; ships dock, move against their local frame, are carried, bounce, fire, recharge, repair, ride pads; rams; projectiles; damage; destruction and departures; loot, wrecks, spawners |
| `collision.ts` | Ship against station hull and ship against ship: push apart, bounce, mass-shared momentum, impact damage |
| `combat.ts` | Fixed fire, turrets engaging the ship's target (slew, lead, fire tolerance), projectiles and hits, shields and damage, target leading |
| `weapons.ts` | Weapon catalogue (data): six gun families in three sizes plus the swivel, each with capacitor cost, ammunition good and damage type |
| `goods.ts` | Goods catalogue (data) |
| `save.ts` | Save format: versioned envelope, serialize, deserialize with validation, migrations, catalogue refresh |
| `trade.ts` | Price source interface and scripted prices, cargo space used, buy and sell commands |
| `factory.ts` | `buildShip`: the one place a ship is made from a hull and a fit (usually a loadout) |
| `lifecycle.ts` | Destruction into wrecks, loot and escape pods, NPCs leaving, wreck drift, loot and tractor beam, spawners |
| `ai/steer.ts` | NPC piloting: turn to a heading, steer to a velocity, arrive at a point, route round stations. Produces a `ShipInput` |
| `ai/watch.ts` | The Calder Watch: patrol beat, lock to identify, engage pirates, hold fire for bystanders |
| `ai/trader.ts` | Trader brain: station loop, docking and dwell |
| `ai/pirate.ts` | Pirate brain: prowl, hunt, withdraw; security zone rules |
| `ai/index.ts` | Runs every NPC brain against the start-of-tick world |
| `index.ts` | Public API |

### Ids

Every id in the world is deterministic: pilot ships are `ship-<pilot>-<n>`, NPC ships `npc-<spawner>-<n>`, and projectiles, wrecks and loot take numbers from `World.nextEntityId`. Nothing uses random ids, so two runs from the same start are identical.

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
| `persistence.ts` | World in browser storage (autosave, load, unreadable saves set aside), export and import as files |
| `settings.ts` | Client display settings, kept in browser storage, not in the world |
| `menu-panel.ts` | Game menu (F2): pilot name, settings, saving |
| `bindings.ts` | Every control in the game, in one table. Single source of truth for input and the controls panel |
| `input.ts` | Keyboard state sampled into a `ShipInput`; left clicks on the canvas go to a callback (target selection); interface actions go to another; pending target changes ride along with the next sample |
| `controls-panel.ts` | Developer controls panel (F1), generated from `bindings.ts` |
| `camera.ts` | World to screen mapping, smoothed follow |
| `render/starfield.ts` | Infinite hashed parallax starfield |
| `render/ship-art.ts` | Ships drawn from their fit: hull outline (dashed when empty), empty sockets (outfitting only), and each module's silhouette at its mount, tinted by its maker's race. Escape pods are drawn as orange lifeboats instead |
| `render/ship-thumb.ts` | Small fixed-size ship drawings for the ship mart and Your ships lists |
| `render/draw.ts` | Vector drawing of ships flying or on their pads (via `ship-art.ts`), empty ships faded, turrets, health bars, projectiles, wrecks, loot, tractor beam, explosions, stations, landing pads, security zones, the escape pod beacon, the nav marker (on screen or at the edge) and your swivels' arcs while hot |
| `market-panel.ts` | Station market table in the docked panel; reports trade clicks to `main.ts` |
| `outfitting-panel.ts` | Outfitting tab in the docked panel: ship drawing with selectable mounts and each weapon mount's reach (swivel arcs, fixed lines) with coverage in words, now and after stats from `planRefit`, gun stats (sustained damage, ammunition, capacitor), fit and remove; reports clicks to `main.ts`. Gun maths tested in `outfitting-panel.test.ts` |
| `ship-mart-panel.ts` | Ship mart tab in the docked panel: ships for sale with drawing, stats from `fitStats`, price, and Buy greyed with the `buyRefusal` reason; reports clicks to `main.ts` |
| `your-ships-panel.ts` | Your ships tab in the docked panel: every ship the pilot owns, where it is, condition, cargo, and Board greyed with the `boardRefusal` reason; reports clicks to `main.ts` |
| `ui.ts` | Docked panel tabs, the free Tern claim, death panel, toasts for world events and pilot command results (DOM, not canvas). Also `shipName`, `shipWhere` and `boardPrompt`, the words for a ship, where it is and what B would do |
| `hud/flight-hud.ts` | The flight HUD (DOM and SVG over the canvas): ship, zone, wallet and nav target top left, the warning slot top centre, the status dial (shield and hull rings, the segmented capacitor ring, speed and frame from `navReadout`), flight mode, weapons and fire group chips, weapon tiles (cooldown ring, supply bar and words, group, swivel state), the dock and board prompt |
| `hud/weapon-readout.ts` | Pure readings for the tiles and the capacitor: what a gun runs on and whether it can fire, the capacitor's tone, swivel arcs and coverage in sailors' words. Tested |
| `hud/contacts.ts` | The contacts list (O), bottom right: stations and bodies from the charts, ships within sensor range named by lock identity, your own ships; clicks lock ships or select stations and bodies |
| `hud/nav-target.ts` | The nav target (client state): Harbour by default, its position, distance, closing speed and arrival time, and the HUD's distance and time formats. Tested |
| `hud/target-card.ts` | The lock strip and the target card on the right edge, drawn only from `lockReadout` (nothing until a lock completes, then only what the targeting computer reads) |
| `hud/radar.ts` | The radar disc, bottom left (its own small canvas): north up, ships within sensor range styled by what locks have read, stations and bodies always, the screen's extent at the current zoom, the nav target and selection marked; clicking a ship locks it, clicking a station or body selects it |
| `hud/radar-geometry.ts` | Pure radar maths: placing points on the disc or its rim, what shows, picking the clicked contact, ring spacing. Tested |
| `hud/geometry.ts` | Pure helpers for the HUD: arc paths for gauges, fractions, closing speed, reload progress, hull silhouettes. Tested in `geometry.test.ts` (`npm test` in `packages/client`) |
| `hud/dom.ts` | DOM and SVG builders, and writers that touch the DOM only when a value changed |
| `style.css` | Theme variables and overlay layout |

### Rendering

Canvas 2D, vector line art, device-pixel-ratio aware. Colours are defined once as CSS variables and mirrored in `draw.ts`. There is no sprite pipeline and none is planned until the core loop is proven.

## Path to a shared world

Today the world runs inside the browser in `main.ts`. For the private-server model (see `docs/design.md`), the same sim moves into a Node server process on the host's machine, which also serves the client files. Clients then send their `ShipInput` over a connection and receive world state back; `main.ts` swaps calling `stepWorld` for that exchange. Because the sim already takes per-ship inputs and has no player concept, this is a transport change rather than a rewrite.

## Build and deploy

`npm run build` type-checks both packages and emits a static site to `packages/client/dist` with a relative base path, so it can be dropped on GitHub Pages, itch.io or any static host without configuration.

## Testing

The sim is tested with Vitest (`npm test`). Tests cover ships you own (owning versus flying, empty ships coasting, pirates ignoring empty ships and pods, pad layout sanity, smallest-fitting pad, noPad refusals, no shared pad in one tick, ship mart prices, buying, boarding docked and in space, pod ejection and waking, claiming the starter, the version 3 to 4 migration), modular ships (catalogue integrity, every loadout legal and within power, derived stat sums, bonuses only on full-size modules, mount type, size and service rules, buying, storing, fitting from storage, fees, selling, refusals leaving the world untouched, previews, weapon state across refits, refits changing how a ship flies, the starter outlasting the pirate raider), saves (round trip, a loaded world carrying on identically to the original, pilots' credits and cargo kept, current catalogues applied on load, bad files refused with a reason, migrations), trade (economy data sanity, buying and selling, refusals leaving the world untouched, buy limits, swappable prices, cargo mass slowing ships, cargo spill on death, credits surviving death, tractor respecting hold space), combat (the fixed beats turret rule across the catalogue, firing, turret slew, projectile hits without tunnelling, shields, docked repair, mass-based ramming and momentum conservation, station impacts, destruction into wreck and loot, respawn, tractor scooping, NPC respawn, pirate gunnery and retaliation, traders shooting back, damaged pirates leaving), NPCs over simulated minutes (steering settles, trader completes its loop without hitting anything, pirate hunts, holds standoff, gives up, never enters security), station collision, determinism (two runs are byte-identical), pilots (joining, spawn spacing, returning pilots keeping their ship, inputs only moving their own ship), the physics (acceleration, no drag, speed and spin limits, braking, angular momentum, heading wrap), each flight mode's assist behaviour, angle helpers, docking rules, and purity of `stepWorld`. The client is checked visually; there is no DOM test harness yet.

## Adding things

- **A new hull**: add an entry to `hulls.ts` with its outline and mounts. Nothing else.
- **A new module**: add an entry to `modules.ts`, and a silhouette in `render/ship-art.ts` only if it is a new kind. The catalogue tests check every loadout still fits.
- **A new station in the starter sector**: add it in `createStarterWorld`. When sectors become data files this moves there.
- **A new flight control**: add a field to `ShipInput`, a row in `bindings.ts`, map it in `InputController.sample`, and handle it in the sim. The controls panel updates itself. Update `docs/controls.md`.
- **A new interface control**: add a `UiAction`, a row in `bindings.ts`, and handle it in the callback in `main.ts`.
- **A new NPC type**: add a brain type to `NpcBrain` in `types.ts`, a module in `ai/` that returns an input and an updated brain, and a branch in `ai/index.ts`. Steer with the helpers in `ai/steer.ts` so it flies like everyone else.
- **A new world event**: add a variant to `WorldEvent`, emit it from the sim, handle it in `ui.ts`.
