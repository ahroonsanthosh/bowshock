"""Drag of rounded and blunt fin leading edges at M 1.5 to 3: the data a model would be measured on (task 2(b)).
FIRST READINGS; second readings pending.
  A. TN 2960 (Gowen and Perkins 1953): circular cylinder normal to the stream. Total pressure drag, fig. 7 first
     reading (tn2960_fig7_first_reading.txt); front and rear sides from fig. 5(c) (tn2960_fig5c.py, integration
     output tn2960_fig5c_integration_output.txt), against modified Newtonian on the front side, (2/3) Cp_pitot.
  B. RM A55H31: yawed cylinder, M 3.9, front-side pressure drag; eq. (14), (CD)_L/(CD)_0 = (p_x=0/p_t2) cos L,
     with p_x=0 the pitot pressure of the normal Mach number M cos L (Rayleigh; isentropic stagnation when M cos L
     < 1, an extrapolation of the equation) and p_t2 the pitot pressure at M. Checked against the text (40% at 45 deg;
     front-side pressure drag down 60% at 44 deg of yaw, M 3.9), then evaluated at M 1.5 to 3 as theory only.
  C. RM A53D02 fig. 17: square-cut ("blunt", fig. 1(c)) against sharp leading edges on 71.6 deg fins; readings by
     eye on img/a53/f17_lo.png and f17_hi.png (a53d02_fig17.py ruler mode). Scale for comparison: the swept face at
     the stagnation pressure of the normal Mach number times cos^2 of the sweep (independence principle), on the
     faces' frontal area (four fins, mean thickness 0.0225 in, exposed span 0.125 in; reference area the 0.25 in
     body's cross-section), computed here, a scale and not a model.
Gas: gamma = 1.4."""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tn2960_fig5c as f5

G = 1.4


def pitot_ratio(M):
    """p_t2/p_inf: Rayleigh above M 1, isentropic below."""
    if M <= 1.0:
        return (1 + 0.5 * (G - 1) * M * M) ** (G / (G - 1))
    a = ((G + 1) * M * M / 2) ** (G / (G - 1))
    b = ((G + 1) / (2 * G * M * M - (G - 1))) ** (1 / (G - 1))
    return a * b


def cp0(M):
    return (pitot_ratio(M) - 1) / (0.5 * G * M * M)


print('=== A. TN 2960, 1 in circular cylinder normal to the stream (Ames 1 by 3 ft tunnels; supersonic Re 1e5 to'
      ' 1e6 on diameter, "no effects of Reynolds number" found, summary p. 1)')
fig7 = {1.483: 1.487, 1.951: 1.424, 2.897: 1.346}
print('  fig. 7 (total pressure drag), first reading: ' + ', '.join('M %.3f CD %.3f' % kv for kv in fig7.items())
      + ' (merged symbol clusters, centres of the boxes; text p. 1: "about 1.34 at a Mach number of 2.9")')
for M, r in f5.READ.items():
    pts = sorted(r.items())
    fr = f5.trap([q for q in pts if q[0] <= 90])
    re = f5.trap([q for q in pts if q[0] >= 90])
    newt = 2.0 / 3.0 * cp0(M)
    print('  M %.2f: fig. 5(c) integrated: front %.3f, rear %.3f, total %.3f; modified Newtonian front (2/3)Cp_pitot'
          ' %.3f (Cp_pitot %.3f); front measured over modelled %.3f; Newtonian 4/3 over the front %.3f'
          % (M, fr, re, fr + re, newt, cp0(M), fr / newt, (4 / 3) / fr))

print()
print('=== B. RM A55H31 eq. (14): front-side pressure drag of a yawed (swept) cylinder over the unyawed value')
def eq14(M, L):
    Mn = M * math.cos(math.radians(L))
    return pitot_ratio(Mn) / pitot_ratio(M) * math.cos(math.radians(L)), Mn
for L in (44.0, 45.0):
    r, Mn = eq14(3.9, L)
    print('  M 3.9, sweep %.0f deg: ratio %.3f (normal Mach %.2f); text: 40%% at 45 deg (p. 15), 60%% reduction at'
          ' 44 deg (summary)' % (L, r, Mn))
