"""Civil yards, pass three: Solace Medical, Halden Institute, Arbor Dynamics, Lavinia Atmospherics, and the Saro and Long Wake clans.

Venusian civil hulls share the Space Guard's grammar (blunt eggs, domes, green
regen nodes, nacelles) in each company's colour: Solace cream and white with
the green Mercy band; Halden slate and brass, more instrument than ship;
Arbor leaf green with drone ports everywhere; Lavinia pale teal with intake
scoops, heat radiators and gas tanks. The clans are Belt originals: Saro in
charcoal with white chart lines, the Long Wake in deep blue-black trailing
cables. Nose points +x.
"""
import math
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, P, clamp, fade, INK, WHITE, RED, GREEN, SHADOW, GLASS
from venus import Venus, egg, oval, SEA, SEA2, SEA3, OLIVE, GLASSG, DOMEHI, CREAM, GOLD0, GOLD1
from specops import LAT2, LATG
from belt import BeltParts as B, GUN2

TRUSS = "#6a7079"
SOL0 = "#b8b3a2"; SOL1 = "#e6e2d2"; SOL2 = "#f6f3e8"
HAL0 = "#3e4a58"; HAL1 = "#5c6b7c"; HAL2 = "#7a8ba0"; BRASS = "#c9a24a"; BRASS2 = "#e8c877"
ARB0 = "#3a5a3c"; ARB1 = "#55805a"; ARB2 = "#6f9e74"
LAV0 = "#6f8f8a"; LAV1 = "#9fc3bd"; LAV2 = "#c4e1dc"; HOT = "#ff9a5a"
SARO = "#2a2d31"; SARO2 = "#3c4047"; CHART = "#e6eef5"; LWK = "#0f1424"; LWK2 = "#1c2440"; CABLE = "#9fb0c8"


