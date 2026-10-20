"""Read a figure from its spec: curves (tracked segments, read at given
abscissae) and symbols (centroids), each with an error; write a csv and an
overlay for checking.

Usage: python3 -I read.py <spec.json> <out.csv> [overlay.png]

spec keys (besides the calibration keys of fig.from_spec):
  curves: [{name, segs: [{seed: [X, Y] page px, lo, hi, orient: cols|rows,
            max_jump, max_run, gap_slack, xmin, xmax}], at: [x...],
            extra: [[x0, x1, e], ...]}]   extra error e (data units of y)
            added in quadrature for readings with x0 <= x <= x1 (e.g. where
            curves merge); segs' xmin/xmax keep only the segment's points in
            that data range.
  symbols: [{name, at: [X, Y] page px, r, shape, x_label, note}]
  floor_px: centre-of-line judgement floor, render px (default 2.0, one scan pixel)
Errors: err_y = sqrt(trace_rms^2 + floor^2 + cal_y^2 + (slope * cal_x)^2 + extra^2)
with cal_* = 0.5 px (line-centre fit) in data units plus the gridline fit rms.
For symbols: err = sqrt((1 px)^2 + cal^2) on each axis, plus half the
stroke width for symbols that touch others (flag 'touch').
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from fig import from_spec, write_csv  # noqa: E402
from stroke import trace2d  # noqa: E402
import dig  # noqa: E402
import dots  # noqa: E402

COL = [(255, 0, 0), (0, 160, 0), (0, 0, 255), (200, 0, 200), (0, 160, 160), (220, 120, 0), (120, 60, 0)]


def main():
    spec = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    ov = sys.argv[3] if len(sys.argv) > 3 else None
    bx = spec["box"]
    f = from_spec(spec)
    cal = f.cal_report()
    ux, uy = cal["x_per_px"], cal["y_per_px"]
    calx = np.hypot(0.5, cal["x_line_rms_px"]) * ux
    caly = np.hypot(0.5, cal["y_line_rms_px"]) * uy
    floor = spec.get("floor_px", 2.0) * uy
    rows = []
    curves = []
    marks = []
    for i, c in enumerate(spec.get("curves", [])):
        cd = []
        allpts = []
        for seg in c["segs"]:
            sd = (seg["seed"][0] - bx[0], seg["seed"][1] - bx[1])
            o = seg.get("orient", "cols")
            off = bx[1] if o == "rows" else bx[0]
            if o == "2d":
                kw = dict(step=seg.get("step", 3.0), w=seg.get("w", 6), max_gap=seg.get("max_gap", 45.0),
                          smooth=seg.get("smooth", 0.5), max_turn=seg.get("max_turn", 25.0),
                          y_lo=seg.get("ylo", bx[1]) - bx[1], y_hi=seg.get("yhi", bx[3]) - bx[1])
                pts = trace2d(f.clean, sd[0], sd[1], seg["dir"], seg["lo"] - bx[0], seg["hi"] - bx[0], **kw)
                if seg.get("both", False):
                    pts += trace2d(f.clean, sd[0], sd[1], seg["dir"] + 180.0, seg["lo"] - bx[0],
                                   seg["hi"] - bx[0], **kw)
            else:
                pts = f.track(sd, seg["lo"] - off, seg["hi"] - off, orient=o, max_jump=seg.get("max_jump", 6),
                              max_run=seg.get("max_run", 40), gap_slack=seg.get("gap_slack", 0.15))
            d = f.curve_data(pts)
            lo = seg.get("xmin", -1e30)
            hi = seg.get("xmax", 1e30)
            keep = [(p, q) for p, q in zip(pts, d) if lo <= q[0] <= hi]
            allpts += [p for p, q in keep]
            cd += [q for p, q in keep]
        cd.sort()
        curves.append((sorted(allpts), COL[i % len(COL)]))
        for xq in c.get("at", []):
            y, e, n, X, Y = f.read_at(cd, xq, half_px=c.get("half_px", 8))
            if not np.isfinite(y):
                rows.append([spec.get("figure", ""), c["name"], f"{xq:g}", "", "", "not traced"])
                continue
            # local slope dy/dx from neighbours
            y1 = f.read_at(cd, xq + 6 * ux, half_px=c.get("half_px", 8))[0]
            y0 = f.read_at(cd, xq - 6 * ux, half_px=c.get("half_px", 8))[0]
            slope = (y1 - y0) / (12 * ux) if np.isfinite(y1) and np.isfinite(y0) else 0.0
            ex = 0.0
            for x0, x1, ee in c.get("extra", []):
                if x0 <= xq <= x1:
                    ex = max(ex, ee)
            err = float(np.sqrt(e ** 2 + floor ** 2 + caly ** 2 + (slope * calx) ** 2 + ex ** 2))
            rows.append([spec.get("figure", ""), c["name"], f"{xq:g}", f"{y:.4f}", f"{err:.4f}",
                         f"curve, n={n}" + (f", extra {ex:g}" if ex else "")])
            marks.append((X, Y, COL[i % len(COL)], 7))
    # single-column reads: the ink run nearest the window's centre in the
    # column at data abscissa x, within page rows win[0]..win[1]
    for c in spec.get("colreads", []):
        yc = 0.5 * (c["win"][0] + c["win"][1]) - bx[1]
        X = f.ax.pixel(c["x"], yc)
        rs = []
        for Xi in (int(np.floor(X)), int(np.ceil(X))):
            rs += [(0.5 * (s + e), e - s + 1, Xi) for s, e in
                   dig.column_runs(f.clean, Xi, c["win"][0] - bx[1], c["win"][1] - bx[1])]
        if not rs:
            rows.append([spec.get("figure", ""), c["series"], f"{c['x']:g}", "", "", "column read: no ink"])
            continue
        Yc = float(np.mean([r[0] for r in rs if abs(r[0] - min(rs, key=lambda q: abs(q[0] - yc))[0]) < 4]))
        xv, yv = f.data(X, Yc)
        ex = c.get("extra", 0.0)
        err = float(np.sqrt(floor ** 2 + caly ** 2 + ex ** 2))
        rows.append([spec.get("figure", ""), c["series"], f"{c['x']:g}", f"{yv:.4f}", f"{err:.4f}",
                     "column read" + (f", extra {ex:g}" if ex else "") + (", " + c["note"] if c.get("note") else "")])
        marks.append((X, Yc, (255, 120, 0), 7))
    # guided column reads: for each abscissa, the ink run nearest a path
    # drawn by hand through the curve (data x, page y), averaged over +-3
    # columns; the path only picks the run, the run's centre is the reading
    for g in spec.get("guided", []):
        px_ = np.array([p[0] for p in g["path"]], float)
        py_ = np.array([p[1] for p in g["path"]], float)
        hw = g.get("halfwin", 8)
        for xq in g["xs"]:
            yp = float(np.interp(xq, px_, py_)) - bx[1]
            X = f.ax.pixel(xq, yp)
            cs = []
            gl = [L[0] + L[1] * yp for L in f.vsort]
            near = any(abs(X - g_) < 6 for g_ in gl)
            cols_ = (list(range(int(round(X)) - 14, int(round(X)) - 5)) + list(range(int(round(X)) + 6, int(round(X)) + 15))
                     if near else range(int(round(X)) - 3, int(round(X)) + 4))
            for Xi in cols_:
                rs = dig.column_runs(f.clean, Xi, int(yp - hw), int(yp + hw) + 1)
                rs = [(0.5 * (s + e), e - s + 1) for s, e in rs if e - s + 1 <= g.get("max_run", 24)]
                if rs:
                    c = min(rs, key=lambda q: abs(q[0] - yp))
                    cs.append((Xi, c[0]))
            ex = 0.0
            for x0, x1, ee in g.get("extra", []):
                if x0 <= xq <= x1:
                    ex = max(ex, ee)
            if len(cs) < 3:
                rows.append([spec.get("figure", ""), g["series"], f"{xq:g}", "", "", "guided read: no ink"])
                continue
            k = np.polyfit([c[0] for c in cs], [c[1] for c in cs], 1)
            Yc = float(np.polyval(k, X))
            sc_ = float(np.std([c[1] - np.polyval(k, c[0]) for c in cs]))
            xv, yv = f.data(X, Yc)
            err = float(np.sqrt(floor ** 2 + caly ** 2 + (sc_ * uy) ** 2 + (k[0] * uy / ux * calx) ** 2 + ex ** 2))
            rows.append([spec.get("figure", ""), g["series"], f"{xq:g}", f"{yv:.4f}", f"{err:.4f}",
                         f"guided column read; n={len(cs)}" + (f"; extra {ex:g}" if ex else "")])
            marks.append((X, Yc, (0, 120, 255), 7))
    done = {(r[1], r[2]) for r in rows if r[-1].startswith("column read")}
    rows = [r for r in rows if not (r[-1] == "not traced" and (r[1], r[2]) in done)]
    if "dots" in spec:
        D = spec["dots"]
        R = D.get("R", 40)
        full = dig.dark(dig.load(f.png), spec.get("thr", 0.55))
        tpls = []
        offs = {}
        for L in D["legend"]:
            X, Y = L["at"]
            reg = (X - 30, Y - 30, X + 31, Y + 31)
            if L.get("nodot"):
                # a legend glyph drawn without its dot: centre it on its outline's
                # bounding box (circles and squares)
                cc, _ = dig.components(full[Y - 45:Y + 46, X - 45:X + 46], min_px=50)
                q = max(cc, key=lambda c: c["n"])
                bl = [(X - 45 + 0.5 * (q["bbox"][0] + q["bbox"][2]), Y - 45 + 0.5 * (q["bbox"][1] + q["bbox"][3]),
                       0, 0, 0)]
            else:
                bl = dots.dot_blobs(full, reg, D.get("dot_min", 3), D.get("dot_max", 16))
            if not bl:
                raise SystemExit(f"legend dot not found for {L['series']}")
            bx_, by_, w_, h_, n_ = min(bl, key=lambda q: (q[0] - X) ** 2 + (q[1] - Y) ** 2)
            gl = dots.glyph(full, bx_, by_, R, max(w_, h_) / 2 + 2)
            tpls.append((L["series"], gl))
            offs[L["series"]] = dots.rule_offset(gl, R, L.get("rule", "bbox"))[:2]
        rg = D.get("region")
        dm = f.m if D.get("mask") == "raw" else f.clean
        found = [] if rg is None else dots.dot_blobs(
            dm, (rg[0] - bx[0], rg[1] - bx[1], rg[2] - bx[0], rg[3] - bx[1]),
            D.get("dot_min", 3), D.get("dot_max", 16))
        excl = [(e[0] - bx[0], e[1] - bx[1]) for e in D.get("exclude", [])]
        found = [q for q in found if all((q[0] - e[0]) ** 2 + (q[1] - e[1]) ** 2 > 15 ** 2 for e in excl)]
        for cx, cy, w_, h_, n_ in sorted(found):
            Rp = D.get("R_plot", R)
            g = dots.glyph(dm, cx, cy, Rp, max(w_, h_) / 2 + 2)
            scales = D.get("scales", [1.0])
            scores = sorted(((*dots.match_scaled(g, t, scales, D.get("shift", 2)), name) for name, t in tpls),
                            reverse=True)
            (s1, sc1, n1), (s2, sc2, n2) = scores[0], scores[1]
            if D.get("classify") == "corners" and s1 - s2 < 0.1:
                # square or circle: distance from the dot to the outline along
                # the diagonals over that along the axes (a square's corners
                # lie sqrt(2) further out; a circle's ratio is 1)
                def first_ink(ddx, ddy):
                    for rr in range(8, 56):
                        yy_ = int(round(cy + ddy * rr / np.hypot(ddx, ddy)))
                        xx_ = int(round(cx + ddx * rr / np.hypot(ddx, ddy)))
                        if f.clean[max(0, yy_ - 1):yy_ + 2, max(0, xx_ - 1):xx_ + 2].any():
                            return rr
                    return np.nan
                dd_ = np.nanmedian([first_ink(a_, b_) for a_, b_ in ((1, 1), (1, -1), (-1, 1), (-1, -1))])
                da_ = np.nanmedian([first_ink(a_, b_) for a_, b_ in ((1, 0), (-1, 0), (0, 1), (0, -1))])
                rat = dd_ / da_ if da_ else np.nan
                if rat > 1.22:
                    n1, s1, s2, n2, sc1 = D["square"], 1.0, 0.0, D["circle"], 1.0
                elif rat < 1.12:
                    n1, s1, s2, n2, sc1 = D["circle"], 1.0, 0.0, D["square"], 1.0
                else:
                    s1, s2 = 0.6, 0.55  # ambiguous: keep the template's choice, flagged
            if s1 < D.get("min_score", 0.5):
                continue
            for rx_, ry_, rname in D.get("rename", []):
                if (cx - (rx_ - bx[0])) ** 2 + (cy - (ry_ - bx[1])) ** 2 <= 15 ** 2:
                    n1, s1, s2, n2, sc1 = rname, 1.0, 0.0, "(named by eye)", 1.0
            xd, yd = f.data(cx, cy)
            dx_, dy_ = offs[n1][0] * sc1, offs[n1][1] * sc1
            xv, yv = f.data(cx + dx_, cy + dy_)
            ex = np.hypot(1.0 * ux, calx)
            ey = np.hypot(1.0 * uy, caly)
            xnote = ""
            for b0, b1, b2, b3, ee, why in D.get("extra_box", []):
                if b0 <= cx + bx[0] <= b2 and b1 <= cy + bx[1] <= b3:
                    ey = float(np.hypot(ey, ee))
                    xnote = "; " + why
            if spec.get("xlog"):
                ex = xv * np.log(10) * ex
            rows.append([spec.get("figure", ""), n1, f"{xv:.4g}", f"{yv:.4f}", f"{ey:.4f}",
                         f"rule centroid from the centre dot (dot at {xd:.4g}, {yd:.4f}); match {s1:.2f}"
                         f" at scale {sc1:g} (next {n2} {s2:.2f}); x err {ex:.3g}"
                         + ("; LOW MARGIN" if s1 - s2 < 0.1 else "") + xnote])
            marks.append((cx, cy, (255, 0, 255), 12))
        # symbols whose dot is lost (merged with a curve, hidden): the legend
        # glyph itself as the template, its dot position as the centre
        tdict = dict(tpls)
        for gs in D.get("glyph_at", []):
            Xa, Ya = gs["at"][0] - bx[0], gs["at"][1] - bx[1]
            S = gs.get("search", 20)
            best = None
            for scl in gs.get("scales", D.get("glyph_scales", [1.0])):
                t = dots.scaled(tdict[gs["series"]], scl, int(R * scl) + 2)
                Rt = t.shape[0] // 2
                y0_, x0_ = int(Ya) - Rt - S, int(Xa) - Rt - S
                n_ = 2 * (Rt + S) + 1
                sub = np.zeros((n_, n_), dtype=bool)
                ya, xa = max(0, y0_), max(0, x0_)
                yb, xb = min(f.clean.shape[0], y0_ + n_), min(f.clean.shape[1], x0_ + n_)
                sub[ya - y0_:yb - y0_, xa - x0_:xb - x0_] = f.clean[ya:yb, xa:xb]
                sc = dig.correlate(dots.dilate(sub, 1), t)
                c0 = Rt + S
                w_ = sc[c0 - S:c0 + S + 1, c0 - S:c0 + S + 1]
                iy, ix = np.unravel_index(np.argmax(w_), w_.shape)
                val = float(w_[iy, ix])
                if best is None or val > best[0]:
                    best = (val, scl, ix + c0 - S + x0_, iy + c0 - S + y0_)
            val, scl, cx, cy = best
            dx_, dy_ = (v * scl for v in offs[gs["series"]])
            xv, yv = f.data(cx + dx_, cy + dy_)
            ey = float(np.hypot(np.hypot(2.0 * uy, caly), gs.get("extra", 0.0)))
            ex = np.hypot(2.0 * ux, calx)
            rows.append([spec.get("figure", ""), gs["series"], f"{xv:.4g}", f"{yv:.4f}", f"{ey:.4f}",
                         f"legend-glyph template at scale {scl:g}; match {val:.2f}; x err {ex:.3g}"
                         + ("; " + gs["note"] if gs.get("note") else "")])
            marks.append((cx, cy, (0, 200, 255), 14))
    for s in spec.get("symbols", []):
        r = f.symbol(s["at"][0] - bx[0], s["at"][1] - bx[1], s["r"], s.get("shape", "circle"),
                     search=s.get("search", 20))
        if r is None:
            rows.append([spec.get("figure", ""), s["name"], "", "", "", "symbol not found"])
            continue
        ex = np.hypot(2.0 * ux, calx)
        ey = np.hypot(2.0 * uy, caly)
        if s.get("touch"):
            ex = np.hypot(ex, 0.5 * f.thick * ux)
            ey = np.hypot(ey, 0.5 * f.thick * uy)
        xv = r["x"]
        yv = r["y"]
        if spec.get("xlog"):
            ex = xv * np.log(10) * ex
        if spec.get("ylog"):
            ey = yv * np.log(10) * ey
        ey = float(np.hypot(ey, s.get("extra", 0.0)))
        rows.append([spec.get("figure", ""), s["name"], f"{xv:.4f}", f"{yv:.4f}", f"{ey:.4f}",
                     f"symbol {s.get('shape', 'circle')} {r['w']} px (score {r['score']:.2f}), x err {ex:.4f}"
                     + (", " + s["note"] if s.get("note") else "")])
        marks.append((r["X"], r["Y"], (255, 0, 255), s["r"] + 5))
    rows = [r[:-1] + [r[-1].replace(", ", "; ").replace(",", ";")] for r in rows]
    write_csv(out, ["figure", "series", "x", "y", "err_y", "how"], rows)
    with open(out.replace(".csv", "_cal.txt"), "w") as fh:
        fh.write(json.dumps({k: (float(v) if isinstance(v, (np.floating, float)) else v) for k, v in cal.items()},
                            indent=1) + "\n")
    if ov:
        f.overlay(ov, marks=marks, curves=curves, scale=spec.get("scale", 0.3), box=spec.get("view_box"))
    for r in rows:
        print(",".join(r))
    print("cal", {k: round(float(v), 6) for k, v in cal.items()})


if __name__ == "__main__":
    main()
