"""Readings of RM A52E01 fig. 8 curves at fixed angles of attack, from hand-assigned dash chains.

usage: python3 -I read8.py <render_dir> <cal_json> <comp_dir> <cfg_module> <out_json> [panel ...]

Each curve is an ordered chain of ink components (dashes, after grid-line removal, comp8.py),
assigned by me from the labelled component images. For a target alpha t:
  - direct: the curve's own ink is sampled along the line alpha = t (0.25 px steps, nearest
    pixel); each run of ink gives the centroid x (one row per run, so a curve that folds back
    in alpha gives one row per branch);
  - bridged: where t falls in a gap between two consecutive pieces of the chain (dash gap, or
    a grid line that was masked out), x is read on the straight line joining the two facing
    centre-line ends of those pieces.
Ends: the outer centre-line end of the first and last piece (centroid of the ink within 4 px of
the extreme pixel). An end that stops at a grid line or the frame is noted (its ink may go on
under the line).
"""
import sys, os, json, math, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import calib, trace

SIG_PLACE_PX = 2.0     # 1 sigma, render px (1 native px of the 240 dpi bilevel scan)
HW_IN, HW_FRAME = 5.5, 7.5
GRID_XV = [round(-0.1 * k, 1) for k in range(9)]


def comp_info(c, cx, cy):
    px = np.array(c['px'], float)
    py = np.array(c['py'], float)
    mx, my = px.mean(), py.mean()
    cov = np.cov(np.vstack([px - mx, py - my]))
    w, v = np.linalg.eigh(cov)
    d = v[:, 1]
    proj = (px - mx) * d[0] + (py - my) * d[1]
    ends = []
    for ex in (proj.min(), proj.max()):
        m = np.abs(proj - ex) <= 4.0
        ends.append((px[m].mean(), py[m].mean()))
    return dict(px=px, py=py, ends=ends, dirv=d)


def to_plot(cal, p):
    return trace.fwd(cal['cx'], cal['cy'], p[0], p[1])


def grid_dist(cal, p):
    """distance in px from point p to the nearest grid line, and that line ('v'|'h', index)"""
    best = (1e9, None)
    for i, l in enumerate(cal['vlines']):
        a, b = l
        d = abs(p[0] - (a + b * p[1]))
        if d < best[0]:
            best = (d, ('v', i))
    for j, l in enumerate(cal['hlines']):
        a, b = l
        d = abs(p[1] - (a + b * p[0]))
        if d < best[0]:
            best = (d, ('h', j))
    return best


def chain_geometry(chain, comps, cal):
    """Order each piece's ends along the chain. Returns list of (info, entry_end, exit_end)."""
    infos = [comp_info(comps[k], cal['cx'], cal['cy']) for k in chain]
    out = []
    for i, inf in enumerate(infos):
        e0, e1 = inf['ends']
        if i == 0:
            if len(infos) > 1:
                nxt = infos[1]
                dn0 = min(math.dist(e0, q) for q in nxt['ends'])
                dn1 = min(math.dist(e1, q) for q in nxt['ends'])
                entry, exit_ = (e0, e1) if dn1 < dn0 else (e1, e0)
            else:
                entry, exit_ = e0, e1
        else:
            prev_exit = out[-1][2]
            entry, exit_ = (e0, e1) if math.dist(e0, prev_exit) <= math.dist(e1, prev_exit) else (e1, e0)
        out.append((inf, entry, exit_))
    return out


def sample_runs(mask, L, T, cal, t, xlo, xhi):
    """Runs of mask pixels along alpha = t between plot x xlo..xhi (xlo > xhi allowed)."""
    sx = cal['stats']['sx']
    n = int(abs(xhi - xlo) * sx * 4) + 2
    X = np.linspace(xlo, xhi, n)
    p = trace.inv(cal['cx'], cal['cy'], X, np.full_like(X, t))
    ix = np.round(p[0]).astype(int) - L
    iy = np.round(p[1]).astype(int) - T
    ok = (ix >= 0) & (iy >= 0) & (ix < mask.shape[1]) & (iy < mask.shape[0])
    v = np.zeros(n, bool)
    v[ok] = mask[iy[ok], ix[ok]]
    runs = []
    i = 0
    while i < n:
        if v[i]:
            j = i
            while j + 1 < n and v[j + 1]:
                j += 1
            runs.append([i, j])
            i = j + 1
        else:
            i += 1
    merged = []
    for r in runs:
        if merged and (r[0] - merged[-1][1]) <= 12:   # 12 samples = 3 px
            merged[-1][1] = r[1]
        else:
            merged.append(list(r))
    out = []
    for i, j in merged:
        m = v[i:j + 1]
        out.append((float(X[i:j + 1][m].mean()), float(X[i]), float(X[j])))
    return out


