import json, math, subprocess, sys
B = sys.argv[1]; W = B + "/work/"
P = json.load(open(W + "gen/d67_f7_panels.json"))
C = json.load(open(W + "gen/d67_f7_cal.json"))
A = json.load(open(W + "out/f7_all_bf.json"))
R = 13.0  # circle outer radius in px
# decisions: per panel, per station: ("S", top, bot[, note]) single stack; ("G", [groups], chosen_index, note) multi-group;
# ("C", x, y, note) clear circle; ("I", [groups], note) illegible
D = {
 "p23_top": {"-0.02": ("S", 791, 827), "+0.02": ("S", 860, 896), "+0.08": ("S", 862, 903), "+0.15": ("S", 863, 900), "+0.30": ("S", 858, 900), "+0.45": ("S", 843, 886), "+0.58": ("S", 876, 910)},
 "p23_mid": {"-0.02": ("S", 1317, 1352), "+0.02": ("S", 1371, 1414), "+0.08": ("S", 1393, 1430), "+0.20": ("S", 1383, 1415), "+0.40": ("S", 1379, 1412), "+0.60": ("S", 1347, 1381), "+0.78": ("S", 1396, 1428)},
 "p23_bot": {"-0.02": ("S", 1912, 1945), "+0.02": ("S", 1918, 1955), "+0.08": ("S", 1919, 1951), "+0.25": ("S", 1918, 1948), "+0.50": ("S", 1899, 1935), "+0.75": ("S", 1889, 1922),
             "+0.97": ("G", [(1849, 1880, "upper group: two joined loops, not one circle"), (1880, 1916, "lower merged group")], 1, "symbols split into two groups; the upper group is two joined loops (not a single circle); circle assigned to the lower merged group")},
 "p24_top": {"-0.02": ("S", 791, 825), "+0.02": ("S", 847, 887), "+0.08": ("S", 852, 895), "+0.15": ("S", 850, 893), "+0.30": ("S", 853, 894), "+0.45": ("S", 845, 884),
             "+0.58": ("G", [(700, 730, "diamond with tail"), (740, 768, "D symbol"), (805, 835, "quarter-round symbol"), (845, 898, "bottom merged group")], 3, "jet-on symbols separate upward (diamond with tail, D, quarter-round identified); circle assigned by elimination to the bottom merged group")},
 "p24_mid": {"-0.02": ("S", 1331, 1368), "+0.02": ("S", 1365, 1401), "+0.08": ("S", 1301, 1337, "whole stack plotted near Cp = 0, out of line with its neighbours (about -0.04); read as plotted"), "+0.20": ("S", 1378, 1412), "+0.40": ("S", 1379, 1414), "+0.60": ("S", 1370, 1406),
             "+0.78": ("G", [(1297, 1322, "D symbol"), (1322, 1346, "D symbol"), (1372, 1410, "bottom merged group")], 2, "two D symbols separate upward; circle assigned by elimination to the bottom merged group")},
 "p24_bot": {"-0.02": ("S", 1910, 1946), "+0.02": ("S", 1910, 1948), "+0.08": ("S", 1915, 1951), "+0.25": ("S", 1924, 1958), "+0.50": ("S", 1907, 1942), "+0.75": ("S", 1906, 1941),
             "+0.97": ("G", [(1685, 1715, "tall diamond"), (1724, 1748, "teardrop symbol"), (1830, 1848, "flat-bottomed symbol cut by the zero line"), (1882, 1926, "bottom merged group")], 3, "jet-on symbols separate upward (tall diamond, teardrop, a flat-bottomed symbol); circle assigned by elimination to the bottom merged group")},
 "p25_top": {"-0.02": ("S", 866, 898), "+0.02": ("S", 1004, 1033), "+0.08": ("S", 1004, 1032), "+0.15": ("S", 1001, 1032), "+0.30": ("S", 993, 1028), "+0.45": ("S", 982, 1014),
             "+0.58": ("G", [(928, 958, "diamond with tail"), (980, 1005, "D symbol"), (1005, 1032, "bottom merged group")], 2, "diamond and D separate upward; circle assigned by elimination to the bottom merged group")},
 "p25_mid": {"-0.02": ("S", 1390, 1424), "+0.02": ("S", 1516, 1553), "+0.08": ("S", 1519, 1553), "+0.20": ("S", 1518, 1553), "+0.40": ("S", 1508, 1540), "+0.60": ("S", 1491, 1527),
             "+0.78": ("G", [(1244, 1269, "teardrop symbol"), (1300, 1326, "D symbol"), (1439, 1468, "quarter-round symbol"), (1488, 1521, "bottom merged group")], 3, "teardrop, D and quarter-round separate upward; circle assigned by elimination to the bottom merged group")},
 "p25_bot": {"-0.02": ("S", 1921, 1954), "+0.02": ("S", 2045, 2076), "+0.08": ("S", 2048, 2075), "+0.25": ("S", 2042, 2075), "+0.50": ("S", 2026, 2063), "+0.75": ("S", 2013, 2046),
             "+0.97": ("G", [(1771, 1797, "D symbol"), (1843, 1871, "quarter-round symbol"), (1990, 2024, "bottom merged group")], 2, "D and quarter-round separate upward; circle assigned by elimination to the bottom merged group")},
 "p26_top": {"-0.02": ("S", 740, 776), "+0.02": ("S", 855, 883), "+0.08": ("S", 865, 899), "+0.15": ("S", 865, 898), "+0.30": ("S", 867, 900), "+0.45": ("S", 855, 887),
             "+0.58": ("G", [(642, 675, "D symbol"), (738, 765, "quarter-round symbol"), (817, 845, "right triangle"), (857, 886, "bottom merged group")], 3, "D, quarter-round and right triangle separate upward; circle assigned by elimination to the bottom merged group")},
 "p26_mid": {"-0.02": ("S", 1470, 1503), "+0.02": ("S", 1562, 1591), "+0.08": ("S", 1563, 1599), "+0.20": ("S", 1575, 1605), "+0.40": ("S", 1578, 1609), "+0.60": ("S", 1563, 1594),
             "+0.78": ("C", 1453.5, 1580.5, "open circle clearly separate at the bottom of the station (other symbols above it)")},
 "p26_bot": {"-0.02": ("S", 2186, 2219), "+0.02": ("S", 2275, 2303), "+0.08": ("S", 2281, 2314), "+0.25": ("S", 2286, 2319), "+0.50": ("S", 2276, 2309), "+0.75": ("S", 2269, 2303),
             "+0.97": ("C", 1618.5, 2286.0, "open circle clearly separate at the bottom of the station")},
 "p27_top": {"-0.02": ("I", [(487, 519, "upper group above the zero line"), (542, 574, "lower group")], "two separate groups at -0.02, about 0.03 apart; the circle cannot be identified in either"),
             "+0.02": ("S", 794, 826), "+0.08": ("S", 796, 833), "+0.15": ("S", 794, 830), "+0.30": ("S", 784, 816),
             "+0.45": ("G", [(640, 665, "diamond"), (745, 781, "bottom merged group")], 1, "a diamond separates upward; circle assigned by elimination to the bottom merged group"),
             "+0.58": ("I", [(400, 470, "top cluster with round symbols"), (500, 520, "right triangle"), (718, 780, "bottom cluster (triangle, square and others)")], "symbols spread over three groups; round outlines appear in the top cluster and the bottom cluster is a merged mass; the circle cannot be identified")},
 "p27_mid": {"-0.02": ("S", 1228, 1266), "+0.02": ("S", 1476, 1510), "+0.08": ("S", 1480, 1510), "+0.20": ("S", 1479, 1510), "+0.40": ("S", 1460, 1491),
             "+0.60": ("G", [(1388, 1410, "right triangle"), (1429, 1457, "bottom merged group")], 1, "a right triangle separates upward; circle assigned by elimination to the bottom merged group"),
             "+0.77": ("I", [(1393, 1418, "square (fits a square outline, no circle strokes)")], "only a square is seen at the lowest position, other symbols are higher; no circle outline found")},
 "p27_bot": {"-0.02": ("S", 2083, 2122), "+0.02": ("S", 2342, 2379), "+0.08": ("S", 2350, 2392), "+0.25": ("S", 2346, 2384), "+0.50": ("S", 2310, 2346), "+0.75": ("S", 2274, 2309),
             "+0.97": ("C", None, 2247.0, "open circle clearly separate at the bottom of the station")},
 "p28_top": {"-0.02": ("S", 656, 690), "+0.02": ("S", 831, 861), "+0.08": ("S", 844, 877), "+0.15": ("S", 848, 880), "+0.30": ("S", 849, 881), "+0.45": ("S", 832, 868),
             "+0.58": ("C", None, 848.5, "open circle at the bottom of the station, a square overlaps its top")},
 "p28_mid": {"-0.02": ("S", 1361, 1388), "+0.02": ("S", 1541, 1573), "+0.08": ("S", 1553, 1585), "+0.20": ("S", 1560, 1590),
             "+0.40": ("G", [(1430, 1450, "diamond"), (1500, 1520, "D symbol"), (1559, 1588, "bottom merged group")], 2, "diamond and D separate upward; circle assigned by elimination to the bottom merged group"),
             "+0.60": ("C", 1270.0, 1553.0, "open circle at the bottom of the station, a triangle touches its top"),
             "+0.77": ("C", None, 1530.0, "open circle clearly separate at the bottom of the station")},
 "p28_bot": {"-0.02": ("S", 2070, 2100), "+0.02": ("S", 2230, 2262), "+0.08": ("S", 2257, 2289), "+0.25": ("S", 2267, 2301),
             "+0.50": ("G", [(2120, 2145, "diamond"), (2255, 2286, "bottom merged group")], 1, "a diamond separates upward; circle assigned by elimination to the bottom merged group"),
             "+0.75": ("S", 2232, 2264), "+0.97": ("C", 1593.0, 2226.5, "open circle clearly separate at the bottom of the station")},
}
LEG = {"p23": {"top": "16.79", "mid": "16.69", "bot": "17.01"}}
rows_meta = {}
for pg, d in P.items():
    for p in d["panels"]:
        key = pg + "_" + p["name"]
        cal = C[key]
        stx = {s["id"].split("_")[-1]: s["x"] for s in A[key]["stations"]}
        pts, meta = [], {}
        for st, dec in D[key].items():
            x = stx[st]
            pid = key + "_" + st
            kind = dec[0]
            base = {"note": "", "flag": "ambiguous"}
            if kind == "S":
                top, bot = dec[1], dec[2]
                h = bot - top + 1
                y = 0.5 * (top + bot)
                n = len(dec) > 3 and dec[3] or ""
                if h <= 2 * R + 3:
                    flag, alt, sig = "ambiguous", [], 2.0
                    note = "stack of coincident symbols (ink %d to %d px, about one symbol high); circle not separable, value is the stack centre" % (top, bot)
                else:
                    flag = "ambiguous"
                    alt = [[x, top + R, "highest possible centre"], [x, bot - R, "lowest possible centre"]]
                    sig = max(2.0, (h - 2 * R) / 2 / math.sqrt(3))
                    note = "stack of overlapping symbols (ink %d to %d px); the jet-off circle cannot be separated from its own strokes; value is the stack centre, alternatives the highest and lowest centre a circle inside the stack could have" % (top, bot)
                if n:
                    note += "; " + n
                pts.append({"id": pid, "series": "jet off", "approx": [x, y], "shape": "circle", "size": R, "fixed": True})
                meta[pid] = {"flag": flag, "sig": sig, "alt_px": alt, "note": note}
            elif kind == "G":
                groups, ch, n = dec[1], dec[2], dec[3]
                t, b, lab = groups[ch]
                y = 0.5 * (t + b)
                alt = [[x, 0.5 * (g[0] + g[1]), g[2]] for i, g in enumerate(groups) if i != ch]
                if b - t + 1 > 2 * R + 3:
                    alt += [[x, t + R, "highest centre within chosen group"], [x, b - R, "lowest centre within chosen group"]]
                sig = max(2.0, (b - t + 1 - 2 * R) / 2 / math.sqrt(3))
                pts.append({"id": pid, "series": "jet off", "approx": [x, y], "shape": "circle", "size": R, "fixed": True})
                meta[pid] = {"flag": "ambiguous", "sig": sig, "alt_px": alt, "note": n + "; chosen group ink %d to %d px" % (t, b)}
            elif kind == "C":
                cx = dec[1] if dec[1] is not None else x
                pts.append({"id": pid, "series": "jet off", "approx": [cx, dec[2]], "shape": "circle", "size": R, "fixed": True})
                meta[pid] = {"flag": "ok", "sig": 1.5, "note": dec[3] + "; centre from the circle's outer extent"}
            elif kind == "I":
                groups, n = dec[1], dec[2]
                pts.append({"id": pid, "series": "jet off", "approx": [x, 0.5 * (groups[0][0] + groups[0][1])], "shape": "circle", "size": R, "fixed": True})
                meta[pid] = {"flag": "illegible", "y_empty": True, "sig": 3.0, "alt_px": [[x, 0.5 * (g[0] + g[1]), "candidate: " + g[2]] for g in groups], "note": n}
        spec = {"thr": d.get("thr", 128), "frame": cal["frame"], "xgrid": cal["xgrid"], "ygrid": cal["ygrid"], "points": pts}
        json.dump(spec, open(W + "spec/f7_%s.json" % key, "w"), indent=1)
        part = d["part"]
        alpha = None
        common = {"source": "TN D-6789", "item": "fig. 7(%s), l/dm = %s panel" % (part, p["ld"][:3]), "mach": {"2.2": "2.20"}.get(d["mach"], d["mach"]), "meridian": "0",
                  "series": "Jet off (open circle)",
                  "configuration": "beta = %s deg (%s); l/dm = %s" % (d["beta"], "caption: beta approximately 3 deg" if d["beta"] == "3" else "caption", p["ld"][:3]),
                  "x_quantity": "x/dm, ratio of axial boattail distance (from boattail corner) to model diameter",
                  "y_quantity": "Cp,beta, boattail pressure coefficient", "page": pg[1:]}
        md = {"xdec": 4, "ydec": 4, "common": common,
              "points": {k: dict(v, note="jet off (legend: open circle, pt,j/p_inf jet off; caption phi = 0 deg); " + v["note"] + "; x placed at the plotted station of the stack") for k, v in meta.items()}}
        json.dump(md, open(W + "meta/f7_%s.json" % key, "w"), indent=1)
        r = subprocess.run(["python3", "-I", B + "/scripts/digit.py", W + "spec/f7_%s.json" % key, W + "d67/p-%s.png" % pg[1:], W + "out/f7_%s" % key], capture_output=True, text=True)
        print(key, [l for l in r.stdout.splitlines() if "rms" in l])
