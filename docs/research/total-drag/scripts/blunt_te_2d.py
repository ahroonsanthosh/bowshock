"""Two-dimensional base pressure of blunt trailing edges, M 1.5 to 3: the readings of task 2(a), converted to the
base pressure coefficient P_B = (p_b/p_inf - 1) 2/(gamma M^2) and to base-drag ratios (data over curve, as a ratio
of -P_B, the convention of 0008 section 3). FIRST READINGS throughout; second readings pending.

Sources and readings (each the output of a saved script, or a reading by eye on a saved ruler zoom):
  TR 1109 fig. 29 (PDF p. 19): tr1109_fig29_runs_output.txt (turbulent), tr1109_fig29b_cols_output.txt (laminar).
  TR 1109 fig. 8 (PDF p. 11): symbol centres by eye on img/tr1109/f8a_z1.png, f8b_z1.png, f8b_z2.png, f8c_z1.png
      (tr1109_fig8_zoom.py), faired curve by eye at the same abscissa.
  RM A51J25 fig. 7 (PDF p. 14): curve from a51j25_fig7_curve_output.txt where a clean run exists, otherwise by eye
      on img/n2003/f7_ruler.png; symbols by eye on the same zoom.
  TN 3819 fig. 5 (PDF p. 36): love_fig5_cols_output.txt, curves linked by continuity across columns.
  TN D-1056 table II (PDF p. 15): typed from the page image (img/x15/p15L.png, p15R.png).
Gas: gamma = 1.4."""
import math

G = 1.4


def PB(r, M):
    return (r - 1.0) * 2.0 / (G * M * M)


def interp(tab, x):
    xs = sorted(tab)
    if x < xs[0] or x > xs[-1]:
        return None
    for a, b in zip(xs, xs[1:]):
        if a <= x <= b:
            return tab[a] + (tab[b] - tab[a]) * (x - a) / (b - a)
    return tab[xs[-1]]


def oblique(M, th_deg):
    """Weak oblique shock for wedge deflection th: returns (p2/p1, M2)."""
    th = math.radians(th_deg)
    lo, hi = math.asin(1.0 / M) + 1e-9, math.radians(89.0)
    def f(b):
        return math.tan(th) - 2.0 / math.tan(b) * (M * M * math.sin(b) ** 2 - 1) / (M * M * (G + math.cos(2 * b)) + 2)
    # weak root: bisect between Mach angle and the angle of maximum deflection (scan for the first sign change)
    n = 2000
    prev_b, prev_f = lo, f(lo)
    for k in range(1, n + 1):
        b = lo + (hi - lo) * k / n
        fb = f(b)
        if prev_f * fb <= 0:
            a, c = prev_b, b
            for _ in range(80):
                m = 0.5 * (a + c)
                if f(a) * f(m) <= 0:
                    c = m
                else:
                    a = m
            beta = 0.5 * (a + c)
            Mn1 = M * math.sin(beta)
            p21 = 1 + 2 * G / (G + 1) * (Mn1 * Mn1 - 1)
            Mn2 = math.sqrt((1 + 0.5 * (G - 1) * Mn1 * Mn1) / (G * Mn1 * Mn1 - 0.5 * (G - 1)))
            return p21, Mn2 / math.sin(beta - th)
        prev_b, prev_f = b, fb
    return None


print('=== A. TR 1109 fig. 29(a), turbulent, faired curves (Ames 1 by 3 ft No. 1 and 2, 12 wings of the thickness'
      ' group, t/c 0.05 to 0.10, h/t 0.25 to 1.0, AR 3, chord 3 in; average of two orifice positions)')
T29 = {1.5: {0.75: 0.492, 1.0: 0.494, 1.5: 0.498, 2.0: 0.503, 2.5: 0.508, 3.0: 0.515, 3.5: 0.528, 4.0: 0.539, 4.5: 0.552},
       2.0: {0.75: 0.362, 1.0: 0.367, 1.5: 0.379, 2.0: 0.391, 3.0: 0.416, 3.5: 0.430, 4.0: 0.442, 4.5: 0.454},
       3.1: {0.75: 0.209, 1.0: 0.223, 1.5: 0.255, 2.0: 0.286, 2.5: 0.317, 3.0: 0.347, 3.5: 0.380, 4.0: 0.411, 4.5: 0.441}}
