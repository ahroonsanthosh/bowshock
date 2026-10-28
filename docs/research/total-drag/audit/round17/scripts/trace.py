"""Trace curves along hand-placed guide polylines and read them.

usage: python3 -I trace.py SCRIPTS_DIR SPEC.json OUT_PREFIX

SPEC.json:
{"page": PAGE.npy, "cal": CAL.json, "panel": "M=0.6", "band": 6,
 "curves": [{"name": "A", "guide": [[x, y], ...], "band": 6,
             "alpha_step": 1.0, "exclude": [[x0, y0, x1, y1], ...]}, ...]}

Every non-grid ink pixel within `band` px of a guide is assigned to the
nearest guide. A pixel is "grid" if it lies in the fitted grid-line bands.
The assigned pixels are projected on the guide to get arc length s; 1 px
bins along s give the ink occupancy, from which dashes and gaps are read.
Where the guide crosses a grid band the bins are "masked": the script says
whether the ink on each side touches the band (continuous through the line
if both sides touch).

Readings at fixed alpha come only from assigned ink in the pixel row of that
alpha. In a gap, the nearest ink row is reported at its own alpha (no
interpolation). At a grid line crossed by a continuous stroke, the value is
a box spanning the stroke centres just above and below the line.
Output: OUT_PREFIX.json with everything, OUT_PREFIX_assign.npy (curve index
+ 1 per pixel in the panel region, 0 elsewhere).
"""
import sys
sys.path.insert(0, sys.argv[1])
import json
import math
import numpy as np
from common import load, grid_mask, to_plot, row_for_alpha, zero_line_row

spec = json.load(open(sys.argv[2]))
outp = sys.argv[3]
ink, cal = load(spec['page'], spec['cal'], spec['panel'])
gm, ginfo = grid_mask(ink, cal)
fr = cal['frame_nominal']
X0, Y0 = int(fr['xl']) - 10, int(fr['yt']) - 10
X1, Y1 = int(fr['xr']) + 11, int(fr['yb']) + 11
reg = (ink[Y0:Y1, X0:X1] == 1)
regg = gm[Y0:Y1, X0:X1]
cur = reg & ~regg
ys, xs = np.where(cur)
xs = xs + X0
ys = ys + Y0

# x residual RMS and y residual RMS for the error model
rx = np.sqrt(np.mean([p['resid'] ** 2 for p in cal['fit_x']['per_line'] if p['labelled']]))
ry = np.sqrt(np.mean([p['resid'] ** 2 for p in cal['fit_y']['per_line'] if p['labelled']]))
SX = abs(cal['fit_x']['coef'][1])
SY = abs(cal['fit_y']['coef'][2])


def seg_project(px, py, poly):
    """Project points on polyline. Return s (arc length) and distance."""
    poly = np.asarray(poly, float)
    best_d = np.full(len(px), np.inf)
    best_s = np.zeros(len(px))
    s0 = 0.0
    for i in range(len(poly) - 1):
        a, b = poly[i], poly[i + 1]
        ab = b - a
        L = math.hypot(*ab)
        if L == 0:
            continue
        t = ((px - a[0]) * ab[0] + (py - a[1]) * ab[1]) / (L * L)
        t = np.clip(t, 0, 1)
        qx = a[0] + t * ab[0]
        qy = a[1] + t * ab[1]
        d = np.hypot(px - qx, py - qy)
        better = d < best_d
        best_d[better] = d[better]
        best_s[better] = s0 + t[better] * L
        s0 += L
    return best_s, best_d, s0


def poly_point(poly, s):
    poly = np.asarray(poly, float)
    s0 = 0.0
    for i in range(len(poly) - 1):
        a, b = poly[i], poly[i + 1]
        L = math.hypot(*(b - a))
        if s <= s0 + L or i == len(poly) - 2:
            t = 0 if L == 0 else (s - s0) / L
            t = min(max(t, 0), 1)
            return a + t * (b - a)
        s0 += L


curves = spec['curves']
D = np.full((len(curves), len(xs)), np.inf)
S = np.zeros((len(curves), len(xs)))
for ci, c in enumerate(curves):
    s, d, L = seg_project(xs, ys, c['guide'])
    band = c.get('band', spec.get('band', 6))
    d = np.where(d <= band, d, np.inf)
    for ex in c.get('exclude', []):
        inside = (xs >= ex[0]) & (xs <= ex[2]) & (ys >= ex[1]) & (ys <= ex[3])
        d[inside] = np.inf
    D[ci] = d
    S[ci] = s
