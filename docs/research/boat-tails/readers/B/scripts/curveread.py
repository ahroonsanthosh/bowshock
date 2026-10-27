"""Read a drawn (possibly dashed) curve at chosen abscissae.

Usage: python3 -I curveread.py SPEC.json PANEL OUTDIR CURVE.json OUT.json
CURVE.json: {"name": ..., "guide": [[u, v], ...] (points picked by eye along
the curve, used only to pick the right stroke, never as values),
"stations": [x, ...], "extra": [[u, v, "label"], ...]}
For each station x the column u(x) is found; the nearest column within
+-6 px where the curve's stroke is present, and at least 3 px from a vertical grid line, (dashes leave gaps) is used, and
the darkness-weighted centre of the stroke in that column (grid lines
subtracted) gives v. The actual (x, y) of that column is reported, so a
station that falls in a dash gap is read at the nearest drawn column, never
interpolated. "extra" points (ends, cusps) are refined the same way at their
own column.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import figlib as fl  # noqa: E402
from colruns import gridline_model  # noqa: E402


def main():
    a = sys.argv[1:]
    spec = json.load(open(a[0]))
    pname, outdir = a[1], a[2]
    cur = json.load(open(a[3]))
    img = fl.load_gray(spec['image'])
    cal = json.load(open(os.path.join(outdir, f"{spec['name']}_{pname}_cal.json")))
    pan = spec['panels'][pname]
    box = (pan['uspan'][0], pan['vspan'][0], pan['uspan'][1], pan['vspan'][1])
    dark = 255.0 - img
    dark = np.clip(dark - np.percentile(dark, 30), 0, None)
    clean = np.clip(dark - gridline_model(dark, cal, box), 0, None)
    g = np.array(cur['guide'], float)
    order = np.argsort(g[:, 0])
    g = g[order]
    cx = cal['cx']

    def expected(u):
        return float(np.interp(u, g[:, 0], g[:, 1]))

    def slope(u):
        k = np.searchsorted(g[:, 0], u)
        k = min(max(k, 1), len(g) - 1)
        return (g[k, 1] - g[k - 1, 1]) / max(g[k, 0] - g[k - 1, 0], 1e-6)

    def read_col(ui):
        ve = expected(ui)
        win = 6 + 2.5 * abs(slope(ui))
        lo, hi = int(ve - win), int(ve + win) + 1
        col = clean[lo:hi, ui]
        if col.max() < 70:
            return None
        on = col > 0.35 * col.max()
        # run nearest the expected position
        runs = []
        k = 0
        while k < len(on):
            if on[k]:
                j = k
                while j + 1 < len(on) and on[j + 1]:
                    j += 1
                w = col[k:j + 1]
                c = lo + k + (np.arange(j - k + 1) * w).sum() / w.sum()
                runs.append((abs(c - ve), c, j - k + 1, w.max()))
                k = j + 1
            else:
                k += 1
        runs = [r for r in runs if r[3] >= 70]
        if not runs:
            return None
        r = min(runs)
        return r[1], r[2]

    res = []
    umin, umax = g[0, 0], g[-1, 0]
    for x in cur['stations']:
        vm = expected((x - cx[0]) / cx[1])
        ut = (x - cx[0] - cx[2] * vm) / cx[1]
        if ut < umin - 1 or ut > umax + 1:
            res.append({'station': x, 'y': None, 'note': 'outside the drawn span of the curve'})
            print(f"{cur['name']} x {x:.3f}: outside span")
            continue
        got = None
        for d in [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6]:
            ui = int(round(ut)) + d
            if any(abs(ui - (L['a'] + L['b'] * vm)) <= 3.0 for L in cal['vl']):
                continue  # keep clear of vertical grid lines
            r = read_col(ui)
            if r is not None:
                got = (ui, r[0], r[1], d)
                break
        if got is None:
            res.append({'station': x, 'y': None, 'note': 'no stroke within 4 px of the station'})
            print(f"{cur['name']} x {x:.3f}: no stroke")
            continue
        ui, vc, wd, d = got
        xx, yy = fl.apply_xform(cal, ui, vc)
        res.append({'station': x, 'u': ui, 'v': vc, 'x': xx, 'y': yy, 'run_px': wd, 'shift_px': d})
        print(f"{cur['name']} x {x:.3f}: u {ui} v {vc:.2f} (run {wd}px, shift {d}) -> x {xx:.4f} y {yy:+.5f}")
    for (u, v, lab) in cur.get('extra', []):
        ui = int(round(u))
        r = read_col(ui)
        if r is None:
            print(f"{cur['name']} {lab}: no stroke at u {ui}")
            continue
        xx, yy = fl.apply_xform(cal, ui, r[0])
        res.append({'station': lab, 'u': ui, 'v': r[0], 'x': xx, 'y': yy, 'run_px': r[1], 'shift_px': 0})
        print(f"{cur['name']} {lab}: u {ui} v {r[0]:.2f} (run {r[1]}px) -> x {xx:.4f} y {yy:+.5f}")
    json.dump(res, open(a[4], 'w'), indent=1)


if __name__ == '__main__':
    main()
