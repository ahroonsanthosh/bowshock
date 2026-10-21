"""TN 2960 figs. 5(a), 5(b), 5(d), 5(e): the first readings (w34_fin_edges.py)
paired with the independent reader's blind second readings (audit round 6,
commit 402c412, docs/research/total-drag/audit/round6/readings/tn2960_fig*.csv).

Usage (from the repository root):
  python3 -I docs/research/total-drag/scripts/w34_pair_tn2960.py <round-6 readings dir>

For each set, like against like: where the first reading is of a faired
curve and the second read that curve, the second's curve points; where the
first read symbols (fig. 5(d)'s three Reynolds numbers), the second's
symbols (either side, flagged -theta symbols at |theta|); where the second
read only symbols of a curve the first read (fig. 5(e)), the symbols, which
then carry the data's own scatter about the fairing. Each point at 0 to 90
deg against the first reading interpolated there, with the combined
reading error: both readings' stated errors in P plus the local slope
times both readings' errors in theta (0.5 deg on the first, the second's
stated x error). And the front side over
(2/3) Cp_0 on both readings. The second reading's front side is the first's
plus the integral of the difference, the difference interpolated linearly
between the second reading's points (held at the ends), so that its gaps
(up to 20 deg where ink is crowded or dashed) take the first reading's
curvature, not a chord. Prints the comparison tables (markdown)."""

import csv
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from w34_fin_edges import TN2960, cp0, front  # noqa: E402

PAIRS = [
    ('5(a) circles, M 0.05, R 3.14e5', '5a', ['M 0.05 faired curve']),
    ('5(a) squares, M 0.06 to 0.07, R 4.26e5', '5a', ['M 0.06-0.07 faired curve']),
] + [
    (f'5(b) M {m}', '5b', [f'M={m} faired curve']) for m in ('0.7', '0.6', '0.5', '0.3')
] + [
    ('5(d) faired curve, M 1.98', '5d', ['faired curve (all three R)']),
    ('5(d) circles, R 13.2e5', '5d', ['R=13.2e5 (circle)', 'R=13.2e5 (circle) flagged -theta']),
    ('5(d) squares, R 5.5e5', '5d', ['R=5.5e5 (square)', 'R=5.5e5 (square) flagged -theta']),
    ('5(d) diamonds, R 1.3e5', '5d', []),
    ('5(e) M 0.06 (R above critical)', '5e', ['M=0.06 (triangle)']),
    ('5(e) M 0.70', '5e', ['M=0.70 (diamond)']),
    ('5(e) M 1.49', '5e', ['M=1.49 (square)']),
    ('5(e) M 2.90', '5e', ['M=2.90 (circle)']),
]


def interp(pts, t):
    if t <= pts[0][0]:
        return pts[0][1]
    for (a, pa), (b, pb) in zip(pts, pts[1:]):
        if a <= t <= b:
            return pa + (pb - pa) * (t - a) / (b - a) if b > a else pa
    return pts[-1][1]


def first_points(m, pts):
    pts = sorted((t, cp0(m) if p is None else p) for t, p in pts)
    if pts[0][0] > 0:
        pts = [(0, cp0(m))] + pts
    return pts


def main():
    d = sys.argv[1]
    data = {}
    for f in ('5a', '5b', '5d', '5e'):
        with open(os.path.join(d, f'tn2960_fig{f}.csv')) as fh:
            data[f] = list(csv.DictReader(fh))
    out = []
    say = out.append
    say('| Set | Second-reading points (0 to 90 deg) | Mean difference | Largest | Combined error | Within it | '
        'Front over (2/3) Cp_0, first | Second | Envelope |')
    say('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for name, fig, series in PAIRS:
        m, _method, e1, pts = TN2960[name]
        p1 = first_points(m, pts)
        # the first reading to 90 deg (interpolated there)
        cut = [p for p in p1 if p[0] < 90] + [(90, interp(p1, 90))]
        f1 = front(cut)
        mn = 2 / 3 * cp0(m)
        sec = []
        for r in data[fig]:
            if r['series'] in series and r['y']:
                t = abs(float(r['x']))
                if t <= 90.5:
                    xe = float(r['how'].split('x err ')[1]) if 'x err ' in r['how'] else 0.0
                    sec.append((t, float(r['y']), float(r['err_y'] or 0), xe))
        if not sec:
            say(f'| {name} | none (not read) | | | | | {f1 / mn:.3f} | | {f1 / mn:.3f} |')
            continue
        sec.sort()
        def slope(t):
            return abs(interp(p1, t + 1) - interp(p1, t - 1)) / 2

        diffs = [(t, y - interp(p1, t), e1 + e2 + slope(t) * (0.5 + xe)) for t, y, e2, xe in sec]
        within = sum(1 for _, dd, e in diffs if abs(dd) <= e)
        mean = sum(dd for _, dd, _ in diffs) / len(diffs)
        big = max(diffs, key=lambda x: abs(x[1]))
        comb = sum(e for _, _, e in diffs) / len(diffs)
        dpts = [(t, dd) for t, dd, _ in diffs]
        grid = [k * 0.5 for k in range(181)]
        corr = front([(t, interp(dpts, t)) for t in grid])
        f2 = f1 + corr
        lo, hi = min(f1, f2) / mn, max(f1, f2) / mn
        say(f'| {name} | {len(sec)} ({sec[0][0]:.0f} to {sec[-1][0]:.0f} deg) | {mean:+.3f} | {big[1]:+.3f} at '
            f'{big[0]:.0f} deg | {comb:.3f} | {within} of {len(sec)} | {f1 / mn:.3f} | {f2 / mn:.3f} | '
            f'{lo:.3f} to {hi:.3f} |')
    print('\n'.join(out))


if __name__ == '__main__':
    sys.exit(main())
