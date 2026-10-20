"""Print the dark runs of a figure's cleaned mask (gridlines removed) at a set
of columns (or rows), in page px and in data units, to link curves by hand.

Usage: python3 -I runs.py <spec.json> cols|rows <from> <to> <step> <lo> <hi>
  cols: columns X = from..to (page px), runs within page rows lo..hi
  rows: rows Y = from..to, runs within page columns lo..hi
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig import Fig  # noqa: E402
import dig  # noqa: E402


def main():
    spec = json.load(open(sys.argv[1]))
    mode = sys.argv[2]
    a, b, st, lo, hi = (int(v) for v in sys.argv[3:8])
    bx = spec["box"]
    f = Fig(spec["pdf"], spec["page"], spec["work"], tuple(bx), spec["xsel"], spec["xvals"], spec["ysel"],
            spec["yvals"], xlog=spec.get("xlog", False), ylog=spec.get("ylog", False),
            frac_v=spec.get("frac_v", 0.5), frac_h=spec.get("frac_h", 0.5))
    for v in range(a, b + 1, st):
        if mode == "cols":
            X = v - bx[0]
            rs = dig.column_runs(f.clean, X, lo - bx[1], hi - bx[1])
            items = []
            for s, e in rs:
                Y = 0.5 * (s + e)
                x, y = f.data(X, Y)
                items.append(f"{Y + bx[1]:.0f}({e - s + 1})[{y:.4f}]")
            x0, _ = f.data(X, (lo + hi) / 2 - bx[1])
            print(f"X={v} M~{x0:.3f}: " + " ".join(items))
        else:
            Y = v - bx[1]
            rs = dig.column_runs(f.clean.T, Y, lo - bx[0], hi - bx[0])
            items = []
            for s, e in rs:
                X = 0.5 * (s + e)
                x, y = f.data(X, Y)
                items.append(f"{X + bx[0]:.0f}({e - s + 1})[{x:.4f},{y:.4f}]")
            print(f"Y={v}: " + " ".join(items))


if __name__ == "__main__":
    main()
