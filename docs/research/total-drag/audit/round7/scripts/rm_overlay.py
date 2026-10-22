"""Draw the fitted symbol outlines over a crop of an RM L52J21a panel.

usage: python3 -I rm_overlay.py PAGE.png SYMBOLS.json CALIB.json OUT.png x0 y0 x1 y1 scale [TITLE]
Squares are drawn as red rectangles (fitted sides), circles as blue circles,
triangles as green polygons (fitted sides and base). A magenta cross marks the
reported value (centre dot when found, otherwise the outline centre); a small
orange square marks the outline centre. Gridline intersections from the
calibration are drawn as cyan squares.
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None


def main():
    page, sym, cal, out = sys.argv[1:5]
    box = [int(v) for v in sys.argv[5:9]]
    draw(page, sym, cal, out, box, float(sys.argv[9]), sys.argv[10] if len(sys.argv) > 10 else None)


def draw(page, sym, cal, out, box, s, title=None, page_img=None, labels=True):
    x0, y0, x1, y1 = box
    src = page_img if page_img is not None else Image.open(page)
    im = src.convert("L").crop((x0, y0, x1, y1))
    im = im.resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.LANCZOS).convert("RGB")
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.load_default(size=max(11, int(8 + 2 * s)))
    except TypeError:
        font = ImageFont.load_default()

    def P(x, y):
        return ((x - x0) * s, (y - y0) * s)

    c = json.load(open(cal))
    for rx, ry in zip(c["X"], c["Y"]):
        for X, Y in zip(rx, ry):
            if X is not None and x0 <= X <= x1 and y0 <= Y <= y1:
                a, b = P(X, Y)
                dr.rectangle((a - 3, b - 3, a + 3, b + 3), outline=(0, 190, 210), width=2)
    w = max(1, int(s / 1.5))
    for r in json.load(open(sym)):
        if r["shape"] == "square" and r.get("sides"):
            sd = r["sides"]
            if all(sd[k][0] for k in ("left", "right", "top", "bottom")):
                a, b = P(sd["left"][0], sd["top"][0])
                c2, d2 = P(sd["right"][0], sd["bottom"][0])
                dr.rectangle((a, b, c2, d2), outline=(230, 0, 0), width=w)
        elif r["shape"] == "circle" and r.get("circle"):
            cc = r["circle"]
            a, b = P(cc["xc"] - cc["r"], cc["yc"] - cc["r"])
            c2, d2 = P(cc["xc"] + cc["r"], cc["yc"] + cc["r"])
            dr.ellipse((a, b, c2, d2), outline=(0, 60, 240), width=w)
        elif r["shape"] == "triangle" and r.get("triangle", {}).get("apex"):
            t = r["triangle"]
            pts = [P(*t["apex"]), P(*t["base_left"]), P(*t["base_right"])]
            dr.polygon(pts, outline=(0, 160, 0), width=w)
        ce = r.get("centre")
        if ce and ce[0] is not None:
            a, b = P(*ce)
            dr.rectangle((a - 2, b - 2, a + 2, b + 2), outline=(255, 140, 0), width=1)
        v = r.get("value_px")
        if v:
            a, b = P(*v)
            L = 4 * s
            dr.line((a - L, b, a + L, b), fill=(230, 0, 230), width=max(1, int(s / 2)))
            dr.line((a, b - L, a, b + L), fill=(230, 0, 230), width=max(1, int(s / 2)))
        if not labels:
            continue
        lab = r["id"]
        if r.get("value_data"):
            lab += " R%.2f %.4f" % tuple(r["value_data"])
        if ce and ce[0] is not None:
            a, b = P(*ce)
            off = {"square": (-60, -55), "triangle": (-60, -75), "circle": (-60, 40)}[r["shape"]]
            dr.text((a + off[0] * s / 3, b + off[1] * s / 3), lab, fill=(0, 0, 0), font=font)
    if title:
        dr.rectangle((0, 0, im.size[0], 16 + 2 * s), fill=(255, 255, 255))
        dr.text((4, 2), title, fill=(0, 0, 0), font=font)
    im.save(out, optimize=True)
    print(out, im.size)


if __name__ == "__main__":
    main()
