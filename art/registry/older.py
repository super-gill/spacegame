"""The older marks: legacy and surplus hulls for KOD and Seraphine.

Each is the same yard thinking an earlier thought: an older arrangement, cruder
plating, an earlier livery. The Earth ones are retired navy hulls sold whole, Navy tag and mounts intact,
so they wear the navy livery painted over with the lines still showing through,
and a civilian registry flash. The Martian
ones stayed Martian: Deimos Mk I in colony ochre, Phobos Mk II still in Navy
rust in the reserve. Nose points +x.
"""
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, P, clamp, INK, T0, T1, T2, T3, SPON, HEAD, OLD, PATCH, WHITE, BLUE, YELLOW, RED, GREEN, GLASS, SHADOW
from mars import Mars, RUST1, RUST2, RUST3, RUST4, BONE, BONE2, SEAM, DARK

OVER = "#2c4660"      # the overpaint on surplus hulls, a shade off the hull
GHOST = "#5b7995"     # old livery showing through the overpaint
OCHRE = "#c9933a"     # Martian colony colour
CIV = "#e8c547"       # civilian registry flash


# ------------------------------------------------------------------ shared older parts

def old_spine(h, x0, x1, hw):
    """A narrower, segmented spine: KOD before the one-piece spine."""
    seg = (x1 - x0) / 6
    for i in range(6):
        h.f(rect(x0 + i * seg + 0.3, -hw, seg - 0.6, 2 * hw, "url(#kesSpineV)", sw=0.12), mid=True)


def overpaint(h, x, y, w, hh, ghost_lines=2):
    """Navy livery painted over: a flat patch a shade off, with the old lines showing through."""
    h.f(rect(x, y, w, hh, OVER, stroke="none", sw=0, extra='opacity="0.92"'), mid=True)
    for i in range(ghost_lines):
        yy = y + hh * (i + 1) / (ghost_lines + 1)
        h.f(line(x + 0.4, yy, x + w - 0.4, yy, stroke=GHOST, sw=0.16, extra='opacity="0.5"'))


def painted_spine(h, x0, x1, hw):
    """The white spine overpainted but still visible as a ridge."""
    h.f(rect(x0, -hw, x1 - x0, 2 * hw, OVER, sw=0.12), mid=True)
    for s in (-1, 1): h.f(line(x0, s * hw, x1, s * hw, stroke=GHOST, sw=0.14, extra='opacity="0.7"'))


def blanked_door(h, x, y, w, hh):
    """A working bay door on a retired hull: the older square-framed door, the frame's white dulled to grey."""
    h.f(rect(x, y, w, hh, "#17304a", stroke=GHOST, sw=0.13), mid=True)
    h.f(line(x + w / 2, y + 0.3, x + w / 2, y + hh - 0.3, sw=0.1, extra='opacity="0.8"'))
    cx, cy = x + w / 2, y + hh / 2
    h.f(f'<polyline points="{cx - w * 0.16:.2f},{cy - hh * 0.3:.2f} {cx + w * 0.13:.2f},{cy:.2f} {cx - w * 0.16:.2f},{cy + hh * 0.3:.2f}" fill="none" stroke="{GHOST}" stroke-width="0.15" stroke-linejoin="round"></polyline>')


def blanked_doors(h, x0, x1, yc, n, hh):
    gap = (x1 - x0) / n; w = gap * 0.64
    for i in range(n): blanked_door(h, x0 + gap * i + (gap - w) / 2, yc - hh / 2, w, hh)


def civ_flash(h, x, y):
    r = clamp(h.u * 0.8, 0.5, 2.0)
    h.f(circ(x, y, r, CIV, stroke=INK, sw=0.1)); h.f(circ(x, y, r * 0.4, INK))


def old_visor(h, x_nose, half, depth):
    """A single narrow window strip instead of the full visor: KOD before the visor prow."""
    h.f(rect(x_nose - depth, -half * 0.8, depth * 0.45, half * 1.6, "url(#glass)", sw=0.16), mid=True)
    h.f(line(x_nose - depth * 0.78, -half * 0.6, x_nose - depth * 0.78, half * 0.6, stroke=BLUE, sw=0.22, extra='opacity="0.7"'))
    h.f(circ(x_nose - 0.6, 0, 0.3 * h.u, WHITE, extra='opacity="0.8"'))


