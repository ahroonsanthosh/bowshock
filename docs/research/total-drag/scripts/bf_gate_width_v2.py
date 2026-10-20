"""Width of the B5 gate on the Basic Finner, corrected (0010 section 6, items 3 to 6). Replaces bf_gate_width.py and
bf_gate_sum.py, which are kept unchanged as the record of two errors:
  - pairing: bf_gate_width.py took the high end of the body base term as F_high times the MORE negative compiled
    curve. F is defined against Love's basic (less negative) curve (TN 3819 fig. 35's no-fin estimate reproduces it;
    0010 section 1.1), so both ends of F multiply the less negative curve; the base curve's own band (0.82 to 1.08)
    carries the difference between the two curves;
  - fin friction counted twice: bf_gate_width.py put fin friction in the friction share (0007's band) and
    bf_gate_sum.py added the fins' own drag (B4's band, which contains fin friction) on top. Here fin friction is
    in the fins' own drag only, and body friction alone carries 0007's band.
Also changed: the fins-on-base band is 0010 section 1.3's (per shot, from 0010 section 4.3's table: the tunnel
excess carried beyond M 2.41 and the +-0.005 identity-swap error), in place of love_fig35_factor.csv; the nose,
fin wave drag and momentum-integral body friction are 0010 section 4.3's computed values (src/total, adiabatic),
used as given; the wall-temperature input (0007's band holds for adiabatic walls only) is computed here with van
Driest II (vd2.py) at the wall at the air temperature, as a check of 0010's +0.0155 to +0.0241.
The tolerance on the residual (measured over modelled minus 1) is the linear sum of (band - 1) times each
component, over the modelled partial sum (0010's definition), plus the transition input (low side) and the
cluster's shot spread; the wall input is shown separately (high side). CX0 is used as a scale only, nothing is
fitted, and no band is set from these shots."""
import csv
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vd2 import CF_avg
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'friction_study.py')).read().split("print('d[mm]")[0]
fs = {}
exec(compile(src, 'friction_study_defs', 'exec'), fs)
vd_tr = fs['vd_with_transition']
curve = [(1.5, -0.1775, -0.1733), (1.63, -0.1717, -0.1667), (1.8, -0.1625, -0.1569), (1.935, -0.1539, -0.1486),
         (2.0, -0.1496, -0.1447), (2.2, -0.1367, -0.1331), (2.4, -0.1250, -0.1224), (2.5, -0.1196, -0.1172),
         (2.681, -0.1107, -0.1088), (2.8, -0.1055, -0.1039), (3.0, -0.0978, -0.0964)]
def pb(M):
    M = max(M, 1.5)
    for (m1, a1, b1), (m2, a2, b2) in zip(curve, curve[1:]):
        if m1 <= M <= m2:
            f = (M - m1) / (m2 - m1)
            return a1 + f * (a2 - a1), b1 + f * (b2 - b1)
# 0010 section 4.3, per shot: nose, body friction, fin friction, fin wave drag, body base, F, F_low, F_high,
# transition input, wall input, partial sum, 0010's tolerance (lo, hi, hi with the wall)
T10 = {1.799: (0.1105, 0.0804, 0.0360, 0.0204, 0.2177, 1.387, 1.237, 1.537, -0.0301, 0.0155, 0.4651, -25.2, 21.3, 24.6),
       1.846: (0.1090, 0.0791, 0.0355, 0.0198, 0.2085, 1.353, 1.212, 1.495, -0.0292, 0.0160, 0.4518, -24.9, 21.1, 24.6),
       1.850: (0.1088, 0.0792, 0.0355, 0.0197, 0.2077, 1.350, 1.209, 1.491, -0.0292, 0.0160, 0.4509, -24.9, 21.1, 24.6),
       2.348: (0.0968, 0.0688, 0.0309, 0.0150, 0.1554, 1.242, 1.111, 1.373, -0.0235, 0.0204, 0.3669, -22.9, 22.3, 27.8),
       2.364: (0.0965, 0.0686, 0.0308, 0.0149, 0.1545, 1.243, 1.113, 1.373, -0.0234, 0.0206, 0.3654, -22.8, 22.2, 27.8),
       2.414: (0.0956, 0.0675, 0.0303, 0.0146, 0.1516, 1.247, 1.121, 1.373, -0.0228, 0.0209, 0.3596, -22.5, 21.9, 27.7),
       2.663: (0.0917, 0.0632, 0.0285, 0.0132, 0.1408, 1.285, 1.136, 1.433, -0.0209, 0.0226, 0.3373, -28.2, 23.5, 30.2),
       2.741: (0.0906, 0.0618, 0.0278, 0.0128, 0.1373, 1.291, 1.141, 1.441, -0.0203, 0.0230, 0.3303, -28.2, 23.5, 30.5),
       2.749: (0.0905, 0.0617, 0.0278, 0.0127, 0.1369, 1.292, 1.141, 1.442, -0.0203, 0.0231, 0.3297, -28.2, 23.5, 30.5),
       2.969: (0.0878, 0.0580, 0.0261, 0.0118, 0.1272, 1.304, 1.146, 1.462, -0.0187, 0.0241, 0.3110, -21.7, 20.2, 28.0),
       2.970: (0.0878, 0.0580, 0.0262, 0.0118, 0.1272, 1.304, 1.146, 1.463, -0.0188, 0.0241, 0.3110, -21.7, 20.2, 28.0)}
