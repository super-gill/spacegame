"""Art pass five: the gap-pass hulls. Meridian Dunlin; Corvane Pithead; Arcadia Miner Mk II and Mk I; Belt Forge Rime and the old Rime; Rook and Rivet Gantry; Arcadia Tender Mk 0; Lavinia Breeze; Halden Footnote; Arbor Tendril and Halden Probe (machines, never fighter-shaped). Nose +x. Every part ties to the hull."""
import math
from kod import Hull, cham, sym_pts, poly, rect, line, circ, ell, SHADOW, RED, GREEN
from indep import MER0, MER1, MER2, MSEAM, YEL, COR0, COR1, COR2, COR3, CSEAM, ORANGE, HAZ
from pass4 import Bird, Corv
from civil import Civil, AB0, AB1, AB2, ARUST, ASEAM
from beltciv import BeltCivil, TRUSS
from belt import BeltParts as B, GUN, GUN2, DARKG, BSEAM, HAZY
from venus import SEA, SEA2, SEA3, OLIVE
from venciv import VenCivil, LAV0, LAV1, LAV2, HOT, HAL0, HAL1, BRASS, BRASS2, ARB0, ARB2


def mars_laser(h, x, y, r, old=False):
    """A Martian mining laser in an armoured cupola: plate ring, short thick barrel, a hot emitter."""
    h.f(circ(x + 0.3, y + 0.3, r * 1.1, SHADOW))
    h.f(circ(x, y, r, AB0, stroke=ASEAM, sw=0.18), mid=True)
    h.f(circ(x, y, r * 0.62, AB1 if not old else AB2, stroke=ASEAM, sw=0.12), mid=True)
    h.f(rect(x, y - r * 0.22, r * 1.7, r * 0.44, AB0, stroke=ASEAM, sw=0.12), mid=True)
    h.f(circ(x + r * 1.75, y, r * 0.2, "#ff6a3a")); h.f(circ(x + r * 1.75, y, r * 0.45, "#ff6a3a", extra='opacity="0.3"'))


def dunlin():
    """Meridian Dunlin, prospector: a Gull box with a light mining laser on the standard ring forward, a small ore hold aft with a yellow-ringed hatch, a survey pip, one box engine, the band. The first miner anyone buys."""
    h = Bird("mer-dunlin", 0.6, 2.6, False)
    h.hullbox(-11, -4.5, 23, 9, 2.8)
    for s in (-1, 1): h.bolts(-9, 10, s * 3.6, 8)
    h.f(rect(-9, -3.0, 8, 6.0, MER0, stroke=MSEAM, sw=0.16, rx=0.6), mid=True)
    for k in range(3): h.f(line(-8 + k * 2.4, -2.6, -8 + k * 2.4, 2.6, stroke=MSEAM, sw=0.1))
    h.f(circ(-5, 0, 1.4, "none", stroke=YEL, sw=0.25))
    h.ring_mount(4, -2.4, 1.5)
    h.f(rect(4, -2.75, 4.6, 0.7, MER2, stroke=MSEAM, sw=0.1), mid=True); h.f(circ(8.8, -2.4, 0.4, "#ff9a3a")); h.f(circ(8.8, -2.4, 0.8, "#ff9a3a", extra='opacity="0.3"'))
    h.f(circ(4, 2.6, 0.9, MER1, stroke=MSEAM, sw=0.12), mid=True); h.f(line(4, 2.6, 5.4, 2.6, stroke=MSEAM, sw=0.12))
    h.box_engine(-11, 0, 3.6, 4.4)
    h.band(1, 4.5)
    h.canopy(9.6, 1.0, 1.8, 1.6)
    h.nav((-9, -4.8), (-9, 4.8))
    h.stencil(-1.8, 3.6, "MY", 0.9, MSEAM)
    return h, 14


