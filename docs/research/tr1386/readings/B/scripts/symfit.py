"""Refine hollow symbol centres by template matching on a 400 dpi page render.

Library plus CLI.
CLI usage: python3 -I symfit.py PAGE INPUT.csv OUTPUT.csv OVERLAY.png [SEARCH]
INPUT.csv columns: id,shape,x,y   (shape: circle, square, diamond, triangle, rtriangle, ltriangle, dtriangle)
  x,y are rough centres in page pixels (picked by eye from zoomed crops).
OUTPUT.csv columns: id,shape,x0,y0,xfit,yfit,size,score,contrast
OVERLAY.png: crop around all points, scaled 3x, with fitted outlines in red and rough picks in blue.

Score = mean darkness on the template outline minus mean darkness of the interior.
"""
import sys
import csv
import numpy as np
from PIL import Image, ImageDraw

WORK = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"

_cache = {}


def load(page):
    if page not in _cache:
        g = np.asarray(Image.open(f"{WORK}/p400-{page:02d}.png").convert("L"), dtype=np.float32)
        d = np.clip((215.0 - g) / 110.0, 0.0, 1.0)
        _cache[page] = (g, d)
    return _cache[page]


def shape_dist(shape, xx, yy, s):
    """Signed-ish distance proxy: value 1.0 on the outline of a shape of size s.
    Returns normalised radius r such that the outline is r == 1."""
    if shape == "circle":
        return np.sqrt(xx ** 2 + yy ** 2) / s
    if shape == "square":
        return np.maximum(np.abs(xx), np.abs(yy)) / s
    if shape == "diamond":
        return (np.abs(xx) + np.abs(yy)) / s
    if shape in ("triangle", "dtriangle", "rtriangle", "ltriangle"):
        # equilateral-ish triangle; centroid at origin; s = distance centroid->side
        if shape == "triangle":  # apex up
            a, b = xx, yy
        elif shape == "dtriangle":  # apex down
            a, b = xx, -yy
        elif shape == "rtriangle":  # apex right
            a, b = yy, -xx
        else:  # apex left
            a, b = yy, xx
        # sides: bottom b = s ; two slanted sides
        c30 = np.sqrt(3) / 2
        d1 = b  # bottom side normal (0,1)
        d2 = -0.5 * b + c30 * a
        d3 = -0.5 * b - c30 * a
        return np.maximum(np.maximum(d1, d2), d3) / s
    if shape == "dshape":  # flat left, top, bottom; semicircle on the right
        return np.where(xx <= 0, np.maximum(-xx, np.abs(yy)), np.sqrt(xx ** 2 + yy ** 2)) / s
    if shape == "qround":  # flat top and left; lower-right quarter rounded
        return np.where((xx > 0) & (yy > 0), np.sqrt(xx ** 2 + yy ** 2), np.maximum(np.abs(xx), np.abs(yy))) / s
    if shape == "octagon":
        return np.maximum(np.maximum(np.abs(xx), np.abs(yy)), (np.abs(xx) + np.abs(yy)) / 1.35) / s
    if shape.startswith("rtri_"):
        # right triangle in a 2s x 2s box centred on the origin (bounding-box centre).
        # rtri_br: right angle at bottom right; rtri_bl: bottom left; rtri_tr: top right; rtri_tl: top left
        corner = shape.split("_")[1]
        sx = 1 if "r" in corner[1] else -1
        sy = 1 if corner[0] == "b" else -1
        a, b = xx * sx, yy * sy
        d1 = a - s
        d2 = b - s
        d3 = -(a + b) / np.sqrt(2)
        sd = np.maximum(np.maximum(d1, d2), d3)
        return 1.0 + sd / s
    raise ValueError(shape)


