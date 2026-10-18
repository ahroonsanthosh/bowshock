"""Second reading of RM A53D02 fig. 11 (CD at zero lift vs M), page 33 of
NTRS 19930087740.pdf rendered at 300 dpi (native scan resolution).
Pixel positions: grid lines from lines.py (two bands each), symbol centres
from zoom views (centre dots) and ring detection (circles3.py), averaged."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from grid import Grid

# vertical lines M = 1..10 measured at y-band centres 520 and 1480
V = [(1, 793.8, 796.0), (2, 1018.4, 1021.5), (3, 1242.6, 1245.4), (4, 1469.5, 1470.5),
     (5, 1692.5, 1693.5), (6, 1917.5, 1918.5), (7, 2142.0, 2143.1), (8, 2364.6, 2366.5),
     (9, 2590.5, 2590.5), (10, 2815.5, 2814.9)]
# horizontal lines CD = 0.1..0.6 at x-band centres 900 and 2500
H = [(0.6, 330.3, 331.4), (0.5, 553.4, 555.3), (0.4, 776.9, 779.0), (0.3, 1002.1, 1003.6),
     (0.2, 1226.4, 1226.5), (0.1, 1449.5, 1452.5)]
g = Grid(V, 520, 1480, H, 900, 2500)

# (label, x, y, est. pixel error, note)  centre = mean of dot centroid and ring fit
pts = [
    ("p01", 703.5, 867.1, 1.5, "isolated"),
    ("p02", 771.9, 856.6, 1.5, "isolated"),
    ("p03", 801.8, 469.8, 1.5, "isolated; peak"),
    ("p04", 860.5, 522.7, 1.5, ""),
    ("p05", 908.0, 567.3, 2, ""),
    ("p06", 895.9, 606.9, 2, "overlap"),
    ("p07", 892.1, 644.0, 2, "overlap"),
    ("p08", 918.7, 647.9, 2.5, "overlap"),
    ("p09", 920.2, 673.3, 2.5, "overlap"),
    ("p10", 1004.2, 671.0, 1.5, ""),
    ("p11", 1041.2, 720.5, 1.5, ""),
    ("p12", 1087.4, 797.7, 1.5, ""),
    ("p13", 1143.3, 821.1, 1.5, ""),
    ("p14", 1222.8, 947.6, 1.5, ""),
    ("p15", 1309.6, 1005.8, 1.5, ""),
    ("p16", 1468.8, 1132.7, 1.5, ""),
    ("p17", 1478.8, 1184.3, 1.5, ""),
    ("p18", 1594.9, 1212.9, 2, "cluster M~4.6"),
    ("p19", 1596.4, 1240.1, 2.5, "cluster M~4.6"),
    ("p20", 1611.5, 1240.6, 3, "cluster M~4.6, arcs only"),
    ("p21", 1621.1, 1249.7, 3, "cluster M~4.6, arcs only"),
    ("p22", 1630.0, 1244.4, 3, "cluster M~4.6, arcs only"),
    ("p23", 1765.7, 1331.6, 2, "cluster M~5.4"),
    ("p24", 1792.8, 1325.2, 2.5, "cluster M~5.4"),
    ("p25", 1803.5, 1299.1, 2.5, "cluster M~5.4"),
    ("p26", 2184.4, 1315.7, 3, "cluster M~7.2, arcs only"),
    ("p27", 2189.3, 1329.0, 2.5, "cluster M~7.2"),
    ("p28", 2207.5, 1335.0, 3, "cluster M~7.2, arcs only"),
    ("p29", 2182.9, 1363.0, 1.5, "cluster M~7.2"),
    ("p30", 2815.0, 1432.4, 1.5, "M=10"),
    ("p31", 2814.8, 1452.4, 2.5, "M=10, lower circle partly hidden"),
]
for (c, r) in g.residuals():
    print("# line fit slope %.3f px/unit, residuals px:" % c[0], " ".join("%.1f" % v for v in r))
print("label,M,CD,err_M,err_CD,note")
for lab, x, y, e, note in pts:
    M, CD = g.value(x, y)
    print(f"{lab},{M:.3f},{CD:.4f},{(e + 1.0) / 224.4:.3f},{(e + 0.5) / 2238:.4f},{note}")
