# Worlds: Live and Dev servers, the Universe and the Arena

Design agreed with Jason on 6 November 2026 (Lead 7). Step 3 built (Lead 8, 6 November 2026): see "As built: step 3" and "Order of work". Related: [shared-world.md](shared-world.md) for how a server sends each player their view; [hosting.md](hosting.md) for running the server; [coordination.md](coordination.md), ideas inbox, for how this came about.

## Why

Jason: players should go into a persistent world that only takes features once they have been tested in the dev world, and the arena should be its own constant game space, for players to fight and play with fits and for him to test combat and balance, never touching the persistent world.

A server runs one version of the code, so every world in it gets every change at once. "Tested in Dev first" therefore means **two servers running different versions**, not two worlds in one server.

## The two servers

| | **Live server** (players) | **Dev server** (Jason) |
| --- | --- | --- |
| Runs | The last release (a tag, such as `v0.17.0`) | `main`, every update as it lands |
| Worlds | **Universe** (persistent, saved) and **Arena** (not saved) | **Dev** (persistent, can be wiped) and its own **Arena** |
| Who | Everyone | Operators only |
| Where | Jason's PC, port 8080, behind Tailscale Serve as now | Jason's PC, port 8081, his own data folder |
| Characters | Its own | Its own: dev characters, ships and credits never reach the Universe |

No new code is needed to run two servers: the server already takes `PORT` and `SPACEGAME_DATA`. Jason keeps two folders: one that follows `main` (dev) and one checked out at the latest release tag (live). Promoting tested features to players is cutting a release and updating the live folder. Two batch files make that a double-click: `start-dev.bat` and `update-live.bat` (fetch, check out the newest tag, install, build, restart).

**Saves:** Jason's current save becomes the Dev world. The Universe starts fresh, as a copy of today's starter system (Calder), until the map (8) gives it generated systems. Both servers load and migrate saves the same way as today; a release that changes the save format migrates the Universe save when the live folder updates, so migrations must be tested on a copy of the real Universe save before a release.

## Screens

1. **Login** (today's character select) with a **server switch** at the top: `LIVE` and `DEV`. Each server hands out its own client, because a client only talks to the server it was built with (a protocol mismatch is refused). Choosing the other server sends the browser to its address, where its own login screen loads. The `DEV` choice is shown only where a dev address is configured (Jason's machine), so players never see a door they cannot use.
2. **Mode**, after a character is chosen: **Universe** and **Arena** on the live server, **Dev** and **Arena** on the dev server. On the live server, Dev is shown greyed for everyone and, for an operator, links to the dev server. Universe on the dev server is greyed ("this is the dev server").
3. **Arena setup**, on choosing Arena: **ship** (every hull in the catalogue, read from the code, so new ships appear by themselves), **fit** (the ready-to-fly reference fits for that hull, as the admin arena uses today; fitting your own comes later), and **scenario**. Then fly. Dying or leaving returns to the arena setup; nothing carries over.

## The Arena

A world of its own in each server: never saved, never touching the persistent world. Combat only, configurable at a moment's notice.

- **Scenarios** (first three, Jason):
  - **Skirmish:** pick the enemy fit and how many, as the admin arena does today.
  - **Waves:** survive as long as you can; each wave is bigger; a score.
  - **To the death:** an even one against one.
