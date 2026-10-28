# Lord-and-Ulmann (quarter-round triangle), Gowen-and-Perkins (triangle) and Busemann symbols, on the de-jogged image.
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2]); cal = json.load(open(sys.argv[3]))
gl = {('Mc', L['value']): L for L in cal['lines'] if L['axis'] == 'Mc'}
def gridx(val, y):
    L = gl[('Mc', val)]; return L['pos_at_ref'] + L['slope'] * (y - 1080)
res = {}
def p(*a): print(*a)
# ---- Lord and Ulmann, crossed: cross intersection; also right side, bottom, outer ends of right side (top) and bottom (left)
LU = {
 1: dict(cv=(648, [(550, 560), (570, 575)]), ch=(564, [(634, 644), (652, 658)]), r=(661, [(548, 560), (570, 575)]), b=(577, [(632, 644), (652, 658)])),
 2: dict(cv=(736.4, [(746, 756), (764, 769)]), ch=(759.5, [(726, 733), (740, 746)]), r=(749, [(742, 755), (764, 769)]), b=(772, [(726, 733), (740, 746)])),
 3: dict(cv=(823.6, [(992, 1002), (1009, 1016)]), ch=(1004.3, [(810, 820), (828, 834)]), r=(837, [(990, 1001), (1009, 1016)]), b=(1018.7, [(808, 820), (828, 834)])),
 8: dict(cv=None, ch=(1021.9, [(956, 966), (975, 981)]), r=(983, [(1008, 1012), (1029, 1034)]), b=(1036.5, [(953, 966), (975, 981)])),
}
for k, s in LU.items():
    r = M.side(ink, 'v', s['r'][0], s['r'][1]); b = M.side(ink, 'h', s['b'][0], s['b'][1])
    ch = M.side(ink, 'h', s['ch'][0], s['ch'][1])
    if s['cv']:
        cv = M.side(ink, 'v', s['cv'][0], s['cv'][1]); cx, cy = M.cross_point(cv[5], ch[5]); cvnote = 'measured'
        cvrms = cv[2]
    else:
        # cross vertical lies on the Mc = 2.0 grid line: compare the stroke inside the symbol with the grid line fit
        ins = M.side(ink, 'v', 970.5, [(1014, 1019), (1030, 1034)])
        g = gridx(2.0, ins[4]); delta = ins[0] - g
        cy = ch[0]; cx = g + 2 * delta; cvnote = 'hidden under grid line Mc=2.0 (grid %.2f, stroke inside %.2f): taken as grid + 2*shift' % (g, ins[0]); cvrms = None
    top_end = M.stroke_end(ink, 'v', r[0], b[0] - 5, -1); left_end = M.stroke_end(ink, 'h', b[0], r[0] - 5, -1)
    res['LU%d' % k] = dict(cx=cx, cy=cy, right=r[0], bottom=b[0], top_end=top_end, left_end=left_end)
    p('L&U #%d cross (%.2f, %.2f) [%s] right %.2f (rms %.2f) bottom %.2f (rms %.2f) crossH rms %.2f crossV rms %s; ends: top %d left %d; offsets cross-right %.2f cross-bottom %.2f'
      % (k, cx, cy, cvnote, r[0], r[2], b[0], b[2], ch[2], cvrms, top_end, left_end, cx - r[0], cy - b[0]))
# ---- Busemann (arch): left, right, bottom, top of arch
l = M.side(ink, 'v', 855.6, [(950, 962)]); rr = M.side(ink, 'v', 885, [(950, 962)])
bb = M.side(ink, 'h', 966, [(876, 884)]); tt = M.side(ink, 'h', 938.7, [(866, 878)])
res['BU5'] = dict(cx=0.5 * (l[0] + rr[0]), cy=0.5 * (bb[0] + tt[0]), left=l[0], right=rr[0], top=tt[0], bottom=bb[0])
p('Busemann #5 left %.2f right %.2f top %.2f bottom %.2f -> centre (%.2f, %.2f); width %.2f height %.2f' % (l[0], rr[0], tt[0], bb[0], res['BU5']['cx'], res['BU5']['cy'], rr[0] - l[0], bb[0] - tt[0]))
# fairing line end inside the Busemann symbol
for y in range(948, 962):
    row = ink[y, 862:882]; xs = np.where(row > 0.45)[0]
    if len(xs): p('   row', y, 'ink cols', (xs + 862).tolist())
# ---- Gowen and Perkins triangles
GP = {
 4: dict(r=(854.2, [(1013, 1026), (1032, 1041)]), b=(1044, [(826, 845), (851, 853)]), hyp=None, rgrid=None),
 9: dict(r=(971, [(1045, 1050), (1054, 1062)]), b=(1064.1, [(946, 966)]), hyp=((944, 1063), (969, 1039)), rgrid=2.0),
 12: dict(r=(1204.7, [(1086, 1098), (1102, 1113)]), b=(1115.9, [(1180, 1202)]), hyp=((1176, 1114), (1203, 1086)), rgrid=None),
}
for k, s in GP.items():
    r = M.side(ink, 'v', s['r'][0], s['r'][1]); b = M.side(ink, 'h', s['b'][0], s['b'][1])
    xr = r[0]; note = ''
    if s['rgrid'] is not None:
        g = gridx(s['rgrid'], r[4]); xr = g + 2 * (r[0] - g); note = 'right side on grid line (grid %.2f, combined %.2f) -> %.2f' % (g, r[0], xr)
    top_end = M.stroke_end(ink, 'v', xr, b[0] - 5, -1); left_end = M.stroke_end(ink, 'h', b[0], xr - 5, -1)
    out = dict(right=xr, bottom=b[0], top_end=top_end, left_end=left_end)
    if s['hyp']:
        pts = M.perp_samples(ink, s['hyp'][0], s['hyp'][1], half=4, step=0.5, trim=0.2)
        m, d, rms, n = M.fit_line_xy(pts)
        vt = M.intersect(m, d, np.array([xr, 0.0]), np.array([0.0, 1.0]))
        vl = M.intersect(m, d, np.array([0.0, b[0]]), np.array([1.0, 0.0]))
        out.update(top=(float(vt[0]), float(vt[1])), left=(float(vl[0]), float(vl[1])), hyp_rms=rms, hyp_n=n)
        cx = (vl[0] + 2 * xr) / 3; cy = (vt[1] + 2 * b[0]) / 3
        p('G&P #%d right %.2f bottom %.2f hyp rms %.2f n %d; vertices top (%.2f, %.2f) left (%.2f, %.2f); legs %.2f x %.2f; centroid (%.2f, %.2f); bbox centre (%.2f, %.2f) %s; ends top %d left %d'
          % (k, xr, b[0], rms, n, vt[0], vt[1], vl[0], vl[1], xr - vl[0], b[0] - vt[1], cx, cy, 0.5 * (vl[0] + xr), 0.5 * (vt[1] + b[0]), note, top_end, left_end))
    else:
        p('G&P #%d right %.2f (rms %.2f) bottom %.2f (rms %.2f); ends top %d left %d' % (k, xr, r[2], b[0], b[2], top_end, left_end))
    res['GP%d' % k] = out
for name, (x, y) in (('dot9', (962.6, 1052.0)), ('dot12', (1193.7, 1105.3))):
    p(name, M.dot(ink, x, y))
json.dump(res, open(sys.argv[4], 'w'), indent=1, default=float)