T29[1.5][0.5] = 0.492
T29[2.0][0.5] = 0.358
print('  (2.0 at abscissa 2.5 and 3.1 at 0.5 not read: the line lies on a grid line / starts there)')
print('  c/[h Re^(1/5)]  ' + '  '.join('M %.1f: p_b/p_inf  P_B' % M for M in T29))
for u in (0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5):
    cells = []
    for M, t in T29.items():
        cells.append('%.3f  %.4f' % (t[u], PB(t[u], M)) if u in t else '  -        -   ')
    print('  %4.2f            %s' % (u, '      '.join(cells)))
for M, t in T29.items():
    ks = sorted(t)
    print('  M %.1f: P_B from %.4f (abscissa %.2f) to %.4f (%.2f): base drag at the high end %.2f of the low end'
          % (M, PB(t[ks[0]], M), ks[0], PB(t[ks[-1]], M), ks[-1], PB(t[ks[-1]], M) / PB(t[ks[0]], M)))

print()
print('=== B. TR 1109 fig. 29(b), laminar, faired curves (same wings, smooth surfaces)')
L29 = {1.5: {0.010: 0.358, 0.014: 0.460, 0.026: 0.636, 0.030: 0.664, 0.034: 0.688, 0.038: 0.706, 0.044: 0.727,
             0.050: 0.740, 0.060: 0.764, 0.075: 0.792, 0.092: 0.811, 0.104: 0.822, 0.124: 0.834, 0.150: 0.844,
             0.175: 0.847, 0.185: 0.847},
       2.0: {0.010: 0.442, 0.014: 0.490, 0.026: 0.615, 0.030: 0.644, 0.034: 0.672, 0.038: 0.693, 0.044: 0.717,
             0.050: 0.740, 0.060: 0.764, 0.075: 0.782, 0.092: 0.794, 0.124: 0.807, 0.150: 0.816, 0.175: 0.818,
             0.190: 0.817},
       3.1: {0.006: 0.190, 0.010: 0.253, 0.014: 0.307, 0.018: 0.356, 0.026: 0.437, 0.030: 0.474, 0.034: 0.506,
             0.038: 0.539, 0.044: 0.586, 0.050: 0.628, 0.058: 0.683, 0.062: 0.709}}
print('  (0.050 and 0.060: M 1.5 and 2.0 merged in one run, the value given to both; 0.016 to 0.022: merged or on a'
      ' grid line, not used; M 3.1 ends near 0.065)')
for M, t in L29.items():
    print('  M %.1f: ' % M + '; '.join('%.3f: %.3f (P_B %.4f)' % (u, r, PB(r, M)) for u, r in sorted(t.items())))

print()
print('=== C. TR 1109 fig. 8, turbulent, symbols about the faired curve (Delta p_b/p_inf, by eye)')
F8 = {1.5: [(0.55, 0.507, 0.497), (0.75, 0.505, 0.496), (0.75, 0.485, 0.496), (1.0, 0.506, 0.494), (1.12, 0.495, 0.493),
            (1.12, 0.470, 0.493), (1.5, 0.503, 0.492), (1.5, 0.485, 0.492), (2.25, 0.506, 0.490), (2.25, 0.468, 0.490),
            (3.0, 0.490, 0.487), (4.5, 0.535, 0.520)],
      2.0: [(0.55, 0.338, 0.357), (0.75, 0.379, 0.360), (0.75, 0.342, 0.360), (1.0, 0.360, 0.362), (1.15, 0.383, 0.366),
            (1.15, 0.327, 0.366), (1.5, 0.359, 0.373), (2.25, 0.381, 0.393), (2.25, 0.343, 0.393), (2.25, 0.362, 0.393),
            (3.0, 0.415, 0.410), (4.5, 0.445, 0.445)],
      3.1: [(0.55, 0.183, 0.188), (0.7, 0.198, 0.196), (0.9, 0.227, 0.209), (1.05, 0.205, 0.218), (1.4, 0.240, 0.239),
            (2.05, 0.290, 0.283), (2.0, 0.275, 0.280), (2.75, 0.325, 0.322), (4.2, 0.410, 0.410)]}
print('  (the two filled squares at 2.25 for M 2.0 overlap; read as 0.343 and 0.362)')
summ_c = {}
for M, pts in F8.items():
    d = [r - c for _, r, c in pts]
    rat = [(1 - r) / (1 - c) for _, r, c in pts]
    summ_c[M] = (min(rat), max(rat))
    print('  M %.1f: %d symbols, Delta p_b/p_inf %+.3f to %+.3f, Delta P_B %+.4f to %+.4f; base drag over curve %.3f to %.3f'
          % (M, len(pts), min(d), max(d), min(d) * 2 / (G * M * M), max(d) * 2 / (G * M * M), min(rat), max(rat)))
