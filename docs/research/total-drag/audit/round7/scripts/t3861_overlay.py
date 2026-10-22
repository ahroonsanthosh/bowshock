"""Overlays for NACA TN 3861 figs. 15 and 16 readings.

usage: python3 -I t3861_overlay.py PAGE.png CALIB.json SYMBOLS.json TRACKS.json OUT.png x0 y0 x1 y1 scale TITLE_KEY
Symbols: magenta cross at the value, small orange square at the outline
(bounding-box) centre, cyan cross at the cross-stroke centre, and the id.
Tracks (curves): coloured dots, hollow where not used. TRACKS.json may be
"none". Cyan squares: measured gridline intersections. TITLE_KEY selects a
title from the dictionary below (keeps shell arguments simple).
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
TITLES = {
    "f15": "TN 3861 fig. 15: magenta = value, orange = outline centre, cyan = cross strokes; curves red/blue",
    "f16": "TN 3861 fig. 16: magenta = value, orange = outline centre, cyan = cross strokes; curve red",
    "f15cal": "TN 3861 fig. 15: cyan squares = measured gridline intersections",
    "f16cal": "TN 3861 fig. 16: cyan squares = measured gridline intersections",
}
COLS = [(220, 0, 0), (0, 70, 230), (0, 150, 0), (240, 140, 0)]


def main():
    page, cal, sym, trk, out = sys.argv[1:6]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[6:10])
    s = float(sys.argv[10])
    title = TITLES.get(sys.argv[11]) if len(sys.argv) > 11 else None
    im = Image.open(page).convert("L").crop((x0, y0, x1, y1))
    im = im.resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.LANCZOS).convert("RGB")
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.load_default(size=max(11, int(10 + 3 * s)))
    except TypeError:
        font = ImageFont.load_default()

    def P(x, y):
        return ((x - x0) * s, (y - y0) * s)

    c = json.load(open(cal))
    for rx, ry in zip(c["X"], c["Y"]):
        for X, Y in zip(rx, ry):
            if X is not None and x0 <= X <= x1 and y0 <= Y <= y1:
                a, b = P(X, Y)
                dr.rectangle((a - 4, b - 4, a + 4, b + 4), outline=(0, 190, 210), width=2)
    if trk != "none":
        for i, (name, pts) in enumerate(json.load(open(trk)).items()):
            col = COLS[i % len(COLS)]
            r = max(1.0, 1.0 * s)
            for k, p in enumerate(pts):
                if k % 3 or not (x0 <= p["x"] <= x1 and y0 <= p["y"] <= y1):
                    continue
                a, b = P(p["x"], p["y"])
                if p.get("flag"):
                    dr.ellipse((a - r, b - r, a + r, b + r), outline=col)
                else:
                    dr.ellipse((a - r, b - r, a + r, b + r), fill=col)
    if sym != "none":
        for r in json.load(open(sym)):
            v = r.get("value_px")
            if not v or not (x0 <= v[0] <= x1 and y0 <= v[1] <= y1):
                continue
            if r.get("outline"):
                a, b = P(*r["outline"])
                dr.rectangle((a - 3, b - 3, a + 3, b + 3), outline=(255, 140, 0), width=2)
            if r.get("cross"):
                a, b = P(*r["cross"])
                dr.line((a - 6, b, a + 6, b), fill=(0, 170, 200), width=2)
                dr.line((a, b - 6, a, b + 6), fill=(0, 170, 200), width=2)
            a, b = P(*v)
            L = 7 * s
            dr.line((a - L, b, a + L, b), fill=(230, 0, 230), width=max(1, int(s)))
            dr.line((a, b - L, a, b + L), fill=(230, 0, 230), width=max(1, int(s)))
            dr.text((a + 8 * s, b - 22 * s), r["id"], fill=(0, 0, 0), font=font)
    if title:
        dr.rectangle((0, 0, im.size[0], 18 + 3 * s), fill=(255, 255, 255))
        dr.text((4, 2), title, fill=(0, 0, 0), font=font)
    im.save(out, optimize=True)
    print(out, im.size)


if __name__ == "__main__":
    main()
