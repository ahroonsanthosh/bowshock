# Builds the measure.py config for TN 3819 figure 19 (PDF page 50).
import json, sys
A = sys.argv[1]
def XL(pos, sv, vref, lo, hi):
    return [[pos[k] + (lo - vref) * sv, pos[k] + (hi - vref) * sv, k * 0.5, 1 if k % 2 == 0 else 0] for k in range(len(pos))]
def YL(pos, vals, lab, sh, cref, lo, hi):
    return [[pos[k] + (lo - cref) * sh, pos[k] + (hi - cref) * sh, vals[k], 1 if vals[k] in lab else 0] for k in range(len(pos))]
YQ = "base pressure coefficient, PB (axis label) = (pB - p_inf)/q_inf, free-stream reference (TN 3819 symbol list, PDF p. 6)"
XQ = "fineness ratio, L/D"
cfg = {
 "image": A + "/render/tn3819_p50-000.jpg", "rot": 0, "page": 50, "source": "TN 3819", "item": "fig. 19",
 "csv": "tn3819_fig19.csv", "nd_x": 3, "xq": XQ, "yq": YQ,
 "symbols": {"circle": {"kind": "circle", "h": 11, "t": 2.0}, "square": {"kind": "square", "h": 10, "t": 2.0}},
 "panels": {
  "a": {"box": [612, 731, 1674, 1086], "xband": [740, 1078], "yband": [620, 1665],
        "xlines": XL([612.2, 701.2, 789.2, 877.9, 965.9, 1054.8, 1142.8, 1231.6, 1319.8, 1409.0, 1499.1, 1584.6, 1673.3], 0.0083, 815, 740, 1078),
        "ylines": YL([734.3, 823.0, 910.3, 998.1, 1086.0], [-0.20, -0.18, -0.16, -0.14, -0.12], (-0.20, -0.16, -0.12), -0.0069, 870, 620, 1665),
        "item": "fig. 19(a)", "mach": "2.41",
        "note": "Mach number is the free-stream value M infinity of the panel title; panel (a) has no x tick labels of its own: its 12 grid divisions from 0 to 6 are valued like those of panel (c), which carries the labels 0 to 6"},
  "b": {"box": [625, 1268, 1688, 1799], "xband": [1278, 1792], "yband": [633, 1680],
        "xlines": XL([625.2, 714.0, 802.2, 890.9, 978.8, 1067.8, 1155.8, 1244.6, 1332.6, 1422.7, 1510.9, 1597.5, 1686.2], 0.0078, 1395, 1278, 1792),
        "ylines": YL([1272.1, 1360.3, 1449.7, 1537.6, 1626.2, 1713.3, 1798.8], [-0.24, -0.22, -0.20, -0.18, -0.16, -0.14, -0.12], (-0.24, -0.20, -0.16, -0.12), -0.0069, 890, 633, 1680),
        "item": "fig. 19(b)", "mach": "1.93",
        "note": "Mach number is the free-stream value M infinity of the panel title; panel (b) has no x tick labels of its own: its 12 grid divisions from 0 to 6 are valued like those of panel (c), which carries the labels 0 to 6"},
  "c": {"box": [640, 2013, 1704, 2545], "xband": [2022, 2538], "yband": [648, 1695],
        "xlines": XL([640.6, 729.5, 817.5, 906.3, 994.3, 1083.2, 1171.2, 1259.9, 1347.7, 1436.6, 1525.4, 1612.6, 1701.4], 0.0107, 2140, 2022, 2538),
        "ylines": YL([2015.5, 2104.1, 2191.9, 2280.6, 2368.3, 2456.6, 2544.3], [-0.28, -0.26, -0.24, -0.22, -0.20, -0.18, -0.16], (-0.28, -0.24, -0.20, -0.16), -0.0055, 900, 648, 1695),
        "item": "fig. 19(c)", "mach": "1.62", "note": "Mach number is the free-stream value M infinity of the panel title"},
 },
 "points": []
}
CONF = "cone-cylinder, cone half-angle 15 deg (sketch), body diameter 1 in, longest body 5 in; afterbody length varied (fineness ratio L/D on the x axis); alpha 0 deg"
RE = {"a": ("0.25 x 10^6", "1.00 x 10^6"), "b": ("0.30 x 10^6", "1.20 x 10^6"), "c": ("0.35 x 10^6", "1.40 x 10^6")}
def add(panel, sym, x, y, **kw):
    re_ = RE[panel][0 if sym == "circle" else 1]
    d = {"panel": panel, "sym": sym, "x": x, "y": y, "series": "%s, R/inch %s" % (sym, re_),
         "configuration": CONF + "; Reynolds number per inch " + re_}
    d.update(kw)
    d["note"] = (d.get("note", "") + ("; " if d.get("note") else "") + "legend gives no source for the data")
    cfg["points"].append(d)
OV = "circle and square overlap at this station"
add("a", "square", 966.4, 874.8, note=OV, sigma=1.0); add("a", "circle", 966.2, 886.4, note=OV, sigma=1.0)
add("a", "circle", 1145.2, 993.0); add("a", "square", 1146.3, 1013.1)
add("a", "circle", 1321.9, 1009.6); add("a", "square", 1323.0, 1048.8)
add("a", "circle", 1499.4, 1044.4, note=OV); add("a", "square", 1500.3, 1068.8, note=OV + "; the square's bottom edge lies on the panel's bottom border line (-0.12)", sigma=1.0)
add("b", "circle", 978.1, 1338.9); add("b", "square", 979.4, 1365.1)
add("b", "circle", 1158.9, 1531.5); add("b", "square", 1157.6, 1558.1)
add("b", "square", 1336.8, 1603.3, nomatch=True, sigma=1.5, flag="ambiguous", alt_px=[(1336.8, 1606.3, "the square's hidden bottom edge is taken to coincide with the circle's bottom")],
    note=OV + "; the circle covers the square's lower half and no bottom edge of the square is visible: centre taken from the top edge (1593.5 px), the side walls (1326.5 and 1347 px) and the end of the right wall (about 1612 px), from the pixel map"); add("b", "circle", 1336, 1609.5, note=OV, sigma=1.0)
add("b", "circle", 1514, 1627, note=OV, sigma=1.0); add("b", "square", 1514.5, 1638, note=OV, sigma=1.5)
add("c", "circle", 995.2, 2114.8); add("c", "square", 996.9, 2143.7)
add("c", "circle", 1175, 2383, note=OV, sigma=1.0); add("c", "square", 1175, 2391, note=OV, sigma=1.5)
add("c", "circle", 1353, 2474, note=OV, sigma=1.0); add("c", "square", 1353, 2482.5, note=OV, sigma=1.5)
add("c", "square", 1529.1, 2471); add("c", "circle", 1530, 2497.3)
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
