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

## Stations and security

- Station hulls are solid. A ship that hits one is pushed back out and bounces: the inward part of its velocity is reflected at 40% (`HULL_RESTITUTION`) and sliding along the hull loses 10% (`HULL_FRICTION`). Impacts over 8 u/s raise a `collided` event carrying the speed, ready for damage in milestone 3. Ship to ship collision is not modelled yet.
- Every station has a security zone (`securityRadius`), drawn as a faint dashed ring. Inside it, pirates will not hunt you. Later, crimes witnessed inside it bring a security response. Outside every zone is open space.
- New pilots spawn inside the starter station's security zone.

## NPCs

- NPCs fly through exactly the same flight computer and physics as pilots. Their brains produce a `ShipInput` each tick, the same keys a person would press, so they have no extra thrust and can be outflown. They fly in rotation-assist mode and steer their own drift.
- Brains are plain data on the world (`World.npcs`), so NPC state saves with everything else. Every brain decides from the start-of-tick world, so the order they think in never changes the outcome, and the whole sim stays deterministic.
- **Trader**: flies a loop of stations, docking at each for a while. Routes round station hulls rather than through them. For now it is traffic and a target; it will carry cargo once trade exists.
- **Pirate**: prowls a loop near a home point off the trade lane. It hunts the nearest flying ship in detection range (1400) that is well outside every security zone, closes in and holds about 160 units off it, nose on. It breaks off if the target docks, gets close to a security zone, gets more than 2200 away, or after 45 seconds, then goes home and waits 20 seconds before hunting again. It treats each security zone as 300 units bigger than it is, so it turns away before crossing the edge.
- The pirate hull (Jackal) accelerates and turns faster than a Sparrow but has a lower top speed (320 against 350), so a pilot who sees it coming can run for security. With no weapons until milestone 3, a hunt is a pirate on your tail and nothing more.
- All behaviour numbers are named in `PIRATE_TUNING` and `TRADER_TUNING`.
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
