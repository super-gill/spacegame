"""Special operations hulls: the T3 line. KOD first.

Stealth is the line's theme: dark, matte, unregistered. No white spine, no
Earth Charter Fleet flash, no stencil, nav lights dim. KOD's vocabulary survives
underneath (chamfers, the visor idea, chevroned doors where there are doors),
drawn in near-black and graphite. The gate-born drive is the one thing on
these hulls that is not human: a ring of pale Lattice segments with a cyan
glow, floating in a dark housing. Nose points +x.
"""
import math
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, P, clamp, INK, WHITE, BLUE, RED, GREEN, GLASS, SHADOW, GIRDER

D0 = "#0a0f16"; D1 = "#121a24"; D2 = "#1a2531"; D3 = "#23313f"; D4 = "#2e3f50"
FACET = "#0e151d"; EDGE = "#3b4d60"; GRAPH = "#2a3440"
LAT = "#e3f7ff"; LAT2 = "#9fe8ff"; LATG = "#5fd9ff"
DIMR = "#7a3a36"; DIMG = "#2f7a52"


class Dark(Hull):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw); self.stroke = "#05080c"

    def facets(self, pts, n=3):
        """Angular facet lines across a body: the stealth skin."""
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        for i in range(1, n + 1):
            t = i / (n + 1)
            self.f(line(x0 + (x1 - x0) * t, y0, x0 + (x1 - x0) * (t + 0.08), y1, stroke=EDGE, sw=0.14, extra='opacity="0.6"'))

    def dark_spine(self, x0, x1, hw):
        self.f(rect(x0, -hw, x1 - x0, 2 * hw, GRAPH, stroke="#05080c", sw=0.12), mid=True)
        self.f(line(x0, 0, x1, 0, stroke=EDGE, sw=0.1, extra='opacity="0.7"'))

    def dark_visor(self, x_nose, half_nose, half_back, depth, n_eyes=3):
        x1 = x_nose - depth * 0.4; x0 = x_nose - depth
        h1 = half_nose + (half_back - half_nose) * 0.4; h0 = half_back
        self.f(poly([(x1, -h1 * 0.95), (x0, -h0 * 0.95), (x0, h0 * 0.95), (x1, h1 * 0.95)], "#04070a", stroke=EDGE, sw=0.16), mid=True)
        for i in range(n_eyes):
            yy = (i - (n_eyes - 1) / 2) * h0 * 0.5
            self.f(circ(x0 - 1.2 * self.u, yy, 0.45 * self.u, "#070c12", stroke=EDGE, sw=0.1))
            self.f(circ(x0 - 1.2 * self.u, yy, 0.16 * self.u, LAT2, extra='opacity="0.6"'))

    def dark_door(self, x, y, w, hh):
        self.f(rect(x, y, w, hh, D1, stroke=EDGE, sw=0.12), mid=True)
        cx, cy = x + w / 2, y + hh / 2
        self.f(f'<polyline points="{cx - w * 0.16:.2f},{cy - hh * 0.3:.2f} {cx + w * 0.13:.2f},{cy:.2f} {cx - w * 0.16:.2f},{cy + hh * 0.3:.2f}" fill="none" stroke="{EDGE}" stroke-width="0.15" stroke-linejoin="round"></polyline>')

    def dark_doors(self, x0, x1, yc, n, hh):
        gap = (x1 - x0) / n; w = gap * 0.64
        for i in range(n): self.dark_door(x0 + gap * i + (gap - w) / 2, yc - hh / 2, w, hh)

    def rack(self, x0, x1, yc, n, hh, s):
        """An open launcher rack: missiles on rails, no door. The striker's tell."""
        self.f(rect(x0, yc - hh / 2, x1 - x0, hh, D0, stroke=EDGE, sw=0.14), mid=True)
        gap = (x1 - x0) / n
        for i in range(n):
            mx = x0 + gap * i + gap * 0.15; mw = gap * 0.7
            self.f(rect(mx, yc - hh * 0.3, mw, hh * 0.6, "#c9d3dc", stroke="#05080c", sw=0.1, rx=0.2), mid=True)
            self.f(poly([(mx + mw, yc - hh * 0.3), (mx + mw + hh * 0.35, yc), (mx + mw, yc + hh * 0.3)], "#c9d3dc", stroke="#05080c", sw=0.1))
            self.f(circ(mx + mw + hh * 0.35, yc, hh * 0.08, DIMR))

    def dark_pdc(self, x, y):
        g = self.u
        self.f(rect(x - g, y - g, 2 * g, 2 * g, D1, stroke="#05080c", sw=0.12, rx=0.2))
        self.f(circ(x, y, g * 0.65, D4, stroke=EDGE, sw=0.12), mid=True)
        self.f(rect(x + g * 0.2, y - g * 0.1, g * 1.3, g * 0.2, EDGE, stroke="none", sw=0))

    def dark_engines(self, x_stern, ys, h):
        u = self.u
        for ey in ys:
            self.full.insert(0, ell(x_stern - h * 1.0, ey, h * 1.1, h * 0.5, LATG, 'opacity="0.3" filter="url(#glowSoft)"'))
            self.mid.insert(0, ell(x_stern - h * 1.0, ey, h * 1.1, h * 0.5, LATG, 'opacity="0.3" filter="url(#glowSoft)"'))
            bell = [(x_stern + 2.2 * u, ey - h * 0.5), (x_stern - 1.6 * u, ey - h * 0.7), (x_stern - 1.6 * u, ey + h * 0.7), (x_stern + 2.2 * u, ey + h * 0.5)]
            self.f(poly(bell, GRAPH, stroke="#05080c", sw=0.14), mid=True)
            self.f(ell(x_stern - 1.5 * u, ey, 0.55 * u, h * 0.55, "#020406"))
            self.f(ell(x_stern - 1.5 * u, ey, 0.3 * u, h * 0.36, LAT2, 'opacity="0.7"'))

    def spaced(self, pts, fill=D2):
        """Spaced armour: a plate held off the hull on brackets, with the gap showing as a deep shadow."""
        self.f(poly([(x + 1.6, y + 1.6) for x, y in pts], "#000000", stroke="none", sw=0, extra='opacity="0.75"'))
        for (x, y) in pts: self.f(circ(x + 0.8, y + 0.8, 0.45, "#05080c"))
        self.f(poly(pts, fill, stroke="#05080c", sw=0.34), mid=True)
        self.f(f'<polyline points="{P(pts[:3])}" fill="none" stroke="{EDGE}" stroke-width="0.26" opacity="0.9" stroke-linejoin="round"></polyline>')
        self.f(f'<polyline points="{P(pts[2:5] if len(pts) > 4 else pts[2:])}" fill="none" stroke="#02040 6" stroke-width="0.3" opacity="0.8" stroke-linejoin="round"></polyline>'.replace("#02040 6", "#020406"))
        for (x, y) in pts: self.f(circ(x, y, 0.32, EDGE))

    def lattice_ring(self, x, r):
        lattice_ring(self, x, r, D1, "#05080c", EDGE)


    def projector(self, x, y, r, facing=1):
        """A pin projector: a dish in a dark cradle, the hunter's hold."""
        self.f(circ(x, y, r * 1.1, D1, stroke="#05080c", sw=0.16), mid=True)
        self.f(circ(x, y, r, D3, stroke=EDGE, sw=0.12), mid=True)
        for k in (0.75, 0.5, 0.25): self.f(circ(x, y, r * k, "none", stroke=EDGE, sw=0.1))
        self.f(circ(x, y, r * 0.14, LAT2))
        self.f(line(x, y, x + facing * r * 1.4, y, stroke=EDGE, sw=0.16)); self.f(circ(x + facing * r * 1.4, y, r * 0.12, LAT2))

    def sensor_fan(self, x, y, n, r, side):
        """A fan of passive sensor vanes: the watcher's eyes."""
        for i in range(n):
            a = side * (20 + i * 140 / max(n - 1, 1)) - (90 if side > 0 else -90) * 0
            ang = math.radians(side * (30 + i * 120 / max(n - 1, 1)))
            x1, y1 = x + math.cos(ang) * r * 0.4 - r * 0.2, y + math.sin(ang) * r
            self.f(line(x, y, x1, y1, stroke=EDGE, sw=0.3))
            self.f(circ(x1, y1, 0.25 * self.u, LAT2, extra='opacity="0.6"'))

    def dim_nav(self, xy_r, xy_g):
        (rx, ry), (gx, gy) = xy_r, xy_g
        self.f(circ(rx, ry, 0.3 * self.u, DIMR)); self.f(circ(gx, gy, 0.3 * self.u, DIMG))

    def antenna(self, x, y, dx, dy):
        self.f(line(x, y, x + dx, y + dy, stroke=EDGE, sw=0.14)); self.f(circ(x + dx, y + dy, 0.25 * self.u, LAT2, extra='opacity="0.7"'))


