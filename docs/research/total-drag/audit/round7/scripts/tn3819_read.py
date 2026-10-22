"""Read values off the TN 3819 fig. 18 tracks at chosen Mach numbers.

usage: python3 -I tn3819_read.py CALIB.json TRACKS.json OUT_readings.json

For each target M the clean track points (not near_grid, occluded or merged)
within a window |M - M_t| <= w are fitted with a polynomial in (M - M_t) and
the constant term is the reading. Several windows and degrees are tried; the
central choice gives the value and the spread of the others is a model term
in the error. The reading error printed (about two standard deviations) is

  err = 2 * sqrt(se_fit^2 + s_cal^2 + s_ink^2 + (slope * s_M)^2) + spread / 2

with se_fit the fit's standard error at M_t, s_cal = 0.4 px of P_B (the
leave-one-out scatter of the grid calibration), s_ink = 0.5 px of P_B (ink
centroid systematics), s_M = 0.5 px of M (position of the reading along the
axis) times the local slope dP_B/dM.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import localgrid  # noqa: E402

PX_P = 0.02 / 120.0   # P_B per pixel (vertical), from the calibration
PX_M = 0.20 / 119.2   # M per pixel (horizontal)


def fit_at(M, P, mt, w, deg):
    sel = np.abs(M - mt) <= w
    n = int(sel.sum())
    if n < deg + 4:
        return None
    dm = M[sel] - mt
    nl = int((dm < 0).sum())
    nr = int((dm > 0).sum())
    A = np.vander(dm, deg + 1, increasing=True)
    coef, *_ = np.linalg.lstsq(A, P[sel], rcond=None)
    r = P[sel] - A @ coef
    s2 = (r @ r) / max(1, n - deg - 1)
    cov = s2 * np.linalg.inv(A.T @ A)
    return dict(value=float(coef[0]), slope=float(coef[1]) if deg >= 1 else 0.0,
                se=float(np.sqrt(cov[0, 0])), rms=float(np.sqrt(s2)), n=n, n_left=nl, n_right=nr,
                Mmin=float(M[sel].min()), Mmax=float(M[sel].max()))


def read(pts, mt, windows, degs, use_flagged=False, allow_x=()):
    """allow_x: x ranges whose flagged points are nevertheless used."""
    def ok(p):
        if use_flagged:
            return True
        if any(a <= p["x"] <= b for a, b in allow_x):
            return True
        return not (p.get("near_grid") or p.get("occluded") or p.get("merged"))
    good = [p for p in pts if ok(p)]
    M = np.array([p["M"] for p in good])
    P = np.array([p["P"] for p in good])
    res = []
    for w in windows:
        for dg in degs:
            r = fit_at(M, P, mt, w, dg)
            if r:
                r["w"] = w
                r["deg"] = dg
                res.append(r)
    if not res:
        return None
    central = res[len(res) // 2] if len(res) > 2 else res[0]
    vals = [r["value"] for r in res]
    spread = max(vals) - min(vals)
    s_cal = 0.4 * PX_P
    s_ink = 0.5 * PX_P
    s_m = 0.5 * PX_M * abs(central["slope"])
    err = 2 * np.sqrt(central["se"] ** 2 + s_cal ** 2 + s_ink ** 2 + s_m ** 2) + spread / 2
    return dict(M=mt, value=central["value"], err=float(err), spread=float(spread), central=central,
                variants=[(r["w"], r["deg"], round(r["value"], 5)) for r in res])


def main():
    calib, trk, out = sys.argv[1:4]
    g = localgrid.LocalGrid.load(calib)
    tracks = json.load(open(trk))
    rows = []
    std_w = (0.025, 0.035, 0.05)
    # per-target options: windows, degrees, x ranges whose flagged points are used
    special = {
        # U is dashed up to the M = 1.4 gridline and then runs over the
        # P_B = -0.18 gridline; its faint dash just above that gridline
        # (x 1035-1050) is used, the points on the gridline are not
        ("U", 1.4): dict(w=(0.03, 0.04, 0.05), d=(1,), allow=((1035, 1050),)),
        # the Ref. 9 circle touches U from M 1.478 to 1.545: interpolate across
        ("U", 1.5): dict(w=(0.06, 0.08, 0.10), d=(1, 2), allow=()),
        # U is dashed and crosses the P_B = -0.12 gridline at M 2.5
        ("U", 2.5): dict(w=(0.05, 0.06, 0.07), d=(1, 2), allow=()),
    }
    for name in ("L", "U"):
        for mt in (1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 2.0, 2.5, 3.0):
            sp = special.get((name, mt), dict(w=std_w, d=(1, 2), allow=()))
            r = read(tracks[name], mt, sp["w"], sp["d"], allow_x=sp["allow"])
            rf = read(tracks[name], mt, sp["w"], sp["d"], use_flagged=True)
            if r is None:
                print(name, mt, "no clean points")
                continue
            x, y = g.to_pixel(mt, r["value"])
            r.update(curve=name, x=x, y=y, with_flagged=rf["value"] if rf else None)
            rows.append(r)
            c = r["central"]
            print("%s M=%.2f P=%.4f +-%.4f  (se %.5f spread %.5f slope %.3f n=%d L%d R%d range %.3f-%.3f; "
                  "with flagged %.4f) %s" % (name, mt, r["value"], r["err"], c["se"], r["spread"], c["slope"],
                                             c["n"], c["n_left"], c["n_right"], c["Mmin"], c["Mmax"],
                                             rf["value"] if rf else float("nan"), r["variants"]))
    F = tracks["F"]
    for mt in (1.05, 1.10, 1.15, 1.20, 1.25):
        fw = (0.008, 0.012, 0.016) if mt != 1.20 else (0.016, 0.02, 0.025)
        r = read(F, mt, fw, (2,))
        rf = read(F, mt, fw, (2,), use_flagged=True)
        x, y = g.to_pixel(mt, r["value"])
        r.update(curve="F", x=x, y=y, with_flagged=rf["value"] if rf else None)
        rows.append(r)
        c = r["central"]
        print("F M=%.2f P=%.4f +-%.4f  (se %.5f spread %.5f slope %.3f n=%d L%d R%d; with flagged %.4f) %s" % (
            mt, r["value"], r["err"], c["se"], r["spread"], c["slope"], c["n"], c["n_left"], c["n_right"],
            rf["value"] if rf else float("nan"), r["variants"]))
    # F ends: pixel positions measured on pixel maps (pixmap.py); uncertainty in px
    ends = [("F low-M end", 797.0, 2488.0, 3.0,
             "dashed descent meets the M = 1.0 border; centre of the ink blob at the border"),
            ("F high-M end", 958.5, 2438.8, 2.0, "end of the drawn stroke, centreline")]
    for lab, x, y, u, note in ends:
        m, pb = g.to_data(x, y)
        rows.append(dict(curve="F", label=lab, x=x, y=y, M=m, value=pb, err=2 * u * PX_P,
                         errM=2 * u * PX_M, note=note))
        print("%s: M=%.4f +-%.4f P=%.4f +-%.4f" % (lab, m, 2 * u * PX_M, pb, 2 * u * PX_P))
    # heavy stroke on the border below the low-M end
    for y in (2485.0, 2522.0):
        print("heavy border stroke limit y %.0f -> P %.4f" % (y, g.to_data(793.0, y)[1]))
    # local extremes of F (quadratic fit around each)
    clean_F = [p for p in F if not (p.get("near_grid") or p.get("occluded"))]
    cm = np.array([p["M"] for p in clean_F])
    cp = np.array([p["P"] for p in clean_F])
    for lab, a, b, kind in (("F first peak (most negative)", 1.04, 1.075, "min"),
                            ("F trough", 1.13, 1.165, "max"),
                            ("F second peak", 1.205, 1.245, "min")):
        sel = (cm >= a) & (cm <= b)
        c2, c1, c0 = np.polyfit(cm[sel], cp[sel], 2)
        mx = -c1 / (2 * c2)
        px = np.polyval([c2, c1, c0], mx)
        r = cp[sel] - np.polyval([c2, c1, c0], cm[sel])
        x, y = g.to_pixel(mx, px)
        rows.append(dict(curve="F", label=lab, x=x, y=y, M=float(mx), value=float(px),
                         err=float(2 * np.sqrt(np.mean(r ** 2) / sel.sum() + (0.4 * PX_P) ** 2 + (0.5 * PX_P) ** 2)),
                         note="extremum of a quadratic fitted over M %.3f to %.3f (%d points)" % (a, b, sel.sum())))
        print("%s: M=%.4f P=%.4f (n=%d, rms %.5f)" % (lab, mx, px, sel.sum(), np.sqrt(np.mean(r ** 2))))
    # extremes and ends of F
    Fm = np.array([p["M"] for p in F])
    Fp = np.array([p["P"] for p in F])
    print("F track M range %.4f to %.4f" % (Fm.min(), Fm.max()))
    i = int(np.argmax(Fm))
    print("F high-M end: M=%.4f P=%.4f (x %.1f y %.1f)" % (Fm[i], Fp[i], F[i]["x"], F[i]["y"]))
    clean = [p for p in F if not (p.get("near_grid") or p.get("occluded"))]
    lo = min(clean, key=lambda p: p["M"])
    print("F lowest-M clean point: M=%.4f P=%.4f (x %.1f y %.1f)" % (lo["M"], lo["P"], lo["x"], lo["y"]))
    j = int(np.argmin(Fp))
    print("F most negative: M=%.4f P=%.4f" % (Fm[j], Fp[j]))
    with open(out, "w") as f:
        json.dump(rows, f, indent=1)


if __name__ == "__main__":
    main()
