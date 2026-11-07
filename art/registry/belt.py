"""The Belt's military: Union pattern rebuilds drawn over their source hulls, and the clans.

A Union-pattern hull starts as the source's drawing (a Kessari Notice, Writ,
Decree, a Statute-generation cruiser, a Vantage Dirk or Cutlass) and the Belt
grows over it: rust patch plates bolted on, exposed trusses, projectile gun
mounts with ammo drums, bigger Slagline engines, hazard stripes and the Union
mark when on UDF shift. Off shift (the "civilian" variant) the same hull
wears cooperative colours. The clans' hulls are Belt originals: black, red
vanes, built to coast cold. Nose points +x.
"""
import math
import copy
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, P, clamp, INK, WHITE, RED, GREEN, SHADOW, GLASS, GIRDER
import older, kod

RUST = "#c8642e"; RUST2 = "#8a4a2a"; GUN = "#5a5f66"; GUN2 = "#777d85"; DARKG = "#2a2d31"; BSEAM = "#141618"
HAZY = "#e8c547"; HAZK = "#15181b"; COOP = "#5d7a4a"; COOP2 = "#8aa06c"; MARK = "#e8c547"
BLACK = "#0c0d10"; BLACK2 = "#15171c"; VANE = "#b8362a"; VANE2 = "#e0503f"


def rebuild(src_hull, key, militia=True):
    """Take a drawn source hull and return a copy under a new key, ready to be built over."""
    h = copy.deepcopy(src_hull)
    h.key = key
    h.civ = not militia
    h.stroke = BSEAM
    return h


