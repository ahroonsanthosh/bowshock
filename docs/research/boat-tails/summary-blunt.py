"""Summarise the blunt-nose boat-tail lane (docs/research/boat-tails/out-blunt/*.jsonl,
blunt-lane.test.ts) by the rule registered in design record 0023 section 2.6:
for each case and line marched from, the march on each grid's flow
extrapolated in intervals (the two finest, at second order, as table.py),
then over the grids at their observed order capped at 2 (the finest grid's
march, with the last change as its uncertainty, where the three grids do
not converge steadily); the reference is the mean over the lines, its
uncertainty the largest distance of a line's value from that mean plus the
largest extrapolation over the grids. Then the fitted family against it:
each grid's error, observed orders, the procedure's band on the finest
grid (as summary.py: order capped at 2, factor 1.25), whether it contains
the reference with its uncertainty, and the floor, relative to the value,
it would need to. Usage: python3 -I summary-blunt.py <out-blunt dir>"""
import glob
import json
import math
import os
import sys

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'out-blunt')


def order(a, b, c):
    e1, e2 = b - a, c - b
    if e1 == 0 or e2 == 0 or e1 * e2 < 0:
        return None
    return math.log(abs(e1 / e2)) / math.log(2)


for path in sorted(glob.glob(os.path.join(out, '*.jsonl'))):
    rows = [json.loads(line) for line in open(path) if line.strip()]
    name = os.path.basename(path)[:-6]
    fits = sorted((r for r in rows if r['kind'] == 'fit'), key=lambda r: r['refinement'])
    scans = [r for r in rows if r['kind'] == 'scan']
    print(f'== {name}')
    usable = [r for r in scans if r['usable']]
    if scans:
        print(f'  scan on nj = 20: {len(usable)} of {len(scans)} lines usable'
              + (f', x {usable[0]["x"]:.4f} to {usable[-1]["x"]:.4f}' if usable else ''))
    for f in fits:
        print(f'  nj {20 * f["refinement"]:4d}: tail {f["tail"]:.9f} nose {f["nose"]:.9f} steps {f["steps"]} '
              f'conv {f["converged"]} aspect {f["maxAspect"]:.1f} size {f["maxSizeRatio"]:.3f} '
              f'wall {f["minWallAngleDeg"]:.1f} failure {f["failure"]} {f["seconds"]:.0f}s')
    marches = {}
    for r in rows:
        if r['kind'] == 'moc':
            if 'error' in r:
                print(f'  march failed: nj {20 * r["refinement"]} line {r["line"]} {r["intervals"]}: {r["error"][:100]}')
                continue
            marches.setdefault(r['line'], {}).setdefault(r['refinement'], {})[r['intervals']] = r['tail']
    per_line = {}
    corrections = []
    for line, by_grid in sorted(marches.items()):
        values = {}
        for g, by_n in sorted(by_grid.items()):
            n = sorted(by_n)
            if len(n) < 2:
                continue
            b, c = by_n[n[-2]], by_n[n[-1]]
            values[g] = c + (c - b) / 3
        grids = sorted(values)
        text = ', '.join(f'nj {20 * g}: {values[g]:.9f}' for g in grids)
        if len(grids) >= 3:
            a, b, c = (values[g] for g in grids[-3:])
            p = order(a, b, c)
            if p is not None:
                p = min(p, 2)
                ref = c + (c - b) / (2 ** p - 1)
            else:
                ref = c
            corrections.append(abs(ref - c) if p is not None else abs(c - b))
            per_line[line] = ref
            print(f'  line {line}: march {text}; order {p if p is None else round(p, 2)}; extrapolated {ref:.9f}')
        elif grids:
            print(f'  line {line}: march {text} (fewer than three grids)')
    if not per_line or not fits:
        continue
    reference = sum(per_line.values()) / len(per_line)
    u = max(abs(v - reference) for v in per_line.values()) + max(corrections)
    print(f'  reference {reference:.9f} +- {u:.2e} ({u / reference:.2e} of it), from lines {sorted(per_line)}')
    vals = [f['tail'] for f in fits]
    for f in fits:
        print(f'  nj {20 * f["refinement"]:4d}: error {(f["tail"] / reference - 1) * 100:+.4f}%')
    orders = [order(*vals[k:k + 3]) for k in range(len(vals) - 2)]
    if orders:
        print('  observed orders', [o if o is None else round(o, 3) for o in orders])
    if len(vals) >= 3 and orders[-1] is not None:
        p = min(orders[-1], 2)
        e21 = vals[-2] - vals[-1]
        gci = 1.25 * abs(e21) / (2 ** p - 1)
        ext = vals[-1] - e21 / (2 ** p - 1)
        miss = abs(vals[-1] - reference) + u
        four = len(vals) >= 4 and orders[-2] is not None and abs(orders[-1] - orders[-2]) <= 0.5
        print(f'  band (finest, p {p:.2f}): {gci:.2e}; error plus the reference\'s uncertainty {miss:.2e}; '
              f'contains {gci >= miss}; floor needed {max(0.0, (miss - gci) / vals[-1]):.1e}; '
              f'extrapolated {ext:.9f} ({(ext / reference - 1) * 100:+.4f}%)'
              f'{"" if four else "; not yet four grids with agreeing orders"}')
