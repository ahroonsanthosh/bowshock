"""Summarise the round 6 reading csvs: per figure and series, the number of
readings, the x range and the range of the stated errors; with the axis
calibration (units per render px, gridlines used, straight-line residuals).

Usage: python3 -I summarize.py <readings dir> [prefix]
"""
import csv
import json
import os
import sys


def main():
    d = sys.argv[1]
    pre = sys.argv[2] if len(sys.argv) > 2 else ""
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".csv") or not fn.startswith(pre):
            continue
        rows = list(csv.DictReader(open(os.path.join(d, fn))))
        cal = os.path.join(d, fn.replace(".csv", "_cal.txt"))
        print(f"## {fn}")
        if os.path.exists(cal):
            c = json.load(open(cal))
            print(f"  cal: {int(c['nx'])} x-lines, {int(c['ny'])} y-lines; x/px {c['x_per_px']:.3g}, "
                  f"y/px {c['y_per_px']:.3g}; straight-line rms x {c['x_lin_rms']:.2g}, y {c['y_lin_rms']:.2g}; "
                  f"line-fit rms px x {c['x_line_rms_px']:.2f} y {c['y_line_rms_px']:.2f}")
        ser = {}
        for r in rows:
            ser.setdefault(r["series"], []).append(r)
        for s, rs in ser.items():
            ok = [r for r in rs if r["y"]]
            bad = [r["x"] for r in rs if not r["y"]]
            if ok:
                xs = [float(r["x"]) for r in ok]
                es = [float(r["err_y"]) for r in ok]
                print(f"  {s}: n={len(ok)} x {min(xs):g}..{max(xs):g} err {min(es):.4f}..{max(es):.4f}"
                      + (f"; not read at {','.join(bad)}" if bad else ""))
            else:
                print(f"  {s}: none read ({rs[0]['how']})")


if __name__ == "__main__":
    main()
