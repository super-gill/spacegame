"""The Aurel: voices. And the Unsung: the hollow ships.

Jason's direction, 7 November: white, hyper-modern, a collection of floating
parts; and from the concept sheet, B and C together. The body is a crisp
silhouette fractured into flat tiles by hairline glowing seams (B); the voice
sits in a core inside detached arcs and halos (C). Drive pods, planes, fins
and lances hang off the hull on field and never touch it: the one deliberate
exception to "nothing floats". No windows, no engines, no instruments, no
markings. The glow is the voice, and there is little of it: seams, arcs, one
core. A dead hull is dull grey with no glow and its tiles drifted; the Unsung
are the same shapes in bone with a violet voice, tiles missing and tilted.
Nose +x.
"""
import math
import random
from kod import Hull, poly, rect, line, circ, ell, P

W_EDGE = "#8fb6c8"; CY = "#5fd9ff"; CY2 = "#cdf4ff"
DEADEDGE = "#6f767b"
BONEEDGE = "#4a433d"; VI = "#c35bff"; VI2 = "#ffd0ec"


def cham(x, y, w, h, c):
    return [(x + c, y), (x + w - c, y), (x + w, y + c), (x + w, y + h - c), (x + w - c, y + h), (x + c, y + h), (x, y + h - c), (x, y + c)]


def rot(pts, cx, cy, a):
    a = math.radians(a)
    return [(cx + (x - cx) * math.cos(a) - (y - cy) * math.sin(a), cy + (x - cx) * math.sin(a) + (y - cy) * math.cos(a)) for x, y in pts]


def arc_path(cx, cy, r, a0, a1):
    p0 = (cx + math.cos(math.radians(a0)) * r, cy + math.sin(math.radians(a0)) * r)
    p1 = (cx + math.cos(math.radians(a1)) * r, cy + math.sin(math.radians(a1)) * r)
    large = 1 if (a1 - a0) % 360 > 180 else 0
    return f"M {p0[0]:.2f} {p0[1]:.2f} A {r:.2f} {r:.2f} 0 {large} 1 {p1[0]:.2f} {p1[1]:.2f}"


