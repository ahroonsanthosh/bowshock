"""Process one panel from a JSON config.

usage: panel.py scriptdir config.json out_results.json

config keys:
  page: path of the 600 dpi render
  vlines: [{"val": v, "x": [x_at_y0, x_at_y1], "y": [y0, y1]}]  approximate line
  vtrack: [ystart, yend, ystep]
  hlines: [{"y": [y_at_x0, y_at_x1], "x": [x0, x1], "vals": {"scale": v, ...}}]
  htrack: [xstart, xend, xstep]
  shapes: {"diamond": [size, thick], ...}
  points: [{"id":..., "series":..., "shape":..., "scale":..., "xy":[x,y],
            "fixed": false, "win": 10, "flag": "", "note": ""}]
"""
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import digi, calib

cfg = json.load(open(sys.argv[2]))
page = digi.load(cfg["page"])


def lin(a, b, s0, s1, s):
    return a + (b - a) * (s - s0) / (s1 - s0) if s1 != s0 else a


vfits = []
ys = list(range(*cfg["vtrack"]))
for L in cfg["vlines"]:
    pts = []
    for y in ys:
        xa = lin(L["x"][0], L["x"][1], L["y"][0], L["y"][1], y)
        pts += calib.track_v(page, xa, [y], win=L.get("win", 7))
    f = calib.fit(pts, horizontal=False)
    f["val"] = L["val"]
    vfits.append(f)

hfits = []
xs = list(range(*cfg["htrack"]))
for L in cfg["hlines"]:
    pts = []
    for x in xs:
        if "xr" in L:
            rr = L["xr"] if isinstance(L["xr"][0], list) else [L["xr"]]
            if not any(a <= x <= b for a, b in rr):
                continue
        ya = lin(L["y"][0], L["y"][1], L["x"][0], L["x"][1], x)
        pts += calib.track_h(page, ya, [x], win=L.get("win", 7))
    f = calib.fit(pts, horizontal=True)
    if "slope" in L:
        import numpy as _np
        a = _np.array(pts)
        r = a[:, 1] - L["slope"] * a[:, 0]
        f["c0"], f["c1"] = float(_np.median(r)), float(L["slope"])
    f["vals"] = L["vals"]
    hfits.append(f)

tm = {k: (digi.tmpl_poly(v["poly"], v.get("thick", 4)) if isinstance(v, dict) else digi.tmpl(k, v[0], v[1])) for k, v in cfg["shapes"].items()}
res = []
for p in cfg["points"]:
    x, y = p["xy"]
    score = None
    if not p.get("fixed"):
        x, y, score = digi.refine(page, x, y, tm[p["shape"]], p.get("win", 10))
    X, dXdpx = calib.interp(vfits, [f["val"] for f in vfits], x, y)
    sc = p["scale"]
    hl = [f for f in hfits if sc in f["vals"]]
    Y, dYdpx = calib.interp(hl, [f["vals"][sc] for f in hl], y, x)
    r = dict(p)
    r.update(px=round(float(x), 1), py=round(float(y), 1), score=None if score is None else round(score, 3),
             X=X, Y=Y, dXdpx=dXdpx, dYdpx=dYdpx)
    res.append(r)

json.dump(dict(vfits=vfits, hfits=hfits, points=res), open(sys.argv[3], "w"), indent=1)
print("vertical lines (x = c0 + c1*y):")
for f in vfits:
    print(f"  val={f['val']}: c0={f['c0']:.1f} c1={f['c1']:.5f} n={f['n']}/{f['ntot']} rms={f['rms']:.2f}")
print("horizontal lines (y = c0 + c1*x):")
for f in hfits:
    print(f"  vals={f['vals']}: c0={f['c0']:.1f} c1={f['c1']:.5f} n={f['n']}/{f['ntot']} rms={f['rms']:.2f}")
for r in res:
    print(f"{r['id']:>8} {r['series']:>10} px=({r['px']:.1f},{r['py']:.1f}) s={r['score']} X={r['X']:.4f} Y={r['Y']:.4f}")
