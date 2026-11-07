"""Ishtar Fleet Works: the Space Guard. Pale gold and sea green, curves and domes.

Rescue first, arrest second. Hybrid weapons: twin rails along the spine for
range, blaster domes on the flanks for close. The regenerative mix shows as
green hex nodes across the plating. Pod collars and drone ports because the
Space Guard's job is getting people back. Nose points +x.
"""
import math
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, P, clamp, fade, INK, WHITE, RED, GREEN, SHADOW
from specops import lattice_ring, LAT2, LATG

GOLD0 = "#7d6e45"; GOLD1 = "#a89660"; GOLD2 = "#cdbb7f"; GOLD3 = "#e3d59f"; CREAM = "#f3ecd2"
SEA = "#2f8f6e"; SEA2 = "#6fd3a8"; SEA3 = "#bff0dc"; OLIVE = "#3a3524"; GLASSG = "#0f2a24"; DOMEHI = "#d9fff0"
DK0 = "#101a16"; DK1 = "#17251f"; DK2 = "#1f3129"; DK3 = "#2a4036"


def oval(cx, cy, rx, ry, n=28, a0=0, a1=360):
    pts = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        pts.append((cx + math.cos(a) * rx, cy + math.sin(a) * ry))
    return pts


def egg(L, back_r, taper=0.35, n=48, power=2.4):
    """A blunt, rounded hull: a superellipse that narrows towards the nose but never comes to a point.
    Returns the polygon and a function giving the half-width at any x. Nose +x."""
    a = L / 2
    def w(x):
        t = max(-1.0, min(1.0, x / a))
        base = back_r * (1 - abs(t) ** power) ** (1 / power)
        return base * (1 - taper * max(0.0, t))
    top = [(a - L * i / n, -w(a - L * i / n)) for i in range(n + 1)]
    pts = top + [(x, -y) for x, y in reversed(top[1:-1])]
    return pts, w


LISTS = ("full", "mid", "sil", "rim")


