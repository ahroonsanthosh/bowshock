import json, sys
W = sys.argv[1]
cal = json.load(open(W + "gen/x5c_cal.json"))
R = 15.0
mers = ["0", "45", "90", "135", "157.5", "180"]
SYM = {"0": "circle", "45": "square", "90": "diamond", "135": "triangle", "157.5": "right triangle", "180": "flagged quarter-round"}
X = lambda s: 793.53 + s * (1795.46 - 793.53)
pts, meta = [], {}
def add(pid, mer, x, y, sig, flag, note, alt=None):
    pts.append({"id": pid, "series": mer, "approx": [x, y], "shape": "circle", "size": R, "fixed": True})
    meta[pid] = {"meridian": mer, "series": "phi = %s deg (%s)" % (mer, SYM[mer]), "sig": sig, "flag": flag, "note": note}
    if alt: meta[pid]["alt_px"] = alt
add("m02_0", "0", 781, 1160, 3, "ambiguous", "x/dm -0.02 (table: phi 0 and 90 only): circle and diamond drawn on top of each other; centre by eye")
add("m02_90", "90", 781, 1160, 3, "ambiguous", "x/dm -0.02: diamond coincident with the circle")
add("s08_90", "90", X(0.08), 1652, 4, "ambiguous", "x/dm 0.08 (phi 0 and 90 only): diamond above the circle; centre from its apex")
add("s08_0", "0", X(0.08), 1670, 3, "ambiguous", "x/dm 0.08: circle below the diamond")
for s, (t, b) in {0.02: (1693, 1756), 0.25: (1547, 1605), 0.50: (1430, 1490), 0.75: (1325, 1376), 0.97: (1188, 1236)}.items():
    for mer in mers:
        add("s%02d_%s" % (round(s * 100), mer), mer, X(s), 0.5 * (t + b), 4.0, "ambiguous",
            "six meridian symbols overlap into one stack (ink %d to %d px); individual symbols not separable from their own strokes; value is the stack centre, alternatives the highest and lowest possible symbol centres" % (t, b),
            alt=[[X(s), t + 15, "highest possible"], [X(s), b - 15, "lowest possible"]])
json.dump({"thr": 140, "frame": cal["frame"], "xgrid": cal["xgrid"], "ygrid": cal["ygrid"], "points": pts}, open(W + "spec/x5c.json", "w"), indent=1)
json.dump({"xdec": 4, "ydec": 4, "common": {"source": "TM X-1960", "item": "fig. 5(c)", "mach": "1.30", "configuration": "beta = 10 deg; l/dm = 1.0 (configuration 5); jet off",
           "x_quantity": "x/dm, fraction of maximum model diameter (axial distance from the boattail corner)", "y_quantity": "Cp,beta, boattail pressure coefficient", "page": "34"},
           "points": {k: dict(v, note="jet off (caption); " + v["note"]) for k, v in meta.items()}}, open(W + "meta/x5c.json", "w"), indent=1)
