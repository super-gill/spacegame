# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions are 0.x until a proper 1.0 release; minor versions may break saves.

## [Unreleased]

## [0.7.2] - 2026-11-03

### Added
- Outfitting says what each module is (engine, thruster package, reactor, shield generator, armour, cargo, fixed gun, turret) beside its brand name.
- Outfitting warns when the fit shown cannot thrust forward or cannot turn, and undocking in such a ship shows the same warning.
- `flightWarnings` in the sim, with a test.
- The lore workstream: `docs/coordination.md` has its brief.

### Fixed
- Clicks in outfitting were sometimes lost. Previewing a module could make the panel reflow, moving the button out from under the pointer between press and release. The panel is now anchored at the top and previews never change its layout.

## [0.7.1] - 2026-11-03

### Added
- Modules are owned. Unfitted and replaced modules go to the pilot's storage at that station, and fitting one you have stored there takes it out instead of buying a new one.
- Fitting and unfitting cost a handling fee of 5% of the module's price, each way.
- Stored modules can be sold back to the station for half their price.
- Outfitting shows how many of each module you have stored here and what fitting it costs, and a Stored here list with Sell buttons.
- Tests for buying, storing, fitting from storage, fees, selling and the save upgrade.

### Changed
- Removing or replacing a module no longer refunds half its price; it goes to storage instead.
- Save format version 3. Saves from 0.7.0 upgrade automatically, with empty storage for every pilot.

## [0.7.0] - 2026-11-03

Milestone 6a: modular ships.

### Added
- Hulls with mount points (type, size, position, facing, services), modules, manufacturers, loadouts and hull bonuses, all as catalogue data.
- Derived ship stats (`shipStats`, `fitStats`): mass, thrusts, shields, structure, cargo, power and weapons worked out from hull, fit and cargo whenever needed.
- Fitting rules and refits: mount type, size and services, power within reactor output, cargo still fits, credits. Refused changes leave the world untouched and say why.
- Hulls: Meridian Courier (civilian starter), Kessari Wedge (frigate), Tessaract Spine (hauler, six bays). The Sparrow stays as a sealed development hull.
- 17 modules across engines, thruster packages, reactors, shield generators, armour, cargo pods and containers, and small and medium fixed weapons and turrets, including a medium autocannon and a medium turret.
- Role and race bonuses on the three new hulls, applying only to full-size modules.
- Outfitting tab in the docked panel at Harbour Station: ship drawing with selectable mounts, stats now and after on hover, fit and remove with prices.
- Ships drawn from their fit: hull outline plus each module's silhouette at its mount, tinted by its maker's race; engine plumes from each fitted engine.
- `docs/ships.md`, `docs/races.md` and `docs/coordination.md`, with contributing rules for parallel chats.
- Tests for catalogue integrity, derived stats, bonuses, fitting rules and prices, refits, weapon state across refits, and the starter outlasting the pirate raider.

### Changed
- `HullSpec` is a frame only. Flight, physics, combat, cargo, collisions, NPC steering, loot and scrap all read derived stats.
- Weapons fire per mount, with hull damage bonuses applied; weapon sizes are S, M, L and XL.
- New pilots and respawns start in a Meridian Courier with the starter fit, including light armour.
- The NPC trader flies a Tessaract Spine and the pirate a Kessari Wedge in a raider fit; the Mule and Jackal are gone.
- Scrap on destruction comes from built mass (hull plus modules), so ships drop more scrap than before.
- Removing or replacing a module pays back half its price.
- The docked panel sits clear of the flight HUD and menu buttons on screens 900 pixels wide or more.

### Breaking
- Save format version 2. Saves from 0.6 and earlier are refused with a clear message and kept aside, and a new world starts.

## [0.6.0] - 2026-11-03

Milestone 5: persist.

### Added
- Versioned save format for the whole world (`save.ts`): serialize, load with validation, migrations, and clear reasons for refusing bad files.
- Autosave to browser storage every 10 seconds and when the tab is hidden or closed; the world loads on start.
- Export the world as a `.json` file and import one back; New game.
- Game menu (F2 or the Menu button): pilot name, show or hide ship labels, save status, Save now, Export, Import, New game.
- Client settings stored in the browser, separate from the world.
- Tests for saving, loading, refusals and migrations.

### Changed
- Hull, weapon and goods stats are taken from the code when a world loads, so tuning applies to existing saves.
- Keys typed into a text box no longer fly the ship.

## [0.5.0] - 2026-11-03

Milestone 4: trade.

