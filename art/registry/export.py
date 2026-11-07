"""Stage 1 of the ship pipeline (docs/ship-pipeline.md): from the registry's art to what the game reads.

    python3 export.py

Builds the registry (build.py) into a temporary page, reads every hull from it as SVG, and writes
`art/ships/` (committed with every art change):

- `ships.json`: per hull, keyed by its game id where it has one (else its registry key): name, maker,
  class, power, radius, outline, the mounts the picture shows, liveries, and the registry key.
- `svg/<id>-<livery>.svg`: the **bare** hull (no marked mounts), self-contained, frame of plus
  and minus the radius, nose along +x.
- `turrets/<gun>-<size>.svg` and `turrets.json`: the weapon pictures (turrets.py).
- `report.md`: for every hull in the game, its mounts in the art against the game's (`hulls.ts`), so
  step 2 can settle them hull by hull.

It reads the art as SVG rather than from the Python objects, because some hulls are hand-written in
`base/registry-base.html` (the Tern, the Walkout) and every hull ends up as SVG however it was made.
A mount is a group marked `data-mount` (kod.py `Hull.mount`, or the attribute by hand).

Standard library only. Fails, writing nothing, if a check fails.
"""

import json
import math
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

import turrets

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "art", "ships")
GAME_HULLS = os.path.join(REPO, "packages", "sim", "src", "hulls.ts")
OUTLINE_POINTS = 24
SVG_NS = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'


def build_registry():
    """The registry page as build.py writes it."""
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, "registry.html")
        subprocess.run([sys.executable, "build.py", "base/registry-base.html", page], cwd=HERE, check=True, stdout=subprocess.DEVNULL)
        return open(page).read()


# ------------------------------------------------------------------ reading SVG

def symbols(page):
    """Symbol id to (viewBox, inner SVG). The last definition wins, as in a browser."""
    out = {}
    for sid, vb, body in re.findall(r'<symbol id="([^"]+)"[^>]*?viewBox="([^"]+)"[^>]*>(.*?)</symbol>', page, re.S):
        out[sid] = (vb, body)
    return out


def defs_by_id(page):
    """Every element with an id in the page's defs blocks, by id, as SVG text."""
    out = {}
    for block in re.findall(r"<defs>(.*?)</defs>", page, re.S):
        try:
            root = ET.fromstring(f"<defs {SVG_NS}>{block}</defs>")
        except ET.ParseError:
            continue
        for el in root:
            if el.get("id"):
                out[el.get("id")] = ET.tostring(el, encoding="unicode").replace("ns0:", "").replace(":ns0", "").replace(' xmlns="http://www.w3.org/2000/svg"', "")
    return out


def referenced(svg, defs):
    """The defs an SVG fragment needs, following references inside defs too."""
    need, seen = re.findall(r'(?:url\(#|href="#)([^)"]+)', svg), []
    while need:
        i = need.pop()
        if i in seen or i not in defs:
            continue
        seen.append(i)
        need += re.findall(r'(?:url\(#|href="#)([^)"]+)', defs[i])
    return [defs[i] for i in sorted(seen)]


def strip_marked(svg):
    """The SVG without its marked mount groups (nested groups handled)."""
    out, i = [], 0
    while True:
        m = re.search(r"<g\b[^>]*\bdata-mount=", svg[i:])
        if not m:
            out.append(svg[i:])
            break
        start = i + m.start()
        out.append(svg[i:start])
        depth, j = 0, start
        for t in re.finditer(r"<(/?)g\b[^>]*?(/?)>", svg[start:]):
            if t.group(2):
                continue
            depth += -1 if t.group(1) else 1
            if depth == 0:
                j = start + t.end()
                break
        i = j
    # Engine and light glows stay: build.py has already dropped their blur, and they read as engines idling.
    return "".join(out)