class Voice(Hull):
    def __init__(self, key, u, cell, state="live"):
        super().__init__(key, u, cell)
        self.state = state
        self.stroke = {"live": W_EDGE, "dead": DEADEDGE, "hollow": BONEEDGE}[state]
        self.glow = {"live": CY, "dead": None, "hollow": VI}[state]
        self.glow2 = {"live": CY2, "dead": None, "hollow": VI2}[state]
        self.fill = {"live": "url(#voiceHull)", "dead": "url(#deadHull)", "hollow": "url(#hollowHull)"}[state]
        self.rnd = random.Random(sum(ord(c) * (i + 1) for i, c in enumerate(key)))
        self.maxarea = 0.0

    # ---- the body: tiles with glowing seams
    def warp(self, pts):
        if self.state == "live": return pts
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        a = self.rnd.uniform(-10, 10) if self.state == "hollow" else self.rnd.uniform(-7, 7)
        dx, dy = self.rnd.uniform(-0.9, 0.9) * self.u, self.rnd.uniform(-0.9, 0.9) * self.u
        return [(x + dx, y + dy) for x, y in rot(pts, cx, cy, a)]

    def tiles(self, tiles):
        """A fractured body. The seams glow because the whole silhouette is lit underneath and the tiles sit on it with hairline gaps."""
        areas = []
        for t in tiles:
            xs = [p[0] for p in t]; ys = [p[1] for p in t]; areas.append((max(xs) - min(xs)) * (max(ys) - min(ys)))
        big = max(areas)
        if self.glow:
            for t in tiles:
                xs = [p[0] for p in t]; ys = [p[1] for p in t]; cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
                grown = [(cx + (x - cx) * 1.04 + (0.35 if x > cx else -0.35), cy + (y - cy) * 1.04 + (0.35 if y > cy else -0.35)) for x, y in t]
                self.f(poly(grown, self.glow, stroke="none", sw=0, extra='opacity="0.55"'))
        for t, a in zip(tiles, areas):
            if self.state == "hollow" and a < 0.5 * big and self.rnd.random() < 0.25:
                self.f(poly(self.warp(t), "none", stroke=VI, sw=0.14, extra='opacity="0.4" stroke-dasharray="1 1.5"'))
                continue
            self.body(self.warp(t), self.fill, grid=False, sw=0.2)

    # ---- detached parts
    def part(self, pts):
        """A floating part: a fin, a plane, a lance, a pod body. Lit only on its own hairline."""
        self.body(self.warp(pts), self.fill, grid=False, sw=0.2)

    def plane(self, x, y, L, h, ang=0.0):
        self.part(rot(cham(x, y - h / 2, L, h, min(h * 0.45, 1.2)), x + L / 2, y, ang))

    def lance(self, x, y, L, h):
        self.part([(x, y - h / 2), (x + L - h * 1.2, y - h / 2), (x + L, y), (x + L - h * 1.2, y + h / 2), (x, y + h / 2)])

    def pod(self, x, y, L, h):
        """A drive pod that deliberately does not touch the hull: its own wake behind it, a lit face forward."""
        if self.glow:
            self.full.insert(0, ell(x - L * 0.3, y, L * 0.9, h * 0.5, self.glow, 'opacity="0.14"'))
            self.mid.insert(0, ell(x - L * 0.3, y, L * 0.9, h * 0.5, self.glow, 'opacity="0.14"'))
        self.part(cham(x, y - h / 2, L, h, h * 0.38))
        if self.glow: self.f(line(x + L - 0.5, y - h * 0.3, x + L - 0.5, y + h * 0.3, stroke=self.glow, sw=0.3))

    def arc(self, cx, cy, r, a0, a1, w):
        """A detached arc round a voice: a white band with a hairline, lit along its inside."""
        d = arc_path(cx, cy, r, a0, a1)
        if self.state != "live":
            da = self.rnd.uniform(-12, 12) if self.state == "hollow" else self.rnd.uniform(-6, 6); a0 += da; a1 += da
            if self.state == "hollow" and self.rnd.random() < 0.25:
                self.f(f'<path d="{arc_path(cx, cy, r, a0, a1)}" fill="none" stroke="{VI}" stroke-width="0.14" opacity="0.4" stroke-dasharray="1 1.5"/>'); return
            d = arc_path(cx, cy, r, a0, a1)
        self.f(f'<path d="{d}" fill="none" stroke="{self.fill}" stroke-width="{w:.2f}" stroke-linecap="round"/>', mid=True)
        self.f(f'<path d="{d}" fill="none" stroke="{self.stroke}" stroke-width="0.18" stroke-linecap="round" opacity="0.9"/>')
        self.f(f'<path d="{arc_path(cx, cy, r + w / 2, a0, a1)}" fill="none" stroke="{self.stroke}" stroke-width="0.18" stroke-linecap="round" opacity="0.9"/>')
        self.f(f'<path d="{arc_path(cx, cy, r - w / 2, a0, a1)}" fill="none" stroke="{self.stroke}" stroke-width="0.18" stroke-linecap="round" opacity="0.9"/>')
        if self.glow: self.f(f'<path d="{arc_path(cx, cy, r - w / 2 - 0.4, a0 + 3, a1 - 3)}" fill="none" stroke="{self.glow}" stroke-width="0.2" opacity="0.8"/>')
        self.ymax = max(self.ymax, abs(cy) + r + w)
        self.xmin = min(self.xmin, cx - r - w); self.xmax = max(self.xmax, cx + r + w)

    def halo(self, cx, cy, r):
        if not self.glow: return
        self.f(circ(cx, cy, r, "none", stroke=self.glow, sw=0.18, extra='opacity="0.6"'))
        self.ymax = max(self.ymax, abs(cy) + r)

    def core(self, x, y, r):
        """The voice."""
        if not self.glow:
            self.f(circ(x, y, r * 0.75, "#555c61", stroke=DEADEDGE, sw=0.14), mid=True); return
        self.f(circ(x, y, r * 2.2, self.glow, extra='opacity="0.07"')); self.f(circ(x, y, r * 1.4, self.glow, extra='opacity="0.14"'))
        self.f(circ(x, y, r, self.glow), mid=True); self.f(circ(x, y, r * 0.5, self.glow2), mid=True)
        if self.state == "hollow":
            for k in range(6):
                a = self.rnd.uniform(0, 360); L = r * self.rnd.uniform(1.8, 3.6)
                self.f(line(x, y, x + math.cos(math.radians(a)) * L, y + math.sin(math.radians(a)) * L, stroke=VI2, sw=0.14, extra='opacity="0.6"'))

    def seam(self, x1, y1, x2, y2):
        if self.glow: self.f(line(x1, y1, x2, y2, stroke=self.glow, sw=0.22, extra='opacity="0.8"'))


