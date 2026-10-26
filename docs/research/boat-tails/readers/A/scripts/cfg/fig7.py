# Builds the measure.py config for RM E51F26 figure 7 (PDF page 29).
import json, sys
A = sys.argv[1]
XL = [[513, 9.0, 1], [598.5, 9.25, 0], [682, 9.5, 1], [766, 9.75, 0], [849.5, 10.0, 1], [933.5, 10.25, 0],
      [1017.5, 10.5, 1], [1101, 10.75, 0], [1184.5, 11.0, 1], [1268, 11.25, 0], [1351, 11.5, 1], [1434, 11.75, 0],
      [1517, 12.0, 1]]
def yl(top, step=83.4, labels=(0,)):
    pass
cfg = {
 "image": A + "/render/e51f26_p29-000.jpg", "rot": 0, "page": 29, "source": "RM E51F26", "item": "fig. 7",
 "csv": "rme51f26_fig7.csv",
 "xq": "axial distance from model tip, x, body diam",
 "yq": "pressure coefficient, Cp (axis label) = (p - p0)/q0, free-stream reference (RM E51F26 symbol list, PDF p. 4)",
 "symbols": {"circle": {"kind": "circle", "h": 10, "t": 2.5},
             "square": {"kind": "square", "h": 10.5, "t": 2.5},
             "diamond": {"kind": "diamond", "h": 14.5, "t": 2.5}},
 "panels": {
  "a": {"box": [513, 334, 1934, 919], "xband": [340, 912], "yband": [518, 1500], "xlines": XL,
        "ylines": [[335, 0.02, 0], [418, 0.0, 1], [503.5, -0.02, 0], [586, -0.04, 1], [670, -0.06, 0],
                   [752.5, -0.08, 1], [835.5, -0.10, 0], [919, -0.12, 1]],
        "item": "fig. 7(a)", "note": "panel (a) has no x tick labels of its own: its vertical grid lines are valued from the labels 9.0 to 12.0 under panel (c), whose grid lines they continue; Mach 1.91 is the free-stream test Mach number (text, PDF p. 7)", "configuration": "boattail angle 5.63 deg; Db/Dm 0.506 (completely boattailed); alpha 0 deg; no jet flow",
        "mach": "1.91"},
  "b": {"box": [513, 1000, 1934, 1750], "xband": [1006, 1744], "yband": [518, 1500], "xlines": XL,
        "ylines": [[1000.5, 0.02, 0], [1084.1, 0.0, 1], [1167.3, -0.02, 0], [1250.3, -0.04, 1], [1333.3, -0.06, 0],
                   [1416.6, -0.08, 1], [1500, -0.10, 0], [1583.5, -0.12, 1], [1666.8, -0.14, 0], [1749.5, -0.16, 1]],
        "item": "fig. 7(b)", "note": "panel (b) has no x tick labels of its own: its vertical grid lines are valued from the labels 9.0 to 12.0 under panel (c), whose grid lines they continue; Mach 1.91 is the free-stream test Mach number (text, PDF p. 7)", "configuration": "boattail angle 7.03 deg; Db/Dm 0.506 (completely boattailed); alpha 0 deg; no jet flow",
        "mach": "1.91"},
  "c": {"box": [513, 1831, 1934, 2580], "xband": [1837, 2574], "yband": [518, 1500], "xlines": XL,
        "ylines": [[1831.6, 0.02, 0], [1916, 0.0, 1], [1998.5, -0.02, 0], [2081.4, -0.04, 1], [2164.6, -0.06, 0],
                   [2247, -0.08, 1], [2330, -0.10, 0], [2414, -0.12, 1], [2496.4, -0.14, 0], [2579.7, -0.16, 1]],
        "item": "fig. 7(c)", "note": "Mach 1.91 is the free-stream test Mach number (text, PDF p. 7)", "configuration": "boattail angle 9.33 deg; Db/Dm 0.506 (completely boattailed); alpha 0 deg; no jet flow",
        "mach": "1.91"},
 },
 "points": []
}
SER = {"circle": "theta 15 deg (circle)", "square": "theta 50 deg (square)", "diamond": "theta 90 deg (diamond)"}
def add(panel, sym, x, y, **kw):
    d = {"panel": panel, "series": SER[sym], "sym": sym, "x": x, "y": y}
    d.update(kw)
    cfg["points"].append(d)
OV = "symbols overlap at this station"
# panel a
add("a", "diamond", 623, 448.5); add("a", "square", 624, 460.5, note="square overlaps the diamond above it"); add("a", "circle", 622, 488)
add("a", "square", 740.5, 786, note=OV); add("a", "diamond", 740.4, 792, note=OV, sigma=1.0); add("a", "circle", 740, 808, note=OV)
add("a", "circle", 906.5, 698, note=OV, sigma=1.0); add("a", "diamond", 905.5, 702, note=OV, sigma=1.0); add("a", "square", 906.4, 710, note=OV)
add("a", "square", 1073, 611.5, note=OV); add("a", "diamond", 1074, 621.7, note=OV, sigma=1.0); add("a", "circle", 1074, 636, note=OV)
add("a", "circle", 1243.5, 511); add("a", "square", 1240, 557.6); add("a", "diamond", 1239, 574)
add("a", "square", 1408, 489.3, note=OV); add("a", "circle", 1408, 494, note="circle drawn inside the square", sigma=1.0); add("a", "diamond", 1408, 515)
# panel b
add("b", "diamond", 738.2, 1124); add("b", "square", 738.7, 1145.7); add("b", "circle", 738, 1168.7)
add("b", "square", 904, 1545, note=OV); add("b", "diamond", 904, 1553, note=OV, sigma=1.5); add("b", "circle", 904.5, 1563, note=OV)
add("b", "diamond", 1029.2, 1449.5); add("b", "square", 1030.5, 1468.1, note="circle drawn inside the square"); add("b", "circle", 1030.4, 1468.1, note="circle drawn inside the square", sigma=1.0)
add("b", "square", 1159.4, 1371.9, note="circle drawn inside the square"); add("b", "circle", 1159.7, 1371.3, note="circle drawn inside the square", sigma=1.0); add("b", "diamond", 1156, 1389.5, note=OV)
add("b", "circle", 1290.6, 1282.4); add("b", "square", 1290.5, 1310.2); add("b", "diamond", 1290.9, 1334.2)
add("b", "square", 1409.4, 1237.7, note="circle drawn inside the square"); add("b", "circle", 1409.2, 1237.9, note="circle drawn inside the square", sigma=1.0); add("b", "diamond", 1410, 1262.5)
# panel c
add("c", "circle", 904.8, 1917.9, note="circle centred on the Cp = 0 grid line"); add("c", "diamond", 905.4, 1940.9, note=OV); add("c", "square", 903.8, 1954.7, note=OV)
add("c", "square", 1075, 2447.5); add("c", "diamond", 1075.9, 2483); add("c", "circle", 1074.3, 2514)
add("c", "circle", 1211, 2337.8); add("c", "square", 1209.9, 2371.8, note=OV); add("c", "diamond", 1211, 2381.6, note=OV)
add("c", "circle", 1352.1, 2228.1); add("c", "square", 1351.8, 2251.1); add("c", "diamond", 1353.3, 2279.2)
add("c", "square", 1460, 2147.4, note=OV); add("c", "diamond", 1460, 2153, note=OV, sigma=1.5); add("c", "circle", 1460, 2163.5, note=OV, sigma=1.5)
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
