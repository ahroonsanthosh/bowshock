"""Base band evidence for draft 0008, as data over compiled curve (ratio of base drag), M 1.5 to 3.5.
Tunnel symbols of TN 3819 fig. 18: each of the two readings (first reading, audit) taken separately, against
both compiled curves (envelope), so the group ranges are the conservative envelope of the two readings
(they agree within 0.003 in P_B, inside the combined reading error). Herrin and Dutton and the free-flight
curve as data over curve. Curve and symbol values as in base_ratios_v2.py."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sym = [(1.503, -0.178, -0.1807), (1.500, -0.152, -0.1522), (1.630, -0.165, -0.1630), (1.630, -0.152, -0.1526),
       (1.935, -0.150, -0.1492), (1.939, -0.143, -0.1410), (2.009, -0.139, -0.1380), (2.418, -0.118, -0.1169),
       (2.414, -0.115, -0.1135), (2.681, -0.102, -0.1011), (3.243, -0.095, -0.0926), (3.497, -0.083, -0.0819)]
curve = {1.503: (-0.1774, -0.1732), 1.500: (-0.1775, -0.1733), 1.630: (-0.1717, -0.1667), 1.935: (-0.1539, -0.1486),
         1.939: (-0.1536, -0.1484), 2.009: (-0.1490, -0.1442), 2.418: (-0.1241, -0.1214), 2.414: (-0.1243, -0.1216),
         2.681: (-0.1107, -0.1088), 3.243: (-0.0885, -0.0881), 3.497: (-0.0803, -0.0803)}
groups = {'1.50-1.63': [], '1.94-2.42': [], '2.68-3.50': []}
print('M      reading  P_B      data/curve')
for M, p1, p2 in sym:
    g = '1.50-1.63' if M < 1.7 else ('1.94-2.42' if M < 2.5 else '2.68-3.50')
    for name, p in (('first', p1), ('audit', p2)):
        r = [p / c for c in curve[M]]
        groups[g] += r
        print('%.3f  %s   %.4f   %.3f to %.3f' % (M, name, p, min(r), max(r)))
allr = []
for g, v in groups.items():
    allr += v
    print('group M %s: %.3f to %.3f (%+.1f%% to %+.1f%%)' % (g, min(v), max(v), 100 * (min(v) - 1), 100 * (max(v) - 1)))
print('all tunnel points M 1.5 to 3.5: %.3f to %.3f' % (min(allr), max(allr)))
# Herrin and Dutton, M 2.46 (base_ratios_v2_output.txt: curve/data 1.130 to 1.214)
print('Herrin and Dutton M 2.46, data/curve: %.3f to %.3f' % (1 / 1.214, 1 / 1.130))
print('Free flight (TN 3819 fig. 18, no fins), M 1.06 to 1.21, data/curve: 1.027 to 1.122 (love18_ff_output.txt)')
