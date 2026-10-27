import json, sys
d = sys.argv[1]
ser = "open circle: Exp. mean value (Cortright-Schroeder)"
raw = {"a": [("b563", 1004.5, 1154.5), ("b703", 1145.75, 1259), ("b933", 1371.75, 1377.5)],
       "b": [("b563", 2190.75, 1141), ("b703", 2326, 1106.75), ("b933", 2555, 1110)]}
spec = json.load(open(f"{d}/t24.json"))
for pan, L in raw.items():
    pts = [dict(id=f"{pan}{g}", group=f"{pan}{g}", kind="circle", u=u, v=v, series=ser) for g, u, v in L]
    spec['panels'][pan].update({"sizes": {"circle": 12.0}, "radius": 4.0, "points": pts})
json.dump(spec, open(f"{d}/t24.json", "w"), indent=1)
