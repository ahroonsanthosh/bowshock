"""Probe a panel: gridlines (as gridspec.py) and the dot blobs in given
regions (legend search), in one call.

Usage: python3 -I probe.py <ntrs> <page> <x0 y0 x1 y1> [grid_thr frac_v frac_h] [--dots x0 y0 x1 y1 ...]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import dig  # noqa: E402
import dots  # noqa: E402
from fig import SCRATCH  # noqa: E402


def main():
    args = sys.argv[1:]
    dl = []
    if "--dots" in args:
        i = args.index("--dots")
        dl = [int(v) for v in args[i + 1:]]
        args = args[:i]
    nid, page = args[0], int(args[1])
    bx = [int(v) for v in args[2:6]]
    gt = float(args[6]) if len(args) > 6 else 0.6
    fv = float(args[7]) if len(args) > 7 else 0.15
    fh = float(args[8]) if len(args) > 8 else 0.15
    png = dig.render(f"{SCRATCH}/dl/{nid}/{nid}.pdf", page, f"{SCRATCH}/work/{nid}")
    a = dig.load(png, tuple(bx))
    vf, hf = dig.grid_from_box(a < gt, fv, fh, longruns=True)
    H, W = a.shape
    xs = [bx[0] + L[0] + L[1] * H / 2 for L in vf]
    ys = [bx[1] + L[0] + L[1] * W / 2 for L in hf]
    print(len(xs), "v:", " ".join(f"{i}:{x:.0f}" for i, x in enumerate(xs)))
    print("   dx:", " ".join(f"{d:.0f}" for d in np.diff(xs)))
    print(len(ys), "h:", " ".join(f"{i}:{y:.0f}" for i, y in enumerate(ys)))
    print("   dy:", " ".join(f"{d:.0f}" for d in np.diff(ys)))
    if dl:
        full = dig.dark(dig.load(png), 0.6)
        for k in range(0, len(dl), 4):
            reg = tuple(dl[k:k + 4])
            print("dots in", reg, [[round(v) for v in b[:2]] for b in dots.dot_blobs(full, reg)])


if __name__ == "__main__":
    main()
