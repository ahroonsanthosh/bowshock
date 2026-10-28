"""Calibrate the twelve panels of RM A52E01 fig. 8 (a) and (b) (480 dpi renders, 2x native 240 dpi).

usage: python3 -I cal_a52.py <render_dir> <out_json>
x = (Pb - P0)/q, grid every 0.1 from 0 (left frame) to -.8 (right frame), 9 lines;
y = nominal angle of attack, deg, grid every 2 from 0 (bottom frame) to 16 (top frame), 9 lines.
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib

rdir, outp = sys.argv[1], sys.argv[2]


def lin(a, b, n):
    return [a + (b - a) * k / (n - 1) for k in range(n)]


XV = [round(-0.1 * k, 1) for k in range(9)]
YV = [16 - 2 * k for k in range(9)]
P = {
    # name: (image, x0 px, x8 px, y16 px, y0 px)
    'a_M0.6': ('a52-29.png', 771, 1752, 636, 1645),
    'a_M0.7': ('a52-29.png', 2000, 2975, 638, 1648),
    'a_M0.8': ('a52-29.png', 3221, 4202, 640, 1652),
    'a_M0.9': ('a52-29.png', 772, 1750, 1900, 2907),
    'a_M0.925': ('a52-29.png', 1998, 2972, 1904, 2912),
    'a_M1.2-1.7': ('a52-29.png', 3218, 4199, 1904, 2916),
    'b_M0.6': ('a52-30.png', 770, 1757, 644, 1657),
    'b_M0.7': ('a52-30.png', 2007, 2991, 650, 1665),
    'b_M0.8': ('a52-30.png', 3237, 4224, 656, 1672),
    'b_M0.9': ('a52-30.png', 761, 1751, 1914, 2929),
    'b_M0.925': ('a52-30.png', 1997, 2985, 1922, 2937),
    'b_M1.2-1.7': ('a52-30.png', 3229, 4218, 1931, 2942),
}
res = {}
lines = []
cache = {}
for name, (img, x0, x8, y16, y0) in P.items():
    if img not in cache:
        cache[img] = calib.load_gray(os.path.join(rdir, img))
    g = cache[img]
    vx = lin(x0, x8, 9)
    hy = lin(y16, y0, 9)
    cal = calib.calibrate(g, vx, XV, hy, YV, (y16 + 8, y0 - 8), (x0 + 8, x8 - 8), half=10, band=30)
    out, st = calib.report(cal, XV, YV, name)
    lines += out
    res[name] = dict(img=img, cx=list(cal['cx']), cy=list(cal['cy']), stats=st,
                     vlines=[None if f is None else [f[0], f[1]] for f in cal['vfits']],
                     hlines=[None if f is None else [f[0], f[1]] for f in cal['hfits']], report=out)
print('\n'.join(lines))
json.dump(res, open(outp, 'w'), indent=1, default=float)