def pithead():
    """Corvane Pithead, heavy miner: a dark slab with two heavy mining lasers on armoured mounts forward, a charge rig, a sorting hopper in four bins amidships, ore bays to the flanks, twin gun blisters, hazard paint, three engines. Earth's mining, done by the nearest thing Earth has to a mining navy."""
    h = Corv("cor-pithead", 1.2, 4.6, False)
    h.hullbox(sym_pts([(36, -8), (30, -13), (-30, -13), (-36, -9)]))
    for s in (-1, 1):
        h.f(circ(26, s * 7, 3.0, COR1, stroke=CSEAM, sw=0.2), mid=True); h.f(circ(26, s * 7, 1.8, COR2, stroke=CSEAM, sw=0.12), mid=True)
        h.f(rect(26, s * 7 - 0.7, 10, 1.4, COR2, stroke=CSEAM, sw=0.14), mid=True)
        h.f(rect(34.5, s * 7 - 1.0, 2.0, 2.0, COR0, stroke=CSEAM, sw=0.12), mid=True)
        h.f(circ(37.2, s * 7, 0.6, "#ff9a3a")); h.f(circ(37.2, s * 7, 1.3, "#ff9a3a", extra='opacity="0.3"'))
        h.orebay(-24, min(s * 4.5, s * 12), 20, 7.5)
        h.blister(-4, s * 10.5, 2.2)
        h.hazard(10, s * 12.6 - (0.9 if s > 0 else 0), 14, 0.9)
        h.pipes(-28, -6, [s * 11.8])
    # sorting hopper: four bins of different ore down the centre
    cols = ["#7d7f84", "#b5713f", "#3a3d42", "#d8dce0"]
    for k in range(4):
        x = -2 + k * 5.4
        h.f(rect(x, -3.4, 4.8, 6.8, HAZ, stroke=CSEAM, sw=0.16), mid=True)
        for j in range(5): h.f(circ(x + 1 + (j % 3) * 1.4, -2 + (j // 3) * 2.6 + (k % 2) * 0.6, 0.6, cols[k], stroke=CSEAM, sw=0.08))
    h.f(rect(-2, -3.9, 21.6, 0.5, ORANGE, stroke="none", sw=0))
    h.f(rect(18, -2.0, 4, 4.0, COR1, stroke=CSEAM, sw=0.14), mid=True)
    for k in range(3): h.f(rect(18.6 + k * 1.1, -1.6, 0.7, 3.2, ORANGE, stroke="none", sw=0, extra='opacity="0.85"'))
    h.engines(-36, (-6, 0, 6), 4.0)
    h.bridge_box(-14, -3.5, 7, 7, dark=True)
    h.nav((-28, -13.4), (-28, 13.4))
    h.corvane(4, 9.4, 1.4)
    return h, 40


def arc_miner(old=False):
    """Arcadia Miner Mk II: a slab of bolted plate, two mining lasers in armoured cupolas forward, a small armoured ore hold in two bays, the slit, two engines in a skirt. Mars never contracts its supply out. The Mk I has one laser and a plainer hold."""
    h = Civil("arc-miner-mk1" if old else "arc-miner", 0.9, 3.6, old, "arc")
    h.a_body(sym_pts([(22, -4.5), (18, -8), (-18, -8), (-22, -5.5)]))
    h.a_plate([(14, -7.2), (-16, -7.2), (-16, -2.4), (14, -2.4)], bolts=not old); h.a_plate([(14, 7.2), (-16, 7.2), (-16, 2.4), (14, 2.4)], bolts=not old)
    h.a_bays(-15, 2, -4.8, 2, 3.6); h.a_bays(-15, 2, 4.8, 2, 3.6)
    if old: mars_laser(h, 10, 0, 2.6, True)
    else:
        mars_laser(h, 9, -4.6, 2.4); mars_laser(h, 9, 4.6, 2.4)
        h.a_chevrons(-14, 6, -7.8, 7, -1)
    h.a_skirt(-22, 5.4, 2.4); h.a_engines(-22, [-2.4, 2.4], 1.9)
    h.a_slit(19, 2.6)
    h.a_livery((-6, 0.6), "MINER MK I" if old else "MINER MK II", 1.1, ((-16, -8.3), (-16, 8.3)))
    return h, 26


def rime(old=False):
    """Belt Forge Rime, light ice cutter: a Prospector frame with an ice saw on the boom where the laser was, an open ice hopper of slabs, the cab, one engine, hazard paint. The old Rime has a smaller saw, a thinner hopper and patches."""
    h = BeltCivil("bf-rime-old" if old else "bf-rime", 0.7, 3.0, old)
    h.frame(-10, 6, -1.8, 1.8, 2.5)
    h.hull(cham(-3, -3.2, 10, 6.4, 1.0))
    h.cab(1, -2.0, 5.5, 4.0)
    h.boom(3, -3.0, 7 if old else 8, -1, "saw")
    h.hopper(-9, 2.2, 8, 3.2, 0.6, ice=True, tie=1.8)
    B.engine(h, -11, 0, 2.2)
    if not old: h.spare_mount(-1, 4.6, 0.9)
    h.finish((-4, 0.8), "RIME", 0.8, ((-2.6, -3.5), (-8.6, 5.6)), hazard=(2, 3.6, 4, 0.5))
    return h, 14


def gantry():
    """Rook and Rivet Gantry, heavy salvage tender: a gunmetal frame with a hull cradle open down the middle, four cranes standing on the side frames, scrap racks bolted to the frames aft, a forward block with the cab and a tow clamp, a Grab bay and two engines on the aft frame. The step between taking parts and taking ships."""
    h = BeltCivil("rr-gantry", 1.2, 4.6)
    h.frame(-40, 22, -13, -8, 4.0); h.frame(-40, 22, 8, 13, 4.0)
    for xx in (-36, -8, 16): h.frame(xx - 2, xx + 2, -8, 8, 3.0)
    h.f(rect(-30, -7, 44, 14, "#07090b", stroke=BSEAM, sw=0.24), mid=True)
    for xx in range(-28, 14, 6): h.f(rect(xx, -6.4, 1.2, 12.8, GUN, stroke=BSEAM, sw=0.1))
    h.f(poly([(-24, -3.5), (8, -4), (11, 0), (8, 4), (-24, 3.5)], "#3a3f45", stroke=BSEAM, sw=0.16, extra='opacity="0.85"'))
    h.f(line(-6, -4, -4, 4, stroke=HAZY, sw=0.2, extra='stroke-dasharray="0.8 0.8"'))
    for s in (-1, 1):
        h.crane(-20, s * 10.5, 14, s * -1); h.crane(2, s * 10.5, 12, s * -1)
        h.scrap(-39, min(s * 8.5, s * 12.5), 10, 4.0)
    h.hull(cham(22, -10, 8, 20, 1.4), "url(#rrHull)")
    h.clamp(30, 8)
    h.cab(23, -6, 6, 4)
    h.f(rect(-46, -4.5, 6, 9, "#0f2236", stroke=HAZY, sw=0.16), mid=True)
    h.f(rect(-46, -13, 6, 26, "#101214", stroke=BSEAM, sw=0.16), mid=True)
    h.f(rect(-45.5, -4.5, 5, 9, "#0f2236", stroke=HAZY, sw=0.16), mid=True)
    h.engines(-47, [-9, 9], 2.6)
    h.finish((-6, 11.2), "GANTRY", 1.3, ((-38, -13.4), (-38, 13.4)), hazard=(14, 9, 6, 0.8))
    h.ymax = 15; h.xmin = -53
    return h, 44


def tender_mk0():
    """Arcadia Tender Mk 0: the repair tender before the Mk I. One crane arm, an open parts rack, a smaller workshop block, two engines, plainer plate. The only used repair hull anyone can buy."""
    h = Civil("arc-tender-mk0", 1.0, 4.0, True, "arc")
    h.a_body(sym_pts([(30, -5.5), (26, -9), (-24, -9), (-30, -6.5)]))
    h.a_plate([(22, -8.2), (-20, -8.2), (-20, -2.8), (22, -2.8)], bolts=False); h.a_plate([(22, 8.2), (-20, 8.2), (-20, 2.8), (22, 2.8)], bolts=False)
    h.a_bays(-18, 0, -5.5, 2, 4.0)
    h.f(rect(-18, 3.2, 18, 4.6, AB0, stroke=ASEAM, sw=0.16), mid=True)
    for k in range(5): h.f(rect(-17 + k * 3.4, 3.8, 2.4, 3.4, ["#7a6f5a", "#9a8f78", ARUST][k % 3], stroke=ASEAM, sw=0.1))
    h.module(cham(4, -4.2, 14, 8.4, 1.0), AB2, hatches=False)
    h.f(rect(6, -9.6, 12, 1.2, AB0, stroke=ASEAM, sw=0.14, rx=0.4), mid=True)
    h.f(circ(18, -9, 0.9, AB0, stroke=ASEAM, sw=0.12)); h.f(rect(18, -9.4, 4.5, 0.8, AB0, stroke=ASEAM, sw=0.12, rx=0.3), mid=True); h.f(circ(22.5, -9, 0.5, ARUST))
    h.a_skirt(-30, 7, 3.0); h.a_engines(-30, [-2.8, 2.8], 1.9)
    h.a_slit(25, 2.8)
    h.a_livery((11, 0.8), "MK 0", 1.3, ((-22, -9.3), (-22, 9.3)))
    h.ymax = 10.5
    return h, 32


def breeze():
    """Lavinia Breeze, the skimmer before the Zephyr: a small, plain teal egg, a shallow scoop, one gas tank under the spine, three radiator fins a side, a small dome, two nacelles. Shallow only; comes back hot."""
    h = VenCivil("lav-breeze", 0.75, 3.0, "lavHull")
    w = h.shell(26, 5.8, 0.3, band=(-8, 6, LAV0))
    for s in (-1, 1):
        h.nacelle(-12, s * 4.8, 10, 1.9, fill=LAV0)
        h.radiator(-9, -5, s * (w(-7) - 0.5), 3, 1.8, s)
    h.gastank(-6, 0, 10, 1.6)
    h.scoop(13, w(12) * 0.9, 3.2)
    h.dome(5, 0, 2.0)
    h.f(rect(-2, -3.0, 3, 1.6, LAV1, stroke=OLIVE, sw=0.12, rx=0.4), mid=True)
    h.stencil(-2, 3.8, "BREEZE", 0.7, LAV2)
    h.navl(w, -7)
    h.ymax = 7.5
    return h, 15


def footnote():
    """Halden Footnote, the survey hull before the Query: a small slate egg with one brass-ringed dish, no lab, a short mast rail, two nacelles. One dish, no lab; the prospector's cheap scanner."""
    h = VenCivil("hal-footnote", 0.7, 2.8, "hdnHull")
    w = h.shell(24, 5.2, 0.35, band=(-8, 6, BRASS))
    for s in (-1, 1): h.nacelle(-11, s * 4.3, 10, 1.7, fill=HAL0)
    h.dish(4, 0, 3.4)
    h.array(-8, -2, -(w(-5) - 0.4), 3)
    h.f(rect(-7, 0.6, 5, 2.2, HAL1, stroke=OLIVE, sw=0.12, rx=0.6), mid=True)
    h.window(10.4, w(10.4) * 0.7)
    h.stencil(-4.5, 2.2, "HALDEN", 0.7, BRASS2)
    h.navl(w, -7)
    return h, 13


def tendril():
    """Arbor Tendril, collector drone: a machine, not a craft. A green ring frame round a collection basket, a tractor emitter forward, a canister clamp under the basket, four thruster pods on short arms. Gathers cut ore, ice blocks and loose salvage for the mother ship."""
    h = Hull("arb-tendril", 0.4, 1.6); h.stroke = OLIVE
    pts = [(math.cos(math.radians(a)) * 3.0, math.sin(math.radians(a)) * 3.0) for a in range(0, 360, 20)]
    h.body(pts, ARB0, grid=False, sw=0.2)
    h.f(circ(0, 0, 2.2, "#0b1412", stroke=OLIVE, sw=0.12), mid=True)
    for a in range(0, 180, 30): h.f(line(math.cos(math.radians(a)) * 2.1, math.sin(math.radians(a)) * 2.1, -math.cos(math.radians(a)) * 2.1, -math.sin(math.radians(a)) * 2.1, stroke=ARB2, sw=0.1, extra='opacity="0.7"'))
    h.f(rect(-0.9, -0.6, 1.8, 1.2, "#7d7f84", stroke=OLIVE, sw=0.1)); h.f(rect(-0.3, 0.2, 1.1, 0.9, "#cfe7ee", stroke=OLIVE, sw=0.08))
    for a in (45, 135, 225, 315):
        x, y = math.cos(math.radians(a)) * 3.0, math.sin(math.radians(a)) * 3.0
        h.f(line(x, y, x * 1.35, y * 1.35, stroke=ARB2, sw=0.4)); h.f(circ(x * 1.4, y * 1.4, 0.6, ARB2, stroke=OLIVE, sw=0.12), mid=True); h.f(circ(x * 1.4, y * 1.4, 0.25, SEA2))
    h.f(rect(3.0, -0.4, 1.4, 0.8, ARB2, stroke=OLIVE, sw=0.1), mid=True); h.f(circ(4.6, 0, 0.45, "#9fe3ff")); h.f(circ(4.6, 0, 1.0, "#9fe3ff", extra='opacity="0.3"'))
    h.ymax = 4.5
    return h, 6


def probe():
    """Halden Probe, survey drone: a machine. A slate spindle carrying a small brass dish forward and a fan of sensor masts, one thruster aft, no cockpit. Launched from a bay, reads a system and does not come back."""
    h = Hull("hal-probe", 0.35, 1.4); h.stroke = OLIVE
    h.body([(3.0, -0.6), (3.0, 0.6), (-3.4, 0.9), (-3.4, -0.9)], HAL0, grid=False, sw=0.18)
    h.f(circ(3.2, 0, 1.5, HAL1, stroke=OLIVE, sw=0.14), mid=True)
    for k in (0.7, 0.4): h.f(circ(3.2, 0, 1.5 * k, "none", stroke=BRASS, sw=0.1))
    h.f(circ(3.2, 0, 0.2, BRASS2))
    for s in (-1, 1):
        for k, a in ((0, 30), (1, 55)):
            x0 = -1.0 - k * 1.2
            x1, y1 = x0 - math.cos(math.radians(a)) * 2.0, s * (0.7 + math.sin(math.radians(a)) * 2.0)
            h.f(line(x0, s * 0.7, x1, y1, stroke=BRASS, sw=0.12)); h.f(circ(x1, y1, 0.2, BRASS2))
    h.f(rect(-4.2, -0.7, 0.9, 1.4, "#0b1216", stroke=OLIVE, sw=0.1), mid=True); h.f(circ(-4.3, 0, 0.35, "#9fe3ff"))
    h.f(line(-2.6, 0, 1.4, 0, stroke=BRASS, sw=0.14, extra='opacity="0.8"'))
    h.ymax = 3.0
    return h, 6


NOTES = {
    "mer-dunlin": ["Meridian Dunlin, prospector: a Gull box with a light mining laser on the standard ring forward, a small ore hold aft with a yellow-ringed hatch, a survey pip, the canopy, one box engine, the band. The first miner anyone buys, sold everywhere; outgrown fast."],
    "cor-pithead": ["Corvane Pithead, heavy miner: a dark slab with two heavy mining lasers on armoured mounts at the bow, a charge rig, a sorting hopper in four bins of different ore down the centre, ore bays to both flanks, twin gun blisters, pipework, hazard paint, three engines. Earth's mining, done by the nearest thing Earth has to a mining navy."],
    "arc-miner": ["Arcadia Miner Mk II: a slab of bolted plate with two mining lasers in armoured cupolas forward, a small armoured ore hold in two bays a side, rust chevrons, the slit, two engines in a skirt. Mars never contracts its supply out."],
    "arc-miner-mk1": ["Arcadia Miner Mk I: the same slab with one laser cupola on the centreline, plainer plate and no chevrons. Mars does not scrap; the colonies cut with these."],
    "bf-rime": ["Belt Forge Rime, light ice cutter: a Prospector frame with an ice saw on the boom where the laser was, an open hopper of ice slabs strutted to the frame, the cab, one engine, a spare mount, hazard paint. The first ice anyone cuts."],
    "bf-rime-old": ["The old Rime: a shorter saw boom, the hopper, no spare mount, patched. A saw on a frame; there is not much to wear out."],
    "rr-gantry": ["Rook and Rivet Gantry, heavy salvage tender: a gunmetal frame with a hull cradle open down the middle and a wreck section in it, four cranes on posts along both frames, scrap racks, a forward block with the cab and a tow clamp, a Grab bay aft, two engines. The step between taking parts and taking ships."],
    "arc-tender-mk0": ["Arcadia Tender Mk 0: the repair tender before the Mk I. One crane arm, two parts bays and an open parts rack, a smaller workshop block, plainer plate, two engines. The only used repair hull anyone can buy; Solace's marks do not age."],
    "lav-breeze": ["Lavinia Breeze, the skimmer before the Zephyr: a small plain teal egg, a shallow scoop, one gas tank on the spine, three radiator fins a side, a small dome, two nacelles. Shallow only, comes back hot; every skimmer pilot's first."],
    "hal-footnote": ["Halden Footnote, the survey hull before the Query: a small slate egg with one brass-ringed dish, a short mast rail, a plain cabin block and no lab, two nacelles. One dish, no lab; the prospector's cheap scanner."],
    "arb-tendril": ["Arbor Tendril, collector drone: a machine, not a craft. A green ring frame round a collection basket holding ore and an ice block, a tractor emitter forward, four thruster pods on short arms. Gathers cut ore, ice blocks and loose salvage for the mother ship."],
    "hal-probe": ["Halden Probe, survey drone: a machine. A slate spindle with a small brass-ringed dish forward, four sensor masts fanned back, one thruster aft, no cockpit. Launched from a bay, reads a system and does not come back."],
}


def all_art():
    syms, meta = [], {}
    for fn in (dunlin, pithead, lambda: arc_miner(False), lambda: arc_miner(True), lambda: rime(False), lambda: rime(True), gantry, tender_mk0, breeze, footnote, tendril, probe):
        h, R = fn()
        R = max(R, abs(h.xmin) * 1.08, h.xmax * 1.08)
        aspect = min(1.0, (h.ymax * 1.3 + 2 * h.u) / R)
        syms.append(h.symbols(R))
        meta[h.key] = dict(radius=round(R, 1), aspect=round(aspect, 3), notes=NOTES[h.key])
    return "", "".join(syms), meta
