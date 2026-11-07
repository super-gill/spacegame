"""The Aurel: voices. And the Unsung: the hollow ships.

Pale white segments with a cyan glow, held apart by fields so they never quite
touch: the one deliberate exception to "nothing floats", because that is what
an Aurel ship is. No windows, no engines, no instruments, no markings; a voice
simply knows. The glow is the voice. A dead hull (a husk) is dull white, no
glow, its segments drifted. The Unsung are the same shapes gone wrong: bone
plates, a sick violet glow, segments misaligned and missing. Nose +x.
"""
import math
import random
from kod import Hull, poly, rect, line, circ, ell, P, SHADOW

WHITE0 = "#c9dde8"; WHITE1 = "#eef7fb"; WHITE2 = "#ffffff"; EDGE = "#9fd3e6"
CYAN = "#5fd9ff"; CYAN2 = "#bff1ff"; CYAN3 = "#e8fbff"
DEAD0 = "#8d9398"; DEAD1 = "#c2c8cc"; DEADEDGE = "#6f767b"
BONE0 = "#6e665e"; BONE1 = "#b8ada0"; BONEEDGE = "#4a433d"
VIOLET = "#c35bff"; VIOLET2 = "#ff5aa8"; VIOLET3 = "#ffd0ec"


def lens(cx, cy, L, w, ang=0.0, n=20, bias=0.0):
    """A pointed ellipse (a petal), rotated by ang degrees. bias moves the widest point forward."""
    a = math.radians(ang); pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = math.cos(t) * L / 2; y = math.sin(t) * w / 2 * (1 - bias * math.cos(t)) ** 0.5 if bias else math.sin(t) * w / 2
        # pinch the ends
        y *= (1 - (abs(math.cos(t)) ** 3) * 0.6)
        pts.append((cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)))
    return pts


def arc_seg(cx, cy, r, a0, a1, thick, n=10):
    outer = [(cx + math.cos(math.radians(a0 + (a1 - a0) * i / n)) * (r + thick / 2), cy + math.sin(math.radians(a0 + (a1 - a0) * i / n)) * (r + thick / 2)) for i in range(n + 1)]
    inner = [(cx + math.cos(math.radians(a0 + (a1 - a0) * i / n)) * (r - thick / 2), cy + math.sin(math.radians(a0 + (a1 - a0) * i / n)) * (r - thick / 2)) for i in range(n, -1, -1)]
    return outer + inner