class VenCivil(Venus):
    def __init__(self, key, u, cell, grad):
        super().__init__(key, u, cell); self.grad = grad

    def shell(self, L, back_r, taper=0.4, band=None):
        """The hull egg. band=(x0, x1, colour) paints the company trim as a stripe hugging the hull edge; it is drawn straight after the plate, so every fitting sits on top, and Venus.body/nacelle keep the nacelles under the hull."""
        pts, w = egg(L, back_r, taper); self.body(pts, f"url(#{self.grad})")
        if band:
            x0, x1, col = band; self.band(x0, x1, 0.3 * self.u, w, 0.3 * self.u, col)
        return w

    def dish(self, x, y, r, brass=True):
        """A sensor dish: Halden's instrument."""
        self.f(circ(x + 0.2, y + 0.2, r * 1.05, SHADOW))
        self.f(circ(x, y, r, HAL1, stroke=OLIVE, sw=0.16), mid=True)
        for k in (0.75, 0.5, 0.25): self.f(circ(x, y, r * k, "none", stroke=BRASS if brass else SEA2, sw=0.12))
        self.f(line(x, y, x + r * 1.2, y, stroke=BRASS2 if brass else SEA2, sw=0.14)); self.f(circ(x + r * 1.2, y, r * 0.12, BRASS2 if brass else SEA2))

    def array(self, x0, x1, y, n):
        """A row of brass antenna masts on a rail, mounted inboard of the hull edge; masts point outward."""
        side = -1 if y < 0 else 1
        y_r = y - side * 1.2 * self.u
        self.f(rect(x0 - 0.6, y_r - 0.3, (x1 - x0) + 1.2, 0.6, BRASS, stroke=OLIVE, sw=0.1, rx=0.3), mid=True)
        for i in range(n):
            x = x0 + (x1 - x0) * i / max(n - 1, 1)
            self.f(circ(x, y_r, 0.45 * self.u, HAL0, stroke=BRASS, sw=0.12), mid=True)
            self.f(line(x, y_r, x, y_r + side * 2.4 * self.u, stroke=BRASS, sw=0.16)); self.f(circ(x, y_r + side * 2.4 * self.u, 0.22 * self.u, BRASS2))

    def scoop(self, x, hw, depth):
        """A gas intake across the bow: the skimmer's mouth, dark and ribbed."""
        self.f(poly([(x, -hw), (x - depth, -hw * 0.85), (x - depth, hw * 0.85), (x, hw)], "#0a1412", stroke=OLIVE, sw=0.2), mid=True)
        for k in range(1, 5):
            yy = -hw + 2 * hw * k / 5
            self.f(line(x - depth * 0.9, yy, x - depth * 0.1, yy * 1.1, stroke=LAV1, sw=0.14, extra='opacity="0.7"'))

    def radiator(self, x0, x1, y, n, length, side):
        """Heat radiators for the dive: thin pale fins that glow hot at the root."""
        gap = (x1 - x0) / max(n - 1, 1)
        for i in range(n):
            x = x0 + gap * i
            self.f(poly([(x - 0.35, y), (x + 0.35, y), (x + 0.1, y + side * length), (x - 0.6, y + side * length)], LAV2, stroke=OLIVE, sw=0.12), mid=True)
            self.f(line(x, y, x - 0.1, y + side * length * 0.4, stroke=HOT, sw=0.16, extra='opacity="0.7"'))

    def gastank(self, x, y, L, r):
        self.f(rect(x + 0.3, y - r + 0.3, L, 2 * r, SHADOW, stroke="none", sw=0, rx=r))
        self.f(rect(x, y - r, L, 2 * r, LAV1, stroke=OLIVE, sw=0.18, rx=r), mid=True)
        self.f(line(x + r, y - r * 0.5, x + L - r, y - r * 0.5, stroke=LAV2, sw=0.22, extra='opacity="0.9"'))
        self.f(rect(x + L * 0.45, y - r - 0.3, L * 0.1, 2 * r + 0.6, SEA, stroke=OLIVE, sw=0.1))

    def spine(self, x0, x1, hw, pitch):
        """An open teal truss spine for Lavinia's vacuum hulls: the industrial frame the tanks hang off."""
        self.body([(x0, -hw), (x1, -hw), (x1, hw), (x0, hw)], LAV0, grid=False, sw=0.2)
        self.f(rect(x0 + 0.4, -hw + 0.5, x1 - x0 - 0.8, 2 * hw - 1.0, "#0b1412", stroke="none", sw=0), mid=True)
        x = x0 + 0.6; k = 0
        while x + pitch <= x1 - 0.5:
            self.f(line(x, -hw + 0.5, x + pitch, hw - 0.5, stroke=LAV1, sw=0.2) if k % 2 == 0 else line(x, hw - 0.5, x + pitch, -hw + 0.5, stroke=LAV1, sw=0.2))
            x += pitch; k += 1
        self.ymax = max(self.ymax, hw)

    def beam(self, x, y0, y1, w):
        """A cross beam off the spine, carrying engines or radiators."""
        self.body([(x, y0), (x + w, y0), (x + w, y1), (x, y1)], LAV0, grid=False, sw=0.2)
        self.f(line(x + w / 2, y0 + 0.6, x + w / 2, y1 - 0.6, stroke=LAV1, sw=0.2, extra='opacity="0.7"'))

    def clamp(self, x, y_from, y_to, w=1.2):
        """A tank clamp: a strap from the spine to the tank centreline."""
        self.f(rect(x - w / 2, min(y_from, y_to), w, abs(y_to - y_from), LAV0, stroke=OLIVE, sw=0.14), mid=True)
        self.f(line(x, y_from, x, y_to, stroke=LAV2, sw=0.14, extra='opacity="0.6"'))

    def bay(self, x, y, w, h):
        """A subcraft or drone bay door in a Venusian hull: rounded, with a green edge light."""
        self.f(rect(x, y, w, h, "#0c1614", stroke=SEA2, sw=0.16, rx=0.6), mid=True)
        self.f(line(x + 0.4, y + h / 2, x + w - 0.4, y + h / 2, stroke=SEA, sw=0.12, extra='stroke-dasharray="1 1" opacity="0.8"'))

    def cross(self, x, y, r):
        """Solace's mark: the green ring, with a bar through it for medicine."""
        self.mark(x, y, r); self.f(line(x - r * 0.7, y, x + r * 0.7, y, stroke=SEA, sw=r * 0.3))

    def band(self, x0, x1, hw, w, inset, col=SEA):
        n = 14
        for s in (-1, 1):
            outer = [(x0 + (x1 - x0) * i / n, s * (w(x0 + (x1 - x0) * i / n) - inset)) for i in range(n + 1)]
            inner = [(x, y - s * 2 * hw) for x, y in outer]
            self.f(poly(outer + list(reversed(inner)), col, stroke="none", sw=0, extra='opacity="0.9"'))

    def navl(self, w, x):
        self.f(circ(x, -w(x) - 0.3, 0.36 * self.u, RED)); self.f(circ(x, w(x) + 0.3, 0.36 * self.u, GREEN))

    def stencil(self, x, y, text, fs, col=OLIVE):
        self.f(f'<text x="{x:.2f}" y="{y:.2f}" font-family="IBM Plex Mono, monospace" font-size="{fs:.2f}" fill="{col}" opacity="0.8" text-anchor="middle" letter-spacing="0.1">{text}</text>')


# ------------------------------------------------------------------ Solace

def respite():
    """Tender, small: a cream egg with one clinic dome, a repair arm each side, a pod collar, two nacelles. Flies with a wing and keeps it alive."""
    h = VenCivil("sol-respite", 0.8, 3.2, "solHull")
    w = h.shell(30, 6.5, band=(-11, 9, SEA))
    for s in (-1, 1):
        h.nacelle(-14, s * 5.4, 13, 2.2, fill=SOL0)
        h.f(rect(2, s * (w(2) - 1.2) - 0.4, 7, 0.8, SOL0, stroke=OLIVE, sw=0.12, rx=0.3), mid=True); h.f(circ(9, s * (w(2) - 1.2), 0.7, SEA2, stroke=OLIVE, sw=0.1))
        h.nodes([(-8 + i * 4, s * (w(-8 + i * 4) - 2.4)) for i in range(4)], 4)
    h.collar(-6, -(w(-6) - 1.6), 1.4, -1)
    h.dome(-2, 0, 3.4, big=True)
    h.window(12.5, w(12.5) * 0.8)
    h.cross(-12, 0, 1.0)
    h.navl(w, -9)
    return h, 17


