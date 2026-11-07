# Ship and chart art

Source for the game's ship art and the Sol chart. Added 7 November 2026 by the lore chat at Jason's request, because until then this source lived only in that chat's session. It is not game code: nothing in `packages/` imports it, and the game does not build it. It produces the ship registry page, the hull handover (`docs/hulls.md`) and, when ship art goes into the client, the SVG the build rasterises.

## What is here

| Path | What it is |
| --- | --- |
| `registry/build.py` | The generator. Reads the registry data (every hull: builder, class, job, tier, patterns, marks), draws every hull from the parts libraries, writes the registry page and, optionally, `docs/hulls.md` |
| `registry/kod.py` | The shared `Hull` class (bodies, modules, layered detail levels, symbols) and the Kessari Orbital Defence hulls |
| `registry/vantage.py`, `mars.py`, `venus.py`, `specops.py`, `older.py` | The navies: Vantage fighters, Seraphine and Arcadia (Mars), Ishtar and Solace (Venus), the special operations (T3) hulls, the retired navy marks |
| `registry/belt.py` | Union Defence Works rebuilds (redrawn over the source hull), the clan hulls, the Grab |
| `registry/indep.py` | Meridian Yards and Corvane Heavy Industries combat hulls |
| `registry/civil.py`, `beltciv.py`, `venciv.py`, `pass4.py`, `pass5.py` | The civil yards: Tessaract and Arcadia; Belt Forge and Rook and Rivet; Solace, Halden, Arbor, Lavinia and the clans' civil hulls; Meridian, Corvane industry, the prototypes, drones and the Aurel; the gap-pass hulls |
| `registry/export.py`, `registry/turrets.py` | Stage 1 of the ship pipeline: writes `art/ships/` for the game (below); the turret and launcher pictures |
| `ships/` | What the game reads: geometry, bare hull SVGs, turrets, the mounts report. Written by `export.py`, committed |
| `registry/fitting.py` | Derives each hull's built-in equipment, role bonuses and frame notes (the fitting model in `docs/hull-terms.md`) |
| `registry/base/registry-base.html` | The page shell the generator fills (layout, styles, viewer script) |
| `registry/shot.js`, `shot-panel.js` | Playwright screenshots of hulls and of the detail panel, for checking art |
| `sol-chart/sol-chart.html` | The Sol Chart page: a hand-written page drawn from `docs/sol.md` |
| `sol-chart/shot.js` | Playwright screenshot of the Sol Chart at desktop and phone width |

## Requirements

- Python 3.10 or later, standard library only.
- For screenshots only: Node 18 or later and Playwright with Chromium (`npm i -D playwright`, then `npx playwright install chromium`; the lore chat's container has them preinstalled).

## Build the registry and the hull handover

From `art/registry/`:

```
python3 build.py base/registry-base.html out/registry.html ../../docs/hulls.md
```

- Argument 1: the page shell. Argument 2: the page to write. Argument 3 (optional): where to write the hull handover.
- Prints `<n> ships; <m> drawn; <size> KB`.
- `out/` is ignored by git. Never edit `docs/hulls.md` by hand; change the data or the art and rebuild.

## Export for the game (stage 1 of the ship pipeline)

The standards every hull must meet to go into the game (identity, frame, levels, mounts, kitbashes, valid SVG) are in `docs/ship-standards.md`.

From `art/registry/`, after any change to a hull's art:

```
python3 export.py
```

- Builds the registry into a temporary page and writes `art/ships/`: `ships.json` (each hull's outline, size, the mounts its picture marks, liveries, keyed by the game id where it has one), `svg/<id>-<livery>.svg` (the **bare** hull: marked mounts left out), `turrets/` and `turrets.json` (the weapon pictures, from `turrets.py`), and `report.md` (each game hull's mounts in the art against the game's).
- Prints `<n> hulls (... in the game, ... with marked mounts), ...`, or fails and writes nothing (no outline, a mount outside the hull, an SVG that does not parse, a hull exported before and now missing).
- **Commit `art/ships/` with the art change.** The game's build turns the SVGs into sprites (stage 2); nobody edits `art/ships/` by hand.

### Marking a mount

A weapon or PDC drawn on a hull is a **mount**: the game draws whatever is fitted there instead, turning a turret to aim. Mark it so the export records it and leaves it out of the bare picture:

- In Python: draw it inside `with h.mount("w1", "high", "M", x, y, facing):` (`kod.py`), or call `h.weapon("w1", "high", "M", x, y, facing)` for a socket and a stock turret in one go. `high` is a weapon, `ciws` a PDC; the size is the game's (S, M, L, XL); the id matches the game's mount (`w1`, `w2`, `d1`; see `art/ships/report.md`).
- In hand-written SVG (`base/registry-base.html`): put `data-mount="w1" data-type="high" data-size="M" data-x="..." data-y="..." data-facing="..."` on the group that draws it.

A hull only needs its mounts marked when it goes into the game; `report.md` says which mounts each game hull still lacks.

## Check the art

From `art/registry/`, after a build (the scripts read `registry.html` from the current folder, so run them inside `out/` or copy the page next to them):

```
cd out && node ../shot.js warrant kes-citation    # writes shot-<key>.png of each hull's stage
cd out && node ../shot-panel.js lav-cyclone       # writes fit-<key>.png of the detail panel; prints page errors
```

## How a hull is drawn

- Nose points `+x`. Units are world units; one unit is one screen pixel at zoom 1.
- A builder function per hull returns a `Hull` (or a subclass per yard) and a nominal radius. `all_art()` in each module returns `(defs, symbols, meta)`; `build.py` merges them.
- Each hull is emitted as four SVG symbols: `full` (all detail), `mid` (fewer details, for chips and lineups), `sil` (silhouette) and `rim` (outline). The page draws `mid` wherever many hulls show at once.
- Layering rules: bodies make the silhouette and the grid; fittings go on top; nacelles go under the hull; company bands are painted straight after the hull plate, under every fitting.
- The art rules (no basic shapes, nothing floats, no stern slashes, drones as machines, capitals carry no tool) are in `docs/fleet.md`, "Art direction".

## Adding or changing a hull

1. Add or change its `add(...)` line in `build.py` (key, builder, class column, name, job, character; legacy marks, patterns and base hull as keywords). Keys are catalogue ids where the game has one and never change.
2. Draw it in the module for its yard, add its note to that module's `NOTES`, and list it in that module's `all_art()`.
3. Build, screenshot, check nothing floats and nothing crops (set `h.ymax` or `h.xmin` when fittings extend past the bodies).
4. Rebuild `docs/hulls.md` with the third argument and commit both.

## Into the game, later

`docs/lore-handover.md`, "Ship art as an asset pipeline": keep this SVG as the source of truth and rasterise at build time to sprites at the client's zoom levels, packed into atlases. Never parse or filter SVG at runtime. Where that build step lives is the lead's call.
