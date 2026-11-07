# Ship art pipeline

Brief for Open Lanes step 2, the first fleet (Lead 9, 7 November 2026). Jason's call: the lead's preference stands, **bare hulls with turrets drawn on top**, and the whole path from the ships' code to the game's sprites is automated (below). This page says what each stage must produce so the game can take any number of hulls, and what the game does with it. Stage 1 can be coded by the lore chat (it owns `art/`) or whoever Jason gives it to; stage 2, the wrapper and the game side are the lead's.

## Why

The game has 11 hulls hand-written in `packages/sim/src/hulls.ts` (outline, mount points, stats). The art registry in `art/registry/` draws 192 and counting. Copying geometry by hand drifts as either side changes, and drawing SVG live is 3 to 5 times slower than drawing bitmaps (measured: 200 ships, 77 ms a frame as SVG against 25 ms as bitmaps, in a browser with no graphics card). So the art is the single source for **what a hull looks like and where things are on it**; the game keeps **the numbers** (mass, thrust, slots, price) in its own table. Neither is edited by hand from the other.

## The decision: bare hulls, turrets on top

A hull's picture has **empty mounts**. The game draws each fitted weapon as its own small picture at the mount, rotating to aim (main guns are turrets that traverse; `turrets.md`). Launchers, dispensers and light mining lasers are fixed and do not turn. A ship shows its fit, turrets visibly track, and one hull picture serves every fit. The registry page can keep its fitted look: "bare" is a separate variant.

## Two stages, fully automated (Jason, 7 November 2026)

Jason: "a code repo that is the ships, and an output pipeline that is the in-game sprites", fully automated, with the controls in his server wrapper (`scripts/server.mjs`, run by `server.bat`). The ships stay a folder in this repo (`art/`), not a repo of their own: one pull brings the game and its ships at matching versions, and the game's tests can check the two together. (A separate repo could be pulled in as a git submodule later if it ever needs its own access; nothing here stops that.)

| Stage | What | Needs | Run by | Output |
| --- | --- | --- | --- | --- |
| 1. Export | The Python generator writes each hull's geometry and its **bare** SVG | Python 3.10+, standard library only | Whoever changes a ship (the lore chat, Jason), with the art change | `art/ships/`, **committed**: text, so a diff shows what changed |
| 2. Sprites | Each SVG turned into PNGs at three sizes | Node only (`@resvg/resvg-js`, a dev dependency; no browser) | Automatically: `npm run build`, so the wrapper's `update` too; and `npm run ships` (the wrapper's `ships` command) to force it | `packages/client/public/ships/`, **built, never committed** |

So Jason's server stays Node-only, as it is today, and never needs Python or a browser. A stage-2 run skips any hull whose SVG has not changed (a hash beside each output), so an update where no ship changed costs nothing; a full rebuild of all 211 drawings takes about 16 seconds (measured with `resvg`, 7 November).

## Stage 1: what the export writes, in `art/ships/`

