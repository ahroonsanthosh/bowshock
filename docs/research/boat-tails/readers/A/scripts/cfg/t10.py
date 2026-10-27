# Builds the measure.py config for TN 3372 figure 10 (PDF page 19).
import json, sys
A = sys.argv[1]
SV = -0.0045
XB = [365, 960]
xs = [572.5, 675.6, 780.1, 882.5, 984.6, 1088.5, 1190.4, 1293.1, 1396.0, 1498.8, 1602.0, 1705.2, 1807.9]
xv = [round(0.6 + 0.05 * k, 2) for k in range(13)]
ys = [356.3, 459.0, 562.7, 665.1, 769.5, 872.5, 971.1]
yv = [-0.08, -0.04, 0.0, 0.04, 0.08, 0.12, 0.16]
cfg = {
 "image": A + "/render/tn3372_p19-000.jpg", "rot": 0, "page": 19, "source": "TN 3372", "item": "fig. 10",
 "csv": "tn3372_fig10.csv", "nd_x": 3, "mach_from_x": True,
 "xq": "Mach number, M (flight Mach number, free stream)",
 "yq": "base pressure coefficient, delta p/q = (base pressure - free-stream static pressure)/free-stream dynamic pressure (text, PDF p. 5); axis increases downward, values below the zero line are positive",
 "symbols": {"circle": {"kind": "circle", "h": 14, "t": 2.5, "hrange": [12.5, 15]},
             "square": {"kind": "square", "h": 12.5, "t": 2.5, "hrange": [11.5, 13.5]}},
 "panels": {"p": {"box": [571, 356, 1808, 971], "xband": XB, "yband": [585, 1800],
   "xlines": [[xs[k] + (XB[0] - 660) * SV, xs[k] + (XB[1] - 660) * SV, xv[k], 1 if k % 2 == 0 else 0] for k in range(13)],
   "ylines": [[ys[k], yv[k], 1 if yv[k] in (-0.08, 0.0, 0.08, 0.16) else 0] for k in range(7)],
   "mach": "", "configuration": "configuration D: convergent afterbody (base diameter 3.3 in, body diameter 5 in) with dummy rocket chamber, nozzle exit flush with base; flight model, assumed at or near zero angle of attack (text, PDF p. 4)"}},
 "points": []
}
NOTE = "one model of configuration D was flown (text, PDF p. 4), so every point is from that model"
def add(sym, x, y, **kw):
    d = {"panel": "p", "sym": sym, "x": x, "y": y, "dot": True, "use_dot": True, "dot_r": 4, "sigma": 0.6,
         "series": "square, Edge orifice" if sym == "square" else "circle, Center orifice"}
    d.update(kw)
    d["note"] = (d.get("note", "") + ("; " if d.get("note") else "") + NOTE + "; the mach column repeats the x reading")
    cfg["points"].append(d)
OV = "overlaps its neighbours"
# edge orifice squares, left to right
add("square", 1212.1, 678.1, note=OV)
add("square", 1226.6, 695.0, nomatch=True, sigma=1.0, flag="ambiguous", alt_px=[(1231.6, 696.5, "an irregular mark inside the square, 5 px right of the outline centre, is its centre dot")],
    note=OV + "; no clean centre dot: centre taken midway between its edges (x 1216 to 1237, y 682 to 708 px) from the pixel map")
add("square", 1252.0, 695.1, note=OV)
add("square", 1272.5, 704.0, nomatch=True, sigma=1.0, note=OV + "; centre dot merged with the top edge of the next square: dot centroid taken from the pixel map (outline centre from edges x 1259 to 1284, y 692 to 718 px is (1271.5, 705.3))")
add("square", 1281.5, 719.1, note=OV)
add("square", 1302.5, 746.4)
add("square", 1323.4, 777.1)
add("square", 1355.3, 686.4)
add("square", 1385.5, 613.5, note=OV)
add("square", 1396.1, 584.1, note=OV)
add("square", 1415.6, 568.4, note=OV)
add("square", 1436.8, 560.0, note=OV + "; on the zero line")
add("square", 1478.4, 533.8, note=OV)
add("square", 1499.4, 520.5, note="faint on the scan; centre dot visible")
add("square", 1520.0, 504.5, nomatch=True, sigma=1.5, note="very faint on the scan: left edge (x about 1507 px), right side and bottom (about 518 px) and a faint centre dot (1520, 504) are visible; centre from the pixel map")
add("square", 1540.5, 491.5, nomatch=True, sigma=2.5, flag="ambiguous", alt="no symbol at this place (the strokes could be scan residue of the neighbouring squares)",
    note="barely visible on the scan: parts of a left edge (x about 1526 px, y 482 to 499), a right edge (x about 1552, y 486 to 505), a top corner (y about 479) and a possible centre dot (1541, 491.5); centre from the pixel map")
add("square", 1561.6, 478.3, nomatch=True, sigma=1.5, flag="ambiguous", alt_px=[(1558.0, 478.5, "the centre is taken midway between the faint left edge (x about 1546 px) and the right edge (about 1570 px) instead of at the faint centre dot")],
    note="faint on the scan: centre taken at the faint centre dot (1561.6, 478.3 px); left edge, bottom edge (about 491 px) and right edge partly visible")
add("square", 1581.5, 464.0, nomatch=True, sigma=1.0, note="faint on the scan and no centre dot: centre from its edges (x 1568 to 1595, y 451 to 477 px)")
add("square", 1622.3, 455.2)
add("square", 1663.9, 449.0, note=OV)
add("square", 1684.4, 448.1, note=OV)
add("square", 1724.5, 444.7)
add("square", 1765.7, 444.7)
# center orifice circles
add("circle", 1210.5, 753.4, note=OV)
add("circle", 1231.7, 753.3, note=OV)
add("circle", 1251.7, 762.7, note=OV)
add("circle", 1272.0, 769.7, note=OV)
add("circle", 1282.8, 786.4, note=OV)
add("circle", 1303.5, 808.3, note=OV)
add("circle", 1323.4, 826.9, note=OV)
add("circle", 1332.6, 870.6, nomatch=True, sigma=0.8, note="centre dot sits on the 0.12 grid line, so the automatic dot finder (which blanks grid lines) is not used; dot centroid from the pixel map")
add("circle", 1354.3, 750.7)
add("circle", 1384.9, 669.2, note=OV)
add("circle", 1395.3, 647.2, note=OV)
add("circle", 1417.1, 633.3, note=OV)
add("circle", 1436.7, 618.1, note=OV)
add("circle", 1478.4, 598.5, note=OV)
add("circle", 1498.2, 589.2, note=OV)
add("circle", 1520.2, 573.8, note=OV)
add("circle", 1540.4, 562.6, note=OV + "; on the zero line")
add("circle", 1559.9, 546.7, sigma=1.0, note="faint on the scan (outline partly missing); centre dot visible")
add("circle", 1581.2, 533.4, sigma=1.0, note="faint on the scan (outline partly missing); centre dot visible")
add("circle", 1623.8, 522.7)
add("circle", 1663.5, 513.2, note=OV)
add("circle", 1686.3, 506.5, note=OV)
add("circle", 1725.7, 496.0)
add("circle", 1766.0, 487.0)
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
