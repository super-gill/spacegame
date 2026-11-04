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
- Weapons come in two kinds (see Combat); the flight modes suit both. Fixed guns favour assisted flight; turrets free a pilot to fight while drifting in manual.
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

## Saving

- A save is the **whole world**, every pilot included, never one pilot's career. It is the same file a shared-world host will load, so solo saves and server worlds are one format.
- The world autosaves to browser storage every 10 seconds and when the tab is hidden or closed. On start it loads; you carry on exactly where you were, docked or flying, with the same credits and cargo.
- **Export** downloads the world as a `.json` file; **Import** loads one. Importing someone else's world puts you into it as a new pilot (or as yourself, if you have flown in it before). **New game** starts a fresh world.
- The file has an envelope with a format name and a version. Older versions are upgraded by migrations, one step at a time. Pre-1.0, a change not worth migrating bumps the version and old saves are refused with a clear reason rather than loaded wrong. A save that cannot be read is set aside, never overwritten.
- Catalogues (hulls, modules, loadouts, manufacturers, weapons, goods) come from the code on load, not from the save, so tuning applies to existing worlds. A ship saves only its hull id and its fit; every stat is derived again on load. Stations, markets and everything else are kept as saved.
- Client settings (ship labels on or off) and your pilot identity and name live in this browser, not in the world.

## Docking

- A station has a dock range. Inside it, with speed below the docking limit, pressing dock parks the ship.
- Docked ships do not move and cannot be damaged (later: unless the station is under attack).
- Undocking places the ship just outside the station hull in the direction it is facing, with a small push.

## Combat

### Weapons

- The mouse is for choosing, not shooting: click a ship (or press Tab) to select it as your target. Flying and firing stay on the keyboard, so on bigger ships the pointer is free for other systems mid-fight.
- **Fixed** weapons fire along the ship's heading when you press Space. You aim by flying; with a target selected, a lead marker shows where to put the nose so shots meet it.
- **Turrets** engage your selected target on their own while weapons are **hot** (H toggles hot and cold). They slew towards the target's lead point at a limited rate and fire once on aim and in range. A small, fast ship crossing close can outrun a turret's slew: that is tracking, and it is what stops big turret ships automatically beating small ones.
- Weapons hot or cold exists so that selecting a ship never means shooting it. That matters once crime exists (milestone 7).
- Targeting is ship state (`Ship.targetId`, `Ship.weaponsHot`), set through ship inputs, so NPCs use it the same way: a trader under attack targets the pirate and goes hot.
- **The rule:** at the same size, a fixed weapon always does more damage per second than a turret. Aiming with the hull is a skill and pays for it. A test enforces this across the whole weapon catalogue.
- Weapons are data (`weapons.ts`) and reach a ship as weapon modules on its weapon mounts (see Ships). Each mount fires on its own cooldown. Sizes are S, M, L and XL, the same as mounts; a hull's role bonus to damage applies only to a weapon the full size of its mount.
- Projectiles are real objects with travel time and range. They inherit the firing ship's velocity, so leading a moving target matters. Hits are tested along each shot's whole path through a tick, so fast shots cannot skip through small hulls. Stations block shots.
- Missiles, torpedoes and mines are planned as further weapon kinds. With more than one kind fitted, number keys will select a fire group and Space will fire the selected group.
- Turrets have full 360 degree coverage for now. Mounts already have a position and facing on the hull; firing arcs and blind spots built from them come in milestone 6c, along with fire groups and ammunition.

### Damage

- Damage hits shields first, then structure. Shields recharge after a few seconds without damage. Structure does not recharge in space.
- Docked at a station, a ship's shields refill at once and its structure is repaired over time (free for now).
- At zero structure a ship is destroyed. It leaves a drifting wreck, drawn as the bare hull (salvage comes in milestone 9), and scrap canisters: half its built mass (hull plus fitted modules) in scrap, plus whatever scrap was in its hold.

### Collisions and ramming

