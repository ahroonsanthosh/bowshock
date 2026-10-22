"""Symbols identified by eye, per figure, for sym_refine.py.

Each entry: (id, legend type, approximate x, approximate y[, options]).
Approximate centres were read off zoomed crops (crop.py at 2.2x); the
identification is the legend entry whose glyph the symbol matches.
"""

# R&M 3348 fig. 30 (PDF p. 68). Legend (panel b): present results phi = 0 deg
# circle, 15 deg cross, 30 deg triangle, 45 deg plus, 60 deg square; Goin
# (ref. 29, phi = 45 deg, aspect ratio 2.7): t/c 3 % large square, 4.5 %
# diamond, 6 % right-pointing triangle, 10 % barred oval. Glyph centres are
# bounding-box centres from the pixel map (the plus at its crossing).
LEGEND30 = {"circ": (1169.0, 1270.0), "cross": (1169.0, 1305.5), "tri": (1169.5, 1341.0),
            "plus": (1167.0, 1375.0), "sq": (1166.5, 1408.0)}
SERIES30 = {"circ": "present, phi = 0 deg", "cross": "present, phi = 15 deg", "tri": "present, phi = 30 deg",
            "plus": "present, phi = 45 deg", "sq": "present, phi = 60 deg"}

LEGEND30B = dict(LEGEND30, g3=(1229.0, 1049.5, 12), g45=(1231.0, 1081.5, 12), g6=(1232.5, 1120.5, 13),
                 g10=(1229.5, 1157.0, 12))
SERIES30B = dict(SERIES30, g3="Goin ref. 29, phi = 45 deg, aspect ratio 2.7, t/c = 3 %",
                 g45="Goin ref. 29, phi = 45 deg, aspect ratio 2.7, t/c = 4.5 %",
                 g6="Goin ref. 29, phi = 45 deg, aspect ratio 2.7, t/c = 6 %",
                 g10="Goin ref. 29, phi = 45 deg, aspect ratio 2.7, t/c = 10 %")

