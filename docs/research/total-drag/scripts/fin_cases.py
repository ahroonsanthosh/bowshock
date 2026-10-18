import math, sys, json
sys.path.insert(0, '.')
from finwave import Fin, drag, double_wedge
tc = 0.05
hexs = ([0.0, 0.15, 0.85, 1.0], [0.0, tc/2, tc/2, 0.0])
cases = {
 'A ARCAS (TN D-4014 fig 1b): cr 3.38, s 2.103, LE 30 deg, TE 0, ridge 0.536': (3.38, 2.103, math.tan(math.radians(30)), 0.0, double_wedge(tc, 0.536)),
 'B clipped delta: cr 1, s 0.5, LE 45 deg, TE 0, taper 0.5, double wedge': (1.0, 0.5, 1.0, 0.0, double_wedge(tc)),
 'C trapezoid: cr 1, s 1, LE 26.6 deg, TE 0, taper 0.5, double wedge': (1.0, 1.0, 0.5, 0.0, double_wedge(tc)),
 'C-hex same planform, hexagonal 15% bevels': (1.0, 1.0, 0.5, 0.0, hexs),
 'D rectangle: c 1, s 1, double wedge': (1.0, 1.0, 0.0, 0.0, double_wedge(tc)),
 'E swept TE: cr 1, s 0.75, LE 45, TE 16.7 deg, taper 0.475': (1.0, 0.75, 1.0, 0.3, double_wedge(tc)),
 'F A53D02-like planform: cr 0.75, s 0.125, LE 71.6 deg, TE 0, double wedge (not its section)': (0.75, 0.125, 3.0, 0.0, double_wedge(tc)),
 'G clipped delta: cr 1, s 1, LE 36.9 deg, TE 0, taper 0.25': (1.0, 1.0, 0.75, 0.0, double_wedge(tc)),
}
res = {}
for name, (cr, s, tl, tt, (f, g)) in cases.items():
    fin = Fin(cr, s, tl, tt, f, g)
    row = []
    for M in (1.2, 1.5, 2.0, 2.5, 3.0):
        cd3, cd2, sec = drag(fin, M, ny=24, nx=24, neta=24)
        beta = math.sqrt(M*M-1)
        mle = beta / tl if tl > 0 else float('inf')   # beta*cot(LE): >1 supersonic leading edge
        row.append((M, cd3/cd2, mle))
    res[name] = row
    print(name)
    print('   ' + '  '.join('M%.1f: %.3f (bcotL=%.2f)' % r for r in row), flush=True)
json.dump(res, open('../data/fin_linear_theory_results.json', 'w'), indent=1)