class BeltParts:
    """Parts the Belt bolts onto anything. Functions, so they work on a copied Hull of any class."""

    @staticmethod
    def patch(h, pts, col=RUST2):
        """A patch plate bolted over the hull, never quite square to anything."""
        h.f(poly([(x + 0.5, y + 0.5) for x, y in pts], SHADOW, stroke="none", sw=0))
        h.f(poly(pts, col, stroke=BSEAM, sw=0.26), mid=True)
        n = len(pts)
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            L = math.hypot(x1 - x0, y1 - y0); k = max(1, int(L / (1.4 * h.u)))
            cx = sum(p[0] for p in pts) / n; cy = sum(p[1] for p in pts) / n
            for j in range(1, k):
                t = j / k; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
                dx, dy = cx - x, cy - y; d = math.hypot(dx, dy) or 1
                h.f(circ(x + dx / d * 0.5 * h.u, y + dy / d * 0.5 * h.u, 0.13 * h.u + 0.06, BSEAM))

    @staticmethod
    def gunmount(h, x, y, r, long=True):
        """A projectile gun on a bolted mount: a boxy turret, a long barrel, an ammo drum."""
        h.f(rect(x - r, y - r, 2 * r, 2 * r, DARKG, stroke=BSEAM, sw=0.16, rx=0.2), mid=True)
        h.f(circ(x, y, r * 0.72, GUN, stroke=BSEAM, sw=0.14), mid=True)
        h.f(rect(x + r * 0.2, y - r * 0.16, r * (2.4 if long else 1.5), r * 0.32, GUN2, stroke=BSEAM, sw=0.1))
        h.f(rect(x + r * 0.2, y - r * 0.08, r * (2.4 if long else 1.5), r * 0.16, "#2b2e33", stroke="none", sw=0))
        h.f(circ(x - r * 0.35, y + r * 0.45, r * 0.38, "#3b3f45", stroke=BSEAM, sw=0.12))   # the drum
        for a in range(0, 360, 90): h.f(circ(x + math.cos(math.radians(a + 45)) * r * 0.86, y + math.sin(math.radians(a + 45)) * r * 0.86, r * 0.1, BSEAM))

    @staticmethod
    def engine(h, x_stern, y, hh, housing=True):
        """A Slagline engine: bigger than the hull wants, bolted on behind."""
        u = h.u
        h.full.insert(0, ell(x_stern - hh * 1.3, y, hh * 1.6, hh * 0.7, "#ffd27a", 'opacity="0.5" filter="url(#glowSoft)"'))
        h.mid.insert(0, ell(x_stern - hh * 1.3, y, hh * 1.6, hh * 0.7, "#ffd27a", 'opacity="0.5" filter="url(#glowSoft)"'))
        if housing: h.f(rect(x_stern + 0.5, y - hh * 0.95, 4.0 * u, hh * 1.9, DARKG, stroke=BSEAM, sw=0.2, rx=0.3), mid=True)
        bell = [(x_stern + 1.6 * u, y - hh * 0.6), (x_stern - 2.2 * u, y - hh * 0.85), (x_stern - 2.2 * u, y + hh * 0.85), (x_stern + 1.6 * u, y + hh * 0.6)]
        h.f(poly(bell, GUN, stroke=BSEAM, sw=0.16), mid=True)
        for k in (0.3, 0.6): h.f(line(x_stern + 1.6 * u - (3.8 * u) * k, y - hh * (0.6 + 0.25 * k), x_stern + 1.6 * u - (3.8 * u) * k, y + hh * (0.6 + 0.25 * k), stroke=BSEAM, sw=0.12))
        h.f(ell(x_stern - 2.0 * u, y, 0.6 * u, hh * 0.65, "#060a0f")); h.f(ell(x_stern - 2.0 * u, y, 0.36 * u, hh * 0.45, "#ffd27a", 'opacity="0.9"'))

    @staticmethod
    def truss(h, x0, x1, y0, y1, pitch):
        h.f(rect(x0, y0, x1 - x0, y1 - y0, "#101214", stroke=BSEAM, sw=0.18), mid=True)
        for yy in (y0 + 0.4, y1 - 0.4): h.f(line(x0, yy, x1, yy, stroke=GUN2, sw=0.3))
        x = x0; k = 0
        while x + pitch <= x1 + 0.01:
            if k % 2 == 0: h.f(line(x, y0 + 0.4, x + pitch, y1 - 0.4, stroke=GUN2, sw=0.2))
            else: h.f(line(x, y1 - 0.4, x + pitch, y0 + 0.4, stroke=GUN2, sw=0.2))
            x += pitch; k += 1

    @staticmethod
    def hazard(h, x, y, w, hh, vertical=False):
        """Hazard stripes: the UDF on shift. Off shift, cooperative colours instead."""
        if h.civ:
            h.f(rect(x, y, w, hh, COOP, stroke=BSEAM, sw=0.1), mid=True); return
        h.f(rect(x, y, w, hh, HAZY, stroke="none", sw=0), mid=True)
        step = (hh if vertical else w) / 6
        for i in range(0, 6, 2):
            if vertical: h.f(rect(x, y + i * step, w, step, HAZK, stroke="none", sw=0))
            else: h.f(rect(x + i * step, y, step, hh, HAZK, stroke="none", sw=0))

    @staticmethod
    def mark(h, x, y, r):
        """The Union mark: a ring with a bar through it, the picket line. Cooperative disc when off shift."""
        if h.civ:
            h.f(circ(x, y, r, COOP2, stroke=BSEAM, sw=0.1)); h.f(circ(x, y, r * 0.35, BSEAM)); return
        h.f(circ(x, y, r, "none", stroke=MARK, sw=r * 0.3)); h.f(line(x - r * 1.3, y, x + r * 1.3, y, stroke=MARK, sw=r * 0.3))

    @staticmethod
    def overpaint(h, x, y, w, hh):
        """The source's livery painted out in whatever the cooperative had."""
        h.f(rect(x, y, w, hh, RUST if not h.civ else COOP, stroke="none", sw=0, extra='opacity="0.85"'), mid=True)

    @staticmethod
    def nav(h, xy_r, xy_g):
        (rx, ry), (gx, gy) = xy_r, xy_g
        h.f(circ(rx, ry, 0.36 * h.u, RED)); h.f(circ(gx, gy, 0.36 * h.u, GREEN))


