"""First readings for the fin edges of flat plates (0014 W3, W4, W11; design
record 0016), and the computations behind data/fin_edges_w34.md.

Writes data/fin_edges_w34.csv (every value read, with its figure, method and
reading error) and prints the computed results (data/fin_edges_w34_output.txt).
Run from the repository root:  python3 -I docs/research/total-drag/scripts/w34_fin_edges.py
Pure Python (math, csv). The readings were made with the w34_*.py tools on
page images extracted with pdfimages (300 ppi scans) and deskewed where a
long grid line showed a tilt (w34_deskew.py)."""

import csv
import math
import os
import sys

G = 1.4
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'data')


def p0_over_p(m):
    """Stagnation pressure over static: Rayleigh's pitot formula above Mach 1, isentropic below."""
    if m >= 1:
        p2 = 1 + 2 * G / (G + 1) * (m * m - 1)
        m2s = (1 + 0.5 * (G - 1) * m * m) / (G * m * m - 0.5 * (G - 1))
        return p2 * (1 + 0.5 * (G - 1) * m2s) ** (G / (G - 1))
    return (1 + 0.5 * (G - 1) * m * m) ** (G / (G - 1))


def cp0(m):
    return (p0_over_p(m) - 1) / (0.5 * G * m * m)


def front(points):
    """Front side, 0 to 90 deg, trapezoid rule: int P cos(theta) dtheta, on the diameter."""
    s = 0.0
    for (t0, p0), (t1, p1) in zip(points, points[1:]):
        if t1 > 90 + 1e-9:
            break
        s += 0.5 * (p0 * math.cos(math.radians(t0)) + p1 * math.cos(math.radians(t1))) * math.radians(t1 - t0)
    return s


# --------------------------------------------------------------------------
# TN 2960 (Gowen and Perkins 1953, NTRS 19930084018). P against theta, deg.
# Pages are PDF pages; calibrations in data/fin_edges_w34.md section 2.