def score_at(d, shape, cx, cy, s, thick=2.2):
    R = int(s * 2.2) + 4
    ys, xs = np.mgrid[-R:R + 1, -R:R + 1]
    xx = xs - (cx - round(cx))
    yy = ys - (cy - round(cy))
    r = shape_dist(shape, xx, yy, s)
    band = thick / s
    outline = np.abs(r - 1.0) <= band / 2
    interior = r <= 1.0 - band * 1.2
    if interior.sum() < 4:
        return -9, 0, 0
    y0, x0 = int(round(cy)) - R, int(round(cx)) - R
    if y0 < 0 or x0 < 0 or y0 + 2 * R + 1 > d.shape[0] or x0 + 2 * R + 1 > d.shape[1]:
        return -9, 0, 0
    patch = d[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1]
    mo = patch[outline].mean()
    mi = patch[interior].mean()
    return mo - mi, mo, mi


SIZES = {
    "circle": np.arange(6.0, 12.01, 0.5),
    "square": np.arange(6.0, 11.51, 0.5),
    "diamond": np.arange(8.0, 15.01, 0.5),
    "triangle": np.arange(4.0, 9.01, 0.5),
    "dtriangle": np.arange(4.0, 9.01, 0.5),
    "rtriangle": np.arange(4.0, 9.01, 0.5),
    "ltriangle": np.arange(4.0, 9.01, 0.5),
    "dshape": np.arange(6.0, 11.01, 0.5),
    "qround": np.arange(6.0, 11.01, 0.5),
    "octagon": np.arange(6.0, 12.01, 0.5),
    "rtri_br": np.arange(5.0, 11.01, 0.5),
    "rtri_bl": np.arange(5.0, 11.01, 0.5),
    "rtri_tr": np.arange(5.0, 11.01, 0.5),
    "rtri_tl": np.arange(5.0, 11.01, 0.5),
}


def refine(page, shape, x, y, search=7, sizes=None):
    _, d = load(page)
    sizes = SIZES[shape] if sizes is None else sizes
    best = (-9, x, y, 0, 0, 0)
    for s in sizes:
        for dy in range(-search, search + 1):
            for dx in range(-search, search + 1):
                sc, mo, mi = score_at(d, shape, x + dx, y + dy, s)
                if sc > best[0]:
                    best = (sc, x + dx, y + dy, s, mo, mi)
    # sub-pixel refinement with half-pixel steps around best
    sc0, bx, by, bs, mo, mi = best
    fine = best
    for s in np.arange(bs - 0.5, bs + 0.51, 0.25):
        for dy in np.arange(-1.0, 1.01, 0.5):
            for dx in np.arange(-1.0, 1.01, 0.5):
                sc, mo2, mi2 = score_at_sub(d, shape, bx + dx, by + dy, s)
                if sc > fine[0]:
                    fine = (sc, bx + dx, by + dy, s, mo2, mi2)
    return fine


def score_at_sub(d, shape, cx, cy, s, thick=2.2):
    # sub-pixel: sample with offsets (template evaluated at fractional centre)
    R = int(s * 2.2) + 4
    ix, iy = int(np.floor(cx)), int(np.floor(cy))
    ys, xs = np.mgrid[-R:R + 1, -R:R + 1]
    xx = xs - (cx - ix)
    yy = ys - (cy - iy)
    r = shape_dist(shape, xx, yy, s)
    band = thick / s
    outline = np.abs(r - 1.0) <= band / 2
    interior = r <= 1.0 - band * 1.2
    if interior.sum() < 4 or outline.sum() < 4:
        return -9, 0, 0
    y0, x0 = iy - R, ix - R
    if y0 < 0 or x0 < 0 or y0 + 2 * R + 1 > d.shape[0] or x0 + 2 * R + 1 > d.shape[1]:
        return -9, 0, 0
    patch = d[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1]
    mo = patch[outline].mean()
    mi = patch[interior].mean()
    return mo - mi, mo, mi


