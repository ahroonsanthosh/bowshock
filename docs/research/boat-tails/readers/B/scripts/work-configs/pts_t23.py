import json, sys
d = sys.argv[1]
S = {"circle": 10.9, "square": 10.0, "tri": 12.75}
ser = {"square": "open square: Ames (sketch: cone, negative boattailing)", "circle": "open circle: NOL, ref. 5 (sketch: cone-cylinder with conical boattail)",
       "tri": "open triangle: Ames (sketch: ogive-type body with boattail)"}
raw = [("square", 560, 1100), ("square", 768.8, 1116), ("square", 982, 1136),
       ("circle", 1188.3, 1135), ("tri", 1190, 1178.3), ("circle", 1295.7, 1167.3), ("circle", 1401.7, 1211.7),
       ("tri", 1563.3, 1268), ("circle", 1611.7, 1297.3), ("circle", 1823.3, 1334), ("tri", 1838.3, 1334)]
pts = [dict(id=f"p{i+1:02d}", group=f"p{i+1:02d}", kind=k, u=u, v=v, series=ser[k]) for i, (k, u, v) in enumerate(raw)]
spec = json.load(open(f"{d}/t23.json"))
spec['panels']['main'].update({"sizes": S, "radius": 4.0, "points": pts})
json.dump(spec, open(f"{d}/t23.json", "w"), indent=1)
