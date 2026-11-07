"""Civil yards, pass two: Belt Forge Collective and Rook and Rivet, production and legacy.

Belt originals: rust orange and gunmetal, exposed trusses, asymmetric by
habit (the laser boom to port, the hopper to starboard), bolted-on, hazard
stripes, spare mounts left empty. Belt Forge is mining: lasers on booms,
open ore hoppers, drill rigs, bunkers, ice saws. Rook and Rivet is salvage:
cranes, claws, cutting torches, tow clamps, scrap racks, patch plate on patch
plate. Legacy marks: fewer parts, more patches, the old rust gone brown.
Nose points +x.
"""
import math
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, P, clamp, fade, INK, WHITE, RED, GREEN, SHADOW, GLASS
from belt import BeltParts as B, RUST, RUST2, GUN, GUN2, DARKG, BSEAM, HAZY, HAZK, COOP, COOP2

ORE = ["#5a4a3a", "#7a6a55", "#8c7b63", "#b08a4a"]; ICE = "#cfe7ee"; ICE2 = "#7fb0bd"; CAB = "#0f2a3a"; OLDRUST = "#8a5a3a"; TRUSS = "#6a7079"


class BeltCivil(Hull):
    def __init__(self, key, u, cell, old=False):
        super().__init__(key, u, cell); self.old = old; self.stroke = BSEAM

    def hull(self, pts, fill=None):
        self.body(pts, fill or ("url(#bfHull)" if not self.old else "url(#bfOld)"))

    def frame(self, x0, x1, y0, y1, pitch):
        """An open girder frame: the Belt builds on trusses, not hulls."""
        self.f(rect(x0, y0, x1 - x0, y1 - y0, "#0d1012", stroke=BSEAM, sw=0.16), mid=True)
        for yy in (y0 + 0.4, y1 - 0.4): self.f(line(x0, yy, x1, yy, stroke=TRUSS, sw=0.32))
        x = x0; k = 0
        while x + pitch <= x1 + 0.01:
            if k % 2 == 0: self.f(line(x, y0 + 0.4, x + pitch, y1 - 0.4, stroke=TRUSS, sw=0.2))
            else: self.f(line(x, y1 - 0.4, x + pitch, y0 + 0.4, stroke=TRUSS, sw=0.2))
            self.f(line(x, y0 + 0.4, x, y1 - 0.4, stroke=TRUSS, sw=0.16))
            x += pitch; k += 1

    def tie(self, x0, x1, y_edge, y_frame, n=3):
        """Struts from a component's inner edge to the frame it hangs off: nothing on a Belt ship floats."""
        if y_frame is None or abs(y_edge - y_frame) < 0.1: return
        for k in range(n):
            x = x0 + (x1 - x0) * (k + 0.5) / n
            self.f(rect(x - 0.45, min(y_edge, y_frame), 0.9, abs(y_edge - y_frame), TRUSS, stroke=BSEAM, sw=0.12), mid=True)

    def cab(self, x, y, w, h, tie=None):
        """A small glazed cab, usually off-centre."""
        if tie is not None: self.tie(x, x + w, (y + h) if y + h <= 0 else y, -abs(tie) if y + h <= 0 else abs(tie), 2)
        self.f(rect(x + 0.4, y + 0.4, w, h, SHADOW, stroke="none", sw=0))
        self.f(rect(x, y, w, h, GUN, stroke=BSEAM, sw=0.18, rx=0.5), mid=True)
        self.f(rect(x + w * 0.55, y + h * 0.2, w * 0.35, h * 0.6, CAB, stroke=BSEAM, sw=0.12, rx=0.3), mid=True)
        self.f(line(x + w * 0.6, y + h * 0.35, x + w * 0.85, y + h * 0.3, stroke="#2fb3b0", sw=0.1, extra='opacity="0.6"'))

    def boom(self, x, y, L, side, tool="laser", mount=None):
        """A boom off the hull, with a laser head, a drill or an ice saw on the end. `mount=(id, size)` makes
        a laser head a game mount: the boom stays hull, the head is the fitted mining laser."""
        self.f(rect(x, y - 0.5, L, 1.0, GUN2, stroke=BSEAM, sw=0.14), mid=True)
        for k in (0.3, 0.6): self.f(line(x + L * k, y - 0.5, x + L * k, y + 0.5, stroke=BSEAM, sw=0.1))
        self.f(circ(x, y, 1.1, DARKG, stroke=BSEAM, sw=0.16), mid=True); self.f(circ(x, y, 0.4, GUN2))
        ex = x + L
        if tool == "laser" and mount:
            self.f(rect(ex - 0.9, y - 0.9, 1.8, 1.8, DARKG, stroke=BSEAM, sw=0.14, rx=0.9), mid=True)
            with self.mount(mount[0], "high", mount[1], ex, y):
                self.f(rect(ex - 0.6, y - 1.1, 2.2, 2.2, DARKG, stroke=BSEAM, sw=0.14, rx=0.3), mid=True)
                self.f(circ(ex + 1.9, y, 0.5, "#ff9a3a")); self.f(circ(ex + 1.9, y, 1.0, "#ff9a3a", extra='opacity="0.3"'))
        elif tool == "laser":
            self.f(rect(ex - 0.6, y - 1.1, 2.2, 2.2, DARKG, stroke=BSEAM, sw=0.14, rx=0.3), mid=True)
            self.f(circ(ex + 1.9, y, 0.5, "#ff9a3a")); self.f(circ(ex + 1.9, y, 1.0, "#ff9a3a", extra='opacity="0.3"'))
        elif tool == "drill":
            self.f(poly([(ex, y - 1.3), (ex + 3.2, y - 0.35), (ex + 3.2, y + 0.35), (ex, y + 1.3)], GUN2, stroke=BSEAM, sw=0.14), mid=True)
            for k in range(3): self.f(line(ex + 0.6 + k * 0.8, y - 1.0 + k * 0.25, ex + 0.6 + k * 0.8, y + 1.0 - k * 0.25, stroke=BSEAM, sw=0.12))
        elif tool == "saw":
            self.f(circ(ex + 1.4, y, 1.6, GUN2, stroke=BSEAM, sw=0.14), mid=True)
            for a in range(0, 360, 45): self.f(line(ex + 1.4 + math.cos(math.radians(a)) * 1.0, y + math.sin(math.radians(a)) * 1.0, ex + 1.4 + math.cos(math.radians(a)) * 1.7, y + math.sin(math.radians(a)) * 1.7, stroke=BSEAM, sw=0.14))
            self.f(circ(ex + 1.4, y, 0.3, BSEAM))

    def hopper(self, x, y, w, h, fill_level=0.7, ice=False, tie=None):
        """An open ore hopper: a bin with chunks showing, or ice slabs."""
        if tie is not None: self.tie(x, x + w, (y + h) if y + h <= 0 else y, -abs(tie) if y + h <= 0 else abs(tie))
        self.f(rect(x, y, w, h, "#15181b", stroke=BSEAM, sw=0.18), mid=True)
        if ice:
            n = max(2, int(w / 3)); gw = w / n
            for i in range(n): self.f(rect(x + i * gw + 0.2, y + 0.3, gw - 0.4, h - 0.6, ICE, stroke=ICE2, sw=0.12, rx=0.3), mid=True)
            return
        import random
        rnd = random.Random(int(x * 7 + y * 13 + w))
        k = int(w * h * fill_level / 1.6)
        for i in range(k):
            cx = x + 0.6 + rnd.random() * (w - 1.2); cy = y + 0.6 + rnd.random() * (h - 1.2); r = 0.35 + rnd.random() * 0.45
            self.f(poly([(cx + math.cos(math.radians(a)) * r * (0.8 + 0.3 * rnd.random()), cy + math.sin(math.radians(a)) * r) for a in range(0, 360, 60)], ORE[i % len(ORE)], stroke=BSEAM, sw=0.08))

    def bunker(self, x, y, L, r, tie=None):
        """A boxy ore or water bunker bolted along the flank."""
        if tie is not None: self.tie(x, x + L, (y + r) if y < 0 else (y - r), -abs(tie) if y < 0 else abs(tie))
        self.f(rect(x + 0.3, y - r + 0.3, L, 2 * r, SHADOW, stroke="none", sw=0, rx=0.6))
        self.f(rect(x, y - r, L, 2 * r, RUST2 if not self.old else OLDRUST, stroke=BSEAM, sw=0.18, rx=0.6), mid=True)
        for k in (0.25, 0.5, 0.75): self.f(line(x + L * k, y - r, x + L * k, y + r, stroke=BSEAM, sw=0.12))
        for k in (0.12, 0.37, 0.62, 0.87): self.f(circ(x + L * k, y - r * 0.6, 0.14, BSEAM)); self.f(circ(x + L * k, y + r * 0.6, 0.14, BSEAM))

    def spare_mount(self, x, y, r):
        """An empty ring mount: the Belt leaves room for whatever comes next."""
        self.f(circ(x, y, r, "none", stroke=GUN2, sw=0.2)); self.f(circ(x, y, r * 0.3, GUN2))
        for a in range(0, 360, 90): self.f(circ(x + math.cos(math.radians(a + 45)) * r * 0.8, y + math.sin(math.radians(a + 45)) * r * 0.8, r * 0.1, BSEAM))

    def claw(self, x, y, side, L=4.0):
        """A salvage claw on a short arm."""
        self.f(rect(x, y - 0.4, L, 0.8, GUN2, stroke=BSEAM, sw=0.14), mid=True)
        self.f(circ(x, y, 0.9, DARKG, stroke=BSEAM, sw=0.14), mid=True); self.f(circ(x, y, 0.3, GUN2))
        ex = x + L
        self.f(circ(ex, y, 0.7, DARKG, stroke=BSEAM, sw=0.14), mid=True)
        for s in (-1, 1):
            self.f(f'<path d="M {ex:.2f} {y + s * 0.4:.2f} Q {ex + 1.8:.2f} {y + s * 2.2:.2f} {ex + 3.2:.2f} {y + s * 1.0:.2f}" fill="none" stroke="{GUN2}" stroke-width="0.55" stroke-linecap="round"></path>')
            self.f(f'<path d="M {ex:.2f} {y + s * 0.4:.2f} Q {ex + 1.8:.2f} {y + s * 2.2:.2f} {ex + 3.2:.2f} {y + s * 1.0:.2f}" fill="none" stroke="{BSEAM}" stroke-width="0.12" stroke-linecap="round"></path>')

    def crane(self, x, y, L, side, post_to=None):
        """A crane arm folded along the hull with a hook, on a post down to whatever it stands on."""
        if post_to is not None: self.f(rect(x - 0.6, min(y, post_to), 1.2, abs(post_to - y), TRUSS, stroke=BSEAM, sw=0.12), mid=True)
        self.f(rect(x, y - 0.5, L, 1.0, GUN, stroke=BSEAM, sw=0.14), mid=True)
        self.f(circ(x, y, 0.9, GUN2, stroke=BSEAM, sw=0.12)); self.f(circ(x + L, y, 0.5, GUN2, stroke=BSEAM, sw=0.12))
        self.f(line(x + L, y, x + L, y + side * 2.0, stroke=GUN2, sw=0.2)); self.f(circ(x + L, y + side * 2.2, 0.35, HAZY))

    def torch(self, x, y):
        self.f(circ(x, y, 0.7, DARKG, stroke=BSEAM, sw=0.12), mid=True)
        self.f(rect(x, y - 0.25, 2.2, 0.5, GUN2, stroke=BSEAM, sw=0.12), mid=True); self.f(circ(x + 2.4, y, 0.35, "#ffb060")); self.f(circ(x + 2.4, y, 0.8, "#ffb060", extra='opacity="0.3"'))

    def scrap(self, x, y, w, h):
        """A rack of scrap plate: the salvage firm's cargo."""
        self.f(rect(x, y, w, h, "#15181b", stroke=BSEAM, sw=0.16), mid=True)
        import random
        rnd = random.Random(int(x * 3 + y * 5 + w))
        for i in range(int(w * h / 6)):
            px = x + 0.5 + rnd.random() * (w - 3); py = y + 0.5 + rnd.random() * (h - 1.8)
            self.f(rect(px, py, 1.5 + rnd.random() * 1.5, 0.6 + rnd.random() * 0.8, [GUN2, "#4b5c6b", RUST2, "#9ea7ad"][i % 4], stroke=BSEAM, sw=0.1, extra=f'transform="rotate({rnd.random() * 30 - 15:.0f} {px:.2f} {py:.2f})"'))

    def clamp(self, x, hw):
        """A tow clamp across the bow: the tug's face."""
        self.f(rect(x, -hw, 2.4, 2 * hw, GUN, stroke=BSEAM, sw=0.2, rx=0.4), mid=True)
        for yy in (-hw * 0.7, -hw * 0.25, hw * 0.25, hw * 0.7): self.f(rect(x + 0.4, yy - 0.4, 1.6, 0.8, HAZY, stroke="none", sw=0))

    def engines(self, x_stern, ys, hh):
        for y in ys: B.engine(self, x_stern, y, hh)

    def finish(self, stencil_xy, text, fs, nav_xy, hazard=None):
        self.f(f'<text x="{stencil_xy[0]:.2f}" y="{stencil_xy[1]:.2f}" font-family="IBM Plex Mono, monospace" font-size="{fs:.2f}" fill="{HAZY}" opacity="0.8" text-anchor="middle">{text}</text>')
        B.nav(self, *nav_xy)
        if hazard:
            x, y, w, h = hazard; B.hazard(self, x, y, w, h)
        if self.old:
            u = self.u
            B.patch(self, [(stencil_xy[0] + 3 * u, stencil_xy[1] + 1.2 * u), (stencil_xy[0] + 8 * u, stencil_xy[1] + 1.6 * u), (stencil_xy[0] + 7.5 * u, stencil_xy[1] + 4 * u), (stencil_xy[0] + 2.5 * u, stencil_xy[1] + 3.6 * u)], OLDRUST)