B = BeltParts


# ------------------------------------------------------------------ Union pattern

def wildcat(militia=True):
    """Union Wildcat over a Kessari Notice: stripped to the frame and re-engined. Two Slagline engines where there was one, a gun on the nose, patches everywhere."""
    src, R = older.notice()
    h = rebuild(src, "uni-wildcat", militia)
    B.overpaint(h, -12, -5.6, 4.5, 1.6); B.overpaint(h, -12, 4.0, 4.5, 1.6); B.overpaint(h, -12.5, -0.8, 10, 1.6)
    B.patch(h, [(2, -5.4), (9, -5.2), (8.5, -1.8), (1, -2.2)])
    B.patch(h, [(-9, 1.5), (-1, 1.2), (-0.5, 4.8), (-9.5, 5.2)], GUN)
    B.patch(h, [(10, 0.6), (14, 1.0), (13.5, 2.8), (9.8, 2.6)])
    for s in (-1, 1): B.engine(h, -15.5, s * 2.8, 2.2)
    for mid, x, y, r, long_ in (("w1", 11.5, -1.6, 1.3, True), ("w2", 4, 3.6, 1.1, False)):
        h.f(rect(x - r, y - r, 2 * r, 2 * r, DARKG, stroke=BSEAM, sw=0.16, rx=0.2), mid=True)  # the bolted base stays: the socket
        with h.mount(mid, "high", "S", x, y):
            B.gunmount(h, x, y, r, long=long_)
    B.hazard(h, -8, -6.0, 6, 1.0); B.hazard(h, -8, 5.0, 6, 1.0)
    B.mark(h, -4, -3.4, 0.9)
    return h, R


def blockade(militia=True):
    """Union Blockade over a Kessari Writ: the Strikes' captured toll boats. Guns in the old door frames, a truss boom with a flak mount, three engines."""
    src, R = older.writ()
    h = rebuild(src, "uni-blockade", militia)
    B.overpaint(h, -19, -3.0, 6, 6); B.overpaint(h, -20, 7.0, 6, 1.6)
    B.patch(h, [(-6, -8.2), (6, -8.0), (5, -4.6), (-7, -4.9)])
    B.patch(h, [(8, 3.5), (17, 3.8), (16, 7.6), (7, 7.2)], GUN)
    B.patch(h, [(-18, -1.5), (-9, -1.0), (-9.5, 2.0), (-18.5, 1.5)])
    B.truss(h, -2, 10, -12.5, -8.5, 3.0)
    for xx in (-1, 9): h.f(rect(xx - 0.6, -8.6, 1.2, 1.0, GUN2, stroke=BSEAM, sw=0.12), mid=True)
    for mid, kind, size, x, y, r, long_ in (("w1", "high", "M", 14.5, 0, 1.6, True), ("w2", "high", "S", 4, -12.5, 1.6, True),
                                            ("w3", "high", "S", -3, -6.3, 1.4, False), ("w4", "high", "S", -10, 6.2, 1.4, False)):
        h.f(rect(x - r, y - r, 2 * r, 2 * r, DARKG, stroke=BSEAM, sw=0.16, rx=0.2), mid=True)  # the bolted base stays: the socket
        with h.mount(mid, kind, size, x, y, 0.0):
            B.gunmount(h, x, y, r, long=long_)
    for yy in (-4.0, 0, 4.0): B.engine(h, -23, yy, 1.9)
    B.hazard(h, -16, -8.3, 10, 1.1); B.hazard(h, -16, 7.2, 10, 1.1)
    B.mark(h, 11, 5.6, 1.1)
    return h, R


