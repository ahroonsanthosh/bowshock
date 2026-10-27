"""Calibrate axes from grid/tick lines and measure symbol centres.

usage: python3 -I measure.py LIB CONFIG.json OUTDIR

CONFIG keys:
  image, rot, page, source, item, csv (output csv name), xq, yq
  panels: {name: {box:[x0,y0,x1,y1], xlines:[[px,val,lab],...],
                  ylines:[[px,val,lab],...], xfix:{...} (optional),
                  configuration, mach, ...}}
     xlines: approximate x pixel of a vertical line (grid or tick) and the
     axis value it stands for; lab=1 if the line carries a printed label
     (used in the fit), 0 if not (only checked).  ylines likewise.
     optional 'xband'/'yband': [lo, hi] pixel range along the line to use.
     optional 'xlog'/'ylog': true for a log axis (fit in log10 value).
  symbols: {name: {kind, h, t}}
  points: [{panel, series, sym, x, y, r (search radius, default 4),
            fix (optional: 'x' or 'y' or 'xy' to keep the given coordinate),
            sigma (centre uncertainty px, default 0.7), configuration, mach,
            flag, alt, note, xval (to override x by a stated value), ...}]
Writes OUTDIR/<csv>, OUTDIR/<csv>.cal.txt and overlay PNGs per panel.
"""
import sys, json, os, math
ns = {}
exec(open(sys.argv[1]).read(), ns)
import numpy as np
import cv2

cfg = json.load(open(sys.argv[2]))
outdir = sys.argv[3]
g0 = ns['load_gray'](cfg['image'], cfg.get('rot', 0))
g, linemask = ns['remove_lines'](g0, L=cfg.get('lineL', 61))
H, W = g0.shape
log = []


def P(*a):
    s = ' '.join(str(x) for x in a)
    print(s)
    log.append(s)


MAXW = cfg.get('maxw', 7)
HALF = cfg.get('line_half', 6)


def line_pos(orient, approx, lo, hi, half=HALF, approx_end=None):
    """Measure the centre of a straight dark line near 'approx'.
    orient 'v': vertical line, approx is x, lo..hi rows. Returns a function
    pos(t) giving the line centre at coordinate t along it (robust linear fit
    of per-row centroids), and the residual scatter."""
    ts, cs = [], []
    a0 = approx
    for t in range(int(lo), int(hi)):
        if approx_end is not None:
            approx = a0 + (approx_end - a0) * (t - lo) / float(hi - lo)
        if orient == 'v':
            prof = 255.0 - g0[t, int(approx) - half:int(approx) + half + 1]
        else:
            prof = 255.0 - g0[int(approx) - half:int(approx) + half + 1, t]
        base = np.percentile(prof, 20)
        w = np.clip(prof - base, 0, None)
        if w.max() < 60:
            continue
        # keep only the main peak (contiguous above half max)
        k = int(np.argmax(w))
        m = w[k] * 0.3
        a = k
        while a > 0 and w[a - 1] > m:
            a -= 1
        b = k
        while b < len(w) - 1 and w[b + 1] > m:
            b += 1
        if b - a > MAXW:  # too wide: crossing symbol or text
            continue
        idx = np.arange(a, b + 1)
        c = (idx * w[a:b + 1]).sum() / w[a:b + 1].sum()
        ts.append(t)
        cs.append(int(approx) - half + c)
    ts, cs = np.array(ts, float), np.array(cs, float)
    if len(ts) < 10:
        raise RuntimeError('line not found near %s %s' % (orient, approx))
    # robust fit: iterate dropping outliers
    keep = np.ones(len(ts), bool)
    for _ in range(4):
        A = np.column_stack([np.ones(keep.sum()), ts[keep]])
        co, *_ = np.linalg.lstsq(A, cs[keep], rcond=None)
        r = cs - (co[0] + co[1] * ts)
        s = max(np.std(r[keep]), 0.15)
        keep = np.abs(r) < 3 * s
    return co, float(np.std(r[keep])), int(keep.sum())


