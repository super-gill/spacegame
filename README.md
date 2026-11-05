# spacegame

A 2D free-roam space sim in the spirit of Flatspace, played in the browser in one shared world that one of you hosts, Minecraft style: a small Node server runs the world and everyone joins it from their browser.

Version 0.14.0. Pre-1.0: everything is subject to change and save games are not yet stable.

## Current state

A star system with three stations, traders, pirates, the Calder Watch and NPC miners; modular ships fitted EVE-style (high, mid and low slots); four weapon families, missiles and countermeasures; mining with drones and breaching for gate-glass. Since 0.14.0 the world runs on a server and friends join it over Tailscale (docs/shared-world.md, docs/hosting.md). See [docs/roadmap.md](docs/roadmap.md) and [docs/changelog.md](docs/changelog.md).

## Quick start

Requires Node 20 or newer.

```sh
npm install
npm run build
npm start
```

Open http://localhost:8080 and make a character (the first one on a new server is an operator). Friends on your tailnet open `http://<your Tailscale address>:8080`. Hosting, keys, operators and the server console: [docs/hosting.md](docs/hosting.md).

## Controls

| Action | Keys |
| --- | --- |
| Rotate | Q / E or Left / Right |
| Main engine | W or Up |
| Reverse thrust | S or Down |
| Strafe | A / D |
| Brake | X |
| Target a ship | Left click it, or Tab to cycle; Esc clears |
| Fire fixed guns | Space |
| Weapons hot / cold (turrets engage target) | H |
| Tractor beam | R |
| Cycle flight mode | Z |
| Dock / undock | F (when the station name shows in the HUD) |
| Refit | Outfitting tab while docked at Harbour Station |
| Controls panel | F1 or ` |
| Menu (your character and key, settings, admin for operators) | F2 |

Press F1 in game for the full list. Detail in [docs/controls.md](docs/controls.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Run the server (the world), serving the built client on port 8080 |
| `npm run dev` | The client with hot reload on port 5173, talking to the server started with `npm start` |
| `npm test` | Run the unit tests (sim, client, server) |
| `npm run typecheck` | Type-check every package |
| `npm run build` | Type-check and produce a static site in `packages/client/dist` |
| `npm run preview` | Serve the built site locally |

## Layout

```
packages/
  sim/      Headless game simulation. Pure TypeScript, no DOM, no timers.
  client/   Browser client. Vite, Canvas 2D, input, HUD; logs in and draws what the server sends.
  server/   The shared-world server: runs the sim, saves it, serves the client, WebSocket.
docs/       Design, architecture, controls, roadmap, changelog.
```

The split matters: `sim` is compiled against the ES2022 library only, so any attempt to touch the DOM from it is a type error. Everything that makes the game *the game* lives there and is unit tested. The client only draws state and collects input.

## Documentation

- [Design](docs/design.md): what the game is and the rules that define it
- [Ships and modules](docs/ships.md): how ships are built from hulls and modules
- [Races and manufacturers](docs/races.md): who builds what, and the decisions behind it
- [Architecture](docs/architecture.md): how the code is organised and why
- [Controls](docs/controls.md)
- [Roadmap](docs/roadmap.md)
- [Changelog](docs/changelog.md)
- [Contributing](docs/contributing.md): code, commit and version conventions
- [Fitting overhaul](docs/fitting.md): slot tiers, buying then fitting, the fitter (design for review)
- [Coordination](docs/coordination.md): how the lead and lore chats work together, and the handover routine
- [Contributing](docs/contributing.md): conventions for code, commits and versions
