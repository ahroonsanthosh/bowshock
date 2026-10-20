import math, sys
sys.path.insert(0, '.')
from finwave import Fin, section_drag, drag, double_wedge
tc = 0.05
f, g = double_wedge(tc)
print('Test 3: infinite swept wing with subsonic edges (M cosL < 1): section drag far from root -> 0')
for M, L in ((1.5, 60.0), (2.0, 70.0)):
    tl = math.tan(math.radians(L))
    fin = Fin(1.0, 400.0, tl, tl, f, g)
    beta = math.sqrt(M*M-1)
    for y in (20.0, 80.0):
        cd = section_drag(fin, M, y, nx=32, neta=32)
        print('  M=%.1f L=%.0f y=%.0f cd/(4tc^2/beta)=%.5f' % (M, L, y, cd/(4*tc*tc/beta)))
print('Test 4: convergence of integrated drag, rectangular fin s=c=1 and 45 deg clipped delta, M=1.5 and 2')
for name, fin in (('rect', Fin(1.0, 1.0, 0.0, 0.0, f, g)), ('clipdelta', Fin(1.0, 0.5, 1.0, 0.0, f, g))):
    for M in (1.5, 2.0):
        for n in (12, 20, 32):
            cd3, cd2, sec = drag(fin, M, ny=n, nx=n, neta=n)
            print('  %s M=%.1f n=%d CD3/CDstrip=%.5f' % (name, M, n, cd3/cd2))
