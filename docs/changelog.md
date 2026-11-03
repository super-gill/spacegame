# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions are 0.x until a proper 1.0 release; minor versions may break saves.

## [0.1.4] - 2026-11-03

Groundwork for the private-server model: a few friends on one shared world, each with their own progress. No networking yet.

### Changed
- The sim no longer has a single player. `World.playerShipId` is replaced by `World.pilots`; each pilot owns and flies their own ship.
- `stepWorld` takes a map of ship id to input and steps every ship in the world, not just one.
- `PlayerInput` renamed to `ShipInput`.
- The starter world starts empty; pilots are added with `joinPilot`.
- The client joins as a local pilot and only shows events about its own ship.
- Every ship in the world is drawn, not only your own.

### Added
- `Pilot` type, `Ship.ownerId`, `joinPilot`, `pilotShip`.
- Stable local pilot identity kept in browser storage (`identity.ts`).
- Spawn points spread round the starter station so pilots joining together do not overlap.
- Design doc section on the multiplayer model and the rules every milestone must keep.
- Roadmap milestone 11, shared world.
- Tests for pilots: joining, returning pilots keeping their ship, renaming, inputs only moving their own ship, whole-world save round trip.

### Removed
- `playerShip`.

## [0.1.3] - 2026-11-03

### Changed
- Physics is now pure Newtonian: removed space drag entirely. A ship left alone drifts and spins forever.
- Top speed and spin are hard physics limits per hull, applied in every flight mode.
- Brake now uses the real thrusters on each axis (forward motion is stopped by the weaker reverse engine) and overrides any flight keys held at the same time.
- Thruster flames are drawn from what actually fired, scaled by throttle, so assist and brake burns are visible.
- Key bindings moved to a single table in `bindings.ts`.

### Added
- Flight computer (`flight.ts`) with three modes, cycled with Z: full assist (default), rotation assist and manual.
- `FLT` flight mode readout on the HUD and a toast when the mode changes.
- Developer controls panel listing every control in the game, opened with F1, ` or the Controls button. Generated from the bindings table.
- `Ship.flightMode`, `Ship.thrusters`, `PlayerInput.cycleFlightMode`, `flightModeChanged` event.
- Tests for every flight mode, brake in all modes, and assist being limited by hull mass.

### Removed
- `SPACE_DRAG`, `SPACE_ANGULAR_DRAG` and `thrustFromInput`.

## [0.1.2] - 2026-11-03

### Changed
- Rotation now has momentum: Q/E fire rotation thrusters that add or remove spin, and the ship keeps turning after release until countered.
- Replaced heavy proportional drag (25% of velocity lost per second) with a small fixed space drag that only bleeds off stray drift and spin.
- Top speed and top spin are now flight computer limits per hull instead of a side effect of drag. Sparrow: 350 u/s and about 140°/s.
- Brake now also kills spin.
- Drag and braking stop at exactly zero instead of snapping below a threshold.

### Added
- `Ship.angularVelocity`; `HullSpec.maxSpeed`, `rotationThrust`, `maxTurnRate`.
- `ROT` spin readout on the HUD.
- Tests for angular momentum, speed and spin limits, drift bleed-off, and drag staying under 5% of thrust.

### Removed
- `DRAG_PER_SECOND` and `HullSpec.turnRate`.

## [0.1.1] - 2026-11-03

### Changed
- Flight is now keyboard only: Q/E (or Left/Right arrows) rotate the ship at the hull's turn rate. The mouse no longer steers, freeing it for targeting and interaction later.
- Strafe is now A/D only; the Left/Right arrows rotate instead.
- `PlayerInput.aimHeading` replaced by `turnLeft` and `turnRight`.

### Added
- Rotation thruster puffs at the nose while turning.
- Tests for rotation and the angle helpers.

### Removed
- Crosshair cursor over the game canvas.

## [0.1.0] - 2026-11-02

Milestone 1: fly and dock.

### Added
- Headless sim package: Newtonian flight model with mouse-aim heading, soft drag, braking; docking and undocking rules; starter sector with one station.
- Browser client: Canvas 2D vector renderer, infinite parallax starfield, fixed 60 Hz sim loop with render interpolation, keyboard and mouse input, HUD, docked panel, refusal toasts.
- Unit tests for the flight model, docking and sim purity.
- Documentation: design, architecture, controls, roadmap, contributing.
