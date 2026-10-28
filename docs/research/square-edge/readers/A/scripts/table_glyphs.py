"""Check typed table values against the scan, glyph by glyph.

usage: python3 -I table_glyphs.py IMG X0 X1 Y0 Y1 TYPED.txt OUTPNG [NDIG]

IMG      native page image
X0..Y1   box (native pixels) holding ONE column of values, one per row
TYPED    text file, one typed value per row in order, as printed after the
         decimal point (for example 9970 for .9970); blank lines not allowed
OUTPNG   sheet showing each row crop with the typed value beside it

What it does
1. Splits the column into text rows by the horizontal ink profile.
2. In each row finds the decimal point (the left-most small blob) and cuts
   NDIG fixed-pitch character cells after it (typewriter font).
3. Builds a mean template per digit from every cell labelled with that
   digit by the typed values, then scores each cell against every
   template (leave-one-out for its own label), allowing +-2 px shifts.
4. Prints rows where the best-scoring digit differs from the typed digit,
   or where the margin between the typed digit and the best other digit is
   small. These are the cells to re-inspect by eye.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

img = sys.argv[1]
X0, X1, Y0, Y1 = (int(v) for v in sys.argv[2:6])
typed = [l.strip() for l in open(sys.argv[6]) if l.strip()]
outpng = sys.argv[7]
ndig = int(sys.argv[8]) if len(sys.argv) > 8 else 4
MARGIN = float(sys.argv[9]) if len(sys.argv) > 9 else 0.08
MINSC = float(sys.argv[10]) if len(sys.argv) > 10 else 0.80

im = np.asarray(Image.open(img).convert("L"))
box = im[Y0:Y1, X0:X1] < 128
H, W = box.shape

# 1. rows, anchored on decimal points
from collections import deque
def components(mask):
    lab = np.zeros(mask.shape, int); n = 0; out = []
    for y, x in zip(*np.nonzero(mask)):
        if lab[y, x]:
            continue
        n += 1; q = deque([(y, x)]); lab[y, x] = n; pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n; q.append((ny, nx))
        ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
        out.append(dict(y0=min(ys), y1=max(ys), x0=min(xs), x1=max(xs), n=len(pts)))
    return out

comps = components(box)
dots = [c for c in comps if 3 <= (c["x1"] - c["x0"] + 1) <= 8 and 3 <= (c["y1"] - c["y0"] + 1) <= 8 and c["n"] >= 9]
# a decimal point has digit ink to its right on the same line
def has_digits(c):
    y0, y1 = max(0, c["y1"] - 16), c["y1"] + 1
    return box[y0:y1, c["x1"] + 3:c["x1"] + 70].sum() > 40
dots = [c for c in dots if has_digits(c)]
# drop blobs that sit inside a glyph line to the right of another dot
dots.sort(key=lambda c: (c["y1"], c["x0"]))
keep = []
for c in dots:
    if keep and abs(c["y1"] - keep[-1]["y1"]) < 8:
        if c["x0"] < keep[-1]["x0"]:
            keep[-1] = c
        continue
    keep.append(c)
dots = keep
print(f"rows (decimal points) found: {len(dots)}; typed: {len(typed)}")

rowinfo = []
for d in dots:
    a, b = max(0, d["y1"] - 17), min(H, d["y1"] + 3)
    sub = box[a:b, d["x1"] + 2:min(W, d["x1"] + 2 + 16 * ndig)]
    colink = sub.any(axis=0)
    xs = np.nonzero(colink)[0]
    if len(xs) == 0:
        rowinfo.append(None); continue
    # groups of ink columns
    groups = []
    for x in xs:
        if groups and x - groups[-1][-1] <= 1:
            groups[-1].append(x)
        else:
            groups.append([x])
    rowinfo.append(dict(a=a, b=b, dot=d, xl=d["x1"] + 2 + xs[0], xr=d["x1"] + 2 + xs[-1],
                        lefts=[d["x1"] + 2 + g[0] for g in groups]))

diffs = []
for r in rowinfo:
    if r and len(r["lefts"]) == ndig:
        diffs += list(np.diff(r["lefts"]))
pitch = float(np.median(diffs)) if diffs else 14.7
print(f"estimated pitch {pitch:.2f} px from {len(diffs)} gaps")

CW, CH = int(round(pitch)) + 2, 20
cells = []
for i, r in enumerate(rowinfo):
    if not r:
        continue
    sub = box[r["a"]:r["b"]]
    for k in range(ndig):
        x0 = int(round(r["xl"] + pitch * k - 1))
        bm = np.zeros((CH, CW), bool)
        part = sub[:CH, x0:x0 + CW]
        bm[:part.shape[0], :part.shape[1]] = part
        cells.append((i, k, bm))

def score(a, b):
    # best normalised overlap over shifts
    best = -1
    A = a.astype(float)
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            B = np.roll(np.roll(b, dy, axis=0), dx, axis=1).astype(float)
            num = (A * B).sum()
            den = np.sqrt((A * A).sum() * (B * B).sum()) + 1e-9
            best = max(best, num / den)
    return best

labels = {}
for (i, k, bm) in cells:
    if i < len(typed) and k < len(typed[i]) and typed[i][k].isdigit():
        labels[(i, k)] = typed[i][k]
sums = {d: np.zeros((CH, CW)) for d in "0123456789"}
cnts = {d: 0 for d in "0123456789"}
for (i, k, bm) in cells:
    d = labels.get((i, k))
    if d:
        sums[d] += bm; cnts[d] += 1
print("template counts:", {d: cnts[d] for d in cnts if cnts[d]})

report = []
for (i, k, bm) in cells:
    d = labels.get((i, k))
    sc = {}
    for t in "0123456789":
        n = cnts[t] - (1 if t == d else 0)
        if n <= 0:
            continue
        tmpl = (sums[t] - (bm if t == d else 0)) / n
        sc[t] = score(bm, tmpl)
    if not sc:
        continue
    best = max(sc, key=sc.get)
    other = max((v for t, v in sc.items() if t != d), default=0)
    margin = sc.get(d, 0) - other
    report.append((i, k, d, best, sc.get(d, 0), margin))
    oth = max((t for t in sc if t != d), key=lambda t: sc[t])
    if best != d or margin < MARGIN or sc.get(d, 0) < MINSC:
        print(f"row {i+1:3d} digit {k+1}: typed {d} (score {sc.get(d,0):.3f}) next {oth} ({sc[oth]:.3f}) margin {margin:+.3f}  value .{typed[i] if i < len(typed) else '?'}")
    continue
    if False:
        print(f"row {i+1:3d} digit {k+1}: typed {d} best {best} score_typed {sc.get(d,0):.3f} margin {margin:+.3f}  (typed value .{typed[i] if i < len(typed) else '?'})")

# S-form test for cells typed 9: right-side ink in rows top+3..top+5
if "--sform" in sys.argv or True:
    for (i, k, bm) in cells:
        if labels.get((i, k)) != "9":
            continue
        ys = np.nonzero(bm.any(axis=1))[0]
        xs = np.nonzero(bm.any(axis=0))[0]
        if len(ys) == 0:
            continue
        t = ys[0]; xl, xr = xs[0], xs[-1]
        cut = xl + int(0.6 * (xr - xl + 1))
        right = bm[t + 3:t + 6, cut:xr + 1].sum()
        curl = bm[t + 2:t + 3, cut:xr + 1].sum()
        if right == 0:
            print(f"SFORM row {i+1:3d} digit {k+1}: no right-side ink rows 3-5; curl at row 2: {int(curl)} px  value .{typed[i]}")
# sheet
scale = 3
sheet_rows = []
for i, r in enumerate(rowinfo):
    if not r:
        continue
    crop = Image.fromarray((~box[r["a"]:r["b"], :]).astype(np.uint8) * 255)
    crop = crop.resize((crop.width * scale, crop.height * scale), Image.NEAREST)
    canvas = Image.new("L", (crop.width + 260, crop.height), 255)
    canvas.paste(crop, (0, 0))
    ImageDraw.Draw(canvas).text((crop.width + 10, crop.height // 3), f"{i+1}: .{typed[i] if i < len(typed) else '?'}", fill=0)
    sheet_rows.append(canvas)
if sheet_rows:
    Wd = max(c.width for c in sheet_rows); Ht = sum(c.height for c in sheet_rows)
    sheet = Image.new("L", (Wd, Ht), 255); y = 0
    for c in sheet_rows:
        sheet.paste(c, (0, y)); y += c.height
    sheet.save(outpng)
    print("sheet", outpng, sheet.size)