- Damage from any impact comes from the ship's own change in velocity (delta-v), above a safe threshold. Gentle bumps do nothing.
- Ship to ship collisions conserve momentum and share it by mass. In a ram the heavy ship's velocity barely changes and the light ship's changes a lot, so a big hull can ram a small one and walk away. A loaded Tessaract Manifest ramming a Meridian Tern takes a fraction of the damage it deals.
- Station hulls are immovable, so a ship that hits one takes the whole bounce.

### Loot

- Scrap canisters drift and disappear after 90 seconds. Hold the tractor beam (R) to pull canisters within range towards you; they are scooped into your hold when they reach the hull. Two beams on one canister: the nearer ship wins it.
- Scrap has no use until trade arrives in milestone 4.

### Losing your ship

- The pilot gets away in an escape pod at the wreck. If the pod is destroyed too, they wake at Harbour Station: in a new pod if they own a ship anywhere, or in a free Meridian Tern if they own none. Waking is a pilot command, not a ship input, so it will work the same over a network. See `docs/ships.md`, 6b.
- The ship's cargo is lost (part of it spills as loot, see Trade). Credits are kept. Insurance and other costs are open questions.

## Stations and security

- Station hulls are solid. A ship that hits one is pushed back out and bounces: the inward part of its velocity is reflected at 40% (`HULL_RESTITUTION`) and sliding along the hull loses 10% (`HULL_FRICTION`). Hard impacts cause damage (see Combat).
- Every station has a security zone (`securityRadius`), drawn as a faint dashed ring. Inside it, pirates will not hunt you. Later, crimes witnessed inside it bring a security response. Outside every zone is open space.
- New pilots spawn inside the starter station's security zone.

## NPCs

- NPCs fly through exactly the same flight computer and physics as pilots. Their brains produce a `ShipInput` each tick, the same keys a person would press, so they have no extra thrust and can be outflown. They fly in rotation-assist mode and steer their own drift.
- Brains are plain data on the world (`World.npcs`), so NPC state saves with everything else. Every brain decides from the start-of-tick world, so the order they think in never changes the outcome, and the whole sim stays deterministic.
- NPCs come from **spawners** (`World.spawners`). A spawner keeps one NPC in the world and replaces it a while after it is destroyed or leaves (trader 30 s, pirate 45 s).
- **Trader**: flies a loop of stations, docking at each for a while. Routes round station hulls rather than through them. If a pirate hunts it, it keeps to its route and fires its turret at the pirate when in range. It never chases. It flies a Tessaract Manifest with four of its six bays fitted, carrying food and machinery.
- **Pirate**: prowls a loop near a home point off the trade lane. It hunts the nearest flying ship in detection range (1400) that is well outside every security zone, closes in and holds about 160 units off it, leads the target and fires its fixed gun when its nose is on the lead point. It breaks off if the target docks, gets close to a security zone, gets more than 2200 away, after 45 seconds, or when its own structure drops below 25%; then it goes home and waits 20 seconds before hunting again. It treats each security zone as 300 units bigger than it is, so it turns away before crossing the edge.
- A pirate that is shot or rammed turns on whoever did it (outside security), even while cooling down.
- A pirate below 60% structure will not start a hunt. When it gets home in that state it leaves the sector (no wreck) and its spawner sends a fresh one later. This is how pirates "repair" without a pirate base.
- The pirate flies a Kessari Warrant in a cheap raider fit: one light gun in a medium mount, a small shield and a pod for loot. It has a lower top speed than the starter Tern (320 against 340), so a pilot who sees it coming can run for security. Fighting back should win: a test holds the starter's survival edge over the raider at 1.4 times or more.
- All behaviour numbers are named in `PIRATE_TUNING` and `TRADER_TUNING`.
## World structure (planned)

Map modelled on EVE's security bands: busy, well-policed core; unregulated low-security fringe; lawless null space; possibly unknown space beyond. Sectors are discrete and linked. NPC traffic exists abstractly in sectors the player is not in and is only instantiated when the player arrives.

## Ships

The full design is in [ships.md](ships.md). In play today (0.7.0):

