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
| 6b Ship mart | Station pads, docking to a pad, ships for sale parked on pads, buying and switching owned ships | Next |
| 6c Fit, continued | Oversized modules across two mounts, turret arcs, fire groups, ammunition, power management | |
| 7 Law | Witnessed crime, reputation record, security response, bounties | |
| 8 Map | Multiple sectors, jump links, security bands, abstract NPC traffic | |
| 9 Industry | Mining, salvage, drones, manufacturing | |
| 10 Economy | Replace scripted prices with supply and demand | |
| 11 Shared world | Host-run Node server serving the client, friends join by address, per-pilot progress persisted with the world, pilot names | |

Version 1.0 is milestone 8 polished. Everything after that is content, plus the shared world.

The multiplayer rules in `docs/design.md` apply to every milestone from now on, so milestone 11 stays a transport change. In particular: no pausing the world, and saves (milestone 5) store the whole world with every pilot.

## Known gaps in 0.7.2

- One world per browser. Several save slots would need a picker; export and import cover it for now.
- Your pilot identity is tied to this browser. Clearing site data makes you a new pilot in your own world (your old ship stays, flown by nobody). A way to carry your pilot over comes before the shared world.

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
- Module and hull names are placeholders.
- Fixed zoom.
- Key bindings are not remappable.