class Voice(Hull):
    def __init__(self, key, u, cell, state="live"):
        super().__init__(key, u, cell)
        self.state = state  # live, dead (husk), hollow (Unsung)
        self.stroke = {"live": EDGE, "dead": DEADEDGE, "hollow": BONEEDGE}[state]
        self.glow = {"live": CYAN, "dead": None, "hollow": VIOLET}[state]
        self.glow2 = {"live": CYAN2, "dead": None, "hollow": VIOLET2}[state]
        self.glow3 = {"live": CYAN3, "dead": None, "hollow": VIOLET3}[state]
        self.fill = {"live": "url(#voiceHull)", "dead": "url(#deadHull)", "hollow": "url(#hollowHull)"}[state]
        self.rnd = random.Random(sum(ord(c) for c in key)); self.maxarea = 0.0

    def warp(self, pts, cx, cy):
        """Hollow and dead hulls: segments drift and tilt."""
        if self.state == "live": return pts
        a = math.radians(self.rnd.uniform(-14, 14) if self.state == "hollow" else self.rnd.uniform(-9, 9))
        dx, dy = self.rnd.uniform(-1.2, 1.2) * self.u, self.rnd.uniform(-1.2, 1.2) * self.u
        out = []
        for x, y in pts:
            x0, y0 = x - cx, y - cy
            out.append((cx + x0 * math.cos(a) - y0 * math.sin(a) + dx, cy + x0 * math.sin(a) + y0 * math.cos(a) + dy))
        return out

    def seg(self, pts, skip_ok=True):
        """A segment: a plate with a soft glow under it and a lit rim. The Unsung lose some."""
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        area = (max(xs) - min(xs)) * (max(ys) - min(ys)); small = area < 0.4 * self.maxarea; self.maxarea = max(self.maxarea, area)
        if self.state == "hollow" and skip_ok and small and self.rnd.random() < 0.22:
            # a missing segment: only its ghost outline
            self.f(poly(self.warp(pts, cx, cy), "none", stroke=VIOLET, sw=0.12, extra='opacity="0.35" stroke-dasharray="1 1.5"'))
            return
        pts = self.warp(pts, cx, cy)
        if self.glow:
            rx = (max(xs) - min(xs)) / 2 + 1.5 * self.u; ry = (max(ys) - min(ys)) / 2 + 1.5 * self.u
            self.full.insert(0, ell(cx, cy, rx, ry, self.glow, 'opacity="0.10"'))
            self.full.insert(0, ell(cx, cy, rx * 0.8, ry * 0.8, self.glow, 'opacity="0.10"'))
        self.body(pts, self.fill, grid=False, sw=0.24)
        if self.glow:
            inner = [(cx + (x - cx) * 0.72, cy + (y - cy) * 0.72) for x, y in pts]
            self.f(poly(inner, "none", stroke=self.glow2, sw=0.12, extra='opacity="0.55"'))
        else:
            self.f(poly([(cx + (x - cx) * 0.72, cy + (y - cy) * 0.72) for x, y in pts], "none", stroke=DEADEDGE, sw=0.1, extra='opacity="0.5"'))

    def petal(self, cx, cy, L, w, ang=0.0, bias=0.0):
        self.seg(lens(cx, cy, L, w, ang, bias=bias))

    def ring(self, cx, cy, r, thick, n, gap=10, a_off=0):
        for i in range(n):
            a0 = a_off + i * 360 / n + gap / 2; a1 = a_off + (i + 1) * 360 / n - gap / 2
            self.seg(arc_seg(cx, cy, r, a0, a1, thick))

    def core(self, x, y, r):
        """The voice. A dead hull has none; the Unsung's is wrong."""
        if not self.glow:
            self.f(circ(x, y, r * 0.7, "#5a6166", stroke=DEADEDGE, sw=0.14), mid=True); return
        self.f(circ(x, y, r * 2.2, self.glow, extra='opacity="0.12"')); self.f(circ(x, y, r * 1.5, self.glow, extra='opacity="0.18"'))
        self.f(circ(x, y, r, self.glow, stroke=self.glow2, sw=0.14), mid=True)
        self.f(circ(x, y, r * 0.55, self.glow3), mid=True)
        if self.state == "hollow":
            for k in range(5):
                a = self.rnd.uniform(0, 360); L = r * self.rnd.uniform(1.6, 3.2)
                self.f(line(x, y, x + math.cos(math.radians(a)) * L, y + math.sin(math.radians(a)) * L, stroke=VIOLET2, sw=0.14, extra='opacity="0.6"'))

    def field(self, x0, y0, x1, y1, bow=0.0):
        """A field line bridging a gap: the only thing holding the hull together."""
        if not self.glow: return
        mx, my = (x0 + x1) / 2 + bow * (y0 - y1) * 0.5, (y0 + y1) / 2 + bow * (x1 - x0) * 0.5
        self.f(f'<path d="M {x0:.2f} {y0:.2f} Q {mx:.2f} {my:.2f} {x1:.2f} {y1:.2f}" fill="none" stroke="{self.glow}" stroke-width="0.16" opacity="0.5"></path>')
        self.f(f'<path d="M {x0:.2f} {y0:.2f} Q {mx:.2f} {my:.2f} {x1:.2f} {y1:.2f}" fill="none" stroke="{self.glow3}" stroke-width="0.06" opacity="0.8"></path>')

    def wake(self, x, y, L, w):
        """A faint wake behind the drive pods."""
        if not self.glow: return
        self.full.insert(0, ell(x - L * 0.5, y, L, w, self.glow, 'opacity="0.10"'))
        self.full.insert(0, ell(x - L * 0.3, y, L * 0.6, w * 0.6, self.glow, 'opacity="0.14"'))
        self.mid.insert(0, ell(x - L * 0.3, y, L * 0.6, w * 0.6, self.glow, 'opacity="0.14"'))

    def pods(self, x, ys, L, w, hull_x):
        """Drive pods: nacelles that deliberately do not touch the hull, held aft of it by field, each trailing its own wake."""
        for y in ys:
            self.petal(x, y, L, w, bias=-0.2)
            self.field(hull_x, y * 0.6, x + L / 2 - 0.3, y * 0.95, bow=0.0)
            self.wake(x - L / 2, y, L * 1.2, w * 0.9)