def keyfor(kind, state):
    return {"live": f"aurel-{kind}", "hollow": f"uns-{kind}", "dead": "aurel-husk"}[state]


# ------------------------------------------------------------------ the voices

def fermata(state="live"):
    """Aurel Fermata, the watcher: a long needle fractured into four tiles, a small voice in two thin arcs amidships, two sensor planes held off the spine, two pods aft. It holds station at the edge of sensor range and burns away; the best eyes in known space and no weapon."""
    h = Voice(keyfor("fermata", state), 0.7, 3.0, state)
    h.tiles([[(22, 0), (12, -2.6), (12, 2.6)], [(11, -2.6), (-4, -3.4), (-4, 3.4), (11, 2.6)], [(-5, -3.4), (-16, -2.4), (-16, 2.4), (-5, 3.4)], [(-17, -2.4), (-24, -1.4), (-24, 1.4), (-17, 2.4)]])
    h.arc(2, 0, 6.5, -55, 55, 1.4); h.arc(2, 0, 6.5, 125, 235, 1.4)
    for s in (-1, 1):
        h.plane(-10, s * 10.5, 22, 1.6, ang=s * -3)
        h.pod(-33, s * 2.8, 6, 2.4)
    h.core(2, 0, 1.3)
    h.ymax = 12
    return h, 26


def lament(state="live"):
    """Aurel Lament, the warden: a sharp delta fractured into tiles along glowing seams, the voice amidships inside two heavy arcs, two lances held ahead of the bow by nothing, two fins off the trailing edge, two pods aft. The hull that fought the Quiet War."""
    h = Voice(keyfor("lament", state), 1.0, 4.0, state)
    h.tiles([[(30, 0), (12, -8), (12, -1.2)], [(30, 0), (12, 1.2), (12, 8)],
             [(11, -8), (-14, -12), (-14, -1.2), (11, -1.2)], [(11, 1.2), (-14, 1.2), (-14, 12), (11, 8)],
             [(-15, -12), (-30, -8), (-30, -1.2), (-15, -1.2)], [(-15, 1.2), (-30, 1.2), (-30, 8), (-15, 12)]])
    h.arc(-2, 0, 15, -50, 50, 2.2); h.arc(-2, 0, 15, 130, 230, 2.2)
    for s in (-1, 1):
        h.lance(32, s * 4.5, 12, 1.8)
        h.plane(-34, s * 15.5, 16, 1.8, ang=s * 8)
        h.pod(-42, s * 5.5, 8, 3.2)
    h.core(-2, 0, 2.4)
    h.ymax = 18
    return h, 46


def refrain(state="live"):
    """Aurel Refrain, the tender: the voice inside a cradle of three detached arcs open forward, a short tiled tail behind, a halo, two pods. A ship rests in the cradle to be mended; a faded pilot is retuned there. Carries nothing that can hurt."""
    h = Voice(keyfor("refrain", state), 1.0, 4.0, state)
    h.tiles([[(-6, -4), (-20, -5), (-20, 5), (-6, 4)], [(-21, -5), (-32, -3), (-32, 3), (-21, 5)]])
    h.arc(4, 0, 14, 35, 110, 3.0); h.arc(4, 0, 14, 250, 325, 3.0); h.arc(4, 0, 14, 125, 235, 2.0)
    h.arc(4, 0, 20, 60, 100, 1.4); h.arc(4, 0, 20, 260, 300, 1.4)
    h.halo(4, 0, 24)
    for s in (-1, 1): h.pod(-42, s * 4, 7, 2.8)
    h.core(4, 0, 2.6)
    h.ymax = 25
    return h, 46


