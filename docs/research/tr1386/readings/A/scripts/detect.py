"""Detect candidate symbols in a page region by template matching.

usage: detect.py scriptdir page.png x0 y0 x1 y1 out.json shape:size:thick[:thr] ...
Writes candidates (page px) with the best shape for each location.
"""
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import digi

page = digi.load(sys.argv[2])
x0, y0, x1, y1 = map(int, sys.argv[3:7])
out = sys.argv[7]
specs = []
for s in sys.argv[8:]:
    parts = s.split(":")
    shape, size, th = parts[0], float(parts[1]), float(parts[2])
    thr = float(parts[3]) if len(parts) > 3 else 0.45
    specs.append((shape, size, th, thr))

reg = page[y0:y1, x0:x1]
cands = []
maps = {}
for shape, size, th, thr in specs:
    t = digi.tmpl(shape, size, th)
    m = digi.ncc(reg, t)
    maps[shape] = m
    for (x, y, v) in digi.peaks(m, thr, int(size * 0.6)):
        cands.append(dict(shape=shape, x=int(x + x0), y=int(y + y0), score=float(v)))

# merge: keep best shape within 0.6*size
cands.sort(key=lambda c: -c["score"])
kept = []
for c in cands:
    if any(abs(c["x"] - k["x"]) < 14 and abs(c["y"] - k["y"]) < 14 for k in kept):
        continue
    # scores of all shapes at this spot
    c["all"] = {s: float(maps[s][int(c["y"] - y0), int(c["x"] - x0)]) for s in maps}
    kept.append(c)
kept.sort(key=lambda c: (c["x"], c["y"]))
json.dump(kept, open(out, "w"), indent=1)
for i, c in enumerate(kept):
    print(i, c["shape"], c["x"], c["y"], round(c["score"], 3), {k: round(v, 2) for k, v in c["all"].items()})