# ------------------------------------------------------------------ the voices

def fermata(state="live"):
    """Aurel Fermata, the watcher: a hold. Three slender segments in a line, a pair of wide sensor planes that never touch the spine, a small voice amidships. It holds station at the edge of sensor range and burns away if approached; the best eyes in known space, and no weapon at all."""
    key = {"live": "aurel-fermata", "hollow": "uns-fermata", "dead": "aurel-husk"}[state]
    h = Voice(key, 0.7, 3.0, state)
    h.petal(10, 0, 14, 5.0, bias=0.3); h.petal(-2, 0, 8, 6.2); h.petal(-12, 0, 10, 4.0)
    for s in (-1, 1):
        h.petal(-3, s * 7.5, 18, 2.2, ang=s * 6)
        h.field(-2, s * 3.0, -3, s * 6.4, bow=0.3 * s)
    h.field(2.8, 0, 2.2, 0); h.field(-6.1, 0, -7.0, 0)
    h.core(-2, 0, 1.3)
    h.pods(-20, (-2.8, 2.8), 5, 1.8, -17)
    h.ymax = 9.5
    return h, 24


def lament(state="live"):
    """Aurel Lament, the warden: the voice that fought the Quiet War. A broad shield segment forward, two swept flank blades, two lances held out ahead of the bow by nothing, a bright voice. It fights the Unsung and nothing else, unless the Choir makes it."""
    key = {"live": "aurel-lament", "hollow": "uns-lament", "dead": "aurel-husk"}[state]
    h = Voice(key, 1.0, 4.0, state)
    h.petal(8, 0, 20, 13, bias=0.35)
    h.petal(-9, 0, 14, 8)
    h.petal(-21, 0, 10, 5)
    for s in (-1, 1):
        h.petal(-6, s * 11, 22, 3.6, ang=s * -12)
        h.petal(24, s * 4.5, 12, 1.4, ang=0)  # the lances
        h.field(17.5, s * 1.5, 18.5, s * 4.2, bow=0.2 * s)
        h.field(-2, s * 6.2, -3, s * 9.6, bow=-0.3 * s)
    h.field(-1.9, 0, -2.4, 0); h.field(-15.8, 0, -16.3, 0)
    h.core(-1, 0, 2.6)
    h.pods(-30, (-5, 5), 8, 2.8, -26)
    h.ymax = 14
    return h, 38


def hush(state="live"):
    """Aurel Hush, the silencer: the instrument of the Sundering. A ring of six arc segments round the voice, nothing between them but field, and a tail of three segments. It puts gates to sleep, mutes a region of the Lattice and blinds every relay in it; it does not fight, it makes fighting impossible to report."""
    key = {"live": "aurel-hush", "hollow": "uns-hush", "dead": "aurel-husk"}[state]
    h = Voice(key, 1.2, 4.6, state)
    h.ring(10, 0, 13, 4.2, 6, gap=14, a_off=0)
    h.petal(-12, 0, 16, 7); h.petal(-26, 0, 10, 4.5); h.petal(-36, 0, 7, 3)
    for a in range(0, 360, 60): h.field(10 + math.cos(math.radians(a + 22)) * 11, math.sin(math.radians(a + 22)) * 11, 10 + math.cos(math.radians(a + 38)) * 11, math.sin(math.radians(a + 38)) * 11)
    h.field(-3.5, 0, -4.2, 0); h.field(-19.8, 0, -21.2, 0); h.field(-30.8, 0, -32.6, 0)
    h.core(10, 0, 3.4)
    h.pods(-44, (-4, 4), 8, 2.6, -39.5)
    h.ymax = 16
    return h, 50