class Venus(Hull):
    """Venusian hulls layer themselves: nacelles go under the hull and the pennant stripe goes straight on the hull plate, under every fitting, however late in the builder they are called. The first body() call is the hull."""
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw); self.stroke = OLIVE
        self._hull = None

    def _lens(self): return [len(getattr(self, n)) for n in LISTS]

    def body(self, pts, fill="url(#venHull)", grid=True, sw=0.26, rough=False):
        first = self._hull is None
        if first: start = self._lens()
        super().body(pts, fill, grid, sw, rough)
        if first: self._hull = [start, self._lens()]

    def _move_under_hull(self, marks, glow=True):
        """Move everything added since marks to just before the hull."""
        start, end = self._hull
        for i, name in enumerate(LISTS):
            lst = getattr(self, name); shift = 1 if (glow and name in ("full", "mid")) else 0
            new = lst[marks[i] + shift:]; del lst[marks[i] + shift:]
            at = start[i] + shift; lst[at:at] = new
            start[i] = at + len(new); end[i] += shift + len(new)

    def nacelle(self, x_stern, y, L, r, fill=GOLD0):
        marks = self._lens()
        self.full.insert(0, ell(x_stern - r * 1.6, y, r * 1.8, r * 0.7, SEA2, 'opacity="0.45" filter="url(#glowSoft)"'))
        self.mid.insert(0, ell(x_stern - r * 1.6, y, r * 1.8, r * 0.7, SEA2, 'opacity="0.45" filter="url(#glowSoft)"'))
        pts = oval(x_stern + L / 2, y, L / 2, r)
        Hull.body(self, pts, fill, grid=False)
        self.f(ell(x_stern - 0.2, y, r * 0.5, r * 0.8, "#060a08"))
        self.f(ell(x_stern - 0.2, y, r * 0.3, r * 0.55, SEA2, 'opacity="0.9"'))
        if self._hull: self._move_under_hull(marks)

    def dome(self, x, y, r, big=False):
        self.f(circ(x + r * 0.15, y + r * 0.15, r * 1.08, SHADOW))
        self.f(circ(x, y, r * 1.08, GOLD1 if not self.civ else fade(GOLD1), stroke=OLIVE, sw=0.22), mid=True)
        self.f(circ(x, y, r, "url(#venDome)", stroke=OLIVE, sw=0.14), mid=True)
        self.f(ell(x - r * 0.35, y - r * 0.35, r * 0.28, r * 0.16, DOMEHI, 'opacity="0.7"'))
        if big:
            for k in (0.66, 0.33): self.f(circ(x, y, r * k, "none", stroke=SEA2, sw=0.1, extra='opacity="0.5"'))
            self.f(line(x - r, y, x + r, y, stroke=SEA2, sw=0.1, extra='opacity="0.4"')); self.f(line(x, y - r, x, y + r, stroke=SEA2, sw=0.1, extra='opacity="0.4"'))

    def rail(self, x0, x1, y, hw):
        """Twin rails for a railgun along the hull."""
        self.f(rect(x0, y - hw, x1 - x0, 2 * hw, GOLD0 if not self.civ else fade(GOLD0), stroke=OLIVE, sw=0.14, rx=hw), mid=True)
        for s in (-1, 1): self.f(line(x0 + 1, y + s * hw * 0.5, x1 - 1, y + s * hw * 0.5, stroke=SEA3, sw=0.14))
        for xx in (x0 + 2, (x0 + x1) / 2, x1 - 2): self.f(rect(xx - 0.5, y - hw * 1.3, 1.0, hw * 2.6, OLIVE, stroke="none", sw=0))
        self.f(circ(x1, y, hw * 0.9, GLASSG, stroke=SEA2, sw=0.12)); self.f(circ(x1, y, hw * 0.35, SEA2))

    def empty_rail(self, x0, x1, y, hw):
        """The mounts left when the Space Guard pulls the gun before selling."""
        for xx in (x0 + 2, (x0 + x1) / 2, x1 - 2): self.f(rect(xx - 0.5, y - hw * 1.3, 1.0, hw * 2.6, OLIVE, stroke="none", sw=0))
        self.f(line(x0, y, x1, y, stroke=OLIVE, sw=0.14, extra='stroke-dasharray="1 1" opacity="0.7"'))

    def blaster(self, x, y, r):
        self.f(circ(x + 0.3, y + 0.3, r * 1.1, SHADOW))
        self.f(circ(x, y, r * 1.1, GOLD1 if not self.civ else fade(GOLD1), stroke=OLIVE, sw=0.18), mid=True)
        self.f(circ(x, y, r * 0.7, GOLD3 if not self.civ else fade(GOLD3), stroke=OLIVE, sw=0.12), mid=True)
        self.f(circ(x, y, r * 0.3, GLASSG)); self.f(circ(x, y, r * 0.16, SEA2))

    def collar(self, x, y, r, side):
        """A pod docking collar on the flank: a ring with a lit throat."""
        self.f(circ(x, y, r * 1.15, GOLD0 if not self.civ else fade(GOLD0), stroke=OLIVE, sw=0.2), mid=True)
        self.f(circ(x, y, r * 0.8, "#060a08", stroke=SEA2, sw=0.16), mid=True)
        self.f(circ(x, y, r * 0.5, SEA, extra='opacity="0.35" filter="url(#glowSoft)"'))
        for a in range(0, 360, 90): self.f(circ(x + math.cos(math.radians(a)) * r, y + math.sin(math.radians(a)) * r, r * 0.12, SEA2))

    def port(self, x, y, r):
        """A round drone port."""
        self.f(circ(x, y, r, "#060a08", stroke=SEA2, sw=0.14), mid=True); self.f(circ(x, y, r * 0.45, SEA2, extra='opacity="0.6"'))

    def nodes(self, pts, n, r=None):
        """Regenerative mix nodes: small green hexes along a line of points."""
        r = r or clamp(self.u * 0.45, 0.25, 1.2)
        for (x, y) in pts:
            hexp = [(x + math.cos(math.radians(60 * k + 30)) * r, y + math.sin(math.radians(60 * k + 30)) * r) for k in range(6)]
            self.f(poly(hexp, SEA, stroke=OLIVE, sw=0.1, extra='opacity="0.85"'))

    def mark(self, x, y, r):
        """The Space Guard mark: a green ring with a gap."""
        self.f(f'<path d="M {x + r:.2f} {y:.2f} A {r:.2f} {r:.2f} 0 1 1 {x + r * math.cos(math.radians(-40)):.2f} {y + r * math.sin(math.radians(-40)):.2f}" fill="none" stroke="{SEA}" stroke-width="{r * 0.3:.2f}" stroke-linecap="round"></path>')
        self.f(circ(x, y, r * 0.22, SEA))

    def stripe(self, x0, x1, hw, w, inset):
        """Space Guard pennant: a green flank stripe with a cream edge, following the hull's curve."""
        if self.civ: return
        hw = 0.3 * self.u; inset = 0.3 * self.u
        n = 14; items = []
        for s in (-1, 1):
            outer = [(x0 + (x1 - x0) * i / n, s * (w(x0 + (x1 - x0) * i / n) - inset)) for i in range(n + 1)]
            inner = [(x, y - s * 2 * hw) for x, y in outer]
            items.append(poly(outer + list(reversed(inner)), SEA, stroke="none", sw=0, extra='opacity="0.9"'))
            items.append(f'<polyline points="{P(outer)}" fill="none" stroke="{CREAM}" stroke-width="0.2"></polyline>')
        if self._hull:
            at = self._hull[1][0]; self.full[at:at] = items; self._hull[1][0] += len(items)
        else:
            self.full += items

    def livery(self, mark_xy, stencil_xy, stencil, fs, nav_xy):
        mx, my = mark_xy
        if self.civ:
            self.f(circ(mx, my, clamp(self.u * 0.9, 0.5, 2.2), CREAM, stroke=OLIVE, sw=0.1)); self.f(circ(mx, my, clamp(self.u * 0.35, 0.2, 0.9), OLIVE))
        else:
            self.mark(mx, my, clamp(self.u * 1.3, 0.8, 3.5))
            sx, sy = stencil_xy
            self.f(f'<text x="{sx:.2f}" y="{sy:.2f}" font-family="IBM Plex Mono, monospace" font-size="{fs:.2f}" fill="{CREAM}" opacity="0.75" text-anchor="middle" letter-spacing="0.1">{stencil}</text>')
        (rx, ry), (gx, gy) = nav_xy
        self.f(circ(rx, ry, 0.36 * self.u, RED)); self.f(circ(gx, gy, 0.36 * self.u, GREEN))

    def window(self, x, hw):
        """A curved bridge glazing strip across the bow."""
        self.f(poly([(x, -hw), (x - 1.2 * self.u, -hw * 0.8), (x - 1.2 * self.u, hw * 0.8), (x, hw)], "url(#venDome)", stroke=OLIVE, sw=0.14), mid=True)


