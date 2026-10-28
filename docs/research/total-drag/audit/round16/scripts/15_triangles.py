# Triangle symbols: apex from the intersection of the two side centre lines, base from the
# base centre line (or a stated band when the base is hidden), centroid = mean of the apex
# and the two base corners (one third of the height above the base). Monte Carlo over the
# side-line fits (each scan-line centroid perturbed by the fit rms, 2000 draws) and over the
# base value gives the centring spread. Writes readings/triangles.json.
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
L = __import__('08_linefit')
C = __import__('13_calib')
img, gf, out = sys.argv[1], sys.argv[2], sys.argv[3]
L.load(img); C.load(gf)
rng = np.random.default_rng(32)
def R(n0, n1): return list(range(n0, n1 + 1))
# name, legend meaning, left (p0, p1, lines, hw), right (...), base: ('meas', cols list, rough y) or
# ('band', lo, hi) or ('height', h, dh) [centroid from base and an assumed height]
T = {
 'T10u': dict(left=((405.2, 1777), (402.4, 1782), R(1777, 1782), 1.5), right=((415.5, 1777), (419.5, 1782), R(1777, 1782), 2),
              base=('value', 1783.75, 0.3, 'columns 413-417 rows 1782-1786 (right of frame; left of frame faint)')),
 'T10l': dict(left=((404.5, 1819), (401.2, 1825), R(1819, 1825), 1.5), right=((413.2, 1818), (417.3, 1825), R(1818, 1825), 2),
              base=('meas', [403, 404, 405, 406], 1828.4, 2, 'columns 403-406 left of the frame (right of frame it merges with gridline -0.06)')),
 'T08u': dict(left=((535, 1504), (532.5, 1508), R(1504, 1508), 1.5), right=((540, 1504), (542.3, 1508), R(1504, 1508), 1.5),
              base=('value', 1511.9, 0.7, 'hidden under curve and gridline -0.16; right part x 541-545 seen after gridline subtraction')),
 'T08l': dict(left=((533.6, 1514), (531, 1520), R(1514, 1520), 1.5), right=((543.2, 1514), (545.4, 1520), R(1514, 1520), 1.5),
              base=('meas', [534, 535, 536, 540, 541, 542, 543], 1521, 3, 'columns 534-543'), apex=('height', 14.0, 3.0)),
 'T06u': dict(left=((661.5, 1502), (658.4, 1507), R(1502, 1507), 1.5), right=((668.3, 1501), (672, 1508), R(1501, 1508), 1.5),
              base=('value', 1509.5, 1.5, 'hidden in the band of curve and gridline -0.16, rows 1508-1511')),
 'T06l': dict(left=((662.2, 1515), (658, 1523), R(1515, 1523), 1.5), right=((667, 1516), (671.7, 1523), R(1516, 1523), 1.5),
              base=('meas', [660, 661, 662, 663, 668, 669], 1525, 3, 'columns 660-663, 668-669')),
 'T04u': dict(left=((790.4, 1464), (786, 1472), R(1464, 1472), 1.5), right=((799.5, 1470), (800.6, 1472), R(1470, 1472), 1.5),
              base=('value', 1474.5, 1.5, 'hidden in the faired curve, rows 1473-1477')),
 'T04l': dict(left=((789.5, 1478), (785.6, 1484), R(1478, 1484), 1.5), right=((797.5, 1478), (800.3, 1484), R(1478, 1484), 1.5),
              base=('meas', [789, 790, 791, 796, 797, 798], 1485.5, 3, 'columns 789-791, 796-798')),
 'T02u': dict(left=((918, 1481), (914.3, 1487), R(1481, 1487), 1.5), right=((926, 1483), (928.3, 1487), R(1483, 1487), 1.5),
              base=('value', 1490.0, 1.5, 'hidden in the faired curve and the lower triangle, rows 1488.5-1491.5')),
 'T02l': dict(left=((916.6, 1493), (914.5, 1497), R(1493, 1497), 1.5), right=((926.6, 1493), (929, 1497), R(1493, 1497), 1.5),
              base=('meas', [917, 918, 919, 924, 925, 926], 1499, 3, 'columns 917-919, 924-926')),
 'T00u': dict(left=((1045.6, 1488), (1042.5, 1493), R(1488, 1493), 1.2), right=((1051.9, 1488), (1055.5, 1494), R(1488, 1494), 1.2),
              base=('value', 1496.3, 0.5, 'columns 1056-1057 at the right corner; left part merges with the curve end')),
 'T00l': dict(left=((1046.6, 1491), (1041.3, 1500), [1491, 1492, 1493, 1494, 1497, 1498, 1499, 1500], 1.2),
              right=((1050.2, 1491), (1055.2, 1500), [1491, 1492, 1493, 1494, 1498, 1499, 1500], 1.2),
              base=('meas', [1044, 1045, 1046, 1051, 1052, 1053], 1501.8, 3, 'columns 1044-1046, 1051-1053')),
 'KEYopen': dict(left=((982.5, 1833), (977, 1842), R(1833, 1842), 3), right=((988, 1833), (993.5, 1842), R(1833, 1842), 3),
              base=('meas', list(range(981, 991)), 1844.8, 3, 'columns 981-990')),
 'KEYflag': dict(left=((983.2, 1872), (976.5, 1882), R(1874, 1882), 3), right=((988, 1873), (993, 1881), R(1874, 1882), 3),
              base=('meas', list(range(980, 992)), 1884.7, 3, 'columns 980-991')),
}
FLAGS = {
 'F10': ((413.8, 1805.5), (410.6, 1808.6), R(1805, 1808), 1.5),
 'F08': ((544.5, 1497), (541, 1500), R(1497, 1500), 1.5),
 'F06': ((673.5, 1490), (669.5, 1494), R(1490, 1494), 1.5),
 'F04': ((802, 1464.5), (795.5, 1470), R(1464, 1470), 1.5),
 'F02': ((929, 1471), (923.5, 1475), R(1471, 1474), 1.5),
 'F00': ((1055.5, 1480), (1052.6, 1483), R(1480, 1483), 1.5),
 'FKEY': ((990, 1864), (987, 1868), R(1864, 1868), 1.5),
}
def fit_rows(spec):
    p0, p1, lines, hw = spec
    return L.stroke('rows', p0, p1, lines, hw, verbose=False)