class Axis:
    def __init__(self, orient, lines, band, logscale):
        self.orient = orient
        self.logscale = logscale
        self.samples = []
        self.lines = []
        self.lband = []
        for item in lines:
            lb_ = band
            if isinstance(item, dict):
                px, pe, val, lab = item['p'], item.get('pe'), item['val'], item['lab']
                lb_ = item.get('band', band)
                if pe is not None and 'band' in item:
                    pass
            elif len(item) == 4:
                px, pe, val, lab = item
            else:
                (px, val, lab), pe = item, None
            co, sd, n = line_pos('v' if orient == 'x' else 'h', px, lb_[0], lb_[1], approx_end=pe)
            self.lines.append((px, val, lab, co, sd, n))
            self.lband.append(lb_)
        lab = [(l, b) for l, b in zip(self.lines, self.lband) if l[2]]
        # fit value = a + b*u + c*v using each labelled line at 3 stations
        S = []
        for ((px, val, lb, co, sd, n), bb) in lab:
            for t in np.linspace(bb[0], bb[1], 3):
                pos = co[0] + co[1] * t
                vv = math.log10(val) if logscale else val
                if orient == 'x':
                    S.append((pos, t, vv))
                else:
                    S.append((t, pos, vv))
        S = np.array(S)
        A = np.column_stack([np.ones(len(S)), S[:, 0], S[:, 1]])
        self.coef, *_ = np.linalg.lstsq(A, S[:, 2], rcond=None)
        self.S = S

    def value(self, x, y):
        v = self.coef[0] + self.coef[1] * x + self.coef[2] * y
        return 10 ** v if self.logscale else v

    def dval_dpx(self):
        return self.coef[1] if self.orient == 'x' else self.coef[2]

    def report(self, name):
        self.allres = []
        P('  axis %s (%s): value = %.6g + %.6g*u + %.6g*v  (u=x px, v=y px%s)' % (
            self.orient, name, self.coef[0], self.coef[1], self.coef[2], ', log10 value' if self.logscale else ''))
        for (px, val, lb, co, sd, n), bb in zip(self.lines, self.lband):
            mids = []
            for t in np.linspace(bb[0], bb[1], 3):
                pos = co[0] + co[1] * t
                if self.orient == 'x':
                    vv = self.coef[0] + self.coef[1] * pos + self.coef[2] * t
                else:
                    vv = self.coef[0] + self.coef[1] * t + self.coef[2] * pos
                mids.append((pos, t, vv))
            tv = math.log10(val) if self.logscale else val
            resid = [tv - m[2] for m in mids]
            pxres = [r / (self.coef[1] if self.orient == 'x' else self.coef[2]) for r in resid]
            self.allres.extend(pxres)
            P('    line %s=%g %s: px at band ends/mid %s (fit sd %.2f px, n=%d); residual value %s; residual px %s' % (
                self.orient, val, 'LABELLED' if lb else 'unlabelled',
                ' '.join('%.1f' % m[0] for m in mids), sd, n,
                ' '.join('%+.5f' % r for r in resid), ' '.join('%+.2f' % r for r in pxres)))


panels = {}
for name, p in cfg['panels'].items():
    x0, y0, x1, y1 = p['box']
    P('panel %s box %s' % (name, p['box']))
    xb = p.get('xband', [y0 + 5, y1 - 5])
    yb = p.get('yband', [x0 + 5, x1 - 5])
    ax = Axis('x', p['xlines'], xb, p.get('xlog', False))
    ax.band = xb
    ay = Axis('y', p['ylines'], yb, p.get('ylog', False))
    ay.band = yb
    ax.report(name)
    ay.report(name)
    ax.rms_px = float(np.sqrt(np.mean(np.square(ax.allres))))
    ay.rms_px = float(np.sqrt(np.mean(np.square(ay.allres))))
    P('  calibration rms over all lines: x %.2f px, y %.2f px' % (ax.rms_px, ay.rms_px))
    panels[name] = (ax, ay, p)

