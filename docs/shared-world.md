# The shared world (milestone 11)

**Status: draft by the lead, 5 November 2026, for Jason to agree before building.** Brought forward after 0.13.0: Jason wants to play in one world with friends.

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

- On connect, a client shows **character select**: your characters on this server, and "New character" with a name.
- Each character has a secret token kept in that browser. Two tabs, two characters: that is multiboxing. Another browser or device needs the token, so there is an export and import for it in the menu.
- A character is a `Pilot` in the world, with ships, storage and credits, exactly as today. The sim already has no "player": nothing in it changes.

### Single-player

The browser game keeps working on its own, with no server. The client talks to the world through one small interface with two versions:

- **Local:** the sim runs in the page, as today, saved in browser storage.
- **Remote:** messages to and from the server.

The rest of the client does not know which it has. That keeps one client, keeps offline play and the fitter working, and makes the split easy to test.

### Admin

The admin switches (orbits, gravity and so on) work only for the host's character, set on the server.

## Order of work

1. **The command boundary, in the browser.** Route every world change in `main.ts` (about fifteen places) through the local version of the interface. No server yet; the game plays exactly as before. Tests for the command messages.
2. **The server.** `packages/server`: tick loop, HTTP for the client, WebSocket, commands and inputs in, full snapshots out, saving to a file. Playable with two browser tabs on Jason's PC.
3. **Characters:** select screen, tokens, new character.
4. **Only what you can see:** updates filtered by sensor range, rocks sent when they change, static data once.
5. **The connection meter.**
6. **Feel:** your own ship predicted locally if the lag is noticeable over Tailscale.
7. **Hosting notes** for Jason: starting the server, the address to give friends, where the save lives, backing it up.

Steps 1 and 2 give a working shared world; 3 to 7 make it good.

## Questions for Jason

1. **Logging off in space:** what happens to your ship when you disconnect away from a station? Options: it stays where it is, vulnerable, for a minute and then vanishes until you return (EVE-like); or it stays in space for good; or you can only log off safely when docked.
2. **The starting world:** does the shared world start fresh, or from your current save (your ships and credits come with you as your character)?
3. **Single-player:** keep the browser-only mode alongside, as proposed? It costs little and keeps the fitter and offline play.
4. **Death and pods:** unchanged from single-player for now (pod, respawn at Harbour)? Law (who may shoot whom) comes later in milestone 7.
5. **Names:** characters choose their own name on creation; any rules (length, uniqueness on the server)?
