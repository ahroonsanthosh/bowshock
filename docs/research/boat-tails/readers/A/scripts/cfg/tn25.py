# Builds the measure.py config for TN 3819 figure 25(b) (PDF page 56), page rotated 270 (PIL) for reading.
import json, sys
A = sys.argv[1]
SV = 5.7 / 697; SH = -4.4 / 440
xs = [1673.4, 1760.0, 1846.4, 1932.0, 2016.0, 2102.0, 2187.5, 2273.1, 2358.5, 2443.1, 2528.1]
xv = [2.0 * k for k in range(11)]
ys = [295.0, 381.5, 468.9, 553.0, 638.5, 723.5, 810.0, 895.5, 981.5, 1067.1, 1153.5, 1239.0, 1325.1, 1410.5, 1495.5, 1582.0, 1667.3]
yv = [round(-0.32 + 0.02 * k, 2) for k in range(17)]
XB = [300, 1655]; YB = [1685, 2520]
cfg = {
 "image": A + "/render/tn3819_p56-000.jpg", "rot": 270, "page": 56, "source": "TN 3819", "item": "fig. 25(b)",
 "csv": "tn3819_fig25b.csv", "nd_x": 3,
 "xq": "boattail angle, beta, deg",
 "yq": "base pressure coefficient, PB (axis label) = (pB - p_inf)/q_inf, free-stream reference (TN 3819 symbol list, PDF p. 6)",
 "symbols": {"circle": {"kind": "circle", "h": 11.5, "t": 2.0, "hrange": [10, 13]}},
 "panels": {"p": {"box": [1676, 293, 2531, 1665], "xband": XB, "yband": YB,
   "xlines": [[xs[k] + (XB[0] - 628) * SV, xs[k] + (XB[1] - 628) * SV, xv[k], 1 if xv[k] % 4 == 0 else 0] for k in range(len(xs))],
   "ylines": [[ys[k] + (YB[0] - 1885) * SH, ys[k] + (YB[1] - 1885) * SH, yv[k], 1 if yv[k] in (-0.16, -0.12, -0.08, -0.04, 0.0) else 0] for k in range(len(ys))],
   "mach": "3.24", "configuration": "conical boattail model of ref. 5 (body diameter D = 1.97 in per the axis label of fig. 25(a)); boattail angle on the x axis; alpha 0 deg"}},
 "points": []
}
NOTE = "Mach number from the caption, M infinity = 3.24 (free stream); source as the legend gives it: Exp. ref. 5"
def add(x, y, **kw):
    d = {"panel": "p", "sym": "circle", "x": x, "y": y, "series": "circle, Exp. ref. 5"}
    d.update(kw)
    d["note"] = (d.get("note", "") + ("; " if d.get("note") else "") + NOTE)
    cfg["points"].append(d)
add(1679, 1273.5, note="circle centred close to the beta = 0 axis line, which runs through it")
add(1785.5, 1297, note="predicted curves run into the circle")
add(1891, 1332, note="predicted curves and the -0.08 grid line touch the circle")
add(2109.5, 1398.6, note="the 10 deg grid line runs through the circle")
add(2321, 1428, note="centre dot visible")
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