def boycott(militia=True):
    """Union Boycott over a Kessari Decree: the launchers torn out for guns. A gun deck on each flank where the doors were, a mast of patch plate, four engines."""
    src, R = older.decree()
    h = rebuild(src, "uni-boycott", militia)
    B.overpaint(h, -27, -4.2, 7, 8.4); B.overpaint(h, -2, -13, 8, 1.6)
    for s in (-1, 1):
        B.patch(h, [(-22, s * 8.6), (16, s * 8.8), (15, s * 12.4), (-23, s * 12.2)], GUN)
        for xx in (-16, -6, 4, 13): B.gunmount(h, xx, s * 10.6, 1.4)
        B.engine(h, -32, s * 4.2, 2.1)
    B.patch(h, [(-14, -5.6), (-2, -5.2), (-3, -1.6), (-15, -2.0)])
    B.patch(h, [(20, 2.0), (28, 2.6), (27, 6.4), (19, 5.8)])
    B.engine(h, -32, 0, 2.3)
    B.truss(h, 18, 26, -8.5, -5.5, 2.5); B.gunmount(h, 22, -9.5, 1.6)
    B.hazard(h, -26, -12.8, 12, 1.2); B.hazard(h, -26, 11.6, 12, 1.2)
    B.mark(h, 6, -3.6, 1.3)
    return h, R


def solidarity(militia=True):
    """Union Solidarity over a Statute-generation cruiser captured in the Gate War: rebuilt once by every cooperative at once. Gun decks on both hulls, a second truss, six engines, patches in a dozen cooperatives' plate."""
    src, R, _ = kod.statute()
    h = rebuild(src, "uni-solidarity", militia)
    B.overpaint(h, -30, -19.5 - 1.4, 14, 3.2); B.overpaint(h, -30, 19.5 - 1.8, 14, 3.2); B.overpaint(h, -48, -17, 20, 4)
    for s in (-1, 1):
        B.patch(h, [(22, s * 16.5), (52, s * 16.8), (51, s * 21.8), (23, s * 21.6)], GUN)
        for xx in (27, 37, 47): B.gunmount(h, xx, s * 19.2, 2.0)
        B.patch(h, [(-60, s * 22.5), (-18, s * 22.8), (-19, s * 30.5), (-61, s * 30.2)], GUN)
        for xx in (-54, -44, -34, -24): B.gunmount(h, xx, s * 26.6, 2.2)
        B.patch(h, [(-12, s * 9), (6, s * 9.5), (5, s * 14), (-13, s * 13.5)], COOP2 if s > 0 else RUST2)
        for yy in (12, 24): B.engine(h, -70, s * yy, 3.0)
    B.truss(h, -14, 19, -20, -14, 5.5); B.truss(h, -14, 19, 14, 20, 5.5)
    B.patch(h, [(40, -10), (56, -9), (55, -3), (39, -4)], RUST2); B.patch(h, [(-40, 4), (-26, 5), (-27, 11), (-41, 10)], "#6b5a3a")
    B.overpaint(h, -68, -1.2, 30, 2.4); B.overpaint(h, 22, -1.2, 34, 2.4); B.overpaint(h, -14, -1.2, 33, 2.4)
    B.engine(h, -70, 0, 3.4)
    B.hazard(h, -62, -31.6, 20, 1.6); B.hazard(h, -62, 30.0, 20, 1.6)
    B.mark(h, -36, 0, 2.6)
    return h, R


