"""Check 4 of finwave.py (audit item L4): pressure inside the tip Mach cone of a constant-slope source sheet
with an unswept leading edge and a streamwise tip at y = s. Linear theory gives
  Cp / Cp_2D = 1/2 + asin(beta (s - y) / x) / pi   for 0 <= beta (s - y) / x <= 1,
with Cp_2D = 2 lambda / beta (the integral of 1/sqrt(x^2 - beta^2 (y - eta)^2) over eta from the Mach-cone
edge to the tip). Chord 20 and span 40 keep the trailing edge and the image fin (y < 0) away from the points."""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from finwave import Fin, u_at
lam = 0.015
s = 40.0
fin = Fin(20.0, s, 0.0, 0.0, [0.0, 1.0], [0.0, lam])
worst = 0.0
for M in (1.3, 1.5, 2.0, 3.0):
    b = math.sqrt(M * M - 1)
    for x, z in ((0.5, 0.05), (1.5, 0.3), (2.5, 0.6), (5.0, 0.9), (8.0, 0.99)):
        y = s - z * x / b
        ratio = -2 * u_at(fin, b, x, y, 32) / (2 * lam / b)
        exact = 0.5 + math.asin(z) / math.pi
        worst = max(worst, abs(ratio - exact))
        print('M %.1f x %.1f beta(s-y)/x %.2f: code %.7f exact %.7f' % (M, x, z, ratio, exact))
print('max abs difference %.2e' % worst)
