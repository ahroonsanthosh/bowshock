# usage: python3 -I d2p.py <cal.out.json> X Y [X Y ...]  -> pixel position of data points (inverse affine)
import sys, json
import numpy as np
c = json.load(open(sys.argv[1])); v = list(map(float, sys.argv[2:]))
A = np.array([[c['ax'][1], c['ax'][2]], [c['ay'][1], c['ay'][2]]])
for i in range(0, len(v), 2):
    p = np.linalg.solve(A, [v[i] - c['ax'][0], v[i + 1] - c['ay'][0]]); print(f"{v[i]} {v[i+1]} -> {p[0]:.1f} {p[1]:.1f}")