def hush(state="live"):
    """Aurel Hush, the silencer: a disc. The voice at the centre of three concentric detached rings, each broken into arcs, a halo round all, a short tiled tail and two pods. The instrument of the Sundering: it sleeps gates, mutes the Lattice and blinds every relay in its range."""
    h = Voice(keyfor("hush", state), 1.2, 4.6, state)
    h.tiles([[(-22, -5), (-36, -6), (-36, 6), (-22, 5)], [(-37, -6), (-46, -4), (-46, 4), (-37, 6)]])
    for (r, w, n, g) in ((9, 2.4, 2, 30), (16, 2.0, 4, 18), (24, 1.6, 6, 14)):
        for i in range(n):
            a0 = i * 360 / n + g / 2 + (r * 7) % 360; a1 = (i + 1) * 360 / n - g / 2 + (r * 7) % 360
            h.arc(0, 0, r, a0, a1, w)
    h.halo(0, 0, 29)
    for s in (-1, 1): h.pod(-56, s * 5, 9, 3.2)
    h.core(0, 0, 3.4)
    h.ymax = 30
    return h, 60


def canticle(state="live"):
    """Aurel Canticle, the wayfarer: a long spindle fractured into nine tiles, the voice forward in two long arcs, two long planes held off the hull, three pods. Carries the drive nobody human has built and goes where the lanes are broken."""
    h = Voice(keyfor("canticle", state), 1.3, 4.8, state)
    T = []
    xs = [44, 30, 16, 2, -12, -26, -40, -52, -62]
    hw = [2.5, 5.5, 7, 7.5, 7.5, 7, 6, 4.5, 3]
    for i in range(len(xs) - 1):
        T.append([(xs[i], -hw[i]), (xs[i + 1] + 1, -hw[i + 1]), (xs[i + 1] + 1, hw[i + 1]), (xs[i], hw[i])])
    T[0] = [(52, 0), (44, -2.5), (30 + 1, -5.5), (30 + 1, 5.5), (44, 2.5)]
    h.tiles(T)
    h.arc(28, 0, 11, -40, 40, 1.8); h.arc(28, 0, 11, 140, 220, 1.8)
    for s in (-1, 1):
        h.plane(-30, s * 13, 44, 2.0, ang=s * 2)
        h.pod(-74, s * 5.5, 9, 3.0)
    h.pod(-76, 0, 9, 3.0)
    h.core(28, 0, 2.8)
    h.ymax = 15
    return h, 84


def note_tile(cx, cy, L, w, ang):
    """A Note: one fighter-sized tile. A small delta with a notch at the tail so it locks into the wing."""
    pts = [(L * 0.5, 0), (L * 0.1, -w / 2), (-L * 0.5, -w / 2), (-L * 0.4, 0), (-L * 0.5, w / 2), (L * 0.1, w / 2)]
    return [(cx + x, cy + y) for x, y in rot(pts, 0, 0, ang)]


NOTE_SLOTS = [  # where each Note sits in the Threnody's wing: x, y, angle. A stepped delta: a flock locked into a hull.
    (40, -10, -4), (40, 10, 4), (24, -22, -6), (24, 22, 6), (6, -34, -8), (6, 34, 8),
    (-14, -43, -10), (-14, 43, 10), (-36, -48, -10), (-36, 48, 10), (-58, -46, -8), (-58, 46, 8)]