def haven():
    """Repair tender, medium: two domes, two collars, a crane arm, a drone port, a repair bay, two nacelles. The ship that fishes your pod out."""
    h = VenCivil("sol-haven", 1.0, 4.0, "solHull")
    w = h.shell(46, 10, 0.4, band=(-18, 14, SEA))
    for s in (-1, 1):
        h.nacelle(-21, s * 8.2, 18, 2.8, fill=SOL0)
        h.collar(-2, s * (w(-2) - 2.4), 2.1, s)
        h.port(-12, s * (w(-12) - 1.8), 1.2)
        h.nodes([(-16 + i * 5, s * (w(-16 + i * 5) - 4.6)) for i in range(6)], 6)
    h.f(rect(6, -(w(6) - 1.4) - 0.5, 10, 1.0, SOL0, stroke=OLIVE, sw=0.12, rx=0.4), mid=True); h.f(circ(16, -(w(6) - 1.4), 0.8, SEA2, stroke=OLIVE, sw=0.1))
    h.bay(-18, -2.2, 7, 4.4)
    h.dome(-7, 0, 4.4, big=True); h.dome(8, 0, 2.8)
    h.window(20.5, w(20.5) * 0.8)
    h.cross(-19.5, 0, 1.3)
    h.navl(w, -14)
    return h, 25


def refuge():
    """Repair ship, heavy: a wide egg with a repair bay open amidships, four crane arms, three domes, collars, drone ports, four nacelles. Rebuilds a frigate in the field."""
    h = VenCivil("sol-refuge", 1.3, 4.8, "solHull")
    w = h.shell(76, 17, 0.4, band=(-30, 26, SEA))
    for s in (-1, 1):
        h.nacelle(-35, s * 13.5, 24, 3.6, fill=SOL0); h.nacelle(-32, s * 6.5, 20, 3.0, fill=SOL0)
        h.collar(14, s * (w(14) - 3.2), 2.8, s); h.collar(-24, s * (w(-24) - 3.2), 2.8, s)
        for xx in (0, -12): h.port(xx, s * (w(xx) - 2.2), 1.6)
        for xx in (-8, 6):
            h.f(rect(xx, s * (w(xx) - 7.5) - 0.5, 12, 1.0, SOL0, stroke=OLIVE, sw=0.12, rx=0.4), mid=True); h.f(circ(xx + 12, s * (w(xx) - 7.5), 0.9, SEA2, stroke=OLIVE, sw=0.1))
        h.nodes([(-28 + i * 7, s * (w(-28 + i * 7) - 10.5)) for i in range(8)], 8)
    h.f(rect(-16, -6, 28, 12, "#0c1614", stroke=SEA2, sw=0.2, rx=1.5), mid=True)
    for xx in range(-12, 12, 6): h.f(line(xx, -5, xx, 5, stroke=SEA, sw=0.12, extra='opacity="0.6"'))
    h.dome(-26, 0, 5.5, big=True); h.dome(20, 0, 4.4, big=True); h.dome(30, 0, 2.6)
    h.window(34, w(34) * 0.8)
    h.cross(-33, 0, 1.8)
    h.navl(w, -24)
    return h, 40


def sanctuary():
    """Hospital ship and SAR command ship: a great cream egg with five domes down the spine, pod collars along both flanks, drone and Stretcher bays, the fleet beacon under the bridge dome, six nacelles. Attacking one is the crime every power hunts."""
    h = VenCivil("sol-sanctuary", 1.7, 5.6, "solHull")
    w = h.shell(140, 32, 0.42, band=(-60, 56, SEA))
    for s in (-1, 1):
        h.nacelle(-66, s * 23, 38, 5.5, fill=SOL0); h.nacelle(-62, s * 12, 32, 4.5, fill=SOL0); h.nacelle(-58, s * 3.5, 26, 3.2, fill=SOL0) if False else None
        for xx in (30, 8, -14, -36): h.collar(xx, s * (w(xx) - 4.8), 4.0, s)
        for xx in (20, -4, -26): h.bay(xx - 5, s * (w(xx) - 13) - 2.5, 10, 5)
        h.nodes([(-50 + i * 10, s * (w(-50 + i * 10) - 20)) for i in range(10)], 10)
    h.dome(-40, 0, 11, big=True); h.dome(-16, 0, 9, big=True); h.dome(6, 0, 7.5, big=True); h.dome(26, 0, 6.5, big=True); h.dome(44, 0, 4.5)
    h.f(circ(54, 0, 3.2, "#0c1614", stroke=OLIVE, sw=0.2), mid=True); h.f(circ(54, 0, 1.3, SEA2)); h.f(circ(54, 0, 5, SEA2, extra='opacity="0.2"'))
    h.window(64, w(64) * 0.8)
    h.cross(-64, 0, 3.0)
    h.navl(w, -48)
    return h, 74


# ------------------------------------------------------------------ Halden

def query():
    """Survey ship, small: more sensor than ship. A slate egg with a big dish forward, a mast array, one dome, two nacelles."""
    h = VenCivil("hal-query", 0.8, 3.2, "hdnHull")
    w = h.shell(28, 6, 0.35, band=(-11, 9, BRASS))
    for s in (-1, 1):
        h.nacelle(-13, s * 5.0, 12, 2.0, fill=HAL0)
        h.nodes([(-8 + i * 4, s * (w(-8 + i * 4) - 2.2)) for i in range(4)], 4, r=0.3)
    h.dish(6, 0, 4.2)
    h.array(-10, -2, -(w(-6) - 0.6), 4)
    h.dome(-6, 0, 2.2)
    h.window(12, w(12) * 0.7)
    h.stencil(-2, w(-2) - 1.4, "HALDEN", 0.9, BRASS2)
    h.navl(w, -9)
    return h, 16


