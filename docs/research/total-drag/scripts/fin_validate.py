import math, sys, time
sys.path.insert(0, '.')
from finwave import Fin, section_drag, double_wedge
tc = 0.05
f, g = double_wedge(tc)
print('Test 1: unswept, very long span, section at mid span vs 2D Ackeret 4 tc^2 / beta')
for M in (1.2, 1.5, 2.0, 3.0):
    fin = Fin(1.0, 50.0, 0.0, 0.0, f, g)
    beta = math.sqrt(M*M-1)
    for n in (16, 32):
        cd = section_drag(fin, M, 25.0, nx=n, neta=n)
        print('  M=%.1f n=%d cd=%.6e exact=%.6e ratio=%.6f' % (M, n, cd, 4*tc*tc/beta, cd/(4*tc*tc/beta)))
print('Test 2: infinite swept wing, supersonic edges, section far from root: 4 tc^2 cosL / sqrt(M^2 cos^2 L - 1)')
for M, L in ((2.0, 30.0), (3.0, 45.0), (1.5, 20.0)):
    tl = math.tan(math.radians(L))
    fin = Fin(1.0, 40.0, tl, tl, f, g)
    exact = 4*tc*tc*math.cos(math.radians(L))/math.sqrt((M*math.cos(math.radians(L)))**2-1)
    for n in (16, 32):
        cd = section_drag(fin, M, 6.0, nx=n, neta=n)
        print('  M=%.1f L=%.0f n=%d cd=%.6e exact=%.6e ratio=%.6f' % (M, L, n, cd, exact, cd/exact))
