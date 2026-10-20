"""BRL 934 fig. 3: scale from the 3 in ruler, model diameter from profiles across the body.
usage: brl934_f3_measure.py f3r.png  (DTIC_AD0068959.pdf page 18 rendered with pdftoppm -r 300 -gray
and rotated with PIL rotate(-90, expand=True), 3008 x 2528 px).
Result recorded in data/basic_finner_brl934.md section 2: ruler ticks every 1/8 in about 20 px apart
(1 in = 160 px); dark width across the body 116 to 129 px at four stations (0.72 to 0.81 in). The
metal's highlights split the profile, and the photograph's perspective is unknown."""
import sys
import numpy as np
from PIL import Image

im = np.asarray(Image.open(sys.argv[1]).convert("L"), dtype=float)
H, W = im.shape
print("size", W, H)

# Ruler (lower one, in the full-size frame about x 1750..2240, y 1260..1335): find the long tick marks
# by column darkness in a band just below the ruler's top edge.
band = im[1268:1300, 1740:2260]
col = band.mean(axis=0)
dark = np.where(col < np.percentile(col, 12))[0] + 1740
# group consecutive columns
groups = []
for x in dark:
    if groups and x - groups[-1][-1] <= 2:
        groups[-1].append(x)
    else:
        groups.append([x])
centres = [np.mean(g) for g in groups]
print("dark column groups (x):", [round(c, 1) for c in centres])

# Profiles across the model's cylinder, perpendicular to its axis.
tip = np.array([2444.0, 1976.0])
rear = np.array([1490.0, 1330.0])
axis = (tip - rear) / np.linalg.norm(tip - rear)
normal = np.array([-axis[1], axis[0]])
print("axis angle deg", np.degrees(np.arctan2(axis[1], axis[0])))
for f in (0.15, 0.25, 0.35, 0.45):
    c = rear + f * (tip - rear)
    ts = np.arange(-120, 121)
    pts = c[None, :] + ts[:, None] * normal[None, :]
    vals = []
    for (x, y) in pts:
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < W and 0 <= yi < H:
            vals.append(im[yi - 1:yi + 2, xi - 1:xi + 2].mean())
        else:
            vals.append(255)
    vals = np.array(vals)
    thr = 0.5 * (vals.max() + vals.min())
    inside = np.where(vals < thr)[0]
    if len(inside):
        width = ts[inside[-1]] - ts[inside[0]] + 1
    else:
        width = 0
    print("station f=%.2f centre (%.0f,%.0f): dark width %d px  min %.0f max %.0f" % (f, c[0], c[1], width, vals.min(), vals.max()))
    print("   profile:", "".join("#" if v < thr else "." for v in vals[::3]))
