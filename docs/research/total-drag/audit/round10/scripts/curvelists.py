"""Faired curves per figure for curve_read.py: node chains (symbol ids or
page points read by eye), optional start directions per segment, targets."""

T30A = [round(0.72 + 0.02 * k, 2) for k in range(25)]

T30B = [round(0.60 + 0.02 * k, 2) for k in range(25)]

T31B = [round(0.62 + 0.02 * k, 2) for k in range(29)]

# CR-149372 fig. 8a: every 2.5 deg of theta to 90 deg (the front side and the knee), every 5 deg beyond
TCR = [2.5 * k for k in range(1, 37)] + [95.0 + 5.0 * k for k in range(18)]

FIGS = {
    # R&M 3348 fig. 30a: one curve per sweep through its symbols (15 deg dashed).
    # a60-6 lies off the 60 deg curve and a30-9 is not on any line; both are left out of the chains.
    "f30a": dict(box=(225, 925, 830, 1770), windows=(0.010, 0.015, 0.020), curves={
        # past M 1.05 the 0 and 15 deg lines run 8 to 12 px apart: the search there is cut to +-5 px
        "phi0": dict(nodes=["a0-%d" % i for i in range(1, 14)], targets=T30A, extend_end=True,
                     widths={10: 5.0, 11: 5.0}),
        "phi15": dict(nodes=["a15-%d" % i for i in range(1, 11)], targets=T30A, extend_end=True,
                      widths={7: 5.0, 8: 5.0}),
        # the 30 deg line loops over M 1.05 to 1.11: page points on the arc (pixel map) added as nodes
        "phi30": dict(nodes=["a30-%d" % i for i in range(1, 7)] + [(652, 1046), (662, 1034.5), (680, 1030.5),
                                                                   (697, 1033), (707, 1040), "a30-7", "a30-8"],
                      targets=T30A, extend_end=True),
        "phi45": dict(nodes=["a45-%d" % i for i in range(1, 10)], targets=T30A),
        "phi60": dict(nodes=["a60-%d" % i for i in (1, 2, 3, 4, 5, 7, 8, 9)], targets=T30A),
    }),
    # R&M 3348 fig. 30b: the dashed mean curve of Cleary and Stevens (ref. 28), nodes read by eye on it
    "f30b": dict(box=(930, 940, 1866, 1764), windows=(0.010, 0.015, 0.020), curves={
        "cleary_stevens": dict(nodes=[(1165, 1626), (1227, 1603), (1288, 1568), (1342, 1530), (1381, 1484),
                                      (1411, 1430), (1438, 1376), (1465, 1322), (1488, 1261), (1508, 1207),
                                      (1519, 1157), (1535, 1122), (1565, 1103), (1604, 1095), (1635, 1099),
                                      (1673, 1111), (1715, 1153)],
                               targets=T30B, extend_end=True),
    }, mask_boxes=[(1472, 1318, 1548, 1420)]),
    # R&M 3348 fig. 31b: the only line, drawn through the phi = 0 deg circles (legend: circle on a line)
    "f31b": dict(box=(615, 1630, 1976, 2205), windows=(0.010, 0.015, 0.020), curves={
        "phi0": dict(nodes=["c0-%d" % i for i in range(1, 11)], targets=T31B, extend_end=True),
    }),
    # R&M 3348 fig. 32: Knechtel's two-dimensional experiment (ref. 19, solid) and the theory of ref. 30
    # (dashed). Below xi -1.0 the two lines run 6 to 12 px apart and cross near xi -0.55; nodes are ink runs
    # read column by column (pixel map), and the search is cut to +-4 to 6 px there. The solid line merges
    # with the C~_cf = 0 gridline at its start.
    "f32": dict(box=(431, 319, 1634, 1115), windows=(0.05, 0.075, 0.10), curves={
        "ref19_expt": dict(nodes=[(1060, 1002), (1080, 993.5), (1130, 958), (1170, 913), (1220, 825.5),
                                  (1240, 786.5), (1260, 747.5), (1280, 702.5), "d-7", (1306, 640), (1321, 600),
                                  (1336, 560), (1358, 500)],
                           widths={0: 4.0, 1: 4.0, 2: 4.0, 3: 4.0, 4: 6.0, 5: 6.0, 6: 6.0},
                           targets=[round(-1.5 + 0.1 * k, 1) for k in range(20)], extend_end=True),
        "ref30_theory": dict(nodes=[(1018, 995), (1050, 991.5), (1085, 983), (1130, 952.5), (1170, 901),
                                    (1220, 809), (1240, 764), (1260, 715.5), (1274, 670), (1284.5, 640)],
                             widths={0: 4.0, 1: 4.0, 2: 4.0, 3: 4.0, 4: 6.0, 5: 6.0, 6: 6.0, 7: 6.0, 8: 6.0},
                             targets=[round(-1.5 + 0.1 * k, 1) for k in range(16)], extend_end=True),
    }, mask_boxes=[(1195, 650, 1263, 700)]),
    # NASA CR-149372 fig. 8a: one faired curve per Mach number through its symbols (halftone scan:
    # 2 px blur; symbol masks and node offsets sized per symbol type).
    # From theta 92.5 deg on the curves are nearly flat and the symbols (up to 7 deg wide) hide much of
    # each line, so wider fit windows are used there.
    "cr8a": dict(box=(790, 760, 2170, 2720), windows=(1.5, 2.25, 3.0), blur=2, grow=0.5,
                 windows_from=[(92.5, (4.0, 6.0, 8.0))],
                 mask_r={"circ": 15.0, "sq": 16.0, "tri": 19.0, "hex": 26.0},
                 node_off={"circ": 15.0, "sq": 16.0, "tri": 19.0, "hex": 26.0},
                 mask_boxes=[(1580, 875, 2130, 1275), (1330, 1698, 2150, 1745)], curves={
        # Page points between symbols are ink-run centres along rows (rowpeaks.py, 2 px blur), added where
        # the drawn line bows more than a few px from the chord between two symbols.
        # Past theta 150 deg the M 0.6 and 0.7 lines run 8 to 12 px apart and touch at x 1958 to 1978 (one
        # ink band); from x 1980 the upper line (column peaks) reaches m6-25 and the lower one m7-22, and
        # they are assigned so. Page points on each are added and the search is cut to +-5 px there.
        "M0.6": dict(nodes=["m6-01", "m6-02", "m6-03", (953.4, 1100), "m6-04", (1016.2, 1340), "m6-05",
                            (1083.4, 1640), "m6-06", (1148.1, 1940), (1174.0, 2060), "m6-07", (1214.6, 2240)]
                     + ["m6-%02d" % i for i in range(8, 25)] + [(1990, 2607.3)]
                     + ["m6-%02d" % i for i in range(25, 29)], targets=TCR, width=8.0,
                     widths={30: 5.0, 31: 5.0}),
        "M0.7": dict(nodes=["m7-01", "m7-02", "m7-03", "m7-04", (976.8, 1100), "m7-05", (1043.2, 1340),
                            (1073.9, 1480), "m7-06", (1122.8, 1700), (1140.8, 1780), "m7-07", (1201.1, 2060),
                            (1233.1, 2200)] + ["m7-%02d" % i for i in range(8, 22)] + [(1990, 2622.1)]
                     + ["m7-%02d" % i for i in range(22, 25)], targets=TCR, width=8.0, widths={27: 5.0, 28: 5.0}),
        "M0.8": dict(nodes=["m8-%02d" % i for i in range(1, 6)] + [(1041.2, 1260), (1060.1, 1340), "m8-06",
                                                                     (1104.1, 1520), (1130.2, 1640), "m8-07",
                                                                     (1170.9, 1800), (1194.5, 1900), "m8-08",
                                                                     (1243.5, 2100), (1266.5, 2200)]
                     + ["m8-%02d" % i for i in range(9, 22)], targets=TCR, width=8.0),
        # m9-10 (below the plateau line at theta 80.7 deg) is on no drawn line and is left out of the chain.
        "M0.9": dict(nodes=["m9-01", "m9-02", "m9-03", "m9-04", (1057.7, 1200), "m9-05", (1115.7, 1440), "m9-06",
                            (1185.4, 1700), (1211.6, 1800), "m9-07", (1276.2, 2040), "m9-08", (1338.1, 2240),
                            "m9-09"] + ["m9-%02d" % i for i in range(11, 23)], targets=TCR, width=8.0),
    }),
}
