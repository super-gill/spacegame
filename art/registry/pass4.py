"""Civil pass four: Meridian's birds and their legacy marks, Corvane's industrials, the nine civil T3 prototypes, the drones, and the Aurel Tacet.

Meridian: registry grey, one yellow band, rounded boxes, bolt rows, the big
canopy, box engines; legacy marks greyer, patched, with the old square
canopy. Corvane: dark steel and orange, tanks, pipes, stacks, hazard paint.
Prototypes keep their company's grammar and carry one Lattice-derived
component drawn in the pale Lattice glow, never a drive ring. Drones are
pure machines: a frame round a tool or sensor with thrusters where they
fit, no cockpit, no wings. Nose points +x.
"""
import math
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, P, clamp, fade, INK, WHITE, RED, GREEN, SHADOW, GLASS
from indep import Indep, MER0, MER1, MER2, MER3, MSEAM, YEL, COR0, COR1, COR2, COR3, CSEAM, ORANGE, HAZ, CANOPY, CANOPY2
from civil import Civil, TW0, TW1, TW2, TEAL, TSEAM, TINK, AB0, AB1, ARUST, ASEAM
from beltciv import BeltCivil, TRUSS
from belt import BeltParts as B, GUN, GUN2, DARKG, BSEAM
from venus import Venus, egg, SEA, SEA2, SEA3, OLIVE, GLASSG
from venciv import VenCivil, SOL0, HAL0, HAL1, BRASS, BRASS2, ARB0, ARB2, LAV0, LAV1, LAV2, HOT
from specops import LAT, LAT2, LATG

MOLD = "#8a8d90"; MOLDSEAM = "#3a3e42"; MPATCH = "#a3a6a9"


def lattice(h, x, y, r, label=True):
    """The one Lattice-derived component on a prototype: a pale segmented plate in a dark housing, lit from inside. Not a drive ring; it has no gap pattern and no core."""
    h.f(circ(x + 0.4, y + 0.4, r * 1.15, SHADOW))
    h.f(circ(x, y, r * 1.15, "#0a1016", stroke="#05080c", sw=0.26), mid=True)
    h.f(circ(x, y, r, LATG, extra='opacity="0.18"'))
    n = 5
    for i in range(n):
        a0 = i * 360 / n + 6; a1 = (i + 1) * 360 / n - 6
        def pt(a, rr): return (x + math.cos(math.radians(a)) * rr, y + math.sin(math.radians(a)) * rr)
        p0, p1, p2, p3 = pt(a0, r * 0.9), pt(a1, r * 0.9), pt(a1, r * 0.35), pt(a0, r * 0.35)
        d = f"M {p0[0]:.2f} {p0[1]:.2f} A {r * 0.9:.2f} {r * 0.9:.2f} 0 0 1 {p1[0]:.2f} {p1[1]:.2f} L {p2[0]:.2f} {p2[1]:.2f} A {r * 0.35:.2f} {r * 0.35:.2f} 0 0 0 {p3[0]:.2f} {p3[1]:.2f} Z"
        h.f(f'<path d="{d}" fill="{LAT}" stroke="{LAT2}" stroke-width="0.12" opacity="0.9"></path>', mid=True)
    h.f(circ(x, y, r * 0.3, "#0a1016", stroke=LAT2, sw=0.12)); h.f(circ(x, y, r * 0.12, LATG))


def conduits(h, x0, x1, y, n=3, col=LATG):
    """Lattice conduits running from the component into the hull: thin pale lines with nodes."""
    for k in range(n):
        yy = y + (k - (n - 1) / 2) * 1.2
        h.f(line(x0, yy, x1, yy, stroke=col, sw=0.14, extra='opacity="0.6"'))
        h.f(circ(x1, yy, 0.3, col, extra='opacity="0.9"'))


# ------------------------------------------------------------------ Meridian birds

class Bird(Indep):
    def __init__(self, key, u, cell, old=False):
        super().__init__(key, u, cell); self.old = old; self.stroke = MSEAM if not old else MOLDSEAM

    def hullbox(self, x, y, w, h, r):
        return self.rbox(x, y, w, h, r, "url(#merHull)" if not self.old else "url(#merOld)")

    def glass(self, x, y, rx, ry):
        """The big canopy; the legacy marks have the square one."""
        if self.old:
            self.f(rect(x - rx * 0.9 + 0.3, y - ry + 0.3, rx * 1.8, ry * 2, SHADOW, stroke="none", sw=0))
            self.f(rect(x - rx * 0.9, y - ry, rx * 1.8, ry * 2, CANOPY, stroke=MOLDSEAM, sw=0.18, rx=0.3), mid=True)
            self.f(line(x, y - ry + 0.3, x, y + ry - 0.3, stroke=MOLDSEAM, sw=0.14))
        else: self.canopy(x, y, rx, ry)

    def yband(self, x, hw):
        if self.old: self.f(rect(x - 0.6 * self.u, -hw, 1.2 * self.u, 2 * hw, fade(YEL, 0.35), stroke=MOLDSEAM, sw=0.1, extra='opacity="0.8"'), mid=True)
        else: self.band(x, hw)

    def oldpatch(self, x, y, w, h):
        if self.old:
            self.f(rect(x, y, w, h, MPATCH, stroke=MOLDSEAM, sw=0.16, rx=0.2), mid=True)
            for xx in (x + 0.5, x + w - 0.5):
                for yy in (y + 0.5, y + h - 0.5): self.f(circ(xx, yy, 0.16, MOLDSEAM))

    def door(self, x, y, w, h):
        self.f(rect(x, y, w, h, MER1 if not self.old else MOLD, stroke=self.stroke, sw=0.14, rx=0.3), mid=True)
        self.f(line(x + w / 2, y + 0.3, x + w / 2, y + h - 0.3, stroke=self.stroke, sw=0.1))
        self.f(line(x + 0.4, y + h / 2, x + w - 0.4, y + h / 2, stroke=YEL if not self.old else fade(YEL, 0.3), sw=0.14, extra='stroke-dasharray="0.8 0.8"'))

    def windows(self, x0, x1, y, n):
        for i in range(n):
            x = x0 + (x1 - x0) * i / max(n - 1, 1)
            self.f(rect(x - 0.5, y - 0.6, 1.0, 1.2, CANOPY, stroke=self.stroke, sw=0.1, rx=0.2))


