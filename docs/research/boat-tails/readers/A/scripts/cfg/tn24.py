# Builds the measure.py config for TN 3819 figure 24 (PDF page 55), page rotated 270 (PIL) for reading.
import json, sys
A = sys.argv[1]
def XL(pos):
    return [[pos[k], float(k), 1 if k % 2 == 0 else 0] for k in range(len(pos))]
def YL(pos, lab=True):
    vals = [-0.16, -0.14, -0.12, -0.10, -0.08, -0.06, -0.04, -0.02, 0.0]
    return [[pos[k], vals[k], 1 if vals[k] in (-0.16, -0.12, -0.08, -0.04, 0.0) else 0] for k in range(len(pos))]
cfg = {
 "image": A + "/render/tn3819_p55-000.jpg", "rot": 270, "page": 55, "source": "TN 3819", "item": "fig. 24",
 "csv": "tn3819_fig24.csv", "nd_x": 3,
 "xq": "boattail angle, beta, deg",
 "yq": "base pressure coefficient, PB (axis label) = (pB - p_inf)/q_inf, free-stream reference (TN 3819 symbol list, PDF p. 6)",
 "symbols": {"circle": {"kind": "circle", "h": 11.5, "t": 2.0, "hrange": [10, 13]}},
 "panels": {
  "a": {"box": [446, 756, 1433, 1550], "xband": [765, 1540], "yband": [455, 1425],
        "xlines": XL([446.3, 544.7, 644.5, 742.4, 840.8, 939.5, 1040.3, 1137.8, 1235.8, 1334.4, 1433.2]),
        "ylines": YL([756.4, 855.4, 954.7, 1053.2, 1153.0, 1252.0, 1351.4, 1450.1, 1549.9]),
        "item": "fig. 24(a)", "mach": "1.91", "configuration": "conical boattail, h/D = 0.506 (base to maximum diameter); alpha 0 deg"},
  "b": {"box": [1630, 759, 2617, 1553], "xband": [765, 1545], "yband": [1640, 2610],
        "xlines": XL([1630.3, 1728.8, 1827.9, 1926.9, 2026.7, 2124.6, 2222.1, 2321.0, 2420.3, 2518.4, 2616.8]),
        "ylines": YL([760.2, 859.2, 958.3, 1056.8, 1156.6, 1255.6, 1355.0, 1453.7, 1553.4]),
        "item": "fig. 24(b)", "mach": "1.91", "configuration": "conical boattail, h/D = 0.704 (base to maximum diameter); alpha 0 deg",
        "note": "panel (b) has no y tick labels of its own: its grid rows are valued from the labels of panel (a) on the same rows"},
 },
 "points": []
}
SER = "circle, Exp. mean value (Cortright-Schroeder)"
NOTE = "Mach number from the caption, M infinity = 1.91 (free stream); source as the legend gives it: Cortright-Schroeder, experimental mean value"
def add(panel, x, y, **kw):
    d = {"panel": panel, "sym": "circle", "x": x, "y": y, "series": SER}
    d.update(kw)
    d["note"] = (d.get("note", "") + ("; " if d.get("note") else "") + NOTE)
    cfg["points"].append(d)
add("a", 1005, 1155, note="the -0.08 grid line and a predicted curve cross the circle")
add("a", 1145, 1258, note="centre dot visible; the 7 deg and -0.06 grid lines cross the circle")
add("a", 1371, 1377, note="centre dot visible")
add("b", 2191, 1140, note="centre dot visible", configuration="conical boattail, h/D = 0.704 (base to maximum diameter); alpha 0 deg; the text (p. 17) says the boundary layer was inadvertently thickened for the experimental results at beta = 5.63 deg")
add("b", 2327.4, 1108.3, note="centre dot visible; the 7 deg grid line runs through the circle")
add("b", 2552, 1110, note="centre dot visible")
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
