"""The independents: Meridian Yards and Corvane Heavy Industries.

Meridian: registry grey, one safety-yellow band, rounded boxes, bolt rows, a
big canopy, bolt-on gun pods on standard rings, box engines, container racks.
Every part interchangeable, so the same parts appear on every hull.

Corvane: dark steel and industrial orange. Heavy, ugly, well built: external
tanks, pipework, gun blisters, hazard chevrons, furnace stacks on the
industrials. Nose points +x.
"""
import math
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, P, clamp, fade, INK, WHITE, RED, GREEN, SHADOW, GLASS

MER0 = "#6f7378"; MER1 = "#9a9ea3"; MER2 = "#b9bdc1"; MER3 = "#d2d5d8"; MSEAM = "#2e3237"; YEL = "#e8c547"
COR0 = "#262c32"; COR1 = "#3a434b"; COR2 = "#4f5962"; COR3 = "#66717b"; CSEAM = "#0f1316"; ORANGE = "#e07b2a"; HAZ = "#15181b"
CANOPY = "#0f2a3a"; CANOPY2 = "#1b4d66"


class Indep(Hull):
    def rbox(self, x, y, w, h, r, fill, grid=True):
        """A rounded box as a body: the independents' basic volume."""
        n = 6; pts = []
        for (cx, cy, a0) in ((x + w - r, y + r, -90), (x + w - r, y + h - r, 0), (x + r, y + h - r, 90), (x + r, y + r, 180)):
            for i in range(n + 1):
                a = math.radians(a0 + 90 * i / n); pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
        self.body(pts, fill, grid=grid)
        return pts

    def bolts(self, x0, x1, y, n):
        for i in range(n): self.f(circ(x0 + (x1 - x0) * (i + 0.5) / n, y, 0.14 * self.u + 0.08, MSEAM))

    def canopy(self, x, y, rx, ry):
        self.f(ell(x + 0.2, y + 0.2, rx, ry, SHADOW))
        self.f(ell(x, y, rx, ry, CANOPY, f'stroke="{MSEAM}" stroke-width="0.18"'), mid=True)
        self.f(f'<path d="M {x - rx * 0.6:.2f} {y - ry * 0.3:.2f} Q {x:.2f} {y - ry * 0.9:.2f} {x + rx * 0.6:.2f} {y - ry * 0.3:.2f}" fill="none" stroke="{CANOPY2}" stroke-width="0.2" opacity="0.9"></path>')

    def ring_mount(self, x, y, r):
        """The standard turret ring everything bolts to."""
        self.f(circ(x, y, r, MER2, stroke=MSEAM, sw=0.16), mid=True)
        for a in range(0, 360, 60): self.f(circ(x + math.cos(math.radians(a)) * r * 0.78, y + math.sin(math.radians(a)) * r * 0.78, r * 0.1, MSEAM))

    def gunpod(self, x, y, r, dark=False):
        """A bolt-on gun pod on a ring mount: Meridian's weapon, Corvane's too in a darker shade."""
        self.ring_mount(x, y, r) if not dark else self.f(circ(x, y, r, COR2, stroke=CSEAM, sw=0.16), mid=True)
        self.f(rect(x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.9, MSEAM if not dark else HAZ, stroke="none", sw=0, rx=0.15), mid=True)
        self.f(rect(x + r * 0.2, y - r * 0.12, r * 1.4, r * 0.24, MER3 if not dark else COR3, stroke=MSEAM if not dark else CSEAM, sw=0.1))

    def box_engine(self, x_stern, y, w, h, dark=False):
        self.full.insert(0, ell(x_stern - h * 0.9, y, h * 1.2, h * 0.5, "#ffb060", 'opacity="0.45" filter="url(#glowSoft)"'))
        self.mid.insert(0, ell(x_stern - h * 0.9, y, h * 1.2, h * 0.5, "#ffb060", 'opacity="0.45" filter="url(#glowSoft)"'))
        self.f(rect(x_stern, y - h / 2, w, h, MER0 if not dark else COR1, stroke=MSEAM if not dark else CSEAM, sw=0.2, rx=0.4), mid=True)
        self.f(rect(x_stern + 0.6, y - h * 0.3, w * 0.5, h * 0.6, MER1 if not dark else COR2, stroke="none", sw=0, rx=0.2))
        self.f(ell(x_stern, y, h * 0.22, h * 0.36, "#060a0f")); self.f(ell(x_stern, y, h * 0.14, h * 0.25, "#ffb060", 'opacity="0.9"'))

    def band(self, x, hw, w=None):
        """Meridian's one safety-yellow band, across the hull."""
        w = w or clamp(self.u * 1.2, 0.6, 2.4)
        self.f(rect(x - w / 2, -hw, w, 2 * hw, YEL if not self.civ else fade(YEL), stroke=MSEAM, sw=0.12), mid=True)

    def container(self, x, y, w, h, col):
        self.f(rect(x, y, w, h, col, stroke=MSEAM, sw=0.14, rx=0.2), mid=True)
        for k in (0.25, 0.5, 0.75): self.f(line(x + w * k, y + 0.2, x + w * k, y + h - 0.2, stroke=MSEAM, sw=0.08, extra='opacity="0.6"'))

    def rack(self, x, y, w, h, cols, rows, colours):
        """An open container rack: a frame with standard containers in it."""
        self.f(rect(x - 0.4, y - 0.4, w + 0.8, h + 0.8, MER0, stroke=MSEAM, sw=0.16), mid=True)
        cw, ch = w / cols, h / rows
        k = 0
        for r in range(rows):
            for c in range(cols):
                self.container(x + c * cw + 0.2, y + r * ch + 0.2, cw - 0.4, ch - 0.4, colours[k % len(colours)]); k += 1

    def hazard(self, x, y, w, h, vertical=False):
        """Corvane's hazard chevrons: orange and black."""
        self.f(rect(x, y, w, h, ORANGE, stroke="none", sw=0), mid=True)
        step = (h if vertical else w) / 6
        for i in range(0, 6, 2):
            if vertical: self.f(rect(x, y + i * step, w, step, HAZ, stroke="none", sw=0))
            else: self.f(rect(x + i * step, y, step, h, HAZ, stroke="none", sw=0))

    def tank(self, x, y, L, r):
        """An external cylindrical tank along the flank."""
        self.f(rect(x + 0.3, y - r + 0.3, L, 2 * r, SHADOW, stroke="none", sw=0, rx=r))
        self.f(rect(x, y - r, L, 2 * r, COR2, stroke=CSEAM, sw=0.18, rx=r), mid=True)
        self.f(line(x + r, y - r * 0.5, x + L - r, y - r * 0.5, stroke=COR3, sw=0.18, extra='opacity="0.7"'))
        for k in (0.3, 0.7): self.f(line(x + L * k, y - r, x + L * k, y + r, stroke=CSEAM, sw=0.14))

    def pipes(self, x0, x1, ys):
        for y in ys: self.f(line(x0, y, x1, y, stroke=COR3, sw=0.3)); self.f(line(x0, y, x1, y, stroke=ORANGE, sw=0.08, extra='opacity="0.6"'))

    def blister(self, x, y, r):
        """A heavy gun blister: Corvane's weapon mount, two barrels."""
        self.f(circ(x + 0.4, y + 0.4, r * 1.1, SHADOW))
        self.f(circ(x, y, r * 1.1, COR1, stroke=CSEAM, sw=0.2), mid=True)
        self.f(circ(x, y, r * 0.75, COR2, stroke=CSEAM, sw=0.12), mid=True)
        for s in (-1, 1): self.f(rect(x + r * 0.3, y + s * r * 0.3 - r * 0.1, r * 1.6, r * 0.2, COR3, stroke=CSEAM, sw=0.1))
        self.f(circ(x, y, r * 0.2, ORANGE))

    def stack(self, x, y, r):
        """A furnace stack: a dark cylinder with a glowing mouth."""
        self.f(circ(x, y, r * 1.15, COR0, stroke=CSEAM, sw=0.2), mid=True)
        self.f(circ(x, y, r * 0.8, "#1a0e06", stroke=CSEAM, sw=0.12), mid=True)
        self.f(circ(x, y, r * 0.5, "#ff7a1a", extra='opacity="0.35" filter="url(#glowSoft)"'))
        self.f(circ(x, y, r * 0.3, "#ff9a3a"))

    def bridge_box(self, x, y, w, h, dark=False):
        self.f(rect(x + 0.4, y + 0.4, w, h, SHADOW, stroke="none", sw=0))
        self.f(rect(x, y, w, h, MER1 if not dark else COR2, stroke=MSEAM if not dark else CSEAM, sw=0.18, rx=0.5), mid=True)
        self.f(rect(x + w * 0.62, y + h * 0.2, w * 0.28, h * 0.6, CANOPY, stroke=MSEAM if not dark else CSEAM, sw=0.12, rx=0.3))

    def nav(self, xy_r, xy_g):
        (rx, ry), (gx, gy) = xy_r, xy_g
        self.f(circ(rx, ry, 0.36 * self.u, RED)); self.f(circ(gx, gy, 0.36 * self.u, GREEN))

    def stencil(self, x, y, text, fs, col):
        self.f(f'<text x="{x:.2f}" y="{y:.2f}" font-family="IBM Plex Mono, monospace" font-size="{fs:.2f}" fill="{col}" opacity="0.8" text-anchor="middle" letter-spacing="0.1">{text}</text>')


