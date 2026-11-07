"""Civil yards, pass one: Tessaract Logistics (Earth) and Arcadia Works (Mars), production and legacy marks.

Tessaract: white hulls, a teal band, black stencils like shipping paperwork,
Earth's chamfers and clean seams, a spine with container bays, a forward cab
with a window strip, engines in a frame aft. Legacy marks: fewer bays, a
square cab, the white gone grey, patches.

Arcadia: bone over rust, slab plates with bolt lines, Mk numbers stencilled
large, armoured cargo bays with doors instead of open containers, a conning
slit, engines in a skirt. Legacy marks: cruder plates, older Mk, more patches.
Nose points +x.
"""
import math
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, P, clamp, fade, INK, WHITE, RED, GREEN, SHADOW, GLASS
from mars import Mars, RUST1, RUST2, RUST3, BONE, BONE2, SEAM as MSEAM, DARK as MDARK

# Tessaract palette
TW0 = "#9ea7ad"; TW1 = "#d5dade"; TW2 = "#e9ecef"; TW3 = "#f6f7f8"; TEAL = "#1f8a8a"; TEAL2 = "#2fb3b0"; TSEAM = "#2b3338"; TINK = "#1a1f23"
TGREY = "#b8bfc4"; TOLD = "#c9ccc9"; TPATCH = "#a9b0b5"
CONT = ["#1f8a8a", "#e9ecef", "#8a9299", "#d9a441", "#4b5c6b"]
# Arcadia palette
AB0 = "#8f846b"; AB1 = "#bfb193"; AB2 = "#cfc3a6"; AB3 = "#ddd3bb"; ARUST = "#8a3a2a"; ASEAM = "#2a1f18"; AOLD = "#a89c82"