def main():
    rdir, calp, compd, cfgname, outp = sys.argv[1:6]
    only = sys.argv[6:]
    cfg = importlib.import_module(cfgname)
    CAL = json.load(open(calp))
    out = []
    for pname, P in cfg.PANELS.items():
        if only and pname not in only:
            continue
        cal = CAL[pname]
        comps = {c['id']: c for c in json.load(open(os.path.join(compd, f'comps_{pname}.json')))}
        sx, sy = cal['stats']['sx'], cal['stats']['sy']
        for cname, C in P['curves'].items():
            chain = C['chain']
            geo = chain_geometry(chain, comps, cal)
            allpx = np.concatenate([g[0]['px'] for g in geo])
            allpy = np.concatenate([g[0]['py'] for g in geo])
            L, T = int(allpx.min()) - 3, int(allpy.min()) - 3
            R, Bm = int(allpx.max()) + 4, int(allpy.max()) + 4
            mask = np.zeros((Bm - T, R - L), bool)
            mask[(allpy - T).astype(int), (allpx - L).astype(int)] = True
            # per-piece masks for branch/piece attribution
            piece_of = -np.ones(mask.shape, int)
            for i, g in enumerate(geo):
                piece_of[(g[0]['py'] - T).astype(int), (g[0]['px'] - L).astype(int)] = i
            shared_ids = set(C.get('shared', []))
            # plot-unit geometry
            ends_pl = [(to_plot(cal, g[1]), to_plot(cal, g[2])) for g in geo]
            ys_all = trace.fwd(cal['cx'], cal['cy'], allpx, allpy)[1]
            xs_all = trace.fwd(cal['cx'], cal['cy'], allpx, allpy)[0]
            x_lo, x_hi = float(xs_all.max()) + 0.01, float(xs_all.min()) - 0.01
            # ---- ends
            cap = [ends_pl[0][0], ends_pl[-1][1]]
            endnotes = []
            for k, (endp_px, endp) in enumerate([(geo[0][1], cap[0]), (geo[-1][2], cap[1])]):
                if k in C.get('no_end', []):
                    continue
                dgl, line = grid_dist(cal, endp_px)
                hw = HW_FRAME if line and line[1] in (0, 8) else HW_IN
                touches = dgl <= hw + 4.0
                note = ('first' if k == 0 else 'last') + ' end of chain: centre of the outermost ink'
                xb = 2 * math.hypot(cal['stats']['rmsx'], SIG_PLACE_PX / sx)
                yb = 2 * math.hypot(cal['stats']['rmsy'], SIG_PLACE_PX / sy)
                flag = ''
                basis = '2sigma'
                if touches:
                    which = ('alpha line %g' % cal_val(line, cfg)) if line[0] == 'h' else (
                        'x line %g' % cal_val(line, cfg))
                    note += f'; it stops at the {which} grid line, so the ink may go on under that line'
                    basis = 'bound'
                    if line[0] == 'h':
                        yb += (hw + 4) / sy
                    else:
                        xb += (hw + 4) / sx
                ov = C.get('end_notes', {}).get(k)
                if ov:
                    note += '; ' + ov[1]
                    flag = ov[0] or flag
                out.append(dict(panel=P['panel'], pkey=pname, curve=cname, series=C['series'],
                                kind='curve_end', x=endp[0], x_err=xb, y=endp[1], y_err=yb,
                                err_basis=basis, flag=flag, note=note, style=C['style']))
            # ---- alpha = 0
            a_lo = min(cap[0][1], cap[1][1], float(ys_all.min()))
            a_hi = max(cap[0][1], cap[1][1], float(ys_all.max()))
            zero_end = None
            for k, (endp_px, endp) in enumerate([(geo[0][1], cap[0]), (geo[-1][2], cap[1])]):
                a8, b8 = cal['hlines'][8]
                dfr = abs(endp_px[1] - (a8 + b8 * endp_px[0]))
                if dfr <= HW_FRAME + 4:
                    zero_end = (k, endp)
                    near_only = False
                elif dfr <= HW_FRAME + 8 and zero_end is None:
                    zero_end = (k, endp)
                    near_only = True
            # ---- targets
            step = C.get('step')
            if step is None:
                n1 = math.floor(a_hi) - math.ceil(a_lo) + 1
                step = 1.0 if n1 >= 8 else 0.5
            tg = [round(math.ceil(a_lo / step) * step + step * i, 3)
                  for i in range(int((a_hi - math.ceil(a_lo / step) * step) / step) + 1)]
            tg = [t for t in tg if a_lo <= t <= a_hi and t > 0]
            for t in tg:
                cands = []
                for (xm, xa, xb_) in sample_runs(mask, L, T, cal, t, x_lo, x_hi):
                    # which piece
                    p = trace.inv(cal['cx'], cal['cy'], [xm], [t])
                    ii = piece_of[min(max(int(round(p[1][0])) - T, 0), mask.shape[0] - 1),
                                  min(max(int(round(p[0][0])) - L, 0), mask.shape[1] - 1)]
                    cands.append(dict(x=xm, kind='direct', run=abs(xb_ - xa), piece=int(ii), xa=xa, xb=xb_))
                for i in range(len(geo) - 1):
                    A = ends_pl[i][1]
                    Bp = ends_pl[i + 1][0]
                    if (A[1] - t) * (Bp[1] - t) < 0:
                        f = (t - A[1]) / (Bp[1] - A[1])
                        xg = A[0] + f * (Bp[0] - A[0])
                        gap_px = math.dist(geo[i][2], geo[i + 1][1])
                        cands.append(dict(x=xg, kind='bridge', gap=gap_px, i=i,
                                          slope=(Bp[0] - A[0]) / (Bp[1] - A[1])))
                # drop bridge candidates that duplicate a direct run (within 12 px)
                direct = [c for c in cands if c['kind'] == 'direct']
                keep = list(direct)
                for c in cands:
                    if c['kind'] == 'bridge' and all(abs(c['x'] - d['x']) * sx > 30 for d in direct):
                        keep.append(c)
                keep.sort(key=lambda c: c['x'], reverse=True)
                nb = len(keep)
                for bi, c in enumerate(keep):
                    # local slope dx/dalpha from runs at t +- 3 px
                    if c['kind'] == 'direct':
                        sl = []
                        for dt in (-3.0 / sy, 3.0 / sy):
                            rr = sample_runs(mask, L, T, cal, t + dt, x_lo, x_hi)
                            if rr:
                                xn = min(rr, key=lambda r: abs(r[0] - c['x']))[0]
                                if abs(xn - c['x']) * sx < 25:
                                    sl.append((xn - c['x']) / dt)
                        slope = float(np.mean(sl)) if sl else 0.0
                        sig_extra = 0.0
                        note = ''
                    else:
                        slope = c['slope']
                        sig_extra = 0.15 * c['gap']
                        note = f"in a {c['gap']:.0f} px gap of this curve's ink (dash gap or masked grid line); read on the straight line joining the facing dash ends"
                    sigx = math.sqrt(cal['stats']['rmsx'] ** 2 + (SIG_PLACE_PX / sx) ** 2
                                     + (sig_extra / sx) ** 2 + (slope * cal['stats']['rmsy']) ** 2
                                     + (slope * 0.5 / sy) ** 2)
                    flag = ''
                    notes = [note] if note else []
                    if nb > 1:
                        notes.append(f'branch {bi + 1} of {nb} at this alpha (numbered from the least '
                                     f'negative x)')
                    if c['kind'] == 'bridge' and c['gap'] > 30:
                        flag = 'uncertain'
                        notes.append('long gap')
                    if c['kind'] == 'direct' and geo and c.get('piece', -1) >= 0 and \
                            chain[c['piece']] in shared_ids:
                        flag = 'uncertain'
                        notes.append('this ink is shared with another curve (crossing or touching)')
                    if c['kind'] == 'bridge' and (chain[c['i']] in shared_ids or chain[c['i'] + 1] in shared_ids):
                        flag = 'uncertain'
                        notes.append('gap next to ink shared with another curve')
                    if abs(slope) > 0.05:
                        notes.append(f'curve nearly level here (dx/dalpha {slope:+.3f} per deg), x error large')
                        flag = 'uncertain'
                    kind_row = 'curve'
                    basis_row = '2sigma'
                    xe_extra = 0.0
                    gl_hw = HW_IN / sx
                    if c['kind'] == 'direct':
                        # run edges next to a masked vertical grid line: stroke partly hidden
                        for gx in GRID_XV:
                            if gx in (0.0, -0.8):
                                continue
                            if min(abs(c['xa'] - gx), abs(c['xb'] - gx)) <= gl_hw + 1.5 / sx:
                                notes.append(f'stroke partly under the x = {gx:g} grid line (masked); its '
                                             f'centre may sit up to half a stroke nearer the line')
                                flag = 'uncertain'
                                xe_extra = 4.0 / sx
                                basis_row = 'bound'
                                break
                    else:
                        A = ends_pl[c['i']][1]
                        Bp = ends_pl[c['i'] + 1][0]
                        for gx in GRID_XV:
                            if gx in (0.0, -0.8):
                                continue
                            if abs(A[0] - gx) <= gl_hw + 3 / sx and abs(Bp[0] - gx) <= gl_hw + 3 / sx \
                                    and abs(A[0] - Bp[0]) * sx < 5 and c['gap'] > 16:
                                kind_row = 'box'
                                basis_row = 'bound'
                                flag = 'uncertain'
                                xe_extra = (HW_IN + 5) / sx
                                notes.append(f'the curve runs along the x = {gx:g} grid line here and its ink '
                                             f'is merged with the line; box half-width covers the line and '
                                             f'half a stroke')
                                break
                    for (a0, a1, fl, nt) in C.get('range_notes', []):
                        if a0 <= t <= a1:
                            notes.append(nt)
                            if fl:
                                flag = fl
                    out.append(dict(panel=P['panel'], pkey=pname, curve=cname, series=C['series'],
                                    kind=kind_row, x=c['x'], x_err=2 * sigx + xe_extra, y=t,
                                    y_err=2 * cal['stats']['rmsy'], err_basis=basis_row, flag=flag,
                                    note='; '.join(notes), style=C['style']))
            for me in C.get('manual_ends', []):
                out.append(dict(panel=P['panel'], pkey=pname, curve=cname, series=C['series'],
                                kind='curve_end', x=me['x'], x_err=me['xe'], y=me['y'], y_err=me['ye'],
                                err_basis='bound', flag='uncertain',
                                note='end read by eye on a 3x zoom with 0.01 and 0.25 deg tick marks: ' + me['note'],
                                style=C['style']))
            # boxes where the curve's ink is merged with a grid line or another curve (my calls)
            gink = gcache_get(rdir, cal['img']) < 128
            for bx in C.get('boxes', []):
                if 'skip' in bx:
                    a0, a1 = bx['skip']
                    out[:] = [r for r in out if not (r['pkey'] == pname and r['curve'] == cname and
                                                     r['kind'] == 'curve' and a0 <= r['y'] <= a1)]
                for t in bx['alphas'] + ([0.0] if bx.get('zero') else []):
                    ts = [0.16] if t == 0.0 else ([t - 0.17, t + 0.17] if abs(t - 2 * round(t / 2)) < 0.12
                                                   else [t])
                    los, his = [], []
                    for tt in ts:
                        rr = sample_runs(gink, 0, 0, cal, tt, bx['anchor'] + 0.05, bx['anchor'] - 0.05)
                        if rr:
                            r0 = min(rr, key=lambda r: abs(r[0] - bx['anchor']))
                            los.append(min(r0[1], r0[2]))
                            his.append(max(r0[1], r0[2]))
                    if not los:
                        continue
                    lo, hi = min(los), max(his)
                    w1 = 9.0 / sx
                    a, b = lo + 0.35 * w1, hi - 0.35 * w1
                    if b < a:
                        a = b = 0.5 * (lo + hi)
                    base = 2 * math.hypot(cal['stats']['rmsx'], SIG_PLACE_PX / sx)
                    zero = t == 0.0
                    out.append(dict(panel=P['panel'], pkey=pname, curve=cname, series=C['series'],
                                    kind='curve_at_zero' if zero else 'box', x=0.5 * (a + b),
                                    x_err=0.5 * (b - a) + base, y=float(t),
                                    y_err=(0.16 + 2 * cal['stats']['rmsy']) if zero else 2 * cal['stats']['rmsy'],
                                    err_basis='bound', flag='uncertain',
                                    note=bx['note'] + (f'; at alpha 0, read just above the frame line (alpha 0.16)'
                                                       if zero else '') +
                                    ('; alpha on a grid line: union of the runs 0.17 deg above and below'
                                     if len(ts) == 2 else '') +
                                    f'; box = merged ink run {lo:+.3f} to {hi:+.3f} less 0.35 '
                                    f'stroke width each side', style=C['style']))
                    if zero:
                        C['_zero_done'] = True
            # alpha = 0 row (idflag applied below)
            if zero_end is not None:
                k, endp = zero_end
                g = geo[0] if k == 0 else geo[-1]
                inf = g[0]
                # direction of the end piece near its outer end, to carry it to the frame centre
                py = inf['py']
                px = inf['px']
                endpx = g[1] if k == 0 else g[2]
                m = np.hypot(px - endpx[0], py - endpx[1]) <= 14
                Xs, Ys = trace.fwd(cal['cx'], cal['cy'], px[m], py[m])
                if np.ptp(Ys) > 1e-6:
                    A = np.vstack([np.ones(m.sum()), Ys]).T
                    coef, *_ = np.linalg.lstsq(A, Xs, rcond=None)
                    x0 = endp[0] + coef[1] * (0 - endp[1])
                    sl = coef[1]
                else:
                    x0, sl = endp[0], 0.0
                ext = abs(endp[1]) * sy
                xe = 2 * math.sqrt(cal['stats']['rmsx'] ** 2 + (SIG_PLACE_PX / sx) ** 2) + abs(sl) * abs(endp[1]) + 2 / sx
                if near_only:
                    pre = (f'the curve stops about {endp[1]:.2f} deg above the alpha = 0 frame centre, a gap of only '
                           f'a few px to the frame edge; if it is taken to reach alpha 0: ')
                else:
                    pre = ''
                out.append(dict(panel=P['panel'], pkey=pname, curve=cname, series=C['series'],
                                kind='curve_at_zero', x=float(x0), x_err=float(xe), y=0.0,
                                y_err=2 * cal['stats']['rmsy'], err_basis='bound',
                                flag='uncertain' if near_only else '',
                                note=pre + (f'the curve runs into the alpha = 0 frame line; x carried from the '
                                      f'visible end (alpha {endp[1]:.2f}, {ext:.0f} px above the frame centre) '
                                      f'to alpha 0 along the end dash direction; bound adds that carry'),
                                style=C['style']))
            elif not C.get('_zero_done'):
                out.append(dict(panel=P['panel'], pkey=pname, curve=cname, series=C['series'],
                                kind='curve_at_zero', x=None, x_err=None, y=0.0, y_err=None,
                                err_basis='', flag='',
                                note=f'the curve does not reach alpha = 0 (lowest drawn alpha {a_lo:.2f})',
                                style=C['style']))
    for r in out:
        C = cfg.PANELS[r['pkey']]['curves'][r['curve']]
        if C.get('idflag'):
            r['flag'] = 'uncertain'
            r['note'] = (r['note'] + '; ' if r['note'] else '') + 'curve identity: ' + C['idflag'][1]
    json.dump(out, open(outp, 'w'), indent=0)
    print('readings', len(out))


_GC = {}


def gcache_get(rdir, img):
    if img not in _GC:
        _GC[img] = calib.load_gray(os.path.join(rdir, img))
    return _GC[img]


def cal_val(line, cfg):
    if line[0] == 'v':
        return round(-0.1 * line[1], 1)
    return 16 - 2 * line[1]


if __name__ == '__main__':
    main()
