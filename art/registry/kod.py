"""Kessari Orbital Defence hull art, v4: eight hulls, eight silhouettes, one vocabulary.

Nose points +x. World units. Each hull composes its own bodies and features
from a shared parts library: the white spine, the visor head, chevroned bay
doors, shield emitters, PDC turrets, engine bells with radiators, chamfered
raised modules, a panel grid, the Earth Charter Fleet livery. The silhouettes are
driven by role, area of operation, equipment and date of commission.
"""

import math
INK = "#0b1724"
T0 = "#152a40"; T1 = "#24445f"; T2 = "#33597c"; T3 = "#4a7aa6"; T4 = "#5f8fbd"
SPON = "#1f3b56"; HEAD = "#1a3249"; PLATE = "#2a4b6b"; OLD = "#263f57"; PATCH = "#355d82"
WHITE = "#e6eef5"; GLASS = "#0a1420"; BLUE = "#8fd6ff"; YELLOW = "#e8c547"; RED = "#ff6a5a"; GREEN = "#6affa8"
SHADOW = "rgba(3,8,14,0.55)"; GIRDER = "#6f8aa6"
MOUNT_RADIUS = {"S": 1.5, "M": 2.25, "L": 3.0, "XL": 3.9}  # the game turret picture sizes, turrets.py RADIUS


def P(pts): return " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)
def poly(pts, fill, stroke=INK, sw=0.22, extra=""): return f'<polygon points="{P(pts)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" {extra}></polygon>'
def rect(x, y, w, h, fill, stroke=INK, sw=0.18, rx=0.0, extra=""): return f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}></rect>'
def line(x1, y1, x2, y2, stroke=INK, sw=0.14, extra=""): return f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" {extra}></line>'
def circ(x, y, r, fill, stroke="none", sw=0, extra=""): return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}></circle>'
def ell(x, y, rx, ry, fill, extra=""): return f'<ellipse cx="{x:.2f}" cy="{y:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="{fill}" {extra}></ellipse>'
def mirror(pts): return [(x, -y) for x, y in pts]
def clamp(v, lo, hi): return max(lo, min(hi, v))


def fade(col, amount=0.28):
    """Lighten and wash out a hex colour: the civilian repaint of a navy hull."""
    if not isinstance(col, str) or not col.startswith("#") or len(col) != 7: return col
    r, g, b = (int(col[i:i + 2], 16) for i in (1, 3, 5))
    grey = (r + g + b) / 3
    out = []
    for c in (r, g, b):
        c = c + (grey - c) * 0.35          # desaturate
        c = c + (255 - c) * amount         # lighten
        out.append(int(max(0, min(255, c))))
    return "#%02x%02x%02x" % tuple(out)


def cham(x, y, w, h, c):
    c = min(c, w / 2.2, h / 2.2)
    return [(x + c, y), (x + w - c, y), (x + w, y + c), (x + w, y + h - c), (x + w - c, y + h), (x + c, y + h), (x, y + h - c), (x, y + c)]


def sym_pts(top):
    """Close a top-half outline (negative y, nose first) into a full polygon."""
    return top + list(reversed(mirror(top)))


def mount_attrs(mid, kind, size, x, y, facing=0.0, arc=None):
    """The attributes that mark an SVG group as a mount (docs/ship-pipeline.md): the game reads them through
    export.py, and the bare picture leaves the group out, so a fitted weapon is drawn there instead."""
    a = f'data-mount="{mid}" data-type="{kind}" data-size="{size}" data-x="{x:.2f}" data-y="{y:.2f}" data-facing="{facing:.3f}"'
    return a + (f' data-arc="{arc:.3f}"' if arc is not None else "")


class Mount:
    """`with h.mount(...)`: everything drawn inside is one mount's weapon, wrapped in a marked group."""
    def __init__(self, hull, mid, kind, size, x, y, facing, arc):
        self.h, self.attrs = hull, mount_attrs(mid, kind, size, x, y, facing, arc)

    def __enter__(self):
        self.start = (len(self.h.full), len(self.h.mid))
        return self.h

    def __exit__(self, *exc):
        for layer, start in ((self.h.full, self.start[0]), (self.h.mid, self.start[1])):
            inside = layer[start:]
            del layer[start:]
            if inside: layer.append(f'<g {self.attrs}>{"".join(inside)}</g>')
        return False