class Civil(Hull):
    def __init__(self, key, u, cell, old=False, yard="tes"):
        super().__init__(key, u, cell)
        self.old = old; self.yard = yard
        self.stroke = TSEAM if yard == "tes" else ASEAM

    # ---- shared
    def nav(self, xy_r, xy_g):
        (rx, ry), (gx, gy) = xy_r, xy_g
        self.f(circ(rx, ry, 0.36 * self.u, RED)); self.f(circ(gx, gy, 0.36 * self.u, GREEN))

    def stencil(self, x, y, text, fs, col):
        self.f(f'<text x="{x:.2f}" y="{y:.2f}" font-family="IBM Plex Mono, monospace" font-size="{fs:.2f}" fill="{col}" opacity="0.85" text-anchor="middle" letter-spacing="0.12">{text}</text>')

    def patch(self, pts, col):
        self.f(poly(pts, col, stroke=self.stroke, sw=0.2), mid=True)

    def pdc(self, x, y):
        g = self.u
        self.f(rect(x - g, y - g, 2 * g, 2 * g, "#3a444c", stroke=self.stroke, sw=0.14, rx=0.2))
        self.f(circ(x, y, g * 0.65, "#8a97a2", stroke="#dfe6ea", sw=0.12), mid=True)
        self.f(rect(x + g * 0.2, y - g * 0.1, g * 1.3, g * 0.2, "#dfe6ea", stroke="none", sw=0))

    # ---- Tessaract parts
    def t_body(self, pts):
        self.body(pts, "url(#tesHull)" if not self.old else "url(#tesOld)")

    def t_band(self, x, hw, w=None):
        w = w or clamp(self.u * 1.6, 0.8, 3.0)
        self.f(rect(x - w / 2, -hw, w, 2 * hw, TEAL if not self.old else fade(TEAL, 0.2), stroke=TSEAM, sw=0.12), mid=True)

    def t_cab(self, x_nose, half, depth):
        """The forward cab: a chamfered block with a window strip across the front, Earth's visor in civilian form."""
        u = self.u
        self.module(cham(x_nose - depth, -half, depth, 2 * half, 0.9 * u), TW1 if not self.old else TOLD, hatches=False)
        if self.old:
            self.f(rect(x_nose - depth * 0.45, -half * 0.5, depth * 0.3, half, "#0f2a3a", stroke=TSEAM, sw=0.12), mid=True)
        else:
            self.f(poly([(x_nose - depth * 0.3, -half * 0.75), (x_nose - depth * 0.62, -half * 0.75), (x_nose - depth * 0.62, half * 0.75), (x_nose - depth * 0.3, half * 0.75)], "#0f2a3a", stroke=TSEAM, sw=0.14), mid=True)
            self.f(line(x_nose - depth * 0.46, -half * 0.6, x_nose - depth * 0.46, half * 0.6, stroke=TEAL2, sw=0.18, extra='opacity="0.7"'))

    def t_spine(self, x0, x1, hw, yc=0):
        self.f(rect(x0, yc - hw, x1 - x0, 2 * hw, TW0, stroke=TSEAM, sw=0.16), mid=True)
        for s in (-1, 1): self.f(line(x0, yc + s * hw * 0.5, x1, yc + s * hw * 0.5, stroke="#7f8a91", sw=0.1))

    def t_bays(self, x0, x1, yc, n, hh, rows=1, lane=None, missing=()):
        """Container bays along the spine: open frames holding standard containers; legacy marks have some missing."""
        gap = (x1 - x0) / n; w = gap * 0.8
        k = 0
        for r in range(rows):
            y = yc if rows == 1 else yc + (r - (rows - 1) / 2) * (lane or (hh + 0.6))
            for i in range(n):
                x = x0 + gap * i + (gap - w) / 2
                self.f(rect(x - 0.3, y - hh / 2 - 0.3, w + 0.6, hh + 0.6, TW0, stroke=TSEAM, sw=0.14), mid=True)
                if (r, i) in missing:
                    self.f(rect(x, y - hh / 2, w, hh, "#1a2328", stroke=TSEAM, sw=0.1)); k += 1; continue
                col = CONT[k % len(CONT)] if not self.old else fade(CONT[k % len(CONT)], 0.15)
                self.f(rect(x, y - hh / 2, w, hh, col, stroke=TSEAM, sw=0.14, rx=0.2), mid=True)
                for t in (0.33, 0.66): self.f(line(x + w * t, y - hh / 2 + 0.2, x + w * t, y + hh / 2 - 0.2, stroke=TSEAM, sw=0.08, extra='opacity="0.6"'))
                k += 1

    def t_engines(self, x_stern, ys, hh):
        u = self.u
        self.f(rect(x_stern - 0.6, min(ys) - hh * 1.1, 3.0 * u, max(ys) - min(ys) + hh * 2.2, TW0, stroke=TSEAM, sw=0.16, rx=0.4), mid=True)
        for ey in ys:
            self.full.insert(0, ell(x_stern - hh * 1.1, ey, hh * 1.3, hh * 0.6, "#9fe3ff", 'opacity="0.4" filter="url(#glowSoft)"'))
            self.mid.insert(0, ell(x_stern - hh * 1.1, ey, hh * 1.3, hh * 0.6, "#9fe3ff", 'opacity="0.4" filter="url(#glowSoft)"'))
            bell = [(x_stern + 2.0 * u, ey - hh * 0.5), (x_stern - 1.6 * u, ey - hh * 0.72), (x_stern - 1.6 * u, ey + hh * 0.72), (x_stern + 2.0 * u, ey + hh * 0.5)]
            self.f(poly(bell, "#6b7a86", stroke=TSEAM, sw=0.14), mid=True)
            self.f(ell(x_stern - 1.5 * u, ey, 0.55 * u, hh * 0.55, "#060a0f")); self.f(ell(x_stern - 1.5 * u, ey, 0.32 * u, hh * 0.38, "#9fe3ff", 'opacity="0.9"'))

    def t_windows(self, x0, x1, y, n, hh):
        gap = (x1 - x0) / n
        for i in range(n):
            self.f(rect(x0 + gap * i + gap * 0.2, y - hh / 2, gap * 0.6, hh, "#0f2a3a", stroke=TSEAM, sw=0.1, rx=0.15), mid=True)
            self.f(line(x0 + gap * i + gap * 0.25, y - hh * 0.2, x0 + gap * i + gap * 0.5, y - hh * 0.3, stroke=TEAL2, sw=0.08, extra='opacity="0.6"'))

    def t_tank(self, x, y, L, r):
        self.f(rect(x + 0.3, y - r + 0.3, L, 2 * r, SHADOW, stroke="none", sw=0, rx=r))
        self.f(rect(x, y - r, L, 2 * r, TW2 if not self.old else TOLD, stroke=TSEAM, sw=0.18, rx=r), mid=True)
        self.f(line(x + r, y - r * 0.5, x + L - r, y - r * 0.5, stroke=TW3, sw=0.2, extra='opacity="0.8"'))
        self.f(rect(x + L * 0.42, y - r - 0.3, L * 0.16, 2 * r + 0.6, TEAL if not self.old else fade(TEAL, 0.2), stroke=TSEAM, sw=0.1))
        for k in (0.2, 0.8): self.f(line(x + L * k, y - r, x + L * k, y + r, stroke=TSEAM, sw=0.12))

    def t_livery(self, stencil_xy, text, fs, nav_xy):
        self.stencil(stencil_xy[0], stencil_xy[1], text, fs, TINK if not self.old else "#4a5257")
        self.nav(*nav_xy)
        if self.old:
            u = self.u
            self.patch(cham(stencil_xy[0] - 6 * u, stencil_xy[1] + 1.5 * u, 4 * u, 2.2 * u, 0.3 * u), TPATCH)

    # ---- Arcadia parts
    def a_body(self, pts):
        self.body(pts, "url(#arcHull)" if not self.old else "url(#arcOld)")

    def a_plate(self, pts, fill=None, bolts=True):
        Mars.plate(self, pts, fill or (AB1 if not self.old else AOLD), bolts)

    def a_slit(self, x, hw):
        Mars.slit(self, x, hw)

    def a_skirt(self, x_stern, hw, depth):
        self.f(poly([(x_stern + depth, -hw), (x_stern, -hw * 0.82), (x_stern, hw * 0.82), (x_stern + depth, hw)], AB0, stroke=ASEAM, sw=0.22), mid=True)
        self.f(line(x_stern + 0.4, -hw * 0.78, x_stern + 0.4, hw * 0.78, stroke=ARUST, sw=0.25))

    def a_engines(self, x_stern, ys, hh):
        Mars.marsengines(self, x_stern, ys, hh)

    def a_bay(self, x, y, w, hh):
        """An armoured cargo bay with a door: Mars does not leave containers in the open."""
        self.f(rect(x, y, w, hh, AB0, stroke=ASEAM, sw=0.16), mid=True)
        self.f(rect(x + 0.3, y + 0.3, w - 0.6, hh - 0.6, AB2 if not self.old else AOLD, stroke=ASEAM, sw=0.12), mid=True)
        self.f(line(x + w / 2, y + 0.4, x + w / 2, y + hh - 0.4, stroke=ASEAM, sw=0.12))
        self.f(rect(x + w * 0.1, y + hh * 0.42, w * 0.8, hh * 0.16, ARUST, stroke="none", sw=0, extra='opacity="0.8"'))

    def a_bays(self, x0, x1, yc, n, hh):
        gap = (x1 - x0) / n; w = gap * 0.84
        for i in range(n): self.a_bay(x0 + gap * i + (gap - w) / 2, yc - hh / 2, w, hh)

    def a_chevrons(self, x0, x1, y, n, s):
        for i in range(n):
            x = x0 + (x1 - x0) * i / max(n - 1, 1)
            self.f(f'<polyline points="{x - 0.8:.2f},{y - s * 0.6:.2f} {x + 0.4:.2f},{y:.2f} {x - 0.8:.2f},{y + s * 0.6:.2f}" fill="none" stroke="{ARUST}" stroke-width="0.3" stroke-linejoin="round"></polyline>')

    def a_ice(self, x0, x1, yc, n, hh):
        """An open cradle of ice slabs: the ice hauler's load."""
        self.f(rect(x0 - 0.4, yc - hh / 2 - 0.4, x1 - x0 + 0.8, hh + 0.8, AB0, stroke=ASEAM, sw=0.16), mid=True)
        gap = (x1 - x0) / n
        for i in range(n):
            x = x0 + gap * i + 0.2
            self.f(rect(x, yc - hh / 2 + 0.2, gap - 0.4, hh - 0.4, "#cfe7ee", stroke="#7fb0bd", sw=0.12, rx=0.3), mid=True)
            self.f(line(x + 0.4, yc - hh * 0.2, x + gap - 0.8, yc - hh * 0.35, stroke="#ffffff", sw=0.14, extra='opacity="0.7"'))

    def a_windows(self, x0, x1, y, n, hh):
        gap = (x1 - x0) / n
        for i in range(n): self.f(rect(x0 + gap * i + gap * 0.25, y - hh / 2, gap * 0.5, hh, "#120a07", stroke=ASEAM, sw=0.1), mid=True)

    def a_livery(self, stencil_xy, text, fs, nav_xy):
        self.stencil(stencil_xy[0], stencil_xy[1], text, fs, ARUST)
        self.nav(*nav_xy)
        if self.old:
            u = self.u
            self.a_plate(cham(stencil_xy[0] + 3 * u, stencil_xy[1] + 1.2 * u, 4 * u, 2.4 * u, 0.4 * u), "#7a6f5a", bolts=False)


