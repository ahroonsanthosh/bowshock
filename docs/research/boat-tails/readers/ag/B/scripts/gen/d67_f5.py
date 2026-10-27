import json, sys
spec_dir, meta_dir = sys.argv[1], sys.argv[2]
X0, X1 = 809.8, 1946.3   # x/dm 0 and 1.0 (from lines.py)
xg = [[-0.2, 583.97, "v"], [0.0, 809.82, "v", None, 5], [0.2, 1037.88, "v"], [0.4, 1265.0, "v"], [0.6, 1492.94, "v"], [0.8, 1720.9, "v"], [1.0, 1946.32, "v", None, 6]]
panels = {
 "u": {"mach": "1.83", "frame": [584, 820, 1946, 1256], "ygrid": [[0.0, 819.51, "h", [1500, 1940]], [-0.05, 929.37, "h", [1500, 1940]], [-0.1, 1037.96, "h", [1500, 1940]], [-0.15, 1147.53, "h", [1500, 1940]], [-0.2, 1255.88, "h", [1500, 1940]]],
       "stacks": {0.02: (1145, 1201), 0.25: (1122, 1198), 0.50: (1085, 1148), 0.75: (1031, 1096), 0.97: (981, 1050)},
       "c_m02": (793.0, 844.3), "c_08": (906.0, 1188.0), "d_08": (903.5, 1183.0)},
 "l": {"mach": "2.20", "frame": [584, 1475, 1946, 1912], "ygrid": [[0.0, 1474.5, "h", [1500, 1940]], [-0.05, 1585.35, "h", [1500, 1940]], [-0.1, 1693.8, "h", [1500, 1940]], [-0.15, 1803.53, "h", [1500, 1940]], [-0.2, 1912.08, "h", [1500, 1940]]],
       "stacks": {0.02: (1697, 1745), 0.25: (1700, 1769), 0.50: (1685, 1748), 0.75: (1651, 1717), 0.97: (1621, 1695)},
       "c_m02": (794.8, 1501.9), "c_08": (909.0, 1734.75), "d_08": (905.5, 1736.0)},
}
SH = {0: "circle", 45: "square", 90: "diamond", 135: "tri_up", 157.5: "tri_r", 180: "circle"}
SYM = {0: "circle with line", 45: "square", 90: "diamond", 135: "triangle", 157.5: "right triangle, vertical side left", 180: "flagged quarter-round symbol"}
for pk, p in panels.items():
    pts, meta = [], {}
    def add(pid, mer, px, py, note, flag, sig, alt=None):
        pts.append({"id": pid, "series": "phi=%s" % mer, "approx": [px, py], "shape": "circle", "size": 15.5, "fixed": True})
        m = {"meridian": str(mer), "series": "phi = %s deg (%s)" % (mer, SYM[mer]), "note": note, "flag": flag, "sig": sig}
        if alt: m["alt_px"] = alt
        meta[pid] = m
    add(pk + "m02_0", 0, *p["c_m02"], "isolated circle at the orifice ahead of the boattail corner (Table I station -0.02); plotted at about -0.015", "ok", 1.0)
    add(pk + "m02_90", 90, *p["c_m02"], "Table I lists an orifice at -0.02 for phi = 90 too; no separate diamond is visible: either coincident with the circle or not plotted; reading assumes it coincides", "ambiguous", 3.0)
    add(pk + "08_0", 0, *p["c_08"], "circle and a second symbol overlap at station 0.08 (Table I: only phi = 0 and 90 there); circle centre from its visible arcs", "ambiguous", 2.5)
    note90 = "outer symbol at station 0.08: diamond vertices visible" if pk == "u" else "outer symbol at station 0.08 looks square-cornered (flat bottom and left side), not a diamond; Table I gives only phi = 0 and 90 at this station; read as the phi = 90 point"
    add(pk + "08_90", 90, *p["d_08"], note90, "ambiguous", 2.5)
    for xs, (top, bot) in p["stacks"].items():
        x0p, x1p = (809.7, 1945.9) if pk == "u" else (812.0, 1949.9)
        px = x0p + xs * (x1p - x0p)
        cy = 0.5 * (top + bot)
        hi, lo = top + 18, bot - 18
        mers = [0, 45, 90, 135, 157.5, 180]
        for mer in mers:
            add("%s%02d_%s" % (pk, int(round(xs * 100)), str(mer).replace(".", "p")), mer, px, cy,
                "six meridian symbols overlap into one solid blob (ink from %d to %d px); individual symbols cannot be separated from their own strokes; value is the blob centre, alternatives are the highest and lowest possible symbol centres (blob edge -+ 18 px, the circle's outer radius); x is the station of the blob" % (top, bot),
                "ambiguous", 4.0, alt=[[px, hi, "highest possible"], [px, lo, "lowest possible"]])
    spec = {"thr": 128, "frame": p["frame"], "xgrid": xg, "ygrid": p["ygrid"], "points": pts}
    json.dump(spec, open(spec_dir + "d67_f5%s.json" % pk, "w"), indent=1)
    md = {"xdec": 4, "ydec": 4,
          "common": {"source": "TN D-6789", "item": "fig. 5 (%s)" % ("upper, M = 1.83" if pk == "u" else "lower, M = 2.20"), "mach": p["mach"],
                     "configuration": "beta = 10 deg; l/dm = 1.0 (configuration 5 of fig. 4); jet off",
                     "x_quantity": "x/dm, ratio of axial boattail distance (from boattail corner) to model diameter",
                     "y_quantity": "Cp,beta, boattail pressure coefficient", "page": "21"},
          "points": {k: dict(v, note="jet off (caption); " + v["note"]) for k, v in meta.items()}}
    json.dump(md, open(meta_dir + "d67_f5%s.json" % pk, "w"), indent=1)
print("ok")
