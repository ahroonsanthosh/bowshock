"""The shape-ordering check of design record 0019 section 3.4.1 item 6, with the scope the coordinator
decided before it was computed (the dated note under item 6):

- the ordering: at the same Mach number, h/c aside, a section whose faces close in toward the base
  more has no more base drag (-Cp_b) than one that closes in less;
- RM A51J11 figs. 14 and 15: h/t 0.3 (faces closing about 2.1 deg) against 0.6 (1.0 deg) against
  1.0 (flat), every Mach number in the figures, both roughness states, each reading on its own
  (rounds 15-A and 15-B), at every Mach number (fig. 14) or station and Mach number (fig. 15) where
  that reading gives a value for both profiles; the profiles lie in separate panels of one figure,
  so a comparison is within one reading and one figure;
- RM A52E01 fig. 8: wing 3 (boattail 6.88 deg) against wing 4 (2.02 deg) at alpha 0, in every panel
  where both curves pass the three-reading rule (wing identity agreed, alpha 0 value set), each
  reading on its own; a pair with a curve that is any of wings 2, 3 and 4, or whose alpha 0 value
  does not pass, is listed as not testable;
- a contradiction is any reversal of any size within one reading; its size against that reading's
  summed errors is given as information only.

Run from the repository root: python3 -I docs/research/total-drag/audit/te-below-1.5/scripts/ordering_check.py
Writes docs/research/total-drag/audit/te-below-1.5/ordering-check.out.
"""
import csv

A = 'docs/research/total-drag/audit/'
OUT = A + 'te-below-1.5/ordering-check.out'
ANGLE = {'0.3': 2.1, '0.6': 1.0, '1.0': 0.0}
lines = []
contradictions = 0
compared = 0


def rows(path):
    with open(A + path, newline='') as f:
        return list(csv.DictReader(l for l in f if not l.startswith('#')))


def ht_of(series):
    for v in ('0.3', '0.6', '1.0'):
        if f'h/t = {v}' in series or f'h/t, {v}' in series:
            return v
    raise ValueError(series)


def compare(label, closed, flatter, d_closed, d_flatter, e_closed, e_flatter, key):
    """Base drag d = -Cp_b. A contradiction when the more closed-in profile has more drag."""
    global contradictions, compared
    compared += 1
    if d_closed > d_flatter:
        contradictions += 1
        size = d_closed - d_flatter
        lines.append(f'  CONTRADICTION {label} {key}: {closed} drag {d_closed:.4f} > {flatter} '
                     f'{d_flatter:.4f} by {size:.4f} (summed errors {e_closed + e_flatter:.4f}; '
                     f'{"within" if size <= e_closed + e_flatter else "beyond"} them)')


lines.append('RM A51J11: each reading on its own; drag = -P_b; h/t 0.3 (2.1 deg) <= 0.6 (1.0 deg) <= 1.0 (flat)')
for reader in ('A', 'B'):
    # fig. 14: by roughness and Mach number
    by = {}
    for r in rows(f'round15-{reader}/readings/a51j11_fig14.csv'):
        if r['kind'] not in ('curve', 'curve_end', 'box'):
            continue
        rough = 'without' if 'without' in r['series'].lower() else 'with'
        key = (rough, round(float(r['x']), 3))
        by.setdefault(key, {})[ht_of(r['series'])] = (-float(r['y']), float(r['y_err']), r['kind'])
    n0, c0 = compared, contradictions
    for key in sorted(by):
        v = by[key]
        for closed, flatter in (('0.3', '0.6'), ('0.6', '1.0'), ('0.3', '1.0')):
            if closed in v and flatter in v:
                compare(f'fig. 14 reader {reader}', f'h/t {closed}', f'h/t {flatter}', v[closed][0],
                        v[flatter][0], v[closed][1], v[flatter][1],
                        f'{key[0]} roughness, M {key[1]}' + (' (a box)' if 'box' in (v[closed][2], v[flatter][2]) else ''))
    lines.append(f' fig. 14 reader {reader}: {compared - n0} pairs compared, {contradictions - c0} contradictions')
    # fig. 15: by Mach number and station
    by = {}
    for r in rows(f'round15-{reader}/readings/a51j11_fig15.csv'):
        if r['kind'] not in ('curve', 'curve_end', 'box'):
            continue
        mach = float(r['series'].split('M')[-1].replace('=', '').strip())
        key = (mach, round(float(r['x']), 3))
        by.setdefault(key, {})[ht_of(r['series'])] = (-float(r['y']), float(r['y_err']), r['kind'])
    n0, c0 = compared, contradictions
    for key in sorted(by):
        v = by[key]
        for closed, flatter in (('0.3', '0.6'), ('0.6', '1.0'), ('0.3', '1.0')):
            if closed in v and flatter in v:
                compare(f'fig. 15 reader {reader}', f'h/t {closed}', f'h/t {flatter}', v[closed][0],
                        v[flatter][0], v[closed][1], v[flatter][1],
                        f'M {key[0]}, 2y/b {key[1]}' + (' (a box)' if 'box' in (v[closed][2], v[flatter][2]) else ''))
    lines.append(f' fig. 15 reader {reader}: {compared - n0} pairs compared, {contradictions - c0} contradictions')