# ------------------------------------------------------------------ Tessaract

def tes_docket(old=False):
    """Courier: a small chamfered wedge-free body, one belly container, the teal band, a wide cab. Earth's courier, softer than a Tern."""
    key = "tes-memo" if old else "tes-docket"
    h = Civil(key, 0.7, 3.0, old)
    h.t_body(sym_pts([(16, -2.2), (13, -4.4), (-8, -5.0), (-13, -4.0), (-15, -2.6)]))
    h.t_spine(-12, 2, 0.6)
    h.t_bays(-11, 1, 0, 2 if not old else 1, 3.4)
    h.t_cab(16, 3.2, 7)
    h.t_band(5, 4.6)
    h.t_engines(-15, [-1.6, 1.6], 1.4)
    h.t_livery((-5, -5.6), "MEMO" if old else "DOCKET", 1.0, ((-9, -5.3), (-9, 5.3)))
    return h, 17.5


def tes_waybill(old=False):
    """Hauler: cab, spine, two bays of two containers, two engines. The workhorse of a trade triangle."""
    key = "tes-invoice" if old else "tes-waybill"
    h = Civil(key, 0.9, 3.6, old)
    h.t_body(sym_pts([(24, -3.0), (20, -6.5), (-16, -6.5), (-21, -5.2), (-24, -3.6)]))
    h.t_spine(-20, 12, 0.9)
    h.t_bays(-19, 11, -4.0, 4 if not old else 3, 3.8, missing=() if not old else {(0, 1)})
    h.t_bays(-19, 11, 4.0, 4 if not old else 3, 3.8)
    h.t_cab(24, 4.6, 9)
    h.t_band(13.5, 6.4)
    h.t_engines(-24, [-2.6, 2.6], 1.9)
    h.weapon("w1", "high", "S", 10, 0); h.weapon("w2", "high", "S", -10, 0, math.pi)
    h.t_livery((-4, 0.5), "INVOICE" if old else "WAYBILL", 1.1, ((-14, -6.8), (-14, 6.8)))
    return h, 26


def tes_manifest(old=False):
    """Freighter, six bays: a long spine with six container bays in two rows, the cab forward, three engines in a frame. On half the contracts in Accord space."""
    key = "tes-ledger" if old else "tessaract-spine"
    h = Civil(key, 1.0, 4.0, old)
    h.t_body(sym_pts([(40, -4.0), (34, -9.0), (28, -9.0), (28, -5.5), (-30, -5.5), (-36, -7.5), (-40, -5.0)]))
    h.t_spine(-34, 26, 1.2)
    n = 6 if not old else 4
    h.t_bays(-33, 25, -7.4, n, 5.4, missing=() if not old else {(0, 2)})
    h.t_bays(-33, 25, 7.4, n, 5.4)
    h.t_cab(40, 6.5, 12)
    h.t_band(29.5, 9.0)
    h.t_engines(-40, [-3.6, 0, 3.6], 2.2)
    h.weapon("w1", "high", "S", 35, 0); h.weapon("w2", "high", "S", 22, -3.0)
    h.weapon("d1", "ciws", "M", 32, -7.6, -math.pi / 2); h.weapon("d2", "ciws", "M", 32, 7.6, math.pi / 2)
    h.t_livery((-4, 0.6), "LEDGER" if old else "MANIFEST", 1.3, ((-30, -10.4), (-30, 10.4)))
    h.ymax = 11
    return h, 42


