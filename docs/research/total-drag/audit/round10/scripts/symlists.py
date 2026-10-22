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

# R&M 3348 fig. 31b (PDF p. 69). Legend: phi = 0 deg circle on a line, 30 deg cross,
# 45 deg triangle, 60 deg plus.
LEGEND31B = {"circ": (843.5, 1736.5), "cross": (842.0, 1794.5), "tri": (844.5, 1849.0), "plus": (843.0, 1908.0)}
SERIES31B = {"circ": "phi = 0 deg", "cross": "phi = 30 deg", "tri": "phi = 45 deg", "plus": "phi = 60 deg"}

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
    "f31b": dict(half=9, legend=LEGEND31B, series=SERIES31B, symbols=[
        ("c0-1", "circ", 956.5, 2039), ("c0-2", "circ", 1130, 2012.5), ("c0-3", "circ", 1299, 1985),
        ("c0-4", "circ", 1383.5, 1964), ("c0-5", "circ", 1468.5, 1925), ("c0-6", "circ", 1554, 1871),
        ("c0-7", "circ", 1638.5, 1828.5), ("c0-8", "circ", 1722, 1792), ("c0-9", "circ", 1825.6, 1742),
        ("c0-10", "circ", 1909, 1701),
        ("c30-1", "cross", 974, 2031), ("c30-2", "cross", 1115, 2025), ("c30-3", "cross", 1264, 2011.5),
        ("c30-4", "cross", 1340, 1992.5), ("c30-5", "cross", 1411.5, 1941.5), ("c30-6", "cross", 1486.5, 1879),
        ("c30-7", "cross", 1574, 1820), ("c30-8", "cross", 1644, 1756),
        ("c45-1", "tri", 779, 2082.5), ("c45-2", "tri", 901, 2069), ("c45-3", "tri", 1022.5, 2056),
        ("c45-4", "tri", 1082.5, 2059), ("c45-5", "tri", 1142.5, 2056), ("c45-6", "tri", 1204, 2026),
        ("c45-7", "tri", 1267.5, 1961.5), ("c45-8", "tri", 1299, 1963.5), ("c45-9", "tri", 1335, 1869),
        ("c45-10", "tri", 1383.5, 1860),
        ("c60-1", "plus", 617.5, 2081.5), ("c60-2", "plus", 704, 2082.5), ("c60-3", "plus", 747.5, 2062.5),
        ("c60-4", "plus", 787.5, 2020), ("c60-5", "plus", 831.5, 2086), ("c60-6", "plus", 879, 2092.5),
        ("c60-7", "plus", 924, 2071), ("c60-8", "plus", 958.5, 2052.5),
    ]),
    # R&M 3348 fig. 32 (PDF p. 70): "Present tests of single-wedge wing at phi = 0 deg shown thus O".
    # The legend's own circle is set in the text and is larger (19 px) than the plotted ones (15 px), so the
    # template is the isolated plotted circle d-2 (bounding-box centre from the pixel map).
    "f32": dict(half=9, legend={"circ": (823.0, 1076.5)},
                series={"circ": "present tests, single-wedge wing, phi = 0 deg"}, symbols=[
        ("d-1", "circ", 575.6, 1112.2), ("d-2", "circ", 823.0, 1076.5), ("d-3", "circ", 1013.3, 1025.6),
        ("d-4", "circ", 1094.0, 984.5), ("d-5", "circ", 1168.9, 905.6), ("d-6", "circ", 1230.0, 782.2),
        ("d-7", "circ", 1292.0, 674.5), ("d-8", "circ", 1344.4, 575.6), ("d-9", "circ", 1400.0, 432.2),
    ]),
    # R&M 3427 fig. 13 (PDF p. 37), upper set only ("Pressure tappings on base"; holes 5, 6, 7). There is
    # no legend: the holes are named by circled numbers with leaders (6 to the circle line, 7 to the
    # triangle line, 5 by elimination to the square line; see method.md). Templates are isolated plotted
    # glyphs (bounding-box centres from pixel maps): circle h6-16, square h5-03, triangle h7-02.
    # The glyphs are small (circle 12 px, square 10 to 11 px, triangle 14 by 14 px) and most have lines
    # attached, so they are centred by fitting an ideal outline of the measured size ("outline"); the
    # template correlation is kept as a check.
    "r3427f13": dict(half=8, legend={"circ": (1711.5, 1759.5), "sq": (1515.0, 1712.5), "tri": (1166.0, 1832.5)},
                     outline={"circ": ("circle", 5.0), "sq": ("square", 4.25), "tri": ("triangle", 6.0, 11.0)},
                     series={"circ": "hole 6 (base centre-line)", "sq": "hole 5 (base, towards the upper surface)",
                             "tri": "hole 7 (base, towards the lower surface)"}, symbols=[
        ("h6-01", "circ", 867.5, 1837), ("h6-02", "circ", 1066, 1822), ("h6-03", "circ", 1163, 1808),
        ("h6-04", "circ", 1266, 1793), ("h6-05", "circ", 1363, 1745), ("h6-06", "circ", 1463, 1706),
        ("h6-07", "circ", 1512, 1700), ("h6-08", "circ", 1539, 1734), ("h6-09", "circ", 1563, 1735),
        ("h6-10", "circ", 1572, 1726), ("h6-11", "circ", 1588, 1699), ("h6-12", "circ", 1613, 1579),
        ("h6-13", "circ", 1626, 1560), ("h6-14", "circ", 1639, 1630), ("h6-15", "circ", 1663, 1671),
        ("h6-16", "circ", 1711, 1759), ("h6-17", "circ", 1782, 1849),
        ("h5-01", "sq", 1364, 1755), ("h5-02", "sq", 1464, 1719), ("h5-03", "sq", 1514, 1713),
        ("h5-04", "sq", 1539, 1750), ("h5-05", "sq", 1611, 1617), ("h5-06", "sq", 1628, 1579),
        ("h7-01", "tri", 1067, 1842, {"manual": (1069.0, 1839.5), "note": "the M 0.4 gridline runs through it "
                                         "and its base touches the Cp -0.6 gridline: centre from the pixel map "
                                         "(apex y 1834, base 1845, x 1062 to 1076)"}), ("h7-02", "tri", 1163, 1831), ("h7-03", "tri", 1266, 1814),
        ("h7-04", "tri", 1367, 1780), ("h7-05", "tri", 1463, 1748), ("h7-06", "tri", 1513, 1735),
        ("h7-07", "tri", 1538, 1766), ("h7-08", "tri", 1565, 1752), ("h7-09", "tri", 1575, 1737),
        ("h7-10", "tri", 1590, 1709), ("h7-11", "tri", 1612, 1628), ("h7-12", "tri", 1626, 1599),
    ]),
    # R&M 3427 fig. 9 (PDF p. 36). Legend ("Station :-"): circle "At trailing edge", square "1" upstream of
    # trailing edge". Symbols overlap in a near-vertical stack, so each is centred by an outline fit of the
    # measured size (circle 13 px, square 14 px outside), searched within +-3 px only.
    "r3427f9": dict(half=9, legend={"circ": (1069.5, 365.5), "sq": (1070.5, 411.5)},
                    outline={"circ": ("circle", 5.5), "sq": ("square", 6.25)}, outline_search=3.0,
                    series={"circ": "at trailing edge", "sq": "1 in. upstream of trailing edge"}, symbols=[
        ("te-01", "circ", 1237, 724, {"note": "on the x axis line"}), ("te-02", "circ", 1261, 705),
        ("te-03", "circ", 1321, 686), ("te-04", "circ", 1352, 664), ("te-05", "circ", 1380, 646),
        ("te-06", "circ", 1394, 622), ("te-07", "circ", 1403, 604), ("te-08", "circ", 1414, 582),
        ("te-09", "circ", 1421, 566), ("te-10", "circ", 1427, 546), ("te-11", "circ", 1437, 525),
        ("te-12", "circ", 1444, 505), ("te-13", "circ", 1449, 484), ("te-14", "circ", 1455, 464),
        ("te-15", "circ", 1459, 445), ("te-16", "circ", 1462, 424), ("te-17", "circ", 1466, 405),
        ("te-18", "circ", 1465, 384), ("te-19", "circ", 1469, 366), ("te-20", "circ", 1471, 327),
        ("te-21", "circ", 1471, 304), ("te-22", "circ", 1471, 267),
        ("up-01", "sq", 1329, 711), ("up-02", "sq", 1360, 675), ("up-03", "sq", 1392, 633),
        ("up-04", "sq", 1418, 592), ("up-05", "sq", 1440, 553), ("up-06", "sq", 1450, 515),
        ("up-07", "sq", 1462, 475), ("up-08", "sq", 1468, 435), ("up-09", "sq", 1474, 395),
        ("up-10", "sq", 1474, 354), ("up-11", "sq", 1471, 315),
    ]),
    # R&M 3427 fig. 10 (PDF p. 36): "(Symbols as in Fig. 9)": circle at the trailing edge, square 1 in.
    # upstream. Five isolated symbols, centred by outline fit (outside size 14 to 15 px).
    "r3427f10": dict(half=9, legend={"circ": (1069.5, 365.5), "sq": (1070.5, 411.5)},
                     outline={"circ": ("circle", 6.0), "sq": ("square", 6.5)}, outline_search=3.0,
                     series={"circ": "at trailing edge", "sq": "1 in. upstream of trailing edge"}, symbols=[
        ("d-01", "sq", 1167, 1475), ("d-02", "circ", 1373, 1425), ("d-03", "sq", 1374, 1466),
        ("d-04", "sq", 1474, 1484), ("d-05", "sq", 1525, 1513),
    ]),
    # NASA CR-149372 fig. 8a (PDF p. 25). Legend: Mach 0.6 circle with centre
    # dot, 0.7 square with centre dot, 0.8 triangle (no dot), 0.9 hexagon with
    # centre dot; all Reynolds number .19x10^6, diameter 1.91 cm. Legend glyph
    # centres are bounding-box centres on the 2 px blurred page. Symbols were
    # listed by eye on 3.2x to 6x gridded crops (gridcrop.py, 1 px blur) and
    # typed by outline shape (round, square with corners, three-sided,
    # six-sided with left and right vertices) and by the presence of a centre
    # dot. The plotted hexagons are smaller than the legend's (44 to 52 px
    # wide against 56); dotted symbols are therefore centred on their dot.
    "cr8a": dict(half=16, blur=2, dot_types=("circ", "sq", "hex"), dot_check=("tri",),
                 legend={"circ": (1636.0, 1024.5, 16), "sq": (1641.0, 1067.0, 17), "tri": (1638.5, 1111.0, 17),
                         "hex": (1642.0, 1157.0, 26)},
                 series={"circ": "Mach 0.6, Re .19x10^6", "sq": "Mach 0.7, Re .19x10^6",
                         "tri": "Mach 0.8, Re .19x10^6", "hex": "Mach 0.9, Re .19x10^6"}, symbols=[
        ("m6-01", "circ", 808, 870), ("m6-02", "circ", 857, 895), ("m6-03", "circ", 926, 1009),
        ("m6-04", "circ", 991, 1213), ("m6-05", "circ", 1050, 1475), ("m6-06", "circ", 1127, 1835),
        ("m6-07", "circ", 1199, 2163), ("m6-08", "circ", 1260, 2435), ("m6-09", "circ", 1286, 2487),
        ("m6-10", "circ", 1327.5, 2521), ("m6-11", "circ", 1347.5, 2542.5), ("m6-12", "circ", 1370, 2534),
        ("m6-13", "circ", 1402.5, 2504), ("m6-14", "circ", 1424, 2494), ("m6-15", "circ", 1446, 2485),
        ("m6-16", "circ", 1470, 2490, {"manual": (1467.5, 2487.5), "e": 3.0, "note": "partly drawn circle sharing its left side with m6-15 (cell x 1459 to 1480, y 2477 to 2500, round); no clear dot; centre from the outline; tentative"}),
        ("m6-17", "circ", 1491.5, 2471), ("m6-18", "circ", 1514, 2467), ("m6-19", "circ", 1561, 2482),
        ("m6-20", "circ", 1602, 2491), ("m6-21", "circ", 1667, 2515), ("m6-22", "circ", 1743, 2532),
        ("m6-23", "circ", 1836, 2534), ("m6-24", "circ", 1917.5, 2582), ("m6-25", "circ", 2016, 2630),
        ("m6-26", "circ", 2077, 2682), ("m6-27", "circ", 2107.5, 2672, {"manual": (2108.5, 2669.5), "e": 3.5, "note": "partly drawn circle above m7-23 (shares its lower edge), on the line from m6-26 to m6-28; no separable dot; centre from the outline (x 2094 to 2121, top 2656) and the small interior left; tentative"}),
        ("m6-28", "circ", 2134, 2652),
        ("m7-01", "sq", 806, 838), ("m7-02", "sq", 837, 848), ("m7-03", "sq", 884, 889),
        ("m7-04", "sq", 953, 1018), ("m7-05", "sq", 1018, 1239), ("m7-06", "sq", 1112, 1627),
        ("m7-07", "sq", 1178, 1921), ("m7-08", "sq", 1259, 2314), ("m7-09", "sq", 1290.5, 2380),
        ("m7-10", "sq", 1313, 2424), ("m7-11", "sq", 1335, 2448.5), ("m7-12", "sq", 1377.5, 2466.5),
        ("m7-13", "sq", 1404, 2451), ("m7-14", "sq", 1446.5, 2461),
        ("m7-15", "sq", 1470, 2465, {"manual": (1467.0, 2464.0), "e": 3.0, "note": "partly drawn square sharing its left side with m7-14 (cell x 1459 to 1480, y 2453 to 2475, square corners), no dot seen; centre from the outline; tentative"}),
        ("m7-16", "sq", 1541, 2463), ("m7-17", "sq", 1628, 2491, {"note": "outline between round and square"}),
        ("m7-18", "sq", 1705, 2484), ("m7-19", "sq", 1791.5, 2517), ("m7-20", "sq", 1881, 2557),
        ("m7-21", "sq", 1946.5, 2579), ("m7-22", "sq", 2046, 2672), ("m7-23", "sq", 2106, 2692.5),
        ("m7-24", "sq", 2140, 2682),
        ("m8-01", "tri", 807, 815, {"e": 3.0, "note": "mostly hidden between m9-01 and m7-01; only a small triangular interior shows"}), ("m8-02", "tri", 864, 840), ("m8-03", "tri", 909, 903),
        ("m8-04", "tri", 972, 1037), ("m8-05", "tri", 1018, 1165), ("m8-06", "tri", 1082, 1410),
        ("m8-07", "tri", 1157, 1716), ("m8-08", "tri", 1222, 2008), ("m8-09", "tri", 1286, 2288),
        ("m8-10", "tri", 1305, 2364), ("m8-11", "tri", 1338, 2402), ("m8-12", "tri", 1376, 2425),
        ("m8-13", "tri", 1429, 2430), ("m8-14", "tri", 1473, 2440), ("m8-15", "tri", 1580, 2436),
        ("m8-16", "tri", 1702, 2444), ("m8-17", "tri", 1788, 2474), ("m8-18", "tri", 1877.5, 2505),
        ("m8-19", "tri", 1969, 2525), ("m8-20", "tri", 2040, 2563), ("m8-21", "tri", 2131, 2565),
        ("m9-01", "hex", 807, 781), ("m9-02", "hex", 864, 798), ("m9-03", "hex", 955, 920),
        ("m9-04", "hex", 1023, 1094), ("m9-05", "hex", 1082, 1300), ("m9-06", "hex", 1157, 1570),
        ("m9-07", "hex", 1250, 1894), ("m9-08", "hex", 1316, 2155), ("m9-09", "hex", 1378, 2347),
        ("m9-10", "hex", 1404, 2393), ("m9-11", "hex", 1425, 2348),
        ("m9-12", "hex", 1454, 2348, {"manual": (1442.5, 2349.5), "e": 3.5, "note": "partly drawn hexagon overlapping m9-11: only its right vertex (x 1467, y 2350) and parts of its top and bottom edges show; no dot seen; centre = vertex minus a half-width of 24.5 px (22 to 27 on this plot)"}),
        ("m9-13", "hex", 1472, 2351, {"manual": (1463.5, 2349.5), "e": 3.5, "note": "partly drawn hexagon overlapping m9-12: right vertex at x 1488, y 2349; dot not separable from the m9-12 vertex; centre = vertex minus a half-width of 24.5 px"}),
        ("m9-14", "hex", 1539, 2349), ("m9-15", "hex", 1631, 2344), ("m9-16", "hex", 1705, 2336),
        ("m9-17", "hex", 1790, 2350), ("m9-18", "hex", 1881, 2365), ("m9-19", "hex", 1949, 2359),
        ("m9-20", "hex", 2017, 2345), ("m9-21", "hex", 2060, 2345),
        ("m9-22", "hex", 2139.5, 2344.5, {"manual": (2137.0, 2345.5), "note": "the theta = 180 gridline runs through its middle and hides the dot; centre from the vertices (x 2114, 2160) and edges (y 2325, 2366)"}),
    ]),
}