TN2960 = {
    # fig. 5(a), PDF p. 18, deskewed -0.380 deg; faired curves by eye on the ruler crop, +-0.03
    '5(a) circles, M 0.05, R 3.14e5': (0.05, 'eye, faired curve', 0.03, [
        (0, 1.00), (5, 0.97), (10, 0.90), (15, 0.80), (20, 0.65), (25, 0.45), (30, 0.20), (35, -0.03),
        (40, -0.27), (45, -0.55), (50, -0.80), (55, -0.97), (60, -1.06), (65, -1.10), (70, -1.07),
        (75, -0.97), (80, -0.91), (85, -0.90), (90, -0.89)]),
    '5(a) squares, M 0.06 to 0.07, R 4.26e5': (0.065, 'eye, faired curve', 0.03, [
        (0, 1.00), (5, 0.95), (10, 0.88), (15, 0.72), (20, 0.52), (25, 0.27), (30, 0.00), (35, -0.30),
        (40, -0.62), (45, -0.95), (50, -1.30), (55, -1.62), (60, -1.88), (65, -2.12), (70, -2.30),
        (75, -2.42), (80, -2.50), (85, -2.52), (90, -2.51)]),
    # fig. 5(b), PDF p. 19 (tilt 0.04 deg, not deskewed); four curves offset by 0.4 each, the
    # offsets removed; guided column scans (median over +-0.6 deg), 0 deg by eye; +-0.02 (+-0.04 at 55 to 90)
    '5(b) M 0.7': (0.70, 'guided column scan', 0.02, [
        (0, 1.12), (5, 1.103), (15, 0.959), (25, 0.706), (35, 0.337), (45, -0.120), (55, -0.649),
        (65, -0.967), (75, -1.17), (85, -1.159), (90, -1.18)]),
    '5(b) M 0.6': (0.60, 'guided column scan', 0.02, [
        (0, 1.10), (5, 1.064), (15, 0.915), (25, 0.639), (35, 0.235), (45, -0.273), (50, -0.549),
        (55, -0.827), (60, -0.996), (65, -1.128), (70, -1.176), (80, -1.226), (85, -1.185), (90, -1.139)]),
    '5(b) M 0.5': (0.50, 'guided column scan', 0.02, [
        (0, 1.06), (5, 1.03), (15, 0.872), (25, 0.528), (35, 0.104), (40, -0.142), (45, -0.385),
        (50, -0.653), (55, -0.919), (60, -1.013), (65, -1.148), (70, -1.171), (80, -1.216), (85, -1.22),
        (90, -1.13)]),
    '5(b) M 0.3': (0.30, 'guided column scan', 0.02, [
        (0, 1.03), (5, 0.994), (15, 0.84), (25, 0.474), (35, 0.043), (40, -0.218), (45, -0.443),
        (50, -0.666), (60, -1.019), (70, -1.17), (80, -1.17), (90, -1.05)]),
    # fig. 5(d), PDF p. 21, deskewed +0.685 deg; the faired curve, guided scans, +-0.02 (+-0.04
    # where a symbol covers the curve: 15, 40, 70 deg); 0 deg as drawn (the pitot line)
    '5(d) faired curve, M 1.98': (1.98, 'guided column scan', 0.02, [
        (0, 1.67), (5, 1.646), (10, 1.630), (15, 1.60), (20, 1.484), (25, 1.391), (30, 1.284),
        (35, 1.170), (40, 1.008), (45, 0.860), (50, 0.766), (55, 0.638), (60, 0.483), (65, 0.387),
        (70, 0.284), (75, 0.146), (80, 0.077), (85, -0.068), (90, -0.101)]),
    # fig. 5(d) symbols by eye on 2x ruler crops (+-0.01); theta 0 at Rayleigh's pitot coefficient
    '5(d) circles, R 13.2e5': (1.98, 'eye, symbols', 0.01, [
        (0, None), (2, 1.67), (11, 1.61), (17, 1.52), (26, 1.38), (32, 1.21), (41, 1.00), (47, 0.80),
        (57, 0.64), (62, 0.41), (72, 0.24), (78, 0.08), (87, -0.03), (92, -0.16)]),
    '5(d) squares, R 5.5e5': (1.98, 'eye, symbols', 0.01, [
        (0, None), (14, 1.57), (29, 1.33), (44, 0.95), (59, 0.46), (74, 0.12), (89, -0.11), (92, -0.13)]),
    '5(d) diamonds, R 1.3e5': (1.98, 'eye, symbols (pairs averaged at 44 and 89 deg)', 0.01, [
        (0, None), (15, 1.58), (29, 1.35), (44, 0.92), (59, 0.56), (75, 0.18), (89, -0.12), (92, -0.14)]),
    # fig. 5(e), PDF p. 22, deskewed +0.389 deg; guided column scans between the symbols, +-0.02
    '5(e) M 0.06 (R above critical)': (0.06, 'guided column scan', 0.02, [
        (0, 1.00), (5, 0.939), (15, 0.686), (25, 0.275), (30, 0.029), (35, -0.265), (45, -0.923),
        (55, -1.535), (65, -2.038), (75, -2.409), (85, -2.534), (90, -2.532)]),
    '5(e) M 0.70': (0.70, 'guided column scan', 0.02, [
        (0, 1.15), (5, 1.119), (15, 0.971), (25, 0.700), (35, 0.326), (45, -0.144), (55, -0.641),
        (65, -0.995), (75, -1.178), (85, -1.214), (90, -1.21)]),
    '5(e) M 1.49': (1.49, 'guided column scan between symbols', 0.02, [
        (0, None), (3, 1.525), (9, 1.488), (11, 1.473), (20, 1.363), (22, 1.329), (24, 1.295), (26, 1.259),
        (34, 1.087), (36, 1.039), (38, 0.987), (40, 0.926), (49, 0.676), (51, 0.612), (53, 0.544),
        (56, 0.437), (64, 0.213), (66, 0.162), (68, 0.114), (70, 0.066), (79, -0.131), (81, -0.171),
        (83, -0.209), (86, -0.260), (90, -0.30)]),
    '5(e) M 2.90': (2.90, 'guided column scan between symbols', 0.02, [
        (0, None), (3, 1.746), (6, 1.718), (9, 1.686), (11, 1.664), (20, 1.559), (22, 1.526), (24, 1.484),
        (26, 1.452), (34, 1.286), (36, 1.240), (38, 1.197), (40, 1.144), (49, 0.879), (51, 0.808),
        (53, 0.767), (56, 0.683), (64, 0.437), (66, 0.393), (68, 0.350), (70, 0.308), (79, 0.154),
        (81, 0.128), (83, 0.103), (86, 0.074), (90, 0.03)]),
}

