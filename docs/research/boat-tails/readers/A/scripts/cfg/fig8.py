# Builds the measure.py config for RM E51F26 figure 8 (PDF page 30).
import json, sys
A = sys.argv[1]
def XL(p):
    v = [10.0, 10.25, 10.5, 10.75, 11.0, 11.25, 11.5, 11.75, 12.0]
    return [[p[k], v[k], 1 if k % 2 == 0 else 0] for k in range(9)]
def YL(p, vals, lab):
    return [[p[k], vals[k], 1 if vals[k] in lab else 0] for k in range(len(p))]
VAB = [0.12, 0.10, 0.08, 0.06, 0.04, 0.02, 0.0, -0.02, -0.04, -0.06, -0.08, -0.10, -0.12]
LAB = (0.04, 0.0, -0.04, -0.08, -0.12, -0.16)
VC = [0.04, 0.02, 0.0, -0.02, -0.04, -0.06, -0.08, -0.10, -0.12, -0.14, -0.16]
cfg = {
 "image": A + "/render/e51f26_p30-000.jpg", "rot": 0, "page": 30, "source": "RM E51F26", "item": "fig. 8",
 "csv": "rme51f26_fig8.csv",
 "xq": "axial distance from model tip, x, body diameters",
 "yq": "pressure coefficient, Cp (axis label) = (p - p0)/q0, free-stream reference (RM E51F26 symbol list, PDF p. 4)",
 "symbols": {"circle": {"kind": "circle", "h": 11.5, "t": 2.3},
             "square": {"kind": "square", "h": 11.5, "t": 2.5},
             "diamond": {"kind": "diamond", "h": 16, "t": 2.5}},
 "panels": {
  "a": {"box": [401, 368, 1163, 1507], "xband": [375, 1500], "yband": [406, 1158],
        "xlines": XL([402, 498, 593, 688, 783, 878, 973, 1068, 1162.5]),
        "ylines": YL([369.5, 463.6, 558.2, 652.3, 747, 842.5, 936, 1031, 1126, 1221, 1316.7, 1411.5, 1506.8], VAB, LAB),
        "item": "fig. 8(a)", "configuration": "boattail angle 5.63 deg; Db/Dm 0.704 (incompletely boattailed); alpha 0 deg; no jet flow", "mach": "1.91"},
  "b": {"box": [1257, 363, 2016, 1502], "xband": [370, 1495], "yband": [1262, 2011],
        "xlines": XL([1257, 1352, 1446.5, 1541, 1635.5, 1730.5, 1825.5, 1920.5, 2016]),
        "ylines": YL([364.5, 459.2, 553.7, 648, 742.3, 837.9, 931.7, 1025.6, 1121, 1216.4, 1311.3, 1406.4, 1501.6], VAB, LAB),
        "item": "fig. 8(b)", "configuration": "boattail angle 7.03 deg; Db/Dm 0.704 (incompletely boattailed); alpha 0 deg; no jet flow", "mach": "1.91",
        "note": "panel (b) carries no tick labels of its own: its x grid lines are valued from the labels 10.0 to 12.0 printed under the right half of the bottom panel and its y grid lines from the labels of panel (a) on the same rows (the heavy line is Cp = 0)"},
  "c": {"box": [399, 1599, 1162, 2549], "xband": [1605, 2543], "yband": [404, 1157],
        "xlines": XL([400, 497, 591.7, 686.7, 781.5, 876.5, 971.7, 1066.4, 1161.2]),
        "ylines": YL([1600, 1695.9, 1790, 1884.6, 1980.5, 2074.6, 2170, 2265.8, 2361, 2455.6, 2548], VC, LAB),
        "item": "fig. 8(c)", "configuration": "boattail angle 9.33 deg; Db/Dm 0.704 (incompletely boattailed); alpha 0 deg; no jet flow", "mach": "1.91"},
 },
 "points": []
}
cfg["panels"]["a"]["note"] = "panel (a) has no x tick labels of its own: its vertical grid lines are valued from the labels 10.0 to 12.0 printed under panel (c), whose grid lines they continue; the text (PDF p. 11) says that on the 5.63 deg boattail with Db/Dm 0.704 inadvertent early transition (probably a leaking static orifice near the nose) gave a boundary-layer thickness of 0.20 in at the base against 0.08 to 0.09 in for the other incompletely boattailed bodies; Mach 1.91 is the free-stream test Mach number (text, PDF p. 7)"
cfg["panels"]["b"]["note"] += "; Mach 1.91 is the free-stream test Mach number (text, PDF p. 7)"
cfg["panels"]["c"]["note"] = "Mach 1.91 is the free-stream test Mach number (text, PDF p. 7)"
SER = {"circle": "theta 15 deg (circle)", "square": "theta 50 deg (square)", "diamond": "theta 90 deg (diamond)"}
def add(panel, sym, x, y, **kw):
    d = {"panel": panel, "series": SER[sym], "sym": sym, "x": x, "y": y}
    d.update(kw)
    cfg["points"].append(d)