def gull(old=False):
    """Shuttle: a short rounded box, a side door each flank, a square-ish canopy, one box engine, the yellow band. Cheap, slow, everywhere. The Auk is the same box, older and patched."""
    h = Bird("mer-auk" if old else "mer-gull", 0.6, 2.6, old)
    h.hullbox(-10, -4.5, 22, 9, 2.8)
    for s in (-1, 1):
        h.door(-3, min(s * 4.3, s * 2.3), 5, 2.0); h.bolts(-8, 10, s * 3.6, 7)
    h.box_engine(-10, 0, 3.6, 4.4)
    h.yband(5, 4.5)
    h.glass(9, 0, 2.4, 2.0)
    h.oldpatch(-7, -1.5, 3, 2.5)
    h.nav((-8, -4.8), (-8, 4.8))
    h.stencil(-2, 0.4, "MY", 1.0, MSEAM)
    return h, 14


def petrel(old=False):
    """Taxi: a narrow fast box with the canopy right forward, two small box engines, a passenger door each side, a roof rack for bags. The Shearwater is the box before it, one engine."""
    h = Bird("mer-shearwater" if old else "mer-petrel", 0.6, 2.6, old)
    h.hullbox(-11, -3.6, 24, 7.2, 2.6)
    for s in (-1, 1):
        h.door(-2, min(s * 3.4, s * 1.6), 3.6, 1.8); h.bolts(-9, 11, s * 2.8, 8)
    if old: h.box_engine(-11, 0, 3.2, 4.0)
    else: h.box_engine(-11, -2.0, 3.2, 2.8); h.box_engine(-11, 2.0, 3.2, 2.8)
    h.f(rect(-8, -1.4, 5, 2.8, MER0 if not old else MOLD, stroke=h.stroke, sw=0.12, rx=0.3), mid=True)
    for k in range(3): h.f(line(-7.2 + k * 1.6, -1.2, -7.2 + k * 1.6, 1.2, stroke=h.stroke, sw=0.1))
    h.yband(4, 3.6)
    h.glass(9.5, 0, 2.8, 1.9)
    h.oldpatch(-1, 1.0, 3, 1.8)
    h.nav((-9, -3.9), (-9, 3.9))
    h.stencil(0, 0.4 if not old else -1.2, "MY", 0.9, MSEAM)
    return h, 15


def skua(old=False):
    """Hauler: a Tern's cab on a container rack, two box engines, bolt rows, the band. The first step up for a trader. The Gannet is slower and roomier: a longer rack, one engine, the square canopy."""
    old_ = old
    h = Bird("mer-gannet" if old else "mer-skua", 0.8, 3.2, old)
    L = 40 if old else 36
    h.hullbox(-L / 2, -6.5, L, 13, 3.5)
    for s in (-1, 1):
        h.bolts(-L / 2 + 2, L / 2 - 2, s * 5.6, 12)
        h.f(rect(-L / 2 + 3, s * 3.8 - 0.5, L - 14, 1.0, MER1 if not old else MOLD, stroke=h.stroke, sw=0.1, rx=0.4), mid=True)
    if old: h.box_engine(-L / 2, 0, 5, 6.5)
    else: h.box_engine(-L / 2, -3.2, 5, 5); h.box_engine(-L / 2, 3.2, 5, 5)
    h.rack(-L / 2 + 5, -4.2, L - 18, 8.4, 3 if not old else 4, 2, (MER2, YEL, MER3, MER2) if not old else (MOLD, MPATCH, MOLD, MOLD))
    h.yband(L / 2 - 8, 6.5)
    h.glass(L / 2 - 4, 0, 3.4, 2.6)
    h.oldpatch(-L / 2 + 3, -6.0, 4, 2.2)
    h.nav((-L / 2 + 4, -6.8), (-L / 2 + 4, 6.8))
    h.stencil(L / 2 - 10, 0.4 if not old else -5.0, "MY" if not old else "GANNET", 1.1, MSEAM)
    return h, L / 2 + 3


def fulmar(old=False):
    """Bus or ferry: a long rounded box with a row of windows down each side, two doors, the canopy, two box engines, the band. The Puffin is the old bus: fewer windows, one engine, patched."""
    h = Bird("mer-puffin" if old else "mer-fulmar", 0.8, 3.2, old)
    h.hullbox(-19, -6, 38, 12, 4)
    for s in (-1, 1):
        h.windows(-14, 10, s * 4.6, 9 if not old else 6)
        h.door(-6, min(s * 5.6, s * 3.0), 3.0, 2.6); h.door(6, min(s * 5.6, s * 3.0), 3.0, 2.6)
        h.bolts(-17, 17, s * 2.4, 12)
    if old: h.box_engine(-19, 0, 5, 6)
    else: h.box_engine(-19, -3, 5, 4.6); h.box_engine(-19, 3, 5, 4.6)
    h.f(rect(-12, -1.6, 22, 3.2, MER1 if not old else MOLD, stroke=h.stroke, sw=0.12, rx=0.5), mid=True)
    h.yband(12, 6)
    h.glass(16, 0, 3.2, 2.6)
    h.oldpatch(-16, -2.5, 4, 2.4)
    h.nav((-17, -6.3), (-17, 6.3))
    h.stencil(0, 0.5, "MERIDIAN" if not old else "PUFFIN", 1.1, MSEAM)
    return h, 22


def knot():
    """The Knot, the Registry starter before the Tern: a stubby box, the square canopy, one engine, a tiny hold, thirty years of patches."""
    h = Bird("mer-knot", 0.6, 2.6, True)
    h.hullbox(-9, -4, 20, 8, 2.6)
    for s in (-1, 1):
        h.bolts(-7, 9, s * 3.2, 7); h.door(-4, min(s * 3.8, s * 2.0), 3.6, 1.8)
    h.box_engine(-9, 0, 3.4, 4.6)
    h.f(rect(-6, -1.6, 5, 3.2, MOLD, stroke=MOLDSEAM, sw=0.12, rx=0.3), mid=True)
    h.yband(4, 4)
    h.glass(8, 0, 2.2, 1.8)
    h.oldpatch(-1, -3.6, 3, 2.0); h.oldpatch(2, 1.2, 2.4, 1.8)
    h.nav((-7, -4.3), (-7, 4.3))
    h.stencil(0, 0.4, "RGY", 0.9, MOLDSEAM)
    return h, 13


def grebe():
    """Tug: a short box that is mostly engine, a tow clamp across the bow, winch drums, the band, the canopy set high and back. Pushes anything for a fee."""
    h = Bird("mer-grebe", 0.9, 3.6, False)
    h.hullbox(-14, -7, 26, 14, 4)
    for s in (-1, 1):
        h.box_engine(-14, s * 4.2, 7, 6)
        h.bolts(-12, 10, s * 6.2, 9)
        h.f(circ(-2, s * 4.4, 2.2, MER0, stroke=MSEAM, sw=0.16), mid=True); h.f(circ(-2, s * 4.4, 1.2, "none", stroke=MER3, sw=0.3)); h.f(circ(-2, s * 4.4, 0.4, MSEAM))
    h.f(rect(10, -7.5, 3.0, 15, MER0, stroke=MSEAM, sw=0.2, rx=0.4), mid=True)
    for yy in (-5.2, -1.8, 1.8, 5.2): h.f(rect(10.4, yy - 0.8, 2.2, 1.6, YEL, stroke=MSEAM, sw=0.1))
    h.f(rect(2, -2.2, 6, 4.4, MER1, stroke=MSEAM, sw=0.14, rx=0.5), mid=True)
    h.yband(5, 7)
    h.canopy(-7, 0, 3.0, 2.4)
    h.nav((-12, -7.3), (-12, 7.3))
    h.stencil(5, 0.4, "MY", 1.0, MSEAM)
    return h, 17


