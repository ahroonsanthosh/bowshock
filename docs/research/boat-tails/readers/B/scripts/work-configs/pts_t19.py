import json, sys
d = sys.argv[1]
R = {"a": (".25 x 10^6", "1.00 x 10^6"), "b": (".30 x 10^6", "1.20 x 10^6"), "c": (".35 x 10^6", "1.40 x 10^6")}
raw = {"a": [("L2", "circle", 967, 887), ("L2", "square", 969, 873), ("L3", "circle", 1145, 992), ("L3", "square", 1147, 1013),
             ("L4", "circle", 1322, 1010), ("L4", "square", 1323, 1049), ("L5", "circle", 1500, 1045), ("L5", "square", 1500, 1069)],
       "b": [("L2", "circle", 978, 1338), ("L2", "square", 980, 1365), ("L3", "circle", 1159, 1531), ("L3", "square", 1158, 1558),
             ("L4", "circle", 1336, 1608), ("L4", "square", 1337, 1600), ("L5", "circle", 1515, 1628), ("L5", "square", 1515, 1640)],
       "c": [("L2", "circle", 996, 2114), ("L2", "square", 997, 2144), ("L3", "circle", 1175, 2380), ("L3", "square", 1176, 2390),
             ("L4", "circle", 1352, 2472), ("L4", "square", 1355, 2482), ("L5", "circle", 1530, 2497), ("L5", "square", 1530, 2471)]}
spec = json.load(open(f"{d}/t19.json"))
for pan, L in raw.items():
    pts = []
    for g, k, u, v in L:
        rr = R[pan][0] if k == "circle" else R[pan][1]
        pts.append(dict(id=f"{pan}{g}{k[0]}", group=f"{pan}{g}", kind=k, u=u, v=v, series=f"open {k}: R/inch {rr}"))
    spec['panels'][pan].update({"sizes": {"circle": 11.25, "square": 10.0}, "radius": 5.0, "points": pts})
json.dump(spec, open(f"{d}/t19.json", "w"), indent=1)
