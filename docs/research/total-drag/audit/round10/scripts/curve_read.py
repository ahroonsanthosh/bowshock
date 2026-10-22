"""Track faired curves between their symbols and read them at fixed abscissae.

usage: python3 -I curve_read.py PAGE.png CALIB.json SYMS.json FIGKEY OUT_tracks.json OUT_read.json

FIGKEY selects a curve list in curvelists.py. Each curve is a chain of
nodes: symbol ids (centres from sym_refine.py output SYMS.json) or fixed
page points (x, y) read by eye where the curve has no symbol (its ends,
the top of a hump). Between consecutive nodes the ink ridge is followed
with ridge.follow (1.5 px steps, centroid across the line, coasting through
dashes and gaps) across the chord between the nodes (chord_scan below),
from 11 px out of the first node to 11 px short of the second (2 and 3 px
for page-point nodes); where the drawn line bows away from the chord by more
than the 15 px search, page-point nodes are added on it. Gridline pixels (+-2.5 px of the calibrated lines) and discs of 10 px
radius around every symbol are masked (a figure entry may set "mask_r" and
"node_off" per symbol type, for larger symbols, and "blur" for the ink
blur radius, default 1), so symbol outlines are not taken for
the line; points whose window touches the mask are flagged and left out of
the fits. With extend_end the ridge is also followed past the last node
until it stops (gaps over 8 px end it), to find where the drawn line ends.

Reading: at each target abscissa the clean points within +-w (data units)
are fitted with a line and a parabola for three window sizes (a figure
entry may give wider windows from a given abscissa on, "windows_from"); the central
fit gives the value and the spread of the fits is kept as a model term.
Error (about 2 sigma) = 2 sqrt(se^2 + (s dy)^2 + (slope s dx)^2) + spread/2,
s = 0.8 px (0.4 px leave-one-out calibration and 0.7 px ink centroid). A
target with points on one side only is not read.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402
import localgrid  # noqa: E402
import ridge  # noqa: E402
import curvelists  # noqa: E402

Image.MAX_IMAGE_PIXELS = None


def chord_scan(d, maskf, a, b, off_a, off_b, width, step=1.5, cw=3.5, min_peak=60.0, jump=4.0, grow=0.0):
    """Sample the ink ridge across the chord a->b: at every step along the chord
    the darkness profile along the chord normal (+-width px) is taken, masked
    pixels zeroed, and the peak nearest the previous accepted offset (or the
    chord, at first) is centroided over +-cw px. Offsets may change by at most
    `jump` px between accepted samples, so the scan stays on one line; after
    samples with no accepted peak (a masked symbol, a gap) the allowance grows
    by `grow` px per missed sample, so a line that drifts behind a mask is
    picked up again."""
    L = np.linalg.norm(b - a)
    u = (b - a) / L
    nrm = np.array([-u[1], u[0]])
    offs = np.arange(-width, width + 0.01, 0.5)
    out = []
    prev = None
    miss = 0
    t = off_a
    while t <= L - off_b:
        q = a + t * u
        xs, ys = q[0] + offs * nrm[0], q[1] + offs * nrm[1]
        prof = ridge.bilinear(d, xs, ys)
        msk = ridge.bilinear(maskf, xs, ys) > 0.01
        prof = np.where(msk, 0.0, prof)
        cand = [i for i in range(1, len(prof) - 1)
                if prof[i] >= prof[i - 1] and prof[i] >= prof[i + 1] and prof[i] > min_peak]
        ref = 0.0 if prev is None else prev
        cand = [i for i in cand if prev is None or abs(offs[i] - prev) <= jump + grow * miss]
        if cand:
            i = min(cand, key=lambda k: abs(offs[k] - ref) - 0.002 * prof[k])
            win = np.abs(offs - offs[i]) <= cw
            w = prof[win]
            if w.sum() > 0:
                c = (offs[win] * w).sum() / w.sum()
                p = q + c * nrm
                out.append(dict(x=float(p[0]), y=float(p[1]), peak=float(prof[i]), near_grid=bool(msk[win].any())))
                prev = c
                miss = 0
        else:
            miss += 1
        t += step
    return out


def main():
    page, calib, symf, key, out_t, out_r = sys.argv[1:7]
    cfg = curvelists.FIGS[key]
    g = localgrid.LocalGrid.load(calib)
    symrecs = json.load(open(symf))
    syms = {s["id"]: s["centre_px"] for s in symrecs}
    stype = {s["id"]: s.get("type") for s in symrecs}
    mask_r = cfg.get("mask_r", {})
    node_off = cfg.get("node_off", {})
    ink = (np.asarray(Image.open(page).convert("L")) < 128).astype(np.uint8) * 255
    d = np.asarray(Image.fromarray(ink).filter(ImageFilter.BoxBlur(cfg.get("blur", 1)))).astype(np.float32)
    bx0, by0, bx1, by1 = cfg["box"]
    vl = [g.vline(k) for k in range(len(g.vvals)) if np.sum(~np.isnan(g.X[k])) >= 2]
    hl = [g.hline(j) for j in range(len(g.hvals)) if np.sum(~np.isnan(g.X[:, j])) >= 2]
    mask = ridge.grid_mask(d.shape, vl, hl, 2.5, (bx0, bx1, by0, by1))
    yy, xx = np.mgrid[by0:by1, bx0:bx1]
    for sid, (sx, sy) in syms.items():
        if bx0 <= sx < bx1 and by0 <= sy < by1:
            mask[by0:by1, bx0:bx1] |= (xx - sx) ** 2 + (yy - sy) ** 2 <= mask_r.get(stype[sid], 10.0) ** 2
    for (mx0, my0, mx1, my1) in cfg.get("mask_boxes", []):
        mask[my0:my1, mx0:mx1] = True
    maskf = mask.astype(np.float32)
    tracks, reads = {}, []
    for name, cv in cfg["curves"].items():
        nodes = [np.array(syms[n] if isinstance(n, str) else n, float) for n in cv["nodes"]]
        pts = []
        for i in range(len(nodes) - 1):
            a, b = nodes[i], nodes[i + 1]
            u = (b - a) / np.linalg.norm(b - a)
            u0 = np.array(cv.get("dirs", {}).get(i, u), float)
            u0 /= np.linalg.norm(u0)
            na, nb = cv["nodes"][i], cv["nodes"][i + 1]
            off_a = node_off.get(stype[na], 11.0) if isinstance(na, str) else 2.0
            off_b = node_off.get(stype[nb], 11.0) if isinstance(nb, str) else 3.0

            seg = chord_scan(d, maskf, a, b, off_a, off_b, cv.get("widths", {}).get(i, cv.get("width", 15.0)),
                             grow=cfg.get("grow", 0.0))
            for p in seg:
                p["seg"] = i
            pts += seg
        if cv.get("extend_end"):
            a, b = nodes[-2], nodes[-1]
            u = (b - a) / np.linalg.norm(b - a)
            seg = ridge.follow(d, maskf, b + 11.0 * u, u, step=1.5, half=8.0, tol=3.0, max_gap=8.0,
                               stop=lambda p: p[0] > bx1 - 3, min_peak=60.0)
            for p in seg:
                p["seg"] = "end"
            pts += seg
        for p in pts:
            p["X"], p["Y"] = g.to_data(p["x"], p["y"])
        tracks[name] = pts
        P = [p for p in pts if not p["near_grid"]]
        X = np.array([p["X"] for p in P])
        Y = np.array([p["Y"] for p in P])
        for xt in cv["targets"]:
            res = []
            wins = cfg["windows"]
            for xmin, ws in cfg.get("windows_from", []):
                if xt >= xmin:
                    wins = ws
            for w in wins:
                sel = np.abs(X - xt) <= w
                if (X[sel] < xt).sum() < 2 or (X[sel] > xt).sum() < 2:
                    continue
                for dg in (1, 2):
                    if sel.sum() < dg + 5:
                        continue
                    dm = X[sel] - xt
                    A = np.vander(dm, dg + 1, increasing=True)
                    coef, *_ = np.linalg.lstsq(A, Y[sel], rcond=None)
                    r = Y[sel] - A @ coef
                    s2 = (r @ r) / max(1, sel.sum() - dg - 1)
                    cov = s2 * np.linalg.inv(A.T @ A)
                    res.append(dict(value=float(coef[0]), slope=float(coef[1]), se=float(np.sqrt(cov[0, 0])),
                                    n=int(sel.sum())))
            if not res:
                reads.append(dict(curve=name, x=xt, value=None, note="no points on both sides"))
                continue
            cen = res[len(res) // 2]
            vals = [r["value"] for r in res]
            spread = max(vals) - min(vals)
            px, py = g.to_pixel(xt, cen["value"])
            dx = abs(g.to_data(px + 10, py)[0] - xt) / 10
            dy = abs(g.to_data(px, py + 10)[1] - cen["value"]) / 10
            s = 0.8
            err = 2 * np.sqrt(cen["se"] ** 2 + (s * dy) ** 2 + (cen["slope"] * s * dx) ** 2) + spread / 2
            reads.append(dict(curve=name, x=xt, value=cen["value"], err=float(err), slope=cen["slope"],
                              n=cen["n"], spread=float(spread), px=float(px), py=float(py)))
        # drawn ends of the curve: first and last tracked points
        if pts:
            for lab, p in (("start", pts[0]), ("end", pts[-1])):
                reads.append(dict(curve=name, x=p["X"], value=p["Y"], err=None, kind=lab, px=p["x"], py=p["y"]))
        print(name, len(pts), "points,", len(P), "clean")
    for r in reads:
        if r.get("value") is not None and r.get("err") is not None:
            print("%-8s x %.3f  y %.4f +- %.4f (slope %.3f, n %d)" % (r["curve"], r["x"], r["value"], r["err"],
                                                                     r["slope"], r["n"]))
        elif r.get("kind"):
            print("%-8s %s at x %.4f y %.4f" % (r["curve"], r["kind"], r["x"], r["value"]))
        else:
            print("%-8s x %.3f not read" % (r["curve"], r["x"]))
    json.dump(tracks, open(out_t, "w"))
    json.dump(reads, open(out_r, "w"), indent=1)


if __name__ == "__main__":
    main()
