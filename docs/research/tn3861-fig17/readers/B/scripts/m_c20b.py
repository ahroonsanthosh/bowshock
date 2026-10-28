# Circle fit with a narrow radial window and excluded angular sectors (for circles crossed by many lines).
# usage: m_c20b.py scriptsdir page cx cy rlo rhi "a0-a1,a0-a1,..."
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2])
cx, cy, rlo, rhi = map(float, sys.argv[3:7])
excl = [tuple(map(float, s.split('-'))) for s in sys.argv[7].split(',')] if len(sys.argv) > 7 and sys.argv[7] else []
for it in range(5):
    pts = M.ray_samples(ink, cx, cy, rlo, rhi, np.arange(0, 360, 2.0), exclude=excl)
    cx, cy, R, rms, n, rej = M.fit_circle(pts)
print('centre (%.2f, %.2f) R %.2f rms %.2f n %d/%d rejected %s' % (cx, cy, R, rms, n, len(pts), [int(a) for a in rej]))
