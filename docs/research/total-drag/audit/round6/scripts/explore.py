"""Exploration helper: build a Fig from a JSON spec, print the calibration,
track curves from seeds, and write an overlay for checking by eye.

Usage: python3 -I explore.py <spec.json> <overlay.png>
spec: {pdf, page, work, box, xsel, xvals, ysel, yvals, xlog, ylog,
       tracks: [{name, seed: [X, Y] page px, x_end: page px, max_jump, max_run}],
       symbols: [{name, at: [X, Y] page px, r, shape}], view_box: [x0,y0,x1,y1] local}
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig import Fig  # noqa: E402

COL = [(255, 0, 0), (0, 160, 0), (0, 0, 255), (200, 0, 200), (0, 160, 160), (220, 120, 0)]


def main():
    spec = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    bx = spec["box"]
    f = Fig(spec["pdf"], spec["page"], spec["work"], tuple(bx), spec["xsel"], spec["xvals"], spec["ysel"],
            spec["yvals"], xlog=spec.get("xlog", False), ylog=spec.get("ylog", False),
            frac_v=spec.get("frac_v", 0.5), frac_h=spec.get("frac_h", 0.5))
    print("cal", f.cal_report())
    curves = []
    marks = []
    for i, t in enumerate(spec.get("tracks", [])):
        pts = []
        for seg in t.get("segs", [t]):
            sd = (seg["seed"][0] - bx[0], seg["seed"][1] - bx[1])
            o = seg.get("orient", "cols")
            off = bx[1] if o == "rows" else bx[0]
            pts += f.track(sd, seg["lo"] - off, seg["hi"] - off, orient=o, max_jump=seg.get("max_jump", 6),
                           max_run=seg.get("max_run", 40), gap_slack=seg.get("gap_slack", 0.15))
        pts.sort()
        cd = f.curve_data(pts)
        curves.append((pts, COL[i % len(COL)]))
        print(t["name"], "points", len(pts), "x from", round(cd[0][0], 3) if cd else None, "to",
              round(cd[-1][0], 3) if cd else None)
        for xq in t.get("at", []):
            y, e, n, X, Y = f.read_at(cd, xq)
            print(f"   x={xq}: y={y:.4f} rms={e:.5f} n={n}")
            marks.append((X, Y, COL[i % len(COL)], 6))
    for s in spec.get("symbols", []):
        r = f.symbol(s["at"][0] - bx[0], s["at"][1] - bx[1], s["r"], s.get("shape", "circle"),
                     search=s.get("search", 20))
        print(s["name"], r)
        if r:
            marks.append((r["X"], r["Y"], (255, 0, 255), s["r"] + 4))
    f.overlay(out, marks=marks, curves=curves, scale=spec.get("scale", 0.35),
              box=spec.get("view_box"))
    print(out)


if __name__ == "__main__":
    main()
