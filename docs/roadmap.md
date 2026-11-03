# Roadmap

Milestones are ordered by what proves the game is fun soonest. Each one is playable on its own. Nothing from a later milestone is started until the current one feels right.

| Milestone | Scope | Status |
| --- | --- | --- |
| 1 Fly and dock | One sector, one station, Newtonian flight, docking | Done, 0.1.0 |
| 2 Company | One NPC trader on a loop and one pirate that hunts, simple AI, collision with station hull | Done, 0.2.0 |
| 3 Fight | Weapon module, damage, shields, wrecks, loot drops, tractor scoop | Next |
| 4 Trade | Cargo hold, two stations with scripted prices, buy and sell UI | |
| 5 Persist | Save and load (browser storage plus file export), settings | |
| 6 Fit | Module slots, power grid and CPU, outfitting at stations, second hull | |
| 7 Law | Witnessed crime, reputation record, security response, bounties | |
| 8 Map | Multiple sectors, jump links, security bands, abstract NPC traffic | |
| 9 Industry | Mining, salvage, drones, manufacturing | |
| 10 Economy | Replace scripted prices with supply and demand | |
| 11 Shared world | Host-run Node server serving the client, friends join by address, per-pilot progress persisted with the world, pilot names | |

Version 1.0 is milestone 8 polished. Everything after that is content, plus the shared world.

The multiplayer rules in `docs/design.md` apply to every milestone from now on, so milestone 11 stays a transport change. In particular: no pausing the world, and saves (milestone 5) store the whole world with every pilot.

## Known gaps in 0.2.0

- No ship to ship collision: ships pass through each other.
- A hunt has no teeth until weapons arrive in milestone 3.
- Station security is only a rule pirates obey; nothing enforces it yet (milestone 7).
- Pressing the same one-shot key twice within one sim tick (1/60 s) counts once.
- No sound.
- No save; refreshing resets the sector.
- Fixed zoom.
- Key bindings are not remappable.
