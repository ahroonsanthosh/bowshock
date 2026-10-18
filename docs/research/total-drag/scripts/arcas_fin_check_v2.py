"""ARCAS fin increment against the fins' own drag, with the resolved CA readings and the chamber-force change
(revision of arcas_fin_check.py for draft 0008).

CA at alpha 0: adopted value = mean of the two faired-curve readings (audit reading and d4014_curve.py), see
data/d4014/tn-d-4014_CA_alpha0_resolved.csv. Chamber force: data/d4014/tn-d-4014_fig4_chamber.csv (one reading,
second pending). Base scaling: the chamber coefficient times (1.470/1.250)^2 if the chamber pressure acts on the
whole 1.470 in base (upper bound of the base change; lower bound: chamber area only, factor 1)."""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from finwave import Fin, drag, double_wedge
from vd2 import CF_avg

cr, ct, s = 3.380, 2.165, 2.103
tc = 0.150 / cr
fin = Fin(cr, s, math.tan(math.radians(30)), 0.0, *double_wedge(tc, 1.812 / cr))
Sfin = fin.area()
Aref = math.pi * 2.25 ** 2 / 4
Re_per_in = 3.0e6 / 12.0
T0 = 339.0
cbar = Sfin / s
# adopted CA (fins off, fins on dF 0); reading errors (each)
CA = {(1, 1.5): (0.3460, 0.5343), (1, 1.8): (0.33195, 0.46895), (1, 2.3): (0.28965, 0.38005), (1, 2.96): (0.2390, 0.3048),
      (2, 1.8): (0.3683, 0.5084), (2, 2.3): (0.3253, 0.4124), (2, 2.96): (0.2651, 0.33225)}
ERR = 0.002  # per value, faired-curve readings; triangles (2.96) carry +0.004 more one-sided (symbol convention)
# chamber axial-force coefficient change, fins on (dF 0) minus fins off, and its reading error
DCH = {(1, 1.5): (0.028, 0.006), (1, 1.8): (0.021, 0.007), (1, 2.3): (0.002, 0.006), (1, 2.96): (0.0065, 0.007),
       (2, 1.8): (0.009, 0.004), (2, 2.3): (0.0055, 0.005), (2, 2.96): (0.0005, 0.005)}
scale = (1.470 / 1.250) ** 2
print('S_fin %.3f in^2, Aref %.3f in^2, t/c %.4f, base/chamber area ratio %.3f' % (Sfin, Aref, tc, scale))
own = {}
for M in (1.5, 1.8, 2.3, 2.96):
    cd3, cd2, sec = drag(fin, M, 24, 24, 24)
    Te = T0 / (1 + 0.2 * M * M)
    CF = CF_avg(Re_per_in * cbar, M, Te)
    own[M] = 4 * cd3 * Sfin / Aref + 4 * CF * 2 * Sfin / Aref
print('cfg  M     own    measured incr (+-)   own/meas   shortfall   chamber dCA,c (+-)   (own+dCA,c..x%.2f)/meas   chamber/shortfall' % scale)
for (cfg, M), (off, on) in sorted(CA.items()):
    inc = on - off
    e = math.sqrt(2) * ERR
    sf = inc - own[M]
    dch, dche = DCH[(cfg, M)]
    lo, hi = (own[M] + dch) / inc, (own[M] + dch * scale) / inc
    print('%d  %.2f  %.4f   %.4f (%.4f)      %.3f      %.4f      %.4f (%.4f)        %.2f .. %.2f              %.2f .. %.2f'
          % (cfg, M, own[M], inc, e, own[M] / inc, sf, dch, dche, lo, hi, dch / sf, dch * scale / sf))
