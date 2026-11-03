# spacegame

A 2D free-roam space sim in the spirit of Flatspace, built for the browser. Play solo, or (later) with a few friends on a world one of you hosts, Minecraft style.

Version 0.7.0. Pre-1.0: everything is subject to change and save games are not yet stable.

## Current state

Milestone 6a, "modular ships": ships are built from a hull and the modules fitted to its mount points, and every bit of performance comes from the fit. Refit at Harbour Station's outfitting screen and watch the stats and the drawing change. One sector with two trading stations, an armed trader in a Tessaract hauler and a pirate in a Kessari frigate that hunts lone ships outside station security. Click or Tab to target; fixed guns on Space with a lead marker, and turrets that engage your target on their own while weapons are hot. Shields, ramming, wrecks, loot and a tractor beam. Cargo has mass. The world autosaves in the browser and can be exported and imported as a file. Pure Newtonian flight with three flight-assist modes. See [docs/roadmap.md](docs/roadmap.md).

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
| Menu (name, settings, save, export, import, new game) | F2 |

Press F1 in game for the full list. Detail in [docs/controls.md](docs/controls.md).

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
- [Ships and modules](docs/ships.md): how ships are built from hulls and modules
- [Races and manufacturers](docs/races.md): who builds what, and the decisions behind it
- [Architecture](docs/architecture.md): how the code is organised and why
- [Controls](docs/controls.md)
- [Roadmap](docs/roadmap.md)
- [Changelog](docs/changelog.md)
- [Contributing](docs/contributing.md): code, commit and version conventions
- [Coordination](docs/coordination.md): how the lead and workstream chats work together
- [Contributing](docs/contributing.md): conventions for code, commits and versions
