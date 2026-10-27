# explore_cross.py scriptsdir page.png  name xnear yA0 yA1 yB0 yB1  ynear xA0 xA1 xB0 xB1
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2])
args = sys.argv[3:]
name = args[0]; v = list(map(float, args[1:6])); h = list(map(float, args[6:11]))
xs = M.vstroke(ink, v[0], int(v[1]), int(v[2])) + M.vstroke(ink, v[0], int(v[3]), int(v[4]))
ys = M.hstroke(ink, h[0], int(h[1]), int(h[2])) + M.hstroke(ink, h[0], int(h[3]), int(h[4]))
a, b, rms, n = M.robust_line(xs)
c, d, rms2, n2 = M.robust_line(ys)
# intersection: x = a + b*y ; y = c + d*x
y = (c + d * a) / (1 - d * b); x = a + b * y
print(name, 'vertical x = %.2f + %.4f*y (rms %.2f, n %d)' % (a, b, rms, n), 'horizontal y = %.2f + %.4f*x (rms %.2f, n %d)' % (c, d, rms2, n2))
print(name, 'cross intersection (%.2f, %.2f)' % (x, y))
print('  vertical samples', [(t, round(s, 1)) for t, s in xs])
print('  horizontal samples', [(t, round(s, 1)) for t, s in ys])