class Hull:
    def __init__(self, key, u, cell, civ=False):
        self.key, self.u, self.cell, self.civ = key, u, cell, civ
        self.full, self.mid, self.sil, self.rim = [], [], [], []
        self.n = 0
        self.stroke = INK
        self.ymax = 0.0; self.xmin = 0.0; self.xmax = 0.0

    # bodies: hull plate volumes that make the silhouette
    def body(self, pts, fill="url(#kodHull)", grid=True, sw=0.26, rough=False):
        if self.civ: fill = {"url(#kodHull)": "url(#kodHullCiv)", "url(#marsHull)": "url(#marsHullCiv)", "url(#venHull)": "url(#venHullCiv)"}.get(fill) or fade(fill)
        self.n += 1
        cid = f"c-{self.key}-{self.n}"
        self.full.append(poly(pts, fill, stroke=self.stroke, sw=sw))
        self.mid.append(poly(pts, fill, stroke=self.stroke, sw=sw))
        self.sil.append(poly(pts, "currentColor", stroke="none", sw=0))
        self.ymax = max([self.ymax] + [abs(y) for _, y in pts]); self.xmin = min([self.xmin] + [x for x, _ in pts]); self.xmax = max([self.xmax] + [x for x, _ in pts])
        self.rim.append(poly(pts, "none", stroke="currentColor", sw=1.2, extra='vector-effect="non-scaling-stroke"'))
        if grid:
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
            g = [f'<clipPath id="{cid}"><polygon points="{P(pts)}"></polygon></clipPath>', f'<g clip-path="url(#{cid})">']
            x = x0 + self.cell
            k = 0
            while x < x1 - 0.5:
                g.append(line(x, y0, x, y1, stroke=self.stroke, sw=0.12 if not rough or k % 3 else 0.22, extra='opacity="0.8"'))
                x += self.cell * (1.0 if not rough else (0.8 if k % 2 else 1.15)); k += 1
            yy = y0 + self.cell * 1.3
            while yy < y1 - 0.5:
                g.append(line(x0, yy, x1, yy, stroke=self.stroke, sw=0.1, extra='opacity="0.55"'))
                yy += self.cell * 1.3
            g.append("</g>")
            self.full += g

    def mount(self, mid, kind, size, x, y, facing=0.0, arc=None):
        """Mark what is drawn inside as a mount: `with h.mount("w1", "high", "M", 14, 0): h.gun(14, 0)`.
        `kind` is the game's mount type (`high` for a weapon, `ciws` for a PDC), `size` S to XL, `facing`
        and `arc` in radians. Do not insert at the front of a layer inside one (engine glows): draw those outside."""
        return Mount(self, mid, kind, size, x, y, facing, arc)

    def weapon(self, mid, kind, size, x, y, facing=0.0, socket=True):
        """A game mount with its stock weapon: an empty socket drawn as hull (`socket=False` when the hull
        already draws one), and a turret or PDC inside the marker, at the game's size (turrets.py RADIUS)."""
        import math
        r = MOUNT_RADIUS[size]
        if socket:
            self.f(circ(x, y, r * 1.15, "#0e1824", stroke="#4a6580", sw=0.18), mid=True)
        c, s = math.cos(facing), math.sin(facing)
        with self.mount(mid, kind, size, x, y, facing):
            if kind == "ciws":
                self.f(rect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4, "#16283b", sw=0.14, rx=0.2))
                self.f(circ(x, y, r * 0.48, "#5b8fc7", stroke="#cfe0f0", sw=0.14))
            else:
                self.f(circ(x, y, r * 0.85, "#2a3b4d", stroke="#9fb4c8", sw=0.15))
            tip, w = r * 1.6, r * 0.14
            bx, by = -s * w, c * w
            self.f(poly([(x + bx, y + by), (x + c * tip + bx, y + s * tip + by), (x + c * tip - bx, y + s * tip - by), (x - bx, y - by)], "#cfe0f0", sw=0.1))

    def f(self, svg, mid=False):
        self.full.append(svg)
        if mid: self.mid.append(svg)

    # raised module with shadow and highlight
    def module(self, pts, fill, hatches=True):
        if self.civ: fill = fade(fill)
        self.f(poly([(x + 0.7, y + 0.7) for x, y in pts], SHADOW, stroke="none", sw=0))
        self.f(poly(pts, fill), mid=True)
        self.f(f'<polyline points="{P(pts[:3])}" fill="none" stroke="#9fc0dc" stroke-width="0.18" opacity="0.55" stroke-linejoin="round"></polyline>')
        if hatches:
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
            u = self.u
            if x1 - x0 > 5 * u and y1 - y0 > 3 * u:
                for side_y in (y0 + 1.0 * u, y1 - 1.8 * u):
                    self.f(rect(x0 + 1.2 * u, side_y, 0.8 * u, 0.8 * u, "#122233", sw=0.1))
                    if x1 - x0 > 9 * u:
                        self.f(rect(x0 + 2.6 * u, side_y + 0.15 * u, min(x1 - x0 - 4 * u, 4 * u), 0.5 * u, "#0d1a28", sw=0.1))

    def spine(self, x0, x1, hw):
        self.f(rect(x0, -hw, x1 - x0, 2 * hw, "url(#kesSpineV)", sw=0.14), mid=True)
        for s in (-1, 1): self.f(line(x0, s * (hw + 0.35), x1, s * (hw + 0.35), sw=0.1, extra='opacity="0.7"'))

    def visor(self, x_nose, half_nose, half_back, depth, n_eyes=3, bar=True):
        """A dark sensor bar across a blunt prow between x_nose-depth and x_nose-depth*0.4."""
        u = self.u
        x1 = x_nose - depth * 0.4; x0 = x_nose - depth
        h1 = half_nose + (half_back - half_nose) * 0.4; h0 = half_nose + (half_back - half_nose) * 1.0
        self.f(poly([(x1, -h1 * 0.95), (x0, -h0 * 0.95), (x0, h0 * 0.95), (x1, h1 * 0.95)], "url(#glass)", sw=0.2), mid=True)
        if bar: self.f(line((x0 + x1) / 2, -h0 * 0.8, (x0 + x1) / 2, h0 * 0.8, stroke=BLUE, sw=clamp((x1 - x0) * 0.3, 0.3, 1.2), extra='opacity="0.9"'))
        for i in range(n_eyes):
            yy = (i - (n_eyes - 1) / 2) * h0 * 0.5
            self.f(circ(x0 - 1.4 * u, yy, 0.5 * u, "#0f1e2e", stroke="#7f9ab5", sw=0.12))
            self.f(circ(x0 - 1.4 * u, yy, 0.22 * u, BLUE, extra='opacity="0.85"'))
        self.f(circ(x_nose - 0.7, 0, 0.3 * u, WHITE, extra='opacity="0.9"'))

    def antennae(self, x, y, dx, dy):
        self.f(line(x, y, x + dx, y + dy, stroke="#9fb7cf", sw=0.14)); self.f(circ(x + dx, y + dy, 0.3 * self.u, WHITE))

    def door(self, x, y, w, h, recessed=False):
        self.f(rect(x, y, w, h, "#17304a" if not recessed else "#101f30", stroke=WHITE if not recessed else "#2b4d70", sw=0.13), mid=True)
        self.f(line(x + w / 2, y + 0.3, x + w / 2, y + h - 0.3, sw=0.1, extra='opacity="0.8"'))
        cx, cy = x + w / 2, y + h / 2
        self.f(f'<polyline points="{cx - w * 0.16:.2f},{cy - h * 0.3:.2f} {cx + w * 0.13:.2f},{cy:.2f} {cx - w * 0.16:.2f},{cy + h * 0.3:.2f}" fill="none" stroke="{WHITE}" stroke-width="0.15" stroke-linejoin="round"></polyline>')

    def doors(self, x0, x1, yc, n, h, rows=1, band=None, recessed=False):
        gap = (x1 - x0) / n; w = gap * 0.64
        for r in range(rows):
            y = yc if rows == 1 else yc + (r - (rows - 1) / 2) * (band / rows)
            for i in range(n): self.door(x0 + gap * i + (gap - w) / 2, y - h / 2, w, h, recessed)

    def emitter(self, x, y):
        er = clamp(self.u * 0.9, 0.7, 2.6)
        self.f(circ(x, y, er * 2.0, BLUE, extra='opacity="0.2" filter="url(#glowSoft)"'))
        self.f(circ(x, y, er, "#cfeeff", stroke=INK, sw=0.15), mid=True)
        self.f(circ(x, y, er * 0.45, BLUE))

    def pdc(self, x, y):
        g = self.u
        self.f(rect(x - g, y - g, 2 * g, 2 * g, "#16283b", sw=0.14, rx=0.2))
        self.f(circ(x, y, g * 0.68, "#5b8fc7", stroke="#cfe0f0", sw=0.14), mid=True)
        self.f(rect(x + g * 0.2, y - g * 0.11, g * 1.3, g * 0.22, "#cfe0f0", stroke="none", sw=0))

    def gun(self, x, y):
        self.f(circ(x, y, 1.1 * self.u, "none", stroke="#7f9ab5", sw=0.18)); self.f(circ(x, y, 0.4 * self.u, "#7f9ab5"))

    def engines(self, x_stern, ys, h, housing=None):
        u = self.u
        if housing: self.f(poly(housing, T0, sw=0.2), mid=True)
        for ey in ys:
            self.full.insert(0, ell(x_stern - h * 1.1, ey, h * 1.3, h * 0.6, BLUE, 'opacity="0.45" filter="url(#glowSoft)"'))
            self.mid.insert(0, ell(x_stern - h * 1.1, ey, h * 1.3, h * 0.6, BLUE, 'opacity="0.45" filter="url(#glowSoft)"'))
            bell = [(x_stern + 2.4 * u, ey - h * 0.5), (x_stern - 1.8 * u, ey - h * 0.72), (x_stern - 1.8 * u, ey + h * 0.72), (x_stern + 2.4 * u, ey + h * 0.5)]
            self.f(poly(bell, "#5d738a", sw=0.15), mid=True)
            self.f(ell(x_stern - 1.7 * u, ey, 0.6 * u, h * 0.55, "#060a0f"))
            self.f(ell(x_stern - 1.7 * u, ey, 0.35 * u, h * 0.38, BLUE, 'opacity="0.9"'))

    def radiators(self, x, y, n, dx, dy, length):
        """Retired 7 November 2026 (Jason): the short slashed radiator strokes at the stern corners read as scratches. Kept as a no-op so the hull builders need no edits."""
        return

    def strut(self, x, y0, y1, w, cross=True):
        self.f(rect(x - w / 2, min(y0, y1), w, abs(y1 - y0), T0, sw=0.18), mid=True)
        if cross:
            self.f(line(x - w / 2, y0, x + w / 2, y1, stroke=GIRDER, sw=0.16)); self.f(line(x + w / 2, y0, x - w / 2, y1, stroke=GIRDER, sw=0.16))

    def truss(self, x0, x1, y0, y1, pitch):
        """An exposed girder section between two hulls: top and bottom chords with diagonals."""
        self.f(rect(x0, y0, x1 - x0, y1 - y0, "#0d1a28", sw=0.2), mid=True)
        for yy in (y0 + 0.6, y1 - 0.6): self.f(line(x0, yy, x1, yy, stroke=GIRDER, sw=0.35))
        x = x0; k = 0
        while x + pitch <= x1 + 0.01:
            if k % 2 == 0: self.f(line(x, y0 + 0.6, x + pitch, y1 - 0.6, stroke=GIRDER, sw=0.22))
            else: self.f(line(x, y1 - 0.6, x + pitch, y0 + 0.6, stroke=GIRDER, sw=0.22))
            self.f(line(x, y0 + 0.6, x, y1 - 0.6, stroke=GIRDER, sw=0.18))
            x += pitch; k += 1

    def tower(self, x0, x1, hh, tall=False):
        u = self.u
        self.module(cham(x0, -hh, x1 - x0, 2 * hh, 1.0 * u), T4 if tall else T3, hatches=False)
        self.f(rect(x1 - (x1 - x0) * 0.28, -hh * 0.55, (x1 - x0) * 0.14, hh * 1.1, "url(#glass)", sw=0.14))
        if tall:
            self.module(cham(x0 + (x1 - x0) * 0.2, -hh * 0.55, (x1 - x0) * 0.5, hh * 1.1, 0.8 * u), "#78a6d0", hatches=False)
        self.antennae(x1, 0, 3.5 * u, 0)
        self.f(circ(x1 + 3.5 * u, 0, 0.35 * u, RED))

    def livery(self, flash_xy, stencil_xy, stencil, fs, nav_xy, toll=None):
        u = self.u
        fr = clamp(u * 0.8, 0.5, 2.0)
        if self.civ:
            # civilian grade: the company's hull, no Earth Charter Fleet flash, no toll bands, no navy stencil; a civilian registry flash
            (rx, ry), (gx, gy) = nav_xy
            self.f(circ(rx, ry, 0.38 * u, RED)); self.f(circ(gx, gy, 0.38 * u, GREEN))
            fx, fy = flash_xy[0]
            self.f(circ(fx, fy, fr, YELLOW, stroke=INK, sw=0.1)); self.f(circ(fx, fy, fr * 0.4, INK))
            sx, sy = stencil_xy
            self.f(f'<text x="{sx:.2f}" y="{sy:.2f}" font-family="IBM Plex Mono, monospace" font-size="{fs:.2f}" fill="{WHITE}" opacity="0.55" text-anchor="middle" letter-spacing="0.12">KOD</text>')
            return
        for (fx, fy) in flash_xy:
            self.f(circ(fx, fy, fr, WHITE, stroke=INK, sw=0.1)); self.f(line(fx, fy - fr * 0.9, fx, fy + fr * 0.9, stroke="#2b4d70", sw=0.16))
        sx, sy = stencil_xy
        self.f(f'<text x="{sx:.2f}" y="{sy:.2f}" font-family="IBM Plex Mono, monospace" font-size="{fs:.2f}" fill="{WHITE}" opacity="0.7" text-anchor="middle" letter-spacing="0.12">{stencil}</text>')
        (rx, ry), (gx, gy) = nav_xy
        self.f(circ(rx, ry, 0.9 * u, "#ff4a3d", extra='opacity="0.25" filter="url(#glowSoft)"')); self.f(circ(rx, ry, 0.38 * u, RED))
        self.f(circ(gx, gy, 0.9 * u, "#3dff8a", extra='opacity="0.25" filter="url(#glowSoft)"')); self.f(circ(gx, gy, 0.38 * u, GREEN))
        if toll:
            x, hh, sw = toll
            for i, col in enumerate((YELLOW, "#111", YELLOW)): self.f(line(x - i * sw * 1.6, -hh, x - i * sw * 1.6, hh, stroke=col, sw=sw))

    def symbols(self, R):
        vb = f'viewBox="{-R:.2f} {-R:.2f} {2 * R:.2f} {2 * R:.2f}"'
        if self.civ:
            return (f'<symbol id="s-{self.key}-civ-full" {vb}>{"".join(self.full)}</symbol>'
                    f'<symbol id="s-{self.key}-civ-mid" {vb}>{"".join(self.mid)}</symbol>')
        return (f'<symbol id="s-{self.key}-full" {vb}>{"".join(self.full)}</symbol>'
                f'<symbol id="s-{self.key}-mid" {vb}>{"".join(self.mid)}</symbol>'
                f'<symbol id="s-{self.key}-sil" {vb}>{"".join(self.sil)}</symbol>'
                f'<symbol id="s-{self.key}-rim" {vb}>{"".join(self.rim)}</symbol>')


