# Builds the measure.py config for TN 3819 figure 21 (PDF page 52), page rotated 270 (PIL) for reading.
import json, sys
A = sys.argv[1]
SV = 2.0 / 712   # vertical lines drift in x per px down
SH = -2.0 / 880  # horizontal lines drift in y per px right
xs = [666.7, 784.2, 902.6, 1019.1, 1137.5, 1254.1, 1372.0, 1487.3, 1605.4, 1723.5, 1841.0, 1958.5, 2075.0, 2193.0, 2309.2, 2427.2]
xv = [1.0 + 0.2 * k for k in range(16)]
ys = [328.3, 446.3, 563.4, 682.0, 799.3, 916.6, 1034.6, 1151.9, 1270.5, 1387.5, 1506.1, 1623.0, 1741.6]
yv = [-0.24, -0.22, -0.20, -0.18, -0.16, -0.14, -0.12, -0.10, -0.08, -0.06, -0.04, -0.02, 0.0]
ylab = (-0.24, -0.20, -0.16, -0.12, -0.08, -0.04, 0.0)
XB = [335, 1735]; YB = [675, 2420]
cfg = {
 "image": A + "/render/tn3819_p52-000.jpg", "rot": 270, "page": 52, "source": "TN 3819", "item": "fig. 21",
 "csv": "tn3819_fig21.csv", "nd_x": 3, "mach_from_x": True,
 "xq": "Mach number, M infinity (free stream)",
 "yq": "base pressure coefficient, PB (axis label) = (pB - p_inf)/q_inf, free-stream reference (TN 3819 symbol list, PDF p. 6)",
 "symbols": {"circle": {"kind": "circle", "h": 15.5, "t": 2.5, "hrange": [14, 17]},
             "square": {"kind": "square", "h": 13.5, "t": 2.5, "hrange": [12, 15]},
             "triangle": {"kind": "triangle", "h": 17, "t": 2.5, "hrange": [15, 20]},
             "diamond": {"kind": "diamond", "h": 15, "t": 2.5}},
 "panels": {"p": {"box": [667, 328, 2427, 1742], "xband": XB, "yband": YB,
   "xlines": [[xs[k] + (XB[0] - 1040) * SV, xs[k] + (XB[1] - 1040) * SV, round(xv[k], 1), 1 if k in (0, 5, 10, 15) else 0] for k in range(len(xs))],
   "ylines": [[ys[k] + (YB[0] - 1110) * SH, ys[k] + (YB[1] - 1110) * SH, yv[k], 1 if yv[k] in ylab else 0] for k in range(len(ys))],
   "mach": "", "configuration": "10 deg cone-cylinder, fineness ratio 5 (caption); alpha 0 deg"}},
 "points": []
}
TRI = "triangle centre taken at its centroid (template fit)"
SRC = "legend: all experimental points taken from compilation of Ref. 2; the legend does not say what the individual symbol shapes stand for"
def add(sym, x, y, series=None, **kw):
    d = {"panel": "p", "sym": sym, "x": x, "y": y, "series": series or sym}
    d.update(kw)
    if sym == "triangle":
        d["note"] = TRI + ("; " + d["note"] if d.get("note") else "")
    d["note"] = (d.get("note", "") + ("; " if d.get("note") else "") + SRC + "; the mach column repeats the x reading (free-stream Mach number is the abscissa)")
    cfg["points"].append(d)
FC = "flagged circle (tick at upper right)"
OV = "overlaps neighbouring symbols"
# M about 1.2 to 1.4
add("circle", 793.7, 453.5, note=OV, sigma=1.0)
add("circle", 813.3, 456.8, nomatch=True, note=OV + "; only the top arc and right side are free of other circles: centre from those arcs (top 441 px, right side 829 px) with the radius of its neighbours, about 16 px", sigma=1.5)
add("circle", 814, 471, note=OV, sigma=1.5)
add("circle", 826.9, 495.2, note=OV)
add("circle", 897.4, 580.7)
# M about 1.5 to 1.7
add("triangle", 980, 630.5, note=OV, tri_bbox=True, flag="ambiguous")
add("triangle", 961, 682, note="the -0.18 grid line runs through the triangle", tri_bbox=True, flag="ambiguous")
add("triangle", 961, 747, tri_bbox=True, flag="ambiguous")
add("circle", 991.8, 655.7, note=OV)
add("circle", 987.5, 689, note=OV, sigma=1.0)
add("circle", 1020.6, 665.7, note=OV)
add("circle", 1021, 696, note=OV, sigma=1.0)
add("circle", 1008.2, 716.4, note=OV)
add("circle", 1071.4, 681.5)
# M about 1.8 to 1.9
add("circle", 1128.7, 659.0)
add("circle", 1136.1, 698.4)
add("circle", 1144.3, 756.2, note=OV + "; a second, offset arc runs outside this circle's lower left (see the next row)")
add("circle", 1142.0, 756.1, nomatch=True, flag="ambiguous", sigma=2.0, series="circle (possible second circle)",
    alt="not a separate point: a redrawn outline of the circle at about M 1.81, PB -0.168",
    note="only a short arc, about 3 px outside the lower left of the circle at about M 1.81, shows here: it may be a second circle almost on top of the first or a redrawn outline; centre estimated by shifting the first circle 3 px along that direction")
add("circle", 1182.4, 774.2, note=OV)
add("circle", 1191.8, 786.0, nomatch=True, note=OV + "; left half hidden inside the circle above it: centre from its right side (1206.5 px), the top arc seen inside the other circle (771 px) and the bottom on the -0.10 grid line (801 px)", sigma=1.5)
add("circle", 1151.5, 799.7, note="the 1.8 and -0.10 grid lines cross the circle")
# M = 2.0 to 2.1
add("square", 1256.9, 853.8)
add("circle", 1254.1, 891.0, series=FC)
add("square", 1257.8, 940)
add("circle", 1254.4, 970.6, note="the bottom of the circle is drawn pointed where it meets the 2.0 grid line; read as a plain circle")
add("triangle", 1294, 988, tri_bbox=True, flag="ambiguous")
# M about 2.2 to 2.35
add("circle", 1369, 905, series=FC)
add("circle", 1449.75, 952.5, note=OV)
add("circle", 1449, 984, note=OV, sigma=1.5)
add("circle", 1436.5, 997.6, note=OV)
# M about 2.65 to 3.9
add("circle", 1647.4, 1154.0, series=FC)
add("circle", 1682.6, 1104.0, series=FC)
add("diamond", 1795.4, 1064.6, nomatch=True, note="diamond drawn taller than wide (about 27 by 46 px); centre taken as the middle of its bounding box")
add("circle", 1916.8, 1161.5, series=FC)
add("circle", 1929.3, 1208.2, series=FC)
add("circle", 2138.3, 1281.0, series=FC)
add("circle", 2196.3, 1329.4, series=FC)
add("circle", 2319.5, 1288.0, series=FC, note="the 3.8 grid line runs through the circle")
add("circle", 2344.7, 1299.6, series=FC)
add("circle", 2340.0, 1362.5, series=FC)
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