def shrike():
    """Bounty hull: a Harrier box with civilian tackle, two gun pods on outriggers, a pod bay with a grab in the flank, a cell block amidships with slit windows, twin box engines. Brings them in, hull or pod."""
    h = Bird("mer-shrike", 0.9, 3.6, False)
    h.rbox(-22, -8, 46, 16, 4.5, "url(#merHull)")
    for s in (-1, 1):
        h.f(rect(2, min(s * 7.8, s * 10.2), 7, 2.4, MER0, stroke=MSEAM, sw=0.14, rx=0.3), mid=True)
        h.gunpod(6, s * 11.6, 2.0)
        h.bolts(-20, 20, s * 7.0, 14)
        h.box_engine(-22, s * 4.2, 5.5, 5.5)
    # pod bay to port with a grab arm, cell block to starboard
    h.f(rect(-14, -7.6, 12, 5.0, "#0e1418", stroke=MSEAM, sw=0.16, rx=0.5), mid=True)
    h.f(line(-13, -5.1, -3, -5.1, stroke=YEL, sw=0.16, extra='stroke-dasharray="1 1" opacity="0.8"'))
    h.f(rect(-9, -8.4, 1.2, 4, MER2, stroke=MSEAM, sw=0.12)); h.f(circ(-8.4, -4.6, 0.8, MER0, stroke=MSEAM, sw=0.12))
    h.f(rect(-14, 2.6, 12, 5.0, MER0, stroke=MSEAM, sw=0.16, rx=0.5), mid=True)
    for k in range(4): h.f(rect(-12 + k * 3, 3.6, 0.6, 3, "#0e1418", stroke=MSEAM, sw=0.08))
    # tackle: a tackle emitter on the dorsal ring
    h.ring_mount(-1, 0, 3.0); h.f(circ(-1, 0, 1.6, "#0e1418", stroke=MSEAM, sw=0.12), mid=True); h.f(circ(-1, 0, 0.7, "#9fe3ff", extra='opacity="0.9"'))
    h.band(12, 8)
    h.canopy(17.5, 0, 4.2, 3.2)
    h.nav((-19, -8.3), (-19, 8.3))
    h.stencil(6, -5.4, "MY SHRIKE", 1.1, MSEAM)
    return h, 27


# ------------------------------------------------------------------ Corvane industrials

class Corv(Indep):
    def __init__(self, key, u, cell, old=False):
        super().__init__(key, u, cell); self.old = old; self.stroke = CSEAM

    def hullbox(self, pts):
        self.body(pts, "url(#corHull)" if not self.old else "url(#corOld)")

    def maw(self, x, hw, depth):
        """An ore intake across the bow: a dark mouth with teeth."""
        self.f(poly([(x, -hw), (x - depth, -hw * 0.9), (x - depth, hw * 0.9), (x, hw)], HAZ, stroke=CSEAM, sw=0.24), mid=True)
        n = 7
        for k in range(n):
            yy = -hw * 0.85 + 1.7 * hw * k / (n - 1)
            self.f(poly([(x - 0.3, yy - 0.6), (x - depth * 0.6, yy), (x - 0.3, yy + 0.6)], COR3, stroke=CSEAM, sw=0.1))
        self.hazard(x - depth - 1.2, -hw, 1.2, 2 * hw, vertical=True)

    def orebay(self, x, y, w, h):
        self.f(rect(x, y, w, h, COR0, stroke=CSEAM, sw=0.18), mid=True)
        for k in range(1, 4): self.f(line(x + w * k / 4, y + 0.3, x + w * k / 4, y + h - 0.3, stroke=COR2, sw=0.14))
        self.f(line(x + 0.4, y + h / 2, x + w - 0.4, y + h / 2, stroke=ORANGE, sw=0.14, extra='stroke-dasharray="1 1" opacity="0.8"'))

    def engines(self, x_stern, ys, hh):
        for y in ys: self.box_engine(x_stern, y, 6, hh, dark=True)

    def corvane(self, x, y, fs):
        self.stencil(x, y, "CORVANE", fs, ORANGE)


def dray(old=False):
    """Bulk ore freighter: a long dark slab with six armoured ore bays, external tanks, pipes, hazard paint, an armoured bridge box forward, four engines. The ore truck the Black Strike hunts hardest. The old Dray carries less and shows it."""
    h = Corv("cor-dray-old" if old else "cor-dray", 1.3, 4.8, old)
    L = 84 if not old else 72
    h.hullbox(sym_pts([(L / 2, -9), (L / 2 - 8, -15), (-L / 2 + 10, -15), (-L / 2, -11)]))
    nb = 3 if not old else 2
    for s in (-1, 1):
        for i in range(nb): h.orebay(-L / 2 + 14 + i * 20, min(s * 3, s * 13), 16, 10)
        h.tank(-L / 2 + 12, s * 15.5, 30, 2.6)
        h.pipes(-L / 2 + 42, L / 2 - 14, [s * 14.5])
        h.hazard(-L / 2 + 44, s * 11.5 - 0.6, 10, 1.2)
    h.engines(-L / 2, (-9, -3, 3, 9), 5)
    h.bridge_box(L / 2 - 16, -5, 10, 10, dark=True)
    h.f(rect(-L / 2 + 10, -1.4, L - 30, 2.8, COR1, stroke=CSEAM, sw=0.14), mid=True)
    h.nav((-L / 2 + 12, -15.4), (-L / 2 + 12, 15.4))
    h.corvane(L / 2 - 28, 0.6, 1.6)
    if old: B.patch(h, [(-10, -8), (0, -7), (-1, -2), (-11, -3)], COR1)
    return h, L / 2 + 4