def threnody(state="live", deployed=False):
    """Aurel Threnody, the great voice: a capital carrier whose wing IS its fighters. A keel of tiles carries the great voice; twelve Notes, each a fighter in its own right with its own small voice, lock around it as the wing. Deployed, they leave the hull and fight; the keel remains, and the Notes return to become the hull again."""
    h = Voice(keyfor("threnody", state), 1.9, 6.6, state)
    keel = [[(74, 0), (48, -6), (48, -1.2)], [(74, 0), (48, 1.2), (48, 6)],
            [(47, -6), (10, -9), (10, -1.2), (47, -1.2)], [(47, 1.2), (10, 1.2), (10, 9), (47, 6)],
            [(9, -9), (-40, -9), (-40, -1.2), (9, -1.2)], [(9, 1.2), (-40, 1.2), (-40, 9), (9, 9)],
            [(-41, -9), (-84, -5), (-84, -1.2), (-41, -1.2)], [(-41, 1.2), (-84, 1.2), (-84, 5), (-41, 9)]]
    h.tiles(keel)
    notes = [note_tile(x, y, 26, 11, a) for (x, y, a) in NOTE_SLOTS]
    if not deployed:
        h.tiles(notes)
        for (x, y, a) in NOTE_SLOTS: h.core(x - 3, y, 1.0)
    else:
        h.key = "aurel-threnody-open"
        for t in notes: h.f(poly(t, "none", stroke=h.glow or DEADEDGE, sw=0.16, extra='opacity="0.35" stroke-dasharray="1.5 1.5"'))
        # the Notes loosed: out ahead and to the flanks, as a wing fights
        for i, (x, y, a) in enumerate(NOTE_SLOTS):
            fx, fy = x + 60 + (i % 3) * 14, y * 1.9 + (-6 if y < 0 else 6)
            h.tiles([note_tile(fx, fy, 26, 11, a * 0.5)]); h.core(fx - 3, fy, 1.0)
    for (x, r, rr) in ((28, 4.2, 12), (-20, 3.2, 10), (-60, 2.6, 8)):
        h.arc(x, 0, rr, -45, 45, 1.6); h.arc(x, 0, rr, 135, 225, 1.6); h.core(x, 0, r)
    h.halo(-6, 0, 60)
    for s in (-1, 1):
        for yy in (6, 18): h.pod(-100, s * yy, 12, 4.0)
    h.ymax = 62 if not deployed else 100
    return h, 112 if not deployed else 150


def note(state="live"):
    """An Aurel Note: one tile of a Threnody's wing, flown alone. A fighter-sized delta with a notch at the tail where it locks into the hull, one small voice, no pods: the wing's field carries it, and it carries itself when loosed."""
    h = Voice(keyfor("note", state), 0.5, 2.2, state)
    h.tiles([note_tile(0, 0, 26, 11, 0)])
    h.seam(-15, 0, 14, 0)
    h.core(-3, 0, 1.4)
    h.ymax = 9
    return h, 20


def tacet():
    """Aurel Tacet, the sealed development and test ship: a spindle fractured into tiles whose seams do not glow, one dim voice and no arcs, two pods. A voice that never sang; it never left home."""
    h = Voice("aurel-tacet", 1.0, 4.0, "live")
    h.glow = None; h.glow2 = None
    h.tiles([[(26, 0), (16, -4), (16, 4)], [(15, -4), (0, -6), (0, 6), (15, 4)], [(-1, -6), (-16, -6), (-16, 6), (-1, 6)], [(-17, -6), (-28, -3.5), (-28, 3.5), (-17, 6)]])
    for s in (-1, 1): h.pod(-38, s * 3.5, 7, 2.8)
    h.f(circ(0, 0, 2.0, CY, extra='opacity="0.35"'), mid=True); h.f(circ(0, 0, 0.9, CY2, extra='opacity="0.6"'))
    # The test rig's three human guns (the game's dev fit), bolted on where a voice would carry none.
    h.weapon("w1", "high", "S", 20, 0); h.weapon("w2", "high", "S", 4, -3.4); h.weapon("w3", "high", "S", 10, 2.6)
    return h, 42


def husk():
    """An Aurel husk: a dead Lament. Dull grey, no glow, no voice, tiles drifted out of true and the arcs fallen aside; the fields that held it are forty thousand years gone. Unflyable; its parts are priceless."""
    return lament("dead")


