"""Least-squares axis calibration through labelled ticks, where each
labelled tick is the printed grid line found nearest to where the two end
ticks put it.

usage: python3 -I calib_labels.py IMG CONFIG.json OUT.json
CONFIG: {"x": {"labels": [values], "end_px": [px of first label, px of last label],
               "bands": [[y0, y1], ...], "box": [x0, x1], "tol": px},
         "y": {... "bands": [[x0, x1], ...], "box": [y0, y1]}}
"exclude": [[value, band_start], ...] leaves out samples hit by a data curve.
The end_px are rough (by eye); every labelled line is then found within
`tol` px of its predicted place in each band. Writes value = a + b px + c py
per axis, every sample and its residual.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from figlib import load_grey, detect_lines, detect_lines_s, fit_affine

img, cfgp, outp = sys.argv[1:4]
cfg = json.load(open(cfgp)); g = load_grey(img); out = {}
for ax in ("x", "y"):
    c = cfg[ax]; labels = c["labels"]; e0, e1 = c["end_px"]; tol = c.get("tol", 3.0)
    samples = []; missing = []
    for b0, b1 in c["bands"]:
        lo, hi = c["box"]
        if "major_min" in c:  # keep only heavy lines (labelled ticks sit on heavy grid lines)
            ps = detect_lines_s(g, "v" if ax == "x" else "h", *( (lo, b0, hi, b1) if ax == "x" else (b0, lo, b1, hi) ), minsep=c.get("minsep", 4))
            pos = ps[ps[:, 1] >= c["major_min"], 0] if len(ps) else np.array([])
        else:
            pos = detect_lines(g, "v" if ax == "x" else "h", *( (lo, b0, hi, b1) if ax == "x" else (b0, lo, b1, hi) ), minsep=c.get("minsep", 4))
        other = 0.5 * (b0 + b1)
        for v in labels:
            if [v, b0] in c.get("exclude", []):
                missing.append((v, b0, "excluded")); continue
            pred = e0 + (v - labels[0]) / (labels[-1] - labels[0]) * (e1 - e0)
            near = pos[np.abs(pos - pred) <= tol] if len(pos) else []
            if len(near) == 0:
                missing.append((v, b0)); continue
            p = near[np.argmin(np.abs(near - pred))]
            samples.append((v, p, other) if ax == "x" else (v, other, p))
    coef, res = fit_affine(samples)
    b = coef[1] if ax == "x" else coef[2]
    out[ax] = dict(coef=[float(v) for v in coef], samples=[dict(value=s[0], px=round(s[1], 2), py=round(s[2], 2), res_value=round(float(r), 6), res_px=round(float(r / b), 2)) for s, r in zip(samples, res)],
                   rms_px=float(np.sqrt(np.mean((res / b) ** 2))), max_px=float(np.max(np.abs(res / b))), missing=missing)
    print(f"axis {ax}: value = {coef[0]:.6f} + {coef[1]:.8f}*px + {coef[2]:.8f}*py ; {len(samples)} samples; rms {out[ax]['rms_px']:.2f} px, max {out[ax]['max_px']:.2f} px; missing {missing}")
    for s, r in zip(samples, res):
        print(f"   tick {s[0]:7.3f} at ({s[1]:8.2f},{s[2]:8.2f}) residual {r:+.5f} ({r / b:+.2f} px)")
json.dump(out, open(outp, "w"), indent=1)