def summons():
    """Watcher, frigate: more engine and sensor than hull. A long spindle, a sensor head, an exposed truss, three engines. Thin as paper."""
    h = Dark("kes-summons", u=1.0, cell=4.0)
    hx = 36
    # sensor head
    head = [(hx, -2.5), (hx - 4, -6), (18, -7), (14, -5), (14, -2.5)]
    h.body(sym_pts(head), "url(#kodDark)")
    # the spindle: a narrow core
    core = [(14, -3.2), (-16, -3.2), (-20, -2.4), (-20, 2.4), (-16, 3.2), (14, 3.2)]
    h.body(core, D1)
    # engine block aft of an exposed truss
    h.truss(-30, -20, -2.2, 2.2, 3.3)
    h.body(cham(-37, -7.5, 8, 15, 1.5), D2, grid=False)
    for s in (-1, 1):
        # radiator vanes, long and dark
        for xx in (-4, 2, 8):
            h.f(poly([(xx - 0.4, s * 3.2), (xx + 0.4, s * 3.2), (xx - 1.2, s * 9.5), (xx - 2.0, s * 9.5)], GRAPH, stroke=EDGE, sw=0.12), mid=True)
        h.sensor_fan(22, s * 6.5, 4, 6, s)
        h.dark_pdc(-12, s * 3.0)
    h.dark_engines(-37, [-4.6, 0, 4.6], 1.7)
    h.module(cham(-14, -2.2, 24, 4.4, 0.8), D2, hatches=False)
    h.dark_spine(-19, 13, 0.45)
    h.dark_visor(hx, 2.5, 6, 5, n_eyes=5)
    h.antenna(30, -5.8, 4, -4); h.antenna(30, 5.8, 4, 4); h.antenna(-33, 0, 0, -11)
    h.dim_nav((-14, -3.6), (-14, 3.6))
    h.facets(sym_pts(head), 2)
    return h, 38


