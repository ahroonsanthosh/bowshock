# Trace faired curves on a calibrated panel and read them at fixed abscissae.
# usage: python3 -I track.py config.json
# The config names the image, calibration, component map, orientation, the curves with a
# coarse guide polyline each (my visual identification of the curve, in plot units), and the
# target abscissae. For each pixel step along the independent axis the run of curve ink
# nearest the guide (within tol px, and with an allowed component label) is taken as the
# curve; the reading is the darkness-weighted centroid of that run. Gaps (dash gaps, grid
# bands) are bridged by a straight line through the trace points just either side, and
# every bridged reading is marked in the note.
import sys, json
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
import numpy as np
from readlib import Cal, load_gray, runs_along_iso_u, runs_along_iso_v

cfg = json.load(open(sys.argv[1]))
g = load_gray(cfg['img'])
cal = Cal(cfg['cal'])
z = np.load(cfg['comp'])
bx0, by0, bx1, by1 = z['box']
T = int(z['T'])
lab = np.zeros(g.shape, np.int32)
lab[by0:by1, bx0:bx1] = z['lab']
excl = cfg.get('exclude_comps', [])
for k in excl:
    lab[lab == k] = 0
mask = lab > 0
gridm = None
if 'grid' in z.files:
    gridm = np.zeros(g.shape, bool)
    gridm[by0:by1, bx0:bx1] = z['grid']
touch_log = {}


def touches_grid(r, s):
    # True when the pixel just beyond either end of the run (along the scan line) is grid-masked
    if gridm is None:
        return False
    if orient == 'u':
        for py in (r['a'] - 1, r['a'] - 2, r['b'] + 1, r['b'] + 2):
            px = int(round(cal.iso_u_x(s, py)))
            if gridm[py, px]:
                return True
    else:
        for px in (r['a'] - 1, r['a'] - 2, r['b'] + 1, r['b'] + 2):
            py = int(round(cal.iso_v_y(s, px)))
            if gridm[py, px]:
                return True
    return False
orient = cfg['orient']          # 'u': independent variable is u (iso-u columns); 'v': independent is v
lo, hi = cfg['scan']            # pixel range along the run direction
band = cfg.get('grid_halfband_px', 6)
grid_iso = cfg.get('grid_iso', [])  # values of the independent variable lying on grid lines
step_units = (cal.u_per_px if orient == 'u' else abs(cal.v_per_px))
dep_per_px = abs(cal.v_per_px) if orient == "u" else abs(cal.u_per_px)
ind_cal2s = cal.u_cal2s if orient == 'u' else cal.v_cal2s
dep_cal2s = cal.v_cal2s if orient == 'u' else cal.u_cal2s


def runs_at(s):
    if orient == 'u':
        rs = runs_along_iso_u(g, mask, cal, s, lo, hi, lab, T)
        for r in rs:
            r['dep'] = r['v']; r['pos'] = r['yc']; r['a'] = r['y0']; r['b'] = r['y1']
    else:
        rs = runs_along_iso_v(g, mask, cal, s, lo, hi, lab, T)
        for r in rs:
            r['dep'] = r['u']; r['pos'] = r['xc']; r['a'] = r['x0']; r['b'] = r['x1']
    return rs


def in_band(s):
    for gv in grid_iso:
        if abs(s - gv) / step_units <= band:
            return True
    return False


def guide_val(c, s):
    gl = [list(p) + [c.get('tol_px', 12)] * (3 - len(p)) for p in c['guide']]
    gs = np.array(gl, float)
    order = np.argsort(gs[:, 0])
    gs = gs[order]
    if s < gs[0, 0] or s > gs[-1, 0]:
        return None
    return float(np.interp(s, gs[:, 0], gs[:, 1])), float(np.interp(s, gs[:, 0], gs[:, 2]))


