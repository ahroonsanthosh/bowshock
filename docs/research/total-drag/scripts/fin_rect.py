import math, sys
sys.path.insert(0, '.')
from finwave import Fin, section_drag, double_wedge
tc = 0.05
for ridge in (0.5, 0.3):
    f, g = double_wedge(tc, ridge)
    fin = Fin(1.0, 1.0, 0.0, 0.0, f, g)
    M = 2.0; beta = math.sqrt(3.0)
    # 2D section drag for this ridge: (4/beta) <lambda^2> with lambda = +-(tc/2)/ridge, (tc/2)/(1-ridge)
    l1 = (tc/2)/ridge; l2 = (tc/2)/(1-ridge)
    cd2 = (4/beta)*(l1*l1*ridge + l2*l2*(1-ridge))
    out = []
    for y in (0.5, 0.75, 0.9, 0.95, 0.99):
        out.append('y=%.2f:%.4f' % (y, section_drag(fin, M, y, 32, 32)/cd2))
    print('ridge', ridge, ' '.join(out))