def custody():
    """Hunter, cruiser: the brick. Heavy plate round the drive ring, three pin projectors on the prow where the guns should be. Grabs and calls for backup."""
    h = Dark("kes-custody", u=1.6, cell=5.2)
    hx = 66
    outer = [(hx, -16), (56, -24), (30, -28), (-30, -28), (-50, -24), (-62, -16), (-66, -12)]
    h.body(sym_pts(outer), "url(#kodDark)", sw=0.3)
    inner = [(58, -12), (50, -19), (28, -22), (-28, -22), (-46, -18), (-56, -11)]
    h.module(sym_pts(inner), D2, hatches=False)
    third = [(44, -8), (36, -14), (20, -16), (-20, -16), (-36, -12), (-44, -7)]
    h.module(sym_pts(third), D3, hatches=False)
    for s in (-1, 1):
        for xx in (40, 14, -12, -38): h.dark_pdc(xx, s * 8)
        h.dark_pdc(-52, s * 13)
        # spaced armour: standoff plates along the flanks and over the shoulders
        h.spaced([(46, s * 12), (36, s * 22), (14, s * 26), (6, s * 26), (6, s * 12)])
        h.spaced([(-2, s * 12), (-2, s * 26), (-26, s * 26), (-26, s * 12)])
        h.spaced([(-30, s * 12), (-30, s * 26), (-48, s * 22), (-56, s * 14), (-56, s * 12)])
        h.f(poly([(-60, s * 15), (-60, s * 22), (-66, s * 18), (-66, s * 13)], GRAPH, stroke=EDGE, sw=0.2), mid=True)
    h.dark_engines(-hx, [-8, 0, 8], 2.6)
    # the prow: a heavy spaced bow plate with the projectors set into it
    h.spaced(sym_pts([(62, -8), (56, -16), (48, -18), (48, 0)]) if False else [(62, -8), (56, -16), (48, -18), (48, 18), (56, 16), (62, 8)], D1)
    h.lattice_ring(-6, 10)
    h.projector(52, 0, 4.2); h.projector(44, -11.5, 3.2); h.projector(44, 11.5, 3.2)
    h.dark_spine(-56, -18, 0.8); h.dark_spine(6, 34, 0.8)
    h.f(rect(58.5, -3.0, 1.8, 6, "#04070a", stroke=EDGE, sw=0.14), mid=True)
    h.antenna(30, -27, 5, -4); h.antenna(30, 27, 5, 4)
    h.dim_nav((-30, -28.4), (-30, 28.4))
    return h, 70