def general_strike(militia=True):
    """Union General Strike over a Belt Forge Headframe: an industrial capital refitted for war. The hoppers plated over into hangars for UDF Dirks and Cutlasses, the furnaces cold and capped, gun decks bolted to the outer frames, the spare mounts filled, flak on the works. When the Belt brings everyone out."""
    import beltciv
    src, R = beltciv.headframe()
    h = rebuild(src, "uni-general-strike", militia)
    for s in (-1, 1):
        # hangars over the hoppers
        B.patch(h, [(-114, s * 15 - 0.5 * s), (-56, s * 15.5), (-57, s * 26), (-115, s * 25.5)], GUN)
        for i in range(4):
            x = -112 + i * 14
            h.f(rect(x, min(s * 17, s * 24), 11, 7, "#0f1a22", stroke=BSEAM, sw=0.16), mid=True)
            h.f(line(x + 0.6, s * 24.5 if s > 0 else s * 17.5 - 0.5, x + 10.4, s * 24.5 if s > 0 else s * 17.5 - 0.5, stroke=HAZY, sw=0.2, extra='stroke-dasharray="1 1" opacity="0.9"'))
            h.f(poly([(x + 2, s * 20.5), (x + 9, s * 19.3), (x + 9, s * 21.7)], GUN2, stroke=BSEAM, sw=0.1))
        # gun decks on the outer frames
        B.patch(h, [(-100, s * 41), (60, s * 41.5), (59, s * 48), (-101, s * 47.5)], GUN)
        for xx in range(-92, 60, 19): B.gunmount(h, xx, s * 44.5, 2.4)
        B.hazard(h, -116, s * 48 - (1.6 if s > 0 else 0.4), 30, 2.0)
    # furnaces capped
    for xx in (-36, -14, 8, 30): h.f(circ(xx, 0, 6.5, GUN, stroke=BSEAM, sw=0.3), mid=True); h.f(circ(xx, 0, 4.0, DARKG, stroke=BSEAM, sw=0.2)); B.gunmount(h, xx, 0, 2.2, long=False)
    for (x, y) in ((40, -44), (40, 44), (90, -30), (90, 30)): B.gunmount(h, x, y, 2.4)
    B.overpaint(h, -20, 31.2, 40, 3.6)
    B.mark(h, 74, -10, 3.0)
    return h, R


def dirk_refit(militia=True):
    """Vantage Dirk, UDF refit: a second-hand Dirk in Belt paint with Belt guns and a bigger engine."""
    src, R = older.dirk()
    h = rebuild(src, "bel-light", militia)
    B.overpaint(h, -5.6, -0.7, 2.4, 1.4)
    B.patch(h, [(0.5, -1.9), (3.5, -1.6), (3.3, -0.4), (0.3, -0.6)])
    B.gunmount(h, -2.0, -2.5, 0.55); B.gunmount(h, -2.0, 2.5, 0.55)
    B.engine(h, -6.4, 0, 1.3, housing=False)
    B.hazard(h, -3.2, -3.3, 2.4, 0.35); B.hazard(h, -3.2, 2.95, 2.4, 0.35)
    B.mark(h, -4.4, 0, 0.4)
    return h, R


def cutlass_refit(militia=True):
    """Vantage Cutlass, UDF refit: a stolen or surplus Cutlass with more of everything bolted on."""
    src, R = older.cutlass()
    h = rebuild(src, "bel-heavy", militia)
    B.overpaint(h, -7.6, -1.0, 3.0, 2.0)
    B.patch(h, [(1, -2.4), (5, -2.0), (4.6, -0.6), (0.8, -0.9)], GUN)
    B.gunmount(h, -2.6, -4.2, 0.7); B.gunmount(h, -2.6, 4.2, 0.7); B.gunmount(h, 3.0, 0, 0.6, long=False)
    B.engine(h, -8.6, -1.2, 1.1, housing=False); B.engine(h, -8.6, 1.2, 1.1, housing=False)
    B.hazard(h, -5.0, -5.5, 3.0, 0.4); B.hazard(h, -5.0, 5.1, 3.0, 0.4)
    B.mark(h, -6.0, 0, 0.5)
    return h, R


# ------------------------------------------------------------------ the clans

