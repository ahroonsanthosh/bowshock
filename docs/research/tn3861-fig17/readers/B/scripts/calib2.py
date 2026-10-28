# Final axis calibration on the de-jogged page image.
# Every grid line is sampled column by column (horizontal lines) or row by row (vertical lines); each line gets a robust
# straight fit; then an affine map pixel -> (Mc, CD) is fitted to all kept samples, each line weighted equally.
# usage: calib2.py scriptsdir page_dejog.png calib_seed.json out.json
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2]); seed = json.load(open(sys.argv[3]))

def collect(L, orient):
    s = []
    if orient == 'v':
        rng = range(420, 1752)
        for y in rng:
            xp = L['x_at_y1080'] + L['slope_dx_per_dy'] * (y - 1080)
            r = M.vstroke(ink, xp, y, y + 1, half=3)
            if r and abs(r[0][1] - xp) < 2.0: s += r
    else:
        x1 = 845 if 1.75 <= L['value'] < 2.75 else 2684
        for x in range(492, x1):
            yp = L['y_at_x1588'] + L['slope_dy_per_dx'] * (x - 1588)
            r = M.hstroke(ink, yp, x, x + 1, half=3)
            if r and abs(r[0][1] - yp) < 2.0: s += r
    return s

def robust(samples):
    t = np.array([q[0] for q in samples]); s = np.array([q[1] for q in samples]); keep = np.ones(len(t), bool)
    for _ in range(10):
        c = np.polyfit(t[keep], s[keep], 1); r = s - np.polyval(c, t)
        sig = max(1.4826 * np.median(np.abs(r[keep])), 0.08); nk = np.abs(r) < 3 * sig
        if (nk == keep).all(): break
        keep = nk
    return c, r, keep, t, s

U, V, VAL, WT, AX, LID = [], [], [], [], [], []
lines = []
for orient, key in (('v', 'vertical'), ('h', 'horizontal')):
    for L in seed[key]:
        if ('x_at_y1080' if orient == 'v' else 'y_at_x1588') not in L: continue
        smp = collect(L, orient)
        c, r, keep, t, s = robust(smp)
        ref = 1080 if orient == 'v' else 1588
        info = {'axis': 'Mc' if orient == 'v' else 'CD', 'value': L['value'], 'n_kept': int(keep.sum()), 'n_sampled': len(smp),
                'pos_at_ref': float(np.polyval(c, ref)), 'ref': ('y=1080' if orient == 'v' else 'x=1588'), 'slope': float(c[0]),
                'rms_px': float(np.sqrt(np.mean(r[keep] ** 2))), 'span': [float(t[keep].min()), float(t[keep].max())]}
        lines.append(info)
        for ti, si in zip(t[keep], s[keep]):
            u, v = (si, ti) if orient == 'v' else (ti, si)
            U.append(u); V.append(v); VAL.append(L['value']); WT.append(1.0 / keep.sum()); AX.append(orient); LID.append(len(lines) - 1)
U, V, VAL, WT, AX, LID = map(np.array, (U, V, VAL, WT, AX, LID))

def fit(axis, use):
    m = (AX == axis) & use
    A = np.vstack([np.ones(m.sum()), U[m], V[m]]).T * np.sqrt(WT[m])[:, None]
    c, *_ = np.linalg.lstsq(A, VAL[m] * np.sqrt(WT[m]), rcond=None)
    return c

allm = np.ones(len(U), bool)
labelled_x = np.isin(np.round(VAL, 3), [0, 1, 2, 3, 4, 5, 6, 7, 8]); labelled_y = np.isin(np.round(VAL, 3), [0, 0.5, 1.0, 1.5, 2.0, 2.5])
frame = ((AX == 'v') & np.isin(np.round(VAL, 3), [0, 9])) | ((AX == 'h') & np.isin(np.round(VAL, 3), [0, 2.75]))
out = {'lines': lines}
for name, mx, my in (('all_lines', allm, allm), ('labelled_lines_only', labelled_x, labelled_y), ('interior_lines_no_frame', ~frame, ~frame)):
    cx = fit('v', mx); cy = fit('h', my)
    res = {}
    for i, L in enumerate(lines):
        m = LID == i
        pred = (cx[0] + cx[1] * U[m] + cx[2] * V[m]) if L['axis'] == 'Mc' else (cy[0] + cy[1] * U[m] + cy[2] * V[m])
        d = VAL[m] - pred
        res['%s=%g' % (L['axis'], L['value'])] = [float(d.mean()), float(np.sqrt(np.mean(d ** 2)))]
    out[name] = {'Mc': list(map(float, cx)), 'CD': list(map(float, cy)), 'resid_mean_rms_per_line': res,
                 'Mc_rms_over_lines': float(np.sqrt(np.mean([v[0] ** 2 for k, v in res.items() if k.startswith('Mc')]))),
                 'CD_rms_over_lines': float(np.sqrt(np.mean([v[0] ** 2 for k, v in res.items() if k.startswith('CD')])))}
json.dump(out, open(sys.argv[4], 'w'), indent=1)
for L in lines:
    print('%s %-5g n %4d/%4d pos@%s %8.2f slope %+.5f rms %.2f px span %s' % (L['axis'], L['value'], L['n_kept'], L['n_sampled'], L['ref'], L['pos_at_ref'], L['slope'], L['rms_px'], [round(v) for v in L['span']]))
for name in ('all_lines', 'labelled_lines_only', 'interior_lines_no_frame'):
    o = out[name]
    print(name, 'Mc = %.6f %+.8f u %+.8f v' % tuple(o['Mc']), '| CD = %.6f %+.8f u %+.8f v' % tuple(o['CD']), '| rms of line means: Mc %.4f CD %.4f' % (o['Mc_rms_over_lines'], o['CD_rms_over_lines']))
    print('   ', {k: round(v[0], 4) for k, v in o['resid_mean_rms_per_line'].items()})
