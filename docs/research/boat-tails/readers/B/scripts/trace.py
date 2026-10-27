"""Trace a plotted curve column by column and read it at given abscissae.

Usage: python3 -I trace.py SPEC.json PANEL OUTDIR NAME u_seed v_seed u_stop x1,x2,... [maxjump]
The trace starts at (u_seed, v_seed) and walks one column at a time towards
u_stop. In each column the darkness profile (grid lines removed) is searched
within +-4 px of the position predicted from the last two columns; the
darkness-weighted centroid of the nearest dark run is taken. Columns where
no dark run is found are left empty (gaps, e.g. under a symbol or label).
At each requested x the curve's row is taken from the traced column(s)
nearest that x (mean of the columns within +-1 px), and y follows from the
panel calibration. Writes OUTDIR/trace_<NAME>.json and an overlay PNG.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import figlib as fl  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402


def main():
    a = sys.argv[1:]
    spec = json.load(open(a[0]))
    pname, outdir, name = a[1], a[2], a[3]
    us, vs, ustop = float(a[4]), float(a[5]), int(a[6])
    xs = [float(t) for t in a[7].split(',')]
    maxjump = float(a[8]) if len(a) > 8 else 4.0
    img = fl.load_gray(spec['image'])
    cal = json.load(open(os.path.join(outdir, f"{spec['name']}_{pname}_cal.json")))
    pan = spec['panels'][pname]
    cal_box = (pan['uspan'][0], pan['vspan'][0], pan['uspan'][1], pan['vspan'][1])
    H, W = img.shape
    vv, uu = np.mgrid[0:H, 0:W]
    dark = 255.0 - img
    bg = np.percentile(dark, 30)
    dark = np.clip(dark - bg, 0, None)
    # subtract a model of each grid line (its median cross-profile along the
    # panel) so that a curve running along a grid line is not lost
    lo_u, hi_u = int(min(us, ustop)) - 5, int(max(us, ustop)) + 5
    pu0, pv0 = int(cal_box[0]), int(cal_box[1])
    pu1, pv1 = int(cal_box[2]), int(cal_box[3])
    sub = dark[:, lo_u:hi_u].copy()
    U = uu[:, lo_u:hi_u].astype(float)
    V = vv[:, lo_u:hi_u].astype(float)
    PU = uu[pv0:pv1, pu0:pu1].astype(float)
    PV = vv[pv0:pv1, pu0:pu1].astype(float)
    PD = dark[pv0:pv1, pu0:pu1]
    for kind, lines in (('h', cal['hl']), ('v', cal['vl'])):
        for L in lines:
            if kind == 'h':
                dP = PV - (L['a'] + L['b'] * PU)
                dS = V - (L['a'] + L['b'] * U)
            else:
                dP = PU - (L['a'] + L['b'] * PV)
                dS = U - (L['a'] + L['b'] * V)
            bins = np.arange(-4.5, 4.51, 0.25)
            prof = np.zeros(len(bins) - 1)
            for i in range(len(bins) - 1):
                m = (dP >= bins[i]) & (dP < bins[i + 1])
                prof[i] = np.median(PD[m]) if m.any() else 0.0
            m = (dS >= bins[0]) & (dS < bins[-1])
            idx = np.clip(((dS[m] - bins[0]) / 0.25).astype(int), 0, len(prof) - 1)
            sub[m] = sub[m] - prof[idx]
    sub = np.clip(sub, 0, None)
    step = 1 if ustop > us else -1
    pts = []
    vpred = vs
    slope = 0.0
    u = int(round(us))
    last = []
    while (u - ustop) * step <= 0:
        col = sub[:, u - lo_u]
        lo = int(round(vpred)) - 8
        hi = int(round(vpred)) + 9
        seg = col[lo:hi]
        if np.nanmax(seg) < 60:
            pts.append((u, None))
        else:
            s = np.nan_to_num(seg, nan=0.0)
            # runs above threshold
            on = s > 0.5 * np.nanmax(seg)
            runs = []
            k = 0
            while k < len(on):
                if on[k]:
                    j = k
                    while j + 1 < len(on) and on[j + 1]:
                        j += 1
                    w = s[k:j + 1]
                    c = lo + (np.arange(k, j + 1) * w).sum() / w.sum()
                    runs.append((c, j - k + 1))
                    k = j + 1
                else:
                    k += 1
            # nearest run to prediction
            c, wd = min(runs, key=lambda r: abs(r[0] - vpred))
            # a gridline-masked column may cut a run: accept only runs within maxjump
            if abs(c - vpred) <= maxjump and wd <= 8:
                pts.append((u, float(c)))
                last.append((u, c))
                last = last[-6:]
                if len(last) >= 3:
                    pu = np.array([p[0] for p in last])
                    pv = np.array([p[1] for p in last])
                    slope = np.polyfit(pu, pv, 1)[0]
                vpred = c + slope * step
            else:
                pts.append((u, None))
                vpred = vpred + slope * step
        u += step
    good = [(p[0], p[1]) for p in pts if p[1] is not None]
    res = []
    for x in xs:
        # find u where x(u, v) = x on the trace: scan good points
        best = None
        for pu, pv in good:
            xx, yy = fl.apply_xform(cal, pu, pv)
            d = abs(xx - x)
            if best is None or d < best[0]:
                best = (d, pu, pv)
        if best is None or best[0] > abs(cal['cx'][1]) * 1.5:
            res.append({'x': x, 'y': None, 'note': 'outside traced span'})
            continue
        pu0 = best[1]
        near = [(pu, pv) for pu, pv in good if abs(pu - pu0) <= 1]
        # local linear fit of v(u) over +-3 columns to place x exactly
        loc = [(pu, pv) for pu, pv in good if abs(pu - pu0) <= 3]
        if len(loc) >= 3:
            c1, c0 = np.polyfit([p[0] for p in loc], [p[1] for p in loc], 1)
            # solve x(u, c0 + c1 u) = x
            cx = cal['cx']
            uu_ = (x - cx[0] - cx[2] * c0) / (cx[1] + cx[2] * c1)
            vv_ = c0 + c1 * uu_
            spread = float(np.std([p[1] - (c0 + c1 * p[0]) for p in loc]))
        else:
            uu_ = pu0
            vv_ = float(np.mean([p[1] for p in near]))
            spread = 0.5
        xx, yy = fl.apply_xform(cal, uu_, vv_)
        res.append({'x': x, 'x_read': xx, 'y': yy, 'u': uu_, 'v': vv_, 'ncols': len(loc), 'spread_px': spread})
        print(f"{name}: x {x} -> u {uu_:.2f} v {vv_:.2f} x_read {xx:.4f} y {yy:.5f} (cols {len(loc)}, spread {spread:.2f} px)")
    ngap = sum(1 for p in pts if p[1] is None)
    print(f"{name}: traced {len(good)} columns, {ngap} gaps")
    json.dump({'name': name, 'panel': pname, 'trace': pts, 'reads': res}, open(os.path.join(outdir, f"trace_{spec['name']}_{name}.json"), 'w'))
    # overlay
    u0, u1 = int(min(us, ustop)) - 40, int(max(us, ustop)) + 40
    vlist = [p[1] for p in good]
    v0, v1 = int(min(vlist)) - 60, int(max(vlist)) + 60
    crop = Image.fromarray(img[v0:v1, u0:u1].astype(np.uint8)).convert('RGB')
    sc = 2
    crop = crop.resize(((u1 - u0) * sc, (v1 - v0) * sc), Image.NEAREST)
    d = ImageDraw.Draw(crop)
    for pu, pv in good[::4]:
        x_, y_ = (pu - u0 + 0.5) * sc, (pv - v0 + 0.5) * sc
        d.rectangle([x_ - 1, y_ - 1, x_ + 1, y_ + 1], fill=(255, 0, 0))
    for r in res:
        if r.get('y') is not None:
            x_, y_ = (r['u'] - u0 + 0.5) * sc, (r['v'] - v0 + 0.5) * sc
            d.ellipse([x_ - 6, y_ - 6, x_ + 6, y_ + 6], outline=(0, 0, 255))
    crop.save(os.path.join(outdir, f"trace_{spec['name']}_{name}.png"))


if __name__ == '__main__':
    main()