One command from `art/registry/`: `python3 export.py` (it can share `build.py`'s data and drawing code). It fails, writing nothing, if any check below fails.

### `art/ships/ships.json` (geometry; the game reads it directly)

One entry per hull, keyed by its catalogue id (the `add(...)` key in `build.py`; **keys never change**). All lengths in world units, nose along +x, origin at the hull's centre (the point it turns about).

| Field | What |
| --- | --- |
| `key` | Catalogue id |
| `name`, `maker`, `class`, `power` | As the registry has them |
| `radius` | Bounding radius, for collisions and culling; the symbols already use it as their frame (`viewBox` of plus and minus the radius) |
| `outline` | The silhouette as a simple polygon, at most 24 points, clockwise; for hit shapes, the radar and fallbacks |
| `mounts` | The places the picture shows something can sit: `id` (stable within the hull, in the game's scheme: `w1`, `w2` for weapons, `d1` to `d4` for PDCs, `e1` for engines; see `hulls.ts`), `type` (the game's `MountType`: `high` for a weapon, `ciws` for a PDC, `engine`), `size` (`S`, `M`, `L`, `XL`), `x`, `y`, `facing` (radians), `arc` (radians, for turrets; absent is all round). The slots a picture does not show (`mid`, `low`, `core`, and the fixed systems `nav`, `radar`, `computer`, `flight`, `fireControl`, `podBay`) stay in the game's table: their positions only matter to outfitting, which can lay them out itself |
| `engines` | Each nozzle: `x`, `y`, `width`, for plumes |
| `liveries` | The livery names this hull has (`navy`, `civ`, `udf`, `coop`) |

The drawing helpers already know where guns, PDCs and engines go (`Hull.gun`, `Hull.pdc`, `Hull.engines` in `kod.py`). Change them to **record** a mount or engine (type, size, position, facing) as well as draw it, and to leave guns and PDCs out of the bare variant (engines stay drawn: they are part of the hull). A gun's size must be given at the call, not guessed from how big it is drawn.

### `art/ships/svg/<key>-<livery>.svg` (bare hulls)

One self-contained SVG per hull and livery: the shared `defs` it uses, its **bare full** symbol, and a `<use>` with an explicit `width` and `height` (without them a renderer draws the symbol at the wrong size: seen in the spike). Nose to the right, centred on the origin, frame of plus and minus the radius.

### `art/ships/turrets/<gun>-<size>.svg` and `turrets.json`

One per gun the game has, by its weapon id without the size (`autocannon`, `artillery`, `pulse-laser`, `beam-laser`, `blaster`, `railgun`, `ciws`, the mining lasers, the launchers and dispensers; see `weapons.ts`) and size (`S`, `M`, `L`), so `autocannon-m.svg`, drawn pointing along +x with the pivot at the origin; `turrets.json` gives each one's frame and barrel length. The style is the registry's `gun` and `pdc` grown into families; the lore chat's art direction (`fleet.md`) rules.

### Checks the export fails on

A hull with no outline, no mounts it should have, a mount outside its outline, a listed livery with no SVG, a key that changed or vanished, or an SVG that does not parse. (Every drawing parses as of 7 November: seven hulls, the UDF rebuilds and two Belt clan ships, gave `stroke-linecap` twice through one helper call in `belt.py`; Lead 9 fixed it.)

## Stage 1 as built (7 November 2026, Lead 9)

`art/registry/export.py`, run as `python3 export.py`. Differences from the plan above, found on the way:

- **It reads the art as SVG**, from a temporary build of the registry, not from the Python objects: some hulls are hand-written in `base/registry-base.html` (the Tern, the Walkout, the Ark), and every hull ends up as SVG however it was made.
- **A mount is a marked group**, not something the drawing helpers record on their own: only four hulls draw guns through `Hull.gun` and `Hull.pdc`; every yard paints its guns its own way. So a gun is wrapped where it is drawn, `with h.mount("w1", "high", "M", x, y, facing):` in Python (`kod.py`), or the same `data-mount` attributes on a hand-written group. The export records each marked group and leaves it out of the bare picture. **Mounts are marked hull by hull as hulls go into the game**; outlines, sizes and bare pictures come out for every hull without any marking.
- **Keys:** `ships.json` is keyed by the game id where the registry has one (its `id`: the Tern is `meridian-courier`, the Warrant `kessari-wedge`, the Walkout `union-frigate`), else by the registry key; each entry keeps `registryKey`.
- **Outlines are convex** (the silhouette's convex hull, at most 24 points): good for hit shapes and the radar; concave detail stays in the picture. A hull with an empty silhouette (the Belt Forge Lodestar's builder declares no body) takes its outline from the full drawing's solid shapes.
- **Glows stay in the bare picture:** `build.py` already drops their blur, and they read as engines idling.
- **Turrets are a first pass** (`turrets.py`): 30 pictures, one per gun and size the game has, in the registry's turret style with a family look (twin barrels for autocannons, a long one for artillery, a lens for lasers, rails, launcher boxes). The lore chat owns them and should restyle freely, keeping ids, pivot and nose.
- **`report.md`**: for every game hull, its mounts in the art against `hulls.ts`. The art was redrawn after the game's mounts were set against stand-in outlines, so most game hulls do not match yet (the Warrant's art has two guns where the game has four mounts): settling them is step 2, with Jason, hull by hull.

First run: 192 hulls (11 in the game), 208 bare pictures (16 hulls have a civilian livery), 30 turrets, 4.7 MB of SVG; every picture renders with `resvg` (all 208 in 16 seconds). Marked so far: the Tern (`w1` to `w3`) and the Walkout (`w1` to `w6`; its PDCs are not drawn), both hand-written, both matching the game within a unit.

## Stage 2: what the sprite build writes

`scripts/ships.mjs` (Node), run by `npm run ships` and before the client's build. For every SVG in `art/ships/`, PNGs with transparency in `packages/client/public/ships/<key>/<livery>-<size>.png` and `packages/client/public/ships/turrets/<gun>-<size>.png`, plus `packages/client/public/ships/sprites.json` with each file's pixel size and the pixel that is the origin. Separate files, not atlases: the game loads a hull's pictures the first time it is seen.

| Size | Scale | Used for |
| --- | --- | --- |
| `flight` | 3 pixels per world unit, longest side capped at 2,048 | Flying, at every zoom (the camera runs 0.55 to 1.5; 3 covers the closest on a high-resolution screen) |
| `far` | 1 pixel per world unit, at least 24 pixels | Zoomed right out, crowds |
| `card` | Fits a 256 by 256 box | Outfitting, the target card, the ship mart, lists |