def sentence():
    """Striker, battleship: a hull built around its racks. Open launcher rails stacked along both flanks, the drive ring, five engines, almost no plate. Committed the moment it lands."""
    h = Dark("kes-sentence", u=1.8, cell=6.4)
    hx = 96
    core = [(hx, -8), (84, -16), (60, -20), (-60, -20), (-80, -16), (-96, -12)]
    h.body(sym_pts(core), "url(#kodDark)", sw=0.3)
    for s in (-1, 1):
        # rack wings: thin frames carrying open rails
        frame = [(62, s * 20), (58, s * 40), (-56, s * 40), (-62, s * 30), (-62, s * 20)]
        h.body(frame, D1, grid=False)
        for yy in (25.5, 33.5):
            h.rack(-56, 56, s * yy, 9, 5.0, s)
        for xx in (20, -20): h.f(line(xx, s * 21, xx, s * 39, stroke=EDGE, sw=0.3))
        h.dark_pdc(70, s * 12); h.dark_pdc(-70, s * 11); h.dark_pdc(0, s * 15)
        h.f(poly([(-78, s * 15), (-78, s * 22), (-88, s * 17), (-88, s * 12)], GRAPH, stroke=EDGE, sw=0.2), mid=True)
    h.dark_engines(-hx, [-9, -4.5, 0, 4.5, 9], 2.4)
    h.lattice_ring(-30, 11)
    h.module(cham(0, -10, 50, 20, 2.0), D2, hatches=False); h.module(cham(8, -5, 30, 10, 1.4), D3, hatches=False)
    h.dark_spine(-76, -44, 0.9); h.dark_spine(-14, 70, 0.9)
    h.dark_visor(hx, 8, 16, 9, n_eyes=3)
    h.antenna(80, -14, 6, -5); h.antenna(80, 14, 6, 5)
    h.dim_nav((-56, -40.4), (-56, 40.4))
    h.facets(sym_pts(core), 4)
    return h, 100



def lattice_ring(self, x, r, housing, seam, edge):
    """The gate-born drive: a housing round a ring of pale Lattice segments that do not quite touch."""
    self.f(circ(x + 0.6, 0.6, r * 1.18, SHADOW))
    self.f(circ(x, 0, r * 1.18, housing, stroke=seam, sw=0.3), mid=True)
    self.f(circ(x, 0, r * 1.02, "#04070a", stroke=edge, sw=0.14), mid=True)
    self.f(circ(x, 0, r * 0.95, LATG, extra='opacity="0.22" filter="url(#glowSoft)"'))
    n = 7; gap = 9
    for i in range(n):
        a0 = i * 360 / n + gap / 2; a1 = (i + 1) * 360 / n - gap / 2
        r0, r1 = r * 0.72, r * 0.92
        def pt(a, rr): return (x + math.cos(math.radians(a)) * rr, math.sin(math.radians(a)) * rr)
        p0, p1, p2, p3 = pt(a0, r1), pt(a1, r1), pt(a1, r0), pt(a0, r0)
        large = 0
        d = (f"M {p0[0]:.2f} {p0[1]:.2f} A {r1:.2f} {r1:.2f} 0 {large} 1 {p1[0]:.2f} {p1[1]:.2f} L {p2[0]:.2f} {p2[1]:.2f} "
             f"A {r0:.2f} {r0:.2f} 0 {large} 0 {p3[0]:.2f} {p3[1]:.2f} Z")
        self.f(f'<path d="{d}" fill="{LAT}" stroke="{LAT2}" stroke-width="0.12"></path>', mid=True)
    self.f(circ(x, 0, r * 0.5, "#04070a", stroke=edge, sw=0.14), mid=True)
    self.f(circ(x, 0, r * 0.22, LATG, extra='opacity="0.9"')); self.f(circ(x, 0, r * 0.4, LATG, extra='opacity="0.25" filter="url(#glowSoft)"'))