FIGS = {
    "f30a": dict(half=9, legend=LEGEND30, series=SERIES30, symbols=[
        ("a0-1", "circ", 234, 1411), ("a0-2", "circ", 351, 1301), ("a0-3", "circ", 378, 1291),
        ("a0-4", "circ", 397, 1280), ("a0-5", "circ", 410, 1268), ("a0-6", "circ", 420, 1249),
        ("a0-7", "circ", 445, 1182), ("a0-8", "circ", 470, 1095), ("a0-9", "circ", 527, 1079),
        ("a0-10", "circ", 588, 1066), ("a0-11", "circ", 644, 1090), ("a0-12", "circ", 715, 1109),
        ("a0-13", "circ", 774, 1140),
        ("a15-1", "cross", 233, 1451), ("a15-2", "cross", 326, 1364), ("a15-3", "cross", 352, 1334),
        ("a15-4", "cross", 410, 1309), ("a15-5", "cross", 470, 1258), ("a15-6", "cross", 527, 1133),
        ("a15-7", "cross", 588, 1095), ("a15-8", "cross", 644, 1105), ("a15-9", "cross", 715, 1124),
        ("a15-10", "cross", 775, 1152),
        ("a30-1", "tri", 233, 1513), ("a30-2", "tri", 353, 1435), ("a30-3", "tri", 470, 1377),
        ("a30-4", "tri", 526, 1388), ("a30-5", "tri", 588, 1255), ("a30-6", "tri", 647, 1064),
        ("a30-7", "tri", 718, 1044), ("a30-8", "tri", 778, 1120), ("a30-9", "tri", 802, 1121),
        ("a45-1", "plus", 233, 1613), ("a45-2", "plus", 351, 1565), ("a45-3", "plus", 470, 1520),
        ("a45-4", "plus", 525, 1498), ("a45-5", "plus", 586, 1470), ("a45-6", "plus", 645, 1427),
        ("a45-7", "plus", 713, 1360), ("a45-8", "plus", 775, 1335), ("a45-9", "plus", 820, 1250),
        ("a60-1", "sq", 232, 1680), ("a60-2", "sq", 351, 1658), ("a60-3", "sq", 468, 1631),
        ("a60-4", "sq", 525, 1610), ("a60-5", "sq", 586, 1601), ("a60-6", "sq", 642, 1614),
        ("a60-7", "sq", 713, 1582), ("a60-8", "sq", 772, 1563), ("a60-9", "sq", 818, 1523),
    ]),
    # R&M 3348 fig. 30b: the same present results against M_0 cos(phi), plus Goin's points.
    # The phi = 60 deg point at M_0 0.7 (M_0 cos(phi) 0.35) is off the scale and is not drawn;
    # the phi = 30 deg point at M_0 1.005 has no counterpart found (see method.md).
    "f30b": dict(half=9, legend=LEGEND30B, series=SERIES30B, symbols=[
        ("b0-1", "circ", 1285, 1417.5), ("b0-2", "circ", 1401.5, 1306), ("b0-3", "circ", 1426, 1301),
        ("b0-4", "circ", 1450, 1291), ("b0-5", "circ", 1460, 1272.5), ("b0-6", "circ", 1475, 1252),
        ("b0-7", "circ", 1495.5, 1190.5), ("b0-8", "circ", 1521.5, 1099.5), ("b0-9", "circ", 1581.5, 1085.5),
        ("b0-10", "circ", 1639.5, 1073.75), ("b0-11", "circ", 1697, 1093), ("b0-12", "circ", 1767, 1117),
        ("b0-13", "circ", 1826.25, 1146.25),
        ("b15-1", "cross", 1257.5, 1458.5), ("b15-2", "cross", 1347.5, 1369), ("b15-3", "cross", 1371, 1337.5),
        ("b15-4", "cross", 1426, 1316), ("b15-5", "cross", 1482.5, 1266), ("b15-6", "cross", 1541.5, 1138),
        ("b15-7", "cross", 1599.5, 1098), ("b15-8", "cross", 1653.75, 1108.75), ("b15-9", "cross", 1725, 1125.5),
        ("b15-10", "cross", 1780, 1156.25),
        ("b30-1", "tri", 1177.5, 1521), ("b30-2", "tri", 1279, 1437.5), ("b30-3", "tri", 1379, 1385),
        ("b30-4", "tri", 1432.5, 1396), ("b30-6", "tri", 1534.5, 1071), ("b30-7", "tri", 1596.5, 1050.5),
        ("b30-8", "tri", 1648.75, 1123.75), ("b30-9", "tri", 1675.5, 1126.25),
        ("b45-1", "plus", 1043.5, 1621), ("b45-2", "plus", 1126, 1572.5), ("b45-3", "plus", 1211, 1524),
        ("b45-4", "plus", 1252.5, 1501), ("b45-5", "plus", 1292.5, 1475), ("b45-6", "plus", 1333.5, 1429),
        ("b45-7", "plus", 1385, 1365), ("b45-8", "plus", 1427.5, 1340), ("b45-9", "plus", 1458, 1257),
        ("b60-2", "sq", 932.5, 1663.5), ("b60-3", "sq", 992.5, 1636.5), ("b60-4", "sq", 1025, 1616),
        ("b60-5", "sq", 1052.5, 1603.5), ("b60-6", "sq", 1077.5, 1618), ("b60-7", "sq", 1112.5, 1583.5),
        ("b60-8", "sq", 1143.5, 1566), ("b60-9", "sq", 1166.5, 1530),
        ("g3-1", "g3", 1639.5, 1166.25), ("g3-2", "g3", 1812, 1049.5),
        ("g45-1", "g45", 1639.5, 1100), ("g45-2", "g45", 1810.5, 1093),
        ("g6-1", "g6", 1638.75, 1138.75), ("g6-2", "g6", 1808.75, 1126.25),
        ("g10-1", "g10", 1638.25, 1213.75), ("g10-2", "g10", 1806.25, 1140),
    ]),
}
