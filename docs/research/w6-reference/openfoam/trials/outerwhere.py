"""Where on the outer boundary |Cp| is largest, and the profile along the outer boundary."""
import json, os, sys, math
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import numpy as np, w6ref, ofref
case, shape, cal, ratio, mach = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
spec = dict(w6ref.capped_spec(shape, cal, ratio, mach), levels=3)
for lev in sys.argv[6].split(","):
    lev = int(lev); d = os.path.join(case, f"L{lev}"); rec = json.load(open(os.path.join(d, "record.json")))
    nose, x, r, marks = w6ref.grid(spec, lev)
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    t = os.path.join(d, str(rec["time"]))
    p = ofref.read_internal(os.path.join(t, "p")).reshape(ni, nj)
    cp = (p - 1) / (0.7 * mach * mach)
    out = [ofref._cell_of_edge(a, b, ni, nj) for a, b in marks["farfield"]]
    vals = [(abs(cp[i, j]), i, j) for i, j in out]
    m, i, j = max(vals)
    xc = 0.25 * (x[i, j] + x[i + 1, j] + x[i + 1, j + 1] + x[i, j + 1]); rc = 0.25 * (r[i, j] + r[i + 1, j] + r[i + 1, j + 1] + r[i, j + 1])
    print(f"L{lev}: max outer |Cp| {m:.2e} at cell i={i}/{ni} j={j} x={xc:.3f} r={rc:.3f}; cells over 1e-6: {sum(v > 1e-6 for v, _, _ in vals)} of {len(vals)}")
    # the cell column i: |Cp| from the outer boundary inward
    col = [abs(cp[i, jj]) for jj in range(nj - 1, max(nj - 9, -1), -1)]
    print("   column from the boundary inward:", " ".join(f"{v:.1e}" for v in col))