def tes_lading(old=False):
    """Bulk freighter: a wide body with three rows of bays, twelve containers, PDC mounts, four engines. Slow, deep, and a pirate's dream if it is alone."""
    key = "tes-bill" if old else "tes-lading"
    h = Civil(key, 1.3, 4.8, old)
    h.t_body(sym_pts([(60, -7), (52, -15), (44, -17), (-48, -17), (-56, -13), (-60, -9)]))
    h.t_spine(-52, 40, 1.4)
    n = 4 if not old else 3
    for yc in (-11.5, 0, 11.5):
        h.t_bays(-50, 38, yc, n, 7.0, missing=() if not old else {(0, 1)} if yc == 0 else ())
    h.t_cab(60, 9.5, 16)
    h.t_band(43, 15.5)
    h.t_engines(-60, [-7.5, -2.5, 2.5, 7.5], 2.6)
    for (x, y) in ((48, -12), (48, 12), (-44, -14.5), (-44, 14.5)): h.pdc(x, y)
    h.t_livery((0, -17.8 - 0.4), "BILL" if old else "LADING", 1.8, ((-46, -17.6), (-46, 17.6)))
    return h, 62


def tes_consignment():
    """Superfreighter, the convoy command ship: two spines, twenty-four containers, a command block with the fleet beacon, PDCs all round, six engines. Never travels without escort."""
    h = Civil("tes-consignment", 1.8, 6.4)
    h.t_body(sym_pts([(110, -12), (98, -24), (86, -28), (-90, -28), (-104, -20), (-110, -14)]))
    for yc in (-14, 14):
        h.t_spine(-96, 70, 1.6, yc)
        h.t_bays(-94, 68, yc, 6, 9.0, rows=2, lane=10.5)
    h.module(cham(-20, -6, 50, 12, 2.0), TW1, hatches=False); h.module(cham(-14, -3.5, 26, 7, 1.4), TW3, hatches=False)
    h.f(circ(0, 0, 3.2, "#0f2a3a", stroke=TSEAM, sw=0.2), mid=True); h.f(circ(0, 0, 1.2, TEAL2)); h.f(circ(0, 0, 5, TEAL2, extra='opacity="0.2" filter="url(#glowSoft)"'))
    h.t_cab(110, 14, 26)
    h.t_band(84, 27)
    h.t_engines(-110, [-15, -9, -3, 3, 9, 15], 3.2)
    for (x, y) in ((90, -22), (90, 22), (30, -29), (30, 29), (-40, -29), (-40, 29), (-96, -22), (-96, 22)): h.pdc(x, y)
    h.t_livery((40, 1.0), "CONSIGNMENT", 2.6, ((-88, -28.6), (-88, 28.6)))
    return h, 114


def tes_tariff():
    """Tanker: a spine with four cylindrical tanks in cradles, the cab forward, three engines. Liquid and gas bulk for Earth."""
    h = Civil("tes-tariff", 1.3, 4.8)
    h.t_body(sym_pts([(52, -5), (46, -11), (40, -11), (40, -6), (-40, -6), (-48, -9), (-52, -6)]))
    h.t_spine(-46, 38, 1.4)
    for i, x in enumerate((-44, -22, 0, 20)):
        h.t_tank(x, -9.5, 20, 4.0); h.t_tank(x, 9.5, 20, 4.0)
    h.t_cab(52, 7.5, 13)
    h.t_band(41, 11)
    h.t_engines(-52, [-4.5, 0, 4.5], 2.4)
    h.pdc(44, -9); h.pdc(44, 9)
    h.t_livery((-2, 0.6), "TARIFF", 1.5, ((-40, -14), (-40, 14)))
    h.ymax = 14
    return h, 54


def tes_timetable(old=False):
    """Ferry: a rounded chamfered body with two rows of windows, no containers, the band aft, two engines. Earth's ferry."""
    key = "tes-almanac" if old else "tes-timetable"
    h = Civil(key, 1.0, 4.0, old)
    h.t_body(sym_pts([(28, -4.5), (22, -9.0), (-20, -9.0), (-26, -7.0), (-28, -5.0)]))
    h.module(cham(-22, -6.0, 40, 12, 1.6), TW2 if not old else TOLD, hatches=False)
    h.t_windows(-20, 16, -4.0, 9 if not old else 7, 1.6); h.t_windows(-20, 16, 4.0, 9 if not old else 7, 1.6)
    h.t_cab(28, 6.5, 10)
    h.t_band(-23, 7.5)
    h.t_engines(-28, [-3.0, 3.0], 2.0)
    h.t_livery((0, 0.6), "ALMANAC" if old else "TIMETABLE", 1.3, ((-18, -9.3), (-18, 9.3)))
    return h, 30


def tes_itinerary():
    """Heavy bus, short-route liner: longer, two decks of windows, a lounge strip amidships, three engines. The Marches run: a hundred seats and a bar."""
    h = Civil("tes-itinerary", 1.2, 4.4)
    h.t_body(sym_pts([(44, -6), (36, -12), (-32, -12), (-40, -9), (-44, -6)]))
    h.module(cham(-34, -8.5, 66, 17, 2.0), TW2, hatches=False)
    for y in (-6.0, -2.2, 2.2, 6.0): h.t_windows(-32, 28, y, 14, 1.5)
    h.f(rect(-6, -1.0, 20, 2.0, "#0f2a3a", stroke=TSEAM, sw=0.12, rx=0.4), mid=True)
    h.t_cab(44, 8.5, 12)
    h.t_band(-35, 10)
    h.t_engines(-44, [-4.5, 0, 4.5], 2.4)
    h.t_livery((8, 0.6), "ITINERARY", 1.5, ((-30, -12.3), (-30, 12.3)))
    return h, 46


