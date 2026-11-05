# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions are 0.x until a proper 1.0 release; minor versions may break saves.

## [Unreleased]

### Added
- Mining drones. They fly themselves, work only rocks you have locked, and cut ore for your tractor to collect. The prospector carries one, the hulk four (six fit its bay). Open the drone manager with N to launch, recall or send them to your active lock. Buy more at Harbour or Ridge; they go straight into your drone bay.

### Known
- Drones left out when you dock are lost, so recall them first.

### Fixed
- Drones plan their way round rocks instead of wedging themselves between them, slow down among rocks so they stop wrecking themselves, and skip rocks too hard for their lasers.

## [0.12.0] - 2026-11-05

Mining, first slice (9a): ore in the Scree's rocks, the prospector and the hulk, surveying, cutting, caches and the ore hopper; and two accessibility fixes from playtesting.

### Added
- Mining, part 1. Every rock in the Scree holds ore: mostly common ore, some richer ores, and the best only in bigger, harder rocks. Mined-out rocks crumble, and the belt slowly brings in new ones.
- A survey scanner: press its tile to pulse, and rocks worth a look light up for a few seconds. A better scanner reaches further and names the best ore in each rock.
- An UNLOCK button on the target card, so a lock can be dropped without the keyboard.
- Heading lock (V): with mouse steering, the nose holds its bearing while you move the pointer. A chip shows when it is on.
- Lock a rock by clicking it. A mining computer (the Assay) reads what it holds and how hard it is.
- Mining lasers: hold fire on a rock to cut ore free in canisters, and scoop them with the tractor. A laser only cuts rock no harder than it is strong.
- The Rook and Rivet Prospector, a mining cutter, sold at Ridge Outpost and Harbour.
- The Rook and Rivet Hulk, a big mining ship sold at Ridge Outpost: two heavy mining turrets, each given its own locked rock to cut, an eight-rock assay, and 1,100 units of ore hold. A turret lets its rock go whenever the lock goes.
- Three new ores to sell: Banded ore, Black ore and Glintstone. Lantern Works pays best.
- Soft rock cuts faster, and every rock has a seam: your mining computer shows it, and a beam on it cuts half as fast again.
- An ore hopper (an internal module): hold space for ore only, and its tile sets one ore it spits back out astern while your tractor takes in everything else. The prospector carries one.
- Ore caches (J): leave the ore aboard, and loose ore nearby, as a cache that lasts an hour and shows on your radar. Anyone can take it.
- The tractor tile says HOLD FULL, and a message says so once, when there is no room left to pull loot into.

### Changed
- Save format version 7: saves upgrade automatically, and their rocks are given ore.
- Plain ore is now called Nickel-iron, what the Scree is made of.
- Freed ore stays where it was cut and lasts 10 minutes; with gravity off, loose loot comes to rest. With a full hold, a tractor gathers canisters into a bunch beside you while you sit still, and leaves the bunch where it is when you move off.
- Lasers free ore in the rock's mix, so richer ore comes out from the first canister.
- The prospector carries 20 units of cargo plus 40 of ore.
- Station ship marts refresh from the game's data when a save loads.

### Known
- Ore and mining module names are provisional until the lore pass.
- No NPC miners, mining charges, hulks or drones yet (mining part 2).

## [0.11.0] - 2026-11-04

Milestone 6f, ship systems: everything a ship does comes from something fitted, in slots budgeted by hull class. (Release commit recorded in `docs/coordination.md`.)

### Added
- Ship systems: a flight computer, a pod bay and fire control are fitted systems. No flight computer means manual flight with no assist or mouse steering; a better one turns and settles faster. No pod bay means losing your ship leaves you with nothing. Fire control decides how many swivels you can run and how fast they track.
- Slots by hull class: weapon, utility (active kit) and internal (passive kit) slots, with any gun or swivel in any weapon slot.
- The tractor beam is a module (the starter has one); the afterburner is a module, held on Shift.
- Numbered tiles on the HUD: 1 to 9 select fire groups and switch modules.
- Weapon tiles name the gun and the ammunition it needs, so an empty gun says what to buy.