def inquiry():
    """Survey ship, medium: two dishes, a long mast array, a lab dome, probe ports, two nacelles. What Novum expeditions borrow."""
    h = VenCivil("hal-inquiry", 1.0, 4.0, "hdnHull")
    w = h.shell(46, 9.5, 0.35, band=(-18, 16, BRASS))
    for s in (-1, 1):
        h.nacelle(-21, s * 7.8, 18, 2.8, fill=HAL0)
        h.port(-10, s * (w(-10) - 1.8), 1.2); h.port(-2, s * (w(-2) - 1.8), 1.2)
        h.nodes([(-16 + i * 5, s * (w(-16 + i * 5) - 4)) for i in range(6)], 6, r=0.35)
    h.dish(12, 0, 5.0); h.dish(-12, -(w(-12) - 4.6), 2.4)
    h.array(-18, 4, w(-6) - 0.6, 6)
    h.dome(0, 0, 3.6, big=True)
    h.window(20.5, w(20.5) * 0.7)
    h.stencil(-8, 1.2, "HALDEN", 1.1, BRASS2)
    h.navl(w, -14)
    return h, 25


def expedition():
    """Explorer and exploration command ship: a long slate hull built round a great dish, mast arrays down both flanks, a lab dome cluster, long-range tanks along the sides, probe bays, the fleet beacon, four nacelles. Built for the Dark, and the Shoals one day."""
    h = VenCivil("hal-expedition", 1.5, 5.2, "hdnHull")
    w = h.shell(100, 20, 0.38, band=(-42, 40, BRASS))
    for s in (-1, 1):
        h.nacelle(-46, s * 15, 30, 4.4, fill=HAL0); h.nacelle(-42, s * 6.5, 24, 3.4, fill=HAL0)
        h.gastank(-30, s * (w(-30) - 4.5), 30, 3.0) if False else None
        h.f(rect(-32, s * (w(-30) - 3.6) - 2.6, 30, 5.2, HAL1, stroke=OLIVE, sw=0.18, rx=2.6), mid=True)
        for xx in (10, 0, -10): h.port(xx, s * (w(xx) - 2.4), 1.8)
        h.array(-20, 20, s * (w(0) - 1.0), 7)
        h.nodes([(-36 + i * 9, s * (w(-36 + i * 9) - 11)) for i in range(8)], 8, r=0.4)
    h.dish(30, 0, 8.5)
    h.dish(-20, 0, 4.0)
    h.dome(0, 0, 5.5, big=True); h.dome(-8, 0, 3.0)
    h.f(circ(10, 0, 2.6, "#0c1614", stroke=OLIVE, sw=0.2), mid=True); h.f(circ(10, 0, 1.0, SEA2)); h.f(circ(10, 0, 4, SEA2, extra='opacity="0.2"'))
    h.window(45, w(45) * 0.7)
    h.stencil(-30, 1.4, "HALDEN", 1.6, BRASS2)
    h.navl(w, -34)
    return h, 54


# ------------------------------------------------------------------ Arbor

def canopy():
    """Drone tender, medium: a leaf-green egg with drone ports all along both flanks, two bays, a control dome, two nacelles. A civilian hull that fights like a small carrier."""
    h = VenCivil("arb-canopy", 1.0, 4.0, "arbHull")
    w = h.shell(48, 10, 0.4, band=(-18, 16, ARB2))
    for s in (-1, 1):
        h.nacelle(-22, s * 8.2, 18, 2.8, fill=ARB0)
        for xx in (-14, -8, -2, 4, 10): h.port(xx, s * (w(xx) - 1.6), 1.1)
        h.bay(-12, s * (w(-12) - 6.5) - 1.6, 9, 3.2)
        h.nodes([(-16 + i * 5, s * (w(-16 + i * 5) - 4.2)) for i in range(6)], 6)
    h.dome(-2, 0, 3.8, big=True)
    h.f(circ(10, 0, 1.6, "#0c1614", stroke=OLIVE, sw=0.16), mid=True); h.f(circ(10, 0, 0.6, SEA2))
    h.window(21, w(21) * 0.75)
    h.stencil(-8, 1.2, "ARBOR", 1.1, SEA3)
    h.navl(w, -14)
    return h, 26


# ------------------------------------------------------------------ Lavinia

def zephyr():
    """Skimmer, small: a teal egg with an intake scoop across the bow, a small gas tank each side, radiator fins aft, a pilot dome, two nacelles. The first skimmer anyone flies."""
    h = VenCivil("lav-zephyr", 0.8, 3.2, "lavHull")
    w = h.shell(30, 6.5, 0.3, band=(-10, 8, LAV0))
    for s in (-1, 1):
        h.nacelle(-14, s * 5.4, 12, 2.2, fill=LAV0)
        h.gastank(-6, s * (w(-6) - 1.6), 9, 1.4)
        h.radiator(-12, -6, s * (w(-9) - 0.6), 4, 2.4, s)
        h.nodes([(0 + i * 3, s * (w(i * 3) - 2.4)) for i in range(3)], 3)
    h.scoop(15, w(14) * 0.95, 4.5)
    h.dome(4, 0, 2.6)
    h.stencil(-2, 5.4, "LAVINIA", 0.8, LAV2)
    h.navl(w, -9)
    h.ymax = 9
    return h, 17


