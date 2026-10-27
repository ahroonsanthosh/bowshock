import json, sys
d = sys.argv[1]
ser = {"c": "open circle: From Ref. 4 (ogive-cylinder l/d = 7, no boattail)",
       "s10": "open square: From Ref. 10 (ogive-cylinder with boattail l/d = 7)",
       "s11": "open square: From Ref. 11 (ogive-cylinder with boattail l/d = 7)",
       "fs": "flagged square: From unpublished data NACA Ames 1- by 3-foot SSWT (ogive-cylinder with boattail l/d = 7)"}
raw = {"a": [("c15", "circle", "c", 822.3, 456), ("c20", "circle", "c", 959.3, 625), ("s15", "square", "s10", 822.7, 720.7)],
       "b": [("c15", "circle", "c", 816.5, 1816), ("c20", "circle", "c", 951, 1891.5), ("s15", "square", "s11", 812.5, 2292.5),
             ("fs20", "square", "fs", 937.5, 2192.5), ("s29", "square", "s11", 1195, 2150)]}
spec = json.load(open(f"{d}/a15.json"))
for pan, L in raw.items():
    pts = [dict(id=f"{pan}{g}", group=f"{pan}{g}", kind=k, sym=t, u=u, v=v, series=ser[t]) for g, k, t, u, v in L]
    spec['panels'][pan].update({"sizes": {"circle": 8.5, "square": 8.0}, "radius": 4.0, "points": pts})
json.dump(spec, open(f"{d}/a15.json", "w"), indent=1)