# ------------------------------------------------------------------ Meridian

def kite():
    """Corvette, armed courier: a Tern stretched, two gun pods on outriggers, the big canopy, one wide box engine. The first ship an outfit buys that can shoot back."""
    h = Indep("mer-kite", u=0.7, cell=3.0)
    h.rbox(-15, -5.5, 32, 11, 3.5, "url(#merHull)")
    for s in (-1, 1):
        # outrigger: a short arm with a gun pod on the standard ring
        h.f(rect(-4, min(s * 5.4, s * 7.2), 6, 1.8, MER0, stroke=MSEAM, sw=0.14, rx=0.3), mid=True)
        h.gunpod(-1, s * 8.2, 1.6)
        h.bolts(-13, 12, s * 4.6, 10)
        h.f(rect(-13, s * 3.2 - 0.5, 20, 1.0, MER1, stroke=MSEAM, sw=0.1, rx=0.4), mid=True)
    h.box_engine(-15, 0, 4.5, 6.0)
    h.band(6, 5.5)
    h.canopy(11, 0, 3.4, 2.4)
    h.f(rect(-9, -2.2, 10, 4.4, MER1, stroke=MSEAM, sw=0.14, rx=0.5), mid=True); h.f(line(-4, -2.0, -4, 2.0, stroke=MSEAM, sw=0.1))
    h.nav((-13, -5.8), (-13, 5.8))
    h.stencil(-6, -0.4 + 0.5, "MY", 1.2, MSEAM)
    return h, 19