# ------------------------------------------------------------------ Belt Forge

def pony(old=False):
    """Courier: a cab bolted to a frame with one bunker and an engine too big for it. A pit pony: small, stubborn, goes anywhere."""
    h = BeltCivil("bf-pony-old" if old else "bf-pony", 0.7, 3.0, old)
    h.frame(-11, 9, -2.0, 2.0, 2.5)
    h.hull(cham(-4, -3.6, 12, 7.2, 1.0))
    h.cab(3, -2.2, 6, 4.4)
    h.bunker(-10, 3.6, 10, 1.6, tie=2.0)
    if not old: h.bunker(-10, -3.6, 7, 1.4, tie=2.0)
    else: h.spare_mount(-6, -3.6, 1.1)
    B.engine(h, -12, 0, 2.6)
    h.spare_mount(-1, 0, 1.0)
    h.finish((1, 6.4), "PONY", 1.0, ((-9, -4.6), (-9, 5.6)), hazard=(2, -3.9, 5, 0.6))
    return h, 15


def mule(old=False):
    """Hauler: a frame twice the Pony's length with two bunkers a side and a hopper, the cab to port, two engines. Uglier, tougher, cheaper than a Waybill."""
    h = BeltCivil("bf-mule-old" if old else "bf-mule", 0.9, 3.6, old)
    h.frame(-20, 14, -2.4, 2.4, 3.2)
    h.hull(cham(-2, -4.4, 14, 8.8, 1.2))
    h.cab(6, -6.5, 7, 4.2, tie=2.4)
    h.bunker(-19, -5.4, 14, 2.0, tie=2.4); h.bunker(-19, 5.4, 14, 2.0, tie=2.4)
    if not old: h.bunker(-4, 5.6, 9, 1.8, tie=2.4)
    h.hopper(-18, -2.0, 12, 4.0, 0.6 if not old else 0.3, tie=2.4)
    h.engines(-21, [-2.6, 2.6], 2.2)
    h.spare_mount(10, 2.5, 1.2)
    h.finish((3, 1.0), "MULE", 1.1, ((-17, -7.8), (-17, 7.8)), hazard=(-18, 7.6, 10, 0.8))
    return h, 24