own = np.argmin(D, axis=0)
ok = np.isfinite(D.min(axis=0))
assign = np.zeros(cur.shape, np.int16)
assign[ys[ok] - Y0, xs[ok] - X0] = own[ok] + 1
np.save(outp + '_assign.npy', assign)

result = {'panel': spec['panel'], 'region': [X0, Y0, X1, Y1], 'curves': [],
          'cal_rms_x': float(rx), 'cal_rms_y': float(ry), 'sx': SX, 'sy': SY}

for ci, c in enumerate(curves):
    sel = ok & (own == ci)
    cx, cy, cs = xs[sel], ys[sel], S[ci][sel]
    guide = np.asarray(c['guide'], float)
    _, _, L = seg_project(np.array([0.0]), np.array([0.0]), guide)
    nb = int(math.ceil(L)) + 1
    occ = np.zeros(nb, np.int8)            # 1 ink
    for v in cs:
        occ[min(nb - 1, int(v))] = 1
    # masked bins: guide point inside a grid band (raw ink there)
    masked = np.zeros(nb, bool)
    for b in range(nb):
        p = poly_point(guide, b + 0.5)
        X, Y = int(round(p[0])), int(round(p[1]))
        if Y0 <= Y < Y1 and X0 <= X < X1 and regg[Y - Y0, X - X0]:
            masked[b] = True
    # ink extent along s
    inked = np.where(occ == 1)[0]
    if len(inked) == 0:
        result['curves'].append({'name': c['name'], 'empty': True})
        continue
    s_first, s_last = inked.min(), inked.max()
    # runs between s_first and s_last
    state = []
    for b in range(s_first, s_last + 1):
        state.append('I' if occ[b] else ('M' if masked[b] else 'W'))
    # close 1-bin white holes inside ink (scan dropout)
    st = ''.join(state)
    st = st.replace('IWI', 'III')
    runs = []
    i = 0
    while i < len(st):
        j = i
        while j < len(st) and st[j] == st[i]:
            j += 1
        runs.append([st[i], s_first + i, s_first + j])  # type, start, end (excl)
        i = j
    # combine into dashes and gaps, classifying masked runs
    items = []
    for k, (t, a, b) in enumerate(runs):
        prev_t = runs[k - 1][0] if k > 0 else None
        next_t = runs[k + 1][0] if k + 1 < len(runs) else None
        if t == 'M':
            touch = (prev_t == 'I', next_t == 'I')
            items.append({'type': 'masked', 's0': int(a), 's1': int(b), 'len': int(b - a),
                          'touch_before': touch[0], 'touch_after': touch[1]})
        else:
            items.append({'type': 'ink' if t == 'I' else 'white', 's0': int(a), 's1': int(b), 'len': int(b - a)})
    # build dashes: ink runs joined through masked runs that touch on both sides
    dashes = []
    gaps = []
    cur_d = None
    pending_gap = 0
    pending_gap_masked = 0
    gap_note = []
    for it in items:
        if it['type'] == 'ink':
            if cur_d is None:
                if dashes:
                    gaps.append({'len_white': pending_gap, 'len_masked': pending_gap_masked,
                                 'note': ';'.join(gap_note), 's0': dashes[-1]['s1'], 's1': it['s0']})
                cur_d = {'s0': it['s0'], 's1': it['s1'], 'through_grid': 0, 'end_at_grid': []}
                if pending_gap_masked and pending_gap == 0:
                    cur_d['end_at_grid'].append('start')
            else:
                cur_d['s1'] = it['s1']
            pending_gap = 0
            pending_gap_masked = 0
            gap_note = []
        elif it['type'] == 'masked' and it['touch_before'] and it['touch_after'] and cur_d is not None:
            cur_d['s1'] = it['s1']
            cur_d['through_grid'] += 1
        else:
            if cur_d is not None:
                if it['type'] == 'masked':
                    cur_d['end_at_grid'].append('end')
                dashes.append(cur_d)
                cur_d = None
            if it['type'] == 'white':
                pending_gap += it['len']
            else:
                pending_gap_masked += it['len']
                gap_note.append('grid line in gap')
    if cur_d is not None:
        dashes.append(cur_d)
    for dsh in dashes:
        dsh['len'] = dsh['s1'] - dsh['s0']
        p0 = poly_point(guide, dsh['s0'])
        p1 = poly_point(guide, dsh['s1'])
        dsh['xy0'] = [round(float(p0[0]), 1), round(float(p0[1]), 1)]
        dsh['xy1'] = [round(float(p1[0]), 1), round(float(p1[1]), 1)]

    # ends: centroid of pixels within 2 px of extreme s
    def end_at(extreme, sign):
        m = (cs - extreme) * sign <= 2.5
        ex, ey = cx[m].mean(), cy[m].mean()
        return float(ex), float(ey)
    e_start = end_at(cs.min(), 1)
    e_end = end_at(cs.max(), -1)

    # readings by rows
    aset = set(zip(cy.tolist(), cx.tolist()))
    rows = {}
    for yy, xx in zip(cy, cx):
        rows.setdefault(int(yy), []).append(int(xx))

    def runs_in_row(y):
        v = sorted(rows.get(y, []))
        if not v:
            return []
        out = []
        a = v[0]
        p = v[0]
        for q in v[1:]:
            if q - p > 2:
                out.append((a, p))
                a = q
            p = q
        out.append((a, p))
        return out

    a_lo = float(to_plot(cal, *e_start)[1])
    a_hi = float(to_plot(cal, *e_end)[1])
    amin, amax = min(a_lo, a_hi), max(a_lo, a_hi)
    span = amax - amin
    if 'alpha_step' in c:
        step = c['alpha_step']
    elif span < 2.5:
        step = 0.2
    elif span < 5.0:
        step = 0.25
    else:
        step = spec.get('alpha_step', 0.5)
    targets = set()
    t = math.ceil(amin / step - 1e-9) * step
    while t <= amax + 1e-9:
        targets.add(round(t, 4))
        t += step
    for g in range(0, 17, 2):
        if amin - 0.15 <= g <= amax + 0.15:
            targets.add(float(g))
    targets.update(c.get('extra_alpha', []))
    readings = []
    xmed = float(np.median(cx))
    for ta in sorted(targets):
        # row for this alpha near the curve's x at that level
        Xg = xmed
        for _ in range(3):
            yrow = row_for_alpha(cal, ta, Xg)
            rr = runs_in_row(int(round(yrow)))
            if rr:
                Xg = np.mean([(a + b) / 2 for a, b in rr])
        yrow = row_for_alpha(cal, ta, Xg)
        yi = int(round(yrow))
        rr = runs_in_row(yi)
        if rr:
            for a, b in rr:
                xc = (a + b) / 2.0
                runlen = b - a + 1
                readings.append({'alpha_target': ta, 'mode': 'row', 'px': [xc, yi], 'runlen': runlen,
                                 'run': [a, b]})
            continue
        # in a grid band?
        in_band = regg[yi - Y0, int(round(Xg)) - X0] if (Y0 <= yi < Y1 and X0 <= int(round(Xg)) < X1) else False
        # nearest ink rows above and below
        up = next((y for y in range(yi - 1, yi - 16, -1) if rows.get(y)), None)
        dn = next((y for y in range(yi + 1, yi + 16) if rows.get(y)), None)
        if in_band and up is not None and dn is not None and (dn - up) <= 9:
            ru = runs_in_row(up)
            rd = runs_in_row(dn)
            # pair the nearest runs
            best = None
            for a1, b1 in ru:
                for a2, b2 in rd:
                    dd = abs((a1 + b1) / 2 - (a2 + b2) / 2)
                    if best is None or dd < best[0]:
                        best = (dd, (a1 + b1) / 2, (a2 + b2) / 2)
            if best is not None and best[0] <= 8:
                readings.append({'alpha_target': ta, 'mode': 'grid_crossing', 'px': [(best[1] + best[2]) / 2, yrow],
                                 'x_above': best[1], 'x_below': best[2], 'row_above': up, 'row_below': dn})
                continue
        cand = [y for y in (up, dn) if y is not None]
        if not cand:
            readings.append({'alpha_target': ta, 'mode': 'none'})
            continue
        yn = min(cand, key=lambda y: abs(y - yrow))
        for a, b in runs_in_row(yn):
            readings.append({'alpha_target': ta, 'mode': 'nearest_ink', 'px': [(a + b) / 2.0, yn],
                             'runlen': b - a + 1, 'offset_rows': yn - yrow, 'in_band': bool(in_band)})
    # merged with a vertical grid line: {"rows": [y0, y1], "line_k": k}
    hw = c.get('half_width', 2.25)
    for mz in c.get('merged', []):
        vl = [v for v in cal['vlines'] if v and v['k'] == mz['line_k']][0]
        lw = [w for t, k, w in ginfo if t == 'v' and k == mz['line_k']][0]
        keep = []
        for r in readings:
            if 'px' in r and r.get('alpha_target') is not None and mz['rows'][0] <= r['px'][1] <= mz['rows'][1]:
                continue
            keep.append(r)
        readings[:] = keep
        for ta in sorted(targets):
            yrow = row_for_alpha(cal, ta, vl['a'] + vl['b'] * (mz['rows'][0] + mz['rows'][1]) / 2)
            yi = int(round(yrow))
            if not (mz['rows'][0] <= yi <= mz['rows'][1]):
                continue
            def merged_at(y):
                lc = vl['a'] + vl['b'] * y
                la, lb = lc - lw / 2.0 + 0.5, lc + lw / 2.0 - 0.5
                ci = int(round(lc))
                if not ink[y, ci]:
                    return None
                a = ci
                while ink[y, a - 1]:
                    a -= 1
                b = ci
                while ink[y, b + 1]:
                    b += 1
                if b - a > 20:
                    return 'hline'
                left = a < la - 1
                right = b > lb + 1
                if left and not right:
                    return (a + hw, 1.0, 'left edge + half stroke', a, b, la, lb)
                if right and not left:
                    return (b - hw, 1.0, 'right edge - half stroke', a, b, la, lb)
                if left and right:
                    return ((a + b) / 2.0, (b - a) / 2.0 - hw + 1.0, 'protrudes both sides', a, b, la, lb)
                return ((la + lb) / 2.0, (lb - la) / 2.0 + 2.5, 'hidden in grid line (or dash gap)', a, b, la, lb)
            m = merged_at(yi)
            if m is None:
                continue
            if m == 'hline':
                up = next((y for y in range(yi - 1, yi - 8, -1) if merged_at(y) not in (None, 'hline')), None)
                dn = next((y for y in range(yi + 1, yi + 8) if merged_at(y) not in (None, 'hline')), None)
                if up is None or dn is None:
                    continue
                mu, md = merged_at(up), merged_at(dn)
                lo = min(mu[0] - mu[1], md[0] - md[1])
                hi = max(mu[0] + mu[1], md[0] + md[1])
                readings.append({'alpha_target': ta, 'mode': 'merged_line', 'px': [(lo + hi) / 2.0, yrow],
                                 'half_bound_px': (hi - lo) / 2.0, 'merged_run': [up, dn],
                                 'line': [round(mu[5], 1), round(mu[6], 1)],
                                 'how': 'on a horizontal grid line; box spans rows %d and %d (%s / %s)' % (up, dn, mu[2], md[2])})
                continue
            xc, hb, how, a, b, la, lb = m
            readings.append({'alpha_target': ta, 'mode': 'merged_line', 'px': [xc, yi], 'half_bound_px': hb,
                             'merged_run': [int(a), int(b)], 'line': [round(la, 1), round(lb, 1)], 'how': how})
    # hidden inside a vertical grid line (another curve's ink also there): box over the line
    for hz in c.get('hidden', []):
        vl = [v for v in cal['vlines'] if v and v['k'] == hz['line_k']][0]
        lw = [w for t, k, w in ginfo if t == 'v' and k == hz['line_k']][0]
        readings[:] = [r for r in readings if not ('px' in r and r.get('alpha_target') is not None
                                                     and hz['rows'][0] <= r['px'][1] <= hz['rows'][1])]
        lc0 = vl['a'] + vl['b'] * (hz['rows'][0] + hz['rows'][1]) / 2
        za = sorted(float(v) for v in to_plot(cal, [lc0, lc0], [hz['rows'][1], hz['rows'][0]])[1])
        ha = set(hz.get('extra_alpha', []))
        tt = math.ceil(za[0] / 0.5 - 1e-9) * 0.5
        while tt <= za[1] + 1e-9:
            ha.add(round(tt, 4))
            tt += 0.5
        for ta in sorted(ha):
            yrow = row_for_alpha(cal, ta, lc0)
            if not (hz['rows'][0] <= yrow <= hz['rows'][1]):
                continue
            lc = vl['a'] + vl['b'] * yrow
            readings.append({'alpha_target': ta, 'mode': 'merged_line', 'px': [lc, yrow],
                             'half_bound_px': hz.get('half_px', lw / 2.0 + 2.0), 'merged_run': [], 'line': [],
                             'how': hz.get('how', 'not separable from the grid line and another curve; box over the line')})
    # explicit boxes where ink merges with an arrowhead or another curve
    for bz in c.get('boxes', []):
        readings[:] = [r for r in readings if not ('px' in r and r.get('alpha_target') is not None
                                                     and bz['rows'][0] <= r['px'][1] <= bz['rows'][1])]
        for ta in sorted(targets):
            yrow = row_for_alpha(cal, ta, (bz['x0'] + bz['x1']) / 2.0)
            if not (bz['rows'][0] <= yrow <= bz['rows'][1]):
                continue
            readings.append({'alpha_target': ta, 'mode': 'merged_line', 'px': [(bz['x0'] + bz['x1']) / 2.0, yrow],
                             'half_bound_px': (bz['x1'] - bz['x0']) / 2.0, 'merged_run': [], 'line': [],
                             'how': bz['how']})
    # column readings on flat stretches: {"x_from": px, "x_to": px, "step_units": 0.02, "box": [x0,y0,x1,y1]}
    cols_px = {}
    for yy, xx in zip(cy, cx):
        cols_px.setdefault(int(xx), []).append(int(yy))
    for cr in c.get('xcols', []):
        bx = cr.get('box', [X0, Y0, X1, Y1])
        xv0 = float(to_plot(cal, cr['x_from'], (bx[1] + bx[3]) / 2)[0])
        xv1 = float(to_plot(cal, cr['x_to'], (bx[1] + bx[3]) / 2)[0])
        stp = cr.get('step_units', 0.02)
        lo, hi = min(xv0, xv1), max(xv0, xv1)
        v = math.ceil(lo / stp - 1e-9) * stp
        while v <= hi + 1e-9:
            # column for this x value at the box's mid row
            cxf = cal['fit_x']['coef']
            Xc = (v - cxf[0] - cxf[2] * (bx[1] + bx[3]) / 2) / cxf[1]
            Xi = int(round(Xc))
            yl = sorted(y for y in cols_px.get(Xi, []) if bx[1] <= y <= bx[3])
            if yl:
                grp = [[yl[0], yl[0]]]
                for y in yl[1:]:
                    if y - grp[-1][1] > 2:
                        grp.append([y, y])
                    else:
                        grp[-1][1] = y
                for a, b in grp:
                    readings.append({'alpha_target': None, 'x_target': round(v, 4), 'mode': 'column',
                                     'px': [Xi, (a + b) / 2.0], 'runlen': b - a + 1})
            else:
                readings.append({'alpha_target': None, 'x_target': round(v, 4), 'mode': 'column_none', 'col': Xi})
            v += stp
    # turning points: {"box": [...], "kind": "max_x"|"min_x"|"max_alpha"|"min_alpha"}
    for tp in c.get('turning', []):
        bx = tp['box']
        best = None
        if tp['kind'] in ('max_x', 'min_x'):
            for y in range(bx[1], bx[3] + 1):
                for a, b in runs_in_row(y):
                    xc = (a + b) / 2.0
                    if not (bx[0] <= xc <= bx[2]):
                        continue
                    xv = float(to_plot(cal, xc, y)[0])
                    key = xv if tp['kind'] == 'min_x' else -xv
                    # note: x values are negative to the right; max_x means most negative (rightmost)
                    key = -xc if tp['kind'] == 'max_x' else xc
                    if best is None or key < best[0]:
                        best = (key, xc, y, b - a + 1)
        else:
            for X in range(bx[0], bx[2] + 1):
                yl = sorted(y for y in cols_px.get(X, []) if bx[1] <= y <= bx[3])
                if not yl:
                    continue
                grp = [[yl[0], yl[0]]]
                for y in yl[1:]:
                    if y - grp[-1][1] > 2:
                        grp.append([y, y])
                    else:
                        grp[-1][1] = y
                for a, b in grp:
                    yc = (a + b) / 2.0
                    key = yc if tp['kind'] == 'max_alpha' else -yc
                    if best is None or key < best[0]:
                        best = (key, X, yc, b - a + 1)
        if best:
            readings.append({'alpha_target': None, 'mode': 'turning_' + tp['kind'], 'px': [best[1], best[2]],
                             'runlen': best[3]})
    # zero line: does the stroke reach the alpha = 0 line?
    zr = None
    lowest = int(cy.max())
    Xl = float(cx[cy == lowest].mean())
    zrow = zero_line_row(cal, Xl)
    band_top = None
    for yy in range(int(zrow), int(zrow) - 12, -1):
        if not regg[yy - Y0, int(round(Xl)) - X0]:
            band_top = yy + 1
            break
    rr = runs_in_row(lowest)
    # touches only if raw ink is continuous from the lowest assigned row down
    # to the frame line ink (a row whose ink run under the stroke spans > 15 px)
    touch = False
    gap_rows = None
    if rr:
        a0 = min(a for a, b in rr) - 1
        b0 = max(b for a, b in rr) + 1
        gap_rows = 0
        for yy in range(lowest + 1, lowest + 14):
            rowseg = ink[yy, a0 - 12:b0 + 13]
            if rowseg.sum() > 15 + (b0 - a0):
                touch = gap_rows == 0
                break
            if ink[yy, a0:b0 + 1].any():
                continue
            gap_rows += 1
    zr = {'lowest_row': lowest, 'zero_row': float(zrow), 'band_top': band_top, 'touches': bool(touch),
          'white_rows_above_line': gap_rows, 'runs': rr}
    if touch:
        for a, b in rr:
            readings.append({'alpha_target': 0.0, 'mode': 'zero_line', 'px': [(a + b) / 2.0, zrow],
                             'runlen': b - a + 1, 'lowest_row': lowest})
    # convert readings to plot units with errors
    for r in readings:
        if 'px' not in r:
            continue
        xv, av = to_plot(cal, r['px'][0], r['px'][1])
        r['x'] = float(xv)
        r['y'] = float(av) if r['mode'] not in ('grid_crossing', 'zero_line') else float(r['alpha_target'])
        if r['mode'] == 'merged_line' and 'horizontal grid line' in r['how']:
            r['y'] = float(r['alpha_target'])
        if r['mode'] == 'row':
            r['y'] = float(r['alpha_target']) if abs(r['px'][1] - row_for_alpha(cal, r['alpha_target'], r['px'][0])) <= 0.5 else float(av)
    result['curves'].append({
        'name': c['name'], 'n_pixels': int(sel.sum()), 'guide_len': float(L),
        'start_px': e_start, 'end_px': e_end,
        'start_plot': [float(v) for v in to_plot(cal, *e_start)],
        'end_plot': [float(v) for v in to_plot(cal, *e_end)],
        'items': items, 'dashes': dashes, 'gaps': gaps, 'readings': readings, 'zero': zr})

