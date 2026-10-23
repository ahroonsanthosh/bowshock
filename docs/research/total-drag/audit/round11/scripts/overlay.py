"""Review overlay: calibration, symbols, curve tracks and readings over the scan.

usage: python3 -I overlay.py PAGE.png CALIB.json SYMS.json TRACKS.json READS.json OUT.png x0 y0 x1 y1 SCALE
Any of SYMS/TRACKS/READS may be "none".
Cyan squares: measured gridline intersections. Symbols: magenta box at the
read centre and the id. Tracks: small dots coloured per curve (hollow where
flagged and not used). Readings: black-ringed crosses in the curve colour.
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
COLS = [(220, 0, 0), (0, 90, 230), (0, 150, 0), (230, 130, 0), (150, 0, 180), (0, 160, 160), (120, 80, 0)]


def main():
    page, cal, sym, trk, rd, out = sys.argv[1:7]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[7:11])
    s = float(sys.argv[11])
    im = Image.open(page).convert("L").crop((x0, y0, x1, y1))
    im = im.resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.LANCZOS).convert("RGB")
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.load_default(size=max(10, int(4 * s + 6)))
    except TypeError:
        font = ImageFont.load_default()

    def P(x, y):
        return ((x - x0) * s, (y - y0) * s)
    c = json.load(open(cal))
    for rx, ry in zip(c["X"], c["Y"]):
        for X, Y in zip(rx, ry):
            if X is not None and x0 <= X <= x1 and y0 <= Y <= y1:
                a, b = P(X, Y)
                dr.rectangle((a - 3, b - 3, a + 3, b + 3), outline=(0, 190, 210), width=1)
    names = []
    if trk != "none":
        for i, (name, pts) in enumerate(json.load(open(trk)).items()):
            names.append(name)
            col = COLS[i % len(COLS)]
            for p in pts:
                if not (x0 <= p["x"] <= x1 and y0 <= p["y"] <= y1):
                    continue
                a, b = P(p["x"], p["y"])
                r = max(1.0, 0.6 * s)
                if p.get("near_grid"):
                    dr.ellipse((a - r, b - r, a + r, b + r), outline=col)
                else:
                    dr.ellipse((a - r, b - r, a + r, b + r), fill=col)
    if rd != "none":
        for r in json.load(open(rd)):
            if r.get("value") is None or r.get("err") is None:
                continue
            col = COLS[names.index(r["curve"]) % len(COLS)] if r["curve"] in names else (0, 0, 0)
            a, b = P(r["px"], r["py"])
            L = 3 * s
            dr.line((a - L, b, a + L, b), fill=col, width=2)
            dr.line((a, b - L, a, b + L), fill=col, width=2)
    if sym != "none":
        for r in json.load(open(sym)):
            x, y = r["centre_px"]
            if not (x0 <= x <= x1 and y0 <= y <= y1):
                continue
            a, b = P(x, y)
            dr.rectangle((a - 2 * s, b - 2 * s, a + 2 * s, b + 2 * s), outline=(230, 0, 230), width=2)
            dr.text((a + 5 * s, b - 9 * s), r["id"], fill=(230, 0, 230), font=font)
    im.save(out, optimize=True)
    print(out, im.size)


if __name__ == "__main__":
    main()