def adit(old=False):
    """Freighter: a long frame with four hoppers under bunkers, a cab block forward and off-centre, a spare mount with a gun on it, three engines. A Belt freighter with teeth."""
    h = BeltCivil("bf-adit-old" if old else "bf-adit", 1.1, 4.4, old)
    h.frame(-36, 24, -3.2, 3.2, 4.0)
    h.hull(cham(14, -7.0, 20, 14, 1.6))
    h.cab(24, -8.5, 8, 5, tie=3.2)
    n = 4 if not old else 3
    for i in range(n): h.hopper(-34 + i * 12, -9.5, 10, 6.0, 0.7, tie=3.2)
    for i in range(n): h.bunker(-34 + i * 12, 7.0, 10, 2.4, tie=3.2)
    h.engines(-37, [-4.0, 0, 4.0], 2.4)
    B.gunmount(h, 20, 5.5, 1.5); h.spare_mount(6, -3.2, 1.4)
    h.finish((20, 1.2), "ADIT", 1.3, ((-34, -10.2), (-34, 9.8)), hazard=(-32, 9.8, 16, 1.0))
    return h, 40


def prospector(old=False):
    """Prospector: the lone digger. A cab, a laser boom to port, a small hopper to starboard, a survey dish, one engine."""
    h = BeltCivil("rookrivet-prospector-old" if old else "rookrivet-prospector", 0.7, 3.0, old)
    h.frame(-10, 6, -1.8, 1.8, 2.5)
    h.hull(cham(-3, -3.2, 10, 6.4, 1.0))
    h.cab(1, -2.0, 5.5, 4.0)
    h.boom(3, -3.0, 8, -1, "laser", mount=("w1", "S"))
    h.hopper(-9, 2.2, 8, 3.2, 0.5 if not old else 0.2, tie=1.8)
    h.f(rect(-6.4, -3.2, 0.8, 1.6, TRUSS, stroke=BSEAM, sw=0.1), mid=True); h.f(circ(-6, -4.2, 1.6, "none", stroke=GUN2, sw=0.3)); h.f(circ(-6, -4.2, 0.4, GUN2))
    B.engine(h, -11, 0, 2.2)
    h.spare_mount(-1, 4.6, 0.9)
    h.weapon("w2", "high", "S", -1.5, -1.6); h.weapon("w3", "high", "S", -1, 4.6, socket=False)
    h.finish((-4, 0.8), "PROSPECTOR", 0.8, ((-2.6, -3.5), (-8.6, 5.6)), hazard=(2, 3.6, 4, 0.5))
    return h, 14


