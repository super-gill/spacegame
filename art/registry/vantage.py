"""Vantage Aerospace fighters: the Foil (light) and the Sabre (heavy).

Luna company, founded in the Gate War to arm Earth's first carriers. Names its
craft for blades. Own vocabulary, not KOD's: a long slim fuselage like a blade,
a hilt where the engines sit, a one-piece dark canopy, short chamfered wing
stubs that carry the guns or the missile rails, Vantage's pale grey over steel
blue, a white chevron on each stub. Earth Charter Fleet markings because they fly off
Mandate decks. Nose points +x.
"""
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, mirror, P, INK, T0, T1, T2, T3, WHITE, GLASS, BLUE, RED, GREEN, YELLOW, SHADOW

GREY = "#aab8c6"; GREY2 = "#8e9eae"; STEEL = "#2f5273"; CANOPY = "#0a1622"; BLADE = "#cfd9e2"


def chevron(h, x, y, w, s, col=WHITE):
    """A Vantage chevron pointing forward on a wing stub; s is the side sign."""
    h.f(f'<polyline points="{x - w * 0.5:.2f},{y - s * w * 0.35:.2f} {x + w * 0.5:.2f},{y:.2f} {x - w * 0.5:.2f},{y + s * w * 0.35:.2f}" fill="none" stroke="{col}" stroke-width="0.28" stroke-linejoin="round"></polyline>')


def canopy(h, x0, x1, hw):
    h.f(poly([(x1, -hw * 0.45), (x1 - (x1 - x0) * 0.2, -hw), (x0, -hw), (x0, hw), (x1 - (x1 - x0) * 0.2, hw), (x1, hw * 0.45)], CANOPY, stroke="#9fb7cf", sw=0.16), mid=True)
    h.f(line(x0 + 0.4, -hw * 0.55, x1 - 0.8, -hw * 0.2, stroke=BLUE, sw=0.14, extra='opacity="0.6"'))
    h.f(line(x0 + (x1 - x0) * 0.45, -hw, x0 + (x1 - x0) * 0.45, hw, stroke="#9fb7cf", sw=0.12))


def gunbarrel(h, x0, x1, y, w):
    h.f(rect(x0, y - w / 2, x1 - x0, w, GREY2, sw=0.12), mid=True)
    h.f(rect(x1 - 0.5, y - w * 0.3, 0.5, w * 0.6, "#060a0f", stroke="none", sw=0))


def nozzle(h, x_stern, y, hh):
    h.full.insert(0, ell(x_stern - hh * 1.4, y, hh * 1.8, hh * 0.7, BLUE, 'opacity="0.5" filter="url(#glowSoft)"'))
    h.mid.insert(0, ell(x_stern - hh * 1.4, y, hh * 1.8, hh * 0.7, BLUE, 'opacity="0.5" filter="url(#glowSoft)"'))
    h.f(poly([(x_stern + 1.4, y - hh * 0.6), (x_stern - 0.6, y - hh), (x_stern - 0.6, y + hh), (x_stern + 1.4, y + hh * 0.6)], "#5d738a", sw=0.14), mid=True)
    h.f(ell(x_stern - 0.55, y, 0.3, hh * 0.75, "#060a0f")); h.f(ell(x_stern - 0.55, y, 0.18, hh * 0.5, BLUE, 'opacity="0.9"'))


def foil(civ=False):
    """Light fighter: one blade, one engine, twin nose guns, a single-seat canopy."""
    h = Hull("kes-light", u=0.35, cell=1.6, civ=civ)
    # the blade: a long slim fuselage, widest just behind the cockpit, tapering to a chamfered nose
    h.body(cham(-7.0, -2.3, 3.8, 4.6, 0.6), STEEL, grid=False)
    top = [(7.2, -0.55), (6.4, -1.0), (2.0, -1.5), (-1.5, -1.75), (-4.2, -1.75), (-5.4, -1.3), (-6.0, -1.3)]
    h.body(sym_pts(top), "url(#vanHull)")
    # wing stubs: short chamfered blades canted back, one gun each at the root
    for s in (-1, 1):
        stub = [(0.6, s * 1.5), (-0.6, s * 3.6), (-3.4, s * 3.6), (-3.8, s * 2.8), (-3.0, s * 1.5)]
        h.body(stub, GREY, grid=False)
        chevron(h, -1.9, s * 2.75, 1.3, s, col=STEEL)
        gunbarrel(h, -1.6, 3.2, s * 1.7, 0.32)
        # stub-tip light
        h.f(circ(-0.9, s * 3.4, 0.16, RED if s < 0 else GREEN))
    nozzle(h, -7.0, 0, 1.1)
    # dorsal detail: a pale blade stripe and panel seams
    h.f(rect(-4.0, -0.22, 8.6, 0.44, BLADE, sw=0.1), mid=True)
    for xx in (-3.0, -0.8, 1.6): h.f(line(xx, -1.5, xx, 1.5, sw=0.12, extra='opacity="0.7"'))
    canopy(h, 1.8, 4.6, 0.85)
    # sensor nose
    h.f(poly([(7.2, -0.55), (7.9, -0.25), (7.9, 0.25), (7.2, 0.55)], GLASS, sw=0.12), mid=True)
    h.f(line(7.55, -0.3, 7.55, 0.3, stroke=BLUE, sw=0.2))
    # Earth Charter Fleet flash on the hilt
    if civ:
        h.f(circ(-4.9, 0, 0.42, YELLOW, stroke=INK, sw=0.08)); h.f(circ(-4.9, 0, 0.16, INK))
    else:
        h.f(circ(-4.9, -1.75, 0.38, WHITE, stroke=INK, sw=0.08)); h.f(circ(-4.9, 1.75, 0.38, WHITE, stroke=INK, sw=0.08))
        h.f(f'<text x="-2.4" y="{-1.95:.2f}" font-family="IBM Plex Mono, monospace" font-size="0.6" fill="{WHITE}" opacity="0.7" text-anchor="middle">VF</text>')
    return h, 8.4


