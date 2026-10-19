"""Expected width of the B5 gate on the Basic Finner (draft 0008), per gated shot (M 1.80 to 2.97, DBSQ <= 5).
Not a prediction of the Basic Finner: only the two terms that set the input and fins-on-base widths are computed.
- Friction: flat-plate VDII (vd2.py), adiabatic, Karman-Schoenherr; body as a plate of the body length (Re_L from
  Table V on 0.300 m) over the cone slant area plus the cylinder (4.530 + 22.494 cal^2, from fig. 2: cone 2.84 cal
  long, radius 0.5 cal, cylinder 7.16 cal), fins as plates of 1 cal chord (Re_L/10) over 8 cal^2 (4 fins, both
  faces); on the cross-section pi/4 cal^2. Static temperature from Table V's speed of sound, T = a^2/(1.4 x 287.05).
  Transition input: laminar run to Re_T 5e5, 1.6e6, 3e6 (friction_study.py's virtual-origin method).
- Body base term: the compiled curve (data/love_tn3819_fig18.csv, both curves, linear in M) times the fins-on-base
  factor F (section 3.3 of the draft; F_low, F_high from data/love_fig35_tn3819.csv), base area = cross-section.
Shares are expressed against the measured CX0 of each shot (only as a scale; nothing is fitted)."""
import csv
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
from vd2 import CF_avg
spec = importlib.util.spec_from_file_location('fs', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'friction_study.py'))
src = open(spec.origin).read().split("print('d[mm]")[0]
fs = {}
exec(compile(src, 'friction_study_defs', 'exec'), fs)
vd_tr = fs['vd_with_transition']
curve = [(1.5, -0.1775, -0.1733), (1.63, -0.1717, -0.1667), (1.8, -0.1625, -0.1569), (1.935, -0.1539, -0.1486),
         (2.0, -0.1496, -0.1447), (2.2, -0.1367, -0.1331), (2.4, -0.1250, -0.1224), (2.5, -0.1196, -0.1172),
         (2.681, -0.1107, -0.1088), (2.8, -0.1055, -0.1039), (3.0, -0.0978, -0.0964)]
def pb(M):
    for (m1, a1, b1), (m2, a2, b2) in zip(curve, curve[1:]):
        if m1 <= M <= m2:
            f = (M - m1) / (m2 - m1)
            return a1 + f * (a2 - a1), b1 + f * (b2 - b1)
# fins-on-base factor band for the Basic Finner (t/c 0.08 at the trailing edge), from love_fig35_tn3819.csv
Fband = [(float(r['M']), float(r['F_low_basic_finner']), float(r['F_high_basic_finner']))
         for r in csv.DictReader(l for l in open('data/love_fig35_factor.csv') if not l.startswith('#'))]
def F(M):
    M = max(M, Fband[0][0])  # the M 1.799 shot takes the M 1.80 value
    for (m1, l1, h1), (m2, l2, h2) in zip(Fband, Fband[1:]):
        if m1 <= M <= m2:
            f = (M - m1) / (m2 - m1)
            return l1 + f * (l2 - l1), h1 + f * (h2 - h1)
rows = [r for r in csv.DictReader(l for l in open('data/basic_finner_ada636861.csv') if not l.startswith('#'))]
S_body, S_fin, Aref = 4.530 + 22.494, 8.0, math.pi / 4
print('M      CX0    CDf_turb  share  | transition ReT 5e5 / 1.6e6 / 3e6: dCDf (% of CX0)   | base |PB|xF: lo..hi  half-band (% of CX0)')
summ = []
for r in rows:
    M = float(r['M'])
    if r['use'] != 'Y' or M < 1.79:
        continue
    cx = float(r['CX0']); ReL = float(r['Re'])
    T = 343.7 ** 2 / (1.4 * 287.05)
    cf_b = CF_avg(ReL, M, T); cf_f = CF_avg(ReL / 10, M, T)
    cdf = (cf_b * S_body + cf_f * S_fin) / Aref
    dtr = []
    for ReT in (5e5, 1.6e6, 3e6):
        cb = vd_tr(ReL, ReT, M, T); cfn = vd_tr(ReL / 10, ReT, M, T)
        dtr.append((cb * S_body + cfn * S_fin) / Aref - cdf)
    p_more, p_less = pb(M)
    flo, fhi = F(M)
    blo, bhi = -p_less * flo, -p_more * fhi
    half = 0.5 * (-(p_more + p_less) / 2) * (fhi - flo)
    summ.append((M, 100 * cdf / cx, [100 * d / cx for d in dtr], 100 * half / cx, 100 * 0.5 * (blo + bhi) / cx))
    print('%.3f  %.3f  %.4f   %4.1f%% | %s | %.3f..%.3f  %.1f%%' % (M, cx, cdf, 100 * cdf / cx,
          ' / '.join('%+.4f (%+.1f%%)' % (d, 100 * d / cx) for d in dtr), blo, bhi, 100 * half / cx))
print('friction share of CX0: %.0f%% to %.0f%%' % (min(s[1] for s in summ), max(s[1] for s in summ)))
print('transition input, Re_T 5e5 to 3e6: %.1f%% to %.1f%% of CX0' % (min(min(s[2]) for s in summ), max(max(s[2]) for s in summ)))
print('body base term (mid F) share of CX0: %.0f%% to %.0f%%' % (min(s[4] for s in summ), max(s[4] for s in summ)))
print('fins-on-base half-band: +-%.1f%% to +-%.1f%% of CX0' % (min(s[3] for s in summ), max(s[3] for s in summ)))
