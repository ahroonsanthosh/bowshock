"""Crop a region of a 400 dpi page render and optionally resize, with an optional pixel grid.

usage: python3 -I crop.py PAGE X0 Y0 X1 Y1 OUT [SCALE] [GRID]
PAGE: page number (1..21). Coordinates are in 400 dpi page pixels.
SCALE: output scale factor (default 1.0).
GRID: if given (pixel step in page pixels), draw thin labelled grid lines.
"""
import sys
from PIL import Image, ImageDraw

WORK = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"


def main():
    page = int(sys.argv[1])
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    out = sys.argv[6]
    scale = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
    grid = int(sys.argv[8]) if len(sys.argv) > 8 else 0
    im = Image.open(f"{WORK}/p400-{page:02d}.png").convert("RGB")
    c = im.crop((x0, y0, x1, y1))
    if scale != 1.0:
        c = c.resize((int(c.width * scale), int(c.height * scale)), Image.LANCZOS)
    if grid:
        d = ImageDraw.Draw(c)
        gx = (x0 // grid + 1) * grid
        while gx < x1:
            px = (gx - x0) * scale
            d.line([(px, 0), (px, c.height)], fill=(255, 0, 0), width=1)
            d.text((px + 2, 2), str(gx), fill=(255, 0, 0))
            gx += grid
        gy = (y0 // grid + 1) * grid
        while gy < y1:
            py = (gy - y0) * scale
            d.line([(0, py), (c.width, py)], fill=(0, 0, 255), width=1)
            d.text((2, py + 2), str(gy), fill=(0, 0, 255))
            gy += grid
    c.save(out)
    print(out, c.size)


if __name__ == "__main__":
    main()