def harrier():
    """Patrol boat, gunboat: a rounded box with twin box engines, two gun pods forward on outriggers and a dorsal turret on the big ring, a small container rack aft. Every outfit's security starts with a pair."""
    h = Indep("mer-harrier", u=0.9, cell=3.6)
    h.rbox(-22, -8, 46, 16, 4.5, "url(#merHull)")
    for s in (-1, 1):
        h.f(rect(4, min(s * 7.8, s * 10.2), 7, 2.4, MER0, stroke=MSEAM, sw=0.14, rx=0.3), mid=True)
        h.gunpod(8, s * 11.6, 2.0)
        h.bolts(-20, 20, s * 7.0, 14)
        h.box_engine(-22, s * 4.2, 5.5, 5.5)
        h.f(rect(-18, s * 5.0 - 0.6, 16, 1.2, MER1, stroke=MSEAM, sw=0.1, rx=0.5), mid=True)
    h.rack(-17, -3.0, 9, 6, 2, 1, (MER2, YEL))
    h.gunpod(-3, 0, 3.0)
    h.band(12, 8)
    h.canopy(17.5, 0, 4.2, 3.2)
    h.nav((-19, -8.3), (-19, 8.3))
    h.stencil(3, -5.4, "MY HARRIER", 1.1, MSEAM)
    return h, 27