# ------------------------------------------------------------------ the hulls

def sedna(civ=False):
    """Corvette, fast rescue and picket: an egg with one big forward dome, two nacelles, a short rail. Reaches a pod before anyone else does."""
    h = Venus("ish-sedna", u=0.7, cell=3.0, civ=civ)
    pts, w = egg(32, 6.5, 0.4); h.body(pts, "url(#venHull)")
    for s in (-1, 1):
        h.nacelle(-15, s * 5.6, 14, 2.3)
        h.collar(-6, s * (w(-6) - 1.6), 1.5, s)
        h.nodes([(-10 + i * 4, s * (w(-10 + i * 4) - 2.6)) for i in range(5)], 5)
    h.dome(6, 0, 3.6, big=True)
    h.rail(-13, 1, 0, 0.6)
    h.dome(-9, 0, 1.8)
    h.window(13.5, w(13.5) * 0.8)
    h.stripe(-12, 10, 0.4, w, 0.5)
    h.livery((-13.5, 0), (1, -3.4), "CG S", 0.9, ((-10, -w(-10) - 0.3), (-10, w(-10) + 0.3)))
    return h, 18


def lakshmi(civ=False):
    """Patrol boat, Space Guard patrol and rescue escort: a long oval, a pod collar each side, a Solace kit dome aft, one railgun forward. Carries the kit and the railgun, in that order."""
    h = Venus("ish-lakshmi", u=0.9, cell=3.6, civ=civ)
    pts, w = egg(48, 9.5, 0.4); h.body(pts, "url(#venHull)")
    for s in (-1, 1):
        h.nacelle(-22, s * 8.0, 18, 2.8)
        h.collar(0, s * (w(0) - 2.4), 2.2, s)
        h.port(-12, s * (w(-12) - 1.6), 1.1)
        h.nodes([(-16 + i * 5, s * (w(-16 + i * 5) - 4.2)) for i in range(6)], 6)
        h.blaster(12, s * (w(12) - 2.2), 1.5)
        h.weapon("w2" if s < 0 else "w3", "high", "S", 12, s * (w(12) - 2.2), socket=False)
    h.dome(-9, 0, 4.6, big=True)
    h.dome(6, 0, 2.6)
    # The railgun is the mount: the empty rails are hull, the gun at their muzzle is what is fitted.
    h.empty_rail(-3, 17, 0, 0.7)
    with h.mount("w1", "high", "M", 14, 0):
        h.rail(-3, 17, 0, 0.7)
    h.window(21, w(21) * 0.8)
    h.stripe(-18, 14, 0.5, w, 0.6)
    h.livery((-20, 0), (0, -5.6), "CG P", 1.2, ((-14, -w(-14) - 0.3), (-14, w(-14) + 0.3)))
    return h, 26