DEFS = ('<linearGradient id="voiceHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6e4ec"></stop><stop offset="0.4" stop-color="#f6fafc"></stop>'
        '<stop offset="0.5" stop-color="#ffffff"></stop><stop offset="0.6" stop-color="#f6fafc"></stop><stop offset="1" stop-color="#d6e4ec"></stop></linearGradient>'
        '<linearGradient id="deadHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c8388"></stop><stop offset="0.4" stop-color="#b9bfc3"></stop>'
        '<stop offset="0.5" stop-color="#c6cccf"></stop><stop offset="0.6" stop-color="#b9bfc3"></stop><stop offset="1" stop-color="#7c8388"></stop></linearGradient>'
        '<linearGradient id="hollowHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d554d"></stop><stop offset="0.4" stop-color="#a99d8f"></stop>'
        '<stop offset="0.5" stop-color="#bfb3a4"></stop><stop offset="0.6" stop-color="#a99d8f"></stop><stop offset="1" stop-color="#5d554d"></stop></linearGradient>')

NOTES = {
    "aurel-fermata": ["Aurel Fermata, the watcher: a long white needle fractured into four tiles along glowing seams, a small voice in two thin arcs amidships, two sensor planes held off the spine by field, two drive pods aft that never touch it. Holds station at the edge of sensor range and burns away if approached. The best eyes in known space; no weapon at all."],
    "aurel-lament": ["Aurel Lament, the warden: a sharp white delta fractured into six tiles, the voice amidships inside two heavy detached arcs, two lances held ahead of the bow by nothing visible, two fins off the trailing edge, two pods aft. The hull that fought the Quiet War; it fights the Unsung and nothing else, unless the Hollow Choir makes it."],
    "aurel-refrain": ["Aurel Refrain, the tender: the voice inside a cradle of three detached arcs open forward, two more arcs outside them, a halo round all, a short tiled tail, two pods. A ship rests in the cradle to be mended; a faded pilot is retuned there. Carries nothing that can hurt."],
    "aurel-hush": ["Aurel Hush, the silencer: a disc. The voice at the centre of three concentric detached rings broken into arcs, a halo round all, a short tiled tail and two pods. The instrument of the Sundering: it sleeps gates, mutes the Lattice and blinds every relay in its range."],
    "aurel-canticle": ["Aurel Canticle, the wayfarer: a long white spindle fractured into nine tiles, the voice forward inside two long arcs, two long planes held off the hull, three pods aft. Carries the long-range drive nobody human has built; goes where the lanes are broken."],
    "aurel-threnody": ["Aurel Threnody, the great voice and the Aurel carrier: a keel of white tiles carrying three voices in their arcs, and twelve Notes locked round it as the wing, each a fighter in its own right with its own small voice. Deployed, the Notes leave the hull and fight like fighters; the keel remains; they return and are the hull again. A halo round all, four pods held aft. The Quiet War's line of battle; humans have seen one twice."],
    "aurel-threnody-open": ["Aurel Threnody with its wing loosed: the keel alone with its three voices, the ghost outlines of twelve empty slots, and the Notes out ahead and on the flanks, fighting. They return and are the hull again."],
    "aurel-note": ["An Aurel Note: one tile of a Threnody's wing flown alone. A fighter-sized white delta with a notch at the tail where it locks into the hull, one glowing seam, one small voice, no pods. The wing's field carries it in the hull; loosed, it carries itself."],
    "aurel-tacet": ["Aurel Tacet, the sealed development and test ship: a white spindle fractured into tiles whose seams do not glow, one dim voice, no arcs, two pods. A voice that never sang; it never left home."],
    "aurel-husk": ["An Aurel husk: a dead Lament. Dull grey, no glow, no voice, the tiles drifted out of true and the arcs fallen aside. The fields that held it are forty thousand years gone. Unflyable; its parts are priceless to researchers, and the Hollow Choir bolts them onto human ships."],
    "uns-fermata": ["Unsung Fermata, a hollow watcher: the Fermata's needle in bone plate, a violet voice that leaks light in cracks, tiles tilted and one missing. It watches too, for the other side."],
    "uns-lament": ["Unsung Lament, a hollow warden: the Lament gone wrong. Bone tiles drifting out of true, an arc missing, a violet voice bleeding light. What the Choir saw at the Dimming's edge and called the true builders."],
    "uns-hush": ["Unsung Hush, a hollow silencer: the rings broken and askew, arcs missing, the voice violet and loud. Where one is, relays die and gates that were asleep begin to stir."],
    "uns-threnody": ["Unsung Threnody, a hollow great voice: the keel in bone, Notes missing from the wing and the rest askew, three voices lit wrong. The thing the Aurel caged. Seen once, at Kerran, by a Novum expedition that did not come home."],
    "uns-note": ["An Unsung Note: a hollow fighter-tile, bone plate, a violet seam, a voice that leaks."],
}

