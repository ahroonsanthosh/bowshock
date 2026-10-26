# Builds the measure.py config for RM E51F26 figure 30 (PDF page 57).
import json, sys
A = sys.argv[1]
SV = 0.0069   # vertical grid lines drift +0.0069 px in x per px down
def XL(pos, vref, lo, hi):
    return [[pos[k] + (lo - vref) * SV, pos[k] + (hi - vref) * SV, float(k), 1 if k in (0, 2, 4, 6, 8, 10) else 0] for k in range(len(pos))]
def YL(left, vals, lab, slope, c0=688, lo=530, hi=2000):
    return [[left[k] + (lo - c0) * slope, left[k] + (hi - c0) * slope, vals[k], 1 if vals[k] in lab else 0] for k in range(len(left))]
CONF = "Db/Dm 0.704; alpha 0 deg; no jet flow"
MN = "Mach 1.91 is the free-stream test Mach number (text, PDF p. 7), not printed on the figure"
cfg = {
 "image": A + "/render/e51f26_p57-000.jpg", "rot": 0, "page": 57, "source": "RM E51F26", "item": "fig. 30",
 "csv": "rme51f26_fig30.csv", "nd_x": 3,
 "xq": "boattail angle, epsilon, deg",
 "yq": "drag coefficient, CD (symbol list: drag / (q0 pi Dm^2 / 4), free-stream dynamic pressure, maximum body cross-section)",
 "symbols": {"circle": {"kind": "circle", "h": 13.5, "t": 3.0}, "circle0": {"kind": "circle", "h": 16, "t": 3.0},
             "cross": {"kind": "plus", "h": 6, "t": 1.0}},
 "panels": {
  "a": {"box": [513, 345, 2000, 1135], "xband": [360, 1125], "yband": [530, 2000],
        "xlines": XL([512.5, 599.6, 687.5, 774.1, 862.2, 950.5, 1036.7, 1124.7, 1211.5, 1298.8, 1385.2, 1472.4, 1560.4, 1648.0, 1735.2, 1822.0, 1908.9, 1995.6], 431, 360, 1125),
        "ylines": YL([348.8, 436.9, 524.7, 611.8, 699.3, 786.7, 873.4, 960.0, 1047.8, 1134.8], [0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0.0], (0.08, 0.06, 0.04, 0.02, 0.0), -0.0071),
        "item": "fig. 30(a)", "configuration": CONF, "mach": "1.91",
        "note": MN + "; panel (a) has no x tick labels of its own: its grid lines are valued from the labels under panel (c)"},
  "b": {"box": [519, 1215, 2006, 1745], "xband": [1225, 1735], "yband": [530, 2000],
        "xlines": XL([519.3, 606.8, 694.9, 781.7, 869.6, 958.0, 1044.2, 1132.1, 1219.2, 1307.3, 1393.1, 1480.7, 1568.3, 1655.4, 1743.2, 1830.2, 1918.8, 2004.9], 1272, 1225, 1735),
        "ylines": YL([1221.6, 1309.6, 1397.0, 1485.1, 1572.9, 1659.4, 1743.5], [0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03], (0.09, 0.07, 0.05, 0.03), -0.0087),
        "item": "fig. 30(b)", "configuration": CONF, "mach": "1.91",
        "note": MN + "; panel (b) has no x tick labels of its own: its grid lines are valued from the labels under panel (c)"},
  "c": {"box": [523, 1825, 2009, 2535], "xband": [1835, 2525], "yband": [530, 2000],
        "xlines": XL([523.3, 610.9, 698.9, 785.6, 873.2, 962.0, 1048.1, 1136.1, 1223.8, 1311.1, 1398.0, 1485.2, 1572.7, 1660.8, 1748.3, 1835.2, 1923.4, 2008.8], 1910, 1835, 2525),
        "ylines": YL([1832.4, 1919.3, 2006.5, 2093.9, 2181.0, 2267.3, 2355.0, 2442.6, 2530.7], [0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04], (0.12, 0.10, 0.08, 0.06, 0.04), -0.0084),
        "item": "fig. 30(c)", "configuration": CONF, "mach": "1.91", "note": MN},
 },
 "points": []
}
def add(panel, series, sym, x, y, **kw):
    d = {"panel": panel, "series": series, "sym": sym, "x": x, "y": y}
    d.update(kw)
    cfg["points"].append(d)
EB = "experimental base drag (circle; panel (a), base pressure drag)"
add("a", EB, "circle0", 511.8, 568.1, note="circle plotted on the epsilon = 0 axis (no boattail), drawn larger than the other circles; the vertical axis line runs through it")
add("a", EB, "circle", 1012, 773.4, note="circle lies below the faired line, which starts at about 5.5 deg; the text (PDF p. 11) says that on the 5.63 deg boattail with Db/Dm 0.704 inadvertent early transition gave a boundary-layer thickness of 0.20 in at the base; the text (PDF p. 19) calls the 5.63 deg, Db/Dm 0.704 base-drag point inconsistent for that reason")
add("a", EB, "circle", 1131.2, 752.1, note="faired line and 7 deg grid line pass through the circle")
add("a", EB, "circle", 1333.5, 749.5, note="faired line passes through the circle")
FR = "friction drag, Cf = 0.003 (curve only, panel (a))"
for xt, yy, extra in ((5.63, 987.5, ""), (7.03, 1021, ""), (9.33, 1042, "; at this angle the stroke is the flat end of the curve where it runs into the label leader")):
    add("a", FR, "cross", 0, yy, curve=True, xtarget=xt, xval="%.2f" % xt, flag="curve", r=10, sigma=1.0,
        note="friction drag curve labelled Friction drag (Cf = 0.003), an estimate with an assumed friction coefficient, not a measurement; read at the nominal tested boattail angle" + extra)
SP = "experimental side pressure drag (circle; labelled Experimental (0.85 characteristics), panel (b))"
add("b", SP, "circle", 1015.1, 1719.6, note="circle sits on the 0.03 grid line, below the faired line")
add("b", SP, "circle", 1138.6, 1615.6, note="faired line passes through the circle")
add("b", SP, "circle", 1337.1, 1461.7, note="faired line passes through the circle")
PD = "pressure drag (circle; panel (c), total drags)"
add("c", PD, "circle", 1022, 2210.7, note="circle lies below the line through the other two points")
add("c", PD, "circle", 1143.5, 2104.7, note="line and 7 deg grid line pass through the circle")
add("c", PD, "circle", 1343.2, 1954.4, note="line passes through the circle")
TT = "experimental pressure drag plus friction drag (curve only, panel (c))"
for xt, yy in ((5.63, 2061.7), (7.03, 2016)):
    add("c", TT, "cross", 0, yy, curve=True, xtarget=xt, xval="%.2f" % xt, flag="curve", r=12, sigma=1.0,
        note="component drawn only as a curve; read at the nominal tested boattail angle")
add("c", TT, "cross", 1328, 1877, nomatch=True, xval="9.33", flag="untraced", omit_y=True,
    note="the curve ends at about 9.2 deg (x about 1328 px, y about 1877 px) where it meets its label, short of 9.33 deg; not extrapolated, so no value")
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
