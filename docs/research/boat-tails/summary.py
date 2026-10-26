"""Summarise the boat-tail lane's results (docs/research/boat-tails/out/*.jsonl):
for each case, the method of characteristics' boat-tail drag and its
extrapolation, linearised theory, and the fitted family's values, errors
against the characteristics, observed orders and the verification
procedure's band (0005, as src/verification/grid-convergence.ts: four grids,
orders of the two finest triples within 0.5, order capped at 2, GCI with
factor 1.25). Usage: python3 -I summary.py <out dir>"""
import glob
import json
import math
import os
import sys

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'out')


def order(a, b, c):
    e1, e2 = b - a, c - b
    if e1 == 0 or e2 == 0 or e1 * e2 < 0:
        return None
    return math.log(abs(e1 / e2)) / math.log(2)


for path in sorted(glob.glob(os.path.join(out, '*.jsonl'))):
    rows = [json.loads(line) for line in open(path) if line.strip()]
    name = os.path.basename(path)[:-6]
    moc = {r['intervals']: r['tail'] for r in rows if r['kind'] == 'moc' and 'tail' in r}
    errs = [r for r in rows if r['kind'] == 'moc' and 'error' in r]
    lin = next((r['tail'] for r in rows if r['kind'] == 'linear'), None)
    fits = sorted((r for r in rows if r['kind'] == 'fit'), key=lambda r: r['refinement'])
    print(f'== {name}')
    ref = None
    if len(moc) >= 3:
        n = sorted(moc)[-3:]
        a, b, c = (moc[k] for k in n)
        p = order(a, b, c)
        ref = c + (c - b) / 3
        print(f'  characteristics {n}: {a:.10f} {b:.10f} {c:.10f} order {p if p is None else round(p, 2)} '
              f'extrapolated {ref:.10f} (last within {abs(c - ref) / ref:.1e})')
    elif moc:
        print('  characteristics', moc)
    for e in errs:
        print('  characteristics failed:', e['intervals'], e['error'][:120])
    if lin is not None and ref:
        print(f'  linearised {lin:.6f} ({(lin / ref - 1) * 100:+.1f}%)')
    vals = [f['tail'] for f in fits]
    for f in fits:
        err = f'{(f["tail"] / ref - 1) * 100:+.4f}%' if ref else ''
        print(f'  nj {20 * f["refinement"]:4d}: tail {f["tail"]:.9f} {err} steps {f["steps"]} conv {f["converged"]} '
              f'aspect {f["maxAspect"]:.1f} size {f["maxSizeRatio"]:.3f} wall {f["minWallAngleDeg"]:.1f} '
              f'baseM {f["baseMach"]:.3f} failure {f["failure"]} {f["seconds"]:.0f}s')
    orders = [order(*vals[k:k + 3]) for k in range(len(vals) - 2)]
    if orders:
        print('  observed orders', [o if o is None else round(o, 3) for o in orders])
    if len(vals) >= 3 and orders[-1] is not None:
        p = min(orders[-1], 2)
        e21 = vals[-2] - vals[-1]
        gci = 1.25 * abs(e21) / (2 ** p - 1)
        ext = vals[-1] - e21 / (2 ** p - 1)
        actual = abs(vals[-1] - ref) if ref else float('nan')
        verified = len(vals) >= 4 and orders[-2] is not None and abs(orders[-1] - orders[-2]) <= 0.5
        print(f'  band (finest, p {p:.2f}): {gci:.2e} ({gci / vals[-1]:.2e} of the value); actual error {actual:.2e}; '
              f'contains {gci >= actual}; extrapolated {ext:.9f} ({(ext / ref - 1) * 100 if ref else float("nan"):+.4f}%)'
              f'{"" if verified else "; not yet four grids with agreeing orders"}')