DEFS = ('<linearGradient id="kodDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b10"></stop><stop offset="0.3" stop-color="#151d28"></stop>'
        '<stop offset="0.5" stop-color="#1f2a37"></stop><stop offset="0.7" stop-color="#151d28"></stop><stop offset="1" stop-color="#070b10"></stop></linearGradient>')

NOTES = {
    "kes-summons": ["Watcher, frigate: a long spindle with a five-eyed sensor head, fans of passive sensor vanes, long dark radiators, an exposed truss and three engines in a block aft. Matte near-black, no spine, no flash, nav lights dim. More engine and sensor than hull; its lock is the jump target."],
    "kes-custody": ["Hunter, cruiser: three layered armour plates in near-black round a gate-born drive ring of pale Lattice segments that do not quite touch, three pin projectors on the prow where the guns should be, three doors a side, heavy flank blocks. Jumps onto the watcher's lock and holds."],
    "kes-sentence": ["Striker, battleship: a thin core between two rack wings, eighteen open launcher rails a side with the missiles showing, the drive ring amidships, five engines, almost no plate. Flown in packs by elite crews; committed the moment it lands."],
}




# ------------------------------------------------------------------ Seraphine: open about it, still in rust

from mars import Mars, RUST1, RUST2, RUST3, BONE, BONE2, SEAM, DARK, LENS

SOOT0 = "#1e0e0a"; SOOT1 = "#33170f"; SOOT2 = "#48221a"; SOOT3 = "#5c2e24"; ASH = "#8f8578"


class MarsDark(Mars):
    """Mars special operations: the Navy's plating in soot and ash, pennant kept because Mars does not hide."""
    def spaced(self, pts, fill=SOOT2):
        self.f(poly([(x + 1.6, y + 1.6) for x, y in pts], "#000000", stroke="none", sw=0, extra='opacity="0.75"'))
        for (x, y) in pts: self.f(circ(x + 0.8, y + 0.8, 0.45, SEAM))
        self.f(poly(pts, fill, stroke=SEAM, sw=0.34), mid=True)
        self.f(f'<polyline points="{P(pts[:3])}" fill="none" stroke="{RUST3}" stroke-width="0.26" opacity="0.8" stroke-linejoin="round"></polyline>')
        for (x, y) in pts: self.f(circ(x, y, 0.32, ASH))

    def strut(self, x, y0, y1, w, cross=True):
        self.f(rect(x - w / 2, min(y0, y1), w, abs(y1 - y0), SOOT1, stroke=SEAM, sw=0.18), mid=True)
        if cross:
            self.f(line(x - w / 2, y0, x + w / 2, y1, stroke=ASH, sw=0.16)); self.f(line(x + w / 2, y0, x - w / 2, y1, stroke=ASH, sw=0.16))

    def ring(self, x, r):
        lattice_ring(self, x, r, SOOT1, SEAM, ASH)
        self.f(circ(x, 0, r * 1.1, "none", stroke=BONE2, sw=0.5))

    def projector(self, x, y, r):
        """A pin projector in an armoured cradle: a barbette with a dish instead of a lens."""
        self.f(circ(x + 0.5, y + 0.5, r * 1.15, SHADOW))
        self.f(circ(x, y, r * 1.15, SOOT1, stroke=SEAM, sw=0.26), mid=True)
        self.f(circ(x, y, r, SOOT3, stroke=SEAM, sw=0.14), mid=True)
        for k in (0.72, 0.46, 0.2): self.f(circ(x, y, r * k, "none", stroke=ASH, sw=0.12))
        self.f(circ(x, y, r * 0.12, LATG))

    def dark_fins(self, x0, x1, y, n, length, side):
        w = clamp(self.u * 0.9, 0.35, 2.6); gap = (x1 - x0) / max(n - 1, 1)
        for i in range(n):
            x = x0 + gap * i
            self.f(poly([(x - w / 2, y), (x + w / 2, y), (x + w / 2 - length * 0.35, y + side * length), (x - w / 2 - length * 0.35, y + side * length)], "#2b2622", stroke=SEAM, sw=0.14), mid=True)
            self.f(line(x - length * 0.17, y + side * length * 0.1, x - length * 0.17 - length * 0.3, y + side * length * 0.9, stroke=ASH, sw=0.1))


