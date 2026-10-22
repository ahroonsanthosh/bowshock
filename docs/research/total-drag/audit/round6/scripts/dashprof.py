"""Dash pattern along a polyline given by hand (page px), for telling line
styles apart where trackers swap lines: at each step of 1 px along the
polyline, ink within +-tol px across it (gridlines removed) is 1, else 0;
runs of ink and gaps are printed (px along the line), with the page x of
each run's start.

Usage: python3 -I dashprof.py <spec.json> <tol> x0 y0 x1 y1 [x2 y2 ...]
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from fig import from_spec  # noqa: E402


def main():
    spec = json.load(open(sys.argv[1]))
    tol = int(sys.argv[2])
    pts = [float(v) for v in sys.argv[3:]]
    P = list(zip(pts[0::2], pts[1::2]))
    f = from_spec(spec)
    bx = spec["box"]
    m = f.clean
    seq = []
    for (xa, ya), (xb, yb) in zip(P[:-1], P[1:]):
        L = int(np.hypot(xb - xa, yb - ya))
        nx, ny = -(yb - ya) / L, (xb - xa) / L
        for i in range(L):
            x = xa + (xb - xa) * i / L - bx[0]
            y = ya + (yb - ya) * i / L - bx[1]
            ink = False
            for o in range(-tol, tol + 1):
                X, Y = int(round(x + o * nx)), int(round(y + o * ny))
                if 0 <= Y < m.shape[0] and 0 <= X < m.shape[1] and m[Y, X]:
                    ink = True
                    break
            seq.append((ink, x + bx[0]))
    out = []
    cur, start, n = seq[0][0], seq[0][1], 0
    for ink, x in seq:
        if ink == cur:
            n += 1
        else:
            out.append(("i" if cur else "g", n, int(start)))
            cur, start, n = ink, x, 1
    out.append(("i" if cur else "g", n, int(start)))
    print(" ".join(f"{k}{n}@{x}" for k, n, x in out))


if __name__ == "__main__":
    main()
