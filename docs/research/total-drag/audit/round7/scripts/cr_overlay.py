"""Overlays for NASA CR-149372 fig. 8b readings.

usage: python3 -I cr_overlay.py PAGE.png CALIB.json TRI.json TRACKS.json READINGS.json OUT.png x0 y0 x1 y1 scale [title]
TRI.json: matched triangles (tri_match.py); drawn as green centre-line
triangles with a magenta cross at the centroid. TRACKS.json: {name: [{x, y,
flag...}]}, M1.2 red, M1.1 blue, M1.0 orange (flagged points hollow).
READINGS.json: list of {x, y, theta, Cp}, drawn as black crosses. Any file
may be "none". Cyan squares: measured gridline intersections.
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
H, BW = 44.0, 54.0
COL = {"M1.2": (220, 0, 0), "M1.1": (0, 70, 230), "M1.0": (240, 140, 0)}


def draw(page, cal, tri, trk, rd, out, box, s, title=None):
    x0, y0, x1, y1 = box
    im = Image.open(page).convert("L").crop((x0, y0, x1, y1))
    im = im.resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.LANCZOS).convert("RGB")
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.load_default(size=max(11, int(9 + 3 * s)))
    except TypeError:
        font = ImageFont.load_default()

    def P(x, y):
        return ((x - x0) * s, (y - y0) * s)

    if cal != "none":
        c = json.load(open(cal))
        for rx, ry in zip(c["X"], c["Y"]):
            for X, Y in zip(rx, ry):
                if X is not None and x0 <= X <= x1 and y0 <= Y <= y1:
                    a, b = P(X, Y)
                    dr.rectangle((a - 4, b - 4, a + 4, b + 4), outline=(0, 190, 210), width=2)
    if trk != "none":
        for name, pts in json.load(open(trk)).items():
            col = COL.get(name, (120, 120, 120))
            r = max(1.0, 1.2 * s)
            for i, p in enumerate(pts):
                if i % 3 or not (x0 <= p["x"] <= x1 and y0 <= p["y"] <= y1):
                    continue
                a, b = P(p["x"], p["y"])
                if p.get("flag"):
                    dr.ellipse((a - r, b - r, a + r, b + r), outline=col)
                else:
                    dr.ellipse((a - r, b - r, a + r, b + r), fill=col)
    if tri != "none":
        for t in json.load(open(tri)):
            cx, cy = t["x"], t["y"]
            if not (x0 <= cx <= x1 and y0 <= cy <= y1):
                continue
            pts = [P(cx, cy - 2 * H / 3), P(cx - BW / 2, cy + H / 3), P(cx + BW / 2, cy + H / 3)]
            dr.polygon(pts, outline=(0, 170, 0), width=max(1, int(s)))
            a, b = P(cx, cy)
            L = 5 * s
            dr.line((a - L, b, a + L, b), fill=(230, 0, 230), width=max(1, int(s / 2)))
            dr.line((a, b - L, a, b + L), fill=(230, 0, 230), width=max(1, int(s / 2)))
            dr.text((a + 30 * s, b - 10 * s), "%.1f, %.3f" % tuple(t["data"]), fill=(0, 120, 0), font=font)
    if rd != "none":
        for q in json.load(open(rd)):
            if q.get("x") is None or not (x0 <= q["x"] <= x1 and y0 <= q["y"] <= y1):
                continue
            a, b = P(q["x"], q["y"])
            L = 4 * s
            dr.line((a - L, b - L, a + L, b + L), fill=(0, 0, 0), width=max(1, int(s / 2)))
            dr.line((a - L, b + L, a + L, b - L), fill=(0, 0, 0), width=max(1, int(s / 2)))
    if title:
        dr.rectangle((0, 0, im.size[0], 18 + 3 * s), fill=(255, 255, 255))
        dr.text((4, 2), title, fill=(0, 0, 0), font=font)
    im.save(out, optimize=True)
    print(out, im.size)


if __name__ == "__main__":
    a = sys.argv
    draw(a[1], a[2], a[3], a[4], a[5], a[6], [int(v) for v in a[7:11]], float(a[11]),
         a[12] if len(a) > 12 else None)