def noctis():
    """Watcher, frigate: a narrow core between two sensor pontoons, each with a passive ring array set into it. Dark fins, three small engines, almost no plate. The labyrinth of night."""
    h = MarsDark("ser-noctis", u=1.0, cell=4.0)
    hx = 36
    top = [(hx, -2.8), (31, -4.6), (10, -5.0), (-22, -5.0), (-30, -4), (-hx, -4), (-hx, -3)]
    h.body(sym_pts(top), "url(#marsDark)")
    for s in (-1, 1):
        # the pontoon: a slim outrigger hull carrying the ring
        pont = [(26, s * 8.5), (22, s * 15.5), (-6, s * 15.5), (-10, s * 12), (-10, s * 8.5)]
        h.body(pont, SOOT1, grid=False)
        h.strut(14, s * 5.0, s * 8.5, 2.4); h.strut(-4, s * 5.0, s * 8.5, 2.4)
        cx, cy = 8, s * 12
        h.f(circ(cx, cy, 3.4, "#120806", stroke=SEAM, sw=0.26), mid=True)
        for k, sw in ((2.9, 0.4), (2.0, 0.25), (1.1, 0.25)): h.f(circ(cx, cy, k, "none", stroke=ASH, sw=sw))
        for a in range(0, 360, 45):
            h.f(circ(cx + math.cos(math.radians(a)) * 2.9, cy + math.sin(math.radians(a)) * 2.9, 0.28, LAT2, extra='opacity="0.8"'))
        h.f(circ(cx, cy, 0.5, LAT2))
        h.dark_fins(-8, 20, s * 15.5, 4, 2.6, s)
        h.plate([(8, s * 2.6), (6, s * 4.4), (-20, s * 4.4), (-24, s * 3.2), (-24, s * 2.6)], SOOT2, bolts=False)
        h.pdc(-27, s * 2.6)
        h.f(circ(24, s * 9.2, 0.3, RED if s < 0 else GREEN))
    h.skirt(-hx, 3.6, 2.4)
    h.marsengines(-hx, [-2.2, 0, 2.2], 1.3)
    h.barbette(16, 0, 1.8)
    h.slit(28, 1.6)
    h.pennant(32, 3.4, "SO-3", 1.1, (-8, -5.0 - 0.6))
    return h, 38


def cerberus():
    """Hunter, cruiser: the dog that holds. A tortoise of spaced armour belts round the ring, two armoured jaws forward with the projectors in them, three engines in a deep skirt."""
    h = MarsDark("ser-cerberus", u=1.6, cell=5.2)
    hx = 64
    top = [(hx, -12), (54, -22), (24, -28), (-30, -28), (-50, -22), (-60, -16), (-hx, -16), (-hx, -12)]
    h.body(sym_pts(top), "url(#marsDark)", sw=0.3)
    for s in (-1, 1):
        h.spaced([(50, s * 10), (42, s * 20), (26, s * 25), (16, s * 25), (16, s * 10)])
        h.spaced([(12, s * 10), (12, s * 26), (-16, s * 26), (-16, s * 10)], SOOT3)
        h.spaced([(-20, s * 10), (-20, s * 26), (-44, s * 22), (-54, s * 15), (-54, s * 10)])
        h.dark_fins(-46, 44, s * 28, 9, 3.4, s)
        for xx in (32, 0, -34): h.pdc(xx, s * 7.5)
        # the jaws: armoured prongs either side of the bow carrying a projector each
        jaw = [(hx + 10, s * 5), (hx + 2, s * 14), (hx - 12, s * 16), (hx - 12, s * 5)]
        h.body(jaw, SOOT1, grid=False)
        h.projector(hx - 2, s * 10, 3.6)
    h.ring(-6, 10)
    h.projector(hx - 1, 0, 4.4)
    h.plate(cham(-48, -9, 24, 18, 2.0), SOOT1, bolts=False); h.plate(cham(10, -9, 36, 18, 2.0), SOOT1, bolts=False)
    h.skirt(-hx, 15, 5)
    h.marsengines(-hx, [-9, 0, 9], 3.2)
    h.slit(50, 4.0)
    h.antennae(40, -24, 5, -4); h.antennae(40, 24, 5, 4)
    h.pennant(55.5, 8, "SO-1", 2.0, (-30, -28 - 1.2))
    h.nav((-30, -28.4), (-30, 28.4))
    return h, 78