### Added
- Goods catalogue: scrap, food, ore, machinery, medicine.
- Station markets with scripted buy and sell prices, read through a swappable `PriceSource`. Harbour and Ridge Outpost trade complementary goods, so there is a profitable run each way.
- Pilot credits (1,000 to start), kept when a ship is lost.
- Cargo capacity per hull (Sparrow 20, Mule 120, Jackal 15) and cargo mass: a loaded ship is slower to accelerate, turn and stop, and rams harder.
- Buy and sell commands while docked, all or nothing, with a reason when refused.
- Market screen in the docked panel; credits and cargo on the HUD; trade toasts.
- The NPC trader carries food and machinery.
- Tests for trade, economy data, cargo mass, cargo spill and capacity-aware scooping.

### Changed
- Destroyed ships spill 60% of each good aboard as loot (previously only scrap).
- The tractor beam only pulls when there is space in the hold, and takes only what fits.
- `collideShips` takes a function giving each ship's loaded hull.

## [0.4.0] - 2026-11-03

Combat controls rework: the mouse chooses, the keyboard flies and fires.

### Added
- Target selection: left click a ship, Tab cycles nearest first, Esc clears. Corner brackets on the target and a target readout (hull, range, closing speed, shields, structure).
- Weapons hot / cold (H). While hot, turrets engage the selected target on their own: they slew to its lead point at their turn rate and fire when on aim and in range.
- Lead marker for fixed guns: where to put the nose so shots meet the target.
- `WPN` line on the HUD; toasts for weapons hot and cold.
- `Ship.targetId`, `Ship.weaponsHot`, `ShipInput.selectTarget`, `ShipInput.toggleWeaponsHot`, `weaponsHotChanged` event.
- Tests for target selection, hot and cold turrets, range limits and turret tracking.

### Changed
- Space fires fixed guns. Brake is X only.
- Traders defend themselves through the same targeting as pilots.

### Removed
- Mouse firing (left and right click) and mouse turret aiming; `ShipInput.fireTurret` and `ShipInput.aimAt`.

## [0.3.0] - 2026-11-03

Milestone 3: fight.

### Added
- Weapons: fixed guns that fire along the heading (left click) and turrets that track the mouse pointer (right click). At the same size, fixed weapons always out-damage turrets; a test enforces it.
- Weapon catalogue (`weapons.ts`): pulse cannon (fixed) and light turret. Hulls gain shields, structure and a default fit.
- Projectiles with travel time, inherited velocity and range, hit-tested along their whole path.
- Shields that recharge after a delay, structure that does not, and repairs while docked.
- Ship to ship collision with momentum shared by mass: heavy ships can ram light ones safely. Hard station impacts now cause damage.
- Destruction: wrecks that drift and fade, scrap canisters, and a tractor beam (hold R) to scoop them into your hold.
- Respawn in a new Sparrow at Harbour after losing your ship.
- NPC spawners that replace destroyed or departed NPCs.
- Armed pirates that lead their target and fire when on aim, turn on whoever attacks them, break off when badly hurt, and leave the sector to repair.
- Armed traders that shoot back at a hunting pirate.
- HUD shield, structure and hold readouts; health bars on damaged ships; turret barrels and aim reticle; explosions; death panel.
- Tests for weapons, projectiles, damage, ramming, destruction, loot, respawn and NPC combat.

### Changed
- Pilot ship ids are now `ship-<pilot>-<n>`; `Pilot.shipsIssued` counts them.
- NPCs are created by spawners instead of directly in the starter world.
- Mule hull now carries a light turret.

## [0.2.0] - 2026-11-03

Milestone 2: company. The sector now has traffic and a threat.

### Added
- NPCs that fly through the same flight computer and physics as pilots, steering by pressing the same virtual keys (`ai/steer.ts`).
- Trader NPC (Mule hull) running a loop between Harbour Station and Ridge Outpost, docking at each.
- Pirate NPC (Jackal hull) that prowls off the lane, hunts lone ships outside station security, holds station on their tail, and gives up when they dock, reach security, escape or outlast it.
- Second station, Ridge Outpost.
- Station security zones (`Station.securityRadius`), drawn as a faint ring.
- Station hull collision with bounce and friction, and a `collided` event with impact speed.
- Mule and Jackal hulls, each with its own outline.
- Off-screen edge markers for stations and ships, with distance.
- HUD lines for the current security zone and for being hunted; toasts for hunts and hull contact.
- NPC colours and labels.
- `World.npcs` brain storage; `huntStarted`, `huntEnded` and `collided` events.
- Tests for steering, trader loop, pirate behaviour and security, station collision, and whole-sim determinism.

### Changed
- `stepWorld` runs NPC brains each tick; an input passed in for an NPC ship overrides its brain.

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
