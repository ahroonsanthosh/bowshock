"""Find the centre dots of dotted symbols on a halftone scan (CR-149372 fig. 8a).

usage: python3 -I dot_detect.py PAGE.png OUT.json x0,y0,x1,y1 [excl x0,y0,x1,y1;...]

The 300 dpi JBIG2 page is dithered, so ink (gray < 128) is box-blurred with
radius 2 first. A centre dot is a local maximum of the blurred ink above
0.25 whose surroundings at 5 to 7 px are nearly empty (mean below 0.12),
which is the white interior of the symbol around its dot; lines and outlines
fail that test; there must also be an outline (mean blurred ink of 0.10 or
more, and a maximum of 0.35, at 9 to 18 px), which isolated dither specks in
the empty background lack. Each candidate is reported with its darkness-weighted centroid
over +-3 px. Candidates are then checked by eye and typed on contact sheets.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None


def main():
    page, out, box = sys.argv[1], sys.argv[2], sys.argv[3]
    excl = [tuple(int(v) for v in b.split(",")) for b in sys.argv[4].split(";")] if len(sys.argv) > 4 else []
    x0, y0, x1, y1 = (int(v) for v in box.split(","))
    ink = (np.asarray(Image.open(page).convert("L")) < 128).astype(np.uint8) * 255
    B = np.asarray(Image.fromarray(ink).filter(ImageFilter.BoxBlur(2))).astype(float) / 255.0
    yy, xx = np.mgrid[-7:8, -7:8]
    rr = np.hypot(xx, yy)
    ring = (rr >= 5) & (rr <= 7)
    oy, ox = np.mgrid[-18:19, -18:19]
    outer = (np.hypot(ox, oy) >= 9) & (np.hypot(ox, oy) <= 18)
    cands = []
    for y in range(y0 + 8, y1 - 8):
        row = B[y]
        for x in range(x0 + 8, x1 - 8):
            v = row[x]
            if v < 0.25:
                continue
            win = B[y - 1:y + 2, x - 1:x + 2]
            if v < win.max():
                continue
            if any(a <= x < c and b <= y < d for a, b, c, d in excl):
                continue
            p = B[y - 7:y + 8, x - 7:x + 8]
            if p[ring].mean() > 0.12:
                continue
            q = B[y - 18:y + 19, x - 18:x + 19]
            if q.shape != outer.shape or q[outer].max() < 0.35 or q[outer].mean() < 0.10:
                continue
            w = B[y - 3:y + 4, x - 3:x + 4]
            cy, cx = np.mgrid[y - 3:y + 4, x - 3:x + 4]
            cands.append(dict(x=float((w * cx).sum() / w.sum()), y=float((w * cy).sum() / w.sum()),
                              peak=round(float(v), 3), ring=round(float(p[ring].mean()), 3)))
    # merge duplicates within 3 px
    merged = []
    for c in sorted(cands, key=lambda c: -c["peak"]):
        if all(np.hypot(c["x"] - m["x"], c["y"] - m["y"]) > 3 for m in merged):
            merged.append(c)
    merged.sort(key=lambda c: (c["x"], c["y"]))
    for i, c in enumerate(merged):
        c["n"] = i
    json.dump(merged, open(out, "w"), indent=1)
    print(len(merged), "dots")


if __name__ == "__main__":
    main()