Turrets at 3 pixels per world unit only. Deterministic: the same SVG gives the same PNG. Skips a file whose source has not changed. Fails loudly, naming the hull, if an SVG will not render.

## Stage 2 as built (7 November 2026, Lead 9)

`scripts/ships.mjs`, run by `npm run ships` and by `npm run build` (between the sim and the client, so the client's build carries the sprites). Writes `packages/client/public/ships/` (ignored by git): `<id>/<livery>-flight.png`, `-far.png`, `-card.png`, `turrets/<gun>-<size>.png`, and `sprites.json` (per hull its radius and, per livery and size, the file, its pixels and world units per pixel; per turret the same and its barrel length; every picture is square and centred on the origin). A hash of each SVG and size is kept in `hashes.json`, so only changed pictures are drawn; pictures of hulls no longer in the art are removed.

- **Measured:** 192 hulls and 30 turrets, 654 pictures, 2.5 seconds from nothing; 0.08 seconds when nothing changed; 10 MB on disk.
- **No fonts:** `resvg` loads no system fonts (`loadSystemFonts: false`). With them it spent 45 of 50 seconds loading every installed font for every picture. The cost is that stencil text is not drawn in sprites (`ship-standards.md`, "Valid SVG").
- `@resvg/resvg-js` is a dev dependency at the repo root, installed by `npm install` with a prebuilt binary for Windows, macOS and Linux.

## Game side as built (7 November 2026, Lead 9)

`packages/client/src/render/sprites.ts` and `render/ship-art.ts`.

- **Which hulls:** a hull draws from its sprite only when every main weapon mount (`high`) the game has is marked in the art, so turrets never float off the hull. Since step 2, push 1, that is every hull in the game; a new hull keeps the vector drawing until its mounts are marked.
- **Loading:** `sprites.json` is fetched once; a hull picture or turret picture is fetched the first time it is needed and kept. Until it arrives the ship draws as vector, so nothing waits on a download.
- **Size:** the smallest picture at least 90% of the pixels the ship covers on screen (device pixels), else the largest.
- **Turrets:** at the art's marked mount (the game's mount if the art lacks it), turned to the turret's aim; a weapon with no turret picture draws its vector part there instead.
- **Kept as vector:** the fitting screen's mount view, plumes, shields and markers. The sprite does not take the role tint or the dashed outline of an empty ship; fading still applies.
- **Catalogue** (step 2, push 1): `scripts/geometry.mjs` (`npm run geometry`, run after an art export and committed; not part of the build, which must never change a committed file) writes `packages/sim/src/hull-geometry.ts` from `ships.json`: per hull in the game its outline, its radius (the outline's farthest point, so glows do not count) and the positions of its weapon and PDC mounts. `withGeometry` in `hulls.ts` lays these over the table: a ship is hit where it is drawn and fires from its turrets. Sizes, facings, arcs and every number stay the table's; internal mounts keep their place relative to the outline. The file is committed; a test fails if it falls out of step with `ships.json`, and another if a game hull's weapon mount is not marked in the art.

## Step 2: the first fleet (agreed with Jason, 7 November 2026)

21 hulls: the 11 in the game, and ten more picked by the lead (Jason: "a selection for the existing NPCs, a few navy hulls, mining and cargo hulls").

| Group | Hulls |
| --- | --- |
| In the game (ids kept) | Meridian Tern, Meridian Ark, Kessari Warrant, Kessari Injunction, Union Walkout, Tessaract Manifest, Belt Forge Prospector, Collier, Sinker and Knocker, Aurel Tacet |
| Navy, a small hull for every power holding ports | Kessari Citation (Earth corvette), Seraphine Deimos (Mars corvette), Seraphine Phobos (Mars patrol boat), Ishtar Lakshmi (Venus patrol boat), Union Blockade (Belt patrol boat) |
| Cargo | Tessaract Waybill, Belt Forge Mule, Meridian Skua |
| Mining | Belt Forge Rime, Meridian Dunlin |

Left out on purpose: capitals and cruisers (nothing in Open Lanes needs them), T3 specials (their hull abilities do not exist), and the Jackleg and other subcraft (they wait for carrying, so a Collier can launch one as it launches a Knocker).

**Push 1 as built (7 November 2026, Lead 9):** every weapon and PDC mount of the 11 game hulls is marked in the art (`Hull.weapon` in `kod.py`: a socket as hull, a stock turret as the mount; `boom(..., mount=...)` in `beltciv.py` makes a mining boom's head the mount), and the catalogue takes its shapes from the art. Where the game's spots fitted the drawing (the Warrant, the Injunction) they were kept; the Belt hulls' art matches nothing in the old table, so their mounts are placed on the drawing, the lasers on the booms. What changed in play:

- **Radius** (collisions, hits, culling): Tacet 18 to 38, Manifest 30 to 40, Collier 46 to 50, Prospector 19 to 13, Sinker 26 to 22, Knocker 6 to 3. The rest within a unit.
- **The Tacet is a large hull** (`sizeClass` L, was S): drawn as long as a frigate, it needs a large pad.
- **Large pads sit 36 units off a station's rim** (was 32), to keep room between a Collier and the pad beside it. Saved stations keep their pads.
- **Outlines come from the art for 35 hulls** where they were wrong: the export now takes the whole drawing when a silhouette covers under 60% of it (the Belt's frame hulls drew only their cab).

**Push 2 as built (7 November 2026, Lead 9):** the ten new hulls are in the game, with the registry key as the game id (`IN_GAME` in `build.py`).

- **Marks:** every drawn gun marked (`Hull.weapon`, or a hull's own ring, barbette or bolted base kept as the socket with the gun inside the marker). The game allows no PDCs on corvettes and patrol boats (`docs/turrets.md`), so the Deimos's and Blockade's drawn PDCs became light guns and the Phobos lost its aft pair. The Lakshmi's railgun is a mount on empty rails. The Rime's saw is its mining mount (`boom(..., mount=...)` takes any head).
- **Outline:** a marked mount is part of the hull's shape, so the outline reaches it (the Blockade's flak gun on its truss). The export now fails only if a mount is outside the drawing's frame.
- **Numbers** (`FLEET` in `hulls.ts`): between the hulls of the same class. Internal slots are laid out on the drawing (`onDrawing`). Earth hulls get the shield bonus, Mars energy damage, Venus shield and hybrid damage, the Belt projectile damage. New maker: Seraphine Naval Yards.
- **Stock fits** (`loadouts.ts`, and `reference-fits.ts` so the five warships are in the Arena): `kessari-citation`, `seraphine-picket`, `seraphine-patrol`, `ishtar-guard`, `union-blockade`, `tessaract-hauler`, `beltforge-hauler`, `meridian-hauler`, `beltforge-rime`, `meridian-dunlin`.
- **For sale** (`sol-ports.ts`): ECF Yard L5 the Citation; MRN Yard Phobos the Deimos and Phobos; Thetis Orbital the Lakshmi; Bellows the Rime, Mule and Blockade; Tessaract L4 the Waybill; State Yard Deimos and Tycho the Skua and Dunlin.
- **Flown** (`sol.ts`): each navy patrols in its own hulls (Mars the Phobos, Venus the Lakshmi, the Belt the Blockade; Earth keeps the Warrant), with new pickets (`picket-earth` a Citation, `picket-mars` a Deimos). Five traders fly the Waybill, Mule or Skua; two more miners at Ceres fly the Rime and the Dunlin.
- **Medium pads** sit 24 units off a station's rim (was 22), for the new patrol boats.

Next (step 3 of Open Lanes, per the roadmap), with the art's tier and grade rules (`hull-terms.md`) still to apply: Navy grades, licences and patterns are not in the game yet.

## The wrapper

Built: `server.bat ships` (or `node scripts/server.mjs ships`, `--all` to ignore the hashes) rebuilds the sprites and the client, with no restart (the server reads the client's files on each request); players press Ctrl+F5. `update` builds the sprites as part of `npm run build`, so a ship the art changed shows after the next update with nothing else to do. The roadmap's "actual wrapper" (Jason) grows from here; whatever form it takes, the sprite build stays one script it calls.

## What the game side does (the lead)

- **Catalogue:** hull geometry comes from `ship-geometry.json`; numbers from a hand-tuned table (defaults by class, overrides by hull). `hulls.ts` becomes that table plus the merge. The eleven hulls in saves keep their ids.
- **Drawing:** a hull picture per ship from the right size, loaded on first sight and kept; turret pictures at each fitted mount, turned to the turret's aim; plumes at the engines. The current vector drawing stays as the fallback until a hull's picture has loaded, and for a hull with none.
- **Tests:** every hull in the table has geometry and pictures; mounts the stock fit uses exist; stock fits within power; every main gun out-hits a PDC (as today).
- **Adding a ship from then on:** draw it in `art/registry/`, run the export, commit; the lead adds its line of numbers; Jason's next update builds its sprites; the tests say if anything is missing.

## Sizes

Measured (7 November, `resvg`, every full drawing at 256 pixels): 211 drawings in 16 seconds, 6 KB a PNG on average. Estimated: a small hull's `flight` picture is about 300 by 300 pixels, about 350 KB in memory once loaded; all three sizes about 400 KB. All 192 hulls in two liveries would be about 150 MB if everything were loaded at once, which is why they load on first sight: a busy scene shows perhaps 10 to 30 hull types.
