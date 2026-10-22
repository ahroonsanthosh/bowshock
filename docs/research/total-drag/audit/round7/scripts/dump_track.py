"""Print track points in an x range (exploratory).

usage: python3 -I dump_track.py TRACKS.json CURVE X0 X1
"""
import json
import sys

t = json.load(open(sys.argv[1]))[sys.argv[2]]
x0, x1 = float(sys.argv[3]), float(sys.argv[4])
for p in t:
    if x0 <= p["x"] <= x1:
        fl = "".join(k[0] for k in ("near_grid", "occluded", "merged") if p.get(k))
        print("x %.1f y %.1f M %.4f P %.5f pk %.0f %s" % (p["x"], p["y"], p["M"], p["P"], p.get("peak", 0), fl))