print('  fig. 8 curves against fig. 29(a) (orifice-position average) at the same abscissa, M 1.5: fig. 8 0.497 at 0.55'
      ' and 0.520 at 4.5 against fig. 29 0.492 and 0.552:')
for M, u, c8, c29 in ((1.5, 0.55, 0.497, 0.492), (1.5, 4.5, 0.520, 0.552), (2.0, 0.55, 0.357, 0.358),
                      (2.0, 4.5, 0.445, 0.454), (3.1, 0.75, 0.196, 0.209), (3.1, 4.2, 0.410, 0.423)):
    print('    M %.1f at %.2f: base drag fig. 29 over fig. 8 %.3f' % (M, u, (1 - c29) / (1 - c8)))
print('    (fig. 29 M 3.1 at 4.2 interpolated: %.3f)' % interp(T29[3.1], 4.2))

print()
print('=== D. RM A51J25 fig. 7: airfoils, p_b/p\' against M\', thin turbulent layers, five facilities incl. free flight')
A7 = {1.167: 0.588, 1.295: 0.545, 1.40: 0.517, 1.50: 0.474, 1.60: 0.446, 1.70: 0.420, 1.83: 0.399, 2.00: 0.359,
      2.10: 0.337, 2.25: 0.311, 2.50: 0.275, 2.75: 0.249, 2.90: 0.236, 3.00: 0.228, 3.10: 0.220, 3.25: 0.214,
      3.50: 0.206, 3.75: 0.200, 3.90: 0.199, 4.00: 0.199}
print('  curve (M\', p_b/p\'): ' + ', '.join('%.2f %.3f' % kv for kv in sorted(A7.items())))
S7 = [('Langley 9x12 delta (tagged square)', 1.23, 0.498), ('Ames (triangle-like)', 1.385, 0.532),
      ('Langley 9x12 rect (diamond)', 1.40, 0.464), ('Ames (square)', 1.475, 0.505), ('tagged', 1.60, 0.464),
      ('Langley 9x12 rect (diamond)', 1.60, 0.424), ('NPL two-dim', 1.83, 0.407), ('Ames (square)', 1.98, 0.374),
      ('Langley 9x12 rect (diamond)', 1.94, 0.331), ('tagged', 1.94, 0.346), ('Ames (square)', 2.47, 0.276),
      ('Ames (inverted triangle)', 2.88, 0.253), ('Ames (square)', 3.10, 0.232), ('Ames (inverted triangle)', 3.10, 0.204),
      ('Langley 9 in two-dim', 4.00, 0.222), ('Langley 9 in two-dim', 4.00, 0.191)]
rat_in = []
for name, M, r in S7:
    c = interp(A7, M)
    rat = (1 - r) / (1 - c)
    if 1.45 <= M <= 3.2:
        rat_in.append(rat)
    print('  %-36s M\' %.3f: %.3f against curve %.3f (%+.3f), base drag over curve %.3f' % (name, M, r, c, r - c, rat))
print('  Langley PARD free-flight points (filled, M\' 1.17 to 1.55): on the curve within about +-0.01 by eye')
print('  M\' 1.45 to 3.2: base drag over curve %.3f to %.3f (%d symbols)' % (min(rat_in), max(rat_in), len(rat_in)))

print()
print('=== E. TN 3819 fig. 5 against fig. 7 of RM A51J25 (M\' = M for flat-sided sections)')
F5 = {1.5: (-0.340, -0.335, -0.307), 2.0: (-0.229, -0.226, -0.208), 2.5: (-0.164, -0.156, -0.148), 3.0: (-0.121, -0.112, -0.107)}
for M, (A, B, S) in F5.items():
    c = PB(interp(A7, M), M)
    print('  M %.1f: line A %.3f, line B (dashed) %.3f, solid (Love from P_r) %.3f; RM A51J25 curve as P_B %.4f;'
          ' A over it %.3f, solid over it %.3f' % (M, A, B, S, c, A / c, S / c))
print('  TR 1109 fig. 29(a) at its lowest abscissa, as P_B: M 1.5 %.4f (0.5), M 2.0 %.4f (0.5), M 3.1 %.4f (0.75)'
      % (PB(0.492, 1.5), PB(0.358, 2.0), PB(0.209, 3.1)))
print('  RM A51J25 curve at M 3.1 as P_B: %.4f' % PB(interp(A7, 3.1), 3.1))