def medusae():
    """Striker, battleship: a thin core carrying five heavy lenses on the centreline and arrays of small ones on the flanks, enormous radiators streaming aft, the ring, five engines, almost no plate."""
    h = MarsDark("ser-medusae", u=1.8, cell=6.4)
    hx = 94
    core = [(hx, -8), (84, -16), (60, -20), (-60, -20), (-80, -16), (-hx, -12)]
    h.body(sym_pts(core), "url(#marsDark)", sw=0.3)
    for s in (-1, 1):
        # flank arrays: a thin frame with a row of small barbettes
        frame = [(56, s * 20), (52, s * 30), (-50, s * 30), (-56, s * 26), (-56, s * 20)]
        h.body(frame, SOOT1, grid=False)
        for xx in range(-44, 50, 12): h.barbette(xx, s * 25, 3.2)
        # the tendrils: long radiators streaming aft from the frame
        for i in range(4):
            x0, y0 = -54 + i * 1.5, s * (20.5 + i * 2.4)
            x1, y1 = -54 - 38 + i * 6, s * (24 + i * 8.5)
            w = 2.2
            h.f(poly([(x0, y0 - s * w), (x0, y0 + s * w), (x1, y1 + s * w * 0.4), (x1, y1 - s * w * 0.4)], "#2b2622", stroke=SEAM, sw=0.18), mid=True)
            h.f(line(x0, y0, x1, y1, stroke=ASH, sw=0.14))
        h.pdc(70, s * 12); h.pdc(-70, s * 11)
    for x in (64, 36, 8, -20):
        h.plate(cham(x - 10, -11, 20, 22, 3.0), SOOT1, bolts=False); h.barbette(x, 0, 8.0, heavy=True)
    # the ring sits forward of the engines, between the last two lenses, offset nowhere: Mars is symmetrical
    h.ring(-50, 9.5)
    h.skirt(-hx, 11, 6)
    h.marsengines(-hx, [-8, -4, 0, 4, 8], 2.4)
    h.slit(78, 5.0)
    h.pennant(88, 10, "SO-2", 2.6, (14, -20 - 1.4))
    h.nav((-50, -30.4), (-50, 30.4))
    h.ymax = 50
    return h, 100


NOTES.update({
    "ser-noctis": ["Watcher, frigate: a narrow core in soot and ash between two sensor pontoons on struts, each with a passive ring array set into it, dark fins on the pontoons, one small barbette, three small engines, almost no plate. Named for the labyrinth of night. Mars keeps the pennant: it does not hide."],
    "ser-cerberus": ["Hunter, cruiser: the dog that holds. Three belts of spaced armour round a gate-born drive ring in a bone-rimmed soot housing, two armoured jaws forward each carrying a pin projector, a third between them, nine dark fins a side, three engines in a deep skirt."],
    "ser-medusae": ["Striker, battleship: a thin core carrying four heavy lenses on raised mounts, flank frames with eight small barbettes each, four long radiator tendrils streaming aft from each frame, the drive ring aft of the last lens, five engines, almost no plate. Elite crews, no second pass."],
})

DEFS += ('<linearGradient id="marsDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0c08"></stop><stop offset="0.3" stop-color="#3a1a12"></stop>'
         '<stop offset="0.5" stop-color="#4c241a"></stop><stop offset="0.7" stop-color="#3a1a12"></stop><stop offset="1" stop-color="#1a0c08"></stop></linearGradient>')


def all_art():
    syms, meta = [], {}
    for fn in (summons, custody, sentence, noctis, cerberus, medusae):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return DEFS, "".join(syms), meta