def maat():
    """Frigate, hybrid: long and slim with a long twin rail down the spine, two drone ports a side, a dome amidships. Answers from range."""
    h = Venus("ish-maat", u=1.0, cell=4.0)
    pts, w = egg(66, 10.5, 0.45); h.body(pts, "url(#venHull)")
    for s in (-1, 1):
        h.nacelle(-30, s * 8.6, 22, 3.0)
        h.port(-6, s * (w(-6) - 2.0), 1.5); h.port(-16, s * (w(-16) - 2.0), 1.5)
        h.blaster(12, s * (w(12) - 2.6), 1.7); h.blaster(-24, s * (w(-24) - 2.6), 1.7)
        h.nodes([(-22 + i * 6, s * (w(-22 + i * 6) - 5.2)) for i in range(8)], 8)
        h.collar(2, s * (w(2) - 2.6), 2.0, s)
    h.dome(-6, 0, 4.2, big=True)
    h.rail(-20, 24, 0, 0.9)
    h.dome(-18, 0, 2.2)
    h.window(29, w(29) * 0.8)
    h.stripe(-26, 20, 0.6, w, 0.7)
    h.livery((-28, 0), (8, -4.0), "CG F", 1.4, ((-20, -w(-20) - 0.3), (-20, w(-20) + 0.3)))
    return h, 35


def maxwell():
    """Destroyer, hybrid: wider, two rails, four blaster domes a side, drone ports, a big dome pair. The heaviest thing Venus will admit to owning."""
    h = Venus("ish-maxwell", u=1.1, cell=4.4)
    pts, w = egg(84, 17, 0.4); h.body(pts, "url(#venHull)")
    for s in (-1, 1):
        h.nacelle(-38, s * 13.5, 26, 3.8)
        for xx in (20, 6, -8, -22): h.blaster(xx, s * (w(xx) - 3.2), 2.1)
        h.port(-14, s * (w(-14) - 7.5), 1.7); h.port(2, s * (w(2) - 7.5), 1.7)
        h.collar(-32, s * (w(-32) - 3.0), 2.4, s)
        h.nodes([(-30 + i * 7, s * (w(-30 + i * 7) - 11)) for i in range(8)], 8)
        h.rail(-24, 30, s * 4.2, 0.9)
    h.dome(-8, 0, 6.0, big=True); h.dome(-22, 0, 3.4); h.dome(8, 0, 3.4)
    h.window(38, w(38) * 0.8)
    h.stripe(-34, 26, 0.7, w, 0.8)
    h.livery((-37, 0), (22, -1.2), "CG D", 1.6, ((-28, -w(-28) - 0.3), (-28, w(-28) + 0.3)))
    return h, 44