def surplus_notes(name):
    return f"{name}: retired by the Earth Charter Fleet and sold whole, Navy tag intact, mounts intact. The navy livery painted over with the lines showing through, a civilian registry flash."


# ------------------------------------------------------------------ KOD, the older marks (all surplus)

def notice():
    """Corvette before the Citation: one stubby hull, one big engine, doors on the flanks, a narrow window strip. Toll patrols sold them off."""
    h = Hull("kes-notice", u=0.7, cell=3.0)
    top = [(15, -2.4), (13, -4.6), (4, -5.8), (-10, -5.8), (-13, -4.2), (-15.5, -4.2), (-15.5, -3.2)]
    h.body(sym_pts(top), HEAD)
    for s in (-1, 1):
        blanked_doors(h, -9, 1, s * 4.6, 2, 1.8)
        h.radiators(-13, s * 4.4, 3, -0.7, 0, 1.6 * s)
        h.f(rect(-12.5, s * 3.0 - 0.5, 1.2, 1.0, "#111", sw=0.1))
    h.f(poly([(-15.2, -3.8), (-15.2, 3.8), (-16.4, 2.4), (-16.4, -2.4)], T0, sw=0.2), mid=True)
    h.engines(-15.5, [0], 2.4)
    h.module(cham(-8, -2.6, 11, 5.2, 0.8), T1); h.module(cham(3.5, -2.0, 5, 4.0, 0.7), T1, hatches=False)
    painted_spine(h, -12, 9, 0.45)
    overpaint(h, -12, -5.6, 4.5, 1.6); overpaint(h, -12, 4.0, 4.5, 1.6)
    old_visor(h, 15, 2.4, 3.0)
    h.antennae(9, -4.2, 2.4, -1.4)
    h.emitter(6, 0)
    h.gun(11.5, -1.6); h.gun(11.5, 1.6)
    civ_flash(h, -10.2, 0)
    h.f(f'<text x="2" y="-3.4" font-family="IBM Plex Mono, monospace" font-size="0.8" fill="{GHOST}" opacity="0.6" text-anchor="middle">KOD</text>')
    h.f(circ(-9, -6.0, 0.3, RED)); h.f(circ(-9, 6.0, 0.3, GREEN))
    return h, 17


def writ():
    """Patrol boat before the Warrant: a plain box with the doors on the hull, two bare engines, a tall old bridge block, no sponsons."""
    h = Hull("kes-writ", u=0.9, cell=3.6)
    top = [(23, -4.0), (20, -8.0), (-19, -8.0), (-22, -6.4), (-23, -6.4), (-23, -4.8)]
    h.body(sym_pts(top), "url(#kodHull)")
    for s in (-1, 1):
        blanked_doors(h, -16, 8, s * 6.0, 3, 2.2)
        h.f(line(-17, s * 7.6, 12, s * 7.6, stroke="#2b4d70", sw=0.14))
        h.radiators(-21, s * 8.0, 3, -0.6, 0, 1.8 * s)
        h.pdc(14.5, s * 5.0)
    h.engines(-23, [-3.0, 3.0], 2.0)
    h.module(cham(-14, -4.2, 10, 8.4, 1.0), T1); h.module(cham(-3, -4.2, 8, 8.4, 1.0), T1)
    # the old bridge: a tall narrow block forward with a raised cabin, the pre-visor look
    h.module(cham(8, -3.4, 8, 6.8, 1.0), T1, hatches=False); h.module(cham(10, -2.0, 4.5, 4.0, 0.7), T3, hatches=False)
    h.f(rect(13.6, -1.4, 0.9, 2.8, "url(#glass)", sw=0.12))
    painted_spine(h, -20, 7, 0.5)
    overpaint(h, -19, -3.0, 6, 6, 3)
    old_visor(h, 23, 4.0, 3.6)
    h.antennae(12, -3.6, 3, -2.4); h.antennae(12, 3.6, 3, 2.4)
    h.emitter(-18.5, -6.0); h.emitter(-18.5, 6.0)
    h.gun(18, 0)
    civ_flash(h, -16, 0)
    h.f(f'<text x="-2" y="{-8.0 + 1.2:.2f}" font-family="IBM Plex Mono, monospace" font-size="1.1" fill="{GHOST}" opacity="0.6" text-anchor="middle">KOD W</text>')
    h.f(circ(-18, -8.3, 0.4, RED)); h.f(circ(-18, 8.3, 0.4, GREEN))
    return h, 25


