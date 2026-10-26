"""Fit the centre of a partly hidden circle from the visible part of its ring.

Usage: python3 -I arcfit.py IMG CAL.json u0 v0 r half OUT.png [excl] [keep]
  excl: other symbols' rings to remove, "u,v,r;u,v,r" (pixels within 3 px of
        those rings are ignored)
  keep: optional angular sector(s) of the sought ring to use, in degrees
        measured from +u towards +v, "a0-a1;a2-a3" (default: all)
Dark pixels (grey < 150) within the window, not on a grid line (2.2 px) and
not on an excluded ring, and within 4 px of the trial ring, are fitted by
least squares to a circle of fixed radius r (iterated, robust). The
uncertainty is the standard error of the centre from the residuals.
"""
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert('L')).astype(float)
    cal = json.load(open(a[1]))
    u0, v0, r, half = float(a[2]), float(a[3]), float(a[4]), int(a[5])
    out = a[6]
    excl = []
    if len(a) > 7 and a[7] not in ('', '-'):
        excl = [tuple(float(t) for t in s.split(',')) for s in a[7].split(';')]
    keep = None
    if len(a) > 8 and a[8] not in ('', '-'):
        keep = [tuple(float(t) for t in s.split('-')) for s in a[8].split(';')]
    U0, V0 = int(u0) - half, int(v0) - half
    sub = img[V0:V0 + 2 * half, U0:U0 + 2 * half]
    vv, uu = np.mgrid[0:sub.shape[0], 0:sub.shape[1]]
    uu = uu + U0
    vv = vv + V0
    m = sub < 150
    for h in cal['hl']:
        m &= np.abs(vv - (h['a'] + h['b'] * uu)) > 2.2
    for v in cal['vl']:
        m &= np.abs(uu - (v['a'] + v['b'] * vv)) > 2.2
    for (eu, ev, er) in excl:
        m &= np.abs(np.hypot(uu - eu, vv - ev) - er) > 3.0
    pu, pv = uu[m].astype(float), vv[m].astype(float)
    c = np.array([u0, v0])
    for it in range(30):
        d = np.hypot(pu - c[0], pv - c[1])
        sel = np.abs(d - r) < 4.0
        if keep is not None:
            ang = np.degrees(np.arctan2(pv - c[1], pu - c[0])) % 360
            ks = np.zeros_like(sel)
            for k0, k1 in keep:
                ks |= (ang >= k0) & (ang <= k1)
            sel &= ks
        if sel.sum() < 10:
            break
        x, y = pu[sel], pv[sel]
        dd = np.hypot(x - c[0], y - c[1])
        res = dd - r
        # Gauss-Newton step for centre with fixed radius
        J = np.vstack([-(x - c[0]) / dd, -(y - c[1]) / dd]).T
        step, *_ = np.linalg.lstsq(J, -res, rcond=None)
        c = c + step
        if np.hypot(*step) < 1e-3:
            break
    d = np.hypot(x - c[0], y - c[1])
    res = d - r
    J = np.vstack([-(x - c[0]) / d, -(y - c[1]) / d]).T
    s2 = (res ** 2).sum() / max(len(res) - 2, 1)
    cov = s2 * np.linalg.inv(J.T @ J)
    ang = np.degrees(np.arctan2(y - c[1], x - c[0])) % 360
    hist = np.histogram(ang, bins=12, range=(0, 360))[0]
    print(json.dumps({'u': float(c[0]), 'v': float(c[1]), 'su': float(math.sqrt(cov[0, 0])), 'sv': float(math.sqrt(cov[1, 1])),
                      'n': int(len(x)), 'rms': float(np.sqrt(np.mean(res ** 2))), 'sectors30': hist.tolist()}))
    sc = 6
    im = Image.fromarray(sub.astype(np.uint8)).convert('RGB').resize((sub.shape[1] * sc, sub.shape[0] * sc), Image.NEAREST)
    dr = ImageDraw.Draw(im)
    for xx, yy in zip(x, y):
        dr.point(((xx - U0 + 0.5) * sc, (yy - V0 + 0.5) * sc), fill=(0, 200, 0))
    for k in range(90):
        t = 2 * math.pi * k / 90
        dr.point(((c[0] + r * math.cos(t) - U0 + 0.5) * sc, (c[1] + r * math.sin(t) - V0 + 0.5) * sc), fill=(255, 0, 0))
    im.save(out)


if __name__ == '__main__':
    main()
