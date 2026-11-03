# Roadmap

Milestones are ordered by what proves the game is fun soonest. Each one is playable on its own. Nothing from a later milestone is started until the current one feels right.

| Milestone | Scope | Status |
| --- | --- | --- |
| 1 Fly and dock | One sector, one station, Newtonian flight, docking | Done, 0.1.0 |
| 2 Company | One NPC trader on a loop and one pirate that hunts, simple AI, collision with station hull | Done, 0.2.0 |
| 3 Fight | Weapon module, damage, shields, wrecks, loot drops, tractor scoop | Done, 0.3.0 |
| 3a Targeting | Click and Tab targeting, weapons hot/cold, self-engaging turrets, Space fires fixed guns, lead marker | Done, 0.4.0 |
| 4 Trade | Cargo hold, two stations with scripted prices, buy and sell UI | Next |
| 5 Persist | Save and load (browser storage plus file export), settings | |
| 6 Fit | Module slots with positions (turret arcs and blind spots), power grid and CPU, ammunition, fire groups, outfitting at stations, second hull | |
| 7 Law | Witnessed crime, reputation record, security response, bounties | |
| 8 Map | Multiple sectors, jump links, security bands, abstract NPC traffic | |
| 9 Industry | Mining, salvage, drones, manufacturing | |
| 10 Economy | Replace scripted prices with supply and demand | |
| 11 Shared world | Host-run Node server serving the client, friends join by address, per-pilot progress persisted with the world, pilot names | |

Version 1.0 is milestone 8 polished. Everything after that is content, plus the shared world.

The multiplayer rules in `docs/design.md` apply to every milestone from now on, so milestone 11 stays a transport change. In particular: no pausing the world, and saves (milestone 5) store the whole world with every pilot.

## Known gaps in 0.4.0

- No balancing pass: damage, shields and pirate accuracy are first guesses and have not been tuned against real play.
- Death costs nothing beyond the ship.
- Scrap has no use until trade.
- Shooting the trader or anyone else is not a crime yet; station security is only a rule pirates obey (milestone 7).
- Wrecks cannot be salvaged yet (milestone 9).
- Pressing the same one-shot key twice within one sim tick (1/60 s) counts once.
- No sound.
- No save; refreshing resets the sector.
- Fixed zoom.
- Key bindings are not remappable.