- **Space to fight in:** some rocks and obstacles, and a station that need not work (Jason's ideas).
- **Each player has their own arena** out of reach of the others for now (as today's in-world arenas are spaced apart). Player against player is for later.
- **Fed from the catalogue:** hulls, fits, munitions and ammunition come from the code, so everything Dev has is in its Arena and everything a release has is in the Live Arena.
- Enemies run dark like pirates; your weapons start hot; your hold is filled with ammunition for your fit (as today).
- Later: the fit sandbox (any hull fitted freely, spawn targets, live DPS, hit rate and time-to-kill readouts), modes like a swarm counter.

## What changes in the code

- **Server:** a `Game` per world (persistent world and Arena), each stepping on its own; a connection belongs to one world at a time; choosing a mode moves the player's connection between them. Views, diffs and events stay per world. The Arena world is created at start and never saved.
- **Sim:** the arena moves out of the persistent world: arena setup becomes an Arena-world command (ship, fit, scenario) open to every player there, and the in-world admin arena is retired. Scenario rules (waves, scoring, ending) are sim code with tests, like everything else.
- **Client:** the server switch on the login screen, the mode screen, the arena setup screen; returning to the setup after death or leaving.
- **Accounts:** characters stay per server. In the Arena a player flies as their character (their name shows), but nothing of the character changes.

## Order of work

1. Release 0.17.0 (the interface pass) so it is a clean point before the server changes.
2. Mockups on the canvas of the login switch, the mode screen and the arena setup; Jason picks. **Made** (6 November 2026): https://claude.ai/artifact/CieExkHLJkZieXoAAUgMfm, three working screens. **Approved as drawn** (Jason, 6 November 2026: "basically exactly what I was after"): the LIVE/DEV switch on the login screen, the three mode cards (Dev greyed for players), ship then fit then scenario then LAUNCH with nothing else to choose before launching, Waves scored on kills and time survived.
3. The Arena world in the server, the mode screen and the arena setup, with Skirmish (moving today's admin arena over). **Built** (Lead 8, 6 November 2026): see "As built: step 3".
4. Waves and To the death.
5. The two-server setup: the batch files, the login switch, docs in hosting.md. Jason starts the dev server and the live server takes releases from then on.

## Decided: no Dev world (Jason, 7 November 2026)

With all of Sol built, Dev as a world of its own is gone: the persistent world is the Universe (Sol) on every server, and the mode screen has two cards, Universe and Arena. A small disconnected scenario system was floated and dropped ("if we don't need it, bin it"). `ServerKind` stays for the live and dev server split, which is parked until the functional game (`roadmap.md`). This supersedes the decision below.

## Decided: no Universe until the map (Jason, 6 November 2026)

Jason: Calder, the world on his server today, is the dev world; the persistent Universe is built out with the map (8). So every server is a dev server for now: its persistent world is called **Dev** and is what the mode screen enters, and the Universe card is greyed ("comes with the map"). `SPACEGAME_SERVER=live` (unset means `dev`) is there for the live server when it comes: it names the persistent world the Universe and greys Dev instead. Until then the live server of "The two servers" waits; step 5's batch files and login switch move with it. **Open:** whether Dev is operators only now, as the table above says, or open to everyone on his server until the Universe exists (today it is open to everyone).

## As built: step 3 (6 November 2026, Lead 8)

**Server** (`packages/server/src`). `worlds.ts` makes one `Game` per world with `makeWorlds`: `universe`, loaded from and saved to the data folder as before, and `arena`, made fresh by `createArenaWorld` and never saved. Each `Game` takes `WorldHooks` for what differs (joining, leaving, what runs after each step): the Universe joins with a starter ship and keeps an away pilot's ship a while (away.ts); the Arena joins with no ship, clears a leaving pilot's arena and runs `stepArenas`. Both step every tick. Worlds are `persistent` and `arena` (`WorldId`); the server's kind (`ServerKind`, `dev` or `live`, from `SPACEGAME_SERVER`) names the persistent world (`persistentName`: Dev or Universe) and comes in `welcome`. A connection logs in (`welcome`, no world), then sends `enter` with a world id; the server takes it out of the world it was in, joins it to the new one and replies `entered` with the view. Inputs, commands, updates and events all go through the connection's world. `allowedIn` decides which commands a world takes: the Arena only `arenaStart` and `arenaLeave` (no trading, refitting, buying ships or admin), the Universe everything else; others are refused as `notHere`. The console's `who` and `stats` say which world each player is in. Protocol version 3.

**Sim** (`arena.ts`). The Arena world is the starter system's catalogues and space with no ships, NPCs, spawners or pilots. `joinArena` adds a pilot with no ship and no credits. `startArena(world, pilotId, fit, scenario)` (command `arenaStart`) puts them in a reference fit far out in empty space, each pilot in the first free slot along a line 50,000 units apart, so arenas never meet as pilots come and go; for a skirmish, `count` ships of `enemyFit` come for them, flown by the lab's scripts as before. `Pilot.arena` (`ArenaState`) holds the arena ship, centre, fit and scenario. `stepArenas` marks a fight `over` (`lost` when the pilot is no longer in the arena ship, `won` when every enemy is gone) and `ARENA_END_DELAY_SECONDS` (3) later clears it and raises `arenaEnded` (`result` won, lost or left); `leaveArena` (command `arenaLeave`) clears it at once. Clearing removes the enemies, the arena ship, the pilot's pod and anything else they own there, and their shots. `arenaHulls(world)` lists every hull with a reference fit, smallest class first, with its fits. The admin commands `adminArena` and `adminArenaEnd` are gone; `migrate16to17` ends any admin arena left in a save. Save version 17. Events naming a pilot (`pilotId`) now go to that pilot only.

**Client.** After character select, `mode-screen.ts` shows the three cards as drawn; Dev is greyed for everyone until step 5 ("operators only" for players, "not set up yet" for operators). Choosing Arena or Universe sends `enter`. In the Arena, `arena-setup.ts` shows over the empty arena whenever the pilot has no ship and no fight: ship, fit and scenario columns as drawn, Skirmish's enemy fit and count chosen in the scenario column (dropdowns), Waves and To the death greyed ("Coming next"), a summary line and LAUNCH. The last fight's result shows at the top; the last choices are kept for the tab. The escape-pod screens never show in the Arena. The menu (F2) gains a Mode section: Back to modes everywhere, and Leave the fight in the Arena; the admin section shows only in the Universe. **Leaving a world reloads the page**: the tab notes who was playing (`net/resume.ts`, session storage), logs them straight back in and opens the mode screen, so no state from one world leaks into the next.

**Checked** in Chromium on a fresh server: create a character, mode screen, Arena, a Walkout (Frigate anti-small) against two Warrant brawlers (locked on at once), Leave the fight (setup, "You left the fight"), Back to modes, Universe (starter ship, no setup); a Tern against eight Warrant glass cannons, back at the setup 8 seconds after launch with "Lost", launched again with the choices kept. No page errors. Tests: 12 arena tests in the sim (the world, hulls, skirmish, separate arenas, restart, leave, lose, win, refusals, the command, the migration), 2 server tests for the worlds.

**Not done in step 3:** space to fight in (rocks, a station that need not work: the arena is empty space as before); the server switch on the login screen and the LIVE/DEV tag (step 5); Waves and To the death (step 4).

## Open

- Whether Waves scores are kept (a board needs saving, which the Arena does not do). Scoring itself is decided: kills and time survived.
- Whether the Arena's enemies can be other than reference fits (any loadout, the NPC fits).
- Lore names for the Arena and its scenarios (a lore ask when building starts).