ENTRIES = [
    ("aurel-fermata", "aurel", "voice", "Aurel Fermata", "Watcher; the voice that holds station", "The white ship at the edge of sensor range; it sees everything and burns away"),
    ("aurel-lament", "aurel", "voice", "Aurel Lament", "Warden; the voice that fights the Unsung", "The hull that fought the Quiet War"),
    ("aurel-hush", "aurel", "voice", "Aurel Hush", "Silencer; the voice that sleeps gates and mutes the Lattice", "The instrument of the Sundering"),
    ("aurel-refrain", "aurel", "voice", "Aurel Refrain", "Tender; the voice that mends ships and retunes the faded", "The Tending made a ship"),
    ("aurel-canticle", "aurel", "voice", "Aurel Canticle", "Wayfarer; the voice that crosses the Shoals", "Carries the drive nobody human has built"),
    ("aurel-threnody", "aurel", "voice", "Aurel Threnody", "Great voice; the carrier whose wing is its fighters", "The Quiet War's line of battle; seen twice"),
    ("aurel-threnody-open", "aurel", "voice", "Aurel Threnody, wing loosed", "Great voice with its Notes deployed", "The hull takes itself apart to fight"),
    ("aurel-note", "aurel", "voice", "Aurel Note", "Fighter; one tile of a Threnody's wing", "A fighter that is also a piece of hull"),
    ("aurel-husk", "aurel", "voice", "Aurel husk", "A dead voice; salvage", "No fields, no glow, unflyable; its parts are priceless"),
    ("uns-fermata", "unsung", "voice", "Unsung Fermata", "Hollow watcher", "It watches for the other side"),
    ("uns-lament", "unsung", "voice", "Unsung Lament", "Hollow warden", "What the Choir saw and called the true builders"),
    ("uns-hush", "unsung", "voice", "Unsung Hush", "Hollow silencer", "Where one is, relays die and sleeping gates stir"),
    ("uns-threnody", "unsung", "voice", "Unsung Threnody", "Hollow great voice; the hollow carrier", "The thing the Aurel caged; seen once, at Kerran"),
    ("uns-note", "unsung", "voice", "Unsung Note", "Hollow fighter-tile", "A piece of the thing, loose"),
]
WEIGHT = {"aurel-fermata": "Light", "aurel-lament": "Medium", "aurel-hush": "Heavy", "aurel-refrain": "Medium", "aurel-canticle": "Heavy", "aurel-threnody": "Capital", "aurel-husk": "Medium", "aurel-tacet": "Medium",
          "uns-fermata": "Light", "uns-lament": "Medium", "uns-hush": "Heavy", "uns-threnody": "Capital", "aurel-note": "Subcraft", "uns-note": "Subcraft", "aurel-threnody-open": "Capital"}


def all_art():
    syms, meta = [], {}
    builders = [fermata, lament, hush, refrain, canticle, threnody, lambda: threnody(deployed=True), note, tacet, husk,
                lambda: fermata("hollow"), lambda: lament("hollow"), lambda: hush("hollow"), lambda: threnody("hollow"), lambda: note("hollow")]
    for fn in builders:
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.1, h.xmax * 1.1)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return DEFS, "".join(syms), meta
