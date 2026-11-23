"""
A trial case made before the runner's hash left out the iteration limits:
checks each level's start.json and record.json against the old hash (the
settings as oftrial.py builds them, with the old limits), then writes the
new hash and the level's limit. Arguments as oftrial.py's (root K shape cal
ratio mach levels np iters), OF_GRAD as for that run.
"""
import hashlib, json, os, sys
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref, ofref
root, K, shape, cal, ratio, mach = sys.argv[1], float(sys.argv[2]), sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
levels = int(sys.argv[7]); iters = [int(v) for v in sys.argv[9].split(",")]
widen = int(os.environ.get("OF_WIDEN", "0"))
spec = dict(w6ref.capped_spec(shape, cal, ratio, mach, widen) if ratio > 0 else w6ref.sharp_spec(shape, cal, mach, widen), levels=levels)
grad = os.environ.get("OF_GRAD", f"cellVenkatakrishnan Gauss linear {K:g}")
st = {"solver": "shockFluidHeun", "libs": ["libcellVenkatakrishnanGrad.so"], "flux": "Kurganov", "recon": "linearUpwind",
      "reconstruct": {"rho": "linearUpwind grad(rho)", "U": "linearUpwind grad(U)", "T": "linearUpwind grad(T)"},
      "grad": grad, "outer": 2, "maxCo": 0.5, "smoothing": 0.02,
      "target": -10, "iters": iters, "checkpoint": 5000}
keep = {k: v for k, v in spec.items() if k not in ("first_level", "levels")}
old = hashlib.sha256(json.dumps([keep, st], sort_keys=True).encode()).hexdigest()
new = ofref.settings_hash(spec, st)
for level in range(levels):
    for name in ("start.json", "record.json"):
        f = os.path.join(root, f"L{level}", name)
        if not os.path.exists(f):
            continue
        rec = json.load(open(f))
        if rec["settingsHash"] == new:
            continue
        if rec["settingsHash"] != old:
            raise SystemExit(f"{f}: not made with these settings")
        rec["settingsHash"] = new
        rec["limit"] = iters[level]
        json.dump(rec, open(f + ".tmp", "w")); os.replace(f + ".tmp", f)
        print("rehashed", f)
