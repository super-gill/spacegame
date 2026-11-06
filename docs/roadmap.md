# Roadmap

Milestones are ordered by what proves the game is fun soonest. Each one is playable on its own. Nothing from a later milestone is started until the current one feels right.

| Milestone | Scope | Status |
| --- | --- | --- |
| 1 Fly and dock | One sector, one station, Newtonian flight, docking | Done, 0.1.0 |
| 2 Company | One NPC trader on a loop and one pirate that hunts, simple AI, collision with station hull | Done, 0.2.0 |
| 3 Fight | Weapon module, damage, shields, wrecks, loot drops, tractor scoop | Done, 0.3.0 |
| 3a Targeting | Click and Tab targeting, weapons hot/cold, self-engaging turrets, Space fires fixed guns, lead marker | Done, 0.4.0 |
| 4 Trade | Cargo hold, two stations with scripted prices, buy and sell UI | Done, 0.5.0 |
| 5 Persist | Save and load (browser storage plus file export), settings | Done, 0.6.0 |
| 6a Modular ships | Hulls with mount points, modules, fitting rules, derived stats, fit-built visuals, outfitting screen; Meridian starter, Kessari wedge frigate, Tessaract hauler (see `docs/ships.md`) | Done, 0.7.0 |
| 6b Ships you own | Owning several ships, station pads, ship mart, boarding ships you own (docked or in space), escape pods (see `docs/ships.md`) | Done, 0.8.0 |
| 6c Living system | A star system on rails: a star, a planet, a moon, the belt, stations in orbit; spheres of influence and real gravity with free orbits; tiered gravity warnings; sensor range; Calder Watch patrols that hunt pirates; more traders; a third station (see `docs/system.md`) | Done, 0.9.0. Gravity and orbits are now off by default after playtesting (4 November); both stay as admin switches (`WorldRules`) |
| 6d Ship interface and navigation | Flight HUD with shield, hull and module gauges; radar and contacts by sensor range; nav target with distance and arrival time; system map; warnings; predicted path and orbit readouts. Everything shown about a ship or the system comes through the readouts (`lockReadout`, `navReadout`), the window rule. Mockups first | In progress, in focused interface passes (the standing interface workstream closed on 5 November; the lead keeps the client working meanwhile). Mockups, stage 2 (flight HUD, lock strip, target card) and stage 3 (radar) merged in 0.9.0; the interface pass (`docs/interface.md`) has built turret arcs, warnings with sounds, the Plot with colours and the nav target; next the selection window and the aim reticle. With gravity and orbits off, the orbit readouts and gravity warnings drop down the list; an aim reticle for mouse steering, munition warnings and the shield arc on the HUD move up |
| 6e Weapons and power | The capacitor as a hull property, drained by energy and hybrid weapons, shield recharge and full-size sensors; four weapon families (projectile, energy, hybrid, missile) with short and long guns, ammunition as goods, damage types and resistances; hull bonuses by family; arcs and blind spots; fire groups; missiles and torpedoes with guidance and warheads; turrets as PDCs doing point defence by default; countermeasures (see `docs/weapons.md`) | Done, 0.10.0. Then, from playtesting: shield arcs with an open stern and NPCs that fight for it (weapons.md, "Shield arcs") |
| 6f Ship systems | Every remaining capability becomes a fitted system with a cost: the tractor beam, turret fire control, shield recharge timing (from the shield generator), flight assist quality (from a flight computer), escape pods (from a pod bay). A slot pass per hull class, the EVE way: optional kit competes for general mounts and activated slots get HUD controls; basics get fixed mounts; specialised hulls dedicated ones. Electronic warfare in or just after. Fuel waits | Done, 0.11.0 (docs/ship-systems.md). Electronic warfare moved to law (7) |
| 6g Fitting overhaul | EVE-style fitting freedom: slot tiers (high, mid, low) by hull class, placement on the hull, undersizing allowed, buy then fit, a visual fitting window, the fitter and the audit; then costs that keep big ships honest (resolution against signature, turret speed) and rigs later (see `docs/fitting.md`) | Steps 1 to 4 done: 0.13.0 with the first brig and frigate, 0.15.0 the costs (no damage cuts: slower big shots and turrets, signature from kit, small-only point defence) and the arena; 0.16.0 the turret model (`docs/turrets.md`): every main gun a turret, spread and laser falloff, close-in weapon systems |
| 9a Mining (from 9) | A first industry slice, brought forward: a mining laser (on a mining hull's dedicated mount, or a general one), ore from the Scree's rocks, rock composition from a mining computer, ore to sell | First slice done, 0.12.0 (docs/mining.md): ore, survey, prospector, hulk, caches, hopper. 0.13.0: drones, NPC miners, breaching for gate-glass, the breacher, ore holds, sorting hoppers, loot claims. Next: NPC caches, then the money tuned in play |
| 7 Law | Electronic warfare (moved from 6f). Witnessed crime, reputation record, security response that escalates (the local watch, then its reserve, then the holder's navy, thinner the farther out; all ordinary, beatable ships, no galactic police), bounties; standing with NPC factions, including the four pirate factions from the lore; shooting escape pods as a crime | |
| 8 Map | Interdiction and warp disruption with faster-than-light travel. Multiple systems, jump links, security bands, abstract NPC traffic; systems generated once from a seed; whether to add in-system faster-than-light travel; fuel and star scooping if not in 6f; the Unsung as hostile ships in unknown space | |
| 9 Industry | Mining (starting in the Scree; ore read by a mining computer, gate-glass as a rare find), salvage (read by a salvage scanner), drones, manufacturing | |
| 10 Economy | Replace scripted prices with supply and demand | |
| 11 Shared world | Host-run Node server serving the client, friends join by address, a small dismissable connection meter coloured by latency, multiboxing as a built-in feature (several clients at once, each a separate character, chosen on connect), per-pilot progress persisted with the world, pilot names, character creation (including starting as an Oru ward) | Done in 0.14.0: server, characters with keys, players and operators, logging off. Still: updates by sensor range, full prediction, character creation beyond a name |

Version 1.0 is milestone 8 polished. Everything after that is content, plus the shared world.

The multiplayer rules in `docs/design.md` apply to every milestone from now on, so milestone 11 stays a transport change. In particular: no pausing the world, and saves (milestone 5) store the whole world with every pilot.

## Plan from here (after 0.17.0)

1. **0.15.0 released: fitting costs and the arena** (`docs/fitting.md`, "As built: step 4" and "The arena"). No damage cuts: big guns struggle against small ships by physics; point defence small only; turreted main guns; signature from kit; swarm fights in the lab; operators fight any fit against any other in the arena.
2. **0.16.0 released: the turret model** (`docs/turrets.md`, "As built" steps 1 to 4): every main gun a turret firing at the selected lock, traverse by size, hardpoint arcs; spread with range and laser falloff; close-in weapon systems on medium ships and up replacing swivels (save 15); stock big ships refit against the balance targets; steering by mouse or keys offered in the Controls panel. Next: Jason to choose from the items below.
3. **Shared world:** done on `main`: each player is sent only what their sensors can see (no other players' holds, credits or storage), your own shots drawn from your guns, and a dropped-updates bug fixed (`docs/shared-world.md`, "As built: only what you can see"). Still waiting: full prediction for your own ship, only if steering lags for friends.
4. **Drones:** done on `main`: full manoeuvring and a planner fix (`docs/drones.md`); for Jason to try in the belt.
5. Mining, later: NPC caches, the money tuned in play, heavier drones, more ships per size, an industrial command ship.
6. **The interface pass** (6d, agreed 6 November, `docs/interface.md`): built on `main`: turret arcs and aim, audible warnings with messages, the Plot with colours and the nav target, the selection window, aim reticle styles. **Released as 0.17.0** (6 November 2026).
7. **Worlds: Live and Dev servers, the Universe and the Arena** (agreed 6 November, `docs/worlds.md`): two servers (live on releases, dev on `main`), a mode screen after login, the Arena as its own unsaved world with ship, fit and scenario (Skirmish, Waves, To the death). Mockups first.
8. Then law (7, with electronic warfare), then the map (8).

## To check later (from playtests)

- **Drone pathfinding** (Jason, 5 November 2026; on `main` 6 November, waiting for his playtest): it was three things. The path: a drone close to a rock planned straight through it and rubbed along its face. The piloting: forward-only, drones stalled short of their spots. And sisters: a drone steering round a sister cutting on the same face was boxed in against the rock. Fixed the planner, gave drones full manoeuvring and let them ignore their sisters (`docs/drones.md`). In a lab run over the six most crowded patches (a hulk's four drones, still or drifting, or a prospector's one; 90 seconds each): impacts from 2 to none; time stalled short of a spot, hulk 41 to about 1 second in 360 drone-seconds, prospector 48 (one drone that never cut) to under 1.

## Known gaps in 0.12.0

- No NPC miners yet, so pirates have no miners to hunt and caches are safe in practice.
- Mining numbers (rates, hold sizes, ore prices) are tuned by test, not yet by long play.
- Ore and mining module names are provisional until the lore pass.
- The hulk only carries ore: no ordinary cargo, and it is very sluggish when full.
- Survey highlights, seams, beams, cache rings and turret tiles are lead stopgaps for the interface workstream.

## Known gaps carried from 0.11.0

- Electronic warfare is not built; it comes with law.
- NPCs do not use afterburners.
- The stopgap HUD draws the activation tiles and afterburner chip in plain boxes.
- New module names are provisional until the lore pass.

## Known gaps carried from 0.10.0

- Pirates rarely destroy traders: their hunts start close to Ridge and the Manifest outlasts the time they get (left untuned on purpose, see weapons.md).
- Ships that cannot sidestep sometimes bump each other at low speed in fights.
- The stopgap HUD shows munitions, decoys, the inbound warning and shield arcs in plain lines; the interface workstream's versions come with 6d.
- Launchers load the munition already in them, else the cheapest that fits; there is no picker yet. Dispensers drop one kind of charge at a time.
- No hull is big enough for bastion mode yet.
- Admin controls (credits, any ship, the rules) are open to anyone playing; fine on one machine, to be host-only in a shared world.

## Known gaps carried from 0.9.0

(With gravity and orbits off by default, the gaps about falling into planets, drifting off Ridge and gravity sounds only apply when they are switched back on.)

- An empty ship left at rest inside a planet's or moon's sphere falls and hits the surface (gravity on only). Park in orbit, at a station or in open space; there is no orbit-hold autopilot yet.
- The Calder Watch beats the raider easily. Pirates, the Watch and the traders are balanced by test and soak, not by play.
- A ship parked beside Ridge drifts off it slowly, because the Scree has no gravity to hold an orbit; full assist holds you.
- Bodies, orbits and the predicted path are drawn by the lead's stopgap in plain lines; the interface workstream's versions come with 6d.
- Ship labels in space still name NPCs directly; the radar and the target card already follow the window rule.
- Only Harbour has a ship mart. Lantern Works has outfitting but stocks the general catalogue; Corvane has no modules yet.
- No sound, and no warning sounds for gravity.

## Known gaps carried from 0.8.0

- One world per browser. Several save slots would need a picker; export and import cover it for now.
- Your pilot identity is tied to this browser. Clearing site data makes you a new pilot in your own world (your old ships stay where they were, empty). A way to carry your pilot over comes before the shared world.

- Station stock is unlimited and prices never move, so one profitable run can be repeated forever.
- NPC traders do not actually buy or sell; they carry a fixed cargo.

- No balancing pass: damage, shields and pirate accuracy are first guesses and have not been tuned against real play.
- Shooting the trader or anyone else is not a crime yet; station security is only a rule pirates obey (milestone 7).
- Wrecks cannot be salvaged yet (milestone 9).
- Pressing the same one-shot key twice within one sim tick (1/60 s) counts once.
- No sound.
- Only Harbour has outfitting, so all module storage is at Harbour for now. Modules cannot be carried or traded between stations until they join the economy.
- No keyboard way to select mounts in the outfitting screen.
- On screens 720 pixels tall the docked panel scrolls to reach the Undock button (F still undocks).
- The new hulls, modules and fights are balanced on paper and by test, not yet by hand.
- Place and faction names in the lore (Calder, the Meridian Arm and others) are still placeholders; catalogue names are final.
- Ships cannot be sold, and a ship mart's stock never runs out.
- Ships have no names of their own; they are called by hull and number (`Kessari Warrant #2`).
- Only Harbour has a ship mart, so every ship you buy starts there.
- The Aurel Tacet is drawn as a single outline, not yet in the Aurel style of floating segments.
- Key bindings are not remappable.
