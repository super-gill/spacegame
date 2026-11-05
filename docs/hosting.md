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

## Characters and operators

- Everyone is a **player** (log in and play) or an **operator** (also the admin controls: credits, spawning ships, the world's switches). The server checks this for every admin command, not just the menu.
- The first character made on a new server is an operator. Make yours first.
- In the server's window, type commands and press Enter:
  - `op <name>`: make a character an operator.
  - `deop <name>`: make an operator a player again.
  - `who`: list characters, operators and who is online.
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
- `SPACEGAME_DATA`: the data folder.

## Development

`npm start` in one window, `npm run dev` in another: the page comes from Vite on port 5173, with live reload, and its WebSocket is passed through to the server on 8080.