class Clan(Hull):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw); self.stroke = "#000000"

    def vane(self, x, y, L, w, side, ang=25):
        """A red radiator vane, long and thin, canted back: the Vesk's signature."""
        a = math.radians(ang)
        dx, dy = -math.sin(a) * L, side * math.cos(a) * L
        pts = [(x - w / 2, y), (x + w / 2, y), (x + w / 2 + dx, y + dy), (x - w / 2 + dx, y + dy)]
        self.f(poly(pts, VANE, stroke="#000000", sw=0.14), mid=True)
        self.f(line(x, y, x + dx, y + dy, stroke=VANE2, sw=0.12, extra='opacity="0.8"'))

    def cold_engine(self, x_stern, y, hh):
        """A cold-coast engine: shuttered, no glow when drawn at rest."""
        self.f(rect(x_stern - 1.2, y - hh, 3.0, 2 * hh, BLACK2, stroke="#000000", sw=0.18, rx=0.3), mid=True)
        for k in range(3): self.f(line(x_stern - 0.9, y - hh + (k + 0.5) * 2 * hh / 3, x_stern + 1.6, y - hh + (k + 0.5) * 2 * hh / 3, stroke="#2b2e36", sw=0.3))
        self.f(circ(x_stern - 1.0, y, hh * 0.25, VANE2, extra='opacity="0.5"'))

    def facet(self, pts):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, x1 = min(xs), max(xs)
        for i in range(1, 4):
            t = i / 4
            self.f(line(x0 + (x1 - x0) * t, min(ys), x0 + (x1 - x0) * (t + 0.06), max(ys), stroke="#262a33", sw=0.14))


def vane_hull():
    """Vesk Vane, clan corvette, the clans' watcher: black faceted hull, four red vanes, shuttered engines. Cold-coasts better than anything humans build."""
    h = Clan("vesk-vane", u=0.7, cell=3.0)
    top = [(16, -1.6), (12, -3.8), (2, -4.6), (-9, -4.6), (-13, -3.2), (-15, -3.2), (-15, -2.2)]
    pts = sym_pts(top); h.body(pts, "url(#clanHull)", grid=False); h.facet(pts)
    for s in (-1, 1):
        h.vane(-6, s * 4.6, 7, 0.9, s); h.vane(0, s * 4.6, 6, 0.9, s, 35)
        h.cold_engine(-15, s * 1.6, 1.3)
        h.f(circ(-11, s * 3.6, 0.22, "#5a1e18"))
    h.f(poly([(13, -1.3), (9, -2.6), (9, 2.6), (13, 1.3)], "#05070a", stroke="#262a33", sw=0.14), mid=True)
    h.f(line(10.5, -1.6, 10.5, 1.6, stroke=VANE2, sw=0.3, extra='opacity="0.6"'))
    B.gunmount(h, 5, 0, 1.0)
    h.f(poly([(-8, -2.6), (-1, -2.2), (-1.5, 0.6), (-8.5, 0.2)], BLACK2, stroke="#000000", sw=0.2), mid=True)
    h.ymax = 11.5
    return h, 18


def shade_hull():
    """Vesk Shade, clan frigate, the clans' striker: the Vane's shape at twice the length, six vanes, a destroyer's guns on a frigate's frame, shuttered engines."""
    h = Clan("vesk-shade", u=1.0, cell=4.0)
    top = [(34, -2.6), (27, -6.0), (8, -7.5), (-20, -7.5), (-28, -5.5), (-32, -5.5), (-32, -3.8)]
    pts = sym_pts(top); h.body(pts, "url(#clanHull)", grid=False); h.facet(pts)
    for s in (-1, 1):
        for i, xx in enumerate((-18, -8, 2)): h.vane(xx, s * 7.5, 11 - i, 1.2, s, 25 + i * 8)
        for yy in (2.2,): h.cold_engine(-32, s * yy, 1.8)
        B.gunmount(h, 16, s * 4.4, 1.6); B.gunmount(h, -2, s * 5.4, 1.6); B.gunmount(h, -20, s * 5.2, 1.4)
        h.f(circ(-24, s * 6.2, 0.3, "#5a1e18"))
    h.f(poly([(29, -2.0), (23, -4.4), (23, 4.4), (29, 2.0)], "#05070a", stroke="#262a33", sw=0.14), mid=True)
    h.f(line(25.5, -2.6, 25.5, 2.6, stroke=VANE2, sw=0.4, extra='opacity="0.6"'))
    B.gunmount(h, 8, 0, 2.2)
    h.f(poly([(-14, -3.6), (4, -3.0), (3, 1.2), (-15, 0.6)], BLACK2, stroke="#000000", sw=0.2), mid=True)
    h.ymax = 18
    return h, 36