def refrain(state="live"):
    """Aurel Refrain, the tender: the Tending made a ship. Two curved arms of segments form a cradle open forward, the voice at its heart; a ship rests in the cradle to be mended, and a faded pilot is retuned there. It carries nothing that can hurt."""
    key = {"live": "aurel-refrain", "hollow": "uns-refrain", "dead": "aurel-husk"}[state]
    h = Voice(key, 1.0, 4.0, state)
    h.petal(-14, 0, 12, 6); h.petal(-25, 0, 8, 4)
    for s in (-1, 1):
        a0, a1, a2, a3 = (40, 100, 112, 165) if s > 0 else (320, 260, 248, 195)
        h.seg(arc_seg(2, 0, 13, a0, a1, 3.8)); h.seg(arc_seg(2, 0, 13, a2, a3, 3.2))
        h.field(2 + math.cos(math.radians(a1)) * 13, math.sin(math.radians(a1)) * 13, 2 + math.cos(math.radians(a2)) * 13, math.sin(math.radians(a2)) * 13)
        h.field(2 + math.cos(math.radians(a3)) * 13, math.sin(math.radians(a3)) * 13, -9.5, s * 2.2, bow=0.2 * s)
    h.field(-20.2, 0, -21.2, 0)
    h.core(2, 0, 2.4)
    h.pods(-33, (-3.5, 3.5), 7, 2.4, -29)
    h.ymax = 17
    return h, 38


def canticle(state="live"):
    """Aurel Canticle, the wayfarer: the voice that crosses the Shoals. A long spindle of seven segments with wide gaps, two long planes held off the hull, a deep voice forward. It carries the drive nobody human has built and goes where the lanes are broken."""
    key = {"live": "aurel-canticle", "hollow": "uns-canticle", "dead": "aurel-husk"}[state]
    h = Voice(key, 1.3, 4.8, state)
    xs = [(26, 14, 6), (10, 12, 8), (-6, 12, 9), (-22, 12, 8), (-36, 10, 6.5), (-48, 8, 5), (-58, 6, 3.5)]
    for cx, L, w in xs: h.petal(cx, 0, L, w, bias=0.15)
    for (a, _, _), (b, Lb, _) in zip(xs, xs[1:]): h.field(a - 0, 0, b + Lb / 2 - 0.2, 0) if False else None
    for i in range(len(xs) - 1):
        ax = xs[i][0] - xs[i][1] / 2; bx = xs[i + 1][0] + xs[i + 1][1] / 2
        h.field(ax, 0.6, bx, 0.6); h.field(ax, -0.6, bx, -0.6)
    for s in (-1, 1):
        h.petal(-14, s * 12, 40, 3.0, ang=s * 2)
        h.field(-6, s * 4.5, -8, s * 10.5, bow=0.2 * s); h.field(-24, s * 4, -22, s * 10.5, bow=-0.2 * s)
    h.core(22, 0, 3.0)
    h.pods(-66, (-4.5, 0, 4.5), 9, 2.6, -61.5)
    h.ymax = 14.5
    return h, 74


def threnody(state="live"):
    """Aurel Threnody, the great voice: a chorus in one hull. A vast central segment, a crown of segments held round it in a slow ellipse, five voices lit together, field everywhere. It was the Quiet War's line of battle; humans have seen one twice and wrote both down."""
    key = {"live": "aurel-threnody", "hollow": "uns-threnody", "dead": "aurel-husk"}[state]
    h = Voice(key, 1.9, 6.6, state)
    h.petal(6, 0, 70, 30, bias=0.25)
    h.petal(-46, 0, 26, 14); h.petal(-68, 0, 14, 8)
    n = 10
    for i in range(n):
        a = math.radians(360 * i / n + 18); rx, ry = 52, 28
        cx, cy = 2 + math.cos(a) * rx, math.sin(a) * ry
        ang = math.degrees(math.atan2(math.sin(a) * rx, -math.cos(a) * ry)) if False else math.degrees(math.atan2(-math.cos(a) * ry, math.sin(a) * rx)) + 90
        h.petal(cx, cy, 16, 5, ang=ang)
        a2 = math.radians(360 * (i + 0.5) / n + 18)
        h.field(cx, cy, 2 + math.cos(a2) * rx * 0.9, math.sin(a2) * ry * 0.9, bow=0.15)
    for (x, y, r) in ((14, 0, 4.0), (-6, -7, 2.4), (-6, 7, 2.4), (-30, 0, 2.2), (-46, 0, 2.0)): h.core(x, y, r)
    h.field(-29, 0, -33.5, 0); h.field(-59.5, 0, -61.5, 0)
    h.pods(-82, (-14, -5, 5, 14), 14, 4.5, -75)
    h.ymax = 34
    return h, 92