def smelter():
    """Refinery ship, large: a piece of Lantern Works that flies. An ore maw forward, six furnace stacks on the spine with their mouths glowing, slag chutes aft, tanks and pipework along both flanks, hazard paint, six engines."""
    h = Corv("cor-smelter", 1.5, 5.2, False)
    h.hullbox(sym_pts([(46, -12), (38, -19), (-36, -19), (-46, -13)]))
    h.maw(46, 11, 7)
    for s in (-1, 1):
        h.tank(-30, s * 15.5, 28, 3.0); h.tank(4, s * 15.5, 22, 3.0)
        h.pipes(-30, 30, [s * 11.5, s * 10.2])
        h.hazard(-40, s * 18 - 0.7, 12, 1.4)
        h.f(rect(-44, min(s * 6, s * 10), 6, 4, COR0, stroke=CSEAM, sw=0.16), mid=True)
        for k in range(3): h.f(line(-43 + k * 1.8, s * 6.3, -43 + k * 1.8, s * 9.7, stroke=ORANGE, sw=0.14, extra='opacity="0.7"'))
    for xx in (-28, -16, -4, 8, 20, 30): h.stack(xx, 0, 3.6)
    h.f(rect(-32, -5.2, 66, 10.4, "none", stroke=CSEAM, sw=0.2))
    h.engines(-46, (-10, -4, 2, 8), 5)
    h.engines(-46, (-15, 13), 4) if False else None
    h.bridge_box(32, -10, 8, 6, dark=True)
    h.nav((-34, -19.4), (-34, 19.4))
    h.corvane(-10, 13, 2.0)
    return h, 52


def still():
    """Gas command ship, Corvane's: a carrier for skimmers, uglier than the Cyclone. A brutal dark slab with a flight deck cut into each flank (four skimmer bays a side behind blast doors), product tanks on racks, a refinery block of four stacks, radiator slabs aft, heavy blisters at the corners, the fleet beacon, six engines. It does not skim; its wing does."""
    h = Corv("cor-still", 1.8, 6.4, False)
    h.hullbox(sym_pts([(66, -16), (56, -28), (-50, -28), (-66, -20)]))
    for s in (-1, 1):
        h.f(rect(-44, min(s * 30, s * 38), 70, 8, COR0, stroke=CSEAM, sw=0.2), mid=True)
        for xx in (-42, -24, -6, 12): h.tank(xx, s * 34, 16, 3.4)
        for xx in (-40, -22, -4, 14): h.f(rect(xx + 7, min(s * 28, s * 30), 2.4, 2, COR2, stroke=CSEAM, sw=0.12))
        # flight deck: a long recess with four bays behind blast doors
        h.f(rect(-40, min(s * 12, s * 26), 80, 14, HAZ, stroke=CSEAM, sw=0.24), mid=True)
        for k in range(4):
            x = -38 + k * 20
            h.f(rect(x, min(s * 13.5, s * 24.5), 16, 11, COR1, stroke=CSEAM, sw=0.16), mid=True)
            h.f(line(x + 8, min(s * 13.5, s * 24.5) + 0.4, x + 8, min(s * 13.5, s * 24.5) + 10.6, stroke=CSEAM, sw=0.14))
            h.f(line(x + 1, s * 25.5, x + 15, s * 25.5, stroke=ORANGE, sw=0.2, extra='stroke-dasharray="1 1" opacity="0.9"'))
        h.pipes(-46, 40, [s * 10, s * 8.5])
        for k in range(5): h.f(rect(-62 + k * 2.6, min(s * 14, s * 27), 1.4, 13, COR3, stroke=CSEAM, sw=0.1), mid=True)
        h.hazard(42, s * 24 - 0.8, 12, 1.6)
        h.blister(-56, s * 22, 3.2); h.blister(54, s * 20, 3.2)
    for xx in (-36, -22, -8, 6): h.stack(xx, 0, 3.8)
    h.f(rect(-42, -5.5, 62, 11, "none", stroke=CSEAM, sw=0.24))
    h.f(circ(30, 0, 3.4, "#0b1216", stroke=CSEAM, sw=0.24), mid=True); h.f(circ(30, 0, 1.4, "#9fe3ff")); h.f(circ(30, 0, 5.5, "#9fe3ff", extra='opacity="0.18"'))
    h.engines(-66, (-16, -10, -4, 2, 8, 14), 5)
    h.bridge_box(48, -5, 12, 10, dark=True)
    h.nav((-48, -28.5), (-48, 28.5))
    h.corvane(-14, 1.0, 2.6)
    h.ymax = 40
    return h, 78


# ------------------------------------------------------------------ prototypes

def covenant():
    """Tessaract Covenant, prototype superfreighter: a Consignment's spine and bays, but the frame is Lattice-laced: pale conduits run the length of the spine from a Lattice plate at its heart, and the bays sit in a cage that survives the ship."""
    h = Civil("tes-covenant", 1.7, 5.6)
    h.t_body(sym_pts([(66, -9), (54, -22), (-54, -22), (-66, -12)]))
    h.t_spine(-56, 56, 3.2)
    for s in (-1, 1):
        h.t_bays(-50, 50, s * 13, 6, 9)
        h.f(rect(-52, s * 7.5 - 0.6, 104, 1.2, LAT, stroke=TSEAM, sw=0.1, extra='opacity="0.85"'), mid=True)
        for xx in range(-48, 52, 16): h.f(rect(xx - 0.6, min(s * 7.5, s * 18), 1.2, 10.5, LAT2, stroke=TSEAM, sw=0.08, extra='opacity="0.8"'))
    h.t_engines(-66, (-9, -3, 3, 9), 4.4)
    h.t_band(44, 20)
    h.t_cab(66, 9, 8)
    lattice(h, 0, 0, 5.0)
    conduits(h, 5.5, 54, 0, 3); conduits(h, -5.5, -54, 0, 3)
    h.t_livery((-30, 1.0), "TESSARACT COVENANT", 1.6, ((-52, -22.4), (-52, 22.4)))
    return h, 72


def mk0():
    """Arcadia Prototype Mk 0, prototype bulk freighter: a Bulk Freighter hull in heavier plate, slower, that refines in transit; a bank of gate-glass heat exchangers along the spine glows pale between the armoured bays."""
    h = Civil("arc-mk0", 1.5, 5.2, yard="arc")
    h.a_body(sym_pts([(50, -8), (42, -17), (-42, -17), (-50, -11)]))
    for s in (-1, 1):
        h.a_plate(cham(-40, min(s * 6, s * 16), 80, 10, 1.5))
        h.a_bays(-36, 36, s * 11, 4, 7)
        h.a_chevrons(-38, 38, s * 16.5, 10, s) if hasattr(h, "a_chevrons") else None
    h.a_skirt(-50, 11, 4)
    h.a_engines(-50, (-8, -2.5, 2.5, 8), 4.0)
    for xx in range(-30, 32, 10):
        h.f(rect(xx - 3, -3.5, 6, 7, "#0a1016", stroke=ASEAM, sw=0.16), mid=True)
        for k in range(4): h.f(line(xx - 2.2, -3 + k * 2, xx + 2.2, -3 + k * 2, stroke=LAT, sw=0.3, extra='opacity="0.85"'))
    lattice(h, 40, 0, 3.4)
    conduits(h, 36, -32, 0, 2)
    h.a_slit(50, 5)
    h.a_livery((0, 14.6), "MK 0", 1.8, ((-40, -17.4), (-40, 17.4)))
    return h, 56