def sinker(old=False):
    """Miner: two laser booms, a drill rig forward, two hoppers, bunkers, the cab high and to starboard, two engines. Shaft sinkers dug the deep, dangerous bores."""
    h = BeltCivil("rookrivet-breacher-old" if old else "rookrivet-breacher", 0.9, 3.6, old)
    h.frame(-18, 10, -2.6, 2.6, 3.2)
    h.hull(cham(-6, -5.0, 16, 10, 1.4))
    h.cab(4, 2.5, 7, 4.5, tie=2.6)
    h.boom(8, -3.5, 8, -1, "laser", mount=("w1", "M")); h.boom(1, -4.8, 10, -1, "laser" if not old else "drill", mount=("w2", "M"))
    if not old: h.boom(10, 0.5, 6, 1, "drill")
    h.hopper(-17, -6.5, 10, 4.5, 0.6, tie=2.6); h.hopper(-17, 2.0, 10, 4.5, 0.6, tie=2.6)
    h.bunker(-4, 8.0, 12, 1.8, tie=2.6)
    h.engines(-19, [-2.8, 2.8], 2.2)
    if old: h.weapon("w2", "high", "M", 6, -2.4)
    h.weapon("w3", "high", "S", -12, 0, math.pi); h.weapon("w4", "high", "M", -1, -2.4); h.weapon("w5", "high", "S", -1, 2.8)
    h.finish((-2, 0.9), "SINKER", 1.1, ((-16, -6.8), (-5, 10.1)), hazard=(-16, 7.2, 8, 0.8))
    h.ymax = 10
    return h, 24


def collier(old=False):
    """Barge: big, slow, filthy. A long frame of six hoppers, bunkers down both flanks, a laser boom, the cab aft and to port, four engines. It keeps the world warm."""
    h = BeltCivil("rookrivet-hulk-old" if old else "rookrivet-hulk", 1.2, 4.4, old)
    h.frame(-40, 30, -4.0, 4.0, 4.5)
    n = 6 if not old else 5
    for i in range(n): h.hopper(-38 + i * 11.5, -3.4, 10, 6.8, 0.75, tie=4.0)
    for i in range(3): h.bunker(-38 + i * 24, -11.0, 22, 2.6, tie=4.0); h.bunker(-38 + i * 24, 11.0, 22, 2.6, tie=4.0)
    for xx in (-34, -22, -10, 2, 14, 26):
        for sg in (-1, 1): h.f(rect(xx - 0.6, min(sg * 4, sg * 8.4), 1.2, 4.4, TRUSS, stroke=BSEAM, sw=0.12), mid=True)
    h.hull(cham(30, -7.5, 12, 15, 1.6))
    h.cab(32, -5.5, 8, 5)
    h.boom(41, -2.0, 8, 1, "laser", mount=("w2", "M"))
    h.engines(-41, [-6, -2, 2, 6], 2.4)
    for xx in (-20, 4): h.spare_mount(xx, -8.2, 1.4)
    h.spare_mount(4, 8.2, 1.4)
    h.weapon("w1", "high", "M", -20, -8.2, math.pi, socket=False)
    h.weapon("m1", "high", "L", 4, -8.2, -math.pi / 2, socket=False); h.weapon("m2", "high", "L", 4, 8.2, math.pi / 2, socket=False)
    h.weapon("d1", "ciws", "M", -26, -12.3, -math.pi / 2); h.weapon("d2", "ciws", "M", -26, 12.3, math.pi / 2)
    h.finish((34, 7.5 + 1.2), "COLLIER", 1.4, ((-38, -14.2), (-38, 14.2)), hazard=(-36, 13.6, 20, 1.0))
    return h, 50