def decree():
    """Frigate before the Injunction: one wide flat hull with the launcher banks built in, before KOD moved the missiles off the crew. Four doors a side, blanked."""
    h = Hull("kes-decree", u=1.0, cell=4.0)
    hx = 32
    top = [(hx, -5), (27, -9), (18, -13), (-20, -13), (-26, -10), (-30, -10), (-hx, -7)]
    h.body(sym_pts(top), "url(#kodHull)")
    for s in (-1, 1):
        h.f(poly([(17, s * 8.6), (16, s * 12.6), (-19, s * 12.6), (-24, s * 9.6), (-24, s * 8.6)], SPON), mid=True)
        blanked_doors(h, -22, 15, s * 10.6, 4, 2.6)
        h.f(line(-3, s * 8.8, -3, s * 12.4, sw=0.24))
        h.pdc(20, s * 7.0); h.pdc(-26, s * 6.6)
        h.emitter(10, s * 6.4); h.emitter(-18, s * 6.4)
        h.radiators(-28, s * 10, 3, -0.8, -0.3 * s, 2.0 * s)
    h.f(poly([(-29.6, -6.6), (-29.6, 6.6), (-31.4, 4.4), (-31.4, -4.4)], T0, sw=0.2), mid=True)
    h.engines(-hx, [-3.6, 0, 3.6], 1.8)
    h.module(cham(-22, -5.4, 14, 10.8, 1.2), T1); h.module(cham(-6, -5.4, 14, 10.8, 1.2), T1)
    # old sensor mast amidships instead of a prow visor
    h.module(cham(12, -3.8, 9, 7.6, 1.0), T1, hatches=False); h.module(cham(14, -1.8, 5, 3.6, 0.6), T3, hatches=False)
    h.antennae(16.5, 0, 0, -8); h.antennae(16.5, 0, 0, 8); h.f(circ(16.5, -8, 0.4, RED)); h.f(circ(16.5, 8, 0.4, GREEN))
    painted_spine(h, -28, 10, 0.55)
    overpaint(h, -27, -4.2, 7, 8.4, 3)
    old_visor(h, hx, 5, 4.5)
    civ_flash(h, -24, 0)
    h.f(f'<text x="2" y="{-13 + 1.4:.2f}" font-family="IBM Plex Mono, monospace" font-size="1.3" fill="{GHOST}" opacity="0.6" text-anchor="middle">KOD F</text>')
    return h, 34