curves = cfg['curves']
s_min = min(c['range'][0] for c in curves)
s_max = max(c['range'][1] for c in curves)
n = int(round((s_max - s_min) / step_units))
svals = [s_min + i * step_units for i in range(n + 1)]
# dense traces
traces = {c['name']: [] for c in curves}
chosen = {}
for s in svals:
    if in_band(s):
        continue
    rs = runs_at(s)
    for c in curves:
        if not (c['range'][0] - 1e-9 <= s <= c['range'][1] + 1e-9):
            continue
        gvt = guide_val(c, s)
        if gvt is None:
            continue
        gv, tolp = gvt
        tol = tolp * dep_per_px
        allowed = c.get('comps')
        best = None
        for r in rs:
            if allowed is not None and not (set(r['labs']) & set(allowed)):
                continue
            if r['width'] < cfg.get('min_run_px', 4):
                continue  # dash tips clipped by the scan line: too short to centre reliably
            d = abs(r['dep'] - gv)
            # distance to run extent (a run can be long on steep parts)
            if d <= tol and (best is None or d < best[0]):
                best = (d, r)
        if best is not None:
            r = best[1]
            if orient == 'u':
                ea = cal.to_data(r['xc'], r['a'] - 0.5)[1]; eb = cal.to_data(r['xc'], r['b'] + 0.5)[1]
            else:
                ea = cal.to_data(r['a'] - 0.5, r['yc'])[0]; eb = cal.to_data(r['b'] + 0.5, r['yc'])[0]
            chosen.setdefault(round(s, 7), {})[c['name']] = (r['a'], r['b'])
            if c.get('drop_touching', cfg.get('drop_touching', False)) and r['width'] < cfg.get('touch_minw', 1e9) and touches_grid(r, s):
                touch_log.setdefault(c['name'], []).append((s, r['dep']))
                continue
            traces[c['name']].append((s, r['dep'], r['a'], r['b'], r['width'], ea, eb))

json.dump({k: v for k, v in traces.items()}, open(cfg['trace_out'], 'w'))


def read_at(cname, t, c):
    tr = traces[cname]
    if not tr:
        return None
    S = np.array([p[0] for p in tr]); V = np.array([p[1] for p in tr])
    i = int(np.argmin(np.abs(S - t)))
    note = []
    merged_with = []
    kind = 'curve'
    if abs(S[i] - t) <= 0.6 * step_units and not in_band(t):
        val = V[i]
        a, b, w = tr[i][2], tr[i][3], tr[i][4]
        # merged? another curve chose the same run here
        ch = chosen.get(round(S[i], 7), {})
        for on, ab in ch.items():
            if on != cname and ab == (a, b):
                merged_with.append(on)
        # local slope from trace within +-15 px
        m = np.abs(S - t) <= 15 * step_units
        slope = np.polyfit(S[m], V[m], 1)[0] if m.sum() >= 4 else 0.0
        bridged = 0.0
        width_px = w
        ext = (tr[i][5], tr[i][6])
    else:
        # bridge: points within 25 px either side of the target, outside the gap
        left = S < t; right = S > t
        if not left.any() or not right.any():
            return None
        sl = S[left].max(); sr = S[right].min()
        gap_px = (sr - sl) / step_units
        if gap_px > c.get('max_gap_px', 70):
            return {'gap_px': gap_px, 'none': True}
        m = ((S >= sl - 20 * step_units) & (S <= sl)) | ((S >= sr) & (S <= sr + 20 * step_units))
        coef = np.polyfit(S[m], V[m], 1)
        val = float(np.polyval(coef, t))
        slope = coef[0]
        res = V[m] - np.polyval(coef, S[m])
        bridged = float(np.sqrt(np.mean(res ** 2)))
        width_px = float(np.median([p[4] for p in tr if sl - 20 * step_units <= p[0] <= sr + 20 * step_units]))
        ext = None
        tl = [p for p in touch_log.get(cname, []) if sl < p[0] < sr]
        if in_band(t):
            note.append('on grid line: bridged %.0f px band from ink either side' % gap_px)
        elif tl:
            note.append('curve meets a grid line here (ink cut by the grid mask): bridged %.0f px from clean ink either side' % gap_px)
        else:
            note.append('dash gap of %.0f px bridged from ink either side' % gap_px)
        # merged check on neighbours
        for jj in (np.where(S == sl)[0][0], np.where(S == sr)[0][0]):
            ch = chosen.get(round(S[jj], 7), {})
            for on, ab in ch.items():
                if on != cname and ab == (tr[jj][2], tr[jj][3]):
                    merged_with.append(on)
    e_place = cfg.get('place_px', 2.0) * dep_per_px
    e_slope = abs(slope) * ind_cal2s
    e_bridge = 2 * bridged + (1.5 * dep_per_px if bridged or note else 0.0)
    err = float(np.sqrt(dep_cal2s ** 2 + e_place ** 2 + e_slope ** 2 + e_bridge ** 2))
    return {'val': float(val), 'err': err, 'note': note, 'merged': sorted(set(merged_with)),
            'width_px': float(width_px), 'slope': float(slope), 'ext': ext}