def aphrodite():
    """Cruiser, rescue cruiser and command ship: a hospital with railguns. Three big domes, pod collars both sides, drone bays, two rails forward, a wide stern."""
    h = Venus("ish-aphrodite", u=1.6, cell=5.2)
    pts, w = egg(130, 30, 0.42); h.body(pts, "url(#venHull)")
    for s in (-1, 1):
        h.nacelle(-60, s * 21, 36, 5.5); h.nacelle(-56, s * 9.5, 30, 4.2)
        for xx in (8, -18, -40): h.collar(xx, s * (w(xx) - 4.6), 3.8, s)
        for xx in (28, -6, -30): h.port(xx, s * (w(xx) - 12), 2.4)
        for xx in (42, 24): h.blaster(xx, s * (w(xx) - 4.2), 2.6)
        h.nodes([(-50 + i * 10, s * (w(-50 + i * 10) - 18)) for i in range(10)], 10)
        h.rail(8, 50, s * 6.5, 1.1)
    h.dome(-30, 0, 11, big=True); h.dome(-4, 0, 8.5, big=True); h.dome(18, 0, 6.0, big=True)
    h.dome(-50, 0, 4.0); h.dome(34, 0, 3.4)
    h.window(58, w(58) * 0.8)
    h.stripe(-54, 44, 1.0, w, 1.0)
    h.livery((-59, 0), (0, -17), "CG A", 2.2, ((-44, -w(-44) - 0.4), (-44, w(-44) + 0.4)))
    return h, 68


def hecate():
    """Hunter, cruiser, the one Venus cannot account for: the Space Guard's curves in near-black green, the drive ring in a smooth housing, projectors under domes, no marks, no stripe."""
    h = Venus("ish-hecate", u=1.6, cell=5.2)
    h.stroke = "#050806"
    pts, w = egg(120, 26, 0.4); h.body(pts, "url(#venDark)")
    for s in (-1, 1):
        h.nacelle(-56, s * 17.5, 32, 5.0, fill=DK1)
        for xx in (24, 0, -28):
            yy = s * (w(xx) - 4.0)
            h.f(circ(xx, yy, 2.2, DK1, stroke="#2f4a3e", sw=0.14), mid=True); h.f(circ(xx, yy, 0.7, LAT2, extra='opacity="0.6"'))
        h.nodes([(-46 + i * 10, s * (w(-46 + i * 10) - 12)) for i in range(9)], 9, r=0.7)
        yy = s * (w(38) - 6.0)
        h.f(circ(38, yy, 4.6, DK2, stroke="#050806", sw=0.2), mid=True)
        for k in (3.4, 2.2, 1.0): h.f(circ(38, yy, k, "none", stroke="#4f7a68", sw=0.12))
        h.f(circ(38, yy, 0.5, LAT2))
    lattice_ring(h, -16, 9.5, DK1, "#050806", "#4f7a68")
    h.f(circ(-16, 0, 11.6, "none", stroke="#2f4a3e", sw=0.4))
    h.f(circ(14, 0, 5.4, DK2, stroke="#050806", sw=0.2), mid=True)
    for k in (4.0, 2.6, 1.2): h.f(circ(14, 0, k, "none", stroke="#4f7a68", sw=0.12))
    h.f(circ(14, 0, 0.6, LAT2))
    h.f(circ(-40, 0, 5.0, "url(#venDarkDome)", stroke="#050806", sw=0.16), mid=True)
    h.f(poly([(56, -w(56) * 0.8), (54, -w(54) * 0.6), (54, w(54) * 0.6), (56, w(56) * 0.8)], "#040705", stroke="#2f4a3e", sw=0.14), mid=True)
    h.f(circ(-44, -w(-44) - 0.4, 0.5, "#6a3a36")); h.f(circ(-44, w(-44) + 0.4, 0.5, "#2f6a4e"))
    return h, 62


