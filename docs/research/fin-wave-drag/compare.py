"""Summaries quoted in docs/design/0009-fin-wave-drag.md, from the recorded
outputs in runs/ and hayes_study.jsonl. Run from this folder:
  python3 -I compare.py"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def rows(name):
    with open(os.path.join(HERE, name)) as f:
        return [json.loads(line) for line in f if line.strip()]


table = rows('runs/table.jsonl')
area_rule = {(r['case'], r['mach']): r['areaRule'] for r in table}

print('1. The audit\'s hayes_fin.py (m = 1, 2, 4) against the area rule of tests/fins/support:')
by_m = {}
for r in rows('hayes_study.jsonl'):
    by_m.setdefault(r['m'], []).append(r['ratio'] / area_rule[(r['case'], r['mach'])] - 1)
for m, d in sorted(by_m.items()):
    print('   m = %d: %d cases, %+.2e to %+.2e, mean magnitude %.1e'
          % (m, len(d), min(d), max(d), sum(abs(x) for x in d) / len(d)))

print('2. Largest error of the ratio against the area rule, by points per piece:')
for name, label in (('runs/convergence.jsonl', 'split at the Mach cones'),
                    ('runs/convergence-unsplit.jsonl', "finwave.py's integration")):
    worst = {}
    cases = set()
    for r in rows(name):
        cases.add((r['case'], r['mach']))
        worst[r['n']] = max(worst.get(r['n'], 0), abs(r['rel']))
    print('   %s (%d cases): %s' % (label, len(cases),
                                     ', '.join('n %d: %.1e' % kv for kv in sorted(worst.items()))))

print('3. The quadrature error estimate (n = 24 against n = 16) against the error at n = 24:')
by_case = {}
for r in rows('runs/convergence.jsonl'):
    by_case.setdefault((r['case'], r['mach']), {})[r['n']] = r
short_raw = []
short_floored = []
for key, v in sorted(by_case.items()):
    ratio = v[24]['ratio']
    raw = abs(ratio - v[16]['ratio'])
    err = abs(ratio - v[24]['areaRule'])
    if raw < err:
        short_raw.append((key, raw, err))
    if max(raw, 2e-7 * abs(ratio)) < err:
        short_floored.append((key, raw, err))
print('   %d cases; short without the floor: %d, all with both below 2e-7: %s; short with it: %d'
      % (len(by_case), len(short_raw), all(raw < 2e-7 and err < 2e-7 for _, raw, err in short_raw),
         len(short_floored)))
for key, raw, err in short_raw:
    print('     %s M %s: estimate %.1e, error %.1e' % (key[0], key[1], raw, err))

print('4. Largest error by points per piece, split at the Mach cones, by leading edge:')
machParameter = {(r['case'], r['mach']): r['B'] for r in table}
machParameter[('S105', 2)] = 1.05
machParameter[('S095', 2)] = 0.95
kinds = {}
for key, v in by_case.items():
    b = machParameter[key]  # None: unswept (infinite)
    kind = 'subsonic, beta cot(LE) <= 1' if b is not None and b <= 1 else 'supersonic'
    for n, r in v.items():
        worst = kinds.setdefault(kind, {})
        worst[n] = max(worst.get(n, 0), abs(r['rel']))
for kind, worst in sorted(kinds.items()):
    print('   %s: %s' % (kind, ', '.join('n %d: %.1e' % kv for kv in sorted(worst.items()))))

print('5. Planar Euler section drag on nested grids, over shock-expansion theory:')
import math  # noqa: E402

euler = rows('runs/euler.jsonl')
for case in ('dw', 'hex'):
    head = next(r for r in euler if r['case'] == case and 'level' not in r)
    levels = {}
    for r in euler:
        if r['case'] == case and 'level' in r:
            levels[r['level']] = r  # the last run of each level
    se = head['shockExpansion']
    print('   %s, Mach %s: shock-expansion %.7f (exact: %s, first reflection %.2f), Ackeret %+.3f%%'
          % (case, head['mach'], se, head['exact'], head['firstReflection'],
             100 * (head['ackeret'] / se - 1)))
    for lv in sorted(levels):
        r = levels[lv]
        print('     level %d, %d x %d: %+.4f%% (%d iterations, residual %.0e)'
              % (lv, r['ni'], r['nj'], 100 * r['overSE'], r['iterations'], r['residual']))
    lvs = sorted(levels)
    for a in range(len(lvs) - 2):
        c0, c1, c2 = (levels[lvs[a + k]]['cd'] for k in range(3))
        p = math.log((c1 - c0) / (c2 - c1)) / math.log(2)
        for q, label in ((p, 'observed order %.2f' % p), (1.0, 'order 1'), (2.0, 'order 2')):
            extrapolated = c2 + (c2 - c1) / (2 ** q - 1)
            print('     levels %d to %d, %s: extrapolated %+.3f%%'
                  % (lvs[a], lvs[a + 2], label, 100 * (extrapolated / se - 1)))
