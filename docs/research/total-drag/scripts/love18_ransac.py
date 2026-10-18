"""Robust reading of the two compiled curves of TN 3819 fig. 18 at given Mach numbers.
Uses the grid model of love18_trace.py. For each target M0: all thin dark runs (<170, <= 5 px,
off gridlines) in columns within +-0.14 of M0, inside a band around the expected curves, with the
symbols masked (boxes of +-0.035 M and +-0.0075 P_B around each symbol centre of my first reading and
of the audit's list). Then up to three quadratics P(M) are extracted by RANSAC (inlier tolerance
0.0008 in P_B), largest first; each is reported with its inlier count, M coverage and slope.
Curve identification is left to the reader, by slope and position against Gabeaud's line."""
import sys, json, random
import numpy as np
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
import importlib.util
spec = importlib.util.spec_from_file_location('t', sys.argv[0].rsplit('/', 1)[0] + '/love18_trace.py')
sys.argv = [sys.argv[0], sys.argv[1], '/dev/null'] + sys.argv[2:]
t = importlib.util.module_from_spec(spec)
spec.loader.exec_module(t)

symbols = [(1.503, -0.1807), (1.630, -0.1630), (1.500, -0.1522), (1.630, -0.1526), (1.935, -0.1492),
           (1.939, -0.1410), (2.009, -0.1380), (2.418, -0.1169), (2.414, -0.1135), (2.681, -0.1011),
           (3.243, -0.0926), (3.497, -0.0819)]

def candidates(M0, half=0.14):
    pts = []
    x_lo = int(t.x_of_M(max(1.01, M0 - half), 1400)) - 4
    x_hi = int(t.x_of_M(M0 + half, 1400)) + 4
    for x in range(x_lo, x_hi + 1):
        for r in t.runs(x):
            mp = t.to_MP(x, r)
            if not mp: continue
            M, P = mp
            if abs(M - M0) > half: continue
            exp = -0.25 / M if M > 1.2 else -0.19   # loose band centre
            if not (BAND[0] < P < BAND[1]): continue
            if any(((M - sm) / 0.060) ** 2 + ((P - sp) / 0.0062) ** 2 < 1 for sm, sp in symbols): continue
            pts.append((M, P))
    return pts

def ransac(pts, M0, tol=0.0008, iters=4000, seed=1):
    rnd = random.Random(seed)
    best = None
    P = np.array(pts)
    for _ in range(iters):
        s = rnd.sample(range(len(P)), 3)
        ms = P[s, 0] - M0; ps = P[s, 1]
        if np.ptp(ms) < 0.05: continue
        try:
            c = np.polyfit(ms, ps, 2)
        except Exception:
            continue
        if abs(c[0]) > 0.5: continue
        r = np.abs(P[:, 1] - np.polyval(c, P[:, 0] - M0))
        inl = r < tol
        if best is None or inl.sum() > best[1].sum():
            best = (c, inl)
    c, inl = best
    c = np.polyfit(P[inl, 0] - M0, P[inl, 1], 2)
    r = P[inl, 1] - np.polyval(c, P[inl, 0] - M0)
    return c, inl, float(np.std(r))

import os
BAND = tuple(float(v) for v in os.environ.get('BAND', '-0.21,-0.07').split(','))
out = {}
for M0 in [float(v) for v in sys.argv[3:]]:
    pts = candidates(M0)
    found = []
    rest = list(pts)
    for n in range(int(os.environ.get('NLINES', '3'))):
        if len(rest) < 12: break
        c, inl, sd = ransac(rest, M0)
        sel = np.array(rest)[inl]
        if inl.sum() < 10: break
        found.append(dict(P=float(c[-1]), slope=float(c[1]), n=int(inl.sum()), sd=sd,
                          Mmin=float(sel[:, 0].min()), Mmax=float(sel[:, 0].max())))
        rest = [p for p, k in zip(rest, inl) if not k]
    found.sort(key=lambda d: d['P'])
    out[M0] = found
    print('M0=%.3f  n_cand=%d  ' % (M0, len(pts)) + '  |  '.join('P=%.4f slope=%.3f n=%d sd=%.4f [%.2f,%.2f]' % (d['P'], d['slope'], d['n'], d['sd'], d['Mmin'], d['Mmax']) for d in found))
json.dump(out, open(os.environ.get('OUT', 'data/love18_ransac.json'), 'w'), indent=1)