def refit(f, noise):
    t = np.array(f['t']); c = np.array(f['c']) + rng.normal(0, noise, len(f['t']))
    b, a = np.polyfit(t, c, 1); return a, b
res = {}
for name, t in T.items():
    fl, fr = fit_rows(t['left']), fit_rows(t['right'])
    b = t['base']
    if b[0] == 'meas':
        cols, ry, hw, why = b[1], b[2], b[3], b[4]
        cs = []
        for x in cols:
            s = L.stroke('cols', (x, ry), (x + 1, ry), [x], hw, verbose=False)
            cs.append(s['c'][0])
        base, base_sd = float(np.median(cs)), float(max(np.std(cs), 0.15))
        bnote = why + '; centroids ' + ' '.join('%.2f' % c for c in cs)
    else:
        base, base_sd, bnote = b[1], b[2], b[3]
    draws = []
    for k in range(2000):
        al, bl = refit(fl, max(fl['rms'], 0.15)); ar, br = refit(fr, max(fr['rms'], 0.15))
        yb = base + rng.normal(0, base_sd)
        ya = (ar - al) / (bl - br); xa = al + bl * ya
        xl, xr = al + bl * yb, ar + br * yb
        if 'apex' in t:
            h = t['apex'][1] + rng.normal(0, t['apex'][2])
            cy = yb - h / 3; cx = (xl + xr) / 2
        else:
            cy = (ya + 2 * yb) / 3; cx = (xa + xl + xr) / 3
        draws.append((cx, cy, xa, ya, xl, xr, yb))
    d = np.array(draws)
    med = np.median(d, axis=0); sd = np.std(d, axis=0)
    # nominal (no noise)
    ya0 = (fr['a'] - fl['a']) / (fl['b'] - fr['b']); xa0 = fl['a'] + fl['b'] * ya0
    xl0, xr0 = fl['a'] + fl['b'] * base, fr['a'] + fr['b'] * base
    if 'apex' in t:
        cy0 = base - t['apex'][1] / 3; cx0 = (xl0 + xr0) / 2
    else:
        cy0 = (ya0 + 2 * base) / 3; cx0 = (xa0 + xl0 + xr0) / 3
    res[name] = dict(cx=cx0, cy=cy0, cx_sd=float(sd[0]), cy_sd=float(sd[1]), apex=(xa0, ya0), apex_sd=(float(sd[2]), float(sd[3])),
                     base=base, base_sd=base_sd, corners=(xl0, xr0), height=base - ya0, width=xr0 - xl0,
                     left=(fl['a'], fl['b'], fl['rms'], fl['n']), right=(fr['a'], fr['b'], fr['rms'], fr['n']), base_note=bnote,
                     apex_rule=('base minus assumed height/3, h=%.1f+-%.1f' % (t['apex'][1], t['apex'][2])) if 'apex' in t else 'side-line intersection')
    print('%-8s centroid (%.2f, %.2f) sd (%.2f, %.2f)  apex (%.2f, %.2f) sd (%.2f, %.2f)  base %.2f  h %.2f  w %.2f  slopes %+.3f %+.3f' % (
        name, cx0, cy0, sd[0], sd[1], xa0, ya0, sd[2], sd[3], base, base - ya0, xr0 - xl0, fl['b'], fr['b']))
flags = {}
for name, spec in FLAGS.items():
    f = fit_rows(spec)
    tip_y = min(f['t']); tip_x = f['a'] + f['b'] * tip_y
    flags[name] = dict(a=f['a'], b=f['b'], rms=f['rms'], tip=(tip_x, tip_y))
    # perpendicular distance of each candidate apex from the flag line, and flag length
    line = []
    for tn, r in res.items():
        xa, ya = r['apex']
        if abs(xa - tip_x) > 25 or abs(ya - tip_y) > 30: continue
        off = (xa - (f['a'] + f['b'] * ya)) / np.sqrt(1 + f['b'] ** 2)
        ln = np.hypot(tip_x - xa, tip_y - ya)
        line.append('%s: perp %.2f px, length tip-apex %.1f px' % (tn, off, ln))
    flags[name]['candidates'] = line
    print('%-5s x = %.3f %+.4f*y rms %.2f tip (%.1f, %.1f) | %s' % (name, f['a'], f['b'], f['rms'], tip_x, tip_y, ' ; '.join(line)))
json.dump({'triangles': res, 'flags': flags}, open(out, 'w'), indent=1, default=float)
