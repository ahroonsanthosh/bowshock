import json, sys
d = sys.argv[1]
f29 = {"a": [("e0", 370, 544, 13.5, "Experimental base drag"), ("e563", 957, 673, 12.5, "Experimental base drag"), ("e703", 1106, 728, 12.25, "Experimental base drag"), ("e933", 1345, 795, 12.5, "Experimental base drag")],
       "b": [("e563", 964, 1602, 14.75, "Experimental (0.83 characteristics), side pressure drag"), ("e703", 1111, 1448, 14.75, "Experimental (0.83 characteristics), side pressure drag"), ("e933", 1348, 1225, 14.25, "Experimental (0.83 characteristics), side pressure drag")],
       "c": [("e563", 967, 2436, 14.75, "Pressure drag"), ("e703", 1123, 2334, 14.75, "Pressure drag"), ("e933", 1349, 2182, 14.5, "Pressure drag")]}
f30 = {"a": [("e0", 512, 568, 15.75, "Experimental base drag"), ("e563", 1012, 773, 13.25, "Experimental base drag"), ("e703", 1131, 752, 13.25, "Experimental base drag"), ("e933", 1333, 749, 13.5, "Experimental base drag")],
       "b": [("e563", 1015, 1720, 13.25, "Experimental (0.85 characteristics), side pressure drag"), ("e703", 1138, 1616, 13.25, "Experimental (0.85 characteristics), side pressure drag"), ("e933", 1337, 1461, 13.75, "Experimental (0.85 characteristics), side pressure drag")],
       "c": [("e563", 1022, 2211, 13.25, "Pressure drag"), ("e703", 1143, 2105, 13.25, "Pressure drag"), ("e933", 1343, 1954, 13.25, "Pressure drag")]}
for name, F in (("f29", f29), ("f30", f30)):
    spec = json.load(open(f"{d}/{name}.json"))
    for pan, L in F.items():
        pts = [dict(id=f"{pan}{g}", group=f"{pan}{g}", kind="circle", u=u, v=v, size=s, series=ser) for g, u, v, s, ser in L]
        spec['panels'][pan].update({"sizes": {"circle": 13.0}, "radius": 5.0, "points": pts})
        # zero-angle circle sits on the y axis line: widen fit box
        spec['panels'][pan]['fitbox'] = [340, spec['panels'][pan]['vspan'][0], spec['panels'][pan]['uspan'][1], spec['panels'][pan]['vspan'][1]]
    json.dump(spec, open(f"{d}/{name}.json", "w"), indent=1)