DEFS = ('<linearGradient id="clanHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050609"></stop><stop offset="0.3" stop-color="#121419"></stop>'
        '<stop offset="0.5" stop-color="#1a1d24"></stop><stop offset="0.7" stop-color="#121419"></stop><stop offset="1" stop-color="#050609"></stop></linearGradient>')

NOTES = {
    "uni-general-strike": ["Union General Strike, carrier: a Belt Forge Headframe refitted for war. The eight hoppers plated over into hangars for UDF Dirks and Cutlasses with yellow door sills, the four furnaces capped and turreted, gun decks bolted along both outer frames, every spare mount filled, a cooperative's overpaint across the works. On shift it carries the UDF tag and the fleet beacon; off shift it goes back to hauling ore. When the Belt brings everyone out."],
    "uni-wildcat": ["Union Wildcat, Union pattern over a Kessari Notice: stripped to the frame and re-engined with two Slagline engines where Earth fitted one, a projectile gun on the nose and another amidships, rust and gunmetal patch plates bolted over the old blue, hazard stripes and the Union mark on shift. Toggle Grade for the same hull off shift in cooperative colours."],
    "uni-blockade": ["Union Blockade, Union pattern over a Kessari Writ: the Strikes' captured toll boats. Guns where the door frames were, a truss boom carrying a flak mount, three engines, the toll livery painted out. On shift: stripes and the mark."],
    "uni-boycott": ["Union Boycott, Union pattern over a Kessari Decree: the launchers torn out for guns. A gun deck of four down each flank where the doors were, a mast with a fifth, five engines, patch plate from three cooperatives."],
    "uni-solidarity": ["Union Solidarity, Union pattern over a Statute-generation Earth cruiser captured in the Gate War: rebuilt once, by every cooperative at once, and never copied since. Gun decks on both hulls, a second truss beside the old one, seven engines, patch plate in a dozen cooperatives' colours. Three exist."],
    "bel-light": ["Vantage Dirk, UDF refit: a second-hand Dirk in Belt paint with Belt guns on the stubs, a patch over the old flash, a bigger engine. Redrawn over the Dirk."],
    "bel-heavy": ["Vantage Cutlass, UDF refit: a stolen or surplus Cutlass with more of everything bolted on: three guns, two engines, patch plate. Redrawn over the Cutlass."],
    "vesk-vane": ["Vesk Vane, clan corvette, the clans' watcher: a black faceted hull with four long red radiator vanes canted back, shuttered cold-coast engines with no glow at rest, a dark slit of a bridge, one gun. Cold-coasts better than anything humans build."],
    "vesk-shade": ["Vesk Shade, clan frigate, the clans' striker: the Vane's shape at twice the length, six vanes, a destroyer's guns on a frigate's frame (seven mounts), shuttered engines. A stealth raider with a destroyer's teeth; burns in, because the clans have no drives."],
}




# ------------------------------------------------------------------ Rook and Rivet