# ------------------------------------------------------------------ the hulls

def citation(civ=False):
    """Corvette, the newest KOD hull: a slim core between two engine pods. More engine than ship."""
    h = Hull("kes-citation", u=0.7, cell=3.2, civ=civ)
    core = [(17, -2.6), (14.5, -3.8), (-11, -3.8), (-14, -2.6)]
    h.body(sym_pts(core), HEAD)
    for s in (-1, 1):
        pod = [(-1, s * 4.6), (-3.5, s * 7.2), (-15, s * 7.2), (-17.5, s * 5.6), (-17.5, s * 4.6)]
        h.body(pod + [(x, s * 4.6) for x, _ in reversed(pod[:1])], SPON)
        h.strut(-6, s * 3.8, s * 4.6, 1.6, cross=False); h.strut(-13, s * 3.8, s * 4.6, 1.6, cross=False)
        h.door(-12.5, s * 5.9 - 0.9 if s < 0 else s * 5.9 - 0.9, 5.5, 1.8)
        h.radiators(-16.2, s * 7.2, 2, 1.1, 0, 1.6 * s)
    h.engines(-17.5, [-5.1, 5.1], 1.3)
    h.module(cham(-9, -2.6, 13, 5.2, 0.9), T1); h.module(cham(-5, -1.5, 6, 3.0, 0.6), T2, hatches=False)
    h.spine(-13, 8.5, 0.5)
    h.visor(17, 2.6, 3.8, 3.2, n_eyes=1)
    h.antennae(10, -3.6, 3, -1.2); h.antennae(10, 3.6, 3, 1.2)
    h.emitter(6, -2.4); h.emitter(6, 2.4)
    h.gun(12.2, 0)
    h.livery([(-9, -6.2), (-9, 6.2)], (1, -2.9 + 0.35), "KOD C", 1.0, ((-15, -7.4), (-15, 7.4)))
    return h, 18.5, 14.4 / 35


