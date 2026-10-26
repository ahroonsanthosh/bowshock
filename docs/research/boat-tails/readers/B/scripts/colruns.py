"""List the dark runs crossed by a vertical line at given abscissae (grid lines removed).

Usage: python3 -I colruns.py SPEC.json PANEL OUTDIR v0 v1 x1,x2,... [halfwidth]
For each x, the column u(x) (from the panel calibration, at the middle of
v0..v1) is examined: darkness is averaged over u +- halfwidth columns
(default 1, i.e. 3 columns), a model of every grid line is subtracted, and
runs of darkness above a threshold are reported with their darkness-weighted
centre v, their extent, and the calibrated (x, y) of the centre. The caller
assigns runs to curves by eye.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import figlib as fl  # noqa: E402


def gridline_model(dark, cal, box):
    pu0, pv0, pu1, pv1 = box
    H, W = dark.shape
    vv, uu = np.mgrid[0:H, 0:W]
    PU = uu[pv0:pv1, pu0:pu1].astype(float)
    PV = vv[pv0:pv1, pu0:pu1].astype(float)
    PD = dark[pv0:pv1, pu0:pu1]
    model = np.zeros_like(dark)
    for kind, lines in (('h', cal['hl']), ('v', cal['vl'])):
        for L in lines:
            if kind == 'h':
                dP = PV - (L['a'] + L['b'] * PU)
                dS = vv - (L['a'] + L['b'] * uu)
            else:
                dP = PU - (L['a'] + L['b'] * PV)
                dS = uu - (L['a'] + L['b'] * vv)
            bins = np.arange(-4.5, 4.51, 0.25)
            prof = np.zeros(len(bins) - 1)
            for i in range(len(bins) - 1):
                m = (dP >= bins[i]) & (dP < bins[i + 1])
                prof[i] = np.median(PD[m]) if m.any() else 0.0
            m = (dS >= bins[0]) & (dS < bins[-1])
            idx = np.clip(((dS[m] - bins[0]) / 0.25).astype(int), 0, len(prof) - 1)
            model[m] = np.maximum(model[m], prof[idx])
    return model


def main():
    a = sys.argv[1:]
    spec = json.load(open(a[0]))
    pname, outdir = a[1], a[2]
    v0, v1 = int(a[3]), int(a[4])
    xs = [float(t) for t in a[5].split(',')]
    hw = int(a[6]) if len(a) > 6 else 1
    img = fl.load_gray(spec['image'])
    cal = json.load(open(os.path.join(outdir, f"{spec['name']}_{pname}_cal.json")))
    pan = spec['panels'][pname]
    box = (pan['uspan'][0], pan['vspan'][0], pan['uspan'][1], pan['vspan'][1])
    dark = 255.0 - img
    dark = np.clip(dark - np.percentile(dark, 30), 0, None)
    clean = np.clip(dark - gridline_model(dark, cal, box), 0, None)
    cx = cal['cx']
    vm = 0.5 * (v0 + v1)
    for x in xs:
        u = (x - cx[0] - cx[2] * vm) / cx[1]
        ui = int(round(u))
        col = clean[v0:v1, ui - hw:ui + hw + 1].mean(axis=1)
        on = col > 45
        runs = []
        k = 0
        while k < len(on):
            if on[k]:
                j = k
                while j + 1 < len(on) and on[j + 1]:
                    j += 1
                w = col[k:j + 1]
                c = v0 + k + (np.arange(j - k + 1) * w).sum() / w.sum()
                runs.append((c, v0 + k, v0 + j, w.max()))
                k = j + 1
            else:
                k += 1
        desc = []
        for c, lo, hi, pk in runs:
            xx, yy = fl.apply_xform(cal, ui, c)
            desc.append(f"v {c:7.2f} [{lo}-{hi}] pk {pk:4.0f} -> x {xx:.4f} y {yy:+.5f}")
        print(f"x {x:.3f} (u {ui}): " + (" | ".join(desc) if desc else "no run"))


if __name__ == '__main__':
    main()