def gale():
    """Skimmer, medium: a bigger scoop, two tanks a side, a radiator spine, a heat-shielded dome, two nacelles. Deeper skimming, a bigger hold; comes back hot."""
    h = VenCivil("lav-gale", 1.0, 4.0, "lavHull")
    w = h.shell(48, 10, 0.3, band=(-18, 14, LAV0))
    for s in (-1, 1):
        h.nacelle(-22, s * 8.2, 18, 2.8, fill=LAV0)
        h.gastank(-16, s * (w(-16) - 2.6), 12, 2.2); h.gastank(-2, s * (w(-2) - 2.6), 12, 2.2)
        h.radiator(-20, 10, s * (w(-6) - 0.5), 8, 3.2, s)
        h.nodes([(-10 + i * 5, s * (w(-10 + i * 5) - 5.8)) for i in range(5)], 5)
    h.scoop(24, w(23) * 0.95, 7)
    h.dome(10, 0, 3.4, big=True)
    h.f(circ(10, 0, 4.4, "none", stroke=HOT, sw=0.3, extra='opacity="0.6"'))
    h.stencil(-6, 1.2, "LAVINIA", 1.1, LAV2)
    h.navl(w, -14)
    h.ymax = 14
    return h, 26


def monsoon():
    """Gas tanker, heavy: an open teal truss spine with six great gas tanks clamped along it, a bridge egg forward with the dome, an engine beam aft with four nacelles. Venusian in its fittings, industrial in its bones."""
    h = VenCivil("lav-monsoon", 1.3, 4.8, "lavHull")
    h.spine(-40, 24, 3.2, 5)
    h.beam(-44, -15, 15, 3.5)
    for s in (-1, 1):
        h.nacelle(-46, s * 11.5, 10, 3.2, fill=LAV0); h.nacelle(-46, s * 4.5, 8, 2.4, fill=LAV0)
        for xx in (-38, -17, 4):
            h.clamp(xx + 4, s * 3.2, s * 9.5); h.clamp(xx + 14, s * 3.2, s * 9.5)
            h.gastank(xx, s * 9.5, 18, 4.6)
        h.f(circ(-34, s * 14.4, 0.5, RED if s < 0 else GREEN))
    pts, w = egg(26, 6.5, 0.4); h.body([(x + 32, y) for x, y in pts], "url(#lavHull)")
    h.band(22, 42, 0.4, lambda x: w(x - 32), 0.4, LAV0)
    h.nodes([(-30 + i * 9, 0) for i in range(6)], 6)
    h.dome(32, 0, 4.0, big=True)
    h.window(40, w(8) * 0.7)
    h.stencil(-8, -11.6 if False else 1.0, "LAVINIA", 1.4, LAV2)
    h.ymax = 16
    return h, 48


def cyclone():
    """Gas command ship: a carrier for skimmers. A capital truss spine with a bridge egg forward, two hangar decks of skimmer bays along each flank, product tanks clamped to the spine that take the skimmers' gas, a small refinery to process it, a radiator wall aft, point-defence blasters at the corners, the fleet beacon, six nacelles. It does not skim; its wing does."""
    h = VenCivil("lav-cyclone", 1.8, 6.4, "lavHull")
    h.spine(-66, 44, 5.0, 7)
    h.beam(-70, -26, 26, 5)
    h.beam(-50, -34, 34, 4)
    for s in (-1, 1):
        h.nacelle(-72, s * 21, 14, 4.8, fill=LAV0); h.nacelle(-72, s * 12, 12, 4.0, fill=LAV0); h.nacelle(-72, s * 4.5, 10, 3.2, fill=LAV0)
        # hangar decks: two long modules a side on heavy struts, four skimmer bays each
        for xx in (-40, 2):
            for sx in (xx + 6, xx + 30): h.f(line(sx, s * 5, sx, s * 24, stroke=LAV0, sw=1.6)); h.f(line(sx, s * 5, sx, s * 24, stroke=LAV2, sw=0.2, extra='opacity="0.6"'))
            h.module([(xx, s * 24 - 7), (xx + 36, s * 24 - 7), (xx + 36, s * 24 + 7), (xx, s * 24 + 7)], LAV0, hatches=False)
            for k in range(4): h.bay(xx + 1.5 + k * 8.6, s * 24 - 5.2, 7.4, 10.4)
            h.f(line(xx + 1, s * 24 + s * 7.6, xx + 35, s * 24 + s * 7.6, stroke=SEA2, sw=0.3, extra='stroke-dasharray="1.5 1.5" opacity="0.9"'))
        for xx in (-30, -6):
            h.clamp(xx + 4, s * 5, s * 12); h.clamp(xx + 14, s * 5, s * 12)
            h.gastank(xx, s * 12, 18, 4.2)
        h.blaster(-62, s * 30, 2.4); h.blaster(38, s * 30, 2.4) if False else None
        h.blaster(40, s * 14, 2.4)
        h.f(circ(-67.5, s * 25.3, 0.6, RED if s < 0 else GREEN))
    for s in (-1, 1):
        for k in range(8):
            yy = s * (6 + k * 3.6)
            h.f(poly([(-56, yy - 1.0), (-46, yy - 1.0), (-46, yy + 1.0), (-56, yy + 1.0)], LAV2, stroke=OLIVE, sw=0.12), mid=True)
            h.f(line(-47, yy, -51, yy, stroke=HOT, sw=0.4, extra='opacity="0.7"'))
    for xx in (-24, -12): h.f(circ(xx, 0, 3.6, "#1a0e06", stroke=OLIVE, sw=0.3), mid=True); h.f(circ(xx, 0, 1.8, HOT))
    h.f(circ(-40, 0, 2.8, "#0c1614", stroke=OLIVE, sw=0.2), mid=True); h.f(circ(-40, 0, 1.1, SEA2)); h.f(circ(-40, 0, 4.5, SEA2, extra='opacity="0.2"'))
    pts, w = egg(40, 10, 0.3); h.body([(x + 36, y) for x, y in pts], "url(#lavHull)")
    h.band(20, 52, 0.5, lambda x: w(x - 36), 0.5, LAV0)
    h.dome(32, 0, 6.0, big=True); h.dome(44, 0, 3.4)
    h.window(54, w(18) * 0.8)
    h.stencil(-54, 1.2, "LAVINIA", 2.2, LAV2)
    h.ymax = 33
    return h, 76