def tes_passage():
    """Liner: long and elegant, three decks of windows, a glazed promenade down the spine, PDCs because it is a tempting target, four engines."""
    h = Civil("tes-passage", 1.6, 5.2)
    h.t_body(sym_pts([(80, -8), (68, -18), (-60, -18), (-72, -13), (-80, -9)]))
    h.module(cham(-64, -13.5, 128, 27, 3.0), TW2, hatches=False)
    for y in (-10.5, -6.5, 6.5, 10.5): h.t_windows(-60, 56, y, 22, 1.8)
    h.f(rect(-50, -3.0, 100, 6.0, "#0f2a3a", stroke=TSEAM, sw=0.16, rx=1.0), mid=True)
    for xx in range(-44, 50, 8): h.f(line(xx, -2.6, xx, 2.6, stroke=TEAL2, sw=0.1, extra='opacity="0.6"'))
    h.t_cab(80, 11, 18)
    h.t_band(-66, 15)
    h.t_engines(-80, [-9, -3, 3, 9], 2.8)
    for (x, y) in ((60, -15), (60, 15), (-56, -17), (-56, 17)): h.pdc(x, y)
    h.t_livery((10, -14.5), "PASSAGE", 2.2, ((-58, -18.4), (-58, 18.4)))
    return h, 84


# ------------------------------------------------------------------ Arcadia

def arc_shuttle(old=False):
    """Shuttle Mk III: a bone box with a slit, a row of windows, one engine in a skirt. Seats and straps."""
    key = "arc-shuttle-mk2" if old else "arc-shuttle"
    h = Civil(key, 0.7, 3.0, old, "arc")
    h.a_body(sym_pts([(12, -3.4), (10, -4.6), (-9, -4.6), (-11, -3.6), (-12, -2.6)]))
    h.a_plate([(8, -3.8), (-7, -3.8), (-7, -1.2), (8, -1.2)]); h.a_plate([(8, 1.2), (-7, 1.2), (-7, 3.8), (8, 3.8)])
    h.a_windows(-6, 6, -2.5, 5, 1.2); h.a_windows(-6, 6, 2.5, 5, 1.2)
    h.a_skirt(-12, 3.2, 1.8); h.a_engines(-12, [0], 1.8)
    h.a_slit(8.5, 1.4)
    h.a_livery((0, 0.5), "MK II" if old else "MK III", 1.0, ((-8, -4.9), (-8, 4.9)))
    return h, 13.5


def arc_courier(old=False):
    """Courier Mk IV: a brick that is faster than it looks. Slab plates, one armoured bay, two engines."""
    key = "arc-courier-mk3" if old else "arc-courier"
    h = Civil(key, 0.7, 3.0, old, "arc")
    h.a_body(sym_pts([(15, -3.0), (13, -5.0), (-11, -5.0), (-14, -4.0), (-15, -3.0)]))
    h.a_plate([(11, -4.4), (-9, -4.4), (-10, -1.6), (10, -1.6)]); h.a_plate([(11, 4.4), (-9, 4.4), (-10, 1.6), (10, 1.6)])
    h.a_bay(-8, -1.3, 12, 2.6)
    h.a_skirt(-15, 3.8, 2.0); h.a_engines(-15, [-1.8, 1.8], 1.5)
    h.a_slit(11.5, 1.5)
    h.a_chevrons(-2, 6, -4.8, 3, -1)
    h.a_livery((1, -5.6), "MK III" if old else "MK IV", 1.0, ((-10, -5.3), (-10, 5.3)))
    return h, 16.5


def arc_hauler(old=False):
    """Hauler Mk III: a slab-sided box with three armoured bays a side, the slit, two engines in a skirt. Every Martian colony has a hangar full of them."""
    key = "arc-hauler-mk2" if old else "arc-hauler"
    h = Civil(key, 0.9, 3.6, old, "arc")
    h.a_body(sym_pts([(24, -4.5), (21, -7.5), (-18, -7.5), (-22, -6.0), (-24, -4.5)]))
    h.a_plate([(18, -6.8), (-16, -6.8), (-16, -2.0), (18, -2.0)], bolts=not old); h.a_plate([(18, 6.8), (-16, 6.8), (-16, 2.0), (18, 2.0)], bolts=not old)
    h.a_bays(-15, 16, -4.4, 3 if not old else 2, 3.4); h.a_bays(-15, 16, 4.4, 3 if not old else 2, 3.4)
    h.a_skirt(-24, 5.8, 2.6); h.a_engines(-24, [-2.6, 2.6], 1.9)
    h.a_slit(20, 2.4)
    h.a_livery((2, 0.6), "MK II" if old else "MK III", 1.3, ((-16, -7.8), (-16, 7.8)))
    return h, 26


