# Design

This document records what the game is and the rules that define it. It is the reference every feature is checked against. If code and this document disagree, one of them is wrong and it is usually the code.

## Pitch

You are one pilot in a large, mostly NPC-populated region of space, alone or alongside a few friends. You can trade, mine, fight, hunt bounties, salvage, explore or turn pirate. The sim does not care which. Crime pays better than honest work and carries more risk, and whether you get away with it depends on who saw.

The reference is Flatspace: top-down, Newtonian drift, loot you have to scoop, a world that feels bigger than you.

## Pillars

1. **Feel first.** Flying, stopping, docking and scooping must be satisfying before any system is added on top. Every milestone is judged on whether the game is fun to be in for ten minutes.
2. **One world, many jobs.** Industries bleed into each other. A miner carries cargo, a trader can be a target, a pirate becomes a bounty. No career classes.
3. **Emergent crime.** Nothing auto-flags a crime. It only counts if it was witnessed, or a distress call reached someone in time. Reputation is a record, not a stat.
4. **Data over code.** Hulls, modules, stations, sectors and economy tables are data files. Adding a ship should not need a code change.
5. **A small shared world, in the browser.** Played solo or by a group of friends on one world, Minecraft style. Each pilot's progress is their own. No accounts, no central servers, no infrastructure run by us.

## Flight model

- Pure Newtonian, linear and rotational. Thrust adds velocity and spin. There is no drag: a ship left alone drifts and spins forever.
- All accelerations are thrust divided by hull mass, so heavier hulls are slower to speed up, stop and turn with the same engines.
- Top speed and top spin are hard limits per hull (`maxSpeed`, `maxTurnRate`), enforced by the physics in every mode. At the limit, thrust can still change the direction of travel but cannot add magnitude. They exist because unbounded speed breaks a 2D game: objects arrive before they render, collisions tunnel, and every AI and weapon system would have to cope.
- A flight computer sits between the pilot and the thrusters. It turns input plus the ship's flight mode into thruster throttles; the physics applies them. Assist can only do what the real thrusters can, so a heavy hull is as slow to settle in assisted mode as it is by hand, and assist burns are visible.
- Flight modes, cycled with Z, in the spirit of Elite Dangerous flight assist:
  - **Full assist** (default): cancels spin when no rotate key is held, and eases drift to a stop on any axis the pilot is not using, at half thruster strength (`ASSIST_LINEAR_STRENGTH`) so it feels like drag rather than a handbrake.
  - **Rotation assist**: cancels spin only; drift is untouched.
  - **Manual**: fires only what the pilot asks for.
- Brake overrides everything: it fires the relevant thrusters at full strength against velocity and spin on every axis, in every mode.
- NPC ships use the same flight computer, so they fly by the same rules as the player.
- Weapon handling is undecided (fixed with assist, turrets, missiles and mines are all candidates). The mode system is meant to support all of them: fixed guns favour assisted flight, turrets and missiles free a pilot to fight while drifting in manual.
- The mouse is deliberately not used for flight. It is reserved for targeting, interacting with objects (scooping, hailing, selecting) and turret aim.
- Thrust is relative to heading: main engine forward, retro reverse, lateral strafe.

## Multiplayer: the private-server model

The target is a group of friends on one shared world, the way Minecraft servers work. Not an MMO, not matchmaking.

- **One host, a few friends.** The host downloads the game and runs a lightweight server on their own machine. Friends connect to it from a browser. The world lives on the host's machine and exists while the server is running.
- **Independent or together.** Pilots can be in different sectors doing different jobs, or fly together. The world does not care.
- **Progress is per pilot.** Ships, and later credits, cargo, reputation and criminal record, belong to a pilot record. A pilot who leaves and rejoins gets back exactly what they had. Nothing is shared between pilots unless they trade it.
- **Identity, not accounts.** Each browser keeps a stable pilot id that the server keys progress on. There are no passwords and no anti-cheat: it is built for friends who trust each other.
- **Single-player is a world with one pilot.** It runs the same sim through the same rules; only the transport differs.

### Rules that keep this possible, from now on

1. The sim has no "player". It has pilots and ships. `stepWorld` takes inputs keyed by ship id, and any ship can be flown by a person on this machine, a friend over the network, or an NPC.
2. Every event names the ship it concerns, so each client shows only its own.
3. A save is the whole world, every pilot included, never one pilot's career.
4. **The world never pauses and has no time compression.** Anything that only works if the world stops for one person is out. Docking menus, map screens and the like run while the world carries on.
5. Several sectors can be live at once, because pilots can be in different places. NPC traffic is instantiated per sector that holds at least one pilot.

### Not yet

Networking, the server process, join and leave UI, and choosing a pilot name. They come after the game is fun solo (see the roadmap). Until then the world runs inside the browser.

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

- MMO scale, public servers, matchmaking, accounts or anti-cheat.
- 3D, physics engines, or an ECS framework. Plain data and plain functions.
- Procedural story. The world is a sandbox.
