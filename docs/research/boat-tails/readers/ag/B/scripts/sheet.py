"""Contact sheet of fitted symbols for visual checking.

Usage: python -I sheet.py OUT.json OVERLAY.png PAGE.png SHEET.png [zoom] [cols]
Each tile shows the raw page (left) and the overlay (right) around one
fitted symbol, with the point id written above.
"""
import json
import sys

from PIL import Image, ImageDraw


def main():
    res = json.load(open(sys.argv[1]))
    ov = Image.open(sys.argv[2]).convert("RGB")
    pg = Image.open(sys.argv[3]).convert("RGB")
    out = sys.argv[4]
    z = float(sys.argv[5]) if len(sys.argv) > 5 else 5
    cols = int(sys.argv[6]) if len(sys.argv) > 6 else 4
    tiles = []
    for p in res["points"]:
        h = int(p["size"] * max(1.0, p.get("aspect", 1.0)) + 14)
        cx, cy = int(p.get("bx", p["cx"])), int(p.get("by", p["cy"]))
        box = (cx - h, cy - h, cx + h, cy + h)
        a = pg.crop(box).resize((int(2 * h * z), int(2 * h * z)), Image.NEAREST)
        b = ov.crop(box).resize((int(2 * h * z), int(2 * h * z)), Image.NEAREST)
        t = Image.new("RGB", (a.size[0] * 2 + 6, a.size[1] + 16), (255, 255, 255))
        t.paste(a, (0, 16))
        t.paste(b, (a.size[0] + 6, 16))
        ImageDraw.Draw(t).text((2, 2), "%s %s x=%.4f y=%.4f" % (p["id"], p["series"][:18], p["x"], p["y"]), fill=(0, 0, 0))
        tiles.append(t)
    if not tiles:
        return
    W = max(t.size[0] for t in tiles)
    H = max(t.size[1] for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    S = Image.new("RGB", (W * cols, H * rows), (230, 230, 230))
    for i, t in enumerate(tiles):
        S.paste(t, ((i % cols) * W, (i // cols) * H))
    S.save(out)
    print(out, S.size)


if __name__ == "__main__":
    main()
