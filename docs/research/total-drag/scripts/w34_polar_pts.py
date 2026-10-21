"""Convert symbol centres read by eye on a polar-ruler crop to (beta, dP/q).
Usage: python3 -I polar_pts.py cx cy r0 s ox oy  label:x,y label:x,y ..."""
import math
import sys

cx, cy, r0, s, ox, oy = map(float, sys.argv[1:7])
for item in sys.argv[7:]:
    lab, xy = item.split(':')
    x, y = map(float, xy.split(','))
    X, Y = x + ox, y + oy
    r = math.hypot(X - cx, cy - Y)
    b = math.degrees(math.atan2(X - cx, cy - Y))
    print(f'{lab:4s} beta {b:6.1f}  dP/q {(r - r0) / s:+.3f}')
