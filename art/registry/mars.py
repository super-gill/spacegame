"""Seraphine Naval Yards and Arcadia Works fighters: the Martian Republic Navy.

Rust red over bone. Overlapping armour plates with bolt lines. Energy weapons,
so emitter barbettes with an orange lens instead of bay doors. Big bone
radiator fins because lasers dump heat. No shield emitters, no visor: a buried
bridge behind a conning slit. Symmetrical always. A bone pennant stripe across
the bow and a hull number. Nose points +x.
"""
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, mirror, P, clamp, fade, INK, WHITE, RED, GREEN, SHADOW

RUST0 = "#3a1a12"; RUST1 = "#5e2a1d"; RUST2 = "#7d3826"; RUST3 = "#9a4a31"; RUST4 = "#b25d3e"
BONE = "#e4d8c2"; BONE2 = "#c9bba3"; SEAM = "#1b0d09"; LENS = "#ff8c5a"; LENS2 = "#ffd1b0"; DARK = "#24120d"; STEEL = "#4a3a34"


class Mars(Hull):
    """The KOD parts class with Martian parts added."""

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw); self.stroke = SEAM

    def plate(self, pts, fill=RUST2, bolts=True):
        """An armour plate laid over the hull: shadow, plate, highlight edge, bolt line."""
        if self.civ: fill = fade(fill)
        self.f(poly([(x + 0.8, y + 0.8) for x, y in pts], SHADOW, stroke="none", sw=0))
        self.f(poly(pts, fill, stroke=SEAM, sw=0.26), mid=True)
        self.f(f'<polyline points="{P(pts[:3])}" fill="none" stroke="{RUST4}" stroke-width="0.2" opacity="0.7" stroke-linejoin="round"></polyline>')
        if bolts:
            n = len(pts); u = self.u
            for i in range(n):
                (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
                L = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5
                if L < 3 * u: continue
                k = int(L / (1.6 * u))
                for j in range(1, k):
                    t = j / k; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
                    # inset towards the centroid
                    cx = sum(p[0] for p in pts) / n; cy = sum(p[1] for p in pts) / n
                    dx, dy = cx - x, cy - y; d = (dx * dx + dy * dy) ** 0.5 or 1
                    self.f(circ(x + dx / d * 0.7 * u, y + dy / d * 0.7 * u, 0.13 * u, SEAM))

    def barbette(self, x, y, r, heavy=False):
        """An armoured ring with an orange lens dome: an energy emitter mount."""
        self.f(circ(x + 0.5, y + 0.5, r, SHADOW))
        self.f(circ(x, y, r, RUST1, stroke=SEAM, sw=0.26), mid=True)
        self.f(circ(x, y, r * 0.8, RUST3, stroke=SEAM, sw=0.14))
        for a in range(0, 360, 45):
            import math
            ax = x + math.cos(math.radians(a)) * r * 0.9; ay = y + math.sin(math.radians(a)) * r * 0.9
            self.f(circ(ax, ay, 0.12 * self.u, SEAM))
        self.f(circ(x, y, r * 0.5, LENS, extra='opacity="0.25" filter="url(#glowSoft)"'))
        self.f(circ(x, y, r * 0.42, "#5a2414", stroke=SEAM, sw=0.14), mid=True)
        self.f(circ(x, y, r * 0.3, LENS)); self.f(circ(x - r * 0.1, y - r * 0.1, r * 0.1, LENS2))
        if heavy:
            # a short armoured shroud forward of the lens
            self.f(rect(x + r * 0.35, y - r * 0.28, r * 0.9, r * 0.56, RUST1, stroke=SEAM, sw=0.14, rx=0.2))

    def fins(self, x0, x1, y, n, length, side, w=None):
        """Bone radiator fins along a flank, canted back; side is -1 or 1."""
        w = w or clamp(self.u * 0.9, 0.35, 2.6)
        gap = (x1 - x0) / max(n - 1, 1)
        for i in range(n):
            x = x0 + gap * i
            self.f(poly([(x - w / 2, y), (x + w / 2, y), (x + w / 2 - length * 0.35, y + side * length), (x - w / 2 - length * 0.35, y + side * length)], BONE, stroke=SEAM, sw=0.14), mid=True)
            self.f(line(x - length * 0.17, y + side * length * 0.1, x - length * 0.17 - length * 0.3, y + side * length * 0.9, stroke=BONE2, sw=0.1))

    def dorsal(self, x0, x1, n, hw):
        """A line of bone radiator plates along the spine, the Martian answer to KOD's white spine."""
        gap = (x1 - x0) / n
        for i in range(n):
            x = x0 + gap * i + gap * 0.1
            self.f(rect(x, -hw, gap * 0.8, 2 * hw, BONE, stroke=SEAM, sw=0.14), mid=True)
            self.f(line(x + gap * 0.4, -hw, x + gap * 0.4, hw, stroke=BONE2, sw=0.12))

    def slit(self, x, hw, w=None):
        """The conning slit: a narrow armoured viewport across the hull where KOD would have a visor."""
        w = w or clamp(self.u * 0.9, 0.6, 2.4)
        self.f(rect(x - w * 0.5 - 0.5, -hw - 0.5, w + 1.0, 2 * hw + 1.0, RUST1, stroke=SEAM, sw=0.16, rx=0.3), mid=True)
        self.f(rect(x - w * 0.5, -hw, w, 2 * hw, "#120a07", stroke="#3a2a24", sw=0.12), mid=True)
        self.f(line(x, -hw * 0.7, x, hw * 0.7, stroke="#ffb48a", sw=w * 0.25, extra='opacity="0.6"'))

    def skirt(self, x_stern, hw, depth):
        """An armoured engine skirt: a bone-edged shroud round the stern."""
        self.f(poly([(x_stern + depth, -hw), (x_stern, -hw * 0.82), (x_stern, hw * 0.82), (x_stern + depth, hw)], RUST1, stroke=SEAM, sw=0.22), mid=True)
        self.f(line(x_stern + 0.4, -hw * 0.78, x_stern + 0.4, hw * 0.78, stroke=BONE2, sw=0.25))

    def marsengines(self, x_stern, ys, h):
        u = self.u
        for ey in ys:
            self.full.insert(0, ell(x_stern - h * 1.1, ey, h * 1.3, h * 0.6, "#ffb07a", 'opacity="0.45" filter="url(#glowSoft)"'))
            self.mid.insert(0, ell(x_stern - h * 1.1, ey, h * 1.3, h * 0.6, "#ffb07a", 'opacity="0.45" filter="url(#glowSoft)"'))
            bell = [(x_stern + 2.0 * u, ey - h * 0.55), (x_stern - 1.6 * u, ey - h * 0.75), (x_stern - 1.6 * u, ey + h * 0.75), (x_stern + 2.0 * u, ey + h * 0.55)]
            self.f(poly(bell, STEEL, stroke=SEAM, sw=0.15), mid=True)
            self.f(ell(x_stern - 1.5 * u, ey, 0.55 * u, h * 0.58, "#060a0f"))
            self.f(ell(x_stern - 1.5 * u, ey, 0.32 * u, h * 0.4, "#ffb07a", 'opacity="0.9"'))

    def pennant(self, x, hw, number, fs, stencil_xy):
        """Bone diagonal across the bow, hull number stencilled behind it, and nav lights."""
        w = clamp(self.u * 1.4, 0.5, 4.0)
        if self.civ:
            # civilian grade: no pennant, no hull number; a civil registry disc in bone and the yard's mark
            sx, sy = stencil_xy
            self.f(circ(x - hw * 0.3, 0, clamp(self.u * 0.9, 0.5, 2.0), BONE, stroke=SEAM, sw=0.12)); self.f(circ(x - hw * 0.3, 0, clamp(self.u * 0.35, 0.2, 0.8), SEAM))
            self.f(f'<text x="{sx:.2f}" y="{sy:.2f}" font-family="IBM Plex Mono, monospace" font-size="{fs:.2f}" fill="{BONE}" opacity="0.6" text-anchor="middle">SNY</text>')
            return
        self.f(poly([(x, -hw), (x + w, -hw), (x - hw * 0.6 + w, hw), (x - hw * 0.6, hw)], BONE, stroke="none", sw=0, extra='opacity="0.9"'))
        sx, sy = stencil_xy
        self.f(f'<text x="{sx:.2f}" y="{sy:.2f}" font-family="IBM Plex Mono, monospace" font-size="{fs:.2f}" fill="{BONE}" opacity="0.8" text-anchor="middle" letter-spacing="0.1">{number}</text>')

    def nav(self, xy_r, xy_g):
        (rx, ry), (gx, gy) = xy_r, xy_g
        self.f(circ(rx, ry, 0.38 * self.u, RED)); self.f(circ(gx, gy, 0.38 * self.u, GREEN))

    def pdc(self, x, y):
        g = self.u
        self.f(rect(x - g, y - g, 2 * g, 2 * g, RUST1, stroke=SEAM, sw=0.14, rx=0.2))
        self.f(circ(x, y, g * 0.68, BONE2, stroke=SEAM, sw=0.14), mid=True)
        self.f(rect(x + g * 0.2, y - g * 0.11, g * 1.3, g * 0.22, BONE, stroke="none", sw=0))


# ------------------------------------------------------------------ Seraphine

def deimos(civ=False):
    """Corvette, picket and scout: compact, one heavy forward barbette, a bone dorsal line, big fins for its size."""
    h = Mars("ser-deimos", u=0.7, cell=3.0, civ=civ)
    top = [(15, -3.0), (12.5, -5.2), (4, -6.2), (-9, -6.2), (-13, -4.6), (-15, -4.6), (-15, -3.6)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        h.plate([(10, s * 2.6), (3, s * 5.6), (-8, s * 5.6), (-10.5, s * 3.6), (-10.5, s * 2.6)], RUST2)
        h.fins(-9, -2, s * 6.2, 4, 2.2, s)
        h.pdc(-11.5, s * 2.4)
    h.skirt(-15, 4.4, 2.5)
    h.marsengines(-15, [-2.0, 2.0], 1.5)
    h.dorsal(-9, 1, 4, 0.9)
    h.barbette(6.5, 0, 2.6, heavy=True)
    h.slit(10.5, 1.6)
    h.antennae(2, -5.9, 2.0, -2.0); h.antennae(2, 5.9, 2.0, 2.0)
    h.pennant(13.2, 3.4, "D-07", 1.1, (-4, 5.6 - 0.4 - 4.3))
    h.nav((-8.5, -6.4), (-8.5, 6.4))
    return h, 16.5


def phobos(civ=False):
    """Patrol boat: slab sided, barbettes fore and aft, a two-tier plated deck, twin engines in a skirt."""
    h = Mars("ser-phobos", u=0.9, cell=3.6, civ=civ)
    top = [(24, -4.5), (20, -8.5), (-18, -8.5), (-22, -6.5), (-24, -6.5), (-24, -5.0)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        h.plate([(18, s * 4.4), (15, s * 8.0), (-16, s * 8.0), (-19, s * 5.4), (-19, s * 4.4)], RUST2)
        h.plate([(8, s * 4.0), (6, s * 6.6), (-10, s * 6.6), (-12, s * 4.0)], RUST3, bolts=False)
        h.fins(-14, -3, s * 8.5, 5, 2.4, s)
        h.pdc(12, s * 5.6); h.pdc(-15.5, s * 5.6)
    h.skirt(-24, 6.2, 3.0)
    h.marsengines(-24, [-2.8, 2.8], 1.9)
    h.dorsal(-4.5, 7.5, 4, 1.0)
    h.barbette(12, 0, 3.2); h.barbette(-9, 0, 3.0)
    h.slit(17.5, 2.6)
    h.antennae(16, -8.2, 2.5, -2.2); h.antennae(16, 8.2, 2.5, 2.2)
    h.pennant(21.5, 5.6, "P-114", 1.3, (2, -8.5 - 0.6))
    h.nav((-16, -8.8), (-16, 8.8))
    return h, 26


def resolve():
    """Frigate: long and narrow, four barbettes in a centreline row, two big radiator wings each side. Armour and lasers, no supply line."""
    h = Mars("ser-resolve", u=1.0, cell=4.0)
    top = [(34, -5), (29, -8.5), (-20, -8.5), (-26, -7), (-34, -7), (-34, -5.5)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        # radiator wings: two broad bone panels on armoured roots
        for (x0, x1) in ((-22, -8), (2, 14)):
            h.f(poly([(x1, s * 8.5), (x1 - 3, s * 17), (x0 + 3, s * 17), (x0, s * 8.5)], RUST1, stroke=SEAM, sw=0.24), mid=True)
            h.f(poly([(x1 - 1.2, s * 9.5), (x1 - 3.6, s * 16.2), (x0 + 3.6, s * 16.2), (x0 + 1.2, s * 9.5)], BONE, stroke=SEAM, sw=0.14), mid=True)
            for k in range(1, 5):
                t = k / 5; x = x0 + 1.2 + (x1 - x0 - 2.4) * t
                h.f(line(x, s * 9.6, x - 2.3, s * 16.1, stroke=BONE2, sw=0.14))
        h.plate([(26, s * 4.6), (22, s * 8.0), (-18, s * 8.0), (-23, s * 6.2), (-23, s * 4.6)], RUST2)
        h.pdc(20, s * 5.8); h.pdc(-6, s * 5.8); h.pdc(-26, s * 4.2)
    h.skirt(-34, 6.6, 3.4)
    h.marsengines(-34, [-3.2, 3.2], 2.1)
    for x in (18, 6, -6, -18): h.barbette(x, 0, 3.4)
    h.slit(25.5, 3.0)
    h.antennae(24, -7.8, 3, -2.5); h.antennae(24, 7.8, 3, 2.5)
    h.pennant(30.5, 6.4, "F-31", 1.5, (-28, -4.5))
    h.ymax = 17.5
    h.nav((-20, -17.4), (-20, 17.4))
    return h, 36


def constancy():
    """Destroyer: squat and wide, a tortoise of overlapping plates, barbettes in a ring. Stands and keeps firing."""
    h = Mars("ser-constancy", u=1.1, cell=4.4)
    top = [(38, -10), (30, -18), (10, -22), (-22, -22), (-34, -16), (-38, -16), (-38, -12)]
    h.body(sym_pts(top), "url(#marsHull)")
    # overlapping plate belts, fore to aft
    for s in (-1, 1):
        h.plate([(30, s * 8), (24, s * 16), (12, s * 19.5), (6, s * 19.5), (6, s * 8)], RUST2)
        h.plate([(8, s * 9), (8, s * 20.5), (-10, s * 20.5), (-10, s * 9)], RUST3)
        h.plate([(-8, s * 9), (-8, s * 20.5), (-24, s * 20.5), (-30, s * 15), (-30, s * 9)], RUST2)
        h.fins(-26, 20, s * 22, 7, 2.6, s)
        for x in (26, 0, -26): h.barbette(x, s * 13, 3.6)
        h.pdc(16, s * 13); h.pdc(-14, s * 13)
    h.plate(cham(-16, -8, 36, 16, 2.0), RUST1, bolts=False)
    h.dorsal(-14, 18, 6, 1.1)
    h.barbette(26, 0, 4.0, heavy=True); h.barbette(-26, 0, 3.6)
    h.skirt(-38, 14, 4.0)
    h.marsengines(-38, [-7.5, 0, 7.5], 2.6)
    h.slit(31, 4.0)
    h.pennant(35.5, 9.5, "DD-9", 1.8, (-32, -19))
    h.nav((-24, -22.4), (-24, 22.4))
    return h, 41


def valles():
    """Cruiser: a long armoured citadel with a dorsal trench, side belts, broadside barbettes. The Navy's workhorse heavy."""
    h = Mars("ser-valles", u=1.6, cell=5.2)
    hx = 70
    top = [(hx, -12), (62, -20), (40, -24), (-40, -24), (-58, -20), (-66, -16), (-hx, -16), (-hx, -13)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        # side armour belt
        h.plate([(56, s * 11), (48, s * 22.5), (-36, s * 22.5), (-54, s * 18.5), (-54, s * 11)], RUST2)
        for x in (44, 22, 0, -22, -44): h.barbette(x, s * 16.5, 3.8)
        h.fins(-50, 50, s * 24, 11, 3.0, s)
        for x in (33, 11, -11, -33): h.pdc(x, s * 9.5)
    # the trench: a long dark dorsal channel with radiator plates on its floor
    h.f(rect(-50, -6.5, 104, 13, DARK, stroke=SEAM, sw=0.3), mid=True)
    h.dorsal(-48, 50, 12, 1.4)
    for xx in range(-44, 50, 14): h.f(line(xx, -6.5, xx, 6.5, stroke=RUST1, sw=0.3))
    # citadel: a raised armoured block forward of the trench with the conning slit
    h.plate(cham(52, -9, 14, 18, 2.0), RUST1)
    h.barbette(58, 0, 5.0, heavy=True)
    h.skirt(-hx, 15, 5)
    h.marsengines(-hx, [-9, 0, 9], 3.4)
    h.slit(50, 5.0)
    h.antennae(60, -11, 5, -4); h.antennae(60, 11, 5, 4)
    h.pennant(66.5, 11, "CL-402", 2.2, (-60, -17.5))
    h.nav((-42, -24.4), (-42, 24.4))
    return h, 74


def tharsis():
    """Battleship: three massive centreline barbettes on a bulged hull, armour in overlapping belts. The best big ship in known space."""
    h = Mars("ser-tharsis", u=1.8, cell=6.4)
    hx = 100
    top = [(hx, -14), (88, -26), (50, -36), (-40, -38), (-74, -30), (-92, -22), (-hx, -22), (-hx, -17)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        h.plate([(84, s * 12), (72, s * 24), (46, s * 33), (6, s * 33), (6, s * 12)], RUST2)
        h.plate([(8, s * 13), (8, s * 35), (-38, s * 35), (-38, s * 13)], RUST3)
        h.plate([(-36, s * 13), (-36, s * 35), (-70, s * 28), (-86, s * 20), (-86, s * 13)], RUST2)
        for x in (60, 20, -20, -60): h.barbette(x, s * 24, 4.6)
        h.fins(-80, 80, s * 37, 13, 3.4, s)
        for x in (44, 0, -44, -78): h.pdc(x, s * 12)
    # the three great barbettes, each on a raised plated mount
    for x in (56, 0, -56):
        h.plate(cham(x - 17, -14, 34, 28, 4.0), RUST1)
        h.barbette(x, 0, 11.5, heavy=True)
    h.skirt(-hx, 21, 6)
    h.marsengines(-hx, [-12, -4, 4, 12], 3.6)
    h.slit(78, 6.0)
    h.antennae(84, -16, 6, -5); h.antennae(84, 16, 6, 5)
    h.pennant(92, 15, "BB-1", 2.8, (-30, -38 - 1))
    h.nav((-40, -38.4), (-40, 38.4))
    return h, 104


def hellas():
    """Carrier: a round armoured basin, the deck sunk inside it, enclosed launch tubes forward instead of an open deck. Squadrons, not drones."""
    h = Mars("carrier", u=2.0, cell=7.0)
    import math
    hx = 146
    # a broad lens-shaped hull: wide amidships, armoured both ends
    top = [(hx, -24), (120, -48), (60, -68), (-40, -70), (-100, -60), (-130, -44), (-hx, -36), (-hx, -28)]
    h.body(sym_pts(top), "url(#marsHull)")
    # the basin: a big sunken circle amidships with the deck markings inside
    h.f(circ(-10, 0, 54, DARK, stroke=SEAM, sw=0.4), mid=True)
    h.f(circ(-10, 0, 46, "#160b08", stroke=RUST1, sw=0.3), mid=True)
    for r in (14, 28, 42): h.f(circ(-10, 0, r, "none", stroke=BONE2, sw=0.3, extra='opacity="0.6"'))
    for a in range(0, 360, 30):
        x = -10 + math.cos(math.radians(a)) * 46; y = math.sin(math.radians(a)) * 46
        h.f(line(-10, 0, x, y, stroke=BONE2, sw=0.18, extra='opacity="0.4"'))
    h.f(circ(-10, 0, 9, RUST1, stroke=SEAM, sw=0.3), mid=True); h.slit(-10, 4.5, 2.0)
    # launch tubes: four enclosed tubes through the bow armour, bone-lined mouths
    for yy in (-30, -10, 10, 30):
        h.f(rect(40, yy - 5.5, 90, 11, RUST1, stroke=SEAM, sw=0.3), mid=True)
        h.f(rect(42, yy - 3.5, 92, 7, "#0b0605", stroke=BONE2, sw=0.25), mid=True)
        h.f(line(44, yy, 130, yy, stroke="#ffb07a", sw=0.4, extra='stroke-dasharray="3 3" opacity="0.6"'))
    for s in (-1, 1):
        h.plate([(116, s * 50), (60, s * 66), (-40, s * 68), (-98, s * 58), (-98, s * 52), (-40, s * 60), (60, s * 58), (112, s * 44)], RUST2)
        h.fins(-90, 50, s * 70, 10, 4.0, s)
        for x in (80, 30, -60, -110): h.barbette(x, s * 52, 4.4)
        for x in (100, 55, 5, -45, -95): h.pdc(x, s * 40)
    h.skirt(-hx, 34, 8)
    h.marsengines(-hx, [-20, -7, 7, 20], 4.0)
    h.pennant(139, 22, "CV-2", 3.4, (-60, -70 - 1.5))
    h.nav((-40, -70.6), (-40, 70.6))
    return h, 150


def olympus():
    """Dreadnought, the flagship: a stepped mountain of concentric plates rising to a central caldera. One exists. It has never fired in anger."""
    h = Mars("ser-olympus", u=2.2, cell=7.6)
    hx = 186
    top = [(hx, -30), (150, -62), (60, -84), (-80, -84), (-150, -62), (-170, -46), (-hx, -46), (-hx, -36)]
    h.body(sym_pts(top), "url(#marsHull)")
    # three terraces stepping up to the caldera
    terraces = [([(150, -22), (124, -50), (96, -50), (90, -62), (50, -68), (-20, -68), (-26, -60), (-70, -60), (-76, -68), (-126, -50), (-146, -34)], RUST2),
                ([(118, -14), (98, -36), (60, -36), (54, -46), (40, -50), (-10, -50), (-16, -42), (-60, -42), (-66, -50), (-104, -36), (-120, -24)], RUST3),
                ([(84, -8), (70, -22), (28, -32), (-48, -32), (-82, -22), (-94, -14)], RUST4)]
    for pts, col in terraces: h.plate(sym_pts(pts), col)
    # the caldera: a ring of armour with the command slit inside, and the biggest lens Mars has built at its heart
    h.f(circ(-6, 0, 20, RUST1, stroke=SEAM, sw=0.4), mid=True)
    h.f(circ(-6, 0, 14, DARK, stroke=SEAM, sw=0.3), mid=True)
    h.barbette(-6, 0, 9, heavy=False)
    for s in (-1, 1):
        for x in (120, 70, 20, -30, -80, -124):
            h.plate(cham(x - 8, s * 58 - 8, 16, 16, 2.5), RUST1, bolts=False); h.barbette(x, s * 58, 5.4)
        for x in (90, 40, -10, -60): h.barbette(x, s * 41, 4.4)
        h.fins(-140, 130, s * 85, 16, 4.4, s)
        for x in (140, 100, 50, 0, -50, -100, -150): h.pdc(x, s * 26)
    # terrace-edge radiator strips
    for pts, _ in terraces[:2]:
        for s in (-1, 1):
            for i in range(1, len(pts) - 1):
                (x0, y0), (x1, y1) = pts[i], pts[i + 1]
                h.f(line(x0, s * y0, x1, s * y1, stroke=BONE2, sw=0.5, extra='opacity="0.5"'))
    h.skirt(-hx, 44, 10)
    h.marsengines(-hx, [-28, -14, 0, 14, 28], 4.4)
    h.plate(cham(136, -18, 34, 36, 4), RUST1)
    h.slit(144, 8, 3.0)
    h.barbette(163, 0, 13, heavy=True)
    h.pennant(182, 15, "OLYMPUS", 4.0, (-20, -84 - 2))
    h.nav((-80, -84.6), (-80, 84.6))
    return h, 190


# ------------------------------------------------------------------ Arcadia fighters

def fighter_mk5(civ=False):
    """Light fighter: a flat armoured wedge of plates, one emitter in a small forward barbette, bone fins, the Navy's Mk V."""
    h = Mars("hal-light", u=0.35, cell=1.6, civ=civ)
    top = [(7.0, -0.8), (5.0, -2.2), (0.5, -3.2), (-4.5, -3.2), (-6.0, -2.0), (-6.0, -1.4)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        h.plate([(4.4, s * 1.0), (3.0, s * 2.3), (-3.8, s * 2.6), (-4.8, s * 1.6), (-4.8, s * 1.0)], RUST2, bolts=False)
        h.fins(-3.6, -0.6, s * 3.3, 3, 1.1, s, w=0.3)
        h.f(circ(-0.6, s * 3.0, 0.16, RED if s < 0 else GREEN))
    h.skirt(-6.0, 1.9, 1.0)
    h.marsengines(-6.0, [0], 1.1)
    h.barbette(4.0, 0, 1.0, heavy=True)
    h.slit(1.6, 0.9, 0.5)
    h.pennant(5.8, 1.7, "V", 0.7, (-2.6, -2.2))
    return h, 8.0


def heavy_mk2():
    """Heavy fighter: the Mk V's armoured brother, broader, two engines, two barbettes, more plate than craft."""
    h = Mars("hal-heavy", u=0.45, cell=2.0)
    top = [(9.5, -1.4), (7.0, -3.2), (1.0, -4.4), (-6.0, -4.4), (-8.0, -3.0), (-8.0, -2.2)]
    h.body(sym_pts(top), "url(#marsHull)")
    for s in (-1, 1):
        h.plate([(6.0, s * 1.4), (4.4, s * 3.2), (-4.8, s * 3.8), (-6.6, s * 2.4), (-6.6, s * 1.4)], RUST2, bolts=False)
        h.plate([(2.0, s * 0.8), (1.0, s * 2.2), (-3.5, s * 2.4), (-4.2, s * 0.8)], RUST3, bolts=False)
        h.fins(-5.2, -0.8, s * 4.5, 4, 1.3, s, w=0.35)
        h.barbette(3.2, s * 2.2, 1.0)
        h.f(circ(-1.0, s * 4.2, 0.2, RED if s < 0 else GREEN))
    h.skirt(-8.0, 2.8, 1.3)
    h.marsengines(-8.0, [-1.2, 1.2], 1.1)
    h.slit(3.8, 1.0, 0.6)
    h.pennant(8.0, 2.4, "H", 0.8, (-2.6, -3.3))
    return h, 10.5


DEFS = ('<linearGradient id="marsHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1a12"></stop><stop offset="0.3" stop-color="#6e3322"></stop>'
        '<stop offset="0.5" stop-color="#8a432c"></stop><stop offset="0.7" stop-color="#6e3322"></stop><stop offset="1" stop-color="#3a1a12"></stop></linearGradient>')

NOTES = {
    "ser-deimos": ["Corvette, picket and scout: compact, one heavy forward barbette, a bone dorsal line, radiator fins too big for its size because the laser runs hot. Rust over bone, a pennant stripe across the bow, hull number D-07."],
    "ser-phobos": ["Patrol boat: slab sided, barbettes fore and aft, a two-tier plated deck, five fins a side, twin engines in an armoured skirt. The hull Martian patrols intercept dark ships in."],
    "ser-resolve": ["Frigate: long and narrow, four barbettes in a centreline row, two broad bone radiator wings each side on armoured roots. Armour and lasers, no supply line."],
    "ser-constancy": ["Destroyer: squat and wide, a tortoise of three overlapping plate belts, six flank barbettes and two on the centreline, seven fins a side, three engines. Stands and keeps firing."],
    "ser-valles": ["Cruiser: a long armoured citadel with a dark dorsal trench floored with radiator plates, side belts carrying five barbettes each, a forward citadel block with the heavy barbette and the conning slit. The Navy's workhorse heavy."],
    "ser-tharsis": ["Battleship: three massive centreline barbettes on raised plated mounts, a bulged hull in three armour belts, eight flank barbettes, thirteen fins a side, four engines. The best big ship in known space, and Mars knows it."],
    "carrier": ["Carrier: a broad lens of a hull with a round sunken basin amidships for the deck, the bridge in its centre, four enclosed launch tubes through the bow armour instead of an open deck. Squadrons, not drones. Redrawn for the pivot; the old Halcyon spires are gone."],
    "ser-olympus": ["Dreadnought, the flagship: a stepped mountain of three concentric armour terraces rising to a central caldera with the biggest lens Mars has built at its heart, a second in the bow, twenty flank barbettes, sixteen fins a side, five engines. One exists. It has never fired in anger."],
    "hal-light": ["Arcadia Fighter Mk V, light: a flat armoured wedge of plates, one emitter in a small forward barbette, three bone fins a side, one engine in a skirt. Redrawn for the pivot in rust and bone."],
    "hal-heavy": ["Arcadia Heavy Fighter Mk II: the Mk V's armoured brother, broader, two engines, a barbette on each side, four fins a side, more plate than craft. Redrawn for the pivot."],
}


def all_art():
    syms, meta = [], {}
    for fn in (deimos, phobos, resolve, constancy, valles, tharsis, hellas, olympus, fighter_mk5, heavy_mk2):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
        if fn in (deimos, phobos, fighter_mk5):
            hc, _ = fn(civ=True); syms.append(hc.symbols(R)); meta[h.key]["civ"] = True
    return DEFS, "".join(syms), meta
