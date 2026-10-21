"""Evaluate a tracked line at given Mach numbers: local quadratic fit of P_B
on M over +-h (default 0.02) around each, with the rms residual and the
count of points used.
usage: evaluate.py track.tsv h M1 M2 ...  (or a range: start:stop:step)"""
import sys
import numpy as np

L = [l.split('\t') for l in open(sys.argv[1]).read().splitlines()[1:]]
P = np.array([(float(f[1]), float(f[6])) for f in L if len(f) > 6 and f[6] != ''])
h = float(sys.argv[2])
ms = []
for a in sys.argv[3:]:
    if ':' in a:
        s, e, st = map(float, a.split(':'))
        ms += list(np.round(np.arange(s, e + st / 2, st), 4))
    else:
        ms.append(float(a))
print(f'# points {len(P)}, M {P[:, 0].min():.4f} to {P[:, 0].max():.4f}')
for m in ms:
    s = np.abs(P[:, 0] - m) <= h
    n = int(s.sum())
    if n < 4:
        print(f'{m:.3f}\tnone\t{n}')
        continue
    x, y = P[s, 0] - m, P[s, 1]
    c = np.polyfit(x, y, 2 if n >= 8 else 1)
    r = y - np.polyval(c, x)
    rms = float(np.sqrt((r ** 2).mean()))
    span = f'{x.min() + m:.3f}..{x.max() + m:.3f}'
    print(f'{m:.3f}\t{np.polyval(c, 0.0):.4f}\trms {rms:.4f}\tn {n}\t{span}')
