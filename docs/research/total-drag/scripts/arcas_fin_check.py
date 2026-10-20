import math, sys
sys.path.insert(0, '/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/drag-research/scripts')
from finwave import Fin, drag, double_wedge
from vd2 import CF_avg
# ARCAS half-scale model fin (TN D-4014 fig. 1(b)): root 3.380 in, tip 2.165 in, span 2.103 in,
# LE sweep 30 deg, TE unswept, ridge 15 deg swept (root ridge at 1.812 in from LE = 0.536 c),
# thickness 0.150 in at root, 0.096 at tip => t/c = 0.0444. Four fins. Body d = 2.250 in.
cr, ct, s = 3.380, 2.165, 2.103
tc = 0.150 / cr
fin = Fin(cr, s, math.tan(math.radians(30)), 0.0, *double_wedge(tc, 1.812 / cr))
Sfin = fin.area()
Aref = math.pi * 2.25 ** 2 / 4
Re_per_in = 3.0e6 / 12.0
T0 = 339.0  # K, TN D-4014 test-conditions table (M 1.5 to 2.96)
cbar = Sfin / s
meas = {1.5: (0.5355 - 0.3475,), 1.8: (0.4707 - 0.3334, 0.505 - 0.369), 2.3: (0.382 - 0.2900, 0.4097 - 0.3245), 2.96: (0.3083 - 0.2424, 0.335 - 0.269)}
print('S_fin = %.3f in^2 each, Aref = %.3f in^2, t/c = %.4f' % (Sfin, Aref, tc))
for M in (1.5, 1.8, 2.3, 2.96):
    cd3, cd2, sec = drag(fin, M, 24, 24, 24)
    Te = T0 / (1 + 0.2 * M * M)
    # fully turbulent from LE (trip 0.5 in aft of fin LE ignored), on mean geometric chord
    CF = CF_avg(Re_per_in * cbar, M, Te)
    dCA_wave = 4 * cd3 * Sfin / Aref
    dCA_fric = 4 * CF * 2 * Sfin / Aref
    print('M=%.2f linear3D fin wave cd=%.5f (3D/strip %.3f)  dCA_wave=%.4f  CF=%.5f dCA_fric=%.4f  sum=%.4f  measured dCA (cfg1, cfg2) = %s' % (
        M, cd3, cd3 / cd2, dCA_wave, CF, dCA_fric, dCA_wave + dCA_fric, ', '.join('%.3f' % v for v in meas[M])))
