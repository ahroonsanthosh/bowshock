"""Draw tracked points, readings and grid intersections over a crop of the scan.

usage: python3 -I overlay.py PAGE.png TRACKS.json OUT.png x0 y0 x1 y1 scale
                             [--readings R.json] [--calib CALIB.json] [--title TEXT]
TRACKS.json: {name: [ {x, y, near_grid, occluded, merged}, ...]} (may be "-"
for none). Colours: U red, L blue, F green, others orange; flagged points
(left out of fits) are drawn hollow. Readings (list of {x, y, curve, M,
value} or {x, y, label}) are drawn as magenta crosses with a label.
Calibration intersections (from localgrid dumps) are drawn as small cyan
squares, so the fitted grid can be checked against the printed one.
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
COL = {"U": (220, 0, 0), "L": (0, 70, 230), "F": (0, 150, 0)}


def main():
    args = sys.argv[1:]
    opts = {}
    for k in ("--readings", "--calib", "--title"):
        if k in args:
            i = args.index(k)
            opts[k] = args[i + 1]
            del args[i:i + 2]
    page, tr, out = args[0:3]
    box = [int(v) for v in args[3:7]]
    draw(page, tr, out, box, float(args[7]), opts.get("--readings"), opts.get("--calib"),
         opts.get("--title"))


def draw(page, tr, out, box, s, readings=None, calib=None, title=None, page_img=None):
    opts = {}
    if readings:
        opts["--readings"] = readings
    if calib:
        opts["--calib"] = calib
    if title:
        opts["--title"] = title
    x0, y0, x1, y1 = box
    src = page_img if page_img is not None else Image.open(page)
    im = src.convert("L").crop((x0, y0, x1, y1))
    im = im.resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.LANCZOS).convert("RGB")
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.load_default(size=max(11, int(9 + 2 * s)))
    except TypeError:
        font = ImageFont.load_default()
    if "--calib" in opts:
        c = json.load(open(opts["--calib"]))
        for row_x, row_y in zip(c["X"], c["Y"]):
            for X, Y in zip(row_x, row_y):
                if X is None or not (x0 <= X <= x1 and y0 <= Y <= y1):
                    continue
                X, Y = (X - x0) * s, (Y - y0) * s
                r = max(2, s)
                dr.rectangle((X - r, Y - r, X + r, Y + r), outline=(0, 190, 210))
    tracks = json.load(open(tr)) if tr != "-" else {}
    r = max(1.0, 0.6 * s)
    for name, pts in tracks.items():
        c = COL.get(name, (240, 140, 0))
        for i, p in enumerate(pts):
            if i % 2 or not (x0 <= p["x"] <= x1 and y0 <= p["y"] <= y1):
                continue
            X, Y = (p["x"] - x0) * s, (p["y"] - y0) * s
            if p.get("near_grid") or p.get("occluded") or p.get("merged"):
                dr.ellipse((X - r, Y - r, X + r, Y + r), outline=c)
            else:
                dr.ellipse((X - r, Y - r, X + r, Y + r), fill=c)
    if "--readings" in opts:
        for q in json.load(open(opts["--readings"])):
            if not (x0 <= q["x"] <= x1 and y0 <= q["y"] <= y1):
                continue
            X, Y = (q["x"] - x0) * s, (q["y"] - y0) * s
            c = COL.get(q.get("curve", ""), (240, 140, 0))
            L = 4 * s
            wd = max(1, int(s / 2))
            dr.line((X - L, Y, X + L, Y), fill=(230, 0, 230), width=wd)
            dr.line((X, Y - L, X, Y + L), fill=(230, 0, 230), width=wd)
            lab = q.get("label") or "%s M%.2f %.4f" % (q.get("curve", ""), q["M"], q["value"])
            dy = -3 * L if q.get("curve") != "L" else L
            dr.text((X + 3, Y + dy), lab, fill=c, font=font)
    if "--title" in opts:
        dr.rectangle((0, 0, im.size[0], 18 + 2 * s), fill=(255, 255, 255))
        dr.text((4, 2), opts["--title"], fill=(0, 0, 0), font=font)
    im.save(out, optimize=True)
    print(out, im.size)


if __name__ == "__main__":
    main()