def warrant(civ=False):
    """Patrol boat, gate duty: the compact stepped body, two engines in a shielded pair, toll bands."""
    h = Hull("warrant", u=0.9, cell=3.6, civ=civ)
    L, b = 48, 11; hx = 24; hb = 7.5; head_b = 5.7; nb = 4.0
    top = [(hx, -nb), (hx - 4.3, -head_b), (15, -head_b), (14, -hb), (9.2, -hb), (6.8, -b), (-18.2, -b), (-20.6, -hb), (-22.6, -hb), (-hx, -5.1)]
    h.body(sym_pts(top))
    for s in (-1, 1):
        h.f(poly([(8.4, s * (hb + 0.3)), (6.4, s * (b - 0.4)), (-17.8, s * (b - 0.4)), (-19.8, s * (hb + 0.3))], SPON), mid=True)
        h.f(line(-17, s * (b - 0.9), 6, s * (b - 0.9), stroke="#6f93b5", sw=0.12))
        h.f(line(-5.5, s * (hb + 0.2), -5.5, s * (b - 0.2), sw=0.24))
    for s in (-1, 1): h.doors(-17, 6, s * 9.2, 2, 2.0)
    h.f(poly([(-22.2, -hb + 0.4), (-22.2, hb - 0.4), (-23.4, 4.7), (-23.4, -4.7)], T0, sw=0.2), mid=True)
    h.f(rect(-22.0, -hb + 0.9, 1.1, 2 * hb - 1.8, "#0f1e2e", sw=0.14))
    h.radiators(-22.6, -hb, 3, -0.5, -0.4, -1.6); h.radiators(-22.6, hb, 3, -0.5, 0.4, 1.6)
    h.engines(-hx, [-2.9, 2.9], 2.0)
    h.module(cham(10.2, -head_b * 0.58, 4.6, head_b * 1.16, 1.1), T1, hatches=False)
    h.module(cham(-15.4, -hb * 0.6, 10.5, hb * 1.2, 1.1), T1); h.module(cham(-4.4, -hb * 0.6, 7.2, hb * 1.2, 1.1), T1)
    h.module(cham(3.3, -hb * 0.52, 7.2, hb * 1.04, 1.1), T1); h.module(cham(-10.6, -hb * 0.34, 14.4, hb * 0.68, 0.9), T2, hatches=False)
    h.spine(-21.8, 13.4, 0.55)
    h.visor(hx, nb, head_b, 4.3)
    h.antennae(19, -head_b * 0.55, 4.3, -1.2); h.antennae(19, head_b * 0.55, 4.3, 1.2)
    for (x, y) in [(10.6, -4.6), (10.6, 4.6), (-21.4, -4.6), (-21.4, 4.6)]: h.emitter(x, y)
    h.weapon("w1", "high", "M", -6, -6.5); h.weapon("w2", "high", "M", -6, 6.5)
    h.weapon("w3", "high", "S", 14, 0); h.weapon("w4", "high", "S", -14, -8.5, math.pi)
    h.livery([(-20, -2.2), (-20, 2.2)], (-5.5, -hb * 0.72 + 0.5), "KOD W", 1.4, ((-16.8, -b + 0.5), (-16.8, b - 0.5)), toll=(hx - 9.6, head_b * 0.96, 0.6))
    return h, 26.4, 22 / 48


