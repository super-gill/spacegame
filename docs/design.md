# Design

This document records what the game is and the rules that define it. It is the reference every feature is checked against. If code and this document disagree, one of them is wrong and it is usually the code.

## Pitch

You are one pilot with one ship in a large, mostly NPC-populated region of space. You can trade, mine, fight, hunt bounties, salvage, explore or turn pirate. The sim does not care which. Crime pays better than honest work and carries more risk, and whether you get away with it depends on who saw.

The reference is Flatspace: top-down, Newtonian drift, loot you have to scoop, a world that feels bigger than you.

## Pillars

1. **Feel first.** Flying, stopping, docking and scooping must be satisfying before any system is added on top. Every milestone is judged on whether the game is fun to be in for ten minutes.
2. **One world, many jobs.** Industries bleed into each other. A miner carries cargo, a trader can be a target, a pirate becomes a bounty. No career classes.
3. **Emergent crime.** Nothing auto-flags a crime. It only counts if it was witnessed, or a distress call reached someone in time. Reputation is a record, not a stat.
4. **Data over code.** Hulls, modules, stations, sectors and economy tables are data files. Adding a ship should not need a code change.
5. **Single-player, in the browser.** No accounts, no server, no infrastructure. The build is a static site. Saves live in the browser or in a file the player downloads.

## Flight model

- Newtonian. Thrust adds velocity. Nothing stops you except opposing thrust.
- Soft drag gives every hull a terminal velocity so speeds stay sane (see `DRAG_PER_SECOND` in the sim constants).
- The ship turns to face the mouse cursor at a hull-specific turn rate. It does not snap.
- Thrust is relative to heading: main engine forward, retro reverse, lateral strafe.
- Brake is a convenience that fires thrusters against the current velocity.

## Docking

- A station has a dock range. Inside it, with speed below the docking limit, pressing dock parks the ship.
- Docked ships do not move and cannot be damaged (later: unless the station is under attack).
- Undocking places the ship just outside the station hull in the direction it is facing, with a small push.

## World structure (planned)

Map modelled on EVE's security bands: busy, well-policed core; unregulated low-security fringe; lawless null space; possibly unknown space beyond. Sectors are discrete and linked. NPC traffic exists abstractly in sectors the player is not in and is only instantiated when the player arrives.

## Ships (planned)

- Multiple manufacturers with house styles.
- A hull has an intended role but can be refitted outside it. Role is a consequence of mass, size and fitted modules, not a class lock.
- Core resource stats borrowed from EVE: power grid, CPU, capacitor and recharge.
- Drones are a module class, not a separate system.

## Economy (planned)

Scripted price tables per station in early versions, with a pluggable interface so a real supply-and-demand sim can replace them later without touching the trade UI.

## Out of scope

- Multiplayer of any kind. The sim is kept headless and deterministic because that is good engineering, not because a server is coming.
- 3D, physics engines, or an ECS framework. Plain data and plain functions.
- Procedural story. The world is a sandbox.