rows = []
overlays = {}
for i, pt in enumerate(cfg['points']):
    ax, ay, p = panels[pt['panel']]
    sym = dict(cfg['symbols'][pt['sym']])
    r = pt.get('r', 4)
    hr = pt.get('hrange', sym.get('hrange'))
    if hr and not pt.get('nomatch') and not pt.get('curve'):
        best = None
        for hh in np.arange(hr[0], hr[1] + 0.01, 0.5):
            tv = ns['template'](sym['kind'], hh, sym.get('t', 2.5))
            a = ns['match_near'](g if pt.get('nolines', True) else g0, tv, pt['x'], pt['y'], r)
            if best is None or a[2] > best[0]:
                best = (a[2], hh)
        sym['h'] = float(best[1])
    pt['_h'] = sym['h']
    tpl = ns['template'](sym['kind'], sym['h'], sym.get('t', 2.5))
    src = g if pt.get('nolines', True) else g0
    if pt.get('curve'):
        # read a drawn curve at a stated abscissa: find the column for the
        # target x value, then the centre of the dark stroke nearest to the
        # approximate y in a +-r window of that column (3-column average).
        v = pt['y']
        rr = pt.get('r', 15)
        for _ in range(3):
            if ax.logscale:
                tv = math.log10(pt['xtarget'])
            else:
                tv = pt['xtarget']
            u = (tv - ax.coef[0] - ax.coef[2] * v) / ax.coef[1]
            ui = int(round(u))
            y0_ = int(round(v)) - rr
            prof = 255.0 - g0[y0_:y0_ + 2 * rr + 1, ui - 1:ui + 2].mean(axis=1)
            base = np.percentile(prof, 30)
            w = np.clip(prof - base, 0, None)
            thr_ = 0.4 * w.max()
            segs = []
            k = 0
            while k < len(w):
                if w[k] > thr_:
                    a = k
                    while k < len(w) and w[k] > thr_:
                        k += 1
                    idx = np.arange(a, k)
                    segs.append(((idx * w[a:k]).sum() / w[a:k].sum() + y0_, k - a))
                k += 1
            want = pt.get('pick_y', v)
            segs.sort(key=lambda sg: abs(sg[0] - want))
            v = segs[0][0]
        xc, yc, s, edge = u, v, float('nan'), False
        pt.setdefault('segs', segs)
        P('    curve read at x=%g: column %.1f, stroke segments (centre, width px): %s' % (
            pt['xtarget'], u, ', '.join('(%.1f, %d)' % sg for sg in sorted(segs))))
    elif pt.get('nomatch'):
        xc, yc, s, edge = pt['x'], pt['y'], float('nan'), False
    else:
        xc, yc, s, edge = ns['match_near'](src, tpl, pt['x'], pt['y'], r)
    if pt.get('dot') and not pt.get('nomatch'):
        # centre dot: darkest compact blob within +-R px of the outline centre
        R = pt.get('dot_r', 5)
        if pt.get('use_dot'):
            xi, yi = int(round(pt['x'])), int(round(pt['y']))
        else:
            xi, yi = int(round(xc)), int(round(yc))
        R2 = R + 4
        win = g[yi - R2:yi + R2 + 1, xi - R2:xi + R2 + 1].astype(float)
        bg = np.percentile(g[yi - 3 * R:yi + 3 * R, xi - 3 * R:xi + 3 * R], 80)
        best = None
        for thr_ in pt.get('dot_thrs', [25, 50, 80, 110]):
            mask = (win < bg - thr_).astype(np.uint8)
            ncc, labs, stt, _ = cv2.connectedComponentsWithStats(mask, 8)
            for kk in range(1, ncc):
                bx, by, bw, bh, ba = stt[kk]
                if bw > 7 or bh > 7 or ba < 2:
                    continue
                ys_, xs_ = np.nonzero(labs == kk)
                d2 = ((xs_ - R2) ** 2 + (ys_ - R2) ** 2).min()
                if d2 > R * R:
                    continue
                if best is None or d2 < best[0]:
                    best = (d2, kk)
            if best is not None:
                pt['_dot_thr'] = thr_
                break
        w = None
        if best is not None:
            m2 = cv2.dilate((labs == best[1]).astype(np.uint8), np.ones((3, 3), np.uint8))
            w = np.clip(bg - win, 0, None) * m2
        if w is not None and w.sum() > 0:
            yy, xx = np.mgrid[-R2:R2 + 1, -R2:R2 + 1]
            dx_, dy_ = (xx * w).sum() / w.sum(), (yy * w).sum() / w.sum()
            P('    dot centroid (%.2f, %.2f), offset from outline centre: (%+.2f, %+.2f) px, weight %.0f' % (xi + dx_, yi + dy_, xi + dx_ - xc, yi + dy_ - yc, w.sum()))
            pt['_dot'] = (xi + dx_, yi + dy_)
            pt['_ol'] = (xc, yc)
            if pt.get('use_dot'):
                xc, yc = xi + dx_, yi + dy_
        else:
            P('    no separate centre dot found (dot missing or merged with a stroke): outline fit kept')
            pt['_nodot'] = True
    # robustness check: same point matched with variant templates/images
    alts = []
    vnames = ['grid lines kept in the image', 'template 0.5 px smaller', 'template 0.5 px larger', 'thinner template stroke']
    if not pt.get('nomatch') and not pt.get('curve'):
        for (img_, dh, dt) in ((g0, 0, 0), (src, -0.5, 0), (src, 0.5, 0), (src, 0, -0.5)):
            tv = ns['template'](sym['kind'], sym['h'] + dh, sym.get('t', 2.5) + dt)
            a = ns['match_near'](img_, tv, pt['x'], pt['y'], r)
            alts.append((a[0] - xc, a[1] - yc))
    nt = pt.get('note', '')
    if alts and not pt.get('use_dot') and not pt.get('fix') and ('overlap' in nt or 'inside' in nt or 'touch' in nt or pt.get('ovl')):
        k = int(np.argmax([math.hypot(a[0], a[1]) for a in alts]))
        if math.hypot(alts[k][0], alts[k][1]) > pt.get('alt_min', 1.0):
            pt.setdefault('alt_px', []).append((xc + alts[k][0], yc + alts[k][1],
                'the centre comes from a variant fit (%s) that the overlapping strokes pull %.1f px away' % (vnames[k], math.hypot(alts[k][0], alts[k][1]))))
    spread = max([abs(a[1]) for a in alts] + [0])
    spreadx = max([abs(a[0]) for a in alts] + [0])
    fix = pt.get('fix', '')
    if 'x' in fix:
        xc = pt['x']
    if 'y' in fix:
        yc = pt['y']
    xv = ax.value(xc, yc)
    yv = ay.value(xc, yc)
    sig = pt.get('sigma', 0.7)
    if pt.get('use_dot') and '_dot' in pt:
        sig = math.hypot(sig, 0.5 * math.hypot(pt['_ol'][0] - xc, pt['_ol'][1] - yc))
    ex = math.hypot(sig, ax.rms_px) * abs(ax.coef[1]) if not ax.logscale else math.hypot(sig, ax.rms_px) * abs(ax.coef[1]) * math.log(10) * abs(xv)
    ey = math.hypot(sig, ay.rms_px) * abs(ay.coef[2]) if not ay.logscale else math.hypot(sig, ay.rms_px) * abs(ay.coef[2]) * math.log(10) * abs(yv)
    rows.append(dict(pt=pt, ol=pt.get('_ol', (xc, yc)), xc=xc, yc=yc, score=s, edge=edge, xv=xv, yv=yv, ex=ex, ey=ey, spread=spread, spreadx=spreadx))
    overlays.setdefault(pt['panel'], []).append((i, xc, yc, sym, pt))
    pt['_sym'] = sym
    P('%3d %-6s %-22s %-8s h=%.1f px=(%.2f,%.2f) d=(%+.1f,%+.1f) score=%.3f%s spread=(%.1f,%.1f)%s x=%.4f y=%.5f +-%.5f' % (
        i, pt['panel'], pt['series'][:22], pt['sym'], sym['h'], xc, yc, xc - pt['x'], yc - pt['y'], s,
        ' EDGE' if edge else '', spreadx, spread, ' <<' if max(spread, spreadx) > 1.0 else '', xv, yv, ey))

