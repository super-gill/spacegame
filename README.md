# spacegame

A single-player 2D free-roam space sim in the spirit of Flatspace, built for the browser.

Version 0.1.0. Pre-1.0: everything is subject to change and save games are not yet stable.

## Current state

Milestone 1, "fly and dock": one sector, one station, one ship. Newtonian flight with mouse aim, docking and undocking. No combat, trade or NPCs yet. See [docs/roadmap.md](docs/roadmap.md).

## Quick start

Requires Node 20 or newer.

```sh
npm install
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173).

## Controls

| Action | Keys |
| --- | --- |
| Aim | Mouse: the ship turns to face the cursor |
| Main engine | W or Up |
| Reverse thrust | S or Down |
| Strafe | A / D or Left / Right |
| Brake | Space or X |
| Dock / undock | F (when the station name shows in the HUD) |

Full detail in [docs/controls.md](docs/controls.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the client with hot reload |
| `npm test` | Run the sim's unit tests |
| `npm run typecheck` | Type-check every package |
| `npm run build` | Type-check and produce a static site in `packages/client/dist` |
| `npm run preview` | Serve the built site locally |

## Layout

```
packages/
  sim/      Headless game simulation. Pure TypeScript, no DOM, no timers.
  client/   Browser client. Vite, Canvas 2D, input, HUD.
docs/       Design, architecture, controls, roadmap, changelog.
```

The split matters: `sim` is compiled against the ES2022 library only, so any attempt to touch the DOM from it is a type error. Everything that makes the game *the game* lives there and is unit tested. The client only draws state and collects input.

## Documentation

- [Design](docs/design.md): what the game is and the rules that define it
- [Architecture](docs/architecture.md): how the code is organised and why
- [Controls](docs/controls.md)
- [Roadmap](docs/roadmap.md)
- [Changelog](docs/changelog.md)
- [Contributing](docs/contributing.md): conventions for code, commits and versions
