# Builds the measure.py config for RM E51F26 figure 29 (PDF page 56).
import json, sys
A = sys.argv[1]
def XL(pos):
    return [[pos[k], float(k), 1 if k in (0, 2, 4, 6, 8, 10) else 0] for k in range(len(pos))]
def YL(left, vals, lab, slope=-0.0104, c0=566, lo=380, hi=1930):
    return [[left[k] + (lo - c0) * slope, left[k] + (hi - c0) * slope, vals[k], 1 if vals[k] in lab else 0] for k in range(len(left))]
CONF = "Db/Dm 0.506; alpha 0 deg; no jet flow"
cfg = {
 "image": A + "/render/e51f26_p56-000.jpg", "rot": 0, "page": 56, "source": "RM E51F26", "item": "fig. 29",
 "csv": "rme51f26_fig29.csv", "nd_x": 3,
 "xq": "boattail angle, epsilon, deg",
 "yq": "drag coefficient, CD (symbol list: drag / (q0 pi Dm^2 / 4), free-stream dynamic pressure, maximum body cross-section)",
 "symbols": {"circle": {"kind": "circle", "h": 12.5, "t": 3.0}, "circle0": {"kind": "circle", "h": 13.5, "t": 3.0}, "circleL": {"kind": "circle", "h": 14.5, "t": 3.0}, "cross": {"kind": "plus", "h": 6, "t": 1.0}},
 "panels": {
  "a": {"box": [371, 360, 1936, 888], "xband": [380, 870], "yband": [380, 1930],
        "xlines": XL([371, 476, 580, 684.3, 788.4, 892.7, 997.2, 1101.8, 1205.8, 1310, 1414.1, 1518.3, 1622.4, 1726.4, 1830.8, 1935.1]),
        "ylines": YL([369.4, 474.9, 578.3, 681.8, 785.5, 887.7], [0.05, 0.04, 0.03, 0.02, 0.01, 0.0], (0.04, 0.02, 0.0)),
        "item": "fig. 29(a)", "configuration": CONF, "mach": "1.91",
        "note": "Mach 1.91 is the free-stream test Mach number (text, PDF p. 7), not printed on the figure; panel (a) has no x tick labels of its own: its grid lines are valued from the labels under panel (c)"},
  "b": {"box": [373, 985, 1938, 1825], "xband": [1000, 1810], "yband": [380, 1930],
        "xlines": XL([373, 479, 583, 687.4, 791.3, 895.7, 1000.2, 1104.6, 1208.6, 1312.4, 1416.8, 1520.9, 1624.8, 1729.1, 1833.4, 1937.7]),
        "ylines": YL([991.8, 1095.6, 1200.3, 1305.1, 1409.0, 1513.1, 1617.0, 1720.3, 1824.6], [0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02], (0.10, 0.08, 0.06, 0.04, 0.02), slope=-0.011),
        "item": "fig. 29(b)", "configuration": CONF, "mach": "1.91",
        "note": "Mach 1.91 is the free-stream test Mach number (text, PDF p. 7), not printed on the figure; panel (b) has no x tick labels of its own: its grid lines are valued from the labels under panel (c)"},
  "c": {"box": [376, 1920, 1941, 2552], "xband": [1935, 2535], "yband": [380, 1930],
        "xlines": XL([376.4, 482.7, 586.6, 690.9, 794.8, 899.1, 1003.9, 1107.9, 1212.1, 1316.2, 1420.4, 1524.3, 1628.1, 1732.5, 1836.8, 1941.1]),
        "ylines": YL([1927.5, 2031.4, 2136.9, 2242.2, 2345.4, 2448.3, 2552.0], [0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05], (0.11, 0.09, 0.07, 0.05)),
        "item": "fig. 29(c)", "configuration": CONF, "mach": "1.91",
        "note": "Mach 1.91 is the free-stream test Mach number (text, PDF p. 7), not printed on the figure"},
 },
 "points": []
}
def add(panel, series, sym, x, y, **kw):
    d = {"panel": panel, "series": series, "sym": sym, "x": x, "y": y}
    d.update(kw)
    cfg["points"].append(d)
EB = "experimental base drag (circle; component of panel (a), base pressure drag)"
add("a", EB, "circle0", 370.2, 544.1, note="circle plotted on the epsilon = 0 axis (no boattail); the vertical axis line runs through it", sigma=1.0)
add("a", EB, "circle", 956.8, 672.7, note="faired curve and 0.02 grid line pass through the circle")
add("a", EB, "circle", 1106, 728.1, note="faired curve and 7 deg grid line pass through the circle")
add("a", EB, "circle", 1344.9, 794.7, note="faired curve passes through the circle")
FR = "friction drag, Cf = 0.003 (curve only, panel (a))"
for xt, yy, extra in ((5.63, 632, "; the predicted base drag curve runs 18 px (about 0.0017) below the friction curve here; the upper stroke, which the label Friction leads to, is read"), (7.03, 678, "; at this angle the friction curve crosses the 0.02 grid line, so the stroke read is the curve merged with the grid line"), (9.33, 707, "")):
    add("a", FR, "cross", 0, yy, curve=True, xtarget=xt, xval="%.2f" % xt, flag="curve", r=8, sigma=1.0,
        note="friction drag curve labelled Friction (Cf = 0.003), an estimate with an assumed skin-friction coefficient, not a measurement; read at the nominal tested boattail angle" + extra)
SP = "experimental side pressure drag (circle; labelled Experimental (0.83 characteristics), panel (b))"
add("b", SP, "circleL", 963.5, 1602, note="faired curve and 0.04 grid line pass through the circle")
add("b", SP, "circleL", 1110.8, 1448.1, note="faired curve and 7 deg grid line pass through the circle")
add("b", SP, "circleL", 1348.3, 1225.2, note="faired curve passes through the circle")
PD = "pressure drag (circle; panel (c), total drags)"
add("c", PD, "circleL", 967, 2435.6, note="line through the points and 0.06 grid line pass through the circle")
add("c", PD, "circleL", 1122.4, 2334.2, note="line through the points, 7 deg grid line and 0.07 grid line pass through the circle")
add("c", PD, "circleL", 1349.3, 2181.7, note="line through the points passes through the circle")
TT = "experimental pressure drag plus friction drag (curve only, panel (c))"
for xt, yy in ((5.63, 2174), (7.03, 2132), (9.33, 1990)):
    add("c", TT, "cross", 0, yy, curve=True, xtarget=xt, xval="%.2f" % xt, flag="curve", r=12, sigma=1.0,
        note="component drawn only as a curve; read at the nominal tested boattail angle")
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