# overlays: draw fitted template outline in colour on the original image
cols = [(0, 0, 255), (0, 170, 0), (255, 0, 0), (200, 0, 200), (0, 140, 255), (160, 120, 0), (0, 200, 200)]
symnames = list(cfg['symbols'].keys())
SC = cfg.get('overlay_scale', 3)
for name, lst in overlays.items():
    x0, y0, x1, y1 = cfg['panels'][name]['box']
    crop = g0[y0:y1, x0:x1].astype(np.uint8)
    ov = cv2.cvtColor(crop, cv2.COLOR_GRAY2BGR)
    ov = cv2.resize(ov, None, fx=SC, fy=SC, interpolation=cv2.INTER_NEAREST)
    for (i, xc, yc, sym, pt) in lst:
        c = cols[symnames.index(pt['sym']) % len(cols)]
        tpl = ns['template'](sym['kind'], sym['h'], 1.0, pad=0)
        th, tw = tpl.shape
        ys, xs = np.nonzero(tpl > 100)
        for yy, xx in zip(ys, xs):
            X = int(round((xc - tw // 2 + xx - x0) * SC + SC / 2))
            Y = int(round((yc - th // 2 + yy - y0) * SC + SC / 2))
            if 0 <= X < ov.shape[1] and 0 <= Y < ov.shape[0]:
                ov[Y, X] = c
        X, Y = int((xc - x0) * SC), int((yc - y0) * SC)
        cv2.circle(ov, (X, Y), 1, c, -1)
        cv2.putText(ov, str(i), (X + int(sym['h'] * SC) + 2, Y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, c, 1)
    cv2.imwrite(os.path.join(outdir, '%s_%s_overlay.png' % (cfg['csv'].replace('.csv', ''), name)), ov)


ZS = 8


def outline(t, kind, h, cx, cy, Z, c):
    base = kind[:-2] if kind.endswith('_f') else kind
    sh = 4
    f = 1 << sh
    if base == 'circle':
        cv2.circle(t, (int(cx * f), int(cy * f)), int(h * Z * f), c, 1, cv2.LINE_AA, sh)
        return
    import math as _m
    if base == 'square':
        p = [(-h, -h), (h, -h), (h, h), (-h, h)]
    elif base == 'diamond':
        p = [(0, -h), (h, 0), (0, h), (-h, 0)]
    elif base == 'triangle':
        p = [(0, -h), (h * 0.866, h * 0.5), (-h * 0.866, h * 0.5)]
    elif base == 'triangle_down':
        p = [(0, h), (h * 0.866, -h * 0.5), (-h * 0.866, -h * 0.5)]
    elif base == 'rtriangle':
        p = [(h, 0), (-h * 0.5, h * 0.866), (-h * 0.5, -h * 0.866)]
    elif base == 'ltriangle':
        p = [(-h, 0), (h * 0.5, h * 0.866), (h * 0.5, -h * 0.866)]
    elif base == 'octagon':
        a = _m.pi / 8
        p = [(h * _m.cos(a + k * _m.pi / 4), h * _m.sin(a + k * _m.pi / 4)) for k in range(8)]
    elif base == 'hexagon':
        p = [(h * _m.cos(k * _m.pi / 3), h * _m.sin(k * _m.pi / 3)) for k in range(6)]
    else:
        p = [(-h, 0), (h, 0), (0, 0), (0, -h), (0, h), (0, 0)]
    pts = np.array([[(cx + x * Z) * f, (cy + y * Z) * f] for x, y in p], np.int32)
    cv2.polylines(t, [pts], True, c, 1, cv2.LINE_AA, sh)


tiles = []
for i, r in enumerate(rows):
    pt = r['pt']
    sym = pt.get('_sym', cfg['symbols'][pt['sym']])
    half = int(sym['h'] + 14)
    xc, yc = r['xc'], r['yc']
    X0, Y0 = int(round(xc)) - half, int(round(yc)) - half
    crop = g0[max(Y0, 0):Y0 + 2 * half, max(X0, 0):X0 + 2 * half].astype(np.uint8)
    t = cv2.cvtColor(crop, cv2.COLOR_GRAY2BGR)
    t = cv2.resize(t, None, fx=ZS, fy=ZS, interpolation=cv2.INTER_NEAREST)
    c = cols[symnames.index(pt['sym']) % len(cols)]
    outline(t, sym['kind'], sym['h'], (xc - X0 + 0.5) * ZS, (yc - Y0 + 0.5) * ZS, ZS, c)
    cx, cy = int(round((xc - X0) * ZS)), int(round((yc - Y0) * ZS))
    cv2.drawMarker(t, (cx, cy), c, cv2.MARKER_CROSS, 12, 1)
    cv2.putText(t, '%d %s %s' % (i, pt['panel'], pt['sym']), (3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
    tiles.append(t)
if tiles:
    TS = max(max(t.shape[0], t.shape[1]) for t in tiles)
    ncol = 4
    for k0 in range(0, len(tiles), 12):
        chunk = tiles[k0:k0 + 12]
        nrow = (len(chunk) + ncol - 1) // ncol
        sheet = np.full((nrow * TS, ncol * TS, 3), 255, np.uint8)
        for k, t in enumerate(chunk):
            rr, cc = divmod(k, ncol)
            sheet[rr * TS:rr * TS + t.shape[0], cc * TS:cc * TS + t.shape[1]] = t
        cv2.imwrite(os.path.join(outdir, '%s_sheet%02d.png' % (cfg['csv'].replace('.csv', ''), k0 // 12)), sheet)


def fmt(v, nd):
    return ('%.' + str(nd) + 'f') % v


import csv
nd_x = cfg.get('nd_x', 3)
nd_y = cfg.get('nd_y', 4)
with open(os.path.join(outdir, cfg['csv']), 'w', newline='') as f:
    w = csv.writer(f, lineterminator='\n')
    w.writerow(['source', 'item', 'series', 'configuration', 'mach', 'x', 'x_quantity', 'y', 'y_quantity',
                'alternatives', 'flag', 'page', 'note'])
    for r in rows:
        pt = r['pt']
        p = cfg['panels'][pt['panel']]
        if pt.get('omit'):
            continue
        conf = pt.get('configuration', p.get('configuration', ''))
        mach = pt.get('mach', p.get('mach', ''))
        xs = pt['xval'] if 'xval' in pt else fmt(r['xv'], pt.get('nd_x', p.get('nd_x', nd_x)))
        if cfg.get('mach_from_x'):
            mach = xs
        ys = '' if (pt.get('flag') == 'illegible' or pt.get('omit_y')) else fmt(r['yv'], pt.get('nd_y', p.get('nd_y', nd_y)))
        if pt.get('_nodot') and pt.get('use_dot'):
            how0 = 'no separate centre dot found, centre from outline template match %.2f' % r['score']
        else:
            how0 = None
        how = how0 if how0 else ('centre taken from the printed centre dot (outline template match %.2f, outline centre (%.1f, %.1f))' % (r['score'], r['ol'][0], r['ol'][1])) if (pt.get('use_dot') and '_dot' in pt) else ('template match %.2f' % r['score']) if r['score'] == r['score'] else ('stroke read on a column' if pt.get('curve') else 'centre placed from the pixel map, no template fit')
        note = 'centre px (%.1f, %.1f) on %s page scan, %s; reading error x +-%s, y +-%s' % (
            r['xc'], r['yc'], 'rotated' if cfg.get('rot') else 'unrotated', how,
            fmt(pt.get('ex', r['ex']), pt.get('nd_x', p.get('nd_x', nd_x)) + 1),
            fmt(pt.get('ey', r['ey']), pt.get('nd_y', p.get('nd_y', nd_y)) + 1))
        if pt.get('xval'):
            note = 'x is the stated value, not read from the axis (read %.3f); ' % r['xv'] + note
        if pt.get('note'):
            note = pt['note'] + '; ' + note
        if p.get('note'):
            note = note + '; ' + p['note']
        alt = pt.get('alt', '')
        if pt.get('tri_bbox'):
            hh = pt.get('_h', cfg['symbols'][pt['sym']]['h'])
            kind = cfg['symbols'][pt['sym']]['kind']
            dy = -hh / 4.0 if kind == 'triangle' else hh / 4.0
            pt.setdefault('alt_px', []).append((r['xc'], r['yc'] + dy, 'the point is the centre of the triangle\'s bounding box rather than its centroid'))
        if pt.get('use_dot') and '_dot' in pt:
            ol = r['ol']
            if math.hypot(ol[0] - r['xc'], ol[1] - r['yc']) > pt.get('alt_offset', 2.5):
                pt.setdefault('alt_px', []).append((ol[0], ol[1], 'the centre is taken from the outline fit instead of the centre dot'))
        if pt.get('alt_px'):
            ax_, ay_, _ = panels[pt['panel']]
            parts = []
            for (axp, ayp, why) in pt['alt_px']:
                parts.append('y %s (x %s) if %s' % (fmt(ay_.value(axp, ayp), pt.get('nd_y', p.get('nd_y', nd_y))),
                                                   fmt(ax_.value(axp, ayp), pt.get('nd_x', p.get('nd_x', nd_x))), why))
            alt = '; '.join(([alt] if alt else []) + parts)
        w.writerow([cfg['source'], pt.get('item', p.get('item', cfg['item'])), pt['series'], conf, mach, xs,
                    pt.get('xq', p.get('xq', cfg.get('xq', ''))), ys, pt.get('yq', p.get('yq', cfg.get('yq', ''))),
                    alt, ('ambiguous' if (alt and pt.get('flag', 'ok') == 'ok') else pt.get('flag', 'ok')), cfg['page'], note])
    for er in cfg.get('extra_rows', []):
        w.writerow([cfg['source'], er['item'], er['series'], er['configuration'], er.get('mach', ''), er.get('x', ''),
                    er.get('xq', cfg.get('xq', '')), er.get('y', ''), er.get('yq', cfg.get('yq', '')), er.get('alt', ''),
                    er['flag'], cfg['page'], er['note']])
open(os.path.join(outdir, cfg['csv'] + '.cal.txt'), 'w').write('\n'.join(log) + '\n')
