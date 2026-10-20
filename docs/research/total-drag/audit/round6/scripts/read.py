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
    done = {(r[1], r[2]) for r in rows if r[-1].startswith("column read")}
    rows = [r for r in rows if not (r[-1] == "not traced" and (r[1], r[2]) in done)]
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
