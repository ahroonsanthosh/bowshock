import json, sys
W = sys.argv[1]
CFG = {"3": "beta = 3 deg; l/dm = 0.6 (configuration 15)", "5": "beta = 5 deg; l/dm = 0.6 (configuration 16)", "10": "beta = 10 deg; l/dm = 0.6 (configuration 17)",
       "15": "beta = 15 deg; l/dm = 0.6 (configuration 18)", "20": "beta = 20 deg; l/dm = 0.6 (configuration 20)"}
SYM = {"3": "open circle", "5": "open square", "10": "open diamond", "15": "open triangle", "20": "open right triangle"}
res = json.load(open(W + "out/x6c.json"))
pts = {}
for p in res["points"]:
    b = p["series"]
    m = {"series": "beta = %s deg (%s)" % (b, SYM[b]), "configuration": CFG[b], "sig": 1.5, "flag": "ok", "note": "jet off (caption); phi = 0 deg (top row, text PDF p. 13)"}
    if p["id"].endswith("_m"):
        m.update({"sig": 4.0, "flag": "ambiguous", "note": m["note"] + "; cluster at x/dm = -0.02: circle, triangle and diamond overlap; centre by eye from 5x zoom; the square (beta 5) and right triangle (beta 20) are not visible at this station (hidden or not plotted)"})
    if p["id"] in ("b3_4", "b5_5"):
        m.update({"sig": 2.0, "flag": "ambiguous", "note": m["note"] + "; circle and square overlap at x/dm about 0.58"})
    if p["id"] in ("b15_5",):
        m["note"] += "; this triangle at x/dm 0.564 is far above its neighbours (separated flow region per the faired curve); read as plotted"
    if b == "20":
        m["note"] += "; centre is the right-triangle centroid"
    pts[p["id"]] = m
json.dump({"xdec": 4, "ydec": 4, "common": {"source": "TM X-1960", "item": "fig. 6(c)", "mach": "1.30", "meridian": "0",
           "x_quantity": "x/dm, fraction of maximum model diameter (axial distance from the boattail corner, Sta. 104.14)",
           "y_quantity": "Cp,beta, boattail pressure coefficient", "page": "37"}, "points": pts}, open(W + "meta/x6c.json", "w"), indent=1)