def mounts_in(svg):
    """The marked mounts in a hull's SVG."""
    out = []
    for attrs in re.findall(r"<g\b([^>]*\bdata-mount=[^>]*)>", svg):
        a = dict(re.findall(r'data-([a-z]+)="([^"]*)"', attrs))
        m = {"id": a["mount"], "type": a["type"], "size": a["size"], "x": float(a["x"]), "y": float(a["y"]), "facing": float(a.get("facing", 0))}
        if "arc" in a:
            m["arc"] = float(a["arc"])
        out.append(m)
    return out


# ------------------------------------------------------------------ outlines

def path_points(d, steps=8):
    """Points along an SVG path (M, L, H, V, C, Q, Z, absolute and relative): enough for an outline."""
    toks = re.findall(r"[MmLlHhVvCcQqZzSsTtAa]|-?\d*\.?\d+(?:e-?\d+)?", d)
    pts, cur, start, cmd, i = [], (0.0, 0.0), (0.0, 0.0), None, 0

    def num():
        nonlocal i
        v = float(toks[i]); i += 1
        return v

    while i < len(toks):
        if re.match(r"[A-Za-z]", toks[i]):
            cmd = toks[i]; i += 1
            if cmd in "Zz":
                cur = start
                continue
        rel = cmd.islower()
        c = cmd.upper()
        ox, oy = cur if rel else (0.0, 0.0)
        if c == "M":
            cur = (ox + num(), oy + num()); start = cur; pts.append(cur); cmd = "l" if rel else "L"
        elif c == "L":
            cur = (ox + num(), oy + num()); pts.append(cur)
        elif c == "H":
            cur = ((cur[0] if rel else 0) + num(), cur[1]); pts.append(cur)
        elif c == "V":
            cur = (cur[0], (cur[1] if rel else 0) + num()); pts.append(cur)
        elif c in "CQ":
            n = 3 if c == "C" else 2
            ctrl = [(ox + num(), oy + num()) for _ in range(n)]
            p0 = cur
            for k in range(1, steps + 1):
                t = k / steps
                if c == "C":
                    (x1, y1), (x2, y2), (x3, y3) = ctrl
                    x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3 * x3
                    y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3 * y3
                else:
                    (x1, y1), (x2, y2) = ctrl
                    x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * x1 + t * t * x2
                    y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * y1 + t * t * y2
                pts.append((x, y))
            cur = ctrl[-1]
        elif c in "ST":
            # Smooth curves: close enough as a line to the end point for an outline.
            if c == "S":
                num(); num()
            cur = (ox + num(), oy + num()); pts.append(cur)
        elif c == "A":
            for _ in range(5):
                num()
            cur = (ox + num(), oy + num()); pts.append(cur)
        else:
            i += 1
    return pts


def silhouette_points(svg):
    """Every point on the silhouette's shapes."""
    pts = []
    for p in re.findall(r'<polygon[^>]*points="([^"]+)"', svg):
        pts += [tuple(map(float, xy.split(","))) for xy in p.split()]
    for d in re.findall(r'<path[^>]*\sd="([^"]+)"', svg):
        pts += path_points(d)
    for x, y, w, h in re.findall(r'<rect[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"', svg):
        x, y, w, h = map(float, (x, y, w, h))
        pts += [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    for cx, cy, r in re.findall(r'<circle[^>]*cx="([-\d.]+)"[^>]*cy="([-\d.]+)"[^>]*r="([\d.]+)"', svg):
        cx, cy, r = map(float, (cx, cy, r))
        pts += [(cx + r * math.cos(a * math.pi / 6), cy + r * math.sin(a * math.pi / 6)) for a in range(12)]
    for cx, cy, rx, ry in re.findall(r'<ellipse[^>]*cx="([-\d.]+)"[^>]*cy="([-\d.]+)"[^>]*rx="([\d.]+)"[^>]*ry="([\d.]+)"', svg):
        cx, cy, rx, ry = map(float, (cx, cy, rx, ry))
        pts += [(cx + rx * math.cos(a * math.pi / 6), cy + ry * math.sin(a * math.pi / 6)) for a in range(12)]
    return pts


def convex_hull(pts):
    pts = sorted(set((round(x, 3), round(y, 3)) for x, y in pts))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def simplify(poly, n):
    """Drop the points that change the shape least until at most `n` remain."""
    poly = list(poly)
    while len(poly) > n:
        def loss(i):
            a, b, c = poly[i - 1], poly[i], poly[(i + 1) % len(poly)]
            return abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]))
        poly.pop(min(range(len(poly)), key=loss))
    return poly


