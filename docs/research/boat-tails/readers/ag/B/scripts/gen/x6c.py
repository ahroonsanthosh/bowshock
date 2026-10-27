import json, sys
W = sys.argv[1]
cal = json.load(open(W + "gen/x6c_cal.json"))
SH = {"3": ("circle", 15, 1.0), "5": ("square", 13.5, 1.0), "10": ("diamond", 18, 1.0), "15": ("tri_up", 16, 0.9), "20": ("tri_ul", 15, 1.0)}
P = {"3": [(1021, 1240), (1138, 1231), (1400, 1219), (1662, 1183), (1895, 1269), (910, 1269)],
     "5": [(910, 1412), (1021, 1352), (1138, 1329), (1400, 1302), (1662, 1283), (1895, 1290)],
     "10": [(910, 1652), (1021, 1588), (1138, 1560), (1400, 1498), (1662, 1433), (1883, 1329)],
     "15": [(910, 1810), (1021, 1779), (1138, 1755), (1400, 1652), (1662, 1569), (1860, 1181)],
     "20": [(914, 1983), (1026, 1933), (1176, 1871), (1319, 1648), (1610, 1290), (1824, 1243)]}
pts = []
for b, lst in P.items():
    sh, sz, asp = SH[b]
    for i, (x, y) in enumerate(lst):
        if sh.startswith("tri"):
            y0 = y  # approx given at visual centre; fit uses bbox centre
        pts.append({"id": "b%s_%d" % (b, i), "series": b, "approx": [x, y], "shape": sh, "size": sz, "aspect": asp, "dsize": 2.5, "search": 8, "gap": 4})
fixed = [("b3_m", "3", "circle", 848, 1151, 15), ("b15_m", "15", "tri_up", 849, 1156, 16), ("b10_m", "10", "diamond", 850, 1181, 18)]
for pid, b, sh, x, y, sz in fixed:
    pts.append({"id": pid, "series": b, "approx": [x, y], "shape": sh, "size": sz, "fixed": True})
json.dump({"thr": 140, "frame": cal["frame"], "xgrid": cal["xgrid"], "ygrid": cal["ygrid"], "points": pts}, open(W + "spec/x6c.json", "w"), indent=1)
