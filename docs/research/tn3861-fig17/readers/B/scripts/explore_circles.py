import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2])
for name, cx, cy in [('#6', 911.5, 1002.5), ('#14', 1323, 1074), ('#17', 1670, 1107.5), ('#20', 1941, 1121), ('#22', 2107, 1129), ('#24', 2160, 1129)]:
    for it in range(3):
        pts = M.ray_samples(ink, cx, cy, 11, 23, np.arange(0, 360, 2.0))
        cx, cy, R, rms, n, rej = M.fit_circle(pts)
    print(name, 'centre (%.2f, %.2f) R %.2f rms %.2f n %d' % (cx, cy, R, rms, n), 'rejected angles', rej)
