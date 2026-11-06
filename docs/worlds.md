# Worlds: Live and Dev servers, the Universe and the Arena

Design agreed with Jason on 6 November 2026 (Lead 7). Not built yet: see "Order of work". Related: [shared-world.md](shared-world.md) for how a server sends each player their view; [hosting.md](hosting.md) for running the server; [coordination.md](coordination.md), ideas inbox, for how this came about.

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
2. Mockups on the canvas of the login switch, the mode screen and the arena setup; Jason picks.
3. The Arena world in the server, the mode screen and the arena setup, with Skirmish (moving today's admin arena over).
4. Waves and To the death.
5. The two-server setup: the batch files, the login switch, docs in hosting.md. Jason starts the dev server and the live server takes releases from then on.

## Open

- Scoring for Waves: kills, time survived, or both; whether scores are kept (a board needs saving, which the Arena does not do).
- Whether the Arena's enemies can be other than reference fits (any loadout, the NPC fits).
- Lore names for the Arena and its scenarios (a lore ask when building starts).
