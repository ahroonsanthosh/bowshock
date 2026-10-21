"""NASA CR-149372 figs. 8b and 5 and RM A55H31 figs. 11 and 12: the first
readings (w34_fin_edges.py) paired with the independent reader's blind
second readings (audit round 6: commit fc66a2f, cr149372_fig8b.csv and
cr149372_fig5.csv; commit 6e6d9be, rma55h31_fig11.csv and rma55h31_fig12.csv;
docs/research/total-drag/audit/round6/readings/).

Usage (from the repository root):
  python3 -I docs/research/total-drag/scripts/w34_pair_round6.py <round-6 readings dir> [<round-7 readings dir>]

With the round-7 directory (commit 47f32ec, the blind re-read of fig. 8b's M 1.2 curve), its
points are paired with the first reading the same way, over 0 to 90 deg and over 22 to 65 deg.

Fig. 8b: each second-reading point at 0 to 90 deg (the faired curve every 5
deg, and the symbols) against the first reading interpolated there, with
the combined reading error (the first's 0.005 in Cp on the curve, the
second's err_y, plus the local slope times 0.3 deg and the second's x
error, 0.1 deg on its curve reads); a point more than 0.3 from the first
reading is a stray detection (a legend symbol, an axis label) and is
listed, not used; points that disagree beyond the combined error are
listed by series and angle. The second reading's front side is the
first's plus the integral of the difference, interpolated between the
second's points. Prints markdown tables and the points to hold."""

import csv
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from w34_fin_edges import (A55_FIG11, A55_FIG12, A55_TABLE2, M5_BRANCHES, M5_COMMON_CURVE,  # noqa: E402
                           M5_COMMON_SYMBOLS, M8B_CURVE, M8B_SYMBOLS, cp0, front, front90, p0_over_p)

# Misreads shown by the scan, left out (0016 sections 14 and 16): the second reading's M 1.2
# faired curve at 25 to 60 deg runs on the M 1.1 line, its path passing a "triangle" it found at
# 30.7 deg, Cp 0.890, on the M 1.1 curve (a third look shows the triangle at 34 deg, 0.91, on the
# third line); the "90" axis label read as a circle at 86.5 deg, Cp -0.084 (M 1.0). Points outside
# the combined error that are not shown to be misreads are kept (0016 section 16).
LEFT_OUT = {(1.2, t) for t in (25, 30, 35, 40, 55, 60)} | {(1.2, 30.74)}
LABELS = {(1.0, 86.53, -0.0843)}


def interp(pts, t):
    if t <= pts[0][0]:
        return pts[0][1]
    for (a, pa), (b, pb) in zip(pts, pts[1:]):
        if a <= t <= b:
            return pa + (pb - pa) * (t - a) / (b - a) if b > a else pa
    return pts[-1][1]


def by_difference(p1, sec):
    """First reading's front side plus the integral of the interpolated difference."""
    f1 = front90(p1)
    d = [(t, y - interp(p1, t)) for t, y in sec]
    grid = [k * 0.5 for k in range(181)]
    return f1, f1 + front([(t, interp(d, t)) for t in grid])


def xerr(how):
    return float(how.split('x err ')[1].split(';')[0]) if 'x err ' in how else 0.1


