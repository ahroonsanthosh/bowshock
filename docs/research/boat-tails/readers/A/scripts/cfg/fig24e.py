# Builds the measure.py config for RM E51F26 figure 24 (PDF page 48).
import json, sys
A = sys.argv[1]
xs = [443, 572.6, 703, 831, 960, 1088.5, 1217, 1346, 1475.5, 1603.5, 1735, 1860]
ys = [402, 529, 657, 785, 910, 1038, 1170, 1295, 1424, 1552, 1680, 1807, 1935, 2063, 2192, 2319, 2448, 2576]
yv = [0.14, 0.12, 0.10, 0.08, 0.06, 0.04, 0.02, 0.0, -0.02, -0.04, -0.06, -0.08, -0.10, -0.12, -0.14, -0.16, -0.18, -0.20]
ylab = (0.12, 0.08, 0.04, 0.0, -0.04, -0.08, -0.12, -0.16, -0.20)
MN = ("1.91 is the free-stream Mach number of all tests (text, PDF p. 7); figure 24 gives no Mach number for the measured points: "
      "its M1 labels 1.30, 1.91, 2.10 and 3.50 belong to the predicted C'p,b curves, M1 being the Mach number at the station just upstream of the base; the text (PDF p. 15) says M1 varied from 1.91 to 2.1 among the boattails")
cfg = {
 "image": A + "/render/e51f26_p48-000.jpg", "rot": 0, "page": 48, "source": "RM E51F26", "item": "fig. 24",
 "csv": "rme51f26_fig24.csv", "nd_x": 3,
 "xq": "boattail angle, epsilon, deg",
 "symbols": {"circle": {"kind": "circle", "h": 10.5, "t": 3.0},
             "square": {"kind": "square", "h": 10.0, "t": 3.0},
             "diamond": {"kind": "diamond", "h": 14.5, "t": 3.0},
             "triangle": {"kind": "rtriangle", "h": 12, "t": 3.0}},
 "panels": {"p": {"box": [443, 402, 1990, 2576], "xband": [410, 2565], "yband": [450, 1985],
   "xlines": [[xs[k], float(k), 1 if k % 2 == 0 else 0] for k in range(len(xs))],
   "ylines": [[ys[k], yv[k], 1 if yv[k] in ylab else 0] for k in range(len(ys))],
   "mach": "1.91"}},
 "points": []
}
YQ = {"Cp": "base pressure coefficient Cp,b (axis: base pressure coefficients, Cp,b and C'p,b); free-stream reference: the symbol list defines Cp = (p - p0)/q0",
      "Cpp": "base pressure coefficient C'p,b (axis: base pressure coefficients, Cp,b and C'p,b) = (pb - p1)/q1, referenced to conditions just upstream of the base",
      "unk": "base pressure coefficient, Cp,b or C'p,b (axis: base pressure coefficients, Cp,b and C'p,b); the legend does not say which"}
def add(sym, x, y, series, conf, yq, **kw):
    d = {"panel": "p", "series": series, "sym": sym, "x": x, "y": y, "configuration": conf, "yq": YQ[yq]}
    d.update(kw)
    if "note" in d:
        d["note"] = d["note"] + "; " + MN
    else:
        d["note"] = MN
    cfg["points"].append(d)
C5 = "Db/Dm 0.506; alpha 0 deg; no jet flow"
C7 = "Db/Dm 0.704; alpha 0 deg; no jet flow"
add("circle", 1171.1, 1808.9, "circle, Db/Dm 0.506, Cp,b", C5, "Cp", note="circle centred on the -0.08 grid line")
add("circle", 1353.2, 1669.6, "circle, Db/Dm 0.506, Cp,b", C5, "Cp")
add("circle", 1649.5, 1512.8, "circle, Db/Dm 0.506, Cp,b", C5, "Cp")
add("circle", 1170.4, 1725.4, "flagged circle, Db/Dm 0.506, C'p,b", C5, "Cpp", note="symbol has a flag at its lower left")
add("circle", 1356, 1502, "flagged circle, Db/Dm 0.506, C'p,b", C5, "Cpp", note="flag at lower left; symbol touches the flagged square below it and is crossed by the predicted C'p,b lines; its left wall merges with the 7 deg grid line, so x is taken from the pixel map as the midpoint of the left and right walls (1356 px) and y from the template fit", sigma=1.5, fix="x", alt_px=[(1357.2, 1502.6, "x is taken from the template fit, which the merged grid line and curves pull to 1357.2 px")])
add("circle", 1648.8, 1225.7, "flagged circle, Db/Dm 0.506, C'p,b", C5, "Cpp", note="flag at lower left; a predicted C'p,b line touches it")
add("square", 1168.4, 1835.7, "square, Db/Dm 0.704, Cp,b", C7, "Cp", note="the text (PDF p. 11) says that on the 5.63 deg boattail with Db/Dm 0.704 inadvertent early transition (probably a leaking static orifice near the nose) gave a boundary-layer thickness of 0.20 in at the base against 0.08 to 0.09 in for the other incompletely boattailed bodies")
add("square", 1351.2, 1871.3, "square, Db/Dm 0.704, Cp,b", C7, "Cp", note="square on the 7 deg grid line")
add("square", 1647, 1865.5, "square, Db/Dm 0.704, Cp,b", C7, "Cp")
add("square", 1170.9, 1594.2, "flagged square, Db/Dm 0.704, C'p,b", C7, "Cpp", note="symbol has a flag at its lower left; the text (PDF p. 11) says that on the 5.63 deg boattail with Db/Dm 0.704 inadvertent early transition (probably a leaking static orifice near the nose) gave a boundary-layer thickness of 0.20 in at the base against 0.08 to 0.09 in for the other incompletely boattailed bodies; the text (PDF pp. 15 and 19) calls this point inconsistent for that reason")
add("square", 1356, 1522, "flagged square, Db/Dm 0.704, C'p,b", C7, "Cpp", note="flag at lower left; square touches the flagged circle above it, its left side lies on the 7 deg grid line and predicted C'p,b lines cross it; x is taken from the pixel map as the midpoint of the left and right walls (1356 px) and y from the template fit", sigma=1.5, fix="x", alt_px=[(1354.7, 1522.1, "x is taken from the template fit, which the merged grid line pulls to 1354.7 px")])
add("square", 1650.6, 1280.0, "flagged square, Db/Dm 0.704, C'p,b", C7, "Cpp", note="flag at lower left; square sits on the Cp = 0 line", sigma=1.0)
add("diamond", 443.7, 2150, "diamond, Db/Dm 1, C'p,b", "Db/Dm 1 (cylindrical afterbody); alpha 0 deg; no jet flow", "Cpp", note="diamond centred on the epsilon = 0 axis line")
add("triangle", 1024.0, 1742.5, "triangle, model from reference 6", "model from reference 6 (configuration not given in the figure)", "unk",
    nomatch=True, mach="", flag="ambiguous", sigma=1.0, alt_px=[(1028.3, 1746.7, "the point is the centroid of the triangle's three corners rather than the centre of its bounding box")],
    note="right-triangle symbol as in the legend (right angle at lower right: vertical side on the right, horizontal side at the bottom, hypotenuse rising to the right); point taken at the centre of the symbol's bounding box (x 1011..1037, y 1730..1755 px); the alternative takes the area centroid of the three vertices (1028.3, 1746.7 px); Mach number not given in the figure for this model; the reference list (PDF p. 22) gives reference 6 as NACA RM E50D10, RM-10 missile at Mach numbers from 1.49 to 1.98")
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
