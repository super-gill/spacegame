# The shared world (milestone 11)

**Status: agreed with Jason, 5 November 2026 (his answers are under "Decisions"); building.** Brought forward after 0.13.0: Jason wants to play in one world with friends.

## Goal

One world, running on Jason's PC, that he and his friends join from their browsers. Everyone flies their own character in the same Calder system at the same time. Hosting is over Tailscale at first, so only people on Jason's tailnet can reach it.

Already agreed (roadmap, milestone 11):

- A small dismissable connection meter in a corner, coloured by latency.
- Multiboxing is built in: several clients at once, each a fully separate character, chosen on connect. It may land a little after the first playable version.
- The code stays readable for a human developer: plain modules, clear names, comments that say why.

## How it works

### Who owns the world

The **server** owns the world. It is a small Node program (`packages/server`) that:

- runs the same sim the browser runs today, 60 ticks a second;
- serves the built client over HTTP, so friends open one address (for example `http://100.x.y.z:8080` on the tailnet);
- holds a WebSocket per connected client;
- applies what clients ask for, and sends each client what it can see;
- saves the world to a file on Jason's PC, every minute and when it shuts down.

The **client** stops changing the world itself. It sends two kinds of message:

- **Inputs**, many times a second: what the pilot's controls say (thrust, aim, fire, tiles). These already exist as `ShipInput`, keyed by ship.
- **Commands**, when the pilot does something: trade, refit, buy or sell a module, store or take goods, launch or recall drones, buy or board a ship, jettison. These already exist as pure sim functions (`buyGood`, `planRefit`, `storeGoods` and so on, each `(world, pilotId, ...) → { ok, world, event }`); the server runs them for the pilot who sent them and replies with the event or the refusal.

The server never trusts a client to say who it is beyond its character token: a command always runs for the pilot bound to that connection.

### What the server sends

Each client gets the world as seen from its ship, about 20 times a second:

- **Once, on connect:** everything that does not change (catalogues, bodies, stations' fixed parts) and the client's pilot.
- **Each update:** ships, loot, shots and missiles within the pilot's sensor range plus a margin; their own ship and pilot in full; rocks that changed (mined, split, crumbled, fallen in); events that concern them.
- The client draws between updates by interpolating, as it already does between ticks. Your own ship may feel a little laggy at first; a later step predicts it locally so steering feels immediate.

Why not send everyone's inputs and let every browser run the sim (lockstep)? It needs every browser to compute exactly the same numbers, and different browsers' maths functions can differ in the last digit, which grows into different worlds. The authoritative server avoids that.

Rough size: a few kilobytes per update near a busy station, tens of kilobytes a second per player. Fine for a home connection with a handful of friends. The meter shows latency, and the server can log bytes sent so we can see.

### Characters

- On connect, a client shows **character select**: the characters this browser knows, "Log in" with a name and key, and "New character".
- **A new character** gets a name (the box is filled with a suggested name, which the player can change; names are unique on the server, sensible length, no other rules) and a **key**: a secret the server makes. The key is shown to the player once, plainly, with a copy button and a note to keep it somewhere safe, and it is also kept in this browser's storage so they are not asked every time. Browser storage can be cleared, so the key the player keeps is what gets them back in, from any browser or device.
- **Multiboxing:** each connection is one character. Two tabs, two characters, playing at the same time. Later, one window may run several characters; nothing here blocks that, because a connection, not a browser, is bound to a character.
- **The same character twice:** logging in as a character that is already connected disconnects the older connection (it is told why), and the new one takes over.
- A character is a `Pilot` in the world, with ships, storage and credits, exactly as today. The sim already has no "player": nothing in it changes.

### No single-player mode

The game is server and client only (Jason). Playing alone means running the server on your own machine. Browser-storage saves and save export in the client go away; the server's save file replaces them. The fitter page stays a standalone tool: it needs no world.

### Players and operators

Every character is a **player** or an **operator** (Jason, 5 November 2026). Operators also get the admin controls (credits, spawning ships, the world's switches, which change the whole server); the server refuses admin commands from players, whatever their page sends. The first character made on a new server is an operator; the host makes others with `op <name>` and `deop <name>` in the server's console (`docs/hosting.md`).

## Order of work

1. **The command boundary.** Every world change in `main.ts` (about fifteen places) becomes a command message, defined once and applied by one function the server will run. While the server is being built the client applies them through a stand-in in the page, so the game keeps playing exactly as before at every step. Tests for the command messages.
2. **The server.** `packages/server`: tick loop, HTTP for the client, WebSocket, commands and inputs in, full snapshots out, saving to a file. Playable with two browser tabs on Jason's PC.
3. **Characters:** select screen, tokens, new character.
4. **Only what you can see:** updates filtered by sensor range, rocks sent when they change, static data once.
5. **The connection meter.**
6. **Feel:** your own ship predicted locally if the lag is noticeable over Tailscale.
7. **Hosting notes** for Jason: starting the server, the address to give friends, where the save lives, backing it up.

Steps 1 and 2 give a working shared world; 3 to 7 make it good.

## Decisions (Jason, 5 November 2026)

1. **Logging off in space:** the ship stays where it is for a short while, then disappears until the character returns, and comes back where it was.
2. **The starting world:** a new world. When the map comes, the world is made again anyway.
3. **No single-player mode:** server and client only.
4. **Death and pods:** as now (pod, respawn at Harbour) until law.
5. **Names:** players choose them; unique on the server; sensible lengths; suggested names fill the boxes.
6. **Keys:** shown to the player to keep, as well as stored in the browser, so a cleared browser does not lose a character.
7. **Several characters at once** must not be blocked; the same character logging in twice disconnects the older connection.

## Questions for Jason (answered above)

1. **Logging off in space:** what happens to your ship when you disconnect away from a station? Options: it stays where it is, vulnerable, for a minute and then vanishes until you return (EVE-like); or it stays in space for good; or you can only log off safely when docked.
2. **The starting world:** does the shared world start fresh, or from your current save (your ships and credits come with you as your character)?
3. **Single-player:** keep the browser-only mode alongside, as proposed? It costs little and keeps the fitter and offline play.
4. **Death and pods:** unchanged from single-player for now (pod, respawn at Harbour)? Law (who may shoot whom) comes later in milestone 7.
5. **Names:** characters choose their own name on creation; any rules (length, uniqueness on the server)?
