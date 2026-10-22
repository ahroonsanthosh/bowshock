"""Print the gridlines a spec's settings detect (page px at mid-extent), so
the line values (xvals/yvals, xsel/ysel) can be assigned.

Usage: python3 -I gridspec.py <spec.json>
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import dig  # noqa: E402
from fig import SCRATCH  # noqa: E402


def main():
    spec = json.load(open(sys.argv[1]))
    nid = spec["ntrs"]
    png = dig.render(f"{SCRATCH}/dl/{nid}/{nid}.pdf", spec["page"], f"{SCRATCH}/work/{nid}")
    bx = spec["box"]
    a = dig.load(png, tuple(bx))
    vf, hf = dig.grid_from_box(a < spec.get("grid_thr", 0.55), spec.get("frac_v", 0.5), spec.get("frac_h", 0.5),
                               longruns=spec.get("longruns", False),
                               skews=(spec.get("skew_v"), spec.get("skew_h")))
    H, W = a.shape
    xs = [bx[0] + L[0] + L[1] * H / 2 for L in vf]
    ys = [bx[1] + L[0] + L[1] * W / 2 for L in hf]
    print(len(xs), "v:", " ".join(f"{i}:{x:.0f}" for i, x in enumerate(xs)))
    print("   dx:", " ".join(f"{d:.0f}" for d in np.diff(xs)))
    print(len(ys), "h:", " ".join(f"{i}:{y:.0f}" for i, y in enumerate(ys)))
    print("   dy:", " ".join(f"{d:.0f}" for d in np.diff(ys)))


if __name__ == "__main__":
    main()
