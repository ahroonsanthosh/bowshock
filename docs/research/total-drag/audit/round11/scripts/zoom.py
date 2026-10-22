"""High-zoom view of a small page region with contrast stretched, for typing
and centring faint symbols by eye (round 11, TN 3548 fig. 6).

usage: python3 -I zoom.py PAGE.png OUT.png x0 y0 x1 y1 SCALE [MARKS.json|none]
Grey levels are stretched so that the 1st percentile of the crop is black and
the 99th white, then the crop is enlarged with nearest-neighbour pixels.
Thin red lines every 5 page px (labelled every 10); MARKS: list of
{x, y, label} drawn as small blue crosses (for example symbol centres read).
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None


def main():
    src, dst = sys.argv[1], sys.argv[2]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
    s = int(sys.argv[7])
    marks = json.load(open(sys.argv[8])) if len(sys.argv) > 8 and sys.argv[8] != "none" else []
    a = np.asarray(Image.open(src).convert("L").crop((x0, y0, x1, y1))).astype(float)
    lo, hi = np.percentile(a, 1), np.percentile(a, 99)
    a = np.clip((a - lo) / max(1.0, hi - lo) * 255, 0, 255).astype(np.uint8)
    im = Image.fromarray(a).resize(((x1 - x0) * s, (y1 - y0) * s), Image.NEAREST).convert("RGB")
    dr = ImageDraw.Draw(im)
    for X in range((x0 // 5 + 1) * 5, x1, 5):
        dr.line(((X - x0) * s, 0, (X - x0) * s, im.size[1]), fill=(255, 150, 150) if X % 10 else (255, 60, 60))
        if X % 10 == 0:
            dr.text(((X - x0) * s + 2, 2), str(X), fill=(220, 0, 0))
    for Y in range((y0 // 5 + 1) * 5, y1, 5):
        dr.line((0, (Y - y0) * s, im.size[0], (Y - y0) * s), fill=(255, 150, 150) if Y % 10 else (255, 60, 60))
        if Y % 10 == 0:
            dr.text((2, (Y - y0) * s + 2), str(Y), fill=(220, 0, 0))
    for m in marks:
        if x0 <= m["x"] <= x1 and y0 <= m["y"] <= y1:
            a_, b_ = (m["x"] - x0 + 0.5) * s, (m["y"] - y0 + 0.5) * s
            dr.line((a_ - 6, b_, a_ + 6, b_), fill=(0, 0, 255), width=2)
            dr.line((a_, b_ - 6, a_, b_ + 6), fill=(0, 0, 255), width=2)
            dr.text((a_ + 5, b_ + 3), m.get("label", ""), fill=(0, 0, 200))
    im.save(dst)
    print(dst, im.size)


if __name__ == "__main__":
    main()