def injunction():
    """Frigate, line escort, an older design: a trimaran. Launcher pods held off the crew on struts."""
    h = Hull("kessari-brig", u=1.0, cell=4.0)
    hx = 34
    core = [(hx, -3.4), (hx - 5.5, -5.2), (20, -5.2), (19, -6.4), (-26, -6.4), (-29, -4.8), (-32, -4.8), (-hx, -3.2)]
    h.body(sym_pts(core))
    for s in (-1, 1):
        pod = [(15, s * 10.5), (12, s * 17.5), (-24, s * 17.5), (-27, s * 15), (-27, s * 10.5)]
        h.body(pod + [], SPON, rough=False)
        h.strut(5, s * 6.4, s * 10.5, 3.2); h.strut(-16, s * 6.4, s * 10.5, 3.2)
        h.f(line(-26, s * 17.0, 11.5, s * 17.0, stroke="#6f93b5", sw=0.12))
        h.doors(-25, 11, s * 14.5, 4, 2.6)
        h.f(line(-6.5, s * 11, -6.5, s * 17.3, sw=0.24))
        h.emitter(-25.2, s * 12.4); h.emitter(13.2, s * 12.6)
        h.radiators(-26.4, s * 17.5, 2, -0.8, 0, 2.0 * s)
        h.engines(-27, [s * 13], 1.6)
    h.f(poly([(-31.6, -4.4), (-31.6, 4.4), (-33.2, 2.9), (-33.2, -2.9)], T0, sw=0.2), mid=True)
    h.engines(-hx, [-1.9, 1.9], 1.5)
    h.module(cham(21, -3.0, 6.5, 6.0, 1.0), T1, hatches=False)
    h.module(cham(-24, -4.6, 13, 9.2, 1.2), T1); h.module(cham(-9.5, -4.6, 12, 9.2, 1.2), T1); h.module(cham(4, -4.0, 12, 8.0, 1.2), T1)
    h.module(cham(-20, -2.6, 23, 5.2, 0.9), T2, hatches=False)
    h.spine(-31, 19, 0.6)
    h.visor(hx, 3.4, 5.2, 5.5, n_eyes=2)
    h.antennae(26, -4.8, 4.5, -1.5); h.antennae(26, 4.8, 4.5, 1.5)
    h.weapon("w1", "high", "M", 24, -5); h.weapon("w2", "high", "M", 24, 5)
    h.weapon("w3", "high", "M", 0, -13.3, -math.pi / 2); h.weapon("w4", "high", "M", 0, 13.3, math.pi / 2)
    h.weapon("w5", "high", "M", -27.7, -5, math.pi)
    h.weapon("d1", "ciws", "M", -10, -14.6, -math.pi / 2); h.weapon("d2", "ciws", "M", -10, 14.6, math.pi / 2)
    h.livery([(-28.5, -3.0), (-28.5, 3.0)], (-2, -6.4 + 0.3 - 1.6), "KOD F", 1.5, ((-26.5, -17.9), (-26.5, 17.9)))
    return h, 36.5, 35 / 68


def verdict():
    """Destroyer, Marches convoy work: long and angular, a sensor tower forward, an unbroken broadside, an aft castle."""
    h = Hull("kes-verdict", u=1.1, cell=4.4)
    hx = 43
    top = [(hx, -4.5), (hx - 6, -9.5), (16, -9.5), (8, -19.5), (-26, -19.5), (-34, -14), (-39, -14), (-hx, -9)]
    h.body(sym_pts(top))
    for s in (-1, 1):
        h.f(poly([(14.5, s * 10.3), (7.8, s * 19.1), (-25.8, s * 19.1), (-33.2, s * 14.6), (-33.2, s * 10.3)], SPON), mid=True)
        h.f(line(-31, s * 18.5, 8.5, s * 18.5, stroke="#6f93b5", sw=0.12))
        for xx in (-15, -2): h.f(line(xx, s * 10.8, xx, s * 18.9, sw=0.24))
        h.doors(-27, 8, s * 15.6, 6, 3.0)
        h.pdc(11, s * 12.0); h.pdc(-10, s * 12.0); h.pdc(-30, s * 11.8)
        h.emitter(-36.5, s * 8.5); h.emitter(14, s * 6.5)
    h.f(poly([(-38.6, -13.6), (-38.6, 13.6), (-42.2, 8.6), (-42.2, -8.6)], T0, sw=0.2), mid=True)
    h.f(rect(-38.3, -12.5, 1.3, 25, "#0f1e2e", sw=0.14))
    h.radiators(-39, -14, 4, -0.9, -1.1, -2.4); h.radiators(-39, 14, 4, -0.9, 1.1, 2.4)
    h.engines(-hx, [-5.4, 0, 5.4], 2.4)
    # aft castle: tall tiered block over the engines
    h.module(cham(-33, -9.0, 16, 18, 1.4), T1); h.module(cham(-30, -6.0, 11, 12, 1.1), T2); h.module(cham(-27.5, -3.4, 6, 6.8, 0.8), T3, hatches=False)
    # mid deck modules
    h.module(cham(-14, -7.0, 10, 14, 1.2), T1); h.module(cham(-2, -7.0, 10, 14, 1.2), T1)
    # forward sensor tower on the narrow section
    h.module(cham(14, -5.6, 9, 11.2, 1.2), T1, hatches=False); h.module(cham(16, -3.2, 5, 6.4, 0.8), T3, hatches=False)
    h.antennae(22, -3.2, 4, -2.5); h.antennae(22, 3.2, 4, 2.5)
    h.f(rect(17.5, -1.2, 6, 2.4, 'url(#glass)', sw=0.14))
    h.spine(-38, 13, 0.7)
    h.visor(hx, 4.5, 9.5, 6.0, n_eyes=3)
    h.livery([(-36.5, -4.2), (-36.5, 4.2)], (-8, -9.5 + 2.0), "KOD D", 1.7, ((-31.2, -19.9), (-31.2, 19.9)))
    return h, 45.5, 39 / 86