def tempest():
    """Lavinia Tempest, prototype skimmer: a Gale's shell swollen with heat shielding, the scoop deeper, and a Lattice heat sink on the spine that dumps what no radiator could; skims below the death line and comes back."""
    h = VenCivil("lav-tempest", 1.2, 4.4, "lavHull")
    w = h.shell(56, 12, 0.3, band=(-20, 16, LAV0))
    for s in (-1, 1):
        h.nacelle(-26, s * 9.6, 20, 3.2, fill=LAV0)
        h.gastank(-18, s * (w(-18) - 3.0), 13, 2.5); h.gastank(-2, s * (w(-2) - 3.0), 13, 2.5)
        h.radiator(-22, 8, s * (w(-6) - 0.5), 7, 3.6, s)
        for k in range(3): h.f(line(-24 + k * 14, s * (w(-24 + k * 14) - 0.4), -14 + k * 14, s * (w(-14 + k * 14) - 0.4), stroke=HOT, sw=0.6, extra='opacity="0.5"'))
        h.nodes([(-12 + i * 6, s * (w(-12 + i * 6) - 6.5)) for i in range(5)], 5)
    h.scoop(28, w(27) * 0.95, 9)
    h.dome(12, 0, 3.6, big=True)
    lattice(h, -8, 0, 4.0)
    conduits(h, -4, 8, 0, 3, LATG)
    h.stencil(-14, 1.0, "TEMPEST", 1.1, LAV2)
    h.navl(w, -16)
    h.ymax = 17
    return h, 31


def lodestar():
    """Belt Forge Lodestar, prototype factory ship: a Headframe's girder frame and refinery, with a gate-glass resonator slung under the bow on its own cradle; finds and cuts gate-glass where scanners read nothing."""
    h = BeltCivil("bf-lodestar", 1.7, 5.6)
    h.frame(-60, 50, -5, 5, 8)
    for s in (-1, 1):
        h.frame(-40, 30, min(s * 5, s * 20), max(s * 5, s * 20) if False else min(s * 5, s * 20) + 15, 8) if False else None
        h.bunker(-50, s * 12, 26, 4.5, tie=s * 5)
        h.hopper(-18, min(s * 9, s * 19), 22, 10, 0.5, tie=s * 5)
        h.cab(10, min(s * 8, s * 13), 7, 5, tie=s * 5) if s < 0 else None
        h.boom(20, s * 5, 14, s, tool="laser") if s > 0 else None
        B.hazard(h, -58, s * 7 - 0.6, 14, 1.2)
    h.engines(-62, (-10, -3.5, 3.5, 10), 3.8)
    for xx in (-6, 6, 18): B.engine(h, xx, 0, 3.0, housing=False) if False else None
    for xx in (-4, 8): h.f(circ(xx, 0, 3.2, "#1a0e06", stroke=BSEAM, sw=0.24), mid=True); h.f(circ(xx, 0, 1.6, "#ff9a3a"))
    # the resonator cradle forward
    h.frame(44, 60, -9, 9, 6)
    lattice(h, 52, 0, 6.0)
    conduits(h, 46, 20, 0, 3)
    h.finish((-30, 1.2), "LODESTAR", 1.6, ((-56, -5.4), (-56, 5.4)))
    h.ymax = 24
    return h, 66


def lazarus():
    """Rook and Rivet Lazarus, prototype recovery tender: a Wrecker's gunmetal frame with the claws and cranes, and a Lattice tether spool on the stern that holds a hulk nothing else can tow; brings the hulk back, and its crew."""
    h = BeltCivil("rr-lazarus", 1.2, 4.6)
    h.hull(cham(-26, -10, 52, 20, 3), "url(#rrHull)")
    for s in (-1, 1):
        h.crane(10, s * 8, 10, s, post_to=s * 4)
        h.claw(26, s * 6, s, L=4.5)
        B.hazard(h, -22, s * 9.4 - 0.6, 12, 1.2)
    h.cab(-4, -5, 8, 5, tie=None)
    h.scrap(-20, -6, 12, 12)
    h.engines(-28, (-7, 7), 3.0)
    # tether spool aft, between the engines
    h.f(rect(-36, -4.0, 10, 8, GUN, stroke=BSEAM, sw=0.2, rx=1.0), mid=True)
    lattice(h, -31, 0, 3.0)
    conduits(h, -27, -8, 0, 2)
    h.finish((4, 1.2), "LAZARUS", 1.2, ((-24, -10.4), (-24, 10.4)))
    return h, 36


def grace():
    """Solace Grace, prototype hospital ship: a Refuge's cream egg with the repair bay closed over by a Lattice seed chamber, regen nodes in rows down the whole hull, four collars, four nacelles; keeps a fleet alive under fire."""
    h = VenCivil("sol-grace", 1.3, 4.8, "solHull")
    w = h.shell(80, 17, 0.4, band=(-32, 28, SEA))
    for s in (-1, 1):
        h.nacelle(-37, s * 13.5, 24, 3.6, fill=SOL0); h.nacelle(-34, s * 6.5, 20, 3.0, fill=SOL0)
        h.collar(14, s * (w(14) - 3.2), 2.8, s); h.collar(-26, s * (w(-26) - 3.2), 2.8, s)
        for row in (6.5, 10.5): h.nodes([(-30 + i * 6, s * (w(-30 + i * 6) - row)) for i in range(11) if w(-30 + i * 6) > row + 1], 11)
    h.dome(-26, 0, 5.0, big=True); h.dome(24, 0, 4.4, big=True)
    lattice(h, -2, 0, 6.5)
    conduits(h, 5, 20, 0, 3, SEA2); conduits(h, -9, -22, 0, 3, SEA2)
    h.window(36, w(36) * 0.8)
    h.cross(-35, 0, 1.8)
    h.stencil(10, -12, "GRACE", 1.2, OLIVE)
    h.navl(w, -26)
    return h, 42