def hidden_box(c, t, h):
    # curve lying along a grid line: the grid mask hides most of its ink. Box between the grid
    # line centre and the outer edge of any visible sliver on the stated side, else the band.
    lo_t, hi_t, gval, side = h
    band_units = cfg.get('hide_band_px', 5.5) * dep_per_px
    rs = runs_at(t)
    best = None
    for r in rs:
        d = r['u'] if orient == 'v' else r['v']
        if orient == 'v':
            e1 = cal.to_data(r['a'] - 0.5, r['yc'])[0]; e2 = cal.to_data(r['b'] + 0.5, r['yc'])[0]
        else:
            e1 = cal.to_data(r['xc'], r['a'] - 0.5)[1]; e2 = cal.to_data(r['xc'], r['b'] + 0.5)[1]
        near = min(abs(e1 - gval), abs(e2 - gval))
        if near <= band_units + 4 * dep_per_px and (d - gval) * side > 0 and abs(d - gval) < 14 * dep_per_px:
            outer = e1 if abs(e1 - gval) > abs(e2 - gval) else e2
            if best is None or abs(outer - gval) > abs(best - gval):
                best = outer
    if best is None:
        a_, b_ = gval - band_units, gval + band_units
        how = 'no ink outside the grid band: box is the band'
    else:
        a_, b_ = gval, best
        how = 'only a sliver shows beyond the band: box from grid line centre to sliver outer edge'
    cen = (a_ + b_) / 2; hw = abs(b_ - a_) / 2
    hw = float(np.sqrt(hw ** 2 + dep_cal2s ** 2))
    return {'curve': c['name'], 'kind': 'box', 't': t, 'val': float(cen), 'err': hw, 't_err': ind_cal2s,
            'note': 'curve lies along the %g grid line; %s' % (gval, how), 'merged': [], 'width_px': 0,
            'slope': 0.0, 'ext': None, 'hidden': True}