def statute():
    """Cruiser, Gate War era, the oldest big hull in service: two hull blocks joined by an exposed truss, a tall old bridge."""
    h = Hull("kes-statute", u=1.6, cell=5.2)
    hx = 70
    fore = [(hx, -7), (hx - 9, -15), (54, -17), (54, -22), (22, -22), (19, -16), (19, -7)]
    h.body(sym_pts(fore), rough=True)
    aft = [(-14, -11), (-14, -24), (-18, -31), (-62, -31), (-67, -22), (-70, -20), (-70, -11)]
    h.body(sym_pts(aft), OLD, rough=True)
    keel = [(21, -6.5), (-16, -6.5), (-16, 6.5), (21, 6.5)]
    h.body(keel, T0, grid=False)
    h.truss(-14, 19, -14, -6.5, 5.5); h.truss(-14, 19, 6.5, 14, 5.5)
    for s in (-1, 1):
        # launcher banks on both hulls
        h.f(poly([(53, s * 16.8), (53, s * 21.6), (23, s * 21.6), (20.5, s * 16.8)], SPON), mid=True)
        h.doors(23.5, 52, s * 19.2, 4, 3.2)
        h.f(poly([(-15.2, s * 24.4), (-18.6, s * 30.6), (-61.5, s * 30.6), (-66, s * 22.6), (-15.2, s * 22.6)], SPON), mid=True)
        h.doors(-60, -17, s * 26.6, 5, 3.4, rows=1)
        for xx in (-50, -38, -27): h.f(line(xx, s * 22.9, xx, s * 30.3, sw=0.26))
        h.pdc(50, s * 12); h.pdc(26, s * 12); h.pdc(-20, s * 19); h.pdc(-57, s * 19)
        h.emitter(58, s * 10); h.emitter(-16.5, s * 18); h.emitter(-64, s * 15)
        # old radiator wings, big and ribbed
        h.radiators(-50, s * 31, 6, -2.2, 0, 3.2 * s)
        # repair patches
        h.f(poly(cham(28, s * 14 - 2, 9, 4.5, 0.6), PATCH, sw=0.14)); h.f(poly(cham(-30, s * 19 - 2, 7, 4, 0.6), PATCH, sw=0.14)); h.f(poly(cham(-56, s * 7 - 2.5, 5, 5, 0.6), PATCH, sw=0.14))
    h.f(poly([(-69.5, -19.5), (-69.5, 19.5), (-72.5, 13), (-72.5, -13)], T0, sw=0.2), mid=True)
    h.engines(-hx, [-9, 0, 9], 3.3)
    # fore hull: a long low module run and the head block
    h.module(cham(57, -8.5, 7, 17, 1.4), T1, hatches=False)
    h.module(cham(24, -12, 14, 24, 1.6), T1); h.module(cham(40, -12, 14, 24, 1.6), T1)
    # aft hull: the old tall bridge and machinery blocks
    h.module(cham(-60, -16, 18, 32, 1.8), T1); h.module(cham(-40, -16, 18, 32, 1.8), T1)
    h.module(cham(-57, -10, 32, 20, 1.4), T2)
    h.spine(-68, 56, 0.9)
    h.tower(-36, -20, 7.5, tall=True)
    # exposed pipework along the truss
    for yy in (-4, 0, 4): h.f(line(-14, yy, 19, yy, stroke="#7f9ab5", sw=0.35))
    h.visor(hx, 7, 15, 9.0, n_eyes=3)
    h.antennae(60, -12, 6, -3); h.antennae(60, 12, 6, 3)
    h.livery([(-24, -19.5), (-24, 19.5)], (-12, -20 + 2.2), "KOD CR", 2.2, ((-61, -31.4), (-61, 31.4)))
    return h, 74, 62 / 142