def auger():
    """Ice miner: an ice saw on a long boom forward, a second to port, two ice hoppers, insulated bunkers, the cab aft. Where the rock runs out, the ice begins."""
    h = BeltCivil("bf-auger", 0.9, 3.6)
    h.frame(-18, 12, -2.6, 2.6, 3.2)
    h.hull(cham(-4, -5.0, 14, 10, 1.4))
    h.cab(-14, -2.2, 7, 4.4)
    h.boom(10, 0, 9, 1, "saw"); h.boom(3, -4.8, 9, -1, "saw")
    h.hopper(-17, 3.0, 11, 4.5, ice=True, tie=2.6); h.hopper(-4, 6.0, 11, 4.0, ice=True, tie=2.6)
    h.bunker(-17, -7.5, 12, 1.8, tie=2.6)
    h.engines(-19, [-2.8, 2.8], 2.2)
    h.finish((2, 1.0), "AUGER", 1.1, ((-16, -9.5), (-5, 10.2)), hazard=(-16, 8.8, 8, 0.8))
    h.ymax = 10.5
    return h, 25


def cistern():
    """Ice hauler: four insulated bunkers on a frame, pale and frosted, the cab forward, three engines. Water is the Belt's money."""
    h = BeltCivil("bf-cistern", 1.2, 4.4)
    h.frame(-36, 26, -3.4, 3.4, 4.5)
    h.hull(cham(22, -7.0, 14, 14, 1.6))
    h.cab(28, -4.0, 7, 5)
    for i in range(2):
        for s in (-1, 1):
            x = -34 + i * 28
            h.f(rect(x + 0.3, s * 9 - 4.5 + 0.3, 26, 9, SHADOW, stroke="none", sw=0, rx=1.2))
            h.f(rect(x, s * 9 - 4.5, 26, 9, "#9fb5bd", stroke=BSEAM, sw=0.2, rx=1.2), mid=True)
            h.f(line(x + 2, s * 9 - 2.5, x + 24, s * 9 - 2.5, stroke="#dff2f6", sw=0.25, extra='opacity="0.8"'))
            for k in (0.33, 0.66): h.f(line(x + 26 * k, s * 9 - 4.5, x + 26 * k, s * 9 + 4.5, stroke=BSEAM, sw=0.14))
            h.f(rect(x + 10, s * 9 - 1.0, 6, 2.0, ICE, stroke=ICE2, sw=0.1, rx=0.3))
    h.engines(-37, [-4, 0, 4], 2.4)
    h.finish((28, 1.2), "CISTERN", 1.3, ((-34, -14.2), (-34, 14.2)), hazard=(-30, 13.6, 16, 1.0))
    return h, 40


def burrow():
    """Blockade runner: a low closed hull with no frame showing, a hidden hold under a false bunker, two oversized engines, no hazard paint. Nobody asks what a Burrow carries."""
    h = BeltCivil("bf-burrow", 0.7, 3.0)
    h.hull(sym_pts([(15, -2.0), (12, -4.0), (-10, -4.4), (-14, -3.4), (-15, -2.4)]), "#3a3f45")
    h.cab(6, -2.0, 6, 4.0)
    h.bunker(-11, -4.6, 12, 1.2); h.bunker(-11, 4.6, 12, 1.2)
    h.f(rect(-9, -1.8, 10, 3.6, "#2a2e33", stroke=BSEAM, sw=0.14, rx=0.4), mid=True)
    h.f(line(-4, -1.6, -4, 1.6, stroke=BSEAM, sw=0.1, extra='stroke-dasharray="0.4 0.4"'))
    h.engines(-15, [-1.8, 1.8], 2.0)
    h.f(circ(-9, -4.9, 0.22, "#5a1e18")); h.f(circ(-9, 4.9, 0.22, "#2f6a4e"))
    return h, 17


def winder():
    """Refinery ship: a long frame with a furnace block amidships, four hoppers feeding it, bunkers for the product, the cab high aft, four engines. A winding engine for the whole field."""
    h = BeltCivil("bf-winder", 1.6, 5.2)
    h.frame(-60, 44, -5.0, 5.0, 6.0)
    h.hull(cham(-14, -12, 36, 24, 2.4))
    for xx in (-10, 2, 14): h.f(circ(xx, 0, 4.2, DARKG, stroke=BSEAM, sw=0.24), mid=True); h.f(circ(xx, 0, 2.6, "#1a0e06", stroke=BSEAM, sw=0.12)); h.f(circ(xx, 0, 1.4, "#ff9a3a"))
    for i in range(4): h.hopper(-58 + i * 11, -16, 10, 7.5, 0.75, tie=5.0)
    for i in range(2): h.bunker(-58 + i * 24, 14, 22, 3.2, tie=5.0)
    h.bunker(24, -14, 18, 3.0, tie=5.0); h.bunker(24, 14, 18, 3.0, tie=5.0)
    h.hull(cham(36, -8, 10, 16, 1.6))
    h.cab(38, -5, 8, 6)
    h.engines(-61, [-9, -3, 3, 9], 2.8)
    for xx in (-30, 30): h.spare_mount(xx, 0, 1.8)
    h.finish((2, -13.5), "WINDER", 1.8, ((-57, -16.3), (-57, 17.5)), hazard=(-56, 17.5, 20, 1.2))
    return h, 64


