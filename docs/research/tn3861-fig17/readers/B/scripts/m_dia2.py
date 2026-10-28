# Diamond sides with explicit clean segments (endpoints chosen on zoomed views to avoid crossing lines), dejog coords.
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2])
SEG = {
 10: {'TR': ((1097, 1099.5), (1106, 1109)), 'RB': ((1106, 1121.5), (1093, 1131.5)), 'BL': ((1086, 1131), (1072, 1116)), 'LT': ((1075.5, 1105), (1087, 1094))},
 13: {'TR': ((1280, 1104.5), (1293, 1117.5)), 'RB': ((1293, 1125.5), (1281, 1137.5)), 'BL': ((1271, 1138), (1259.5, 1125.5)), 'LT': ((1259.5, 1118), (1272.5, 1104.5))},
 16: {'TR': ((1511, 1110.5), (1524.5, 1123.5)), 'RB': ((1524.5, 1131.5), (1511, 1144)), 'BL': ((1502.5, 1144.5), (1490.5, 1131.5)), 'LT': ((1490.5, 1123.5), (1503.5, 1110.5))},
 11: {'LT': ((1159.5, 1106), (1172, 1093.5)), 'BL': ((1172, 1128.5), (1159.5, 1114.5)), 'TR': ((1179, 1093), (1186, 1100)), 'RB': ((1180, 1129), (1187, 1121))},
 19: {'TR': ((1691, 1126.5), (1704, 1140.5)), 'RB': ((1704, 1148.5), (1691, 1162)), 'BL': ((1685, 1164), (1681.5, 1160.5))},
}
res = {}
for k, sides in SEG.items():
    fits = {}
    for s, (a, b) in sides.items():
        pts = M.perp_samples(ink, a, b, half=3.5, step=0.5, trim=0.0)
        m, u, rms, n = M.fit_line_xy(pts)
        fits[s] = (m, u, rms, n)
    V = {}
    for vname, (s1, s2) in {'T': ('LT', 'TR'), 'R': ('TR', 'RB'), 'B': ('RB', 'BL'), 'L': ('BL', 'LT')}.items():
        if s1 in fits and s2 in fits:
            p = M.intersect(fits[s1][0], fits[s1][1], fits[s2][0], fits[s2][1]); V[vname] = (float(p[0]), float(p[1]))
    if len(V) == 4:
        cx = np.mean([v[0] for v in V.values()]); cy = np.mean([v[1] for v in V.values()])
        d1 = 0.5 * (np.array(V['T']) + np.array(V['B'])); d2 = 0.5 * (np.array(V['L']) + np.array(V['R']))
        how = 'mean of 4 vertices; midpoint T-B (%.2f, %.2f), midpoint L-R (%.2f, %.2f)' % (d1[0], d1[1], d2[0], d2[1])
        size = 'T-B %.2f, L-R %.2f' % (V['B'][1] - V['T'][1], V['R'][0] - V['L'][0])
    else:
        cx, cy = V['B'][0], V['R'][1]; how = 'x of bottom vertex, y of right vertex (left half hidden)'; size = 'R-B dx %.2f dy %.2f' % (V['R'][0] - V['B'][0], V['B'][1] - V['R'][1])
    ang = {s: round(float(np.degrees(np.arctan2(f[1][1], f[1][0]))) % 180, 1) for s, f in fits.items()}
    print('diamond #%d: %s | V %s | %s | centre (%.2f, %.2f) | %s | angles %s' % (k, ', '.join('%s rms %.2f n %d' % (s, f[2], f[3]) for s, f in fits.items()),
          {a: (round(b[0], 2), round(b[1], 2)) for a, b in V.items()}, size, cx, cy, how, ang))
    res['D%d' % k] = dict(cx=float(cx), cy=float(cy), vertices=V, side_rms={s: f[2] for s, f in fits.items()}, angles=ang)
json.dump(res, open(sys.argv[3], 'w'), indent=1, default=float)