def threshold():
    """Halden Threshold, prototype explorer: an Inquiry's slate egg with a gate-glass sensor crown where the dish would be, mast arrays, long-range tanks, and the lab domes; reads a broken gate, and waits for the drive that would cross the Shoals."""
    h = VenCivil("hal-threshold", 1.1, 4.2, "hdnHull")
    w = h.shell(54, 11, 0.35, band=(-20, 18, BRASS))
    for s in (-1, 1):
        h.nacelle(-25, s * 9, 20, 3.0, fill=HAL0)
        h.f(rect(-20, s * (w(-16) - 2.8) - 1.6, 20, 3.2, HAL1, stroke=OLIVE, sw=0.16, rx=1.6), mid=True)
        h.array(-16, 8, s * (w(-4) - 0.9), 5)
        h.port(4, s * (w(4) - 2.0), 1.3)
        h.nodes([(-18 + i * 6, s * (w(-18 + i * 6) - 5.2)) for i in range(6)], 6, r=0.35)
    h.dome(-6, 0, 4.0, big=True); h.dome(2, 0, 2.2)
    lattice(h, 16, 0, 5.2)
    for a in range(0, 360, 45):
        x, y = 16 + math.cos(math.radians(a)) * 6.6, math.sin(math.radians(a)) * 6.6
        h.f(line(16 + math.cos(math.radians(a)) * 6.0, math.sin(math.radians(a)) * 6.0, x, y, stroke=BRASS, sw=0.2)); h.f(circ(x, y, 0.35, BRASS2))
    conduits(h, 10, -2, 0, 2)
    h.window(24, w(24) * 0.7)
    h.stencil(-12, 1.2, "THRESHOLD", 1.0, BRASS2)
    h.navl(w, -17)
    return h, 29


def grove():
    """Arbor Grove, prototype drone tender: a capital leaf-green egg that is one long drone deck, ports down both flanks in two rows, four bays, and a Lattice control lattice amidships under a crystal dome; runs a swarm nothing else can control."""
    h = VenCivil("arb-grove", 1.7, 5.6, "arbHull")
    w = h.shell(120, 26, 0.4, band=(-50, 44, ARB2))
    for s in (-1, 1):
        h.nacelle(-56, s * 20, 34, 5.0, fill=ARB0); h.nacelle(-52, s * 9, 28, 4.0, fill=ARB0)
        for row, off in ((1, 2.4), (2, 7.0)):
            for xx in range(-44, 40, 8): h.port(xx + (4 if row == 2 else 0), s * (w(xx) - off), 1.6)
        for xx in (-34, 14): h.bay(xx, s * (w(xx) - 16) - 3, 16, 6)
        h.nodes([(-40 + i * 10, s * (w(-40 + i * 10) - 11.5)) for i in range(9)], 9)
    h.dome(30, 0, 6.5, big=True); h.dome(44, 0, 3.6)
    h.f(circ(-8, 0, 11, "url(#venDome)", stroke=OLIVE, sw=0.3, extra='opacity="0.55"'), mid=True)
    lattice(h, -8, 0, 7.5)
    for a in range(0, 360, 30):
        h.f(line(-8 + math.cos(math.radians(a)) * 9, math.sin(math.radians(a)) * 9, -8 + math.cos(math.radians(a)) * 12.5, math.sin(math.radians(a)) * 12.5, stroke=SEA2, sw=0.16, extra='opacity="0.7"'))
    conduits(h, 0, 22, 0, 3, SEA2); conduits(h, -16, -40, 0, 3, SEA2)
    h.window(56, w(56) * 0.75)
    h.stencil(16, 1.4, "ARBOR GROVE", 1.6, SEA3)
    h.navl(w, -42)
    return h, 64


def colossus():
    """Corvane Colossus, prototype mining carrier, capital: two long hangar booms reach forward from a dark slab, their bay doors facing inward onto a receiving dock where the wing unloads; a conveyor carries the take down the spine to six furnaces lined with gate-glass that burn pale; loading cradles along both flanks for Drays and Pitheads to tie up; heavy blisters on every corner; the fleet beacon; eight engines. It parks at the edge of a field and never goes in. Nothing human processes ore faster."""
    h = Corv("cor-colossus", 2.0, 7.0, False)
    h.hullbox(sym_pts([(36, -24), (28, -32), (-58, -32), (-74, -22)]))
    for s in (-1, 1):
        # hangar boom: a long box reaching forward, bay doors on the inner face, wing lights at the mouth
        y0, y1 = s * 12, s * 30
        h.body([(30, y0), (86, y0), (90, s * 16), (90, y1 - s * 2), (84, y1), (30, y1)], "url(#corHull)", grid=False, sw=0.3)
        for k in range(5):
            x = 36 + k * 10
            h.f(rect(x, min(s * 12.4, s * 17.6), 8, 5.2, COR1, stroke=CSEAM, sw=0.16), mid=True)
            h.f(line(x + 4, min(s * 12.4, s * 17.6) + 0.3, x + 4, min(s * 12.4, s * 17.6) + 4.9, stroke=CSEAM, sw=0.12))
            h.f(line(x + 0.6, s * 12.8, x + 7.4, s * 12.8, stroke=ORANGE, sw=0.2, extra='stroke-dasharray="1 1" opacity="0.9"'))
        h.pipes(32, 82, [s * 24])
        h.hazard(32, s * 30 - (1.8 if s > 0 else 0), 52, 1.8)
        h.f(circ(89, s * 14, 0.8, "#9fe3ff"))
        h.blister(80, s * 26, 3.0)
    # receiving dock between the booms: a lit cradle where the wing unloads
    h.f(rect(30, -11, 54, 22, "#0a0d10", stroke=CSEAM, sw=0.2), mid=True)
    for xx in range(34, 82, 8): h.f(line(xx, -10, xx, 10, stroke=COR2, sw=0.3, extra='opacity="0.7"'))
    h.f(rect(30, -3, 54, 6, HAZ, stroke=CSEAM, sw=0.16), mid=True)
    for xx in range(32, 82, 4): h.f(line(xx, -2.6, xx, 2.6, stroke=COR3, sw=0.4))
    # conveyor into the furnace block
    h.f(rect(-50, -3, 80, 6, HAZ, stroke=CSEAM, sw=0.2), mid=True)
    for xx in range(-48, 30, 4): h.f(line(xx, -2.6, xx, 2.6, stroke=COR3, sw=0.4))
    for xx in (-44, -30, -16, -2):
        for s in (-1, 1):
            h.f(circ(xx, s * 9, 4.4, COR0, stroke=CSEAM, sw=0.24), mid=True); h.f(circ(xx, s * 9, 3.0, "#0a1016", stroke=CSEAM, sw=0.12), mid=True); h.f(circ(xx, s * 9, 1.6, LAT, extra='opacity="0.9"'))
    lattice(h, 16, 0, 6.0) if False else None
    lattice(h, 14, 15, 5.0)
    conduits(h, 9, -40, 15, 2)
    for s in (-1, 1):
        # loading cradles on the flanks for Drays and Pitheads
        for xx in (-50, -24):
            h.f(rect(xx, min(s * 32, s * 37), 20, 5, COR1, stroke=CSEAM, sw=0.18), mid=True)
            for k in range(3): h.f(rect(xx + 2 + k * 6.5, min(s * 36.6, s * 37.4), 3, 0.8, ORANGE, stroke="none", sw=0))
        h.blister(-64, s * 24, 3.4); h.blister(20, s * 28, 3.0)
        h.pipes(-56, 26, [s * 18.5])
    h.f(circ(-60, 0, 3.4, "#0b1216", stroke=CSEAM, sw=0.24), mid=True); h.f(circ(-60, 0, 1.4, "#9fe3ff")); h.f(circ(-60, 0, 5.5, "#9fe3ff", extra='opacity="0.18"'))
    h.engines(-74, (-15, -9, -3, 3, 9, 15), 5.0)
    h.bridge_box(18, -30, 12, 8, dark=True)
    h.nav((-56, -32.5), (-56, 32.5))
    h.corvane(-24, 24, 3.0)
    h.ymax = 40
    return h, 96


