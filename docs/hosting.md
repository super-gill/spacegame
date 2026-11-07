# Hosting a shared world

How to run the Spacegame server on your PC so you and your friends can play in one world (docs/shared-world.md says how it works inside).

## What you need

- Node.js 20 or newer on the PC that will host.
- The repo, with its packages installed: `npm install` in the repo folder.
- For friends elsewhere: Tailscale on your PC and theirs, in the same tailnet. Nothing is opened to the internet.

## Start it

From the repo folder:

```
npm run build
npm start
```

`npm run build` builds the game page; do it again after pulling new code. `npm start` runs the server. It prints the port and where it keeps its files, then runs until you stop it.

- **You:** open `http://localhost:8080`.
- **Friends:** open `http://<your PC's Tailscale address>:8080`, for example `http://100.101.102.103:8080`. Your Tailscale address is in the Tailscale app.

To stop it, press Ctrl+C in its window. It tells everyone, saves, and stops.

## Managing the server

One script stops, updates and starts the server (`scripts/server.mjs`), so a new build is one command. From the repo folder:

| Command | What it does |
| --- | --- |
| `npm run update`, or double-click `server.bat` | Stops the server if it is running, pulls the newest code, runs `npm install` and `npm run build` (which also builds the ship sprites, in a few seconds, only those that changed), then starts it in this window |
| `npm stop` | Stops it cleanly from any other window: everyone is told, the world is saved |
| `npm restart` | Stops it, then starts it in this window (no pull, no build) |
| `npm run status` | Says whether it is running |
| `npm start` | Starts it, as before |
| `server.bat ships` (or `node scripts/server.mjs ships`) | Rebuilds the ship sprites from `art/ships` and the game page, without stopping the server; add `--all` to redraw every sprite. `update` already does this, so you only need it after pulling art by hand (docs/ship-pipeline.md) |

How stopping works: when the server starts it writes `server.pid` (its process id) to the data folder, and it watches that folder for a `stop-request` file. `npm stop` writes that file and waits; the server kicks everyone, saves and exits, and removes `server.pid`. Only if it is still running after 20 seconds is it forced, which can lose up to a minute of play (the world saves once a minute).

Pulling needs git on your PATH. GitHub Desktop keeps its own git, so if `git` is not found the script says so and carries on without pulling: pull in GitHub Desktop first, then run `npm run update`. The pull is `git pull --ff-only`, so local changes in the repo stop it rather than being merged; nothing is built or started in that case.

After an update that changed the game page, players press Ctrl+F5.

## Letting friends in over Tailscale

Your PC is already a machine on your tailnet. The server listens on every network your PC has, so nothing in the game needs changing; friends just need to be able to reach your PC.

1. **Share your PC with each friend** (simplest): in the Tailscale admin console, Machines, find your PC, the "..." menu, Share. Send them the link; they accept with their own Tailscale account and see only your PC, without joining your tailnet. (Or invite them to your tailnet, which shows them all your machines.)
2. **Windows Firewall:** the first time the server runs, Windows may ask whether Node.js may accept connections. Allow it. If friends cannot connect, add an inbound rule allowing TCP port 8080 (Windows Defender Firewall, Advanced settings, Inbound Rules, New Rule, Port).
3. **The address to give them:** `http://<your PC's name>:8080` with MagicDNS (the name as it shows in Tailscale), or `http://100.x.y.z:8080` with your PC's Tailscale address.

Sharing your PC lets a friend reach any program on it that accepts connections, not just the game. Among friends that is usually fine; to limit them to the game's port, add an access rule in the Tailscale admin console (Access controls) allowing only port 8080 for shared users.

If another program already uses port 8080, start the game on another, for example `$env:PORT=8090; npm start` in PowerShell, and give friends that port.

## Only the game, at a Tailscale web address (recommended)

Instead of opening port 8080 to friends, let Tailscale Serve hand them the game at your PC's own HTTPS address, such as `https://your-pc.your-tailnet.ts.net`, and keep the game itself listening on your PC only:

1. Start the game for this PC only. In PowerShell: `$env:HOST="127.0.0.1"; npm start`
2. In another terminal, once: `tailscale serve --bg --https=443 8080`. It keeps running in the background, across restarts, until you turn it off with `tailscale serve reset`. If Tailscale asks you to turn on HTTPS certificates for your tailnet, do (admin console, DNS).
3. Give friends the `https://...ts.net` address it prints.
4. In the access rules, let shared users reach only port 443: `{ "src": ["autogroup:shared"], "dst": ["*"], "ip": ["443"] }`, and make sure no rule with `"src": ["*"]` lets them reach the rest.

Now a friend can reach only what Serve passes on (the game), and nothing else on your PC, because nothing else is listening to them. The game switches to a secure connection by itself when the page is HTTPS.

## Characters and operators

- Everyone is a **player** (log in and play) or an **operator** (also the admin controls: credits, spawning ships, the world's switches). The server checks this for every admin command, not just the menu.
- The first character made on a new server is an operator. Make yours first.
- In the server's window, type commands and press Enter:
  - `op <name>`: make a character an operator.
  - `deop <name>`: make an operator a player again.
  - `who`: list characters, operators and who is online.
  - `stats`: whether the server is keeping up (ticks a second, time per tick against the 16.7 ms budget) and how much each player is sent, over the last ten seconds. Run it during a fight if things stutter: if ticks go over budget, the server is the cause.
  - `save`: save now. `stop`: save and stop.
  The server refuses or allows their admin commands at once; the menu's admin controls appear or go when they reconnect.
- Each new character is shown a **key** once. With the name, it is how that character logs in from another browser or computer, or after a browser forgets it. Keep it somewhere safe.
- One tab plays one character. Two tabs can play two characters at once. Logging in as a character already playing elsewhere takes it over; the other tab is told.

## Where the world lives

In `packages/server/data` (or the folder in `SPACEGAME_DATA`):

- `world.json`: the world, saved every minute and when the server stops.
- `accounts.json`: the characters (names and key hashes; the keys themselves are not stored).
- `*.previous.json`: each file as it was before the last save.

To back up, copy the folder while the server is stopped. To start a new world, stop the server and move `world.json` aside (keep `accounts.json` to keep the characters).

## Settings

Set before `npm start`, for example `PORT=9000 npm start` (on Windows PowerShell: `$env:PORT=9000; npm start`):

- `PORT`: the port, default 8080.
- `HOST`: the network to listen on, default all of them; `127.0.0.1` for this PC only (with Tailscale Serve).
- `SPACEGAME_DATA`: the data folder.

## Development

`npm start` in one window, `npm run dev` in another: the page comes from Vite on port 5173, with live reload, and its WebSocket is passed through to the server on 8080.