def osprey():
    """Frigate, armed hauler: a long hauler body with a container rack amidships and launcher pods that look like cargo pods on both flanks, the canopy forward, three box engines. Looks like a Skua until it opens."""
    h = Indep("mer-osprey", u=1.0, cell=4.0)
    h.rbox(-32, -11, 66, 22, 5.5, "url(#merHull)")
    for s in (-1, 1):
        # the "cargo pods": launcher pods on the flanks, same shape as a container, a seam that hinges
        for xx in (-20, -2):
            h.f(rect(xx, min(s * 10.5, s * 15.5), 14, 5.0, MER2, stroke=MSEAM, sw=0.16, rx=0.4), mid=True)
            h.f(line(xx + 7, min(s * 10.5, s * 15.5) + 0.3, xx + 7, min(s * 10.5, s * 15.5) + 4.7, stroke=MSEAM, sw=0.12))
            h.f(line(xx + 1, s * 13, xx + 13, s * 13, stroke=YEL, sw=0.16, extra='stroke-dasharray="1 1" opacity="0.8"'))
        h.bolts(-30, 30, s * 9.8, 18)
        h.gunpod(20, s * 7.5, 2.0)
        h.f(rect(-28, s * 6.5 - 0.7, 24, 1.4, MER1, stroke=MSEAM, sw=0.1, rx=0.5), mid=True)
    h.rack(-24, -6, 30, 12, 3, 2, (MER2, YEL, MER3, MER2, MER2, YEL))
    h.box_engine(-32, -6.5, 6, 5.5); h.box_engine(-32, 0, 6, 5.5); h.box_engine(-32, 6.5, 6, 5.5)
    h.band(14, 11)
    h.canopy(26, 0, 4.6, 3.6)
    h.f(rect(8, -4.5, 10, 9, MER1, stroke=MSEAM, sw=0.14, rx=0.6), mid=True)
    h.nav((-28, -11.3), (-28, 11.3))
    h.stencil(12, 6.6, "MY OSPREY", 1.3, MSEAM)
    return h, 37


# ------------------------------------------------------------------ Corvane

def warden():
    """Destroyer, corporate security: a long dark steel hull with external tanks along the flanks, pipework, two heavy gun blisters, hazard chevrons, a sensor mast, four engines. Paid by the tonne it brings home."""
    h = Indep("cor-warden", u=1.1, cell=4.4)
    h.stroke = CSEAM
    h.rbox(-42, -12, 84, 24, 5, "url(#corHull)")
    for s in (-1, 1):
        h.tank(-30, s * 14.5, 34, 3.0)
        h.tank(8, s * 14.0, 22, 2.6)
        h.pipes(-38, 36, [s * 9.5, s * 10.5])
        h.blister(16, s * 6.0, 3.0); h.blister(-16, s * 6.0, 3.0)
        h.hazard(-40, min(s * 10.8, s * 12.0), 10, 1.2)
        h.box_engine(-42, s * 7.5, 7, 6, dark=True); h.box_engine(-42, s * 2.5, 7, 4, dark=True)
    h.hazard(30, -12, 1.6, 24, vertical=True)
    h.bridge_box(22, -4.5, 12, 9, dark=True)
    h.f(rect(-30, -3.5, 46, 7, COR1, stroke=CSEAM, sw=0.16, rx=0.6), mid=True)
    for xx in (-24, -12, 0, 12): h.f(line(xx, -3.2, xx, 3.2, stroke=CSEAM, sw=0.12))
    h.antennae(34, -4, 4, -6); h.antennae(34, 4, 4, 6)
    h.nav((-36, -17.8), (-36, 17.8))
    h.stencil(-6, -5.0, "CORVANE SECURITY", 1.4, ORANGE)
    return h, 46


def bulwark():
    """Cruiser, corporate security: wide and blocky, an armoured bridge box, a broadside of blisters, big external tanks, hazard chevrons, six engines. The biggest ship you can buy without a flag."""
    h = Indep("cor-bulwark", u=1.6, cell=5.2)
    h.stroke = CSEAM
    h.rbox(-66, -22, 132, 44, 7, "url(#corHull)")
    for s in (-1, 1):
        h.tank(-50, s * 26.5, 48, 4.5); h.tank(6, s * 26.0, 40, 4.0)
        h.pipes(-60, 56, [s * 18, s * 19.5, s * 21])
        for xx in (40, 20, 0, -20, -40): h.blister(xx, s * 12, 3.6)
        h.hazard(-64, min(s * 21, s * 22.6), 16, 1.6)
        for yy in (14, 7): h.box_engine(-66, s * yy, 9, 6.5, dark=True)
        h.f(rect(-60, s * 6 - 0.8, 110, 1.6, COR2, stroke=CSEAM, sw=0.12, rx=0.6), mid=True)
    h.box_engine(-66, 0, 9, 6.5, dark=True)
    h.hazard(50, -22, 2.4, 44, vertical=True)
    h.bridge_box(28, -8, 20, 16, dark=True)
    h.f(rect(-56, -5, 80, 10, COR1, stroke=CSEAM, sw=0.18, rx=1.0), mid=True)
    for xx in range(-48, 24, 12): h.f(line(xx, -4.6, xx, 4.6, stroke=CSEAM, sw=0.14))
    h.f(rect(-40, -2.5, 50, 5, COR2, stroke=CSEAM, sw=0.14, rx=0.6), mid=True)
    h.antennae(48, -6, 6, -8); h.antennae(48, 6, 6, 8)
    h.nav((-56, -31.2), (-56, 31.2))
    h.stencil(-10, -7.5, "CORVANE SECURITY", 2.0, ORANGE)
    return h, 72