# --------------------------------------------------------------------------
# RM A55H31 (Goodwin, Creager and Winkler 1956, NTRS 19930088843).
# fig. 12, PDF p. 41, deskewed +0.212 deg: front-side pressure drag, yawed over
# unyawed, symbol centres by eye on 2x ruler crops, +-0.004 in the ratio, +-0.2 deg.
A55_FIG12 = [
    ('present tests, M 3.9', 3.9, 30.1, 0.700), ('present tests, M 3.9', 3.9, 45.1, 0.410),
    ('present tests, M 3.9', 3.9, 60.1, 0.170),
    ('ref. 1, M 6.9', 6.86, 14.4, 0.907), ('ref. 1, M 6.9', 6.86, 29.6, 0.665),
    ('ref. 1, M 6.9', 6.86, 45.2, 0.367), ('ref. 1, M 6.9', 6.86, 59.9, 0.131),
    ('ref. 1, M 6.9', 6.86, 75.5, 0.023),
]
# fig. 11, PDF p. 40, deskewed -0.322 deg: stagnation-line pressure over the stream's
# impact pressure, p_x=0 / p_t2, symbol centres on 2x crops, +-0.004.
A55_FIG11 = [
    ('present tests, M 3.9', 3.9, 30, 0.769), ('present tests, M 3.9', 3.9, 45, 0.530),
    ('present tests, M 3.9', 3.9, 60, 0.295),
    ('ref. 1, M 6.9', 6.86, 14.3, 0.972), ('ref. 1, M 6.9', 6.86, 29.6, 0.750),
    ('ref. 1, M 6.9', 6.86, 45.1, 0.500), ('ref. 1, M 6.9', 6.86, 59.8, 0.246),
    ('ref. 1, M 6.9', 6.86, 75.2, 0.046),
]
# Table II, PDF p. 27, typed: the present tests' pressures (mm Hg; the column head says
# microns for p_inf, whose values are mm Hg: 0.319 is table I's 320 microns).
A55_TABLE2 = {
    0: (3.94, 0.319, [6.54, 6.18, 5.17, 3.80, 2.48, 1.43, 0.75]),
    30: (3.90, 0.318, [5.05, 4.77, 3.97, 2.80, 1.85, 1.08, 0.60]),
    45: (3.8, 0.10, [1.05, 1.00, 0.85, 0.66, 0.46, 0.29, 0.18]),
}

# --------------------------------------------------------------------------
# RM L52D21 (Goin 1952, NTRS 19930087183) fig. 11, PDF p. 46, rotated upright;
# alpha 0, the summary curves at h/t = 1.0 (column scans at h/t 0.95 to 0.99), +-0.005:
# P_b' / P_bv = 1 - p_b / p_inf (the base pressure coefficient over the vacuum's).
L52_FIG11 = [(1.41, 0.534, 0.488), (1.62, 0.570, 0.548), (1.96, 0.663, 0.575)]  # M, sweep 0, sweep 45
# RM A51J25 fig. 7's mean curve (first reading, src/base/blunt-te-2d.ts), p_b / p_inf
A51 = [(1.4, 0.517), (1.5, 0.474), (1.6, 0.446), (1.7, 0.42), (1.83, 0.399), (2.0, 0.359)]


def a51(m):
    for (m0, r0), (m1, r1) in zip(A51, A51[1:]):
        if m0 <= m <= m1:
            return r0 + (r1 - r0) * (m - m0) / (m1 - m0)
    raise ValueError(m)


