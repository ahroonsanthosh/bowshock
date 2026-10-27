import json, sys
W = sys.argv[1]
cal = json.load(open(W + "gen/x18_cal.json"))
C = lambda i, x, y, **k: dict({"id": i, "series": "0", "approx": [x, y], "shape": "circle", "size": 10, "dsize": 1.5, "search": 5, "gap": 3}, **k)
S = lambda i, x, y, **k: dict({"id": i, "series": "90", "approx": [x, y], "shape": "square", "size": 9.5, "dsize": 1.5, "search": 5, "gap": 3}, **k)
D = lambda i, x, y, **k: dict({"id": i, "series": "180", "approx": [x, y], "shape": "diamond", "size": 13, "dsize": 1.5, "search": 5, "gap": 3}, **k)
pts = [C("m17_0", 736, 1976),
       C("s0_0", 862, 2046), S("s0_90", 862, 2051),
       C("s19_0", 1006, 2165), D("s19_180", 1006, 2174),
       C("s38_0", 1150, 2277), S("s38_90", 1150, 2281),
       C("s56_0", 1290, 2378), D("s56_180", 1290, 2386),
       C("s75_0", 1430, 2436), S("s75_90", 1430, 2446), D("s75_180", 1430, 2468),
       C("s93_0", 1570, 2470), S("s93_90", 1570, 2475),
       S("s111_90", 1705, 2098), D("s111_180", 1705, 2092), C("s111_0", 1705, 2131),
       C("s119_0", 1768, 2034), D("s119_180", 1768, 2038), S("s119_90", 1768, 2030),
       C("s127_0", 1832, 2009), D("s127_180", 1832, 2012),
       {"id": "s127_base", "series": "base", "approx": [1834, 1984], "shape": "tri_up", "size": 11, "aspect": 0.95, "fill": True, "dsize": 2, "search": 5}]
json.dump({"thr": 150, "frame": cal["frame"], "xgrid": cal["xgrid"], "ygrid": cal["ygrid"], "points": pts}, open(W + "spec/x18.json", "w"), indent=1)