# ------------------------------------------------------------------ the clans

def chartlines(h, top, n_diag, n_long):
    """White chart lines over a clan hull, clipped to where the hull is full width."""
    xs=[p[0] for p in top]; ys=[p[1] for p in top]
    x0=min(x for x,y in top if y<=min(ys)+0.01); x1=max(x for x,y in top if y<=min(ys)+0.01); hw=-min(ys)
    for k in range(n_diag):
        x=x0+(x1-x0)*(k+0.5)/n_diag
        h.f(line(x-2, -hw+0.4, x+2, hw-0.4, stroke=CHART, sw=0.14, extra='opacity="0.45"'))
    for k in range(n_long):
        yy=-hw+2*hw*(k+1)/(n_long+1)
        h.f(line(x0, yy, x1, yy+1, stroke=CHART, sw=0.1, extra='opacity="0.35"'))


def farwalker():
    """Saro Farwalker, clan explorer: a long charcoal hull drawn over with chart lines, a great dish on a mount, long-range tanks strutted to the flanks, a clan hall dome, a probe hangar, four engines. The hull that crossed the Shoals."""
    h = Hull("saro-farwalker", 1.4, 5.0); h.stroke = "#000000"
    top = [(60, -6), (50, -14), (20, -17), (-40, -17), (-52, -12), (-60, -8)]
    h.body(sym_pts(top), "url(#saroHull)")
    chartlines(h, top, 6, 3)
    B.truss(h, -44, 44, -2.2, 2.2, 4)
    for s in (-1, 1):
        for xx in (-30, -12, 6): h.f(line(xx, s * 10.6, xx, s * 16.5, stroke=GUN2, sw=0.5))
        h.f(rect(-36, s * 13 - 2.4, 36, 4.8, SARO2, stroke="#000000", sw=0.18, rx=2.4), mid=True)
        h.f(line(-33, s * 12, -3, s * 12, stroke=CHART, sw=0.14, extra='opacity="0.5"'))
        B.engine(h, -60, s * 7, 3.0); B.engine(h, -60, s * 2.3, 2.4)
        for xx in (14, 6): h.f(circ(xx, s * 11, 1.6, "#05070a", stroke=CHART, sw=0.14), mid=True)
        B.patch(h, [(28 + s, s * 8), (40, s * 9), (38, s * 13), (26, s * 12)], SARO2)
    h.f(rect(-14, -6, 10, 12, "#05070a", stroke=CHART, sw=0.16, rx=0.6), mid=True)
    for k in range(3): h.f(line(-12 + k * 3, -5, -12 + k * 3, 5, stroke=SARO2, sw=0.3))
    h.f(rect(26, -3, 12, 6, SARO2, stroke="#000000", sw=0.16), mid=True)
    h.f(circ(34, 0, 9, SARO2, stroke="#000000", sw=0.2), mid=True)
    for k in (0.75, 0.5, 0.25): h.f(circ(34, 0, 9 * k, "none", stroke=CHART, sw=0.14))
    h.f(line(34, 0, 46, 0, stroke=CHART, sw=0.16)); h.f(circ(46, 0, 0.9, CHART))
    h.f(circ(2, 0, 6, "url(#venDome)", stroke="#000000", sw=0.18), mid=True)
    h.f(circ(-30, -16.9, 0.5, RED)); h.f(circ(-30, 16.9, 0.5, GREEN))
    h.f(f'<text x="-24" y="-7.4" font-family="IBM Plex Mono, monospace" font-size="1.6" fill="{CHART}" opacity="0.8" text-anchor="middle">SARO</text>')
    return h, 64


def waystar():
    """Saro Waystar, clan survey ship: a charcoal spindle with three dishes on mounts, a spine truss and chart lines, two engines. Finds lanes nobody else can."""
    h = Hull("saro-waystar", 1.0, 4.0); h.stroke = "#000000"
    top = [(32, -3), (26, -7), (-20, -8), (-28, -6), (-32, -4)]
    h.body(sym_pts(top), "url(#saroHull)")
    chartlines(h, top, 5, 2)
    B.truss(h, -24, 10, -1.4, 1.4, 3)
    for (x, y, r) in ((18, 0, 5), (-4, -3.6, 2.6), (-12, 3.6, 2.6)):
        h.f(rect(x - r * 0.5, y - r * 0.4, r, r * 0.8, SARO2, stroke="#000000", sw=0.14), mid=True)
        h.f(circ(x, y, r, SARO2, stroke="#000000", sw=0.16), mid=True)
        for k in (0.7, 0.4): h.f(circ(x, y, r * k, "none", stroke=CHART, sw=0.12))
        h.f(circ(x, y, r * 0.12, CHART))
    for s in (-1, 1): B.patch(h, [(-22, s * 2), (-14, s * 2.5), (-15, s * 6.5), (-23, s * 5.5)], SARO2)
    B.engine(h, -32, -2.2, 1.8); B.engine(h, -32, 2.2, 1.8)
    h.f(circ(-18, -7.7, 0.4, RED)); h.f(circ(-18, 7.7, 0.4, GREEN))
    return h, 34