def ruling():
    """Destroyer before the Verdict: symmetrical, the bridge amidships, a shorter broadside of five, two engines. The Marches' big surplus hull."""
    h = Hull("kes-ruling", u=1.1, cell=4.4)
    hx = 40
    top = [(hx, -6), (33, -12), (14, -17), (-24, -17), (-32, -13), (-37, -13), (-hx, -9)]
    h.body(sym_pts(top), "url(#kodHull)")
    for s in (-1, 1):
        h.f(poly([(12, s * 11), (11, s * 16.6), (-23, s * 16.6), (-30, s * 12.6), (-30, s * 11)], SPON), mid=True)
        blanked_doors(h, -26, 9, s * 13.8, 5, 3.0)
        for xx in (-16, -2): h.f(line(xx, s * 11.2, xx, s * 16.4, sw=0.24))
        h.pdc(16, s * 9.5); h.pdc(-9, s * 9.5); h.pdc(-33, s * 7.5)
        h.emitter(24, s * 7); h.emitter(-20, s * 8.5)
        h.radiators(-36, s * 13, 4, -0.8, -0.8 * s, 2.4 * s)
    h.f(poly([(-36.6, -9.5), (-36.6, 9.5), (-39.2, 6), (-39.2, -6)], T0, sw=0.2), mid=True)
    h.engines(-hx, [-5, 5], 2.6)
    h.module(cham(-28, -7, 14, 14, 1.3), T1); h.module(cham(2, -7, 14, 14, 1.3), T1)
    # amidships bridge: the old tall tower
    h.module(cham(-12, -6.0, 12, 12, 1.2), T1, hatches=False); h.module(cham(-10, -3.6, 7, 7.2, 0.9), T3, hatches=False); h.module(cham(-8.5, -1.8, 3.5, 3.6, 0.5), "#78a6d0", hatches=False)
    h.antennae(-6, 0, 0, -10); h.antennae(-6, 0, 0, 10); h.f(circ(-6, -10, 0.4, RED)); h.f(circ(-6, 10, 0.4, GREEN))
    painted_spine(h, -35, -13, 0.6); painted_spine(h, 1, 24, 0.6)
    overpaint(h, -34, -5, 7, 10, 3)
    old_visor(h, hx, 6, 5.5)
    civ_flash(h, -31, 0)
    h.f(f'<text x="20" y="{-12 + 1.6:.2f}" font-family="IBM Plex Mono, monospace" font-size="1.5" fill="{GHOST}" opacity="0.6" text-anchor="middle">KOD D</text>')
    return h, 42


# ------------------------------------------------------------------ Seraphine, the older marks