def faint(svg):
    """An SVG fragment without its faint shapes (glows, washes): they are not hull."""
    return re.sub(r'<(ellipse|circle|rect|polygon|path)\b[^>]*\bopacity="0?\.[0-5]\d*"[^>]*>(</\1>)?', "", svg)


def outline(sil_svg, full_svg):
    """The silhouette as a convex polygon of at most OUTLINE_POINTS, nose first. From the silhouette
    symbol, or the full drawing's solid shapes when a hull has no silhouette (a builder that drew no body).
    Convex for now: good for hit shapes and the radar; concave detail stays in the picture."""
    pts = silhouette_points(sil_svg) or silhouette_points(faint(strip_marked(full_svg)))
    hull = simplify(convex_hull(pts), OUTLINE_POINTS)
    if not hull:
        return []
    nose = max(range(len(hull)), key=lambda i: (hull[i][0], -abs(hull[i][1])))
    hull = hull[nose:] + hull[:nose]
    return [[round(x, 2), round(y, 2)] for x, y in hull]


def inside(poly, x, y, margin):
    """Whether (x, y) is inside the convex polygon grown by `margin`."""
    n = len(poly)
    for i in range(n):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
        ex, ey = x2 - x1, y2 - y1
        length = math.hypot(ex, ey) or 1
        # Signed distance outside this edge (the polygon is counter-clockwise in maths terms after convex_hull).
        if (ex * (y - y1) - ey * (x - x1)) / length < -margin:
            return False
    return True


# ------------------------------------------------------------------ the game's side, for the report

def game_mounts():
    """The weapon and PDC mounts each hull has in the game's hulls.ts, by game id."""
    src = open(GAME_HULLS).read()
    out = {}
    for block in re.split(r"\n  '", src)[1:]:
        gid = block.split("'", 1)[0]
        ms = re.findall(r"(?:high|ciws)\('([a-z]\d)',\s*(?:'([SMLX]+)',\s*)?(-?[\d.]+),\s*(-?[\d.]+)", block)
        out[gid] = [(m[0], m[1] or "M", float(m[2]), float(m[3])) for m in ms]
    return out


# ------------------------------------------------------------------ the export

def svg_file(vb, body, defs):
    """A self-contained SVG of one picture."""
    return (f'<svg {SVG_NS} viewBox="{vb}">'
            + (f"<defs>{''.join(referenced(body, defs))}</defs>" if referenced(body, defs) else "")
            + body + "</svg>\n")


