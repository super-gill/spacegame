# Making a ship: standards

What every hull must be so the game can use it, and keep using it as the fleet grows (Lead 9, 7 November 2026, at Jason's ask). **How a hull looks** is `fleet.md`: the art direction ("No basic shapes", "Nothing floats", colour), the scale bands and the weight bands. **How the art reaches the game** is `ship-pipeline.md`; **the commands** are in `art/README.md`. This page is the contract between them: if a hull meets it, `export.py` passes and the game can fly it.

Applies to every hull drawn from now on; existing hulls are brought up to it as they go into the game (`art/ships/report.md` says what each game hull lacks).

## Identity

- **One key per hull, forever.** The `add(...)` key in `build.py` never changes once a hull is drawn; a hull that is in the game also carries its game `id` (the export keys it by that). Renaming a hull changes its name, never its key or id. The export fails if a hull it wrote before goes missing.
- **A pattern, a legacy mark, a civilian or navy grade, a Union rebuild or a clan hull is its own hull** with its own key, and records what it came from (`base=` in `build.py`, or `legacy=`). It is never a different livery of its source.
- **A livery is the same hull repainted**: same key, same shape, same mounts. Liveries the game knows: `base`, `civ`.

## Frame

- **Nose along +x**, the hull's turning centre at the origin, in **world units** (one unit is one screen pixel at zoom 1).
- **Radius** is the bounding circle of everything drawn, fittings and glows included; it sits in its band (`fleet.md`, "Scale"). The symbol's frame is a square of plus and minus the radius (`Hull.symbols(R)` does this). Nothing may poke out of it: set `h.xmin`, `h.xmax` or `h.ymax` when fittings reach past the bodies (`art/README.md`).
- **Symmetry**: port is negative y, starboard positive y. Mirrored features are mirrored exactly (`mirror()`), so mounts in pairs share coordinates bar the sign.

## Levels

Every hull has all four symbols: `full`, `mid`, `sil`, `rim`. In Python they come free from `Hull.body()`: **at least one `body()` call is required**, because the silhouette and the outline come from the bodies. (The Belt Forge Lodestar draws without one; the export falls back to the full drawing for its outline, but the registry's silhouette and rim are blank. Fix it the next time it is touched.) Hand-written symbols must supply all four.

## Mounts

A mount is where the game draws whatever is fitted, turning a turret to aim. A ship in the game shows its fit; a bare hull shows its sockets.

- **Draw the socket as hull, the weapon as the mount.** The ring, plate or recess a turret sits on is part of the hull, drawn outside the marker, so the bare picture shows an empty socket (`fleet.md`, "Mounts show"). The gun itself is drawn inside `with h.mount(...)`, or in a group carrying `data-mount`, and the game replaces it.
- **Every weapon and every PDC drawn on a game hull is marked.** An unmarked gun stays painted on the bare picture, and the game would draw a second one on top.
- **Ids follow the game's scheme**: `w1`, `w2` and on for weapons (`high`), `d1` to `d4` for PDCs (`ciws`); numbered nose to stern, port before starboard. For a hull already in the game, the ids and sizes are the game's (`hulls.ts`; `art/ships/report.md` lists them); a new hull's ids are agreed with the lead when it goes into the game.
- **Size** is the game's module size (S, M, L, XL), given at the marker, never guessed from how big it is drawn. Draw it at that size: the game's turret pictures are a ring of 1.5, 2.25, 3 and 3.9 units for S to XL (`turrets.py`, `RADIUS`).
- **Facing** is the centre of the mount's arc, in radians (0 forward, plus or minus pi/2 to the sides, pi aft); the arc itself is the game's to set.
- **A mount sits on the hull**: the export fails if one is outside the outline.
- Things that are not fitted modules (antennae, sensor domes, radiators, lights, hangar doors, mining hoppers that are part of a hull's identity) stay painted and unmarked.

## Engines and lights

Drive bells and nozzles are hull: drawn, not marked. Engine and running-light glows may be drawn with `glowSoft`; `build.py` removes the blur, and the game keeps the glow as an idle light and draws its own plume when a ship thrusts. Nav lights sit on component edges (`fleet.md`).

## Kitbashes and rebuilds

The Belt builds by bolting new work onto old hulls (the Union pattern, the clans), and the art does the same. That is the yard's look, not a licence to skip any of the above.

- **Build from parts, not copied SVG text.** Reuse the source hull's builder or helpers (`belt.py` draws Union rebuilds over their source); never paste a symbol's markup into another.
- **A rebuild has its own silhouette**: its own `body()` calls for whatever it added or cut away, so its outline is its own shape, not its source's.
- **A rebuild has its own mounts.** It does not inherit the source's markers: mark the guns the rebuild actually carries, with its own ids. If the source's builder draws guns, call it without them (or with the rebuild's markers) rather than leaving the source's guns painted on.
- **Its radius is its own**, and stays in its source's band (`fleet.md`).
- **Helpers set an attribute once.** Do not pass an attribute through `extra=` that the helper already writes (`line()` already sets `stroke-linecap`): a doubled attribute is invalid SVG, and seven Belt hulls failed to render on it until 7 November.

## Valid SVG

- Every symbol parses as XML: attributes once each, quoted; ids unique; every `url(#...)` and `href="#..."` points at something in `defs`.
- No external references, no `<image>`, no `<foreignObject>`, no scripts. Text (stencils) is fine in the registry but **is not drawn in the game's sprites** (the sprite build loads no fonts, which made it twenty times faster; stencils are a few pixels tall in flight). Nothing that must read in the game may be text.
- Filters only `glowSoft`, which the registry build removes. Gradients and clip paths are fine.

## Game-ready checklist

A hull is ready to go into the game when:

1. `python3 export.py` passes with it, and `art/ships/` is committed.
2. Its mounts in `art/ships/report.md` match the game's, or the differences are agreed with the lead (the art may move a mount; the game's table then follows the art).
3. Its bare picture (`art/ships/svg/<id>-base.svg`) shows sockets and no guns.
4. It reads at card size (256 pixels across): the silhouette is recognisable and the company and power show (`fleet.md`, "Colour tells you three things").
5. The lead has its numbers: mass, thrust, slots, price (the game's table, not the art's).