def foreman():
    """Factory ship, armed: a Smelter with a gun deck. An ore intake maw forward, furnace stacks down the spine, a dorsal gun deck of blisters, external tanks, orange everywhere. Refines under fire and does not stop."""
    h = Indep("cor-foreman", u=1.6, cell=5.2)
    h.stroke = CSEAM
    h.rbox(-70, -24, 140, 48, 6, "url(#corHull)")
    # the maw: an open intake across the bow
    h.f(rect(52, -16, 18, 32, "#0a0604", stroke=CSEAM, sw=0.3, rx=1.0), mid=True)
    for yy in range(-12, 13, 6): h.f(line(54, yy, 68, yy, stroke=COR3, sw=0.4))
    h.hazard(50, -24, 2.4, 48, vertical=True)
    for s in (-1, 1):
        h.tank(-60, s * 28.5, 56, 4.5); h.tank(2, s * 28.0, 44, 4.0)
        h.pipes(-66, 48, [s * 20, s * 22])
        for xx in (34, 10, -14, -38): h.blister(xx, s * 14, 3.4)
        h.hazard(-68, min(s * 23, s * 24.6), 20, 1.6)
        for yy in (15, 5): h.box_engine(-70, s * yy, 9, 7, dark=True)
        h.f(rect(-64, s * 8 - 0.8, 110, 1.6, COR2, stroke=CSEAM, sw=0.12, rx=0.6), mid=True)
    for xx in (30, 6, -18, -42): h.stack(xx, 0, 5.0)
    h.bridge_box(-62, -7, 16, 14, dark=True)
    h.antennae(-46, -8, -4, -10); h.antennae(-46, 8, -4, 10)
    h.nav((-60, -33.2), (-60, 33.2))
    h.stencil(-6, -9.0, "CORVANE", 2.2, ORANGE)
    return h, 76


DEFS = ('<linearGradient id="merHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c7075"></stop><stop offset="0.3" stop-color="#9ea2a7"></stop>'
        '<stop offset="0.5" stop-color="#b6babe"></stop><stop offset="0.7" stop-color="#9ea2a7"></stop><stop offset="1" stop-color="#6c7075"></stop></linearGradient>'
        '<linearGradient id="corHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f252b"></stop><stop offset="0.3" stop-color="#3a434b"></stop>'
        '<stop offset="0.5" stop-color="#4a545d"></stop><stop offset="0.7" stop-color="#3a434b"></stop><stop offset="1" stop-color="#1f252b"></stop></linearGradient>')

NOTES = {
    "mer-kite": ["Meridian Kite, corvette, armed courier: a Tern stretched, two bolt-on gun pods on short outriggers, the big canopy, one wide box engine, the yellow band, bolt rows. Every part is a Meridian standard part. The first ship an outfit buys that can shoot back."],
    "mer-harrier": ["Meridian Harrier, patrol boat, gunboat: a rounded box with twin box engines, two gun pods forward on outriggers, a dorsal turret on the big ring, a small container rack aft. Every outfit's security starts with a pair of these."],
    "mer-osprey": ["Meridian Osprey, frigate, armed hauler: a long hauler body with a six-container rack amidships, two launcher pods on each flank shaped exactly like cargo pods with a hinge seam, two gun pods, three box engines. Looks like a Skua until it opens."],
    "cor-warden": ["Corvane Warden, destroyer, corporate security: a long dark steel hull with external tanks along both flanks, pipework, two heavy twin-barrel blisters a side, hazard chevrons, an armoured bridge box, four engines. Paid by the tonne it brings home."],
    "cor-bulwark": ["Corvane Bulwark, cruiser, corporate security: wide and blocky, big external tanks, five blisters a side, an armoured bridge box, hazard chevrons, five engines. Ugly, well built, and the biggest ship you can buy without a flag."],
    "cor-foreman": ["Corvane Foreman, factory ship, armed: an ore intake maw across the bow, four furnace stacks down the spine with their mouths glowing, four blisters a side on the gun deck, external tanks, the bridge at the stern where the heat is not. Refines under fire and does not stop."],
}


def all_art():
    syms, meta = [], {}
    for fn in (kite, harrier, osprey, warden, bulwark, foreman):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return DEFS, "".join(syms), meta
