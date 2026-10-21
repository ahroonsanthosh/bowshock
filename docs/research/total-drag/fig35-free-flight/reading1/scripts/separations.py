"""Free-flight line minus estimates A and B at given Mach numbers (local fits as evaluate.py).
usage: separations.py ff.tsv a.tsv b.tsv h M1 M2 ..."""
import sys
import numpy as np


def load(path):
    L = [l.split('\t') for l in open(path).read().splitlines()[1:]]
    return np.array([(float(f[1]), float(f[6])) for f in L if len(f) > 6 and f[6] != ''])


def at(P, m, h):
    s = np.abs(P[:, 0] - m) <= h
    if s.sum() < 4:
        return None
    x, y = P[s, 0] - m, P[s, 1]
    return float(np.polyval(np.polyfit(x, y, 2 if s.sum() >= 8 else 1), 0.0))


ff, a, b = (load(p) for p in sys.argv[1:4])
h = float(sys.argv[4])
print('M\tFF\tA\tB\tFF-A\tFF-B')
for m in map(float, sys.argv[5:]):
    v = [at(P, m, h) for P in (ff, a, b)]
    f = lambda x: '' if x is None else f'{x:.4f}'
    d = lambda x: '' if x is None or v[0] is None else f'{v[0] - x:+.4f}'
    print(f'{m:.3f}\t{f(v[0])}\t{f(v[1])}\t{f(v[2])}\t{d(v[1])}\t{d(v[2])}')
