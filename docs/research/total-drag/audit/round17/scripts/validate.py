"""Check the readings files against the brief's minimums.

usage: python3 -I validate.py C_DIR
For each curve: number of fixed-alpha rows (kind curve or box whose note does
not say column or turning point), the even alphas it spans and whether each
has a row within 0.13 deg, both ends present, an alpha 0 row present.
"""
import sys
import csv
import os
from collections import defaultdict

C = sys.argv[1]
bad = 0
for fig in ('a', 'b'):
    rows = [r for r in csv.reader(l for l in open(os.path.join(C, 'readings', 'a52e01_fig8%s.csv' % fig)) if not l.startswith('#'))][1:]
    by = defaultdict(list)
    for r in rows:
        cid = r[0].rsplit('-', 1)[0]
        by[cid].append(r)
    for cid, rs in by.items():
        ends = [r for r in rs if r[1] == 'curve_end']
        zero = [r for r in rs if r[1] == 'curve_at_zero']
        fixed = [r for r in rs if r[1] in ('curve', 'box') and 'column' not in r[12] and 'turning' not in r[12]]
        ys = [float(r[8]) for r in rs if r[1] in ('curve', 'box', 'curve_end')]
        lo, hi = min(ys), max(ys)
        missing = []
        for g in range(0, 17, 2):
            if lo - 0.05 <= g <= hi + 0.05 and g > 0:
                if not any(abs(float(r[8]) - g) <= 0.13 for r in rs if r[1] in ('curve', 'box')):
                    missing.append(g)
        ok = len(fixed) >= 8 and not missing and len(ends) == 2 and len(zero) >= 1
        if not ok:
            bad += 1
        print('%-6s %-14s fixed=%2d span=%5.2f..%5.2f ends=%d zero=%d missing_grid=%s %s' % (
            fig, cid, len(fixed), lo, hi, len(ends), len(zero), missing, '' if ok else '<-- CHECK'))
print('curves needing attention:', bad)