lines.append('')
lines.append('RM A52E01 fig. 8: wing 3 (6.88 deg) against wing 4 (2.02 deg) at alpha 0, each reading on its own')


def alpha0(text):
    t = text.strip()
    if not t or t.startswith('no '):
        return None
    value, rest = t.split('+-')
    return float(value), float(rest.split()[0])


def wing_of(r):
    calls = [(r[f'{k}_wing'], r[f'{k}_wing_uncertain']) for k in 'ABC']
    named = [(w, u) for w, u in calls if w not in ('', 'none')]
    if len(named) >= 2 and len({w for w, _ in named}) == 1 and all(u != 'yes' for _, u in named):
        return named[0][0]
    return 'any'


n_a51, c_a51 = compared, contradictions
with open(A + 'pairing-2026-10-26-a52e01-three/identity_map.csv', newline='') as f:
    curves = list(csv.DictReader(f))
untestable = []
for figure in ('a52e01_fig8a', 'a52e01_fig8b'):
    panels = {}
    for r in (c for c in curves if c['figure'] == figure):
        machs = {r[f'{k}_mach'] for k in 'ABC' if r[f'{k}_mach']}
        mach = r['group'].replace('M=', '') if not r['group'].startswith('M=1') else '/'.join(sorted(machs))
        panels.setdefault(mach, []).append(r)
    for mach, cs in panels.items():
        set3 = [c for c in cs if wing_of(c) == '3' and c['alpha0_status'].startswith('TWO OR MORE')]
        set4 = [c for c in cs if wing_of(c) == '4' and c['alpha0_status'].startswith('TWO OR MORE')]
        if not set3 or not set4:
            why = ', '.join(f"{c['drawn_curve']} wing {wing_of(c)}, alpha 0 {c['alpha0_status'].split(' (')[0]}"
                            for c in cs)
            untestable.append(f'  {figure} M {mach}: not testable ({why})')
            continue
        for c3 in set3:
            for c4 in set4:
                for k in 'ABC':
                    v3, v4 = alpha0(c3[f'alpha0_{k}']), alpha0(c4[f'alpha0_{k}'])
                    if v3 and v4:
                        compare(f'{figure} reader {k}', 'wing 3', 'wing 4', -v3[0], -v4[0], v3[1], v4[1],
                                f"M {mach}, {c3['drawn_curve']} against {c4['drawn_curve']}")
lines.append(f' RM A52E01: {compared - n_a51} pairs compared, {contradictions - c_a51} contradictions')
lines.append(' panels not testable (a curve of any wing, or no alpha 0 value set):')
lines.extend(untestable)
lines.append('')
lines.append(f'All: {compared} pairs compared within single readings; {contradictions} contradictions.')
lines.append('Verdict: ' + ('the ordering is contradicted; the widening becomes two-sided (0019 3.4.1 item 6).'
                            if contradictions else 'no contradiction; the widening stays one-sided.'))
with open(OUT, 'w') as f:
    f.write('\n'.join(lines) + '\n')
print('\n'.join(lines[-6:]))