OV = "symbols overlap at this station"
add("a", "circle", 467.8, 906.1, note=OV); add("a", "square", 469.5, 922.3, note=OV, sigma=1.5); add("a", "diamond", 467.7, 933.6, note=OV, sigma=1.0)
add("a", "diamond", 653.5, 1293.1, note=OV); add("a", "square", 654, 1310.1, note=OV); add("a", "circle", 651.9, 1355.4)
add("a", "circle", 812.4, 1252.1, note=OV); add("a", "square", 814.2, 1261.8, note=OV, sigma=1.0); add("a", "diamond", 812.9, 1288.7)
add("a", "circle", 971.8, 1174.3, note=OV); add("a", "diamond", 972.3, 1188.4, note=OV, sigma=1.0); add("a", "square", 972.1, 1202.7, note=OV)
add("a", "square", 1095.7, 1130.9, note=OV); add("a", "circle", 1096.4, 1147.4, note=OV, sigma=1.0); add("a", "diamond", 1096.2, 1159.5, note=OV)
add("b", "circle", 1444.7, 914); add("b", "square", 1446, 942.8, note="no diamond (theta 90 deg) is plotted at this station")
add("b", "square", 1635.2, 1425.5, note=OV); add("b", "circle", 1635.5, 1440, note=OV + "; circle overlaps the square bottom and the diamond top", sigma=1.5); add("b", "diamond", 1636, 1452, note=OV, sigma=1.5)
add("b", "circle", 1802.7, 1309); add("b", "diamond", 1801.9, 1348.4, note=OV, sigma=1.5); add("b", "square", 1802, 1353, note=OV, sigma=1.5)
add("b", "circle", 1950.8, 1222.2, note=OV); add("b", "square", 1951.5, 1230.2, note=OV, sigma=1.0); add("b", "diamond", 1952.4, 1257.2)
add("c", "square", 705.3, 1741.1); add("c", "circle", 704.3, 1788.4, note="circle drawn inside the diamond, on the Cp = 0 line", sigma=1.0); add("c", "diamond", 704.2, 1789.4, note="diamond drawn around the circle, on the Cp = 0 line", sigma=1.0)
add("c", "circle", 896.3, 2420.7); add("c", "square", 895.1, 2454.1, note="square and diamond drawn on the same centre (eight-pointed star)", sigma=1.0); add("c", "diamond", 895.2, 2454.8, note="square and diamond drawn on the same centre (eight-pointed star)", sigma=1.0)
add("c", "circle", 996.5, 2344.8); add("c", "diamond", 997.6, 2374.8, note=OV, sigma=1.0); add("c", "square", 998.6, 2381, note=OV, sigma=1.0)
add("c", "square", 1093, 2270.8, note="no circle (theta 15 deg) is plotted at this station"); add("c", "diamond", 1093.9, 2288.8, note=OV)
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
