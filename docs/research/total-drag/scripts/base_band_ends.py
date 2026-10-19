"""The ends of 0008's base band (0.82 to 1.08), checked as 0010 section 6 item 8 asks. Data as in base_ratios_v3.py
(the twelve TN 3819 fig. 18 tunnel symbols, both readings, against both compiled curves at the symbol's Mach
number; Herrin and Dutton at M 2.46 against both curves interpolated linearly between the M 2.4 and 2.5 rows).
  1. The tunnel envelope inside the range the band is stated for (M 1.5 to 3.0) and outside it.
  2. The Herrin and Dutton low end for slide readings 0.553 to 0.575 (0008), the round-1 audit's 0.55 to 0.58
     (audit.md, verified table: "data circles 0.55 to 0.58"), and 0.575 + 0.01 (the slide reading's +-0.01)."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sym = [(1.503, -0.178, -0.1807), (1.500, -0.152, -0.1522), (1.630, -0.165, -0.1630), (1.630, -0.152, -0.1526),
       (1.935, -0.150, -0.1492), (1.939, -0.143, -0.1410), (2.009, -0.139, -0.1380), (2.418, -0.118, -0.1169),
       (2.414, -0.115, -0.1135), (2.681, -0.102, -0.1011), (3.243, -0.095, -0.0926), (3.497, -0.083, -0.0819)]
curve = {1.503: (-0.1774, -0.1732), 1.500: (-0.1775, -0.1733), 1.630: (-0.1717, -0.1667), 1.935: (-0.1539, -0.1486),
         1.939: (-0.1536, -0.1484), 2.009: (-0.1490, -0.1442), 2.418: (-0.1241, -0.1214), 2.414: (-0.1243, -0.1216),
         2.681: (-0.1107, -0.1088), 3.243: (-0.0885, -0.0881), 3.497: (-0.0803, -0.0803)}
inside, outside = [], []
for M, p1, p2 in sym:
    for name, p in (('first', p1), ('audit', p2)):
        for c in curve[M]:
            (inside if 1.5 <= M <= 3.0 else outside).append((p / c, M, name))
lo_in, hi_in = min(inside), max(inside)
print('tunnel symbols, M 1.5 to 3.0: %.4f (M %.3f, %s reading) to %.4f (M %.3f, %s reading)' % (lo_in + hi_in))
lo_out, hi_out = min(outside), max(outside)
print('tunnel symbols above M 3.0 (3.243, 3.497): %.4f (M %.3f, %s) to %.4f (M %.3f, %s)' % (lo_out + hi_out))
g = 1.4
M = 2.46
k = 2 / (g * M * M)
f = 0.6
c_more = -(-0.1250 + f * 0.0054)
c_less = -(-0.1224 + f * 0.0052)
print('Herrin and Dutton, M 2.46: curve base drag (on base area) %.4f (less negative) to %.4f (more negative)' % (c_less, c_more))
for label, r in (('0008 low reading 0.553', 0.553), ('0008 high reading 0.575', 0.575), ('audit high 0.58', 0.58),
                 ('0.575 + 0.01', 0.585)):
    cd = (1 - r) * k
    print('  %-24s: base drag %.4f; data over curve %.4f to %.4f' % (label, cd, cd / c_more, cd / c_less))