def main():
    rows = []
    out = []
    say = out.append

    say('# Fin edges of flat plates: first readings and computations (w34_fin_edges.py)')
    say('')
    say('## TN 2960: front side over modified Newtonian, (2/3) Cp_0')
    for name, (m, method, err, pts) in TN2960.items():
        pts = [(t, cp0(m) if p is None else p) for t, p in pts]
        for t, p in pts:
            rows.append(['TN 2960', name.split(' ')[0], name, m, 'theta deg', t, 'P', round(p, 4),
                         'first', method, err])
        # value at 90 deg for symbol sets that pass it: linear between the neighbours
        if pts[-1][0] > 90:
            for (a, pa), (b, pb) in zip(pts, pts[1:]):
                if a <= 90 <= b:
                    v90 = pa + (pb - pa) * (90 - a) / (b - a)
            pts = [p for p in pts if p[0] < 90] + [(90, v90)]
        f = front(pts)
        say(f'- {name}: front {f:+.3f} on D; (2/3) Cp_0 {2 / 3 * cp0(m):.3f} (Cp_0 {cp0(m):.3f}); '
            f'ratio {f / (2 / 3 * cp0(m)):+.3f}')
    say('')

    say('## RM A55H31: the yawed front side against the independence principle')
    pt2s = {m: p0_over_p(m) for m in (3.9, 6.86)}
    m0, pinf0, p0vals = A55_TABLE2[0]
    shape = [p / p0vals[0] for p in p0vals]
    ig = front(list(zip(range(0, 91, 15), shape)))
    say(f'- unyawed shape integral I_g = int (p/p_x=0) cos(phi) dphi, table II at 0 deg: {ig:.4f}')
    for src, m, lam, ab in A55_FIG12:
        rows.append(['RM A55H31', '12', src, m, 'yaw deg', lam, 'CD front, yawed over unyawed', ab,
                     'first', 'eye, symbol centre on 2x ruler crop', 0.004])
    for src, m, lam, st in A55_FIG11:
        rows.append(['RM A55H31', '11', src, m, 'yaw deg', lam, 'p_x=0 / p_t2', st,
                     'first', 'eye, symbol centre on 2x ruler crop', 0.004])
    say('- fig. 12 (absolute-pressure basis, as eq. (14)) converted to gauge pressure with fig. 11 and I_g;')
    say('  r = gauge ratio over cos^3(L) Cp_pitot(M cos L) / Cp_pitot(M):')
    for (src, m, lam, ab) in A55_FIG12:
        L = math.radians(lam)
        mn = m * math.cos(L)
        st = min((x for x in A55_FIG11 if x[1] == m), key=lambda x: abs(x[2] - lam))[3]
        pt2 = pt2s[m]
        gauge = ab * (1 - 1 / (st * pt2 * ig)) / (1 - 1 / (pt2 * ig))
        model = math.cos(L) ** 3 * cp0(mn) / cp0(m)
        say(f'  - {src}, yaw {lam:4.1f} (M_n {mn:4.2f}): fig. 11 {st:.3f} against Rayleigh at M_n '
            f'{p0_over_p(mn) / pt2:.3f}; fig. 12 {ab:.3f}, gauge {gauge:.4f}; model {model:.4f}; '
            f'r {gauge / model:.3f}')
    say('- table II directly (gauge, trapezoid at 15 deg), rho = front on q_n over (2/3) Cp_pitot(M_n):')
    rho = {}
    for lam, (m, pinf, p) in A55_TABLE2.items():
        L = math.radians(lam)
        mn = m * math.cos(L)
        qn = 0.5 * G * pinf * m * m * math.cos(L) ** 2
        cf = front(list(zip(range(0, 91, 15), [(x - pinf) / qn for x in p])))
        rho[lam] = cf / (2 / 3 * cp0(mn))
        say(f'  - yaw {lam:2d}, M {m}, M_n {mn:.3f}: stagnation p/p_inf {p[0] / pinf:.2f} (Rayleigh '
            f'{p0_over_p(mn):.2f}); front on q_n {cf:.4f}; rho {rho[lam]:.4f}; over yaw 0 '
            f'{rho[lam] / rho[0]:.4f}')
    say('')

    say('## RM L52D21 fig. 11 (alpha 0, h/t 1.0) over the thin-layer curve at the free-stream Mach number')
    for m, s0, s45 in L52_FIG11:
        model = 1 - a51(m)
        for sweep, v in ((0, s0), (45, s45)):
            rows.append(['RM L52D21', '11', f'sweep {sweep} deg, h/t 1.0, alpha 0', m, 'h/t', 1.0,
                         "P_b'/P_bv", v, 'first', 'column scan at h/t 0.95 to 0.99', 0.005])
        say(f'- M {m}: model 1 - p_b/p_inf {model:.3f}; sweep 0 {s0:.3f} ({s0 / model:.3f}); '
            f'sweep 45 {s45:.3f} ({s45 / model:.3f})')
    say('')

    say('## TN 2960 fig. 5(c): rear side against a square base of the same height (first readings, 0010)')
    rear = {1.49: 0.454, 1.98: 0.269, 2.90: 0.093}
    for m, r in rear.items():
        sq = -((a51_full(m) - 1) * 2 / (G * m * m))
        say(f'- M {m}: cylinder rear side {r:.3f} on D; square base at the thin-layer curve {sq:.3f}; '
            f'ratio {r / sq:.2f}')

    with open(os.path.join(DATA, 'fin_edges_w34.csv'), 'w', newline='') as fh:
        w = csv.writer(fh)
        fh.write('# Fin edges of flat plates: first readings (second readings by an independent reader, pending).\n')
        fh.write('# Written by scripts/w34_fin_edges.py; sources, calibrations and limits in data/fin_edges_w34.md.\n')
        w.writerow(['source', 'figure', 'item', 'M', 'x_name', 'x', 'quantity', 'value', 'reading',
                    'method', 'error'])
        w.writerows(rows)
    print('\n'.join(out))


A51_FULL = [(1.4, 0.517), (1.5, 0.474), (1.6, 0.446), (1.7, 0.42), (1.83, 0.399), (2.0, 0.359),
            (2.1, 0.337), (2.25, 0.311), (2.5, 0.275), (2.75, 0.249), (2.9, 0.236), (3.0, 0.228)]


def a51_full(m):
    for (m0, r0), (m1, r1) in zip(A51_FULL, A51_FULL[1:]):
        if m0 <= m <= m1:
            return r0 + (r1 - r0) * (m - m0) / (m1 - m0)
    raise ValueError(m)


if __name__ == '__main__':
    sys.exit(main())