def tacet():
    """Aurel Tacet, the sealed development and test ship: the voice that never sang. A pale spindle whose segments touch, the only Aurel hull with no gaps, a dim voice, no wake. It never left home."""
    h = Voice("aurel-tacet", 1.0, 4.0, "live")
    for cx, L, w in ((16, 20, 8), (0, 14, 10), (-14, 14, 8), (-26, 10, 5)): h.petal(cx, 0, L + 1.2, w, bias=0.1)
    h.f(circ(0, 0, 2.2, CYAN, extra='opacity="0.35"'), mid=True); h.f(circ(0, 0, 1.0, CYAN2, extra='opacity="0.6"'))
    return h, 30


def husk():
    """An Aurel husk: a dead Lament. Dull white, no glow, no voice, the segments drifted and tilted; the fields that held it are forty thousand years gone. Unflyable; its parts are priceless."""
    h, R = lament("dead")
    return h, R


DEFS = ('<linearGradient id="voiceHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9d1dd"></stop><stop offset="0.35" stop-color="#eef7fb"></stop>'
        '<stop offset="0.5" stop-color="#ffffff"></stop><stop offset="0.65" stop-color="#eef7fb"></stop><stop offset="1" stop-color="#b9d1dd"></stop></linearGradient>'
        '<linearGradient id="deadHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c8388"></stop><stop offset="0.4" stop-color="#b9bfc3"></stop>'
        '<stop offset="0.5" stop-color="#c6cccf"></stop><stop offset="0.6" stop-color="#b9bfc3"></stop><stop offset="1" stop-color="#7c8388"></stop></linearGradient>'
        '<linearGradient id="hollowHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d554d"></stop><stop offset="0.4" stop-color="#a99d8f"></stop>'
        '<stop offset="0.5" stop-color="#bfb3a4"></stop><stop offset="0.6" stop-color="#a99d8f"></stop><stop offset="1" stop-color="#5d554d"></stop></linearGradient>')

