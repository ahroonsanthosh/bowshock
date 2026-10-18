import sys
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from vd2 import CF_avg, ks_avg
# Chapman & Kester TN 3097 Table III: CF/(CFi)exp on cylinders, adiabatic, Re 4e6-32e6
tab = [(1.99, 0.745, 0.757), (2.49, 0.671, 0.672), (2.95, 0.623, 0.630), (3.36, 0.578, 0.571), (3.60, 0.551, 0.552)]
print('M     meas(a) meas(b) | VDII CF/CFi(K-S) at Re=4e6,1e7,3e7 for T0=290 K and 330 K | (VDII/meas - 1) range')
for M, a, b in tab:
    vals = []
    for T0 in (290.0, 330.0):
        Te = T0 / (1 + 0.2 * M * M)
        for Re in (4e6, 1e7, 3e7):
            for r in (0.88, 0.89):
                vals.append(CF_avg(Re, M, Te, None, r) / ks_avg(Re))
    meas = (a, b)
    d = [v / m - 1 for v in vals for m in meas]
    print('%.2f  %.3f   %.3f   | %.4f .. %.4f | %+.1f%% .. %+.1f%%' % (M, a, b, min(vals), max(vals), 100 * min(d), 100 * max(d)))