def precedent():
    """Battleship, post-Dimming, the newest capital: low, sleek, layered plates, recessed bays, almost no clutter."""
    h = Hull("kes-precedent", u=1.8, cell=6.4)
    hx = 100
    outer = [(hx, -9), (hx - 14, -24), (70, -30), (-20, -43), (-62, -43), (-88, -32), (-96, -22), (-hx, -14)]
    h.body(sym_pts(outer), "url(#kodHull)", sw=0.3)
    inner = [(hx - 8, -7), (hx - 18, -19), (66, -24), (-18, -35), (-60, -35), (-82, -26), (-90, -18)]
    h.module(sym_pts(inner), PLATE, hatches=False)
    third = [(70, -5), (60, -14), (-14, -24), (-56, -24), (-74, -17), (-74, 17), (-56, 24), (-14, 24), (60, 14), (70, 5)]
    h.module(third, T1, hatches=False)
    for s in (-1, 1):
        # recessed bays along the plate edge: two rows, no white framing
        h.doors(-58, 40, s * 30.5, 10, 3.2, rows=1, recessed=True)
        h.doors(-58, -8, s * 38.5, 5, 3.0, rows=1, recessed=True)
        for xx in (-40, -16, 8, 32): h.f(line(xx, s * 26, xx, s * 35, sw=0.16, extra='opacity="0.7"'))
        h.pdc(44, s * 19); h.pdc(16, s * 24.5); h.pdc(-12, s * 26.3); h.pdc(-40, s * 26.3); h.pdc(-66, s * 24)
        h.emitter(74, s * 13); h.emitter(36, s * 10); h.emitter(-30, s * 16); h.emitter(-80, s * 17)
        h.radiators(-86, s * 30, 3, -2.5, -1.8 * s, 3.0 * s)
    h.f(poly([(-95, -21), (-95, 21), (-99, 13), (-99, -13)], T0, sw=0.2), mid=True)
    h.engines(-hx, [-9.6, -3.2, 3.2, 9.6], 2.9)
    h.module(cham(-50, -12, 40, 24, 2.0), T2, hatches=False); h.module(cham(-6, -10, 36, 20, 2.0), T2, hatches=False)
    h.module(cham(34, -7, 22, 14, 1.6), T2, hatches=False)
    h.spine(-92, 78, 1.0)
    h.tower(-46, -18, 7.5, tall=False)
    h.visor(hx, 9, 24, 14, n_eyes=3)
    h.antennae(86, -16, 8, -2); h.antennae(86, 16, 8, 2)
    h.livery([(-70, -12), (-70, 12)], (-20, -24 + 2.4), "KOD BB", 2.6, ((-60, -43.4), (-60, 43.4)))
    return h, 104, 86 / 200


def mandate():
    """Carrier: wide and flat, an open axial flight deck, the island offset to port, hangars in both flanks."""
    h = Hull("kes-mandate", u=2.0, cell=7.0)
    hx = 148
    top = [(hx, -22), (hx - 20, -40), (100, -46), (60, -66), (-90, -66), (-120, -56), (-140, -40), (-hx, -28)]
    h.body(sym_pts(top), "url(#kodHull)", sw=0.3)
    # the flight deck: a long dark channel down the axis with a yellow centreline and bay markings
    h.f(rect(-100, -16, 220, 32, "#0b1826", sw=0.3), mid=True)
    h.f(line(-96, 0, 116, 0, stroke=YELLOW, sw=0.5, extra='stroke-dasharray="4 2.5"'))
    for xx in range(-90, 115, 14):
        h.f(line(xx, -15, xx, 15, stroke="#2b4d70", sw=0.18)); h.f(rect(xx + 2, -12.5, 9, 2.2, "#152a40", sw=0.12)); h.f(rect(xx + 2, 10.3, 9, 2.2, "#152a40", sw=0.12))
    h.f(line(116, -16, 116, 16, stroke=WHITE, sw=0.5)); h.f(line(-100, -16, -100, 16, stroke=WHITE, sw=0.5))
    # launch rails at the bow end of the deck
    for yy in (-9, 9): h.f(line(60, yy, 124, yy, stroke="#7f9ab5", sw=0.5))
    for s in (-1, 1):
        # hangar doors in the flanks
        h.f(poly([(58, s * 47), (58, s * 65), (-88, s * 65), (-116, s * 55.5), (-116, s * 47)], SPON), mid=True)
        for (x0, x1) in ((-110, -70), (-62, -22), (-14, 26), (34, 56)):
            h.f(rect(x0, min(s * 49, s * 63), x1 - x0, 14, "#0f2236", stroke=WHITE, sw=0.2), mid=True)
            h.f(line(x0 + 2, s * 56, x1 - 2, s * 56, stroke=YELLOW, sw=0.35, extra='stroke-dasharray="2 1.4"'))
        for xx in (40, 0, -40, -80, -120): h.pdc(xx, s * 42)
        h.pdc(90, s * 36); h.pdc(118, s * 28)
        h.emitter(96, s * 30); h.emitter(-128, s * 36); h.emitter(-20, s * 42)
        h.radiators(-136, s * 44, 4, -2.6, -1.6 * s, 4.0 * s)
    # the island, offset to port (negative y), tall and tiered
    h.module(cham(-84, -46, 80, 28, 2.6), T1); h.module(cham(-74, -43, 56, 22, 2.2), T2, hatches=False)
    h.module(cham(-62, -40, 30, 16, 1.6), T4, hatches=False)
    h.f(rect(-40, -38, 7, 12, "url(#glass)", sw=0.2))
    h.antennae(-33, -32, 12, -2); h.antennae(-60, -46, 0, -10); h.f(circ(-60, -56, 0.8, RED))
    # starboard deck edge modules
    h.module(cham(-80, 20, 50, 20, 2.0), T1); h.module(cham(-20, 20, 60, 20, 2.0), T1)
    h.f(poly([(-146, -27), (-146, 27), (-150, 18), (-150, -18)], T0, sw=0.2), mid=True)
    h.engines(-hx, [-18, -6, 6, 18], 3.6)
    h.spine(-140, -102, 1.0); h.spine(118, 126, 1.0)
    h.visor(hx, 22, 40, 20, n_eyes=3)
    h.livery([(-100, -24), (-100, 24)], (40, 30 + 2.6), "KOD CV", 2.8, ((-88, -66.4), (-88, 66.4)))
    return h, 152, 132 / 296