def sedna_218():
    """Sedna '218: the older corvette, flatter curves from the older yard, guns removed before sale. Handed down to Venusian rescue volunteers."""
    h = Venus("ish-sedna-218", u=0.7, cell=3.0)
    top = [(15, -2.4), (12.5, -4.8), (4, -6.0), (-8, -6.0), (-13, -4.8), (-15, -3.2)]
    h.body(sym_pts(top), "url(#venHullCiv)")
    for s in (-1, 1):
        h.nacelle(-15, s * 4.8, 12, 2.0)
        h.collar(-5, s * 4.4, 1.4, s)
        h.nodes([(-9 + i * 4, s * 2.8) for i in range(4)], 4)
    h.dome(6, 0, 3.4, big=True)
    h.empty_rail(-12, 0, 0, 0.6)
    h.dome(-9, 0, 1.6)
    h.window(13.5, 2.0)
    h.mark(-12.5, 0, 1.0)
    h.f(circ(-9, -6.3, 0.26, RED)); h.f(circ(-9, 6.3, 0.26, GREEN))
    return h, 17


def lakshmi_205():
    """Lakshmi '205: the older patrol boat, boxier, a single collar, the kit dome smaller, the gun pulled. The Space Guard sells them unarmed and cheap."""
    h = Venus("ish-lakshmi-205", u=0.9, cell=3.6)
    top = [(23, -3.2), (19.5, -6.8), (8, -8.5), (-14, -8.5), (-20, -7.0), (-23, -4.5)]
    h.body(sym_pts(top), "url(#venHullCiv)")
    for s in (-1, 1):
        h.nacelle(-22, s * 7.0, 16, 2.6)
        h.port(-10, s * 6.4, 1.1)
        h.nodes([(-14 + i * 5, s * 4.4) for i in range(5)], 5)
    h.collar(2, -6.6, 2.0, -1)
    h.dome(-8, 0, 4.0, big=True)
    h.dome(8, 0, 2.6)
    h.empty_rail(-2, 16, 0, 0.7)
    h.window(21, 2.8)
    h.mark(-18, 0, 1.3)
    h.f(circ(-13, -8.8, 0.3, RED)); h.f(circ(-13, 8.8, 0.3, GREEN))
    return h, 25


DEFS = ('<linearGradient id="venHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8c7c4e"></stop><stop offset="0.3" stop-color="#c9b77c"></stop>'
        '<stop offset="0.5" stop-color="#e0d095"></stop><stop offset="0.7" stop-color="#c9b77c"></stop><stop offset="1" stop-color="#8c7c4e"></stop></linearGradient>'
        '<linearGradient id="venHullCiv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a39a7e"></stop><stop offset="0.3" stop-color="#d2c9ab"></stop>'
        '<stop offset="0.5" stop-color="#e6dfc6"></stop><stop offset="0.7" stop-color="#d2c9ab"></stop><stop offset="1" stop-color="#a39a7e"></stop></linearGradient>'
        '<radialGradient id="venDome" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#9fe8c8"></stop><stop offset="0.5" stop-color="#2f8f6e"></stop><stop offset="1" stop-color="#0f2a24"></stop></radialGradient>'
        '<radialGradient id="venDarkDome" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#4f7a68"></stop><stop offset="0.5" stop-color="#1f3129"></stop><stop offset="1" stop-color="#0a110e"></stop></radialGradient>'
        '<linearGradient id="venDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a110e"></stop><stop offset="0.3" stop-color="#17251f"></stop>'
        '<stop offset="0.5" stop-color="#1f3129"></stop><stop offset="0.7" stop-color="#17251f"></stop><stop offset="1" stop-color="#0a110e"></stop></linearGradient>')

