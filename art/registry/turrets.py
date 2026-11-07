"""Turret and launcher pictures for the game: one per gun and size (docs/ship-pipeline.md, stage 1).

A bare hull has empty mounts; the game draws the fitted weapon there from these, turning a turret to aim.
Each is drawn pointing along +x with its pivot at the origin, in world units, in the registry's style (the
Tern's turret: dark base, steel ring, pale barrel). First pass by Lead 9, 7 November 2026: a plain family
look so the pipeline has something to carry. The lore chat owns the art and should restyle these freely,
keeping the ids, the pivot at the origin and the nose along +x.

Ids are the game's weapon ids without the size (weapons.ts): autocannon, artillery, pulse-laser,
beam-laser, blaster, railgun, ciws, missile-launcher, torpedo-tube, dispenser, mining-laser,
mining-laser-drone, mining-turret.
"""

from kod import circ, rect, poly, line

DARK = "#2a3036"
RING = "#8a939b"
PALE = "#e8edf1"
ENERGY = "#8fd6ff"
HYBRID = "#7fd0c4"
MINING = "#ffb46a"
LAUNCH = "#5d646b"

# Base radius of a turret ring by size, world units. S matches the Tern's (1.5); each size up is the game's
# SIZE_SCALE step (render/ship-art.ts: S 1, M 1.5, L 2).
RADIUS = {"S": 1.5, "M": 2.25, "L": 3.0, "XL": 3.9}


def ring(r, accent=RING):
    return circ(0, 0, r * 1.15, DARK) + circ(0, 0, r, accent, stroke=PALE, sw=r * 0.12)


def barrel(r, length, width, colour=PALE, offset_y=0.0, tip=DARK):
    """A barrel from the ring's edge along +x."""
    x0 = r * 0.3
    return (rect(x0, offset_y - width / 2, length, width, colour, stroke="none", sw=0, rx=width * 0.2)
            + rect(x0 + length - width * 0.9, offset_y - width * 0.65, width * 0.9, width * 1.3, tip, stroke="none", sw=0))


def hub(r):
    return rect(-r * 0.55, -r * 0.45, r * 0.9, r * 0.9, DARK, stroke="none", sw=0, rx=r * 0.15)


def autocannon(r):
    """Projectile: twin short barrels."""
    return ring(r) + barrel(r, r * 1.6, r * 0.22, offset_y=-r * 0.3) + barrel(r, r * 1.6, r * 0.22, offset_y=r * 0.3) + hub(r)


def artillery(r):
    """Projectile: one long heavy barrel."""
    return ring(r) + barrel(r, r * 2.6, r * 0.34) + hub(r)


def pulse_laser(r):
    """Energy: a short emitter with a lens."""
    return ring(r) + barrel(r, r * 1.4, r * 0.4, tip=ENERGY) + circ(r * 1.75, 0, r * 0.22, ENERGY) + hub(r)


def beam_laser(r):
    """Energy: a long focusing tube."""
    return ring(r) + barrel(r, r * 2.3, r * 0.3, tip=ENERGY) + line(r * 0.5, 0, r * 2.4, 0, stroke=ENERGY, sw=r * 0.08) + hub(r)


def blaster(r):
    """Hybrid: a short wide muzzle."""
    return ring(r, HYBRID) + barrel(r, r * 1.3, r * 0.55, colour=PALE, tip=HYBRID) + hub(r)


def railgun(r):
    """Hybrid: twin rails, long."""
    return (ring(r, HYBRID) + barrel(r, r * 2.8, r * 0.12, offset_y=-r * 0.2, tip=HYBRID)
            + barrel(r, r * 2.8, r * 0.12, offset_y=r * 0.2, tip=HYBRID) + hub(r))


def ciws(r):
    """Point defence: the registry's PDC, a square base and a fast barrel."""
    return (rect(-r, -r, 2 * r, 2 * r, "#16283b", sw=r * 0.1, rx=r * 0.15) + circ(0, 0, r * 0.68, RING, stroke=PALE, sw=r * 0.1)
            + rect(r * 0.2, -r * 0.11, r * 1.4, r * 0.22, PALE, stroke="none", sw=0))


def launcher(r, tubes):
    """Missiles: a box with tube mouths facing +x."""
    out = rect(-r, -r * 0.9, 2 * r, 1.8 * r, LAUNCH, stroke=DARK, sw=r * 0.1, rx=r * 0.15)
    for i in range(tubes):
        y = (i - (tubes - 1) / 2) * (1.5 * r / max(tubes, 1))
        out += circ(r * 0.6, y, r * 0.28, DARK)
    return out


def torpedo_tube(r):
    return rect(-r * 1.2, -r * 0.6, r * 2.6, r * 1.2, LAUNCH, stroke=DARK, sw=r * 0.1, rx=r * 0.3) + circ(r * 1.2, 0, r * 0.45, DARK)


def dispenser(r):
    return rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4, LAUNCH, stroke=DARK, sw=r * 0.1, rx=r * 0.2) + rect(r * 0.3, -r * 0.5, r * 0.3, r, DARK, stroke="none", sw=0)


def mining_laser(r):
    return ring(r, "#9ea7ad") + barrel(r, r * 1.5, r * 0.45, tip=MINING) + circ(r * 1.7, 0, r * 0.25, MINING) + hub(r)


def mining_turret(r):
    return ring(r, "#9ea7ad") + barrel(r, r * 2.2, r * 0.55, tip=MINING) + circ(r * 2.4, 0, r * 0.3, MINING) + hub(r)


# (id, sizes, drawing, extra half-length beyond the ring for its frame)
TURRETS = [
    ("autocannon", "SML", autocannon),
    ("artillery", "SML", artillery),
    ("pulse-laser", "SML", pulse_laser),
    ("beam-laser", "SML", beam_laser),
    ("blaster", "SML", blaster),
    ("railgun", "SML", railgun),
    ("ciws", "M", ciws),
    ("missile-launcher", "SML", lambda r: launcher(r, 2)),
    ("torpedo-tube", "ML", torpedo_tube),
    ("dispenser", "SM", dispenser),
    ("mining-laser", "SM", mining_laser),
    ("mining-laser-drone", "S", lambda r: mining_laser(r * 0.6)),
    ("mining-turret", "L", mining_turret),
]


def all_turrets():
    """Every turret picture: (file stem, frame radius, barrel length, svg body)."""
    out = []
    for gid, sizes, draw in TURRETS:
        for size in sizes:
            r = RADIUS[size]
            body = draw(r)
            # Barrels reach about 3.4 ring radii at most; frame the picture to hold them.
            frame = r * 3.6
            out.append((f"{gid}-{size.lower()}", frame, round(r * 3.0, 2), body))
    return out