- **A hull is a frame.** Every bit of performance (thrust, turning, shields, structure beyond the hull's own, power, cargo, weapons) comes from modules fitted to its mount points. A bare hull cannot move.
- **Stats are derived, never stored.** Mass, thrusts, shields, structure, cargo space, power and weapons are worked out from hull, fit and cargo whenever they are needed (`shipStats`). A refit or a catalogue change applies at once.
- **Fitting rules:** a module goes only on a mount of a type it lists, no bigger than the mount, where the mount provides every service it needs (power, fire control, heavy load). Total power draw must stay within reactor output, and the cargo aboard must still fit.
- **Modules are owned.** Refitting is a pilot command while docked at a station with outfitting (Harbour has it; Ridge Outpost does not). Fitting a module you do not own buys it. Unfitting puts it in your storage at that station, and a module replaced by another goes there too. Fitting a module you have in storage there takes it out. Fitting and unfitting each cost a handling fee of 5% of the module's price (`FIT_FEE_FRACTION`), so swapping between owned modules is cheap but not free.
- **Storage is per station** and belongs to the pilot (`Pilot.storage`), so it survives losing a ship. A stored module is only reachable at the station it is stored at. Stored modules can be sold back to the station for half their price (`MODULE_RESALE_FRACTION`). Storage has the same shape as a cargo hold (item id to count) so that modules can later be carried and traded like goods.
- Shields and structure are capped to the new maximum after a refit; armour added while docked repairs up over time.
- **Bonuses live on hulls**, from their role and their race, and apply only to modules the full size of their mount. Today: Meridian Tern +25% cargo from pods; Kessari Warrant +15% weapon damage and +20% shield; Tessaract Manifest +25% cargo and +20% shield.
- **Hulls today:** Meridian Tern (civilian starter), Kessari Warrant (frigate, the pirate's hull), Tessaract Manifest (hauler, the trader's hull), and the Aurel Tacet, a sealed development hull that cannot be refitted.
- **Loadouts** are named fits (`loadouts.ts`). New pilots get the starter; spawners name the loadout their NPC flies.
- **The look is the fit.** A ship is drawn as its hull outline plus each module's universal silhouette at its mount. In flight, outlines keep friend-or-foe colours and modules are tinted by their maker's race.

How the star system is built (bodies on rails, gravity, orbits, detection) is in `docs/system.md`.

Still planned: oversized modules across two mounts, turret arcs, fire groups, ammunition and power management (6c); drones as a module class.

## Trade and economy

- **Goods** are data (`goods.ts`): scrap, food, ore, machinery, medicine. Each unit takes one unit of cargo space and adds its `unitMass` to the ship.
- **Cargo has mass.** A full hold makes a ship slower to accelerate, turn and stop, and makes it ram harder. A starter Tern with a full hold of ore is noticeably slower to stop. NPCs plan with their loaded mass too.
- **Prices** are per station, from the pilot's point of view: `ask` is what the station charges you, `bid` what it pays you. A station may not trade a good in one or both directions. Prices are read through a `PriceSource`, so the scripted tables can be swapped for a supply and demand sim (milestone 10) without touching trade rules or the market screen. Stock is unlimited for now.
- Today's stations: Harbour (farming and manufacturing) sells food, machinery and medicine cheaply and wants ore; Ridge Outpost (mining) sells ore cheaply and pays well for everything else. Both buy scrap. Tests enforce that no station pays more for a good than it charges, and that each direction between them has a profitable run.
- **Credits belong to the pilot**, so they survive losing a ship. **Cargo belongs to the ship.** New pilots start with 1,000 credits.
- **Buying and selling** happen while docked, as pilot commands (like respawning): all or nothing, refused with a reason if it cannot be done (not docked, not traded here, not enough credits or space, not enough aboard).
- **Losing your ship costs your cargo.** On destruction 60% of each good aboard (`CARGO_SURVIVAL_FRACTION`) spills as loot and the rest is lost. That is what makes piracy pay: the NPC trader carries food and machinery, and a pilot who kills it can scoop what spills. Whether that is a crime is milestone 7.
- The tractor beam takes only what fits: a full hold does not pull, and a nearly full one takes what it can and leaves the rest of the canister floating.

## Out of scope

- MMO scale, public servers, matchmaking, accounts or anti-cheat.
- 3D, physics engines, or an ECS framework. Plain data and plain functions.
- Procedural story. The world is a sandbox.