def headframe():
    """Factory ship and mining command ship: a frame the size of a station, a central works with furnaces and a yard, bays for Jacklegs and Knockers, a command block with the fleet beacon, bunkers everywhere, eight engines. The Belt's answer to a station."""
    h = BeltCivil("bf-headframe", 2.2, 7.0)
    h.frame(-120, 96, -8, 8, 8.0)
    h.frame(-120, 96, -40, -32, 8.0); h.frame(-120, 96, 32, 40, 8.0)
    for xx in (-110, -60, -10, 40, 86): h.frame(xx - 3, xx + 3, -32, -8, 6.0); h.frame(xx - 3, xx + 3, 8, 32, 6.0)
    h.hull(cham(-50, -24, 90, 48, 4.0))
    for xx in (-36, -14, 8, 30): h.f(circ(xx, 0, 6.5, DARKG, stroke=BSEAM, sw=0.3), mid=True); h.f(circ(xx, 0, 4.2, "#1a0e06", stroke=BSEAM, sw=0.14)); h.f(circ(xx, 0, 2.2, "#ff9a3a"))
    for s in (-1, 1):
        for i in range(4): h.hopper(-112 + i * 14, s * 20 - 5, 12, 10, 0.7)
        for i in range(2): h.bunker(50 + i * 22, s * 22, 20, 4.5)
        h.f(rect(-50, s * 28 - 3, 90, 6, GUN, stroke=BSEAM, sw=0.2), mid=True)
        for xx in range(-44, 40, 14): h.f(rect(xx, s * 28 - 2, 10, 4, "#0f2236", stroke=HAZY, sw=0.16), mid=True)
    h.hull(cham(56, -14, 34, 28, 3.0))
    h.cab(66, -8, 16, 10)
    h.f(circ(74, 10, 3.6, "#0f2a3a", stroke=BSEAM, sw=0.2), mid=True); h.f(circ(74, 10, 1.4, "#2fb3b0")); h.f(circ(74, 10, 5.5, "#2fb3b0", extra='opacity="0.2"'))
    h.engines(-121, [-30, -20, -10, 0, 10, 20, 30], 3.4)
    for (x, y) in ((-100, -44), (-100, 44), (40, -44), (40, 44), (90, -30), (90, 30)): h.spare_mount(x, y, 2.4)
    for (x, y) in ((-60, -44), (-60, 44), (0, -44), (0, 44)): B.gunmount(h, x, y, 2.4)
    h.finish((0, 30 + 3), "HEADFRAME", 3.0, ((-116, -46), (-116, 46)), hazard=(-116, 41, 40, 2.0))
    h.ymax = 48
    return h, 126


# ------------------------------------------------------------------ Rook and Rivet

def shunt():
    """Tug: a tow clamp across the bow, a squat block, four engines for its size. Moves anything, slowly."""
    h = BeltCivil("rr-shunt", 0.9, 3.6)
    h.hull(cham(-9, -6, 16, 12, 1.4), "url(#rrHull)")
    h.clamp(7, 7.5)
    h.cab(-2, -3, 6, 6)
    B.patch(h, [(-8, -5.5), (-2, -5.2), (-2.5, -2), (-8.5, -2.4)], RUST2)
    h.engines(-10, [-4.5, -1.5, 1.5, 4.5], 1.9)
    h.finish((2, 5.2), "R+R", 1.0, ((-8, -6.3), (-8, 6.3)), hazard=(-6, 5.4, 8, 0.7))
    return h, 14


def scrapper(old=False):
    """Salvage tender, small: a cab on a frame, a claw to port, a torch to starboard, a scrap rack aft, one engine. Cuts, grabs, leaves. Half of them are made of other Scrappers."""
    h = BeltCivil("rr-scrapper-old" if old else "rr-scrapper", 0.7, 3.0, old)
    h.frame(-11, 7, -1.8, 1.8, 2.5)
    h.hull(cham(-2, -3.4, 9, 6.8, 1.0), "url(#rrHull)")
    h.cab(2, -2.0, 5, 4.0)
    h.claw(5.5, -2.6, -1, 3.5)
    h.torch(5.5, 2.6)
    h.scrap(-10, -3.0, 8, 6.0)
    B.engine(h, -12, 0, 2.2)
    B.patch(h, [(-1, 2.0), (3, 2.2), (2.6, 3.6), (-1.4, 3.4)], RUST2 if not old else OLDRUST)
    h.finish((0, 0.5), "R+R", 0.8, ((-9, -3.6), (-9, 3.6)))
    return h, 15