NOTES = {
    "ish-sedna": ["Corvette, fast rescue and picket: an egg of a hull in pale gold with one big green dome forward, a pod collar each side, a short rail, two nacelles. The Space Guard mark on the stern, the green stripe along the flanks."],
    "ish-lakshmi": ["Patrol boat, Space Guard patrol and rescue escort: a long oval with a pod collar each side, a drone port, a blaster dome each side, one railgun forward and the Solace kit under a big dome aft. Carries the kit and the railgun, in that order."],
    "ish-maat": ["Frigate, hybrid: long and slim with a long twin rail down the spine, two blaster domes and two drone ports a side, a pod collar, a dome amidships. Answers from range."],
    "ish-maxwell": ["Destroyer, hybrid: wider, two rails either side of the spine, four blaster domes a side, drone ports, a collar, three domes. The heaviest thing Venus will admit to owning."],
    "ish-aphrodite": ["Cruiser, rescue cruiser and command ship: a hospital with railguns. Three big domes down the spine, three pod collars and three drone ports a side, two rails forward, four nacelles. The Space Guard's flagship in all but name."],
    "ish-hecate": ["Hunter, cruiser, the one Venus cannot account for: the Space Guard's curves in near-black green, the gate-born drive ring flush in a smooth housing, three pin projectors under dark domes, no mark, no stripe, nav lights dim. Nobody has seen it twice."],
    "ish-sedna-218": ["Sedna '218: the older corvette from before the yard went to full curves, flatter planes, the rail mounts empty where the Space Guard pulled the gun before sale, the civilian repaint. Handed down to Venusian rescue volunteers. Navy tag intact; fit your own."],
    "ish-lakshmi-205": ["Lakshmi '205: the older patrol boat, boxier, a single collar, the kit dome smaller, the gun pulled before sale. The Space Guard sells them unarmed and cheap. Navy tag intact; fit your own."],
}

ENTRIES = [
    ("ish-sedna-218", "ishtar", "corvette", "Ishtar Sedna '218", "Retired navy corvette, guns removed", "Handed down to Venusian rescue volunteers", "surplus", "ish-sedna"),
    ("ish-lakshmi-205", "ishtar", "patrol", "Ishtar Lakshmi '205", "Retired navy patrol boat, guns removed", "The Space Guard sells them with the guns removed", "surplus", "ish-lakshmi"),
]




# ------------------------------------------------------------------ fighters

from vantage import nozzle as _nozzle

def hathor(civ=False):
    """Light fighter, hybrid: a small egg with a dome canopy, a short rail each side of the spine, two nacelles. The Space Guard's fighter."""
    h = Venus("ish-hathor", u=0.35, cell=1.6, civ=civ)
    pts, w = egg(14, 3.0, 0.4); h.body(pts, "url(#venHull)")
    for s in (-1, 1):
        h.nacelle(-6.5, s * 2.6, 6, 1.0)
        h.rail(-3.5, 4.5, s * 1.2, 0.3)
        h.nodes([(-4 + i * 2, s * (w(-4 + i * 2) - 0.9)) for i in range(4)], 4, r=0.22)
        h.f(circ(-2, s * (w(-2) + 0.2), 0.16, RED if s < 0 else GREEN))
    h.dome(1.5, 0, 1.5)
    h.window(6.2, w(6.2) * 0.7)
    h.stripe(-5, 4, 0.18, w, 0.25)
    if civ:
        h.f(circ(-5, 0, 0.42, CREAM, stroke=OLIVE, sw=0.08)); h.f(circ(-5, 0, 0.16, OLIVE))
    else:
        h.mark(-5, 0, 0.6)
    return h, 7.8


def hathor_221():
    """Hathor '221: the older fighter, flatter, one rail on the spine, the gun pulled. Sold cheap to anyone who wants a trainer."""
    h = Venus("ish-hathor-221", u=0.35, cell=1.6)
    top = [(6.4, -1.0), (5.2, -2.2), (1.0, -3.0), (-4.0, -3.0), (-5.6, -2.0), (-5.6, -1.4)]
    h.body(sym_pts(top), "url(#venHullCiv)")
    for s in (-1, 1):
        h.nacelle(-6.2, s * 2.3, 5.5, 0.9)
        h.nodes([(-3.5 + i * 2, s * 2.0) for i in range(3)], 3, r=0.22)
        h.f(circ(-1.5, s * 3.1, 0.16, RED if s < 0 else GREEN))
    h.empty_rail(-3, 4.2, 0, 0.3)
    h.dome(1.0, 0, 1.4)
    h.window(5.6, 1.4)
    h.mark(-4.6, 0, 0.55)
    return h, 7.4


