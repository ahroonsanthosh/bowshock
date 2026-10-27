import json, sys
# usage: x7.py out_spec xcomb ycomb points_json [sizes_json]
# comb: [p0, spacing, v0, dv, resid_rms_px]
out, xc, yc, pts = sys.argv[1], json.loads(sys.argv[2]), json.loads(sys.argv[3]), json.loads(sys.argv[4])
SZ = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
SH = {"3": ("circle", 17), "5": ("square", 15), "10": ("diamond", 21), "15": ("tri_up", 19), "7.5": ("tri_r", 19), "20": ("tri_ul", 18)}
for k, v in SZ.items():
    SH[k] = (SH[k][0], v)
P = []
for q in pts:
    pid, b, x, y = q[:4]
    sh, sz = SH[b]
    d = {"id": pid, "series": b, "approx": [x, y], "shape": sh, "size": sz, "dsize": 2.5, "search": 9, "gap": 4}
    if len(q) > 4:
        d.update(q[4])
    if sh.startswith("tri"):
        d.setdefault("aspect", 0.9)
    P.append(d)
spec = {"thr": 128, "frame": [0, 0, 1, 1], "xgrid": [], "ygrid": [], "points": P,
        "comb": {"x": xc[:4], "y": yc[:4], "rms_px": max(xc[4], yc[4])}}
json.dump(spec, open(out, "w"), indent=1)
