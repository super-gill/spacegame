# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions are 0.x until a proper 1.0 release; minor versions may break saves.

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