print('  cos^3 at 45 deg (the stated high-Mach limit): %.3f' % math.cos(math.radians(45)) ** 3)
print('  theory only at M 1.5 to 3 (not measured there; * marks a subsonic normal Mach number, where eq. (14) is'
      ' extrapolated with the isentropic stagnation pressure):')
print('  sweep:   ' + '  '.join('%5.0f' % L for L in (0, 15, 30, 45, 60, 71.6)))
for M in (1.5, 2.0, 2.5, 3.0, 3.9):
    cells = []
    for L in (0, 15, 30, 45, 60, 71.6):
        r, Mn = eq14(M, L)
        cells.append('%5.3f%s' % (r, '*' if Mn < 1 else ' '))
    print('  M %.1f:   %s' % (M, ' '.join(cells)))

print()
print('=== C. RM A53D02 fig. 17, free flight, natural transition (R_T about 1.6e6), total CD on the base area')
# (M, CD of the blunt-edge circle, CD of the basic line at that M), by eye
C17 = [(0.967, 0.427, None), (2.33, 0.428, 0.4005), (2.98, 0.349, 0.322), (2.98, 0.338, 0.322), (2.98, 0.324, 0.322),
       (3.44, 0.319, 0.2785), (3.76, 0.256, 0.251), (4.01, 0.259, 0.233), (4.11, 0.260, 0.2255), (5.00, 0.186, 0.175)]
print('  (the basic line at M 0.97 rises almost vertically, so no increment is read there)')
area = 4 * 0.0225 * 0.125 / (math.pi * 0.125 ** 2)
lam = 71.6
for M, cb, cl in C17:
    if cl is None:
        print('  M %.2f: blunt %.3f' % (M, cb))
        continue
    Mn = M * math.cos(math.radians(lam))
    scale = cp0(Mn) * math.cos(math.radians(lam)) ** 2 * area
    print('  M %.2f: blunt %.3f, basic line %.4f, increment %+.3f (%+.0f%% of the basic CD); swept-face scale %.4f'
          ' (normal Mach %.2f)' % (M, cb, cl, cb - cl, 100 * (cb - cl) / cl, scale, Mn))
inc = [cb - cl for M, cb, cl in C17 if cl is not None and 1.5 <= M <= 3.0]
print('  M 1.5 to 3.0: increments %+.3f to %+.3f (%d points); frontal-area ratio of the four faces %.3f'
      % (min(inc), max(inc), len(inc), area))

with open('data/le_bluntness.csv', 'w') as f:
    f.write('# Drag of rounded and blunt fin leading edges, M 1.5 to 3 (first readings; second pending).\n'
            '# Written by scripts/le_bluntness.py; sources, calibrations and limits in data/le_bluntness.md.\n'
            'source,figure,item,M,x_name,x,quantity,value,reading\n')
    for M, cd in fig7.items():
        f.write('TN 2960,7,cylinder normal to stream (symbol cluster),%.3f,M,%.3f,CD (pressure drag on diameter),%.3f,first\n' % (M, M, cd))
    for M, r in f5.READ.items():
        for th, p in sorted(r.items()):
            f.write('TN 2960,5(c),faired curve,%.2f,theta deg,%d,P (pressure coefficient),%.3f,first (eye)\n' % (M, th, p))
        pts = sorted(r.items())
        fr = f5.trap([q for q in pts if q[0] <= 90])
        re = f5.trap([q for q in pts if q[0] >= 90])
        f.write('TN 2960,5(c) integrated,front side,%.2f,,,CD front,%.3f,computed\n' % (M, fr))
        f.write('TN 2960,5(c) integrated,rear side,%.2f,,,CD rear,%.3f,computed\n' % (M, re))
    for M, cb, cl in C17:
        f.write('RM A53D02,17,blunt (square-cut) leading edge symbol,%.2f,M,%.2f,CD total (base area),%.3f,first (eye)\n' % (M, M, cb))
        if cl is not None:
            f.write('RM A53D02,17,basic configuration line,%.2f,M,%.2f,CD total (base area),%.4f,first (eye)\n' % (M, M, cl))
print('wrote data/le_bluntness.csv')
