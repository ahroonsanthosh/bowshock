"""Calibrate the six panels of RM A51J11 figs. 14 and 15 (600 dpi renders).

usage: python3 -I cal_a51.py <render_dir> <out_json> <fig: 14|15>
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import calib

rdir, outp, fig = sys.argv[1], sys.argv[2], sys.argv[3]

def lin(a, b, n):
    return [a + (b - a) * k / (n - 1) for k in range(n)]

PANELS = {
    # fig 14: x = Mach 0.5..1.2 every 0.05 (15 lines); y = Pb 0 .. -1.2 every 0.2 (7 lines)
    'f14_top': dict(img='a51-36.png', vx=lin(1301, 3811, 15), vv=[round(0.5 + 0.05 * k, 2) for k in range(15)],
                    hy=lin(645, 1709, 7), hv=[round(-1.2 + 0.2 * k, 1) for k in range(7)],
                    vspan=(660, 1700), hspan=(1310, 3800),
                    vexcl={k: [(1330, 1700)] for k in range(1, 13)}),
    'f14_mid': dict(img='a51-36.png', vx=lin(1289, 3793, 15), vv=[round(0.5 + 0.05 * k, 2) for k in range(15)],
                    hy=lin(2061, 3131, 7), hv=[round(-1.2 + 0.2 * k, 1) for k in range(7)],
                    vspan=(2070, 3125), hspan=(1295, 3785)),
    'f14_bot': dict(img='a51-36.png', vx=lin(1277, 3779, 15), vv=[round(0.5 + 0.05 * k, 2) for k in range(15)],
                    hy=lin(3487, 4558, 7), hv=[round(-1.2 + 0.2 * k, 1) for k in range(7)],
                    vspan=(3495, 4550), hspan=(1285, 3770)),
}

SS = [round(0.1 * k, 1) for k in range(11)]
PB = [round(-1.2 + 0.2 * k, 1) for k in range(7)]
PANELS15 = {
    # fig 15: x = 2y/b 0..1.0 every 0.1 (11 lines); y = Pb -1.2..0 every 0.2 (7 lines)
    'f15_top': dict(img='a51-37.png', vx=lin(1493, 3376, 11), vv=SS, hy=lin(709, 1838, 7), hv=PB,
                    vspan=(715, 1830), hspan=(1500, 3370)),
    'f15_mid': dict(img='a51-37.png', vx=lin(1489, 3373, 11), vv=SS, hy=lin(2027, 3155, 7), hv=PB,
                    vspan=(2035, 3148), hspan=(1495, 3367)),
    'f15_bot': dict(img='a51-37.png', vx=lin(1483, 3369, 11), vv=SS, hy=lin(3343, 4467, 7), hv=PB,
                    vspan=(3350, 4460), hspan=(1490, 3362)),
}
if fig == '15':
    PANELS = PANELS15

res = {}
lines = []
for name, P in PANELS.items():
    g = calib.load_gray(os.path.join(rdir, P['img']))
    cal = calib.calibrate(g, P['vx'], P['vv'], P['hy'], P['hv'], P['vspan'], P['hspan'],
                          vexcl=P.get('vexcl'), hexcl=P.get('hexcl'))
    out, st = calib.report(cal, P['vv'], P['hv'], name)
    lines += out
    res[name] = dict(img=P['img'], cx=list(cal['cx']), cy=list(cal['cy']), stats=st,
                     vlines=[None if f is None else [f[0], f[1]] for f in cal['vfits']],
                     hlines=[None if f is None else [f[0], f[1]] for f in cal['hfits']],
                     report=out)
print('\n'.join(lines))
json.dump(res, open(outp, 'w'), indent=1, default=float)
