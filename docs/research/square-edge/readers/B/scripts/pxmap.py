"""Convert pixel centres to axis values with a calibration from gridfit.py.

usage: python3 -I pxmap.py map.json points.csv out.csv
points.csv columns: id,px,py,epx,epy[,...]  (epx/epy = reading error in px)
Two conversions are written:
  aff_X, aff_Y : inverse of the global least-squares affine fit through all
                 labelled tick-line intersections;
  loc_X, loc_Y : linear between the two fitted labelled lines that bracket
                 the point (each line evaluated at the point), i.e. the
                 calibration of the nearest labelled ticks.
and the errors eX, eY from epx/epy through the local scale.
Values are given to 4 decimals (the pixel resolution is about 1/1600 of
the axis span); they are not rounded to the plot's precision.
"""
import csv
import json
import sys
import numpy as np

M = json.load(open(sys.argv[1]))
cx, cy = np.array(M["cx"]), np.array(M["cy"])
V = sorted(M["vlines"], key=lambda t: t[0])
H = sorted(M["hlines"], key=lambda t: t[0])
A = np.array([[cx[1], cx[2]], [cy[1], cy[2]]])


def aff_inv(px, py):
    return np.linalg.solve(A, [px - cx[0], py - cy[0]])


def local(px, py):
    # vertical lines: x = a0 + a1*y
    xs = [(v, c[0] + c[1] * py) for v, c in V]
    ys = [(v, c[0] + c[1] * px) for v, c in H]

    def interp(lines, p):
        lines = sorted(lines, key=lambda t: t[1])
        for (v0, p0), (v1, p1) in zip(lines[:-1], lines[1:]):
            if p0 <= p <= p1:
                return v0 + (p - p0) / (p1 - p0) * (v1 - v0), (v1 - v0) / (p1 - p0)
        # outside: extrapolate from nearest pair
        if p < lines[0][1]:
            (v0, p0), (v1, p1) = lines[0], lines[1]
        else:
            (v0, p0), (v1, p1) = lines[-2], lines[-1]
        return v0 + (p - p0) / (p1 - p0) * (v1 - v0), (v1 - v0) / (p1 - p0)
    X, sx = interp(xs, px)
    Y, sy = interp(ys, py)
    return X, Y, abs(sx), abs(sy)


rows = list(csv.DictReader(open(sys.argv[2])))
out = []
for r in rows:
    px, py = float(r["px"]), float(r["py"])
    aX, aY = aff_inv(px, py)
    X, Y, sx, sy = local(px, py)
    # one refinement: lines are evaluated at the point itself already
    o = dict(r)
    o.update({"aff_X": "%.4f" % aX, "aff_Y": "%.4f" % aY,
              "loc_X": "%.4f" % X, "loc_Y": "%.4f" % Y,
              "eX": "%.4f" % (float(r.get("epx", 1)) * sx),
              "eY": "%.4f" % (float(r.get("epy", 1)) * sy)})
    out.append(o)
with open(sys.argv[3], "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
    w.writeheader()
    w.writerows(out)
for o in out:
    print(o["id"], o["px"], o["py"], "aff", o["aff_X"], o["aff_Y"], "loc", o["loc_X"], o["loc_Y"], "err", o["eX"], o["eY"])