def outline_points(shape, cx, cy, s, n=60):
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    if shape == "circle":
        return [(cx + s * np.cos(a), cy + s * np.sin(a)) for a in t]
    if shape == "square":
        return [(cx - s, cy - s), (cx + s, cy - s), (cx + s, cy + s), (cx - s, cy + s)]
    if shape == "diamond":
        return [(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)]
    if shape in ("dshape", "qround", "octagon"):
        pts = []
        for a in t:
            c, s_ = np.cos(a), np.sin(a)
            # find radius where shape_dist == 1 along direction a
            rr = np.linspace(0.2, 3, 300) * s
            dd = shape_dist(shape, rr * c, rr * s_, s)
            k = np.argmin(np.abs(dd - 1.0))
            pts.append((cx + rr[k] * c, cy + rr[k] * s_))
        return pts
    if shape.startswith("rtri_"):
        corner = shape.split("_")[1]
        sx = 1 if "r" in corner[1] else -1
        sy = 1 if corner[0] == "b" else -1
        return [(cx + sx * s, cy + sy * s), (cx - sx * s, cy + sy * s), (cx + sx * s, cy - sy * s)]
    # triangles: vertices at distance 2s from centroid
    base = {"triangle": -90, "dtriangle": 90, "rtriangle": 0, "ltriangle": 180}[shape]
    return [(cx + 2 * s * np.cos(np.radians(base + k * 120)), cy + 2 * s * np.sin(np.radians(base + k * 120))) for k in range(3)]


def overlay(page, rows, out, scale=3, pad=40):
    g, _ = load(page)
    xs = [r["xfit"] for r in rows] + [r["x0"] for r in rows]
    ys = [r["yfit"] for r in rows] + [r["y0"] for r in rows]
    X0, Y0 = int(min(xs)) - pad, int(min(ys)) - pad
    X1, Y1 = int(max(xs)) + pad, int(max(ys)) + pad
    im = Image.fromarray(g[Y0:Y1, X0:X1].astype(np.uint8)).convert("RGB")
    im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    dr = ImageDraw.Draw(im)
    for r in rows:
        pts = outline_points(r["shape"], (r["xfit"] - X0) * scale, (r["yfit"] - Y0) * scale, r["size"] * scale)
        dr.polygon(pts, outline=(255, 0, 0))
        cx, cy = (r["xfit"] - X0) * scale, (r["yfit"] - Y0) * scale
        dr.line([(cx - 3, cy), (cx + 3, cy)], fill=(255, 0, 0))
        dr.line([(cx, cy - 3), (cx, cy + 3)], fill=(255, 0, 0))
        bx, by = (r["x0"] - X0) * scale, (r["y0"] - Y0) * scale
        dr.ellipse([bx - 2, by - 2, bx + 2, by + 2], outline=(0, 0, 255))
        dr.text((cx + r["size"] * scale + 3, cy - 6), str(r["id"]), fill=(0, 140, 0))
    im.save(out)
    return (X0, Y0, X1, Y1)


def main():
    page = int(sys.argv[1])
    inp, outp, ov = sys.argv[2], sys.argv[3], sys.argv[4]
    search = int(sys.argv[5]) if len(sys.argv) > 5 else 7
    rows = []
    with open(inp) as f:
        for r in csv.DictReader(f):
            x, y = float(r["x"]), float(r["y"])
            sc, xf, yf, s, mo, mi = refine(page, r["shape"], x, y, search)
            rows.append(dict(id=r["id"], shape=r["shape"], x0=x, y0=y, xfit=float(xf), yfit=float(yf),
                             size=float(s), score=float(sc), contrast=float(mo)))
    with open(outp, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "shape", "x0", "y0", "xfit", "yfit", "size", "score", "contrast"])
        w.writeheader()
        for r in rows:
            w.writerow({k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()})
    box = overlay(page, rows, ov)
    for r in rows:
        print(f"{r['id']:>8} {r['shape']:>9} pick=({r['x0']:.0f},{r['y0']:.0f}) fit=({r['xfit']:.1f},{r['yfit']:.1f}) "
              f"s={r['size']:.2f} score={r['score']:.2f} outline={r['contrast']:.2f}")
    print("overlay box", box)


if __name__ == "__main__":
    main()
