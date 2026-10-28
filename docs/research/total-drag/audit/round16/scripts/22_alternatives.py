# Data values of the alternative readings named in method.md.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
C = __import__('13_calib'); C.load(sys.argv[1])
alts = [
 ('x/c 0.8 lower symbol, apex at the crossing of its fitted sides (row 1503.72, rejected)', 538.6, (1503.72 + 2 * 1521.14) / 3),
 ('x/c 0.8 lower symbol, h = 11 px', 538.15, 1521.14 - 11 / 3),
 ('x/c 0.8 lower symbol, h = 17 px', 538.15, 1521.14 - 17 / 3),
 ('x/c 0.8 single tall symbol only (apex 1502.0, base 1521.14)', 538.4, (1502.0 + 2 * 1521.14) / 3),
 ('faired curve left end, row 1799.5', 409.0, 1799.5),
 ('faired curve left end, row 1803.5', 409.0, 1803.5),
 ('mid point of the two x/c 1.0 symbol centroids', 409.8, (1778.62 + 1822.67) / 2),
]
for name, px, py in alts:
    d = C.to_data(px, py)
    print('%-80s x/c %.4f  P_B %.4f' % (name, d['x'], d['y']))
