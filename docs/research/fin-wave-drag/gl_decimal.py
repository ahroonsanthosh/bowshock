"""Gauss-Legendre nodes and weights for n = 24 (first three) in 50-digit decimal."""
from decimal import Decimal, getcontext
import math
getcontext().prec = 50


def leg(n, x):
    p0, p1 = Decimal(1), x
    for k in range(2, n + 1):
        p0, p1 = p1, ((2 * k - 1) * x * p1 - (k - 1) * p0) / k
    return p1, p0


for n, idx in ((24, (0, 1, 2)), (5, (0, 1))):
    for i in idx:
        x = Decimal(-math.cos(math.pi * (i + 0.75) / (n + 0.5)))
        for _ in range(60):
            pn, pm = leg(n, x)
            dp = n * (pm - x * pn) / ((1 - x) * (1 + x))
            x -= pn / dp
        pn, pm = leg(n, x)
        dp = n * (pm - x * pn) / ((1 - x) * (1 + x))
        w = 2 / ((1 - x) * (1 + x) * dp * dp)
        print(n, i, str(x)[:24], str(w)[:24])