def grab():
    """Rook and Rivet Grab, salvage subcraft: a cab on an open frame, a big hydraulic claw forward on a boom, a cutting torch beside it, a net frame aft. Patch plate, hazard paint, no guns."""
    h = Hull("rr-grab", u=0.45, cell=2.0)
    h.stroke = BSEAM
    # the frame: an open girder chassis
    B.truss(h, -7.0, 3.0, -2.6, -1.4, 2.0); B.truss(h, -7.0, 3.0, 1.4, 2.6, 2.0)
    for xx in (-6.5, -1.5, 2.5): h.f(rect(xx - 0.3, -2.6, 0.6, 5.2, GUN2, stroke=BSEAM, sw=0.12), mid=True)
    # the cab: a rounded box with a big window, patched
    h.body(cham(-1.5, -2.2, 5.0, 4.4, 0.8), GUN)
    h.f(rect(1.6, -1.4, 1.6, 2.8, "#0f2a3a", stroke=BSEAM, sw=0.14, rx=0.3), mid=True)
    B.patch(h, [(-1.2, 0.4), (1.2, 0.6), (1.0, 2.0), (-1.4, 1.8)])
    # the boom and claw
    h.f(rect(3.4, -0.4, 4.0, 0.8, GUN2, stroke=BSEAM, sw=0.14), mid=True)
    h.f(circ(7.6, 0, 0.7, DARKG, stroke=BSEAM, sw=0.14), mid=True)
    for s in (-1, 1):
        h.f(f'<path d="M 7.6 {s * 0.4:.2f} Q 9.6 {s * 2.6:.2f} 11.2 {s * 1.2:.2f}" fill="none" stroke="{GUN2}" stroke-width="0.6" stroke-linecap="round"></path>')
        h.f(f'<path d="M 7.6 {s * 0.4:.2f} Q 9.6 {s * 2.6:.2f} 11.2 {s * 1.2:.2f}" fill="none" stroke="{BSEAM}" stroke-width="0.14" stroke-linecap="round"></path>')
        h.f(circ(11.2, s * 1.2, 0.3, HAZY if s > 0 else HAZY))
    # the torch, on a short arm to port
    h.f(rect(3.0, -3.2, 2.6, 0.5, GUN2, stroke=BSEAM, sw=0.12), mid=True); h.f(circ(5.8, -2.95, 0.35, "#ffb060")); h.f(circ(5.8, -2.95, 0.8, "#ffb060", extra='opacity="0.3" filter="url(#glowSoft)"'))
    # the net frame aft: a hoop with cross lines
    h.f(rect(-7.2, -3.2, 1.0, 6.4, GUN2, stroke=BSEAM, sw=0.14, rx=0.3), mid=True)
    for yy in (-2.2, -1.1, 0, 1.1, 2.2): h.f(line(-7.0, yy, -3.0, yy, stroke="#3b3f45", sw=0.1, extra='opacity="0.8"'))
    for xx in (-6.0, -5.0, -4.0): h.f(line(xx, -2.6, xx, 2.6, stroke="#3b3f45", sw=0.1, extra='opacity="0.8"'))
    # thrusters at the frame corners
    for s in (-1, 1):
        B.engine(h, -7.4, s * 3.6, 0.6, housing=False)
    B.hazard(h, -0.8, -2.5, 3.2, 0.35); B.hazard(h, -0.8, 2.15, 3.2, 0.35)
    B.nav(h, (-6.8, -3.9), (-6.8, 3.9))
    h.f(f'<text x="0.8" y="{-0.2:.2f}" font-family="IBM Plex Mono, monospace" font-size="0.7" fill="{HAZY}" opacity="0.8" text-anchor="middle">R+R</text>')
    h.ymax = 4.5
    return h, 12.5


NOTES["rr-grab"] = ["Rook and Rivet Grab, salvage subcraft: a patched cab on an open girder frame, a big hydraulic claw on a boom forward, a cutting torch on a short arm beside it, a net frame aft for the pieces, corner thrusters, hazard paint. Salvage mounts only; nothing that can fight."]


def all_art():
    syms, meta = [], {}
    for fn in (wildcat, blockade, boycott, solidarity, general_strike, dirk_refit, cutlass_refit):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
        hc, _ = fn(militia=False); syms.append(hc.symbols(R)); meta[h.key]["civ"] = True
    for fn in (vane_hull, shade_hull, grab):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return DEFS, "".join(syms), meta