def main():
    d = sys.argv[1]
    rows8 = list(csv.DictReader(open(os.path.join(d, 'cr149372_fig8b.csv'))))
    say = print
    say('## Fig. 8b')
    say('')
    say('| M | Second-reading points used | Mean difference | Largest | Combined error | Within it | Left out | '
        'kappa, first | second | envelope |')
    say('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    held = {}
    for m, key in ((1.0, 'M 1.0'), (1.1, 'M 1.1'), (1.2, 'M 1.2')):
        p1 = sorted(M8B_SYMBOLS[m] + M8B_CURVE[m])
        sec = []
        stray = []
        left = []
        for r in rows8:
            if not r['y'] or not (r['series'].startswith(f'{key} faired') or r['series'].startswith(f'M={m}')):
                continue
            t, y = abs(float(r['x'])), float(r['y'])
            if t > 90.5:
                continue
            if (m, round(t, 2), round(y, 4)) in LABELS:
                stray.append((t, y))
                continue
            if (m, round(t, 2)) in LEFT_OUT or (m, t) in LEFT_OUT:
                left.append((t, y))
                continue
            e = 0.005 + float(r['err_y']) + abs(interp(p1, t + 1) - interp(p1, t - 1)) / 2 * (0.3 + xerr(r['how']))
            sec.append((t, y, e, 'curve' if 'faired' in r['series'] else 'symbol'))
        sec.sort()
        diffs = [(t, y - interp(p1, t), e) for t, y, e, _ in sec]
        used = sec
        within = sum(1 for _, dd, e in diffs if abs(dd) <= e)
        big = max(diffs, key=lambda x: abs(x[1]))
        mean = sum(x[1] for x in diffs) / len(diffs)
        f1, f2 = by_difference(p1, [(t, y) for t, y, _, _ in used])
        mn = 2 / 3 * cp0(m)
        held[m] = [(t, y, k) for t, y, _, k in used]
        say(f'| {m} | {len(sec)} | {mean:+.4f} | {big[1]:+.3f} at {big[0]:.0f} deg | '
            f'{sum(x[2] for x in diffs) / len(diffs):.3f} | {within} of {len(sec)} | '
            f'{len(left)} (M 1.2 curve on the M 1.1 line), {len(stray)} stray | {f1 / mn:.4f} | {f2 / mn:.4f} | '
            f'{min(f1, f2) / mn:.4f} to {max(f1, f2) / mn:.4f} |')
        outside = [(round(t, 1), round(dd, 3)) for t, dd, e in diffs if abs(dd) > e]
        say(f'|   | outside: {outside} | stray: {[(round(t, 1), y) for t, y in stray]} | | | | | | | |')
    say('')
    say('## Fig. 5 (M 1.0), second reading, by the difference from the first')
    rows5 = list(csv.DictReader(open(os.path.join(d, 'cr149372_fig5.csv'))))
    shared1 = sorted(M5_COMMON_CURVE + M5_COMMON_SYMBOLS)
    sh = []
    br = {'2.54': [], '3.81': [], '5.08': [], '1.91': []}
    left5 = []
    for r in rows5:
        if not r['y']:
            continue
        t, y = float(r['x']), float(r['y'])
        if t > 90.5:
            continue
        if t <= 78:
            e = 0.01 + float(r['err_y']) + abs(interp(shared1, t + 1) - interp(shared1, t - 1)) / 2 * (0.5 + xerr(r['how']))
            # the "60" axis label, read as symbols near Cp 0 (a misread): left out
            if t >= 44 and 58 <= t <= 66 and abs(y) < 0.03 and abs(y - interp(shared1, t)) > e:
                left5.append((round(t, 2), y))
                continue
            sh.append((t, y))
        elif t >= 88:
            for k in br:
                if r['series'].startswith(k):
                    br[k].append((t, y))
    say(f'- left out of the shared curve (the "60" axis label): {left5}')
    dsh = [(t, y - interp(shared1, t)) for t, y in sorted(sh) if t >= 44]
    say(f'- shared curve (44 to 78 deg, names irrelevant): {len(dsh)} points, mean difference '
        f'{sum(x for _, x in dsh) / len(dsh):+.4f}, largest {max((x for _, x in dsh), key=abs):+.3f}')
    for k, pts in br.items():
        if not pts:
            continue
        first = M5_BRANCHES['1.91 and 2.54 cm (curve)' if k in ('1.91', '2.54') else f'{k} cm']
        say(f'- {k} cm above 88 deg: {[(t, y, round(y - interp(sorted(first), t), 3)) for t, y in pts]}')
    # the spread on the second reading: fig. 8b's M 1.0 second reading below 44 deg, fig. 5's
    # shared curve and branches, each shifted by the second reading's differences
    own1 = front90(sorted(M8B_SYMBOLS[1.0] + M8B_CURVE[1.0]))
    own2 = by_difference(sorted(M8B_SYMBOLS[1.0] + M8B_CURVE[1.0]), [(t, y) for t, y, _ in held[1.0]])[1]
    below = [q for q in sorted(M8B_SYMBOLS[1.0] + M8B_CURVE[1.0]) if q[0] < 44.0]
    shared = [q for q in shared1 if q[0] <= 78]
    dsh_all = dsh
    for name, pts in M5_BRANCHES.items():
        p1 = sorted(below + shared + pts)
        f1 = front90(p1)
        sec2 = [(t, y) for t, y, _ in held[1.0] if t < 44.0] + [(t, interp(p1, t) + dd) for t, dd in dsh_all]
        key = '2.54' if '2.54' in name else name.split(' ')[0]
        sec2 += br.get(key, [])
        f2 = by_difference(p1, sorted(sec2))[1]
        say(f'- {name}: change from fig. 8b, first {f1 / own1 - 1:+.4f}, second {f2 / own2 - 1:+.4f}')
    say('')
    say('## RM A55H31 figs. 11 and 12: the pairs, and r on each reading (exact gauge conversion)')
    say('')
    say('| Point | Fig. 12, first | Second | dyaw (comb.) | dratio (comb.) | Fig. 11, first | Second | '
        'dvalue (comb.) | r, first | r, second |')
    say('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    r12 = list(csv.DictReader(open(os.path.join(d, 'rma55h31_fig12.csv'))))
    r11 = list(csv.DictReader(open(os.path.join(d, 'rma55h31_fig11.csv'))))
    m0, pinf0, p0vals = A55_TABLE2[0]
    ig = front(list(zip(range(0, 91, 15), [p / p0vals[0] for p in p0vals])))

    def r_of(m, lam, ratio):
        P = p0_over_p(m)
        L = math.radians(lam)
        gauge = (ratio * P * ig - math.cos(L)) / (P * ig - 1)
        return gauge / (math.cos(L) ** 3 * cp0(m * math.cos(L)) / cp0(m))

    def second_of(rows, m, lam):
        cands = [r for r in rows if (('present' in r['series']) == (m == 3.9)) and float(r['x']) > 5]
        best = min(cands, key=lambda r: abs(float(r['x']) - lam))
        return float(best['x']), float(best['y']), float(best['err_y']), xerr(best['how'])

    for (src, m, lam, v) in A55_FIG12:
        y2, v2, e2, x2 = second_of(r12, m, lam)
        f11 = min((q for q in A55_FIG11 if q[1] == m), key=lambda q: abs(q[2] - lam))
        y11, v11, e11, x11 = second_of(r11, m, f11[2])
        say(f'| {src}, {lam:.0f} deg | {lam}, {v:.3f} | {y2:.2f}, {v2:.4f} | {abs(lam - y2):.2f} ({0.2 + x2:.2f}) | '
            f'{abs(v - v2):.4f} ({0.004 + e2:.4f}) | {f11[2]}, {f11[3]:.3f} | {y11:.2f}, {v11:.4f} | '
            f'{abs(f11[3] - v11):.4f} ({0.004 + e11:.4f}) | {r_of(m, lam, v):.4f} | {r_of(m, y2, v2):.4f} |')
    # Third looks (0016 section 16): the present tests' rings fitted by a circle on the deskewed
    # scan, centre to +-0.5 px (+-0.02 deg, +-0.0005); 30 deg agrees, 45 and 60 resolve their pairs.
    say('')
    for lam, v in ((29.91, 0.702), (44.76, 0.410), (59.83, 0.165)):
        say(f'- third look, present tests, {lam} deg, {v:.3f}: r {r_of(3.9, lam, v):.4f}')
    if len(sys.argv) > 2:
        say('')
        say('## Round 7: fig. 8b, M 1.2, the blind re-read, against the first reading')
        rows7 = list(csv.DictReader(open(os.path.join(sys.argv[2], 'cr149372_fig8b.csv'))))
        p1 = sorted(M8B_SYMBOLS[1.2] + M8B_CURVE[1.2])
        sec7 = []
        for r in rows7:
            t = float(r["theta_deg"])
            if t > 95.5:
                continue
            e = 0.005 + float(r['Cp_err']) + abs(interp(p1, t + 1) - interp(p1, t - 1)) / 2 * (
                0.3 + float(r['theta_err_deg'] or 0))
            sec7.append((t, float(r['Cp']), e, 'curve' if 'curve' in r['item'] else 'triangle'))
        sec7.sort()
        for lo, hi in ((0, 90), (22, 65)):
            part = [q for q in sec7 if lo <= q[0] <= hi]
            d = [(t, y - interp(p1, t), e) for t, y, e, _ in part]
            within = sum(1 for _, dd, e in d if abs(dd) <= e)
            big = max(d, key=lambda x: abs(x[1]))
            say(f'- {lo} to {hi} deg: {len(part)} points, mean difference {sum(x[1] for x in d) / len(d):+.4f}, '
                f'largest {big[1]:+.3f} at {big[0]:.0f} deg, within the combined error {within} of {len(d)}')
        f1, f7 = by_difference(p1, [(t, y) for t, y, _, _ in sec7])
        mn = 2 / 3 * cp0(1.2)
        say(f'- kappa: first {f1 / mn:.4f}, round 7 {f7 / mn:.4f}')
    say('')
    say('## Points held (second reading, fig. 8b, used)')
    for m, pts in held.items():
        say(f'- M {m}: ' + ', '.join(f'[{t:g}, {y:g}, {k[0]}]' for t, y, k in pts))
    say(f'- fig. 5 shared (44 to 78 deg): ' + ', '.join(f'[{t:g}, {y:g}]' for t, y in sorted(sh) if t >= 44))
    say(f'- fig. 5 above 88 deg: ' + str({k: v for k, v in br.items() if v}))


if __name__ == '__main__':
    sys.exit(main())
