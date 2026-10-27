import json, sys
d = sys.argv[1]
SQ = [(1212, 677.5), (1231.25, 695), (1252, 695), (1272.5, 703.75), (1281.5, 718.75), (1302.25, 746), (1323.5, 778), (1355, 687.5),
      (1385.75, 613.75), (1395.75, 584), (1415.75, 568.25), (1436.5, 559.5), (1478.25, 533.75), (1498.5, 520),
      (1519.5, 504.5), (1560, 477.75), (1583, 463.25),
      (1622.5, 455.25), (1663.25, 449), (1684.5, 447.75), (1724.5, 444.5), (1765.75, 444)]
CI = [(1210.75, 753.25), (1231.5, 753), (1252, 763.25), (1271.5, 769.5), (1282.75, 786.5), (1303.25, 808.25), (1323.25, 827), (1332, 870.75), (1354, 750.25),
      (1384.5, 668.25), (1395.25, 646.5), (1416.5, 632.75), (1436.5, 617.5), (1478.25, 598), (1497.75, 588.75), (1519.75, 573.5), (1539.5, 562.25),
      (1556, 547), (1581, 533), (1623.25, 522.5), (1663.25, 512.75), (1686.25, 506.25), (1726.25, 495.75), (1765.75, 486.5)]
faint_sq = {14: (1519.5, 504.5, 2.5, 2.5), 15: (1560.0, 477.75, 2.0, 1.5), 16: (1583.0, 463.25, 1.0, 1.0)}
pts = []
for i, (u, v) in enumerate(SQ):
    p = dict(id=f"s{i+1:02d}", group=f"s{i+1:02d}", kind="square", u=u, v=v, series="square with centre dot: Edge orifice")
    if i in faint_sq:
        fu, fv, eu, ev = faint_sq[i]
        p.update(u=fu, v=fv, eu=eu, ev=ev, fixed=True, faint=True,
                 method_note="faint in the scan (outline partly erased); centre reconstructed from the visible fragments of the outline")
    pts.append(p)
for i, (u, v) in enumerate(CI):
    pts.append(dict(id=f"c{i+1:02d}", group=f"c{i+1:02d}", kind="circle", u=u, v=v, series="circle with centre dot: Center orifice"))
spec = json.load(open(f"{d}/f10.json"))
spec['panels']['main'].update({"sizes": {"circle": 14.5, "square": 13.0}, "radius": 4.0, "points": pts})
json.dump(spec, open(f"{d}/f10.json", "w"), indent=1)
