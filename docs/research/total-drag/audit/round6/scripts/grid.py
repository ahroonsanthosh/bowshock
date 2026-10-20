"""Detect gridlines in a box of a rendered page and print them.

Usage: python3 -I grid.py <pdf> <page> <workdir> x0 y0 x1 y1 [frac_v frac_h] [view.png]
Prints each vertical line's x (page px, at the box's vertical middle) and each
horizontal line's y, with fitted skew (px per 1000 px), rms and thickness.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import dig  # noqa: E402


def main():
    pdf, page, work = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    box = tuple(int(v) for v in sys.argv[4:8])
    fv = float(sys.argv[8]) if len(sys.argv) > 8 else 0.5
    fh = float(sys.argv[9]) if len(sys.argv) > 9 else 0.5
    view = sys.argv[10] if len(sys.argv) > 10 else None
    png = dig.render(pdf, page, work)
    a = dig.load(png, box)
    m = dig.dark(a)
    vf, hf = dig.grid_from_box(m, fv, fh)
    H, W = m.shape
    print("vertical lines (x at mid-height, page px):")
    for i, (aa, b, rms, th) in enumerate(vf):
        print(f"  v{i:02d} x={box[0] + aa + b * H / 2:8.1f} skew={b * 1000:6.2f}/1000 rms={rms:4.2f} th={th:4.1f}")
    print("horizontal lines (y at mid-width, page px):")
    for i, (aa, b, rms, th) in enumerate(hf):
        print(f"  h{i:02d} y={box[1] + aa + b * W / 2:8.1f} skew={b * 1000:6.2f}/1000 rms={rms:4.2f} th={th:4.1f}")
    xs = [box[0] + aa + b * H / 2 for aa, b, _, _ in vf]
    ys = [box[1] + aa + b * W / 2 for aa, b, _, _ in hf]
    if len(xs) > 2:
        print("dx:", " ".join(f"{d:.1f}" for d in np.diff(xs)))
    if len(ys) > 2:
        print("dy:", " ".join(f"{d:.1f}" for d in np.diff(ys)))
    if view:
        lines = []
        for aa, b, _, _ in vf:
            lines.append(((aa, 0, aa + b * H, H), (255, 0, 0)))
        for aa, b, _, _ in hf:
            lines.append(((0, aa, W, aa + b * W), (0, 0, 255)))
        dig.save_view(a, view, scale=0.3, lines=lines)


if __name__ == "__main__":
    main()
