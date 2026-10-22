"""Faired curves per figure for curve_read.py: node chains (symbol ids or
page points read by eye), optional start directions per segment, targets."""

T30A = [round(0.72 + 0.02 * k, 2) for k in range(25)]

T30B = [round(0.60 + 0.02 * k, 2) for k in range(25)]

T31B = [round(0.62 + 0.02 * k, 2) for k in range(29)]

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
}