def sabre():
    """Heavy fighter: a broader blade, two engines, two seats, missile rails under longer stubs."""
    h = Hull("kes-heavy", u=0.45, cell=2.0)
    top = [(10.0, -0.8), (9.0, -1.5), (3.5, -2.3), (-1.0, -2.6), (-5.5, -2.6), (-7.5, -2.0), (-8.4, -2.0)]
    h.body(cham(-9.6, -3.6, 4.6, 7.2, 0.8), STEEL, grid=False)
    h.body(sym_pts(top), "url(#vanHull)")
    for s in (-1, 1):
        # longer stubs, swept back, with a missile rail along the trailing edge
        stub = [(1.0, s * 2.3), (-1.4, s * 5.6), (-5.4, s * 5.6), (-6.0, s * 4.6), (-4.6, s * 2.3)]
        h.body(stub, GREY, grid=False)
        chevron(h, -3.2, s * 4.2, 1.6, s, col=STEEL)
        # rail with three missiles along the outer edge of the stub
        ry = min(s * 5.6, s * 6.1); h.f(rect(-5.2, ry, 3.8, 0.5, GREY2, sw=0.1), mid=True)
        my = min(s * 6.1, s * 6.8)
        for i in range(3):
            mx = -4.8 + i * 1.3
            h.f(rect(mx, my, 1.0, 0.7, "#dde5ec", sw=0.1, rx=0.1)); h.f(circ(mx + 1.0, s * 6.45, 0.14, "#ff9a8a"))
        gunbarrel(h, -2.0, 4.4, s * 2.6, 0.4)
        h.f(circ(-1.8, s * 5.3, 0.2, RED if s < 0 else GREEN))
        nozzle(h, -9.6, s * 1.8, 1.2)
    # blade stripe and seams
    h.f(rect(-6.0, -0.28, 12.5, 0.56, BLADE, sw=0.1), mid=True)
    for xx in (-5.0, -2.6, 0.0, 2.6): h.f(line(xx, -2.3, xx, 2.3, sw=0.12, extra='opacity="0.7"'))
    # tandem canopy, longer
    canopy(h, 2.0, 7.0, 1.1)
    # dorsal sensor fairing behind the canopy
    h.module(cham(-3.6, -1.1, 3.4, 2.2, 0.4), T3, hatches=False)
    h.f(poly([(10.0, -0.8), (10.9, -0.35), (10.9, 0.35), (10.0, 0.8)], GLASS, sw=0.12), mid=True)
    h.f(line(10.45, -0.4, 10.45, 0.4, stroke=BLUE, sw=0.25))
    h.f(circ(-6.6, -2.3, 0.5, WHITE, stroke=INK, sw=0.08)); h.f(circ(-6.6, 2.3, 0.5, WHITE, stroke=INK, sw=0.08))
    h.f(f'<text x="-2.0" y="{-2.85:.2f}" font-family="IBM Plex Mono, monospace" font-size="0.7" fill="{WHITE}" opacity="0.7" text-anchor="middle">VS</text>')
    return h, 11.6


DEFS = ('<linearGradient id="vanHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3a55"></stop><stop offset="0.3" stop-color="#3a6690"></stop>'
        '<stop offset="0.5" stop-color="#4f80ae"></stop><stop offset="0.7" stop-color="#3a6690"></stop><stop offset="1" stop-color="#1d3a55"></stop></linearGradient>')

NOTES = {
    "kes-light": ["Vantage Foil, light fighter: one long slim blade of a fuselage, a single engine in a short hilt, a one-seat canopy, two guns at the roots of short canted stubs. Pale grey stubs over steel blue, a Vantage chevron on each, a Earth Charter Fleet flash on the hilt."],
    "kes-heavy": ["Vantage Sabre, heavy fighter: the broader blade, two engines in a split hilt, a tandem canopy with a sensor fairing behind it, heavier guns, and three missiles on a rail under each longer stub. Behind a licence."],
}


def all_art():
    syms, meta = [], {}
    for fn in (foil, sabre):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.1, h.xmax * 1.1)
        aspect = min(1.0, (h.ymax * 1.35 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
        if fn is foil:
            hc, _ = fn(civ=True); syms.append(hc.symbols(R)); meta[h.key]["civ"] = True
    return DEFS, "".join(syms), meta
