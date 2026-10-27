import json, sys
S = {"circle": 11.75, "square": 11.5, "diamond": 16.5}
ser = {"circle": "theta 15 deg (open circle)", "square": "theta 50 deg (open square)", "diamond": "theta 90 deg (open diamond)"}
raw = {"a": [("s1","circle",468,906),("s1","square",469,923),("s1","diamond",468,933),
 ("s2","circle",652,1355),("s2","square",654,1309),("s2","diamond",653,1293),
 ("s3","circle",812,1252),("s3","square",814,1262),("s3","diamond",813,1288),
 ("s4","circle",972,1174),("s4","square",972,1202),("s4","diamond",972,1188),
 ("s5","circle",1096,1147),("s5","square",1096,1131),("s5","diamond",1096,1159)],
 "b": [("s1","circle",1445,914),("s1","square",1446,942),
 ("s2","circle",1636,1440),("s2","square",1635,1426),("s2","diamond",1635,1452),
 ("s3","circle",1802,1309),("s3","square",1802,1353),("s3","diamond",1802,1348),
 ("s4","circle",1951,1223),("s4","square",1951,1230),("s4","diamond",1952,1257)],
 "c": [("s1","circle",704,1788),("s1","square",705,1741),("s1","diamond",704,1789),
 ("s2","circle",896,2421),("s2","square",895,2454),("s2","diamond",895,2455),
 ("s3","circle",996,2345),("s3","square",998,2381),("s3","diamond",997,2374),
 ("s4","circle",1093,2271),("s4","square",1093,2271),("s4","diamond",1094,2288)]}
for name, r in raw.items():
    pts = [dict(id=f"{name}{g[1:]}{k[0]}", group=g, kind=k, u=u, v=v, series=ser[k]) for g, k, u, v in r]
    json.dump({"sizes": S, "radius": 4.0, "points": pts}, open(sys.argv[1] + f"/pts_f8{name}.json", "w"), indent=1)
