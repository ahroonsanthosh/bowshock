"""Segment table cells into text rows and glyphs.

usage: python3 -I tabglyph.py page.png out_prefix y0 y1 name:x0:x1 [name:x0:x1 ...]
For the given column strips (native x ranges), text rows are found from the
horizontal darkness projection of the strip named "sd" (no table rules in it),
and each cell is cut into glyphs (8-connected dark components, merged
when they overlap in x). Writes out_prefix.json with, per row, the row
band and, per column, the list of glyph boxes; and out_prefix_glyphs.npy
with every glyph normalised to 24x16 (for clustering).
"""
import json
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

page = np.asarray(Image.open(sys.argv[1]).convert("L"), dtype=float)
pre = sys.argv[2]
y0, y1 = int(sys.argv[3]), int(sys.argv[4])
cols = []
for c in sys.argv[5:]:
    n, a, b = c.split(":")
    cols.append((n, int(a), int(b)))
TH = 128

# rows from the union of all strips' projections
proj = np.zeros(y1 - y0)
# rows are found from the column named "sd" only (no rules inside it)
for n, a, b in cols:
    if n == "sd":
        proj += (page[y0:y1, a:b] < TH).sum(axis=1)
on = proj > 3
rows = []
i = 0
while i < len(on):
    if on[i]:
        j = i
        while j + 1 < len(on) and on[j + 1]:
            j += 1
        if j - i >= 6:
            rows.append((y0 + i, y0 + j))
        i = j + 1
    else:
        i += 1
out = {"rows": []}
glyphs = []
for (ra, rb) in rows:
    rec = {"y": [ra, rb], "cells": {}}
    for n, a, b in cols:
        sub = page[ra - 2:rb + 3, a:b] < TH
        # drop long vertical runs (table rules) and long horizontal runs
        colfrac = sub.mean(axis=0)
        sub[:, colfrac > 0.9] = False
        rowfrac = sub.mean(axis=1)
        sub[rowfrac > 0.6, :] = False
        lab, k = ndimage.label(sub, structure=np.ones((3, 3)))
        boxes = []
        for sl in ndimage.find_objects(lab):
            boxes.append([sl[1].start, sl[1].stop, sl[0].start, sl[0].stop])
        boxes.sort()
        merged = []
        for bx in boxes:
            if merged and bx[0] < merged[-1][1] - 1:
                m = merged[-1]
                merged[-1] = [min(m[0], bx[0]), max(m[1], bx[1]), min(m[2], bx[2]), max(m[3], bx[3])]
            else:
                merged.append(bx)
        cell = []
        for x0_, x1_, yy0, yy1 in merged:
            gx0, gx1 = a + x0_, a + x1_
            gy0, gy1 = ra - 2 + yy0, ra - 2 + yy1
            w, h = gx1 - gx0, gy1 - gy0
            idx = len(glyphs)
            crop = page[gy0:gy1, gx0:gx1]
            im = Image.fromarray(crop.astype(np.uint8)).resize((16, 24), Image.BILINEAR)
            glyphs.append(np.asarray(im, dtype=float))
            cell.append({"box": [int(gx0), int(gx1), int(gy0), int(gy1)], "w": int(w), "h": int(h), "id": idx})
        rec["cells"][n] = cell
    out["rows"].append(rec)
json.dump(out, open(pre + ".json", "w"))
np.save(pre + "_glyphs.npy", np.array(glyphs))
print(len(rows), "rows,", len(glyphs), "glyphs")
for r in out["rows"]:
    print(r["y"], {n: len(c) for n, c in r["cells"].items()})