def deimos_mk1():
    """Deimos Mk I: cruder, a smaller unshrouded barbette, square fins, no dorsal plates, the colony ochre band where the Navy pennant was."""
    h = Mars("ser-deimos-mk1", u=0.7, cell=3.0)
    top = [(14, -3.4), (12, -5.4), (-10, -5.4), (-13, -4.0), (-14.5, -4.0), (-14.5, -3.0)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        h.plate([(9, s * 2.4), (8, s * 4.8), (-9, s * 4.8), (-10.5, s * 3.4), (-10.5, s * 2.4)], RUST2)
        h.plate([(-2, s * 2.0), (-2, s * 4.2), (-8, s * 4.2), (-8, s * 2.0)], RUST3, bolts=False)
        # square fins, bolted on
        for x in (-8, -5, -2):
            h.f(rect(x - 0.45, s * 5.4 if s > 0 else -5.4 - 2.0, 0.9, 2.0, BONE2, stroke=SEAM, sw=0.14), mid=True)
        h.pdc(-11.5, s * 2.2)
    h.skirt(-14.5, 3.8, 2.0)
    h.marsengines(-14.5, [-1.8, 1.8], 1.4)
    h.barbette(5.5, 0, 2.2)
    h.slit(9.6, 1.4)
    h.antennae(1, -5.2, 2.0, -1.8)
    # colony ochre band round the bow, replacing the pennant
    h.f(rect(11.2, -4.6, 1.2, 9.2, OCHRE, stroke="none", sw=0, extra='opacity="0.9"'))
    h.f(f'<text x="-4" y="{-5.4 - 0.5:.2f}" font-family="IBM Plex Mono, monospace" font-size="1.0" fill="{BONE}" opacity="0.75" text-anchor="middle">MK I</text>')
    h.nav((-9, -5.7), (-9, 5.7))
    return h, 16


def phobos_mk2():
    """Phobos Mk II: one barbette amidships, a big slab bridge block forward, two large square fins a side, bare engines. Navy reserve, still in rust."""
    h = Mars("ser-phobos-mk2", u=0.9, cell=3.6)
    top = [(22, -5.0), (19, -7.8), (-18, -7.8), (-21, -6.0), (-22, -6.0), (-22, -4.6)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        h.plate([(16, s * 4.2), (14, s * 7.2), (-15, s * 7.2), (-18, s * 5.0), (-18, s * 4.2)], RUST2)
        for x in (-12, -4):
            h.f(rect(x - 1.6, s * 7.8 if s > 0 else -7.8 - 3.2, 3.2, 3.2, BONE2, stroke=SEAM, sw=0.16), mid=True)
            h.f(line(x, s * 8.0, x, s * 10.8, stroke=SEAM, sw=0.12))
        h.pdc(10, s * 5.0); h.pdc(-15, s * 5.0)
    # bare engines, no skirt
    h.marsengines(-22, [-2.6, 2.6], 1.8)
    h.barbette(-1, 0, 3.0)
    # slab bridge
    h.plate(cham(8, -4.0, 9, 8.0, 1.0), RUST1); h.plate(cham(10, -2.2, 5, 4.4, 0.6), RUST3, bolts=False)
    h.slit(13.5, 1.6)
    h.antennae(12, -4.0, 2.5, -2.4); h.antennae(12, 4.0, 2.5, 2.4)
    h.pennant(19, 5.6, "P-061", 1.2, (-8, -7.8 - 0.6))
    h.nav((-16, -8.1), (-16, 8.1))
    return h, 24


NOTES = {
    "kes-notice": ["Corvette before the Citation: one stubby hull, one big engine, two doors on each flank, a narrow window strip for a bridge. " + surplus_notes("Kessari Notice")],
    "kes-writ": ["Patrol boat before the Warrant: a plain box with the doors on the hull itself, no sponsons, a tall old bridge block forward, two bare engines. " + surplus_notes("Kessari Writ")],
    "kes-decree": ["Frigate before the Injunction: one wide flat hull with the launcher banks built in, before KOD moved the missiles off the crew hull. A sensor mast amidships, three engines. " + surplus_notes("Kessari Decree")],
    "kes-ruling": ["Destroyer before the Verdict: symmetrical, the tall old bridge amidships, a broadside of five, two engines. " + surplus_notes("Kessari Ruling")],
    "ser-deimos-mk1": ["Deimos Mk I: cruder plating, a smaller unshrouded barbette, square bolted fins, no dorsal plates. Sold to Martian colonies as picket boats and wearing the colony ochre band where the Navy pennant was."],
    "ser-phobos-mk2": ["Phobos Mk II: one barbette amidships, a slab bridge block forward, two large square fins a side, bare engines with no skirt. The Navy's reserve, still in rust and bone; a Mk I is a museum piece."],
}

# (key, builder, col, name, job, character, generation, base key)
ENTRIES = [
    ("kes-notice", "kessari", "corvette", "Kessari Notice", "Retired navy corvette", "Sold off by the toll patrols when the Citation came in", "surplus", "kes-citation"),
    ("kes-writ", "kessari", "patrol", "Kessari Writ", "Retired navy patrol boat", "Sold off in bulk; the Black Strike's other favourite", "surplus", "warrant"),
    ("kes-decree", "kessari", "frigate", "Kessari Decree", "Retired navy frigate", "A few in private hands, most in Earth's reserve", "surplus", "kessari-brig"),
    ("kes-ruling", "kessari", "destroyer", "Kessari Ruling", "Retired navy destroyer", "The backbone of the Marches, with the Notice and the Writ", "surplus", "kes-verdict"),
    ("ser-deimos-mk1", "seraphine", "corvette", "Seraphine Deimos Mk I", "Colony picket", "Sold to Martian colonies as picket boats", "legacy", "ser-deimos"),
    ("ser-phobos-mk2", "seraphine", "patrol", "Seraphine Phobos Mk II", "Reserve patrol boat", "The Navy's reserve; a Mk I is a museum piece", "legacy", "ser-phobos"),
]




# ------------------------------------------------------------------ the older fighters

from vantage import canopy, gunbarrel, nozzle, chevron, GREY, GREY2, STEEL, BLADE


def dirk():
    """Vantage Dirk, before the Foil: a shorter, stubbier blade, a boxy hilt, guns on the fuselage, a round canopy. Retired by the Earth Charter Fleet, sold whole."""
    h = Hull("van-dirk", u=0.35, cell=1.6)
    h.body(cham(-6.4, -2.2, 3.2, 4.4, 0.4), STEEL, grid=False)
    top = [(5.6, -0.7), (4.6, -1.3), (1.0, -1.8), (-3.2, -1.9), (-4.6, -1.5), (-5.4, -1.5)]
    h.body(sym_pts(top), "url(#vanHull)")
    for s in (-1, 1):
        # short square stubs, no cant
        stub = [(-0.6, s * 1.8), (-0.6, s * 3.2), (-3.4, s * 3.2), (-3.4, s * 1.8)]
        h.body(stub, GREY, grid=False)
        chevron(h, -2.0, s * 2.5, 1.0, s, col=GHOST)
        h.f(circ(-1.0, s * 3.0, 0.14, RED if s < 0 else GREEN))
    # guns on the fuselage flanks, not the stubs
    gunbarrel(h, 1.0, 4.2, -1.45, 0.3); gunbarrel(h, 1.0, 4.2, 1.45, 0.3)
    nozzle(h, -6.4, 0, 1.0)
    # the old round canopy
    h.f(circ(2.6, 0, 0.95, "#0a1622", stroke="#9fb7cf", sw=0.14), mid=True); h.f(line(2.0, -0.4, 3.0, -0.6, stroke=BLUE, sw=0.12, extra='opacity="0.6"'))
    overpaint(h, -5.6, -0.7, 2.4, 1.4, 1)
    civ_flash(h, -3.8, 0)
    h.f(poly([(5.6, -0.7), (6.2, -0.3), (6.2, 0.3), (5.6, 0.7)], GLASS, sw=0.12), mid=True)
    return h, 7.0


def cutlass():
    """Vantage Cutlass, before the Sabre: one big engine, a broad curved stub each side, missiles on the fuselage flanks, a long two-seat canopy. Retired, sold whole."""
    h = Hull("van-cutlass", u=0.45, cell=2.0)
    h.body(cham(-8.6, -2.6, 3.6, 5.2, 0.6), STEEL, grid=False)
    top = [(8.4, -1.0), (7.0, -1.9), (2.0, -2.5), (-4.0, -2.6), (-6.4, -2.0), (-7.4, -2.0)]
    h.body(sym_pts(top), "url(#vanHull)")
    for s in (-1, 1):
        # the cutlass: a broad stub with a curved trailing edge, drawn as a chamfered sweep
        stub = [(0.8, s * 2.4), (-0.2, s * 4.4), (-2.0, s * 5.4), (-4.6, s * 5.4), (-5.6, s * 4.4), (-5.2, s * 2.4)]
        h.body(stub, GREY, grid=False)
        chevron(h, -2.6, s * 4.0, 1.4, s, col=GHOST)
        h.f(circ(-2.2, s * 5.1, 0.18, RED if s < 0 else GREEN))
        # missiles on the fuselage flank under the stub root
        for i in range(2):
            mx = -4.4 + i * 1.6
            h.f(rect(mx, min(s * 2.6, s * 3.3), 1.2, 0.7, "#dde5ec", sw=0.1, rx=0.1)); h.f(circ(mx + 1.2, s * 2.95, 0.14, "#ff9a8a"))
    gunbarrel(h, 0.6, 5.0, -2.1, 0.36); gunbarrel(h, 0.6, 5.0, 2.1, 0.36)
    nozzle(h, -8.6, 0, 1.6)
    canopy(h, 1.4, 6.2, 1.0)
    overpaint(h, -7.6, -1.0, 3.0, 2.0, 1)
    civ_flash(h, -5.6, 0)
    h.f(poly([(8.4, -1.0), (9.2, -0.4), (9.2, 0.4), (8.4, 1.0)], GLASS, sw=0.12), mid=True)
    return h, 9.8


def fighter_mk4():
    """Arcadia Fighter Mk IV, before the Mk V: a cruder flat wedge, exposed engine, slab fins bolted on, the emitter in a bare ring. Released once the Mk V was in service."""
    h = Mars("hal-light-mk4", u=0.35, cell=1.6)
    top = [(6.2, -1.0), (4.4, -2.4), (-0.5, -3.0), (-4.8, -3.0), (-5.6, -2.0), (-5.6, -1.4)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        h.plate([(3.6, s * 1.1), (2.4, s * 2.2), (-4.2, s * 2.4), (-4.8, s * 1.1)], RUST2, bolts=False)
        for x in (-3.6, -1.6):
            h.f(rect(x - 0.35, s * 3.0 if s > 0 else -3.0 - 1.1, 0.7, 1.1, BONE2, stroke=SEAM, sw=0.12), mid=True)
        h.f(circ(-0.5, s * 2.8, 0.16, RED if s < 0 else GREEN))
    h.marsengines(-5.6, [0], 1.1)
    h.f(circ(3.4, 0, 1.0, RUST1, stroke=SEAM, sw=0.2), mid=True); h.f(circ(3.4, 0, 0.42, "#ff8c5a"))
    h.slit(1.2, 0.8, 0.5)
    h.f(f'<text x="-2.4" y="{-3.0 - 0.5:.2f}" font-family="IBM Plex Mono, monospace" font-size="0.75" fill="{BONE}" opacity="0.75" text-anchor="middle">MK IV</text>')
    return h, 7.2


def heavy_mk1():
    """Arcadia Heavy Fighter Mk I, before the Mk II: a box, one engine, one barbette on the nose, a tall slab fin each side. Released once the Mk II was in service."""
    h = Mars("hal-heavy-mk1", u=0.45, cell=2.0)
    top = [(8.4, -1.8), (6.6, -3.6), (-5.4, -3.8), (-7.0, -2.6), (-7.0, -2.0)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        h.plate([(5.2, s * 1.6), (4.0, s * 3.0), (-5.0, s * 3.2), (-5.8, s * 1.6)], RUST2, bolts=False)
        h.f(rect(-3.4, s * 3.8 if s > 0 else -3.8 - 2.2, 1.6, 2.2, BONE2, stroke=SEAM, sw=0.14), mid=True)
        h.f(line(-2.6, s * 4.0, -2.6, s * 5.8, stroke=SEAM, sw=0.12))
        h.f(circ(-0.5, s * 3.5, 0.2, RED if s < 0 else GREEN))
    h.marsengines(-7.0, [0], 1.6)
    h.barbette(5.4, 0, 1.3)
    h.slit(1.6, 1.0, 0.6)
    h.f(f'<text x="1.4" y="{-3.8 - 0.6:.2f}" font-family="IBM Plex Mono, monospace" font-size="0.8" fill="{BONE}" opacity="0.75" text-anchor="middle">MK I</text>')
    return h, 9.4


NOTES.update({
    "van-dirk": ["Vantage Dirk, before the Foil: a shorter, stubbier blade, a boxy hilt, square stubs with no cant, the guns on the fuselage, the old round canopy. Retired by the Earth Charter Fleet and sold whole, Navy tag intact, livery painted over, a civilian registry flash."],
    "van-cutlass": ["Vantage Cutlass, before the Sabre: one big engine, a broad curved stub each side, two missiles on each fuselage flank, a long two-seat canopy. Retired and sold whole, Navy tag intact."],
    "hal-light-mk4": ["Arcadia Fighter Mk IV, before the Mk V: a cruder flat wedge, exposed engine, slab fins bolted on, the emitter in a bare ring instead of a barbette. Released to the market once the Mk V was in service, Martian buyers first."],
    "hal-heavy-mk1": ["Arcadia Heavy Fighter Mk I, before the Mk II: a box, one engine, one barbette on the nose, a tall slab fin each side. Released once the Mk II was in service."],
})

ENTRIES += [
    ("van-dirk", "vantage", "craft", "Vantage Dirk", "Light fighter, retired navy", "Sold by the thousand when the Foil came in; half the Belt learned to dogfight in one", "surplus", "kes-light"),
    ("van-cutlass", "vantage", "craft", "Vantage Cutlass", "Heavy fighter, retired navy", "Slower than a Sabre and hits nearly as hard", "surplus", "kes-heavy"),
    ("hal-light-mk4", "arcadia", "craft", "Arcadia Fighter Mk IV", "Light fighter, retired navy", "Released once the Mk V was flying; Martian colonies got them first", "surplus", "hal-light"),
    ("hal-heavy-mk1", "arcadia", "craft", "Arcadia Heavy Fighter Mk I", "Heavy fighter, retired navy", "A box with a lens; it still works", "surplus", "hal-heavy"),
]


def all_art():
    syms, meta = [], {}
    for fn in (notice, writ, decree, ruling, deimos_mk1, phobos_mk2, dirk, cutlass, fighter_mk4, heavy_mk1):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return "", "".join(syms), meta