def charter():
    """Dreadnought, the flagship, one of a kind: a sleek main hull with outboard launcher wings, a stacked command tower, a triple-visor prow array."""
    h = Hull("kes-charter", u=2.2, cell=7.6)
    hx = 188
    main = [(hx, -16), (hx - 24, -36), (120, -42), (40, -52), (-90, -52), (-150, -40), (-176, -28), (-hx, -18)]
    h.body(sym_pts(main), "url(#kodHull)", sw=0.3)
    inner = [(hx - 10, -12), (hx - 30, -29), (114, -34), (36, -42), (-86, -42), (-142, -32), (-168, -22)]
    h.module(sym_pts(inner), PLATE, hatches=False)
    for s in (-1, 1):
        wing = [(70, s * 56), (60, s * 80), (-110, s * 80), (-130, s * 68), (-130, s * 56)]
        h.body(wing, SPON)
        h.strut(30, s * 44, s * 58, 14); h.strut(-40, s * 44, s * 58, 14); h.strut(-112, s * 36, s * 58, 14)
        h.doors(-126, 56, s * 74, 12, 4.4, rows=1)
        h.doors(-126, 56, s * 63, 12, 4.4, rows=1)
        for xx in (-96, -50, -4, 42): h.f(line(xx, s * 57, xx, s * 79.5, sw=0.26))
        h.pdc(64, s * 60); h.pdc(-126, s * 60); h.pdc(-10, s * 60)
        for xx in (120, 60, 0, -60, -120): h.pdc(xx, s * 46)
        h.emitter(150, s * 20); h.emitter(60, s * 46); h.emitter(-60, s * 46); h.emitter(-160, s * 24)
        h.engines(-130, [s * 64], 3.0)
        h.radiators(-128, s * 80, 3, -3, 0, 4.0 * s)
    h.f(poly([(-175, -27), (-175, 27), (-180, 17), (-180, -17)], T0, sw=0.2), mid=True)
    h.engines(-hx, [-14, -7, 0, 7, 14], 2.7)
    # deck modules and the stacked command tower
    h.module(cham(-150, -22, 50, 44, 2.6), T1); h.module(cham(-90, -22, 60, 44, 2.6), T1); h.module(cham(-20, -20, 60, 40, 2.6), T1); h.module(cham(50, -16, 60, 32, 2.4), T1)
    h.module(cham(-80, -14, 40, 28, 2.0), T2, hatches=False); h.module(cham(-72, -9, 24, 18, 1.6), T3, hatches=False)
    h.spine(-172, 150, 1.1)
    h.tower(-74, -36, 9.0, tall=True)
    # the prow array: three visors across a wide blunt head
    h.visor(hx, 16, 16, 22, n_eyes=3)
    for yy in (-27, 27):
        h.f(poly([(hx - 9, yy - 5), (hx - 22, yy - 7), (hx - 22, yy + 7), (hx - 9, yy + 5)], "url(#glass)", sw=0.2), mid=True)
        h.f(line(hx - 15.5, yy - 5.5, hx - 15.5, yy + 5.5, stroke=BLUE, sw=1.0, extra='opacity="0.9"'))
    h.antennae(160, -28, 12, -3); h.antennae(160, 28, 12, 3)
    h.livery([(-140, -16), (-140, 16)], (20, -30 + 3), "KOD CHARTER", 3.0, ((-110, -80.4), (-110, 80.4)))
    return h, 194, 160 / 376


DEFS = ('<linearGradient id="kodHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10202f"></stop><stop offset="0.28" stop-color="#27486a"></stop>'
        '<stop offset="0.5" stop-color="#3d6a96"></stop><stop offset="0.72" stop-color="#27486a"></stop><stop offset="1" stop-color="#10202f"></stop></linearGradient>'
        '<linearGradient id="kodHullCiv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5866"></stop><stop offset="0.28" stop-color="#6d8294"></stop>'
        '<stop offset="0.5" stop-color="#8aa2b6"></stop><stop offset="0.72" stop-color="#6d8294"></stop><stop offset="1" stop-color="#4a5866"></stop></linearGradient>'
        '<linearGradient id="marsHullCiv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4c44"></stop><stop offset="0.28" stop-color="#9a6f61"></stop>'
        '<stop offset="0.5" stop-color="#b08477"></stop><stop offset="0.72" stop-color="#9a6f61"></stop><stop offset="1" stop-color="#6a4c44"></stop></linearGradient>')

NOTES = {
    "kes-citation": ["Corvette, the newest KOD hull: a slim core between two outboard engine pods, one bay door on each pod, a single visor eye. More engine than ship, built to catch dark ships before the gate."],
    "warrant": ["Patrol boat for gate duty: the compact stepped body, sponsons with two doors a side, a two-tier superstructure under the spine, twin shielded engines, toll bands round the head."],
    "kessari-brig": ["Frigate, line escort, an older design: a trimaran. Two long launcher pods held off the crew hull on struts, four doors each, their own small engines; the core carries the bridge and the main drive. The old Earth way of building a missile ship."],
    "kes-verdict": ["Destroyer for Marches convoy work: long and angular, a narrow forward section carrying a sensor tower, a wide mid-body with an unbroken broadside of six doors a side, a tiered aft castle over three engines."],
    "kes-statute": ["Cruiser, Gate War era, the oldest big hull still in service: two hull blocks joined by an exposed girder truss with pipework along it, launcher banks on both, a tall old-fashioned bridge, big ribbed radiators, patched plating. It looks its age."],
    "kes-precedent": ["Battleship, post-Dimming, the newest capital: low and sleek, three layered armour plates, recessed bays with no white framing, rounded chamfers, a low wide bridge, four engines in a row. Almost no clutter on purpose."],
    "kes-mandate": ["Carrier: wide and flat, an open axial flight deck with a yellow centreline and launch rails at the bow, the bridge island offset to port, hangar doors in both flanks. Asymmetric on purpose."],
    "kes-charter": ["Dreadnought, the flagship, one of a kind: a Precedent-style main hull with outboard launcher wings on struts, two rows of doors on each, a stacked command tower, a wide prow array with three visors, five main engines and one in each wing."],
}


def all_art():
    syms, meta = [], {}
    for fn in (citation, warrant, injunction, verdict, statute, precedent, mandate, charter):
        h, R, _ = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.28 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
        if fn in (citation, warrant):
            hc, _, _ = fn(civ=True); syms.append(hc.symbols(R)); meta[h.key]["civ"] = True
    return DEFS, "".join(syms), meta