def arc_freighter(old=False):
    """Freighter Mk II: armoured where a Tessaract hull is roomy. Four bays a side behind plate, a central spine of plate, three engines."""
    key = "arc-freighter-mk1" if old else "arc-freighter"
    h = Civil(key, 1.1, 4.4, old, "arc")
    h.a_body(sym_pts([(40, -6), (35, -11), (-32, -11), (-37, -9), (-40, -6)]))
    h.a_plate([(32, -10.2), (-30, -10.2), (-30, -3.0), (32, -3.0)], bolts=not old); h.a_plate([(32, 10.2), (-30, 10.2), (-30, 3.0), (32, 3.0)], bolts=not old)
    h.a_plate(cham(-28, -2.4, 58, 4.8, 0.8), AB0, bolts=False)
    n = 4 if not old else 3
    h.a_bays(-28, 30, -6.6, n, 5.0); h.a_bays(-28, 30, 6.6, n, 5.0)
    h.a_skirt(-40, 9, 3.6); h.a_engines(-40, [-4.2, 0, 4.2], 2.2)
    h.a_slit(34, 3.6)
    h.a_chevrons(-24, 20, -11.3, 6, -1)
    h.a_livery((2, 0.8), "MK I" if old else "MK II", 1.6, ((-30, -11.3), (-30, 11.3)))
    return h, 42


def arc_ice(old=False):
    """Ice Hauler Mk II: an open cradle of ice slabs between two armoured runners, the cab forward, three engines. Polar ice to the Martian cities."""
    key = "arc-ice-mk1" if old else "arc-ice"
    h = Civil(key, 1.3, 4.8, old, "arc")
    h.a_body(sym_pts([(52, -6), (46, -12), (40, -12), (40, -4), (-44, -4), (-48, -8), (-52, -6)]))
    for s in (-1, 1):
        h.a_plate([(38, s * 10), (-42, s * 10), (-42, s * 13.5), (38, s * 13.5)], bolts=not old)
    for xx in (-36, -4, 28):
        for s in (-1, 1): h.f(rect(xx - 1.2, min(s * 4, s * 10), 2.4, 6, AB0, stroke=ASEAM, sw=0.14), mid=True)
    h.a_ice(-40, 36, 0, 6 if not old else 5, 18)
    h.a_skirt(-52, 10, 4); h.a_engines(-52, [-6, 0, 6], 2.4)
    h.a_slit(46, 4.5)
    h.a_livery((44, -13.5 + 0.4), "MK I" if old else "MK II", 1.6, ((-42, -14), (-42, 14)))
    return h, 54


def arc_bulk():
    """Bulk Freighter Mk I: a huge armoured box, six bays a side under plate, four engines. New, and already looks twenty years old."""
    h = Civil("arc-bulk", 1.5, 5.2, False, "arc")
    h.a_body(sym_pts([(62, -9), (54, -17), (-50, -17), (-58, -13), (-62, -9)]))
    for s in (-1, 1):
        h.a_plate([(50, s * 16), (-46, s * 16), (-46, s * 4), (50, s * 4)])
        h.a_bays(-44, 48, s * 10, 6, 7.0)
    h.a_plate(cham(-44, -3.2, 90, 6.4, 1.0), AB0, bolts=False)
    h.a_skirt(-62, 14, 5); h.a_engines(-62, [-9, -3, 3, 9], 2.8)
    h.a_slit(54, 5.5)
    h.a_chevrons(-40, 40, -17.4, 8, -1)
    for (x, y) in ((52, -12), (52, 12)): h.pdc(x, y)
    h.a_livery((2, 1.0), "MK I", 2.2, ((-48, -17.4), (-48, 17.4)))
    return h, 64


def arc_ferry():
    """Ferry Mk II: a slab box of seats, windows in armoured frames, the slit, two engines. A schedule kept to the second."""
    h = Civil("arc-ferry", 1.0, 4.0, False, "arc")
    h.a_body(sym_pts([(28, -5), (24, -8.5), (-22, -8.5), (-26, -7), (-28, -5)]))
    h.a_plate([(22, -7.8), (-20, -7.8), (-20, -1.5), (22, -1.5)]); h.a_plate([(22, 7.8), (-20, 7.8), (-20, 1.5), (22, 1.5)])
    h.a_windows(-18, 18, -4.6, 9, 1.8); h.a_windows(-18, 18, 4.6, 9, 1.8)
    h.a_skirt(-28, 6.8, 3); h.a_engines(-28, [-3, 3], 2.0)
    h.a_slit(24, 2.8)
    h.a_livery((0, 0.6), "MK II", 1.3, ((-20, -8.8), (-20, 8.8)))
    return h, 30


def arc_tug():
    """Tug Mk II: a short armoured block with a big pushing plate forward and two outsized engines. Every Martian port has a dozen."""
    h = Civil("arc-tug", 0.9, 3.6, False, "arc")
    h.a_body(sym_pts([(10, -5), (8, -6.5), (-10, -6.5), (-12, -5), (-12, -3.5)]))
    h.f(rect(10, -8.5, 3.0, 17, AB0, stroke=ASEAM, sw=0.2, rx=0.4), mid=True)
    for yy in (-6, -2, 2, 6): h.f(rect(10.4, yy - 0.5, 2.2, 1.0, ARUST, stroke="none", sw=0))
    h.a_plate([(7, -5.8), (-8, -5.8), (-8, -1.5), (7, -1.5)]); h.a_plate([(7, 5.8), (-8, 5.8), (-8, 1.5), (7, 1.5)])
    h.a_skirt(-12, 6.5, 3); h.a_engines(-12, [-3.2, 3.2], 2.8)
    h.a_slit(5, 1.4)
    h.a_livery((-1, 0.6), "MK II", 1.1, ((-8, -6.8), (-8, 6.8)))
    return h, 15


