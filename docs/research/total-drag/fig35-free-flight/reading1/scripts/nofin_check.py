"""Calibration check: fig. 35's no-fin curve (tracked) against fig. 18's basic curve
(src/base/tn3819-fig18.ts, lessNegative), which it reproduces within 0.001 (0008 section 3.4).
usage: nofin_check.py track.tsv          (prints the guide when called with --guide)"""
import sys
import numpy as np

ROWS = [(1.0, -0.1849), (1.2, -0.1836), (1.4, -0.1796), (1.5, -0.1733), (1.6, -0.1683),
        (1.8, -0.1569), (2.0, -0.1447), (2.2, -0.1331), (2.4, -0.1224), (2.5, -0.1172),
        (2.6, -0.1124), (2.8, -0.1039), (3.0, -0.0964), (3.2, -0.0894), (3.4, -0.0834)]
if sys.argv[1] == '--guide':
    print(' '.join(f'{320 + (m - 1) * 1600:.0f},{320 + (p + 0.36) * 8000:.1f}' for m, p in ROWS))
    sys.exit()
L = [l.split('\t') for l in open(sys.argv[1]).read().splitlines()[1:]]
P = np.array([(float(f[1]), float(f[6])) for f in L if len(f) > 6 and f[6] != ''])
for m, p in ROWS[:-1]:
    s = np.abs(P[:, 0] - m) <= 0.03
    if s.sum() < 3:
        print(m, 'none')
        continue
    c = np.polyfit(P[s, 0] - m, P[s, 1], 1)
    print(f'M {m}: fig. 35 no-fin {c[-1]:.4f}  fig. 18 basic {p:.4f}  diff {c[-1] - p:+.4f}  n={s.sum()}')