### Changed
- More ammunition: bigger boxes (rounds 100, shells 20, charges 40, missiles 8, chaff and flares 12) and bigger magazines, cheaper per shot. Boxes already in your hold count at the new size.
- Armour fits internal slots; dispensers utility slots.
- Station prices refresh from the game's data when a save loads, so rebalanced prices reach old saves.
- Save format version 6: saves upgrade automatically, with the new systems fitted free (a tractor too; an afterburner is a purchase).

### Known
- Electronic warfare is not built yet; it comes with law.
- NPCs do not use afterburners.
- The tile row and afterburner chip are plain stopgaps until the interface workstream's versions.
- Module names for the new systems are provisional until the lore pass.

## [0.10.0] - 2026-11-04

Milestone 6e, weapons and power, and the flight that playtesting settled. (Release commit recorded in `docs/coordination.md`; tags do not reach the remote through this session's git proxy.)

### Added
- The capacitor: energy guns, shield recharge and full-size sensors draw on your hull's pool, which the reactor refills fastest when it is low. The dial's inner ring shows it.
- Six gun types in three sizes across projectile (autocannon, artillery), energy (pulse and beam lasers) and hybrid (blaster, railgun) families, plus swivels.
- Ammunition is cargo: buy boxes of rounds, shells and charges, reload from the hold, run dry.
- Damage types: shields resist heat, armour resists rounds and shrapnel.
- Firing arcs and blind spots: the Manifest cannot shoot behind itself.
- Fire groups on 1 to 4; new guns join group 1, launchers group 2.
- Missiles and torpedoes: launchers fire at your active lock; radar seekers follow it, heat seekers chase the hottest thing ahead. A Tern can outrun a torpedo.
- Swivels shoot down missiles coming for you by themselves, hot or cold.
- Countermeasures: chaff, flares and decoys from four makers, dropped with C. Chaff may draw radar missiles off; flares outshine a small hull.
- Shields cover the bow and beams only; the stern is open, because the drive fires through it. Hits from behind go straight to the hull, and your shield is drawn as an arc round your ship.
- Admin (testing) in the F2 menu: grant credits, spawn any ship (the Aurel Tacet included), and switch gravity, orbits and manoeuvring speed.
- Suns are drawn in amber with a glow.

### Changed
- The ship turns to face the mouse, as in Flatspace; A and D strafe. The left button fires the selected group, the right button locks. Keyboard steering is a menu setting.
- Ships thrust only where the nose points: side and reverse thrusters only slow a drift. To reposition or stop, turn and burn.
- Gravity is off and the planets, moons and stations hold still. Bodies keep their solid surfaces and still carry what is near them.
- Pirates and the Calder Watch fly attack runs: in firing, away past you, and back round. Pirates open with missiles; the Watch carries them too; traders carry chaff.
- Ships are tougher and fights last longer.
- The Warrant's hull bonus is now to missiles.
- New pilots start just off Harbour, at rest.
- Saves stay at format version 5. Worlds from 0.9.0 load with gravity off and their orbits stopped where they stood, with nothing in flight lost.

### Known
- Pirates rarely destroy traders yet.
- Ships bump each other at low speed now and then in fights.

## [0.9.0] - 2026-11-04

Release commit `fac7702` on `main`. (Tags do not reach the remote through this session's git proxy; versions are identified by their release commits.)

Milestone 6c: the living system. Calder is a star system that moves, and every capability and every readout comes from a system fitted to your ship.

### Added
- Calder is a star system: the star, the garden world Fieldmark, its ice moon Lantern and the asteroid belt the Scree, all moving on their orbits. Harbour Station orbits Fieldmark and Ridge Outpost turns with the Scree, so routes change length as they move.
- Gravity. Planets and moons pull inside their sphere of influence; orbits are free, so a ship left coasting stays up; full assist hovers as far as your thrusters can, while rotation assist and manual fly orbits. Shots, loot and wrecks fall too. Hitting a planet hurts like hitting a station hull.
- Speed, full assist, braking and docking are relative to the station or body you are near. A docked ship rides its pad as the station moves.
- Lantern Works, a Corvane foundry round Lantern with outfitting: it wants ore, food and medicine and sells machinery cheap. Two Tessaract traders run the triangle between the three stations.
- The Scree: 180 solid rocks that block shots and give cover, with Ridge's approach kept clear.
- The Calder Watch patrols near the stations and fights pirates, and can lose. There is no Concord; law is local.
- Target locks, EVE style: lock ships with a click, hold several, Tab switches the active one, Esc unlocks. Locking takes time; turrets fire only at a completed lock. Lock time depends on the target's hull: freighters lock fast, small and stealthy frames slowly.
- Radars, targeting computers and nav computers are fitted systems. Range, lock count and lock speed come from what you fit; no radar sees nothing, no computer locks nothing. What a lock shows depends on your targeting computer: rough condition from a civil plotter, exact shields and guns from a Paragon Marksman, cargo from a Tessaract Tally. Your speed, orbit, gravity warnings and predicted path come from your nav computer; an Ito-Marr Chartvault sees two minutes ahead.
- Sensor range as a ship stat: ships beyond it are not shown.
- The flight HUD: a status dial with shield and hull rings and your speed, weapon tiles that show reloading, the zone and credits top left, a lock strip with a card per lock, and a target card for the active lock.
- Radar: a north-up disc showing ships within your sensor range, stations and bodies always, and what the screen covers; click a contact to lock it. Off-screen markers are gone.
- Zoom with the mouse wheel or = and -.
- Names from the lore for Calder's bodies, Lantern Works, the Calder Watch and the new modules; `docs/lore.md` gains the Landfall Accord, local law and why ships are built from systems.

### Changed
- Turn with A and D, strafe with Q and E; the arrows still turn.
- The old text readout is gone; position, heading and spin are no longer shown.
- Health bars over ships show only for ships you have locked with a combat computer.
- Harbour's machinery is dearer and its ore bid lower, so the trade triangle pays.
- NPCs fly the living system: round planets, rocks and security zones, in and out of moving stations.
- Save format version 5. Saves from 0.8.x upgrade automatically: pilots keep credits, storage and ships; docked ships stay on their pads; ships in space are towed to Harbour; old ships get the stock radar, plotter and nav computer free. Milestone 6c's later changes stayed inside version 5.

### Known
- An empty ship left at rest near a planet falls. Park in orbit, at a station or in open space.
- The Calder Watch is strong against the raider; balance is by test, not yet by play.

## [0.8.0] - 2026-11-04

Milestone 6b: ships you own.

### Added
- Own several ships. Harbour's ship mart sells the Meridian Tern, the Kessari Warrant and the Tessaract Manifest; each shows its stats and price, and Buy says why when it cannot.
- Your ships tab: every ship you own, where it is, its condition and cargo, and Board.
- Board your nearest empty ship with B: docked at the same station, or in space within 150 units and under 20 u/s relative. The HUD says when you can, or what to do first.
- Step out with G, pressed twice: you leave in an escape pod and your ship stays where it is, empty, to come back for.
- Landing pads round stations (Harbour 10, Ridge 6). Docking takes the smallest free pad that fits the hull, and is refused when none does. Docked ships sit on their pads, flown or empty.
- Escape pods. Lose your ship and you get away in a pod, a lifeboat with a beacon, and the HUD says you are in one. Lose the pod and you wake at Harbour: in a new pod if you own a ship, or in a free Meridian Tern if you own none. A pod at Harbour owning nothing can claim the free Tern.
- Empty ships drift with whatever momentum they had, can be shot and destroyed, and are drawn faded and dashed; yours are always labelled. Pirates leave empty ships and pods alone.
- Names from the lore for every hull, module, maker and fit. The Sparrow development ship is replaced by the Aurel Tacet.
- `docs/lore.md`, the game's canon setting and history.

### Changed
- Undocking launches you from your pad, along its facing.
- The docked panel keeps one width, so switching tabs never moves them under the pointer.
- Save format version 4. Saves from 0.7.x upgrade automatically: stations gain pads and docked ships are set down on one.

### Fixed
- Loading a save made after losing your escape pod, and before waking, crashed on start.

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