def arc_tender():
    """Tender Mk I: a repair hull with two crane arms, a parts bay, a workshop block, three engines. The one Martian civilian hull with a navy pattern."""
    h = Civil("arc-tender", 1.1, 4.4, False, "arc")
    h.a_body(sym_pts([(34, -6), (30, -10), (-28, -10), (-32, -8), (-34, -6)]))
    h.a_plate([(26, -9.2), (-24, -9.2), (-24, -3), (26, -3)]); h.a_plate([(26, 9.2), (-24, 9.2), (-24, 3), (26, 3)])
    h.a_bays(-22, 2, -6.2, 2, 4.6); h.a_bays(-22, 2, 6.2, 2, 4.6)
    h.module(cham(6, -5, 18, 10, 1.2), AB1, hatches=False)
    for s in (-1, 1):
        h.f(rect(8, s * 10.5 - 0.6, 14, 1.2, AB0, stroke=ASEAM, sw=0.14, rx=0.4), mid=True)
        h.f(circ(22, s * 10.5, 0.9, AB0, stroke=ASEAM, sw=0.12)); h.f(rect(22, s * 10.5 - 0.4, 5, 0.8, AB0, stroke=ASEAM, sw=0.12, rx=0.3), mid=True)
        h.f(circ(27, s * 10.5, 0.5, ARUST))
    h.a_skirt(-34, 8, 3.4); h.a_engines(-34, [-3.6, 0, 3.6], 2.0)
    h.a_slit(29, 3.0)
    h.a_livery((14, 0.8), "MK I", 1.4, ((-26, -10.3), (-26, 10.3)))
    h.ymax = 11.5
    return h, 36


DEFS = ('<linearGradient id="tesHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ea7ad"></stop><stop offset="0.3" stop-color="#d9dde0"></stop>'
        '<stop offset="0.5" stop-color="#eef0f2"></stop><stop offset="0.7" stop-color="#d9dde0"></stop><stop offset="1" stop-color="#9ea7ad"></stop></linearGradient>'
        '<linearGradient id="tesOld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b9195"></stop><stop offset="0.3" stop-color="#bfc4c6"></stop>'
        '<stop offset="0.5" stop-color="#d2d5d5"></stop><stop offset="0.7" stop-color="#bfc4c6"></stop><stop offset="1" stop-color="#8b9195"></stop></linearGradient>'
        '<linearGradient id="arcHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f7560"></stop><stop offset="0.3" stop-color="#bfb193"></stop>'
        '<stop offset="0.5" stop-color="#d3c7aa"></stop><stop offset="0.7" stop-color="#bfb193"></stop><stop offset="1" stop-color="#7f7560"></stop></linearGradient>'
        '<linearGradient id="arcOld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e6654"></stop><stop offset="0.3" stop-color="#a69b82"></stop>'
        '<stop offset="0.5" stop-color="#b8ad94"></stop><stop offset="0.7" stop-color="#a69b82"></stop><stop offset="1" stop-color="#6e6654"></stop></linearGradient>')

NOTES = {
    "tes-docket": ["Tessaract Docket, courier: a small chamfered body in white with the teal band, a wide cab with the window strip, two containers on a short spine under the belly, two engines. Earth's courier, softer than a Tern."],
    "tes-memo": ["Tessaract Memo, the courier before the Docket: one container, a square cab window, the white gone grey, a patch. Cheap and everywhere."],
    "tes-waybill": ["Tessaract Waybill, hauler: cab, spine, four containers a side in open bays, two engines in a frame. The workhorse of a trade triangle."],
    "tes-invoice": ["Tessaract Invoice, the hauler before the Waybill: three bays a side with one frame empty, the square cab, grey paint. The hauler every Marches trader started in."],
    "tessaract-spine": ["Tessaract Manifest, freighter: a long spine carrying six container bays a side, the cab forward behind the teal band, two PDCs, three engines in a frame. On half the contracts in Accord space. Redrawn; the old outline is retired."],
    "tes-ledger": ["Tessaract Ledger, the freighter before the Manifest: four bays a side, one frame empty, the square cab, grey. Nobody has ever scrapped one that still flew."],
    "tes-lading": ["Tessaract Lading, bulk freighter: a wide body with three rows of four containers, PDCs at the corners, four engines. Slow, deep, and a pirate's dream if it is alone."],
    "tes-bill": ["Tessaract Bill, the bulk hull before the Lading: three rows of three, a frame empty, the square cab, grey. The hull the Marches' ore moved in for a generation."],
    "tes-consignment": ["Tessaract Consignment, superfreighter and convoy command ship: two spines carrying twenty-four containers, a command block amidships with the fleet beacon (the teal ring), PDCs all round, six engines. Moves a station's worth of goods; never travels without escort."],
    "tes-tariff": ["Tessaract Tariff, tanker: a spine with eight cylindrical tanks in cradles, each with a teal band, the cab forward, two PDCs, three engines. Liquid and gas bulk for Earth."],
    "tes-timetable": ["Tessaract Timetable, ferry: a rounded chamfered body with two rows of nine windows, no containers, the band aft, two engines. Earth's ferry."],
    "tes-almanac": ["Tessaract Almanac, the ferry before the Timetable: seven windows a row, the square cab, grey. Slower, roomier, and the seats recline."],
    "tes-itinerary": ["Tessaract Itinerary, heavy bus and short-route liner: longer, four rows of windows, a lounge strip amidships, three engines. The Marches run: a hundred seats and a bar."],
    "tes-passage": ["Tessaract Passage, liner: long and elegant, four decks of windows, a glazed promenade down the spine, PDCs because it is a tempting target, four engines."],
    "arc-shuttle": ["Arcadia Shuttle Mk III: a bone box with a conning slit, five windows a side in armoured plate, one engine in a skirt. Seats and straps."],
    "arc-shuttle-mk2": ["Arcadia Shuttle Mk II: the same box, older plate, a patch, the old Mk. Every Martian port's spare."],
    "arc-courier": ["Arcadia Courier Mk IV: a brick with slab plates, one armoured bay, rust chevrons, two engines in a skirt. Faster than it looks."],
    "arc-courier-mk3": ["Arcadia Courier Mk III: the brick before the brick. Mars does not scrap."],
    "arc-hauler": ["Arcadia Hauler Mk III: a slab-sided box with three armoured bays a side behind bolted plate, the slit, two engines in a skirt. Every Martian colony has a hangar full of them."],
    "arc-hauler-mk2": ["Arcadia Hauler Mk II: two bays a side, unbolted plate, a patch. Every Martian colony has a hangar full of those too."],
    "arc-freighter": ["Arcadia Freighter Mk II: armoured where a Tessaract hull is roomy. Four bays a side behind plate, a central plate spine, rust chevrons, three engines in a skirt."],
    "arc-freighter-mk1": ["Arcadia Freighter Mk I: three bays a side, older plate. Built to last forty years and did."],
    "arc-ice": ["Arcadia Ice Hauler Mk II: an open cradle of six ice slabs between two armoured runners, the cab forward, three engines. Polar ice to the Martian cities; water is a state matter."],
    "arc-ice-mk1": ["Arcadia Ice Hauler Mk I: five slabs, older runners. Still hauling."],
    "arc-bulk": ["Arcadia Bulk Freighter Mk I: a huge armoured box, six bays a side under bolted plate, a plate spine, rust chevrons, two PDCs, four engines. New, and already looks twenty years old."],
    "arc-ferry": ["Arcadia Ferry Mk II: a slab box of seats, nine windows a side in armoured frames, the slit, two engines. A schedule kept to the second."],
    "arc-tug": ["Arcadia Tug Mk II: a short armoured block with a big pushing plate across the bow and two outsized engines. Every Martian port has a dozen."],
    "arc-tender": ["Arcadia Tender Mk I: a repair hull with two crane arms, two parts bays a side, a workshop block, three engines. The one Martian civilian hull with a navy pattern."],
}