print()
print('=== F. X-15 upper movable vertical fin, free flight, power off (TN D-1056 table II; 10 deg single wedge,')
print('    mean chord 8.46 ft, mean TE thickness 1.55 ft, b/2h 3.2, turbulent; Cp error +-0.02, M +-0.02 to +-0.03)')
# (flight, time, M, Re per ft x 1e-6, alpha, [orifices on the movable fin: A: 2; B: 1, 2, 3]); speed-brake rows
# (delta_j 35 deg) excluded
X15 = [('A', 366.0, 3.24, 1.93, 4.1, [-0.120]), ('A', 369.0, 3.16, 2.02, 7.2, [-0.127]),
       ('A', 371.0, 3.11, 2.05, 10.5, [-0.134]), ('A', 380.5, 2.80, 1.99, 3.5, [-0.150]),
       ('A', 401.5, 2.45, 1.96, 10.0, [-0.173]), ('A', 409.5, 2.15, 1.63, 7.1, [-0.201]),
       ('A', 435.5, 1.80, 1.66, 4.8, [-0.247]), ('A', 435.9, 1.80, 1.66, 3.1, [-0.251]),
       ('A', 436.2, 1.79, 1.66, 1.2, [-0.249]), ('A', 456.5, 1.68, 2.36, 2.0, [-0.289]),
       ('A', 465.0, 1.52, 2.51, 3.3, [-0.307]), ('A', 474.0, 1.35, 2.63, 5.4, [-0.324]),
       ('A', 479.6, 1.23, 2.58, 7.8, [-0.406]), ('A', 483.0, 1.15, 2.53, 8.5, [-0.443]),
       ('B', 404.0, 3.17, 1.10, 8.7, [-0.136, -0.129, -0.136]), ('B', 418.5, 2.95, 1.10, 2.2, [-0.156, -0.149, -0.138]),
       ('B', 441.0, 2.66, 1.25, 3.0, [-0.183, -0.169, -0.170]), ('B', 448.0, 2.56, 1.25, 1.1, [-0.190, -0.179, -0.166]),
       ('B', 467.2, 2.30, 1.52, 8.3, [-0.191, -0.189, -0.187]), ('B', 483.0, 1.97, 1.49, 4.4, [-0.248, -0.228, -0.253]),
       ('B', 508.0, 1.52, 1.60, 5.2, [-0.347, -0.322, -0.353]), ('B', 522.4, 1.31, 1.74, 8.5, [-0.333, -0.378, -0.396]),
       ('B', 533.0, 1.09, 1.58, 10.2, [-0.353, -0.437, -0.429])]
print('  check of the orifice assignment: flight A at M 1.15 Cp2 -0.443 and flight B at M 1.09 mean(1,2,3) %.3f'
      ' against fig. 6(a) (by eye -0.44 and -0.41)' % (sum(X15[-1][5]) / 3))
print('  flt  t      M     Cp(mean)  flat-sided model  ratio | wedge (5 deg face): M\'   p\'/p    model Cp  ratio')
r_flat, r_wedge = [], []
for f, t, M, re, al, cps in X15:
    cp = sum(cps) / len(cps)
    c = interp(A7, M)
    flat = PB(c, M) if c is not None else None
    ob = oblique(M, 5.0)
    w = None
    if ob:
        p21, M2 = ob
        cw = interp(A7, M2)
        if cw is not None:
            w = (p21 * cw - 1) * 2 / (G * M * M)
    s1 = '%.4f  %.3f' % (flat, cp / flat) if flat else '   -      -  '
    s2 = '%.3f  %.3f  %.4f  %.3f' % (ob[1], ob[0], w, cp / w) if w else '   -'
    if 1.45 <= M <= 3.25:
        if flat:
            r_flat.append(cp / flat)
        if w:
            r_wedge.append(cp / w)
    print('  %s  %5.1f  %.2f  %.3f     %s | %s' % (f, t, M, cp, s1, s2))
print('  M 1.5 to 3.24: base drag over model, flat-sided %.3f to %.3f; with the 5 deg face (Chapman\'s p\', M\') %.3f to %.3f'
      % (min(r_flat), max(r_flat), min(r_wedge), max(r_wedge)))
e = [0.02 / abs(sum(x[5]) / len(x[5])) for x in X15 if 1.45 <= x[2] <= 3.25]
print('  the stated Cp error +-0.02 is %.0f%% to %.0f%% of |Cp| over the same points' % (100 * min(e), 100 * max(e)))