# ------------------------------------------------------------------ drones

def shoot():
    """Arbor Shoot, repair drone: a Solace repair kit on a thruster frame. An open green frame round a cream canister of nanite paste, a nozzle arm forward, a regen node, four thruster pods at the corners. No cockpit, no wings."""
    h = Hull("arb-shoot", 0.4, 1.6); h.stroke = OLIVE
    h.body(cham(-3, -2.2, 6, 4.4, 0.5), ARB0, grid=False, sw=0.2)
    h.f(rect(-2.4, -1.5, 4.8, 3.0, "#0b1412", stroke=OLIVE, sw=0.1), mid=True)
    h.f(rect(-2.0, -1.0, 4.0, 2.0, SOL0, stroke=OLIVE, sw=0.14, rx=1.0), mid=True)
    h.f(line(-1.4, -0.4, 1.4, -0.4, stroke=SEA, sw=0.2))
    for (x, y) in ((-3, -2.2), (-3, 2.2), (3, -2.2), (3, 2.2)):
        h.f(circ(x, y, 0.7, ARB2, stroke=OLIVE, sw=0.12), mid=True); h.f(circ(x, y, 0.3, SEA2))
    h.f(rect(3, -0.3, 2.2, 0.6, ARB2, stroke=OLIVE, sw=0.1)); h.f(circ(5.4, 0, 0.5, SEA2, stroke=OLIVE, sw=0.1))
    h.f(circ(-2.6, 0, 0.45, SEA, stroke=OLIVE, sw=0.1))
    return h, 7


def knocker():
    """Belt Forge Knocker, mining drone: a rust girder cross with a laser cutter at its head, an ore bag slung under, a battery block, four cold thrusters at the arm ends. In the old mines knockers were spirits heard tapping at the rock face."""
    h = Hull("rookrivet-drone", 0.4, 1.6); h.stroke = BSEAM
    h.body([(-3.2, -0.8), (3.2, -0.8), (3.2, 0.8), (-3.2, 0.8)], DARKG, grid=False, sw=0.2)
    h.body([(-0.8, -3.0), (0.8, -3.0), (0.8, 3.0), (-0.8, 3.0)], DARKG, grid=False, sw=0.2)
    for (x0, y0, x1, y1) in ((-3.0, -0.6, -1, -0.6), (1, 0.6, 3.0, 0.6)): h.f(line(x0, y0, x1, y1, stroke=GUN2, sw=0.16))
    h.f(rect(-1.6, -1.4, 3.2, 2.8, GUN, stroke=BSEAM, sw=0.14), mid=True)
    h.f(rect(-1.2, -1.0, 2.4, 2.0, "#c8642e", stroke=BSEAM, sw=0.1))
    h.f(rect(3.0, -0.5, 1.8, 1.0, GUN, stroke=BSEAM, sw=0.12), mid=True); h.f(circ(5.0, 0, 0.45, "#ff5a3a"))
    for (x, y) in ((-3.2, 0), (0, -3.0), (0, 3.0)):
        h.f(rect(x - 0.6, y - 0.6, 1.2, 1.2, "#111317", stroke=BSEAM, sw=0.12), mid=True); h.f(circ(x, y, 0.25, "#ffb060", extra='opacity="0.8"'))
    h.f(ell(0, 2.2, 1.0, 0.6, "#5a4a3a", f'stroke="{BSEAM}" stroke-width="0.1"'))
    return h, 7


# ------------------------------------------------------------------ Aurel

DEFS = ('<linearGradient id="merOld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e6165"></stop><stop offset="0.3" stop-color="#85888c"></stop>'
        '<stop offset="0.5" stop-color="#969a9e"></stop><stop offset="0.7" stop-color="#85888c"></stop><stop offset="1" stop-color="#5e6165"></stop></linearGradient>'
        '<linearGradient id="corOld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1f24"></stop><stop offset="0.3" stop-color="#2f363d"></stop>'
        '<stop offset="0.5" stop-color="#3b434b"></stop><stop offset="0.7" stop-color="#2f363d"></stop><stop offset="1" stop-color="#1a1f24"></stop></linearGradient>'
        '<linearGradient id="aurelHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070a"></stop><stop offset="0.35" stop-color="#121722"></stop>'
        '<stop offset="0.5" stop-color="#1a2130"></stop><stop offset="0.65" stop-color="#121722"></stop><stop offset="1" stop-color="#05070a"></stop></linearGradient>')