def main():
    page = build_registry()
    syms = symbols(page)
    defs = defs_by_id(page)
    ships = json.loads(re.search(r"const SHIPS = (\{.*?\});\n", page, re.S).group(1))
    problems, hulls, files = [], {}, {}

    for key, ship in sorted(ships.items()):
        full = syms.get(f"s-{key}-full")
        if not full:
            continue  # not drawn yet: nothing for the game to show
        gid = ship.get("id") or key
        vb, body = full
        radius = round(float(vb.split()[2]) / 2, 2)
        sil = syms.get(f"s-{key}-sil", (vb, body))[1]
        shape = outline(sil, body)
        if len(shape) < 3:
            problems.append(f"{gid}: no outline")
            continue
        mounts = mounts_in(body)
        for m in mounts:
            if not inside(shape, m["x"], m["y"], radius * 0.15):
                problems.append(f"{gid}: mount {m['id']} at ({m['x']}, {m['y']}) is outside the hull")
        liveries = ["base"] + (["civ"] if f"s-{key}-civ-full" in syms else [])
        for livery in liveries:
            vbl, bl = syms[f"s-{key}-full"] if livery == "base" else syms[f"s-{key}-civ-full"]
            text = svg_file(vbl, strip_marked(bl), defs)
            try:
                ET.fromstring(text)
            except ET.ParseError as e:
                problems.append(f"{gid} ({livery}): the SVG does not parse: {e}")
                continue
            files[f"svg/{gid}-{livery}.svg"] = text
        hulls[gid] = {
            "id": gid, "registryKey": key, "name": ship["name"], "maker": ship["maker"], "class": ship["cls"],
            "power": ship["power"], "inGame": bool(ship.get("id")), "radius": radius, "outline": shape,
            "mounts": mounts, "liveries": liveries,
        }

    # Keys never change: a hull that was exported before must still be.
    previous = os.path.join(OUT, "ships.json")
    if os.path.exists(previous):
        gone = sorted(set(json.load(open(previous))["hulls"]) - set(hulls))
        if gone:
            problems.append("hulls missing that were exported before (ids never change): " + ", ".join(gone))

    tur = {}
    for stem, frame, barrel, body in turrets.all_turrets():
        vb = f"{-frame:.2f} {-frame:.2f} {2 * frame:.2f} {2 * frame:.2f}"
        files[f"turrets/{stem}.svg"] = svg_file(vb, body, defs)
        tur[stem] = {"frame": round(frame, 2), "barrel": barrel}

    # The report: art mounts against the game's, for every hull in the game.
    game = game_mounts()
    lines = ["# Mounts: art against game", "", "Written by `art/registry/export.py`. For each hull in the game, the weapon and PDC mounts its picture marks against those `hulls.ts` has. Settling these is step 2's work (docs/ship-pipeline.md): until a hull's art marks a mount, the game draws that weapon at the position in its own table.", ""]
    for gid in sorted(h for h in hulls if hulls[h]["inGame"]):
        art = {m["id"]: m for m in hulls[gid]["mounts"]}
        ours = {m[0]: m for m in game.get(gid, [])}
        lines.append(f"## {hulls[gid]['name']} (`{gid}`)")
        lines.append("")
        if not ours and not art:
            lines.append("No weapon or PDC mounts in either.")
        for mid in sorted(set(art) | set(ours)):
            a, g = art.get(mid), ours.get(mid)
            if a and g:
                lines.append(f"- `{mid}`: art {a['size']} at ({a['x']}, {a['y']}), game {g[1]} at ({g[2]}, {g[3]})")
            elif g:
                lines.append(f"- `{mid}`: game only, {g[1]} at ({g[2]}, {g[3]}); not marked in the art")
            else:
                lines.append(f"- `{mid}`: art only, {a['size']} at ({a['x']}, {a['y']}); not in the game")
        lines.append("")
    files["report.md"] = "\n".join(lines)

    if problems:
        print("export failed; nothing written:")
        for p in problems:
            print("  - " + p)
        sys.exit(1)

    for sub in ("svg", "turrets"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)
        for old in os.listdir(os.path.join(OUT, sub)):
            if f"{sub}/{old}" not in files:
                os.remove(os.path.join(OUT, sub, old))
    for name, text in files.items():
        with open(os.path.join(OUT, name), "w") as f:
            f.write(text)
    with open(previous, "w") as f:
        json.dump({"note": "Written by art/registry/export.py; never edit by hand (docs/ship-pipeline.md).", "hulls": hulls}, f, indent=1, sort_keys=True)
        f.write("\n")
    with open(os.path.join(OUT, "turrets.json"), "w") as f:
        json.dump(tur, f, indent=1, sort_keys=True)
        f.write("\n")
    marked = sum(1 for h in hulls.values() if h["mounts"])
    print(f"{len(hulls)} hulls ({sum(1 for h in hulls.values() if h['inGame'])} in the game, {marked} with marked mounts), "
          f"{sum(1 for n in files if n.startswith('svg/'))} hull pictures, {len(tur)} turrets -> art/ships/")


if __name__ == "__main__":
    main()
