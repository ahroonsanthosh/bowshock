"""Base-drag ratios with the corrected TN 3819 fig. 18 curve readings (second reading, agreed between
love18_ransac.py and the audit's tn3819_fig18.csv within 0.0004; adopted values are the audit's curve
table, which my robust fits reproduce). Symbols: mean of my first reading and the audit's reading
(they agree within 0.003); Mach numbers from the audit's shear-corrected grid."""
import math
# (M, P_first, P_audit) for the twelve symbols at M 1.5 to 3.5
sym = [(1.503, -0.178, -0.1807), (1.500, -0.152, -0.1522), (1.630, -0.165, -0.1630), (1.630, -0.152, -0.1526),
       (1.935, -0.150, -0.1492), (1.939, -0.143, -0.1410), (2.009, -0.139, -0.1380), (2.418, -0.118, -0.1169),
       (2.414, -0.115, -0.1135), (2.681, -0.102, -0.1011), (3.243, -0.095, -0.0926), (3.497, -0.083, -0.0819)]
# corrected curve envelope at each symbol M (more negative, less negative), audit table rows
curve = {1.503: (-0.1774, -0.1732), 1.500: (-0.1775, -0.1733), 1.630: (-0.1717, -0.1667), 1.935: (-0.1539, -0.1486),
         1.939: (-0.1536, -0.1484), 2.009: (-0.1490, -0.1442), 2.418: (-0.1241, -0.1214), 2.414: (-0.1243, -0.1216),
         2.681: (-0.1107, -0.1088), 3.243: (-0.0885, -0.0881), 3.497: (-0.0803, -0.0803)}
print('symbol  M      P_B(mean)  curve envelope       data/curve (base drag ratio)')
groups = {'1.50-1.63': [], '1.94-2.42': [], '2.68-3.50': []}
for M, p1, p2 in sym:
    p = 0.5 * (p1 + p2)
    lo, hi = curve[M]
    r1, r2 = p / lo, p / hi
    g = '1.50-1.63' if M < 1.7 else ('1.94-2.42' if M < 2.5 else '2.68-3.50')
    groups[g] += [r1, r2]
    print('        %.3f  %.4f     %.4f to %.4f   %.3f to %.3f' % (M, p, lo, hi, min(r1, r2), max(r1, r2)))
for g, v in groups.items():
    print('group M %s: data/curve %.3f to %.3f  (i.e. %+.0f%% to %+.0f%%)' % (g, min(v), max(v), 100 * (min(v) - 1), 100 * (max(v) - 1)))
print()
print('OpenRocket 0.25/M against corrected curves:')
for M, (lo, hi) in ((1.5, (-0.1775, -0.1733)), (2.0, (-0.1496, -0.1447)), (2.5, (-0.1196, -0.1172)), (3.0, (-0.0978, -0.0964))):
    o = 0.25 / M
    print('  M=%.1f OR=%.4f curve=%.4f..%.4f  OR/curve-1 = %+.1f%% .. %+.1f%%' % (M, o, -hi, -lo, 100 * (o / -lo - 1), 100 * (o / -hi - 1)))
print()
g = 1.4; M = 2.46; k = 2 / (g * M * M)
# curve at 2.46 by linear interpolation between 2.4 (-0.1250, -0.1224) and 2.5 (-0.1196, -0.1172)
f = 0.6
c_hi = -(-0.1250 + f * (0.0054)); c_lo = -(-0.1224 + f * (0.0052))
print('Herrin and Dutton (M 2.46): curve CD_base %.4f to %.4f, p_b/p_inf %.3f to %.3f' % (c_lo, c_hi, 1 - c_hi / k, 1 - c_lo / k))
for name, r in (('data lo 0.553', 0.553), ('data hi 0.575', 0.575)):
    cd = -(r - 1) * k
    print('  %s: CD_base %.4f; curve/data = %.3f to %.3f' % (name, cd, c_lo / cd, c_hi / cd))