rows = []
for c in curves:
    tr = traces[c['name']]
    if not tr:
        print('NO TRACE', c['name']); continue
    S = np.array([p[0] for p in tr]); V = np.array([p[1] for p in tr])
    for t in cfg['targets']:
        if t < c['range'][0] - 1e-9 or t > c['range'][1] + 1e-9:
            continue
        hb = [h for h in c.get('hide', []) if h[0] - 1e-9 <= t <= h[1] + 1e-9]
        if hb:
            rows.append(hidden_box(c, t, hb[0]))
            continue
        if t < S.min() - 0.5 * step_units or t > S.max() + 0.5 * step_units:
            continue
        r = read_at(c['name'], t, c)
        if r is None or r.get('none'):
            print('  %s at %.4f: no reading %s' % (c['name'], t, r))
            continue
        rows.append({'curve': c['name'], 'kind': 'curve', 't': t, 'val': r['val'], 'err': r['err'],
                     't_err': ind_cal2s, 'note': '; '.join(r['note']), 'merged': r['merged'],
                     'width_px': r['width_px'], 'slope': r['slope'], 'ext': r['ext']})
    # ends: walk outward from the extreme trace point, one pixel step at a time, through
    # grid bands too, while the gray image shows curve ink (gray < end_T) within +-tol px of
    # the last value; the run must be short (not a grid line lying along the scan line).
    endT = cfg.get('end_T', 100)
    for side in ('lo', 'hi'):
        if side == 'lo':
            j = 0; k = slice(0, 6); sgn = -1
        else:
            j = len(S) - 1; k = slice(len(S) - 6, len(S)); sgn = 1
        if c.get('end_' + side) == 'skip':
            continue
        hw = min(float(np.median([p[4] for p in tr[k]])), cfg.get('max_line_px', 12)) / 2.0
        s_cur = S[j]; v_cur = float(V[j]); miss = 0; unk = 0; s_last = s_cur; vs = []
        tolp = c.get('tol_px', 12)
        stop_reason = 'ink ends'
        for it in range(300):
            s_try = s_cur + sgn * step_units * (it + 1)
            if orient == 'u':
                px0, py0 = cal.to_px(s_try, v_cur)
                ys = np.arange(int(py0 - tolp), int(py0 + tolp) + 1)
                xs = np.round(cal.iso_u_x(s_try, ys)).astype(int)
            else:
                px0, py0 = cal.to_px(v_cur, s_try)
                xs = np.arange(int(px0 - tolp), int(px0 + tolp) + 1)
                ys = np.round(cal.iso_v_y(s_try, xs)).astype(int)
            if ys.min() < 0 or xs.min() < 0 or ys.max() >= g.shape[0] or xs.max() >= g.shape[1]:
                break
            if gridm is None:
                gv = g[ys, xs]
                ink = gv < endT
                gridfrac = 0.0
                ok = ink.any() and ink.sum() <= 3 * max(hw * 2, 6)
            else:
                ink = mask[ys, xs]
                gv = g[ys, xs]
                gridfrac = float(gridm[ys, xs].mean())
                ok = ink.any()
            if ok:
                miss = 0; unk = 0; s_last = s_try
                idx = np.nonzero(ink)[0]
                w = np.clip(endT - gv[idx], 1, None).astype(float)
                if orient == 'u':
                    vv = cal.to_data(float(np.mean(xs[idx])), float((ys[idx] * w).sum() / w.sum()))[1]
                else:
                    vv = cal.to_data(float((xs[idx] * w).sum() / w.sum()), float(np.mean(ys[idx])))[0]
                vs.append((s_try, vv)); v_cur = vv
            elif gridfrac >= 0.5:
                unk += 1
                if unk > 15:
                    stop_reason = 'grid band'
                    break
            else:
                miss += 1
                if miss >= 2:
                    break
        if unk > 0 and stop_reason == 'ink ends':
            stop_reason = 'ink ends after a grid band'
        ext_px = abs(s_last - S[j]) / step_units
        s_end = s_last - sgn * hw * step_units
        # value at the end: straight-line fit through the trace points within 20 px of the end
        # and the walked points, evaluated at the end abscissa
        near = [(S[q], V[q]) for q in range(len(S)) if abs(S[q] - S[j]) <= 20 * step_units] + vs
        ns = np.array([p_[0] for p_ in near]); nv = np.array([p_[1] for p_ in near])
        if len(ns) >= 3 and np.ptp(ns) > 0:
            v_end = float(np.polyval(np.polyfit(ns, nv, 1), s_end))
        else:
            v_end = float(np.mean(nv))
        e_t = float(np.sqrt(ind_cal2s ** 2 + (hw * step_units) ** 2 + (2 * step_units) ** 2))
        e_v = float(np.sqrt(dep_cal2s ** 2 + (2.5 * dep_per_px) ** 2))
        rows.append({'curve': c['name'], 'kind': 'curve_end', 't': float(s_end), 'val': v_end, 'err': e_v,
                     't_err': e_t, 'note': 'extreme ink at %.4f (walked %.0f px past the trace, stop: %s); centreline end taken %.1f px inside' % (s_last, ext_px, stop_reason, hw),
                     'merged': [], 'width_px': 2 * hw, 'slope': 0.0})
json.dump(rows, open(cfg['rows_out'], 'w'), indent=0)
for r in rows:
    print('%-10s %-9s %.4f  %.4f +- %.4f  w%.0f %s %s' % (r['curve'], r['kind'], r['t'], r['val'], r['err'], r['width_px'],
                                                 ('MERGED ' + ','.join(r['merged'])) if r['merged'] else '', r['note']))
