import json, sys
W = sys.argv[1]
xg = [[0.2, 548, "v"], [0.4, 766, "v"], [0.6, 985, "v"], [0.8, 1204, "v"], [1.0, 1425, "v"], [1.2, 1644, "v"], [1.4, 1863, "v"], [1.6, 2082, "v"], [1.8, 2300, "v"], [2.0, 2519, "v"], [2.2, 2737, "v", None, 6]]
yg = [[0.0, 1889.5, "h"], [0.05, 1664.5, "h"], [0.10, 1438.5, "h"], [0.15, 1212.5, "h"], [0.20, 987.0, "h"], [0.25, 760.5, "h"], [0.30, 534.5, "h"]]
P = [  # mach, x, y, sig, repeat(flag tail) True/False/None, note
 (0.3, 656.5, 1685.0, 1.5, False, "two circles overlap; this one has no flag"), (0.3, 656.5, 1701.0, 1.5, True, "two circles overlap; this one carries the flag"),
 (0.4, 766.0, 1647.5, 1.5, False, "two circles overlap; no flag"), (0.4, 765.0, 1671.5, 2.0, True, "flagged circle"),
 (0.5, 875.6, 1658.6, 1.5, False, "two circles overlap; no flag"), (0.5, 877.0, 1670.0, 3.0, True, "flagged circle, mostly hidden by the other"),
 (0.6, 984.0, 1654.5, 2.0, False, "two nearly coincident circles; no flag"), (0.6, 985.0, 1660.5, 2.0, True, "flagged circle"),
 (0.7, 1094.6, 1635.9, 1.5, False, "two circles; no flag"), (0.7, 1094.8, 1660.0, 1.5, True, "flagged circle"),
 (0.8, 1204.0, 1638.0, 1.5, False, "two circles; no flag"), (0.8, 1203.5, 1648.0, 1.5, True, "flagged circle"),
 (0.85, 1257.0, 1626.8, 1.5, False, "single circle"),
 (0.9, 1322.0, 1598.2, 3.0, None, "two overlapping circles crossed by the faired curve; no flag seen on either"), (0.9, 1317.0, 1606.5, 3.0, None, "second overlapping circle; no flag seen"),
 (0.95, 1369.3, 1443.8, 1.5, True, "single circle carrying the flag; an unflagged circle may coincide with it"),
 (1.0, 1424.6, 1236.8, 1.5, False, "no flag"), (1.0, 1421.8, 1291.8, 1.5, True, "flagged circle"),
 (1.1, 1534.5, 1148.0, 1.5, True, "the upper circle carries the flag"), (1.1, 1535.5, 1182.5, 1.5, False, "no flag"),
 (1.2, 1646.2, 1102.5, 2.0, True, "bold circle with a flag; looks like two coincident circles, one flagged"), (1.2, 1646.2, 1102.5, 3.0, False, "assumed coincident unflagged circle (the ring is drawn double width)"),
 (1.3, 1752.7, 1237.9, 1.5, False, "single circle"),
 (1.83, 2330.5, 1402.5, 1.5, False, "two circles; no flag on this one"), (1.83, 2331.5, 1418.5, 2.0, True, "lower circle read as the flagged one; flag not clearly seen"),
 (2.2, 2736.5, 1503.5, 2.0, False, "two circles on the right frame; no flag on this one"), (2.2, 2735.8, 1515.0, 2.0, True, "lower circle read as the flagged one; flag not clearly seen"),
]
pts, meta = [], {}
for i, (m, x, y, s, rep, n) in enumerate(P):
    pid = "M%.2f_%d" % (m, i)
    pts.append({"id": pid, "series": "measured", "approx": [x, y], "shape": "circle", "size": 16, "fixed": True})
    flag = "ok" if (rep is not None and s <= 2.0 and "assumed" not in n and "not clearly" not in n and "may coincide" not in n) else "ambiguous"
    ser = "Measured (open circle)" + (", flagged: repeat data" if rep else "")
    note = "jet off (caption); " + n + ("; repeat data (flagged symbol, caption)" if rep else "")
    if rep is None:
        note += "; repeat or not cannot be told"
    meta[pid] = {"mach": "%.2f" % m if m not in (0.85, 0.95, 1.83) else str(m), "x_override": str(m), "series": ser, "sig": s, "flag": flag, "note": note}
    if m <= 1.3:
        meta[pid]["note"] += "; text p. 12: data at M 1.3 and below are from ref. 1 (TM X-1960)"
json.dump({"thr": 150, "frame": [548, 534, 2737, 1890], "xgrid": xg, "ygrid": yg, "points": pts}, open(W + "spec/f20.json", "w"), indent=1)
json.dump({"xdec": 2, "ydec": 4, "common": {"source": "TN D-6789", "item": "fig. 20", "configuration": "reference (S.T.A.) nozzle, circular-arc boattail; jet off",
           "x_quantity": "M, free-stream Mach number (x is the Mach number as given, not read)",
           "y_quantity": "C_D,beta, boattail pressure-drag coefficient (based on maximum cross-section Am; phi = 0 orifices)", "page": "49"}, "points": meta}, open(W + "meta/f20.json", "w"), indent=1)
