import json, sys
S = {"circle": 10.0, "square": 10.25, "diamond": 14.25, "rtri_br": 11.0}
ser = {"oc": "open circle: Db/Dm 0.506, Cp,b", "fc": "flagged circle: Db/Dm .506, C'p,b",
       "os": "open square: Db/Dm .704, Cp,b", "fs": "flagged square: Db/Dm .704, C'p,b",
       "d": "diamond: Db/Dm 1, C'p,b", "t": "triangle: model from reference 6"}
kind = {"oc": "circle", "fc": "circle", "os": "square", "fs": "square", "d": "diamond", "t": "rtri_br"}
raw = [("e0", "d", 444, 2149), ("e46", "t", 1024, 1742),
 ("e563", "fs", 1172, 1595), ("e563", "fc", 1170, 1727), ("e563", "oc", 1170, 1808), ("e563", "os", 1169, 1837),
 ("e703", "fc", 1356, 1502), ("e703", "fs", 1356, 1522), ("e703", "oc", 1355, 1670), ("e703", "os", 1352, 1872),
 ("e933", "fc", 1650, 1226), ("e933", "fs", 1652, 1280), ("e933", "oc", 1650, 1512), ("e933", "os", 1648, 1864)]
pts = [dict(id=f"{g}{t}", group=g, kind=kind[t], sym=t, u=u, v=v, series=ser[t]) for g, t, u, v in raw]
json.dump({"sizes": S, "radius": 5.0, "points": pts}, open(sys.argv[1], "w"), indent=1)
