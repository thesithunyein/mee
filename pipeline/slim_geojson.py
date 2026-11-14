"""Shrink the township map for slow mobile connections: simplify outlines and round coordinates.

At the size the map is drawn (one pixel is about 3 km), a 200 m simplification is invisible,
and ~100 m coordinate precision is far finer than the 0.01 degree cells used to place fires.
Usage: python slim_geojson.py web/public/data/townships.geojson
"""
import json
import sys
from pathlib import Path

TOL = 0.002   # degrees, about 200 m
DECIMALS = 3  # about 100 m


def rdp(pts, tol):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        norm = (dx * dx + dy * dy) ** 0.5
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            x0, y0 = pts[i]
            d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm if norm else ((x0 - x1) ** 2 + (y0 - y1) ** 2) ** 0.5
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def ring(r):
    out = []
    for x, y in rdp(r, TOL):
        pt = [round(x, DECIMALS), round(y, DECIMALS)]
        if not out or out[-1] != pt:
            out.append(pt)
    if len(out) < 4:  # keep tiny islands visible
        out = [[round(x, DECIMALS), round(y, DECIMALS)] for x, y in r]
    if out[0] != out[-1]:
        out.append(out[0])
    return out


def main(path: str) -> None:
    p = Path(path)
    gj = json.loads(p.read_text(encoding="utf-8"))
    for f in gj["features"]:
        g = f["geometry"]
        if g["type"] == "Polygon":
            g["coordinates"] = [ring(r) for r in g["coordinates"]]
        elif g["type"] == "MultiPolygon":
            g["coordinates"] = [[ring(r) for r in poly] for poly in g["coordinates"]]
    before = p.stat().st_size
    p.write_text(json.dumps(gj, separators=(",", ":")), encoding="utf-8")
    print(f"{p.name}: {before // 1024} KB -> {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