def stretcher():
    """Heavy SAR fighter, sold to every navy: a rounded box in cream and white, a wide two-seat dome, an open rescue bay aft with a pod cradle, two grapple arms forward, four thrusters. Generic on purpose: it has to look right in anyone's bay."""
    h = Venus("sol-stretcher", u=0.45, cell=2.0)
    h.body(cham(-7.5, -4.2, 15.5, 8.4, 1.8), "url(#solHull)")
    # the rescue bay: an open well aft with a cradle for a pod
    h.f(rect(-7.0, -2.6, 5.5, 5.2, "#0c1412", stroke=OLIVE, sw=0.16, rx=0.6), mid=True)
    h.f(circ(-4.2, 0, 1.7, "none", stroke=SEA2, sw=0.18)); h.f(circ(-4.2, 0, 0.5, SEA2, extra='opacity="0.6"'))
    for s in (-1, 1):
        # thrusters at the corners
        _nozzle(h, -7.5, s * 3.0, 0.7)
        # grapple arms: two jointed arms folded along the bow
        h.f(rect(4.5, s * 2.6 - 0.35, 4.5, 0.7, CREAM, stroke=OLIVE, sw=0.12, rx=0.3), mid=True)
        h.f(circ(9.0, s * 2.6, 0.5, "#8f8a78", stroke=OLIVE, sw=0.1)); h.f(rect(9.0, s * 2.6 - 0.25, 1.6, 0.5, "#8f8a78", stroke=OLIVE, sw=0.1, rx=0.2))
        h.f(circ(4.5, s * 2.6, 0.45, "#8f8a78", stroke=OLIVE, sw=0.1))
        # floodlights
        h.f(circ(7.6, s * 3.9, 0.3, "#fff6cc")); h.f(circ(7.6, s * 3.9, 0.7, "#fff6cc", extra='opacity="0.25" filter="url(#glowSoft)"'))
        h.f(circ(-6.8, s * 4.4, 0.2, RED if s < 0 else GREEN))
        # the green band: the Mercy Clause marking everyone recognises
        h.f(rect(-1.0, s * 4.2 - (0.5 if s > 0 else 0), 4.0, 0.5, SEA, stroke="none", sw=0))
    h.dome(1.0, 0, 2.3, big=True)
    h.mark(-1.0, -2.9, 0.55); h.mark(-1.0, 2.9, 0.55)
    h.f(f'<text x="3.2" y="{-3.0:.2f}" font-family="IBM Plex Mono, monospace" font-size="0.7" fill="{OLIVE}" opacity="0.7" text-anchor="middle">SAR</text>')
    return h, 11.5


DEFS += ('<linearGradient id="solHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8b3a2"></stop><stop offset="0.3" stop-color="#e6e2d2"></stop>'
         '<stop offset="0.5" stop-color="#f6f3e8"></stop><stop offset="0.7" stop-color="#e6e2d2"></stop><stop offset="1" stop-color="#b8b3a2"></stop></linearGradient>')

NOTES.update({
    "ish-hathor": ["Ishtar Hathor, light fighter, hybrid: a small pale gold egg with a green dome canopy, a short rail each side of the spine, two nacelles, regen nodes, the Space Guard mark. Named for a Venusian volcano. Navy or civilian grade."],
    "ish-hathor-221": ["Hathor '221: the older fighter, flatter planes, one rail on the spine with the gun pulled before sale, the civilian repaint. Sold cheap to anyone who wants a trainer. Navy tag intact."],
    "sol-stretcher": ["Solace Stretcher, heavy SAR fighter, sold to every navy under the Mercy Clause: a rounded box in cream and white, a wide two-seat dome, an open rescue bay aft with a pod cradle, two folded grapple arms and floodlights forward, four corner thrusters, the green band and the Space Guard mark. Generic on purpose: it flies from Kessari, Seraphine and Union bays as well as Venusian ones."],
})

ENTRIES += [
    ("ish-hathor-221", "ishtar", "craft", "Ishtar Hathor '221", "Light fighter, retired navy, gun removed", "Sold cheap to anyone who wants a trainer", "surplus", "ish-hathor"),
]


def all_art():
    syms, meta = [], {}
    for fn in (sedna, lakshmi, maat, maxwell, aphrodite, hecate, sedna_218, lakshmi_205, hathor, hathor_221, stretcher):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
        if fn in (sedna, lakshmi, hathor):
            hc, _ = fn(civ=True); syms.append(hc.symbols(R)); meta[h.key]["civ"] = True
    return DEFS, "".join(syms), meta
