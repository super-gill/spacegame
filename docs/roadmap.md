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
| 6c Living system | A star system on rails: a star, a planet, a moon, the belt, stations in orbit; spheres of influence and real gravity with free orbits; tiered gravity warnings; sensor range; Calder Watch patrols that hunt pirates; more traders; a third station (see `docs/system.md`) | Done, 0.9.0 |
| 6d Ship interface and navigation | Flight HUD with shield, hull and module gauges; radar and contacts by sensor range; nav target with distance and arrival time; system map; warnings; predicted path and orbit readouts. Everything shown about a ship or the system comes through the readouts (`lockReadout`, `navReadout`), the window rule. Mockups first | In progress: interface workstream; mockups, stage 2 (flight HUD, lock strip, target card) and stage 3 (radar) merged in 0.9.0; next stage 4, contacts and the nav target |
| 6e Weapons and power | The capacitor as a hull property, drained by energy and hybrid weapons, shield recharge and full-size sensors; four weapon families (projectile, energy, hybrid, missile) with short and long guns, ammunition as goods, damage types and resistances; hull bonuses by family; arcs and blind spots; fire groups; missiles and torpedoes with guidance and warheads; turrets as PDCs doing point defence by default; countermeasures (see `docs/weapons.md`) | Planned; part 1 (power and guns) next, part 2 (munitions) after |
| 6f Ship systems | Every remaining capability becomes a fitted system with a cost: the tractor beam, turret fire control, shield recharge timing (from the shield generator), flight assist quality (from a flight computer), escape pods (from a pod bay). Possibly fuel: tanks as modules, one fuel for thrust and later faster-than-light travel, scooped from stars (Jason to decide whether fuel bites in-system now or waits for the map) | |
| 7 Law | Witnessed crime, reputation record, security response that escalates (the local watch, then its reserve, then the holder's navy, thinner the farther out; all ordinary, beatable ships, no galactic police), bounties; standing with NPC factions, including the four pirate factions from the lore; shooting escape pods as a crime | |
| 8 Map | Multiple systems, jump links, security bands, abstract NPC traffic; systems generated once from a seed; whether to add in-system faster-than-light travel; fuel and star scooping if not in 6f; the Unsung as hostile ships in unknown space | |
| 9 Industry | Mining (starting in the Scree; ore read by a mining computer, gate-glass as a rare find), salvage (read by a salvage scanner), drones, manufacturing | |
| 10 Economy | Replace scripted prices with supply and demand | |
| 11 Shared world | Host-run Node server serving the client, friends join by address, per-pilot progress persisted with the world, pilot names, character creation (including starting as an Oru ward) | |

Version 1.0 is milestone 8 polished. Everything after that is content, plus the shared world.

The multiplayer rules in `docs/design.md` apply to every milestone from now on, so milestone 11 stays a transport change. In particular: no pausing the world, and saves (milestone 5) store the whole world with every pilot.

## Plan from here (4 November 2026)

1. 0.9.0 released (milestone 6c).
2. The interface workstream carries on with 6d: stage 4 contacts and the nav target, then the system map, warnings, and bodies, orbits and the path line; ship labels in space onto lock identity.
3. The lead plans 6e with Jason while 6d runs: missile guidance kinds, what the capacitor feeds, ammunition, countermeasures.
4. Then 6e, then 6f, then law (7), then the map (8).

## Known gaps in 0.9.0

- An empty ship left at rest inside a planet's or moon's sphere falls and hits the surface. Park in orbit, at a station or in open space; there is no orbit-hold autopilot yet.
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
- Fixed zoom.
- Key bindings are not remappable.