NOTES = {
    "aurel-fermata": ["Aurel Fermata, the watcher: three slender segments in a line, two wide sensor planes held off the spine by field, a small voice amidships, a faint wake and no engine. Holds station at the edge of sensor range and burns away if approached. The best eyes in known space; no weapon at all."],
    "aurel-lament": ["Aurel Lament, the warden: a broad shield segment forward, two swept flank blades, two lances held ahead of the bow by nothing visible, a bright voice. The hull that fought the Quiet War; it fights the Unsung and nothing else, unless the Hollow Choir makes it."],
    "aurel-hush": ["Aurel Hush, the silencer: a ring of six arc segments round the voice with only field between them, a tail of three segments. The instrument of the Sundering: it puts gates to sleep, mutes a region of the Lattice and blinds every relay in it."],
    "aurel-refrain": ["Aurel Refrain, the tender: two curved arms of segments form a cradle open forward, the voice at its heart, a short tail. A ship rests in the cradle to be mended; a faded pilot is retuned there. Carries nothing that can hurt."],
    "aurel-canticle": ["Aurel Canticle, the wayfarer: a long spindle of seven segments with wide gaps, two long planes held off the hull, a deep voice forward. Carries the long-range drive nobody human has built; goes where the lanes are broken."],
    "aurel-threnody": ["Aurel Threnody, the great voice: a vast central segment with a crown of ten segments held round it in a slow ellipse, five voices lit together, field everywhere. The Quiet War's line of battle. Humans have seen one twice."],
    "aurel-tacet": ["Aurel Tacet, the sealed development and test ship: a pale spindle whose segments touch, the only Aurel hull with no gaps, a dim voice and no wake. A voice that never sang; it never left home."],
    "aurel-husk": ["An Aurel husk: a dead Lament. Dull white, no glow, no voice, the segments drifted and tilted. The fields that held it are forty thousand years gone. Unflyable; its parts are priceless to researchers, and the Hollow Choir bolts them onto human ships."],
    "uns-fermata": ["Unsung Fermata, a hollow watcher: the Fermata's shape in bone plate, a violet voice that leaks light in cracks, segments tilted and one missing. It watches too, for the other side."],
    "uns-lament": ["Unsung Lament, a hollow warden: the Lament gone wrong. Bone segments drifting out of true, a violet voice bleeding light, a missing blade. What the Choir saw at the Dimming's edge and called the true builders."],
    "uns-hush": ["Unsung Hush, a hollow silencer: the ring broken and askew, the voice violet and loud. Where one is, relays die and gates that were asleep begin to stir."],
    "uns-threnody": ["Unsung Threnody, a hollow great voice: the crown fallen out of its ellipse, segments missing, five voices lit wrong. The thing the Aurel caged. Seen once, at Kerran, by a Novum expedition that did not come home."],
}

ENTRIES = [
    # key, builder, col, name, job, char
    ("aurel-fermata", "aurel", "voice", "Aurel Fermata", "Watcher; the voice that holds station", "The white ship at the edge of sensor range; it sees everything and burns away"),
    ("aurel-lament", "aurel", "voice", "Aurel Lament", "Warden; the voice that fights the Unsung", "The hull that fought the Quiet War"),
    ("aurel-hush", "aurel", "voice", "Aurel Hush", "Silencer; the voice that sleeps gates and mutes the Lattice", "The instrument of the Sundering"),
    ("aurel-refrain", "aurel", "voice", "Aurel Refrain", "Tender; the voice that mends ships and retunes the faded", "The Tending made a ship"),
    ("aurel-canticle", "aurel", "voice", "Aurel Canticle", "Wayfarer; the voice that crosses the Shoals", "Carries the drive nobody human has built"),
    ("aurel-threnody", "aurel", "voice", "Aurel Threnody", "Great voice; a chorus in one hull", "The Quiet War's line of battle; seen twice"),
    ("aurel-husk", "aurel", "voice", "Aurel husk", "A dead voice; salvage", "No fields, no glow, unflyable; its parts are priceless"),
    ("uns-fermata", "unsung", "voice", "Unsung Fermata", "Hollow watcher", "It watches for the other side"),
    ("uns-lament", "unsung", "voice", "Unsung Lament", "Hollow warden", "What the Choir saw and called the true builders"),
    ("uns-hush", "unsung", "voice", "Unsung Hush", "Hollow silencer", "Where one is, relays die and sleeping gates stir"),
    ("uns-threnody", "unsung", "voice", "Unsung Threnody", "Hollow great voice", "The thing the Aurel caged; seen once, at Kerran"),
]
WEIGHT = {"aurel-fermata": "Light", "aurel-lament": "Medium", "aurel-hush": "Heavy", "aurel-refrain": "Medium", "aurel-canticle": "Heavy", "aurel-threnody": "Capital", "aurel-husk": "Medium", "aurel-tacet": "Medium",
          "uns-fermata": "Light", "uns-lament": "Medium", "uns-hush": "Heavy", "uns-threnody": "Capital"}


def all_art():
    syms, meta = [], {}
    builders = [fermata, lament, hush, refrain, canticle, threnody, tacet, husk,
                lambda: fermata("hollow"), lambda: lament("hollow"), lambda: hush("hollow"), lambda: threnody("hollow")]
    for fn in builders:
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.1, h.xmax * 1.1)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return DEFS, "".join(syms), meta