NOTES = {
    "mer-gull": ["Meridian Gull, shuttle: a short rounded grey box, a sliding door each flank with the yellow dashed sill, bolt rows, the big canopy, one box engine, the yellow band. Cheap, slow, everywhere."],
    "mer-auk": ["Meridian Auk, the shuttle before the Gull: the same box in duller grey with the old square canopy, a faded band and a bolted patch. Still on half the station hops in Sol."],
    "mer-petrel": ["Meridian Petrel, taxi: a narrow fast box with the canopy right forward, a roof rack for bags, a passenger door each side, two small box engines, the band. What a pilot flies when the fare is in a hurry."],
    "mer-shearwater": ["Meridian Shearwater, the taxi before the taxi: the Petrel's box, one engine, the square canopy, dull grey, patched."],
    "mer-skua": ["Meridian Skua, hauler: a Tern's canopy on a six-container rack in a rounded box, two box engines, bolt rows, the band. The first step up from a Tern for a trader."],
    "mer-gannet": ["Meridian Gannet, the hauler before the Skua: a longer box with an eight-container rack of grey boxes, one big engine, the square canopy, a patch. Slower, roomier, and nobody minds."],
    "mer-fulmar": ["Meridian Fulmar, bus or ferry: a long rounded box with nine windows down each side, two doors a side, the canopy, two box engines, the band. The commuter run between a world's port and its moon."],
    "mer-puffin": ["Meridian Puffin, the old bus: six windows a side, one engine, the square canopy, a faded band and a patch."],
    "mer-knot": ["Meridian Knot, the Registry starter before the Tern: a stubby grey box with the square canopy, one engine, a tiny hold, two doors and thirty years of patches. Still flying."],
    "mer-grebe": ["Meridian Grebe, tug: a short box that is mostly engine, a tow clamp with yellow pads across the bow, a winch drum each side, the canopy set high and back, the band. Pushes anything for a fee."],
    "mer-shrike": ["Meridian Shrike, bounty hull: a Harrier box with civilian tackle on the dorsal ring, two gun pods on outriggers, a pod bay with a grab arm in the port flank, a cell block with slit windows to starboard, twin box engines, the band. Brings them in, hull or pod."],
    "cor-dray": ["Corvane Dray, bulk ore freighter: a long dark steel slab with three armoured ore bays a side, external tanks, pipework, hazard paint, an armoured bridge box forward, four engines. The ore truck the Black Strike hunts hardest."],
    "cor-dray-old": ["The old Dray: the same slab shorter, two ore bays a side, a patch over the worst of it. Corvane sells them off when the furnaces no longer want them."],
    "cor-smelter": ["Corvane Smelter, refinery ship: an ore maw across the bow with teeth, six furnace stacks on the spine with their mouths glowing, slag chutes aft, tanks and pipework along both flanks, hazard paint, a bridge box, four engines. A piece of Lantern Works that flies."],
    "cor-still": ["Corvane Still, Corvane's gas command ship, a carrier for skimmers: a brutal dark slab with a flight deck cut into each flank, four skimmer bays a side behind blast doors, product tanks on racks above them, four stacks in a refinery block, radiator slabs aft, heavy twin blisters at all four corners, the fleet beacon, six engines. It does not skim; its wing does. Corvane's answer to the Cyclone, uglier."],
    "tes-covenant": ["Tessaract Covenant, prototype superfreighter: a Consignment's spine and twelve bays, but the frame is Lattice-laced: pale rails and ribs cage the bays, conduits run the spine from a Lattice plate at its heart. A hold that survives the ship."],
    "arc-mk0": ["Arcadia Prototype Mk 0, prototype bulk freighter: a Bulk Freighter in heavier bolted plate, eight armoured bays, and a bank of gate-glass heat exchangers glowing pale down the spine from a Lattice plate forward. Slower, armoured, refines in transit."],
    "lav-tempest": ["Lavinia Tempest, prototype skimmer: a Gale's shell swollen with heat shielding, the scoop deeper, seven radiators a side and heat streaks on the plate, and a Lattice heat sink on the spine that dumps what no radiator could. Skims below the death line and comes back."],
    "bf-lodestar": ["Belt Forge Lodestar, prototype factory ship: a Headframe's girder spine with bunkers, ore hoppers, a cab, a laser boom and two furnace mouths, and a gate-glass resonator slung in its own cradle forward. Finds and cuts gate-glass where scanners read nothing."],
    "rr-lazarus": ["Rook and Rivet Lazarus, prototype recovery tender: a Wrecker's gunmetal hull with claws, cranes and a scrap rack, and a Lattice tether spool on the stern that holds a hulk nothing else can tow. Brings the hulk back, and its crew."],
    "sol-grace": ["Solace Grace, prototype hospital ship: a Refuge's cream egg with the repair bay closed over by a Lattice seed chamber, regen nodes in two rows down the whole hull, four collars, two domes, four nacelles. Keeps a fleet alive under fire; the nanites are grown on Lattice seed."],
    "hal-threshold": ["Halden Threshold, prototype explorer: an Inquiry's slate egg with a gate-glass sensor crown where the dish would be, ringed with brass pickups, mast arrays, long-range tanks, two lab domes. Reads a broken gate; built to cross the Shoals if a drive ever exists."],
    "arb-grove": ["Arbor Grove, prototype drone tender: a capital leaf-green egg that is one long drone deck, two rows of ports down each flank, four bays, and a Lattice control lattice amidships under a crystal dome with pickups radiating from it. Runs a swarm nothing else can control."],
    "cor-colossus": ["Corvane Colossus, prototype mining carrier: two long hangar booms reach forward from a dark slab with their bay doors facing inward onto a receiving dock where the wing unloads; a conveyor carries the take down the spine to eight furnaces lined with gate-glass that burn pale; loading cradles along both flanks for Drays and Pitheads; heavy blisters at every corner; the fleet beacon aft; six engines. It parks at the edge of a field and never goes in. Nothing human processes ore faster."],
    "arb-shoot": ["Arbor Shoot, repair drone: a Solace repair kit on a thruster frame. An open green frame round a cream canister of nanite paste, a nozzle arm forward, a regen node aft, four thruster pods at the corners. No cockpit, no wings: a machine."],
    "rookrivet-drone": ["Belt Forge Knocker, mining drone: a dark girder cross with a laser cutter at its head, a battery block in rust at the centre, an ore bag slung under, three cold thrusters at the arm ends. A machine, not a craft; in the old mines knockers were spirits heard tapping at the rock face."],
}

ENTRIES = [
    ("mer-knot", "meridian", "corvette", "Meridian Knot", "Courier, legacy", "Thirty years of Registry starters; still flying", "legacy", "tern"),
    ("mer-auk", "meridian", "light", "Meridian Auk", "Shuttle, legacy", "Still on half the station hops in Sol", "legacy", "mer-gull"),
    ("mer-shearwater", "meridian", "light", "Meridian Shearwater", "Taxi, legacy", "The taxi before the taxi", "legacy", "mer-petrel"),
    ("mer-gannet", "meridian", "cargo", "Meridian Gannet", "Hauler, legacy", "Slower, roomier, and nobody minds", "legacy", "mer-skua"),
    ("mer-puffin", "meridian", "passenger", "Meridian Puffin", "Bus, legacy", "The commuter run's old bus", "legacy", "mer-fulmar"),
    ("cor-dray-old", "corvane", "bulk", "The old Dray", "Bulk ore freighter, legacy", "Corvane sells them off when the furnaces no longer want them", "legacy", "cor-dray"),
]
LEGACY_WEIGHT = {"mer-knot": "Light", "mer-auk": "Light", "mer-shearwater": "Light", "mer-gannet": "Medium", "mer-puffin": "Medium", "cor-dray-old": "Super-heavy"}


def all_art():
    syms, meta = [], {}
    builders = [lambda: gull(False), lambda: gull(True), lambda: petrel(False), lambda: petrel(True), lambda: skua(False), lambda: skua(True),
                lambda: fulmar(False), lambda: fulmar(True), knot, grebe, shrike,
                lambda: dray(False), lambda: dray(True), smelter, still,
                covenant, mk0, tempest, lodestar, lazarus, grace, threshold, grove, colossus,
                shoot, knocker]
    for fn in builders:
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return DEFS, "".join(syms), meta
