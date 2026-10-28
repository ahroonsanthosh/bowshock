# Circles (ring fit + cross strokes) and diamonds (four side lines) on the de-jogged image.
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2])
res = {}
CIRC = {  # approx centre (dejog coords), cross vertical (near, row ranges), cross horizontal (near, col ranges)
 6: ((911.5, 1002.3), (911.5, [(989, 999), (1007, 1015)]), (1002.5, [(897, 906), (916, 925)])),
 14: ((1323.5, 1074.5), (1324, [(1059, 1070), (1081, 1089)]), (1075.5, [(1309, 1318), (1328, 1335)])),
 17: ((1670, 1107.5), (1670.5, [(1092, 1103), (1113, 1121)]), (1108, [(1656, 1665), (1675, 1683)])),
 20: ((1940.5, 1121.5), (1940, [(1106, 1117), (1127, 1135)]), (1122, [(1927, 1935), (1945, 1950)])),
 22: ((2107, 1129.5), (2106, [(1114, 1125), (1134, 1143)]), (1129.5, [(2093, 2101), (2112, 2120)])),
 24: ((2160, 1129.5), None, None),
}
for k, (c0, cv, ch) in CIRC.items():
    cx, cy = c0
    # circles with a square drawn just below them: use only rays that do not reach the square (upper part of the ring)
    excl = [(200, 340)] if k in (20, 22, 24) else []
    for it in range(4):
        pts = M.ray_samples(ink, cx, cy, 11, 23, np.arange(0, 360, 2.0), exclude=excl)
        cx, cy, R, rms, n, rej = M.fit_circle(pts)
    out = dict(cx=cx, cy=cy, R=R, ring_rms=rms, n=n, n_rays=len(pts))
    line = 'circle #%d centre (%.2f, %.2f) R %.2f ring rms %.2f px, %d/%d rays kept' % (k, cx, cy, R, rms, n, len(pts))
    if cv:
        v = M.side(ink, 'v', cv[0], cv[1]); h = M.side(ink, 'h', ch[0], ch[1])
        x, y = M.cross_point(v[5], h[5]); out.update(cross=(x, y), crossV_rms=v[2], crossH_rms=h[2])
        line += '; cross (%.2f, %.2f) [rms %.2f, %.2f]; cross - centre (%+.2f, %+.2f)' % (x, y, v[2], h[2], x - cx, y - cy)
    print(line); res['C%d' % k] = out
# diamonds: approximate vertices (dejog coords) top, right, bottom, left; sides measured between them; None = side not visible
DIA = {
 10: dict(T=(1090.5, 1091.5), R=(1111.5, 1114.5), Bm=(1089.5, 1136), L=(1069.5, 1112.5), sides=['TR', 'RB', 'BL', 'LT'], trim=0.22),
 11: dict(T=(1176, 1090), R=(1196, 1110.5), Bm=(1176.5, 1130.5), L=(1156, 1110.5), sides=['LT', 'BL', 'TRp', 'RBp'], trim=0.2),
 13: dict(T=(1277.5, 1099.5), R=(1298.5, 1120.5), Bm=(1277.5, 1141), L=(1256.5, 1120.5), sides=['TR', 'RB', 'BL', 'LT'], trim=0.2),
 16: dict(T=(1507.5, 1106.5), R=(1528, 1125.5), Bm=(1507.5, 1145), L=(1487.5, 1125.5), sides=['TR', 'RB', 'BL', 'LT'], trim=0.2),
 19: dict(T=(1687.5, 1122.5), R=(1706, 1145), Bm=(1687.5, 1166.5), L=(1669, 1145), sides=['TR', 'RB', 'BLp'], trim=0.2),
}
for k, d in DIA.items():
    T, R, Bm, L = map(np.array, (d['T'], d['R'], d['Bm'], d['L']))
    seg = {'TR': (T, R), 'RB': (R, Bm), 'BL': (Bm, L), 'LT': (L, T),
           'TRp': (T, T + 0.55 * (R - T)), 'RBp': (Bm, Bm + 0.6 * (R - Bm)), 'BLp': (Bm, Bm + 0.45 * (L - Bm))}
    fits = {}
    for s in d['sides']:
        a, b = seg[s]
        tr = 0.12 if s.endswith('p') else d['trim']
        pts = M.perp_samples(ink, a, b, half=4, step=0.5, trim=tr)
        m, u, rms, n = M.fit_line_xy(pts)
        fits[s[:2]] = (m, u, rms, n)
    txt = ', '.join('%s rms %.2f n %d' % (s, f[2], f[3]) for s, f in fits.items())
    V = {}
    pairs = {'T': ('LT', 'TR'), 'R': ('TR', 'RB'), 'B': ('RB', 'BL'), 'L': ('BL', 'LT')}
    for vname, (s1, s2) in pairs.items():
        if s1 in fits and s2 in fits:
            p = M.intersect(fits[s1][0], fits[s1][1], fits[s2][0], fits[s2][1]); V[vname] = (float(p[0]), float(p[1]))
    if len(V) == 4:
        cx = np.mean([v[0] for v in V.values()]); cy = np.mean([v[1] for v in V.values()])
        how = 'mean of 4 vertices'
    elif k == 19:
        # right half only: centre x from the bottom vertex (axis-aligned diamond), centre y from the right vertex
        cx, cy = V['B'][0], V['R'][1]; how = 'x of bottom vertex, y of right vertex (left half hidden)'
    else:
        cx = np.mean([v[0] for v in V.values()]); cy = np.mean([v[1] for v in V.values()]); how = 'mean of %d vertices' % len(V)
    ang = {s: float(np.degrees(np.arctan2(f[1][1], f[1][0]))) % 180 for s, f in fits.items()}
    print('diamond #%d %s | vertices %s | centre (%.2f, %.2f) by %s | side angles %s' % (k, txt, {a: (round(b[0], 2), round(b[1], 2)) for a, b in V.items()}, cx, cy, how, {a: round(b, 1) for a, b in ang.items()}))
    res['D%d' % k] = dict(cx=float(cx), cy=float(cy), vertices=V, how=how, side_rms={s: f[2] for s, f in fits.items()})
for name, (x, y) in (('dot13', (1277, 1120.5)), ('dot16', (1507, 1125.5))):
    print(name, M.dot(ink, x, y)); res[name] = M.dot(ink, x, y)
json.dump(res, open(sys.argv[3], 'w'), indent=1, default=float)
