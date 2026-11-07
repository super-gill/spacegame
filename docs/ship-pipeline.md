# Ship art pipeline

Brief for Open Lanes step 2, the first fleet (Lead 9, 7 November 2026). Jason's call: the lead's preference stands, **bare hulls with turrets drawn on top**. This page says what the art side must produce so the game can take any number of hulls, and what the game side does with it. The art side can be coded by the lore chat (it owns `art/` and has Playwright) or a focused pass; the game side is the lead's.

## Why

The game has 11 hulls hand-written in `packages/sim/src/hulls.ts` (outline, mount points, stats). The art registry in `art/registry/` draws 192 and counting. Copying geometry by hand drifts as either side changes, and drawing SVG live is 3 to 5 times slower than drawing bitmaps (measured: 200 ships, 77 ms a frame as SVG against 25 ms as bitmaps, in a browser with no graphics card). So the art is the single source for **what a hull looks like and where things are on it**; the game keeps **the numbers** (mass, thrust, slots, price) in its own table. Neither is edited by hand from the other.

## The decision: bare hulls, turrets on top

A hull's picture has **empty mounts**. The game draws each fitted weapon as its own small picture at the mount, rotating to aim (main guns are turrets that traverse; `turrets.md`). Launchers, dispensers and light mining lasers are fixed and do not turn. A ship shows its fit, turrets visibly track, and one hull picture serves every fit. The registry page can keep its fitted look: "bare" is a separate variant.

## What the art side produces

One command from `art/registry/` builds everything below; the outputs are **committed**, so the game's build (and Jason's `server.bat`) never needs Python or a browser.

### 1. `art/out/ships.json` (geometry, copied to `packages/sim/src/catalogue/ship-geometry.json`)

One entry per hull, keyed by its catalogue id (the `add(...)` key in `build.py`; **keys never change**). All lengths in world units, nose along +x, origin at the hull's centre (the point it turns about).

| Field | What |
| --- | --- |
| `key` | Catalogue id |
| `name`, `maker`, `class`, `power` | As the registry has them |
| `radius` | Bounding radius, for collisions and culling |
| `outline` | The silhouette as a simple polygon, at most 24 points, clockwise; used for hit shapes, the radar and fallbacks |
| `mounts` | The places the picture shows something can sit: `id` (stable within the hull, in the game's scheme: `w1`, `w2` for weapons, `d1` to `d4` for PDCs, `e1` for engines; see `hulls.ts`), `type` (the game's `MountType`: `high` for a weapon, `ciws` for a PDC, `engine`), `size` (`S`, `M`, `L`, `XL`), `x`, `y`, `facing` (radians), `arc` (radians, for turrets; absent is all round). The slots a picture does not show (`mid`, `low`, `core`, and the fixed systems `nav`, `radar`, `computer`, `flight`, `fireControl`, `podBay`) stay in the game's table: their positions only matter to outfitting, which can lay them out itself |
| `engines` | Each nozzle: `x`, `y`, `width`, for plumes |
| `liveries` | The livery names this hull has (`navy`, `civ`, `udf`, `coop`) |
| `sprites` | For each livery and each size below: the file path, its width and height in pixels, and the pixel that is the hull's origin |

The drawing helpers already know where guns, PDCs and engines go (`Hull.gun`, `Hull.pdc`, `Hull.engines` in `kod.py`). Change them to **record** a mount or engine (type, size, position, facing) as well as draw it, and to leave guns and PDCs out of the bare variant (engines stay drawn: they are part of the hull). A gun's size must be given at the call, not guessed from how big it is drawn.

### 2. Hull pictures: `packages/client/public/ships/<key>/<livery>-<size>.png`

PNG with transparency, one file per hull, livery and size (**not** atlases: the game loads a hull's pictures the first time it is seen, so separate files load only what is needed). Drawn from the **bare full** symbol, nose to the right, centred on the origin.

| Size | Scale | Used for |
| --- | --- | --- |
| `flight` | 3 pixels per world unit, longest side capped at 2,048 | Flying, at every zoom (the camera runs 0.55 to 1.5; 3 covers the closest on a high-resolution screen) |
| `far` | 1 pixel per world unit, at least 24 pixels | The radar's close range, zoomed right out, crowds |
| `card` | Fits a 256 by 256 box | Outfitting, the target card, the ship mart, lists |

### 3. Turret pictures: `packages/client/public/ships/turrets/<family>-<size>.png`

One per gun the game has, by its weapon id without the size (`autocannon`, `artillery`, `pulse-laser`, `beam-laser`, `blaster`, `railgun`, `ciws`, the mining lasers, the launchers and dispensers; see `weapons.ts`) and size (`S`, `M`, `L`), so `autocannon-m.png`, drawn pointing along +x with the pivot at the centre, at 3 pixels per world unit, plus `turrets.json` with each one's pivot pixel and barrel length. The style is the registry's `gun` and `pdc` grown into families; the lore chat's art direction (`fleet.md`) rules.

### 4. Every hull renders on its own

Seven hulls failed to render alone in the spike (the Union Defence Works rebuilds and two Belt clan ships), because their symbols use parts of another hull's. The rasteriser must include whatever a symbol references.

### 5. Rasterising

A Node script beside `shot.js` (Playwright and Chromium, as the screenshots already use): for each bare symbol, an SVG with the shared `defs`, drawn to a canvas at the size above, saved as PNG; the same for turrets. Then writes the sprite sizes and origins into `ships.json`. It must be deterministic: the same art gives the same files, so commits show only real changes.

### 6. Checks the build fails on

A hull with no outline, no mounts it should have, a mount outside its outline, a sprite missing for a listed livery, a key that changed, or a symbol that fails to render.

## What the game side does (the lead)

- **Catalogue:** hull geometry comes from `ship-geometry.json`; numbers from a hand-tuned table (defaults by class, overrides by hull). `hulls.ts` becomes that table plus the merge. The eleven hulls in saves keep their ids.
- **Drawing:** a hull picture per ship from the right size, loaded on first sight and kept; turret pictures at each fitted mount, turned to the turret's aim; plumes at the engines. The current vector drawing stays as the fallback until a hull's picture has loaded, and for a hull with none.
- **Tests:** every hull in the table has geometry and pictures; mounts the stock fit uses exist; stock fits within power; every main gun out-hits a PDC (as today).
- **Adding a ship from then on:** the lore chat draws it and rebuilds; the lead adds its line of numbers; the tests say if anything is missing.

## Expected sizes (estimates, to check against the first build)

A small hull's `flight` picture is about 300 by 300 pixels, about 350 KB in memory once loaded; all three sizes about 400 KB. All 192 hulls in two liveries would be about 150 MB if everything were loaded, which is why they load on first sight: a busy scene shows perhaps 10 to 30 hull types. On disk, a few tens of KB each.
