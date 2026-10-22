"""Faired curves per figure for curve_read.py: node chains (symbol ids or
page points read by eye), optional start directions per segment, targets."""

T30A = [round(0.72 + 0.02 * k, 2) for k in range(25)]

T30B = [round(0.60 + 0.02 * k, 2) for k in range(25)]

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
}
