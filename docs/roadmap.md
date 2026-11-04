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
| 6c Living system | A star system on rails: a star, a planet, a moon, the belt, stations in orbit; spheres of influence and real gravity with free orbits; tiered gravity warnings; sensor range; Calder Watch patrols that hunt pirates; more traders; a third station (see `docs/system.md`) | In progress: part 1 (bodies, frames, moving stations, save 5) on `main`; part 2 (target locks, gravity, the third station, patrols) next |
| 6d Ship interface and navigation | Flight HUD with shield, hull and module gauges; radar and contacts by sensor range; nav target with distance and arrival time; system map; warnings; predicted path and orbit readouts. Mockups first | In progress: interface workstream, mockups done |
| 6e Weapons and capacitor | A capacitor that energy weapons and shield recharge draw on; projectile guns and missiles on ammunition; missile launchers; fire groups; turret arcs; modules across two mounts; maybe a mining laser | |
| 7 Law | Witnessed crime, reputation record, security response that escalates (the local watch, then its reserve, then the holder's navy, thinner the farther out; all ordinary, beatable ships, no galactic police), bounties; standing with NPC factions, including the four pirate factions from the lore; shooting escape pods as a crime | |
| 8 Map | Multiple systems, jump links, security bands, abstract NPC traffic; systems generated once from a seed; whether to add in-system faster-than-light travel; the Unsung as hostile ships in unknown space | |
| 9 Industry | Mining (starting in the belt), salvage, drones, manufacturing | |
| 10 Economy | Replace scripted prices with supply and demand | |
| 11 Shared world | Host-run Node server serving the client, friends join by address, per-pilot progress persisted with the world, pilot names, character creation (including starting as an Oru ward) | |

Version 1.0 is milestone 8 polished. Everything after that is content, plus the shared world.

The multiplayer rules in `docs/design.md` apply to every milestone from now on, so milestone 11 stays a transport change. In particular: no pausing the world, and saves (milestone 5) store the whole world with every pilot.

## Known gaps in 0.8.0

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
