"""Overlays for the BRL Report 934 Graph I transcription.

usage: python3 -I brl_overlay.py PAGE.png CALIB.json SYMBOLS.json OUT.png x0 y0 x1 y1 scale TITLE_KEY
SYMBOLS.json may be "none". Cyan squares: measured ruling intersections.
Each symbol: a box of +-(reading error) px about the centre read, coloured by
the call (red plus, blue dot, green open circle, orange crossed circle), and
its id. TITLE_KEY selects a title below (keeps shell arguments simple).
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
TITLES = {
    "cal": "BRL 934 Graph I: cyan squares = measured ruling intersections (every 0.05 in M, 0.025 in C_D)",
    "sym": "BRL 934 Graph I: red plus, blue dot, green open circle, orange crossed circle; box = centre error",
}
COL = {"plus": (230, 0, 0), "dot": (0, 70, 230), "open circle": (0, 160, 0), "crossed circle": (240, 140, 0)}


def main():
    page, cal, sym, out = sys.argv[1:5]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[5:9])
    s = float(sys.argv[9])
    title = TITLES.get(sys.argv[10]) if len(sys.argv) > 10 else None
    im = Image.open(page).convert("L").crop((x0, y0, x1, y1))
    im = im.resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.LANCZOS).convert("RGB")
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.load_default(size=max(12, int(10 + 4 * s)))
    except TypeError:
        font = ImageFont.load_default()

    def P(x, y):
        return ((x - x0) * s, (y - y0) * s)

    c = json.load(open(cal))
    for rx, ry in zip(c["X"], c["Y"]):
        for X, Y in zip(rx, ry):
            if X is not None and x0 <= X <= x1 and y0 <= Y <= y1:
                a, b = P(X, Y)
                r = max(2, 3 * s)
                dr.rectangle((a - r, b - r, a + r, b + r), outline=(0, 190, 210), width=2)
    if sym != "none":
        for r in json.load(open(sym)):
            x, y = r["centre_px"]
            if not (x0 <= x <= x1 and y0 <= y <= y1):
                continue
            ex, ey = r["centre_err_px"]
            col = COL[r["symbol"]]
            a, b = P(x, y)
            dr.rectangle((a - ex * s, b - ey * s, a + ex * s, b + ey * s), outline=col, width=2)
            dr.line((a - 3, b, a + 3, b), fill=col, width=1)
            dr.line((a, b - 3, a, b + 3), fill=col, width=1)
            dr.text((a + 30 * s, b - 8 * s), r["id"], fill=col, font=font)
    if title:
        dr.rectangle((0, 0, im.size[0], 18 + 4 * s), fill=(255, 255, 255))
        dr.text((4, 2), title, fill=(0, 0, 0), font=font)
    im.save(out, optimize=True)
    print(out, im.size)


if __name__ == "__main__":
    main()
