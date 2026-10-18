"""NACA TN 3819 fig. 18: the free-flight curve (Langley, R 30e6 to 35e6) near M 1.0 to 1.25, read with the grid
model of love18_trace.py. In each pixel column from M 1.00 to 1.26, thin dark runs (at most 5 px, off grid lines)
with P_B between -0.215 and -0.189 are listed; the compiled curves lie above -0.189 there. The leader arrow of the
legend crosses this band near M 1.06 to 1.10, so columns there with two runs are reported as ambiguous.
Usage: python3 -I love18_ff.py PAGE_IMAGE"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
img = sys.argv[1]
sys.argv = [sys.argv[0], img, '/dev/null']
import love18_trace as lt
out = []
x0 = int(round(lt.x_of_M(1.00, 1200))); x1 = int(round(lt.x_of_M(1.26, 1200)))
for x in range(x0, x1):
    vals = []
    for yc in lt.runs(x):
        mp = lt.to_MP(x, yc)
        if mp and -0.215 <= mp[1] <= -0.189:
            vals.append(mp)
    if vals:
        out.append((vals[0][0], [v[1] for v in vals]))
print('M       P_B of thin runs in the band (two values: curve and leader, or curve doubled)')
for M, ps in out[::3]:
    print('%.3f  %s' % (M, '  '.join('%.4f' % p for p in ps)))
single = [(M, ps[0]) for M, ps in out if len(ps) == 1]
import numpy as np
for lo, hi in ((1.00, 1.05), (1.05, 1.10), (1.10, 1.15), (1.15, 1.20), (1.20, 1.26)):
    v = [p for M, p in single if lo <= M < hi]
    if v:
        print('M %.2f to %.2f: single-run columns %d, P_B %.4f to %.4f' % (lo, hi, len(v), min(v), max(v)))
# Ratio to the compiled curves (audit table, curves at M 1.0 and 1.2, linear in between), free-flight values
# taken from the listing above: peak -0.2070 at M 1.057 (leader excluded), -0.1928 to -0.1934 at M 1.13 to 1.16,
# -0.1976 at M 1.205 to 1.224.
cur = lambda M, i: (-0.1896, -0.1849)[i] + (M - 1.0) / 0.2 * ((-0.1870, -0.1836)[i] - (-0.1896, -0.1849)[i])
for M, p in ((1.057, -0.2070), (1.149, -0.1928), (1.159, -0.1934), (1.214, -0.1976)):
    Mc = min(M, 1.2)
    print('free flight / curves at M %.3f: %.3f to %.3f' % (M, p / cur(Mc, 0), p / cur(Mc, 1)))
