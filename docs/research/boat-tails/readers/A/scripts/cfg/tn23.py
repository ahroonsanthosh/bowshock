# Builds the measure.py config for TN 3819 figure 23 (PDF page 54), page rotated 270 (PIL) for reading.
import json, sys
A = sys.argv[1]
SV = 3.0 / 520
SH = -5.0 / 770
xs = [515, 599, 683, 767, 852, 936.5, 1021, 1105, 1189, 1273.5, 1357.5, 1442, 1526, 1610, 1695, 1781, 1865, 1949, 2033]
xv = [-16 + 2 * k for k in range(19)]
ys = [593.4, 678.2, 762.8, 848.0, 932.2, 1016.6, 1101.6, 1185.9, 1271.0, 1355.1, 1440.3, 1524.5, 1609.4]
yv = [-0.24, -0.22, -0.20, -0.18, -0.16, -0.14, -0.12, -0.10, -0.08, -0.06, -0.04, -0.02, 0.0]
ylab = (-0.24, -0.20, -0.16, -0.12, -0.08, -0.04, 0.0)
XB = [600, 1600]; YB = [520, 2028]
cfg = {
 "image": A + "/render/tn3819_p54-000.jpg", "rot": 270, "page": 54, "source": "TN 3819", "item": "fig. 23",
 "csv": "tn3819_fig23.csv", "nd_x": 3,
 "xq": "boattail angle, beta, deg (negative = cone, per text p. 17)",
 "yq": "base pressure coefficient, PB (axis label) = (pB - p_inf)/q_inf, free-stream reference (TN 3819 symbol list, PDF p. 6)",
 "symbols": {"circle": {"kind": "circle", "h": 11.5, "t": 2.0, "hrange": [10, 13]},
             "square": {"kind": "square", "h": 10, "t": 2.0, "hrange": [9, 11.5]},
             "triangle": {"kind": "triangle", "h": 14, "t": 2.0, "hrange": [12, 16]}},
 "panels": {"p": {"box": [515, 588, 2034, 1610], "xband": XB, "yband": YB,
   "xlines": [[xs[k] + (XB[0] - 850) * SV, xs[k] + (XB[1] - 850) * SV, float(xv[k]), 1 if xv[k] % 4 == 0 else 0] for k in range(len(xs))],
   "ylines": [[ys[k] + (YB[0] - 890) * SH, ys[k] + (YB[1] - 890) * SH, yv[k], 1 if yv[k] in ylab else 0] for k in range(len(ys))],
   "mach": "about 2.9"}},
 "points": []
}
MN = "Mach number from the caption, M infinity about 2.9 (free stream)"
LEG = {"triangle": ("triangle, Ames", "Ames body drawn in the legend as a pointed (ogive) nose blending into an afterbody of constant diameter; boattail angle on the x axis; alpha 0 deg"),
       "circle": ("circle, NOL, ref. 5", "NOL model of ref. 5, drawn in the legend as a conical nose, cylinder and conical boattail; boattail angle on the x axis; alpha 0 deg"),
       "square": ("square, Ames", "Ames body drawn in the legend as a simple cone (negative boattail angle = cone, text p. 17); alpha 0 deg")}
def add(sym, x, y, **kw):
    d = {"panel": "p", "sym": sym, "x": x, "y": y, "series": LEG[sym][0], "configuration": LEG[sym][1]}
    d.update(kw)
    d["note"] = (d.get("note", "") + ("; " if d.get("note") else "") + MN + "; source as the legend gives it: " + LEG[sym][0].split(", ", 1)[1])
    cfg["points"].append(d)
TRI = "triangle centre taken at its centroid (template fit)"
add("square", 558, 1100, note="centre dot visible inside the symbol")
add("square", 770, 1115, note="the -12 deg grid line and a predicted curve cross the symbol")
add("square", 979.5, 1131.5, note="centre dot visible inside the symbol; predicted curves cross it")
add("circle", 1188, 1135, note="the 0 deg grid line runs through the circle")
add("triangle", 1190, 1179, note=TRI + "; predicted curves cross the triangle and hide part of it", tri_bbox=True, flag="ambiguous", sigma=1.5)
add("circle", 1294, 1166, note="centre dot visible inside the symbol")
add("circle", 1401, 1212.5, note="centre dot visible inside the symbol; predicted curves touch it")
add("triangle", 1564, 1270, note=TRI + "; the -0.08 grid line and predicted curves cross the triangle", tri_bbox=True, flag="ambiguous", sigma=1.5)
add("circle", 1611, 1296, r=6, note="the 10 deg grid line runs through the circle")
add("circle", 1823.5, 1334, note="centre dot visible; a triangle overlaps its right side")
add("triangle", 1834, 1334, note=TRI + "; left half hidden behind the circle at about 15 deg", tri_bbox=True, flag="ambiguous", sigma=2.0)
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