print()
print('=== G. Where a fin of c/h 12.5 with Re_c 1.19e6 to 1.98e6 sits on the correlations (geometry and Reynolds'
      ' number only: the Basic Finner\'s fins as 0010 sections 4.1 and 4.3 state them; no drag data used)')
for re in (1.19e6, 1.98e6):
    print('  Re_c %.2e: c/[h Re^(1/5)] = %.3f (TR 1109 turbulent range 0.5 to 4.5); c/[h Re^(1/2)] = %.4f (laminar'
          ' range about 0.006 to 0.19)' % (re, 12.5 / re ** 0.2, 12.5 / re ** 0.5))
for M in (1.5, 2.0, 3.1):
    tu = PB(T29[M][0.75], M)
    la = PB(interp(L29[M], 0.010), M)
    print('  M %.1f: turbulent P_B at 0.75 %.4f; laminar at 0.010 %.4f; laminar over turbulent (base drag) %.2f'
          % (M, tu, la, la / tu))
print()
print('=== H. Summary: base drag measured over the curve: TR 1109 fig. 8 over its own faired curves; RM A51J25 fig. 7'
      ' over its mean curve; the X-15 fin over the RM A51J25 curve used at the free-stream Mach number (M\' = M)')
print('  TR 1109 fig. 8 (one facility, 33 symbols, M 1.5, 2.0, 3.1): %.3f to %.3f'
      % (min(v[0] for v in summ_c.values()), max(v[1] for v in summ_c.values())))
print('  RM A51J25 fig. 7 (five facilities, 11 symbols at M\' 1.45 to 3.2): %.3f to %.3f' % (min(rat_in), max(rat_in)))
print('  X-15 upper fin, free flight (19 points at M 1.52 to 3.24): %.3f to %.3f' % (min(r_flat), max(r_flat)))

# csv of every value above (first readings)
with open('data/blunt_te_2d_base.csv', 'w') as f:
    f.write('# Two-dimensional base pressure of blunt trailing edges, M 1.5 to 3 (first readings; second pending).\n'
            '# Written by scripts/blunt_te_2d.py; see data/blunt_te_2d_base.md for sources, calibrations and limits.\n'
            '# quantity: p_b/p_inf (TR 1109, X-15 as P_B), p_b/p_prime (RM A51J25), P_B (TN 3819 fig. 5).\n'
            'source,figure,curve_or_point,M,abscissa_name,abscissa,quantity,value,P_B,reading\n')
    for M, t in T29.items():
        for u, r in sorted(t.items()):
            f.write('TR 1109,29(a),turbulent faired,%.1f,c/[h Re^(1/5)],%.2f,p_b/p_inf,%.3f,%.4f,first\n' % (M, u, r, PB(r, M)))
    for M, t in L29.items():
        for u, r in sorted(t.items()):
            f.write('TR 1109,29(b),laminar faired,%.1f,c/[h Re^(1/2)],%.3f,p_b/p_inf,%.3f,%.4f,first\n' % (M, u, r, PB(r, M)))
    for M, pts in F8.items():
        for u, r, c in pts:
            f.write('TR 1109,8,symbol (curve %.3f),%.1f,c/[h Re^(1/5)],%.2f,p_b/p_inf,%.3f,%.4f,first (eye)\n' % (c, M, u, r, PB(r, M)))
    for M, r in sorted(A7.items()):
        f.write('RM A51J25,7,mean curve,%.3f,M_prime,%.3f,p_b/p_prime,%.3f,,first\n' % (M, M, r))
    for name, M, r in S7:
        f.write('RM A51J25,7,%s,%.3f,M_prime,%.3f,p_b/p_prime,%.3f,,first (eye)\n' % (name, M, M, r))
    for M, (A, B, S) in F5.items():
        for nm, v in (('line A (Chapman compilation)', A), ('line B (dashed)', B), ('solid (Love from P_r)', S)):
            f.write('TN 3819,5,%s,%.1f,M,%.1f,P_B,%.3f,%.3f,first\n' % (nm, M, M, v, v))
    for fl, t, M, re, al, cps in X15:
        cp = sum(cps) / len(cps)
        f.write('TN D-1056,table II,flight %s t %.1f alpha %.1f Re/ft %.2fe6,%.2f,M,%.2f,Cp (P_B),%.3f,%.3f,typed once\n'
                % (fl, t, al, re, M, M, cp, cp))
print('wrote data/blunt_te_2d_base.csv')