def trawl():
    """Long Wake Trawl, clan recovery tender: a deep blue-black hull with a stern gantry trailing cables and nets far aft, two great drums, a winch house, three engines. Finds what everyone else gave up."""
    h = Hull("lw-trawl", 1.3, 4.8); h.stroke = "#000000"
    h.body(sym_pts([(40, -8), (32, -14), (-20, -15), (-32, -11), (-40, -8)]), "url(#lwHull)")
    B.truss(h, -38, -30, -16, 16, 3)
    for s in (-1, 1):
        h.f(circ(-18, s * 7.5, 4.5, LWK2, stroke="#000000", sw=0.2), mid=True); h.f(circ(-18, s * 7.5, 2.4, "none", stroke=CABLE, sw=0.3)); h.f(circ(-18, s * 7.5, 0.8, CABLE))
        h.f(line(-22, s * 7.5, -34, s * 13, stroke=CABLE, sw=0.3, extra='opacity="0.8"'))
        for k in range(4):
            y0 = s * (4 + k * 3.4)
            h.f(circ(-34, y0, 0.5, CABLE))
            h.f(f'<path d="M -34 {y0:.2f} Q -52 {y0 * 1.15:.2f} -68 {y0 * 1.5 + s * 2:.2f}" fill="none" stroke="{CABLE}" stroke-width="0.35" opacity="0.8"></path>')
        h.f(circ(-68, s * (14 + 2), 0.8, CABLE))
        B.engine(h, -40, s * 4.5, 2.4)
    B.engine(h, -40, 0, 2.4)
    h.module(cham(0, -6, 20, 12, 1.5), LWK2, hatches=False)
    for k in range(4): h.f(line(3 + k * 4, -5, 3 + k * 4, 5, stroke=CABLE, sw=0.14, extra='opacity="0.4"'))
    h.f(rect(14, -2.5, 3, 5, GLASSG, stroke=CABLE, sw=0.14), mid=True)
    for s in (-1, 1): B.patch(h, [(24, s * 6), (32, s * 7), (31, s * 11), (22, s * 10)], LWK2)
    h.f(circ(-14, -14.6, 0.5, RED)); h.f(circ(-14, 14.6, 0.5, GREEN))
    h.ymax = 18
    return h, 72


def keel():
    """Long Wake Keel, clan salvage tender: a blue-black hull with a keel clamp underneath that takes a whole wreck, two claws on pivots forward, cable drums, three engines. Brings back whole what others bring back in pieces."""
    h = Hull("lw-keel", 1.1, 4.4); h.stroke = "#000000"
    h.body(sym_pts([(34, -6), (28, -11), (-24, -12), (-30, -9), (-34, -6)]), "url(#lwHull)")
    h.f(rect(-26, -4, 50, 8, "#070a14", stroke=CABLE, sw=0.2, rx=1.0), mid=True)
    for xx in range(-22, 22, 8): h.f(rect(xx, -3.2, 2.4, 6.4, LWK2, stroke=CABLE, sw=0.12))
    for s in (-1, 1):
        h.f(circ(-14, s * 8.0, 3.0, LWK2, stroke="#000000", sw=0.18), mid=True); h.f(circ(-14, s * 8.0, 1.6, "none", stroke=CABLE, sw=0.25)); h.f(circ(-14, s * 8.0, 0.5, CABLE))
        h.f(rect(18, s * 7.5 - 1.2, 4, 2.4, LWK2, stroke="#000000", sw=0.14), mid=True)
        h.f(rect(20, s * 7.5 - 0.4, 9, 0.8, GUN2, stroke="#000000", sw=0.12), mid=True); h.f(circ(20, s * 7.5, 0.9, LWK2, stroke=CABLE, sw=0.12))
        for sg in (-1, 1): h.f(f'<path d="M 29 {s * 7.5 + sg * 0.4:.2f} Q 31 {s * 7.5 + sg * 2.4:.2f} 32.5 {s * 7.5 + sg * 1.0:.2f}" fill="none" stroke="{GUN2}" stroke-width="0.5" stroke-linecap="round"></path>')
        B.patch(h, [(-6, s * 5), (4, s * 5.5), (3, s * 9.5), (-7, s * 9)], LWK2)
        B.engine(h, -34, s * 4, 2.2)
    B.engine(h, -34, 0, 2.2)
    h.f(rect(16, -2.5, 3, 5, GLASSG, stroke=CABLE, sw=0.14), mid=True)
    h.f(circ(-20, -11.6, 0.45, RED)); h.f(circ(-20, 11.6, 0.45, GREEN))
    return h, 38