ENTRIES = [
    ("tes-memo", "tessaract", "light", "Tessaract Memo", "Courier, legacy", "Cheap and everywhere", "legacy", "tes-docket"),
    ("tes-invoice", "tessaract", "cargo", "Tessaract Invoice", "Hauler, legacy", "The hauler every Marches trader started in", "legacy", "tes-waybill"),
    ("tes-ledger", "tessaract", "cargo", "Tessaract Ledger", "Freighter, legacy", "Four bays, not six, and nobody has ever scrapped one that still flew", "legacy", "tessaract-spine"),
    ("tes-bill", "tessaract", "bulk", "Tessaract Bill", "Bulk freighter, legacy", "The bulk hull the Marches' ore moved in for a generation", "legacy", "tes-lading"),
    ("tes-almanac", "tessaract", "passenger", "Tessaract Almanac", "Ferry, legacy", "Slower, roomier, and the seats recline", "legacy", "tes-timetable"),
    ("arc-shuttle-mk2", "arcadia", "light", "Arcadia Shuttle Mk II", "Shuttle, legacy", "Every Martian port's spare", "legacy", "arc-shuttle"),
    ("arc-courier-mk3", "arcadia", "light", "Arcadia Courier Mk III", "Courier, legacy", "Mars does not scrap", "legacy", "arc-courier"),
    ("arc-hauler-mk2", "arcadia", "cargo", "Arcadia Hauler Mk II", "Hauler, legacy", "Every Martian colony has a hangar full of those too", "legacy", "arc-hauler"),
    ("arc-freighter-mk1", "arcadia", "cargo", "Arcadia Freighter Mk I", "Freighter, legacy", "Built to last forty years and did", "legacy", "arc-freighter"),
    ("arc-ice-mk1", "arcadia", "bulk", "Arcadia Ice Hauler Mk I", "Ice hauler, legacy", "Still hauling", "legacy", "arc-ice"),
]
LEGACY_WEIGHT = {"tes-memo": "Light", "tes-invoice": "Medium", "tes-ledger": "Heavy", "tes-bill": "Super-heavy", "tes-almanac": "Medium",
                 "arc-shuttle-mk2": "Light", "arc-courier-mk3": "Light", "arc-hauler-mk2": "Medium", "arc-freighter-mk1": "Heavy", "arc-ice-mk1": "Heavy"}


def all_art():
    syms, meta = [], {}
    builders = [(tes_docket, False), (tes_docket, True), (tes_waybill, False), (tes_waybill, True), (tes_manifest, False), (tes_manifest, True),
                (tes_lading, False), (tes_lading, True), (tes_consignment, None), (tes_tariff, None), (tes_timetable, False), (tes_timetable, True),
                (tes_itinerary, None), (tes_passage, None),
                (arc_shuttle, False), (arc_shuttle, True), (arc_courier, False), (arc_courier, True), (arc_hauler, False), (arc_hauler, True),
                (arc_freighter, False), (arc_freighter, True), (arc_ice, False), (arc_ice, True), (arc_bulk, None), (arc_ferry, None), (arc_tug, None), (arc_tender, None)]
    for fn, old in builders:
        h, R = fn() if old is None else fn(old)
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return DEFS, "".join(syms), meta
