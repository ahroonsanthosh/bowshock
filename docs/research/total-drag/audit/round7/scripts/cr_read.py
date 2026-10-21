"""Read NASA CR-149372 fig. 8b: the M = 1.2 faired curve every 5 deg and the
M = 1.2 triangles.

usage: python3 -I cr_read.py CALIB.json TRACKS.json TRI.json OUT_readings.json

Curve: at each target theta the clean M1.2 track points (no flag) within
|theta - theta_t| <= w are fitted by a line and a parabola in
(theta - theta_t), w = 1.5, 2.5, 4 deg; the central fit gives the value and
the spread of the fits is a model term. Error (about 2 sigma):
  2 sqrt(se^2 + s_y^2 + (slope s_x)^2) + spread/2,
with s_y, s_x = 1.4 px in Cp and theta (1 px ink centroid, 1 px for the
calibration inside a cell of this hand-drawn grid). Each value is also
converted with a single affine map through all gridline intersections, to
show how much the irregular grid matters.

Triangles: centroids from tri_match.py (template of the measured symbol
shape), error s = 2 px in each axis for the template fit plus 1 px
calibration (2 sigma: 2 sqrt(2^2 + 1)).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import localgrid  # noqa: E402


def affine_from(calib):
    c = json.load(open(calib))
    X = np.array([[np.nan if v is None else v for v in r] for r in c["X"]])
    Y = np.array([[np.nan if v is None else v for v in r] for r in c["Y"]])
    vv, hv = np.array(c["vvals"], float), np.array(c["hvals"], float)
    m = ~np.isnan(X)
    kk, jj = np.where(m)
    A = np.c_[np.ones(m.sum()), X[m], Y[m]]
    cv = np.linalg.lstsq(A, vv[kk], rcond=None)[0]
    ch = np.linalg.lstsq(A, hv[jj], rcond=None)[0]
    return lambda x, y: (float(cv @ [1, x, y]), float(ch @ [1, x, y]))


def main():
    calib, trk, trif, out = sys.argv[1:5]
    g = localgrid.LocalGrid.load(calib)
    aff = affine_from(calib)
    tracks = json.load(open(trk))
    pts = tracks["M1.2"]
    good = [p for p in pts if not p["flag"]]
    T = np.array([p["theta"] for p in good])
    C = np.array([p["Cp"] for p in good])
    # scale: data per px near the curve
    rows = []
    # points inside the symbol cluster at 93 to 104 deg whose ink run is
    # line-like (width <= 24 px): used only for 95 and 100 deg
    sym = [p for p in pts if p["flag"] == "symbol" and p["width"] <= 24 and 92.0 <= p["theta"] <= 104.0]
    Ts = np.array([p["theta"] for p in sym])
    Cs = np.array([p["Cp"] for p in sym])
    notes = {
        0: "faired line hidden in the theta = 0 triangle below theta 1.7 deg; extrapolated with a + b theta^2 "
           "(zero slope at 0, as for any crossflow distribution) from the line at 1.7 to 4.5 deg",
        95: "faired line runs through the 95.6 deg triangle; read from line-width ink inside it and the clean "
            "line before it",
        100: "faired line hidden in the cluster of triangles at 97.6 to 110.5 deg; read from short line-width "
             "pieces at 97.8 to 99.2 deg and the apex region of the 101.2 deg triangle; uncertain",
    }
    floor = {95: 0.006, 100: 0.012}
    for tt in range(0, 101, 5):
        res = []
        if tt == 0:
            TT, CC, wins, degs = T[T >= 1.7], C[T >= 1.7], (2.5, 3.5, 4.5), ("even",)
        elif tt in (95, 100):
            TT = np.r_[T[(T > 90) & (T < 93.2)], Ts]
            CC = np.r_[C[(T > 90) & (T < 93.2)], Cs]
            wins, degs = (2.0, 3.0, 4.0), (1,)
        else:
            TT, CC, wins, degs = T, C, (1.5, 2.5, 4.0), (1, 2)
        for w in wins:
            sel = np.abs(TT - tt) <= w
            for dg in degs:
                if sel.sum() < (2 if dg == "even" else dg) + 5:
                    continue
                dm = TT[sel] - tt
                if dg == "even":
                    # Cp(theta) of a cylinder in crossflow is even in theta: a + b theta^2
                    A = np.c_[np.ones_like(dm), dm ** 2]
                else:
                    A = np.vander(dm, dg + 1, increasing=True)
                coef, *_ = np.linalg.lstsq(A, CC[sel], rcond=None)
                r = CC[sel] - A @ coef
                s2 = (r @ r) / max(1, sel.sum() - A.shape[1])
                cov = s2 * np.linalg.inv(A.T @ A)
                res.append(dict(w=w, deg=dg, value=float(coef[0]), slope=(0.0 if dg == "even" else float(coef[1])),
                                se=float(np.sqrt(cov[0, 0])), n=int(sel.sum()),
                                nl=int((dm < 0).sum()), nr=int((dm > 0).sum())))
        if not res:
            print("theta %d: no clean points" % tt)
            continue
        cen = res[len(res) // 2]
        vals = [r["value"] for r in res]
        spread = max(vals) - min(vals)
        x, y = g.to_pixel(float(tt), cen["value"])
        th1, cp1 = g.to_data(x + 10, y)
        th2, cp2 = g.to_data(x, y + 10)
        dth = abs(th1 - tt) / 10
        dcp = abs(cp2 - cen["value"]) / 10
        s = 1.4
        err = 2 * np.sqrt(cen["se"] ** 2 + (s * dcp) ** 2 + (cen["slope"] * s * dth) ** 2) + spread / 2
        err = max(err, floor.get(tt, 0.0))
        a_th, a_cp = aff(x, y)
        rows.append(dict(kind="curve", theta=float(tt), Cp=cen["value"], err=float(err), slope=cen["slope"],
                         spread=float(spread), n=cen["n"], nl=cen["nl"], nr=cen["nr"], x=x, y=y,
                         affine_theta=a_th, affine_Cp=a_cp, note=notes.get(tt, "")))
        print("theta %3d Cp %.4f +- %.4f (slope %.4f/deg, se %.5f, spread %.5f, n %d L%d R%d; affine map "
              "gives theta %.2f Cp %.4f here)" % (tt, cen["value"], err, cen["slope"], cen["se"], spread, cen["n"],
                                                  cen["nl"], cen["nr"], a_th, a_cp))
    for t in json.load(open(trif)):
        x, y = t["x"], t["y"]
        th, cp = g.to_data(x, y)
        th1, _ = g.to_data(x + 10, y)
        _, cp2 = g.to_data(x, y + 10)
        e = 2 * np.sqrt(5.0)
        a_th, a_cp = aff(x, y)
        rows.append(dict(kind="triangle", theta=th, Cp=cp, err_theta=float(e * abs(th1 - th) / 10),
                         err=float(e * abs(cp2 - cp) / 10), x=x, y=y, ncc=t["ncc"], affine_theta=a_th,
                         affine_Cp=a_cp))
        print("triangle theta %.2f +- %.2f Cp %.4f +- %.4f (ncc %.2f; affine %.2f %.4f)" % (
            th, e * abs(th1 - th) / 10, cp, e * abs(cp2 - cp) / 10, t["ncc"], a_th, a_cp))
    # separation of the three curves in the steep part
    for other in ("M1.1", "M1.0"):
        orow = {int(p["y"]): p["x"] for p in tracks[other] if p["mode"] == "row"}
        d = [(p["theta"], abs(p["x"] - orow[int(p["y"])])) for p in pts
             if p["mode"] == "row" and int(p["y"]) in orow]
        d = np.array(d)
        if len(d):
            for a, b in ((20, 30), (30, 40), (40, 50), (50, 65)):
                sel = (d[:, 0] >= a) & (d[:, 0] < b)
                if sel.any():
                    print("separation M1.2 to %s at theta %d-%d: min %.1f px, median %.1f px" % (
                        other, a, b, d[sel, 1].min(), np.median(d[sel, 1])))
    with open(out, "w") as f:
        json.dump(rows, f, indent=1)


if __name__ == "__main__":
    main()
