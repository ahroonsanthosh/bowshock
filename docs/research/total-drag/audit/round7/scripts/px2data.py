"""Convert pixel positions to data values with a saved local grid calibration.

usage: python3 -I px2data.py CALIB.json x y [x y ...]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import localgrid  # noqa: E402

g = localgrid.LocalGrid.load(sys.argv[1])
v = [float(a) for a in sys.argv[2:]]
for x, y in zip(v[0::2], v[1::2]):
    a, b = g.to_data(x, y)
    print("x %.1f y %.1f -> %.4f %.5f" % (x, y, a, b))
