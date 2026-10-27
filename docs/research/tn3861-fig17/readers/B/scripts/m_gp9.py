# Triangle 9: right side lies on the Mc = 2.0 grid line. Grid-alone profile from rows below the triangle that the lower
# fairing curve does not cross; then the triangle's vertices from the hypotenuse fit.
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2])
for ref in ([(1082, 1120)], [(1085, 1098)], [(985, 1000)]):
    xr, extra, g = M.residual_stroke(ink, 'v', 964, 979, ref, [(1045, 1050), (1054, 1062)])
    print('ref rows', ref, 'grid alone %.2f, extra ink %.2f at x %.2f' % (g, extra, xr))
b = M.side(ink, 'h', 1064.1, [(946, 966)])
pts = M.perp_samples(ink, (944, 1063), (969, 1039), half=4, step=0.5, trim=0.2)
m, d, rms, n = M.fit_line_xy(pts)
for xr in (971.6, 972.0, 972.25, 972.7):
    vt = M.intersect(m, d, np.array([xr, 0.0]), np.array([0.0, 1.0])); vl = M.intersect(m, d, np.array([0.0, b[0]]), np.array([1.0, 0.0]))
    print('right %.2f: top y %.2f left x %.2f legs %.2f x %.2f centroid (%.2f, %.2f)' % (xr, vt[1], vl[0], xr - vl[0], b[0] - vt[1], (vl[0] + 2 * xr) / 3, (vt[1] + 2 * b[0]) / 3))