DEFS = ('<linearGradient id="hdnHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e3844"></stop><stop offset="0.3" stop-color="#55657a"></stop>'
        '<stop offset="0.5" stop-color="#6c7f96"></stop><stop offset="0.7" stop-color="#55657a"></stop><stop offset="1" stop-color="#2e3844"></stop></linearGradient>'
        '<linearGradient id="arbHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c452e"></stop><stop offset="0.3" stop-color="#507a55"></stop>'
        '<stop offset="0.5" stop-color="#689a6e"></stop><stop offset="0.7" stop-color="#507a55"></stop><stop offset="1" stop-color="#2c452e"></stop></linearGradient>'
        '<linearGradient id="lavHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f6f6b"></stop><stop offset="0.3" stop-color="#8fb3ad"></stop>'
        '<stop offset="0.5" stop-color="#b3d4ce"></stop><stop offset="0.7" stop-color="#8fb3ad"></stop><stop offset="1" stop-color="#4f6f6b"></stop></linearGradient>'
        '<linearGradient id="saroHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15181c"></stop><stop offset="0.3" stop-color="#2a2e34"></stop>'
        '<stop offset="0.5" stop-color="#363b43"></stop><stop offset="0.7" stop-color="#2a2e34"></stop><stop offset="1" stop-color="#15181c"></stop></linearGradient>'
        '<linearGradient id="lwHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080b14"></stop><stop offset="0.3" stop-color="#151c30"></stop>'
        '<stop offset="0.5" stop-color="#1e2740"></stop><stop offset="0.7" stop-color="#151c30"></stop><stop offset="1" stop-color="#080b14"></stop></linearGradient>')

NOTES = {
    "sol-respite": ["Solace Respite, tender: a cream egg with one clinic dome, a repair arm each side, a pod collar, four regen nodes a side, two nacelles, the green band and the Solace ring. Flies with a wing and keeps it alive."],
    "sol-haven": ["Solace Haven, repair tender: two domes, a collar each side, a drone port, a crane arm, a repair bay to port, two nacelles. The ship that fishes your pod out. Field pattern: armour over comfort."],
    "sol-refuge": ["Solace Refuge, repair ship: a wide cream egg with a repair bay open amidships, four crane arms, three domes, four collars, drone ports, four nacelles. Rebuilds a frigate in the field."],
    "sol-sanctuary": ["Solace Sanctuary, hospital ship and SAR command ship: a great cream egg with five domes down the spine, four pod collars a side, three Stretcher and drone bays a side, the fleet beacon under the bridge dome, four nacelles. Attacking one is the crime every power hunts."],
    "hal-query": ["Halden Query, survey ship: more sensor than ship. A slate egg with a big brass-ringed dish forward, a mast array, one dome, two nacelles, a brass band."],
    "hal-inquiry": ["Halden Inquiry, survey ship: two dishes, a six-mast array, a lab dome, four probe ports, two nacelles. What Novum expeditions borrow."],
    "hal-expedition": ["Halden Expedition, explorer and exploration command ship: a long slate hull built round a great dish, seven-mast arrays down both flanks, a lab dome pair, long-range tanks along the sides, six probe ports, the fleet beacon, four nacelles. Built for the Dark, and the Shoals one day."],
    "arb-canopy": ["Arbor Canopy, drone tender: a leaf-green egg with five drone ports along each flank, a bay each side, a control dome and a control node, two nacelles. A civilian hull that fights like a small carrier."],
    "lav-zephyr": ["Lavinia Zephyr, skimmer: a teal egg with an intake scoop across the bow, a small gas tank each side, four radiator fins a side aft glowing at the root, a pilot dome, two nacelles. The first skimmer anyone flies."],
    "lav-gale": ["Lavinia Gale, skimmer: a bigger scoop, two tanks a side, eight radiators a side, a heat-ringed dome, two nacelles. Deeper skimming, a bigger hold; comes back hot."],
    "lav-monsoon": ["Lavinia Monsoon, gas tanker: an open teal truss spine with six great gas tanks clamped along it, a bridge egg forward with the dome, an engine beam aft with four nacelles. Venusian in its fittings, industrial in its bones. Carries gas to the refineries; Venus's freight, finally."],
    "lav-cyclone": ["Lavinia Cyclone, the gas command ship, a carrier for skimmers: a capital truss spine with a bridge egg forward, two hangar decks a side with four skimmer bays each, product tanks clamped to the spine that take the wing's gas, two refinery stacks to process it, a radiator wall aft, point-defence blasters fore and aft, the fleet beacon, six nacelles. It does not skim; its wing does."],
    "saro-farwalker": ["Saro Farwalker, clan explorer: a long charcoal hull drawn over with white chart lines, a great dish, long-range tanks along both flanks, a clan hall dome, probe ports, four engines. The hull that crossed the Shoals."],
    "saro-waystar": ["Saro Waystar, clan survey ship: a charcoal spindle with three dishes and chart lines on the hull, two engines. Finds lanes nobody else can."],
    "lw-trawl": ["Long Wake Trawl, clan recovery tender: a deep blue-black hull trailing eight cables and their nets far aft, two great drums, a winch house, three engines. Finds what everyone else gave up."],
    "lw-keel": ["Long Wake Keel, clan salvage tender: a blue-black hull with a keel clamp underneath that takes a whole wreck, two claws forward, two cable drums, three engines. Brings back whole what others bring back in pieces."],
}


def all_art():
    syms, meta = [], {}
    for fn in (respite, haven, refuge, sanctuary, query, inquiry, expedition, canopy, zephyr, gale, monsoon, cyclone, farwalker, waystar, trawl, keel):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return DEFS, "".join(syms), meta