def wrecker():
    """Salvage tender, medium: two claws, two cranes, a tow clamp, a big scrap rack, the cab high, the Grab's bay aft, three engines. Takes the wreck, not the parts."""
    h = BeltCivil("rr-wrecker", 1.1, 4.4)
    h.frame(-30, 18, -3.2, 3.2, 4.0)
    h.hull(cham(2, -8, 18, 16, 1.6), "url(#rrHull)")
    h.cab(10, -5, 8, 5)
    h.claw(20, -5.5, -1, 4.0); h.claw(20, 5.5, 1, 4.0)
    h.crane(-10, -9.5, 14, -1, post_to=-6.0); h.crane(-10, 9.5, 14, 1, post_to=6.0)
    h.scrap(-28, -6.0, 28, 12.0)
    h.f(rect(-28, 6.0, 12, 4, "#0f2236", stroke=HAZY, sw=0.16), mid=True)
    h.engines(-31, [-4.0, 0, 4.0], 2.4)
    B.patch(h, [(4, 3), (14, 3.4), (13.5, 7), (3.5, 6.6)], RUST2)
    h.finish((11, 1.0), "WRECKER", 1.2, ((-27, -6.3), (-27, 6.3)), hazard=(-26, 9.6, 14, 0.9))
    h.ymax = 12
    return h, 36


def breaker():
    """Shipbreaker and salvage command ship: a frame with a breaking yard open down the middle, cranes along it, cutting gantries, scrap racks the size of haulers, bays for Grabs, the command block with the fleet beacon, six engines. Where ships go to become Patchplate."""
    h = BeltCivil("rr-breaker", 1.8, 6.4)
    h.frame(-90, 60, -30, -22, 7.0); h.frame(-90, 60, 22, 30, 7.0)
    for xx in (-84, -40, 4, 48): h.frame(xx - 3, xx + 3, -22, 22, 6.0)
    h.f(rect(-80, -18, 110, 36, "#07090b", stroke=BSEAM, sw=0.3), mid=True)
    for xx in range(-72, 30, 20): h.f(line(xx, -18, xx, 18, stroke=TRUSS, sw=0.4)); h.f(rect(xx - 2, -3, 4, 6, GUN2, stroke=BSEAM, sw=0.12))
    # a half-broken hull in the yard
    h.f(poly([(-20, -8), (20, -10), (24, 0), (18, 9), (-16, 7)], "#2a3a4a", stroke=BSEAM, sw=0.2), mid=True)
    for k in range(5): h.f(line(-14 + k * 7, -7 + k * 0.5, -10 + k * 7, 6, stroke="#ff9a3a", sw=0.3, extra='opacity="0.7"'))
    for s in (-1, 1):
        h.crane(-70, s * 26, 30, -s, post_to=s * 22); h.crane(-20, s * 26, 30, -s, post_to=s * 22); h.crane(30, s * 26, 24, -s, post_to=s * 22)
        h.scrap(-88, s * 34 - 5, 60, 10)
        h.f(rect(-20, s * 34 - 4, 30, 8, "#0f2236", stroke=HAZY, sw=0.2), mid=True)
    h.hull(cham(60, -16, 36, 32, 3.0), "url(#rrHull)")
    h.cab(72, -9, 18, 11)
    h.f(circ(82, 10, 3.6, "#0f2a3a", stroke=BSEAM, sw=0.2), mid=True); h.f(circ(82, 10, 1.4, "#2fb3b0")); h.f(circ(82, 10, 5.5, "#2fb3b0", extra='opacity="0.2"'))
    h.engines(-91, [-22, -13, -4, 4, 13, 22], 3.0)
    for (x, y) in ((-80, -37), (-80, 37), (20, -37), (20, 37)): B.gunmount(h, x, y, 2.2)
    h.finish((70, 1.4), "BREAKER", 2.6, ((-86, -39.2), (-86, 39.2)), hazard=(-84, 37.4, 36, 1.8))
    h.ymax = 44
    return h, 98


DEFS = ('<linearGradient id="bfHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a2e18"></stop><stop offset="0.3" stop-color="#a0522a"></stop>'
        '<stop offset="0.5" stop-color="#c8642e"></stop><stop offset="0.7" stop-color="#a0522a"></stop><stop offset="1" stop-color="#5a2e18"></stop></linearGradient>'
        '<linearGradient id="bfOld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3022"></stop><stop offset="0.3" stop-color="#7a5236"></stop>'
        '<stop offset="0.5" stop-color="#8f6142"></stop><stop offset="0.7" stop-color="#7a5236"></stop><stop offset="1" stop-color="#4a3022"></stop></linearGradient>'
        '<linearGradient id="rrHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2e33"></stop><stop offset="0.3" stop-color="#4f555d"></stop>'
        '<stop offset="0.5" stop-color="#626a73"></stop><stop offset="0.7" stop-color="#4f555d"></stop><stop offset="1" stop-color="#2a2e33"></stop></linearGradient>')

