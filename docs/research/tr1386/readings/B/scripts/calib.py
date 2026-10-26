"""Axis calibration from labelled grid lines / tick marks, with an affine least-squares fit per axis.

usage: python3 -I calib.py SPEC.csv OUT_POINTS.csv OUT_FIT.json
SPEC.csv columns: page,figure,panel,axis,tick_label,value,orient,approx,lo,hi[,lo2,hi2]
  orient v: a vertical line (x-axis tick / grid line) near x=approx; measured over rows lo..hi
            (and, if given, a second band lo2..hi2), one point per band.
  orient h: a horizontal line near y=approx; measured over columns lo..hi (and lo2..hi2).
  orient p: a point given directly: approx=x, lo=y (used for a tick mark measured by hand).
In each band, for every row (v) or column (h), the darkness-weighted centre of the line within
+-WIN px of approx is found; the band result is the median over rows/columns.
Fit per (page,figure,panel,axis): value = a*px + b*py + c (affine). If all points of an axis share
nearly the same other coordinate, b is fixed to 0.
"""
import sys
import csv
import json
import numpy as np
from PIL import Image

WORK = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"
WIN = 7
_c = {}


def dark(page):
    if page not in _c:
        g = np.asarray(Image.open(f"{WORK}/p400-{page:02d}.png").convert("L"), dtype=np.float64)
        _c[page] = np.clip((215.0 - g) / 110.0, 0, 1)
    return _c[page]


def measure(d, orient, approx, lo, hi):
    a = int(round(approx))
    vals = []
    if orient == "v":
        for y in range(lo, hi):
            seg = d[y, a - WIN:a + WIN + 1]
            if seg.sum() < 0.5:
                continue
            xs = np.arange(a - WIN, a + WIN + 1)
            # use only the strongest run: weight by darkness squared
            w = seg ** 2
            vals.append((xs * w).sum() / w.sum())
        pos = float(np.median(vals)) if vals else float("nan")
        return pos, (lo + hi) / 2.0, len(vals)
    else:
        for x in range(lo, hi):
            seg = d[a - WIN:a + WIN + 1, x]
            if seg.sum() < 0.5:
                continue
            ys = np.arange(a - WIN, a + WIN + 1)
            w = seg ** 2
            vals.append((ys * w).sum() / w.sum())
        pos = float(np.median(vals)) if vals else float("nan")
        return (lo + hi) / 2.0, pos, len(vals)


def main():
    spec, outp, outj = sys.argv[1], sys.argv[2], sys.argv[3]
    pts = []
    with open(spec) as f:
        for r in csv.DictReader(f):
            if not r["page"] or r["page"].startswith("#"):
                continue
            page = int(r["page"])
            d = dark(page)
            orient = r["orient"]
            bands = [(int(r["lo"]), int(r["hi"]))]
            if r.get("lo2"):
                bands.append((int(r["lo2"]), int(r["hi2"])))
            for lo, hi in bands:
                if orient == "p":
                    px, py, n = float(r["approx"]), float(r["lo"]), 1
                else:
                    px, py, n = measure(d, orient, float(r["approx"]), lo, hi)
                    if n < 20:
                        print(f"  skipped {r['axis']} {r['tick_label']} band {lo}-{hi}: only {n} samples")
                        continue
                pts.append(dict(page=page, figure=r["figure"], panel=r["panel"], axis=r["axis"],
                                tick_label=r["tick_label"], value=float(r["value"]), px=px, py=py, n=n))
                if orient == "p":
                    break
    groups = {}
    for p in pts:
        groups.setdefault((p["page"], p["figure"], p["panel"], p["axis"]), []).append(p)
    fits = {}
    for key, g in groups.items():
        P = np.array([[p["px"], p["py"], 1.0] for p in g])
        v = np.array([p["value"] for p in g])
        coef, *_ = np.linalg.lstsq(P, v, rcond=None)
        res = v - P @ coef
        # scale: value per pixel along main direction
        k = "|".join(str(x) for x in key)
        fits[k] = dict(a=coef[0], b=coef[1], c=coef[2], rms=float(np.sqrt((res ** 2).mean())),
                       maxres=float(np.abs(res).max()), n=len(g))
        print(f"{k}: a={coef[0]:.6g} b={coef[1]:.6g} c={coef[2]:.6g} rms={fits[k]['rms']:.5f} max={fits[k]['maxres']:.5f} n={len(g)}")
        for p, rr in zip(g, res):
            p["resid"] = float(rr)
            print(f"    {p['tick_label']:>6} ({p['px']:.1f},{p['py']:.1f}) n={p['n']} resid={rr:+.5f}")
    with open(outp, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["page", "figure", "panel", "axis", "tick_label", "value", "pixel_x", "pixel_y", "resid"])
        for p in pts:
            w.writerow([p["page"], p["figure"], p["panel"], p["axis"], p["tick_label"], p["value"],
                        round(p["px"], 1), round(p["py"], 1), round(p.get("resid", 0), 5)])
    with open(outj, "w") as f:
        json.dump(fits, f, indent=1)


if __name__ == "__main__":
    main()
