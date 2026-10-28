"""Global axis calibration of a gridded figure by least squares through
labelled ticks, measured as the labelled grid lines in several bands.

usage: python3 -I calib_report.py IMG CONFIG.json OUT.json

CONFIG keys
  x: {"box": [x0, x1], "bands": [[y0, y1], ...], "spacing": px,
      "v0": value of first line, "dv": value per grid step,
      "label_every": n, "labels": [values printed on the axis],
      "first_line_min": px (ignore lines left of this), "last_line_max": px}
  y: same with "box": [y0, y1] and "bands" as [[x0, x1], ...]
  exclude: optional [[value, band_start], ...] labelled samples to leave out
           (for example a tick hidden under a data curve), said in method.md
  y_fit_range: optional [ymin, ymax] native px, only labelled samples inside
               are used for the y fit (to stay on one side of a scan seam)
Writes the fit coefficients (value = a + b*px + c*py), every labelled
sample with its residual in value units and in px, and the full list of
detected lines per band (for the minor-grid check).
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from figlib import load_grey, detect_lines, index_lines, fit_affine

img, cfgp, outp = sys.argv[1], sys.argv[2], sys.argv[3]
cfg = json.load(open(cfgp))
g = load_grey(img)
out = {}
for ax in ("x", "y"):
    c = cfg[ax]
    lo, hi = c["box"]
    samples = []; allines = []
    for band in c["bands"]:
        b0, b1 = band
        if ax == "x":
            pos = detect_lines(g, "v", lo - 6, b0, hi + 6, b1, minsep=c.get("minsep", 8))
        else:
            pos = detect_lines(g, "h", b0, lo - 6, b1, hi + 6, minsep=c.get("minsep", 8))
        pos = pos[(pos >= c.get("first_line_min", lo - 6)) & (pos <= c.get("last_line_max", hi + 6))]
        idx = index_lines(pos, c["spacing"])
        other = 0.5 * (b0 + b1)
        vals = c["v0"] + c["dv"] * idx
        allines.append(dict(band=band, pos=[round(float(p), 2) for p in pos], idx=[int(i) for i in idx]))
        for p, i, v in zip(pos, idx, vals):
            if i % c["label_every"] == 0 and [round(float(v), 6), b0] not in [[round(e[0], 6), e[1]] for e in c.get("exclude", [])]:
                px, py = (p, other) if ax == "x" else (other, p)
                if ax == "y" and "y_fit_range" in cfg:
                    if not (cfg["y_fit_range"][0] <= p <= cfg["y_fit_range"][1]):
                        continue
                samples.append((round(float(v), 6), float(px), float(py)))
    coef, res = fit_affine(samples)
    b = coef[1] if ax == "x" else coef[2]
    out[ax] = dict(coef=[float(v) for v in coef],
                   samples=[dict(value=s[0], px=round(s[1], 2), py=round(s[2], 2),
                                 res_value=round(float(r), 6), res_px=round(float(r / b), 2))
                            for s, r in zip(samples, res)],
                   rms_px=float(np.sqrt(np.mean((res / b) ** 2))),
                   max_px=float(np.max(np.abs(res / b))),
                   lines=allines)
    print(f"axis {ax}: value = {coef[0]:.6f} + {coef[1]:.8f}*px + {coef[2]:.8f}*py ; "
          f"{len(samples)} labelled samples; rms {out[ax]['rms_px']:.2f} px, max {out[ax]['max_px']:.2f} px")
    for s, r in zip(samples, res):
        print(f"   tick {s[0]:8.4f} at ({s[1]:8.2f},{s[2]:8.2f}) residual {r:+.5f} ({r / b:+.2f} px)")
    for L in allines:
        print(f"   band {L['band']}: {len(L['pos'])} lines, idx {L['idx'][0]}..{L['idx'][-1]}")
json.dump(out, open(outp, "w"), indent=1)