NOTES = {
    "bf-pony": ["Belt Forge Pony, courier: a cab bolted to an open frame, one bunker a side, a spare mount, an engine too big for it. A pit pony: small, stubborn, goes anywhere."],
    "bf-pony-old": ["The old Pony: one bunker, a spare mount where the other was, brown rust, a patch. Nobody has ever thrown one away."],
    "bf-mule": ["Belt Forge Mule, hauler: a frame twice the Pony's length, two bunkers a side, an open ore hopper, the cab to port, two engines. Uglier, tougher and cheaper than a Waybill."],
    "bf-mule-old": ["The old Mule: one bunker fewer, a half-empty hopper, brown rust. See the Pony."],
    "bf-adit": ["Belt Forge Adit, freighter: a long frame with four hoppers and four bunkers, a cab block forward and off-centre, a gun on one spare mount and another left empty, three engines. A Belt freighter with teeth."],
    "bf-adit-old": ["The old Adit: three hoppers, three bunkers, patched twice."],
    "rookrivet-prospector": ["Belt Forge Prospector: the lone digger. A cab on a frame, a laser boom to port, a small hopper to starboard, a survey dish, one engine. Redrawn from the old outline."],
    "rookrivet-prospector-old": ["The old Prospector: the same digger with a lighter hopper and a patch. Belters do not throw ships away."],
    "rookrivet-breacher": ["Belt Forge Sinker, miner: two laser booms to port, a drill rig to starboard, two hoppers, a bunker, the cab high and to starboard, two engines. Shaft sinkers dug the deep, dangerous bores. Redrawn from the old outline."],
    "rookrivet-breacher-old": ["The old Sinker: one laser and a drill, no second rig. Breaches like the new one, carries less."],
    "rookrivet-hulk": ["Belt Forge Collier, barge: a long frame of six open hoppers, bunkers down both flanks, a laser boom forward, the cab forward and to port, two spare mounts, four engines. Big, slow, filthy, and it keeps the world warm. Redrawn from the old outline."],
    "rookrivet-hulk-old": ["The old Collier: five hoppers, brown rust, a patch. Carries less, breaks less."],
    "bf-auger": ["Belt Forge Auger, ice miner: an ice saw on a long boom forward and a second to port, two hoppers of ice slabs, an insulated bunker, the cab aft, two engines. Where the rock runs out, the ice begins."],
    "bf-cistern": ["Belt Forge Cistern, ice hauler: four frosted insulated bunkers on a frame, the cab forward, three engines. Water is the Belt's money."],
    "bf-burrow": ["Belt Forge Burrow, blockade runner: a low closed hull with no frame showing, false bunkers either side, a hidden hold under a seam amidships, two oversized engines, no hazard paint, nav lights dim. Nobody asks what a Burrow carries."],
    "bf-winder": ["Belt Forge Winder, refinery ship: a long frame with a furnace block amidships (three furnaces glowing), four hoppers feeding it, bunkers for the product, the cab high aft, two spare mounts, four engines. A winding engine for the whole field."],
    "bf-headframe": ["Belt Forge Headframe, factory ship and the Belt's mining command ship: a frame the size of a station with a central works of four furnaces, hoppers along both outer frames, bays for Jacklegs and Knockers along the works, bunkers aft, four guns and six spare mounts, a command block with the fleet beacon, seven engines. The Belt's answer to a station."],
    "rr-shunt": ["Rook and Rivet Shunt, tug: a tow clamp across the bow, a squat gunmetal block, four engines for its size. Moves anything, slowly."],
    "rr-scrapper": ["Rook and Rivet Scrapper, salvage tender: a cab on a frame, a claw to port, a cutting torch to starboard, a rack of scrap plate aft, one engine. Cuts, grabs, leaves."],
    "rr-scrapper-old": ["The old Scrapper: the same, browner, patched. Half of them are made of other Scrappers."],
    "rr-wrecker": ["Rook and Rivet Wrecker, salvage tender: two claws forward, two cranes, a big scrap rack, the Grab's bay aft, the cab high, three engines. Takes the wreck, not the parts."],
    "rr-breaker": ["Rook and Rivet Breaker, shipbreaker and the salvage command ship: a frame with a breaking yard open down the middle and a half-cut hull in it, six cranes, scrap racks the size of haulers, two Grab bays, four guns, a command block with the fleet beacon, six engines. Where ships go to become Patchplate."],
}

ENTRIES = [
    ("bf-pony-old", "beltforge", "light", "The old Pony", "Courier, legacy", "Nobody has ever thrown one away", "legacy", "bf-pony"),
    ("bf-mule-old", "beltforge", "cargo", "The old Mule", "Hauler, legacy", "See the Pony", "legacy", "bf-mule"),
    ("bf-adit-old", "beltforge", "cargo", "The old Adit", "Freighter, legacy", "Four bays, patched twice", "legacy", "bf-adit"),
    ("rookrivet-prospector-old", "beltforge", "mining", "The old Prospector", "Prospector, legacy", "Belters do not throw ships away", "legacy", "rookrivet-prospector"),
    ("rookrivet-breacher-old", "beltforge", "mining", "The old Sinker", "Miner, legacy", "Breaches like the new one, carries less", "legacy", "rookrivet-breacher"),
    ("rookrivet-hulk-old", "beltforge", "mining", "The old Collier", "Barge, legacy", "Carries less, breaks less", "legacy", "rookrivet-hulk"),
    ("rr-scrapper-old", "rookrivet", "service", "The old Scrapper", "Salvage tender, legacy", "Half of them are made of other Scrappers", "legacy", "rr-scrapper"),
]
LEGACY_WEIGHT = {"bf-pony-old": "Light", "bf-mule-old": "Medium", "bf-adit-old": "Heavy", "rookrivet-prospector-old": "Light", "rookrivet-breacher-old": "Medium", "rookrivet-hulk-old": "Heavy", "rr-scrapper-old": "Light"}


def all_art():
    syms, meta = [], {}
    builders = [(pony, False), (pony, True), (mule, False), (mule, True), (adit, False), (adit, True), (prospector, False), (prospector, True),
                (sinker, False), (sinker, True), (collier, False), (collier, True), (auger, None), (cistern, None), (burrow, None), (winder, None), (headframe, None),
                (shunt, None), (scrapper, False), (scrapper, True), (wrecker, None), (breaker, None)]
    for fn, old in builders:
        h, R = fn() if old is None else fn(old)
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return DEFS, "".join(syms), meta