SPREAD = [(1.79, 1.86, -3.3, 2.0), (2.34, 2.42, -2.2, 3.4), (2.66, 2.75, -7.6, 4.5), (2.96, 2.98, -1.2, 1.2)]
B_FRIC, B_BASE, B_FINS, B_NOSE = (0.88, 1.19), (0.82, 1.08), (1.01, 1.59), 7e-5
rows = [r for r in csv.DictReader(l for l in open('data/basic_finner_ada636861.csv') if not l.startswith('#'))]
S_body, S_fin, Aref = 4.530 + 22.494, 8.0, math.pi / 4
T = 343.7 ** 2 / (1.4 * 287.05)
print('Shares of CX0 (the scale 0008 section 6.3 used), flat-plate VDII adiabatic for the frictions (this script):')
print('M      CX0    body fr  fin fr  fins own  nose    base(F mid)  F-band half  v1 half(err)  wall: dCDf  (0010)  transition 5e5/1.6e6/3e6')
acc = {}
for r in rows:
    M = float(r['M'])
    if r['use'] != 'Y' or M < 1.79:
        continue
    cx = float(r['CX0'])
    ReL = float(r['Re'])
    nose, bfr10, ffr10, fwave, base10, F, Flo, Fhi, tr10, wall10, part10 = T10[M][:11]
    cfb, cff = CF_avg(ReL, M, T), CF_avg(ReL / 10, M, T)
    body, fin = cfb * S_body / Aref, cff * S_fin / Aref
    cold = (CF_avg(ReL, M, T, Tw=T) * S_body + CF_avg(ReL / 10, M, T, Tw=T) * S_fin) / Aref - body - fin
    dtr = [(vd_tr(ReL, ReT, M, T) * S_body + vd_tr(ReL / 10, ReT, M, T) * S_fin) / Aref - body - fin
           for ReT in (5e5, 1.6e6, 3e6)]
    p_more, p_less = pb(M)
    base_mid = -p_less * F
    half = -p_less * 0.5 * (Fhi - Flo)
    # v1's construction: low end -p_less F_low, high end -p_more F_high (the pairing error), half the difference
    v1_half = 0.5 * (-p_more * Fhi - -p_less * Flo)
    acc[M] = dict(cx=cx, body=body, fin=fin)
    print('%.3f  %.3f  %4.1f%%   %4.1f%%   %4.1f%%    %4.1f%%   %4.1f%%        +-%.1f%%       +-%.1f%%        %+.4f  (%+.4f)  %s'
          % (M, cx, 100 * body / cx, 100 * fin / cx, 100 * (fin + fwave) / cx, 100 * nose / cx, 100 * base_mid / cx,
             100 * half / cx, 100 * v1_half / cx, cold, wall10, ' / '.join('%+.1f%%' % (100 * d / cx) for d in dtr)))
print()
print('Tolerance on the residual, over the modelled partial sum (0010 section 4.3 components and bands; body base band'
      ' = curve band on the term + fins-on-base band, interpolation bound neglected here):')
print('M      partial  lo      hi      hi+wall  | 0010: lo     hi     hi+wall | same with this script\'s flat-plate frictions: partial  lo  hi')
for M, v in T10.items():
    nose, bfr, ffr, fwave, base, F, Flo, Fhi, tr, wall, part, tlo, thi, thw = v
    sp = [s for s in SPREAD if s[0] <= M <= s[1]][0]
    def tol(bfr, ffr, part):
        lo = (bfr * (B_FRIC[0] - 1) + (ffr + fwave) * (B_FINS[0] - 1) + base * (B_BASE[0] - 1) + base * (Flo - F) / F
              - B_NOSE + tr) / part
        hi = (bfr * (B_FRIC[1] - 1) + (ffr + fwave) * (B_FINS[1] - 1) + base * (B_BASE[1] - 1) + base * (Fhi - F) / F
              + B_NOSE) / part
        return 100 * lo + sp[2], 100 * hi + sp[3], 100 * (hi + wall / part) + sp[3]
    lo, hi, hw = tol(bfr, ffr, part)
    a = acc[M]
    part2 = nose + a['body'] + a['fin'] + fwave + base
    lo2, hi2, _ = tol(a['body'], a['fin'], part2)
    print('%.3f  %.4f   %+.1f%%  %+.1f%%  %+.1f%%   |       %+.1f%%  %+.1f%%  %+.1f%%  |   %.4f  %+.1f%%  %+.1f%%'
          % (M, part, lo, hi, hw, tlo, thi, thw, part2, lo2, hi2))
print('(the interpolation bound, at most 2.4e-4 in P_B at the gated shots (0010 section 1.1), is left out here, which'
      ' accounts for differences of 0.1 point)')