# leftover non-grid ink inside the panel (frame interior) not assigned to any curve
from scipy import ndimage
inner = cur.copy()
fx0, fy0 = int(fr['xl']) + 4 - X0, int(fr['yt']) + 4 - Y0
fx1, fy1 = int(fr['xr']) - 4 - X0, int(fr['yb']) - 4 - Y0
mask_in = np.zeros_like(inner)
mask_in[fy0:fy1, fx0:fx1] = True
left = inner & mask_in & (assign == 0)
lab, n = ndimage.label(left, structure=np.ones((3, 3)))
lefts = []
for i in range(1, n + 1):
    yy, xx = np.where(lab == i)
    if len(yy) >= spec.get('leftover_min', 8):
        lefts.append({'n': int(len(yy)), 'bbox': [int(xx.min() + X0), int(yy.min() + Y0), int(xx.max() + X0), int(yy.max() + Y0)]})
result['leftover'] = lefts
json.dump(result, open(outp + '.json', 'w'), indent=1)
print('leftover components (n>=%d):' % spec.get('leftover_min', 8), [(l['n'], l['bbox']) for l in lefts])
for c in result['curves']:
    if c.get('empty'):
        print('==', c['name'], 'EMPTY')
        continue
    print('==', c['name'], 'pixels', c['n_pixels'],
          'start px (%.1f,%.1f) plot (%+.4f, %.3f)' % (*c['start_px'], *c['start_plot']),
          'end px (%.1f,%.1f) plot (%+.4f, %.3f)' % (*c['end_px'], *c['end_plot']))
    seq = []
    for it in c['items']:
        tag = {'ink': 'D', 'white': 'g', 'masked': 'M'}[it['type']]
        extra = ''
        if it['type'] == 'masked':
            extra = '(' + ('t' if it['touch_before'] else '-') + ('t' if it['touch_after'] else '-') + ')'
        seq.append(f"{tag}{it['len']}{extra}")
    print('   raw seq:', ' '.join(seq))
    print('   dashes :', ' '.join(f"{d['len']}{'*' * d['through_grid']}{'^' if d['end_at_grid'] else ''}" for d in c['dashes']))
    print('   zero   :', c['zero'])
    print('   gaps   :', ' '.join(f"{g['len_white']}{'+M' + str(g['len_masked']) if g['len_masked'] else ''}" for g in c['gaps']))
