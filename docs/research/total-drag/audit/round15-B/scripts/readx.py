"""Readings at fixed abscissae (RM A51J11 figs. 14 and 15) from dense traces.

usage: python3 -I readx.py <render_dir> <cal_json> <cfg_module> <trace_dir> <out_json> [panel...]

Steps per panel:
 1. resolve shared runs (ink claimed by two curves):
    - a shared run no wider than 1.3 single stroke widths is given to the continuous curve of
      the pair (the broken curve is then in a dash gap or lies exactly on it); marked 'ovl';
    - inside configured near-parallel zones ('par_zones'), a wider shared run is split by its
      edges: the curve on the low side gets lo + w1/2, the other hi - w1/2 (w1 = local single
      stroke width along the scan); marked 'edge';
    - other wide shared runs stay shared (used only for boxes).
 2. curve ends: walk outward from the trace to the last dark ink column; the end is the centre
    of the round end cap (half a stroke width inside the outermost ink).
 3. readings at targets with curves.read_at; errors as described in method.md.
"""
import sys, os, json, importlib, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import calib, curves, trace

SIG_PLACE_PX = 1.5   # 1 sigma placement of a stroke centre line, render px


def local_width(tr, s, s_px, d=40, exclude_flags=('edge',)):
    S = np.array([t['s'] for t in tr])
    W = np.array([t['hi'] - t['lo'] for t in tr])
    ok = np.array([not t['shared'] and not any(t.get(f) for f in exclude_flags) and not t.get('ovl')
                   for t in tr])
    m = ok & (np.abs(S - s) * s_px <= d)
    if m.sum() >= 5:
        return float(np.median(W[m]))
    m = ok & (np.abs(S - s) * s_px <= 4 * d)
    if m.sum() >= 5:
        return float(np.median(W[m]))
    return None


def resolve_shared(T, P, s_px):
    for (cont, brk) in P.get('pairs', []):
        tc, tb = T[cont], T[brk]
        gc, gb = P['curves'][cont]['guide'], P['curves'][brk]['guide']
        idx_b = {round(q['s'], 9): i for i, q in enumerate(tb)}
        drop = set()
        for q in tc:
            if brk not in q['shared']:
                continue
            j = idx_b.get(round(q['s'], 9))
            w1 = local_width(tc, q['s'], s_px) or local_width(tb, q['s'], s_px) or P['w_default']
            W = q['hi'] - q['lo']
            q['w1'] = w1
            if j is not None:
                tb[j]['w1'] = w1
            if W <= 1.3 * w1:
                q['shared'] = [o for o in q['shared'] if o != brk]
                q['ovl'] = True
                if j is not None:
                    drop.add(j)
            elif any(z0 <= q['s'] <= z1 for (z0, z1) in P.get('par_zones', [])) and j is not None:
                vc = curves.interp_guide(gc, q['s'])
                vb = curves.interp_guide(gb, q['s'])
                lo_c = vc < vb
                q['shared'] = []
                tb[j]['shared'] = []
                q['edge'] = tb[j]['edge'] = True
                q['raw'] = (q['lo'], q['hi'], q['c'])
                tb[j]['raw'] = (q['lo'], q['hi'], q['c'])
                if lo_c:
                    q['c'] = q['lo'] + 0.5 * w1
                    tb[j]['c'] = q['hi'] - 0.5 * w1
                else:
                    q['c'] = q['hi'] - 0.5 * w1
                    tb[j]['c'] = q['lo'] + 0.5 * w1
        T[brk] = [q for i, q in enumerate(tb) if i not in drop]


def find_end(g, cal, P, tr, side, s_px, v_px):
    cx, cy = cal['cx'], cal['cy']
    S = np.array([t['s'] for t in tr])
    i = int(np.argmin(S)) if side == 'lo' else int(np.argmax(S))
    s0, c0 = tr[i]['s'], tr[i]['c']
    w = float(np.median([t['hi'] - t['lo'] for t in tr if not t['shared']]))
    step = (-1 if side == 'lo' else 1) / s_px
    last = s0
    s = s0
    miss = 0
    while miss <= 1:
        s += step
        v, prof, p = trace.sample(g, cx, cy, 'x', s, c0 - 2.5 * w, c0 + 2.5 * w, 0.5 / v_px)
        rr = trace.runs(v, prof, P.get('thr', 110), P.get('wthr', 140), minlen=2)
        rr = [r for r in rr if r['gmin'] <= 85 and (r['hi'] - r['lo']) <= 2.2 * w
              and abs(r['c'] - c0) <= 1.0 * w
              and not any(abs(r['c'] - gy) < 0.006 and (r['hi'] - r['lo']) < 0.5 * w
                          for gy in P.get('grid_v', []))]
        if rr:
            last = s
            c0 = rr[0]['c']
            miss = 0
        else:
            miss += 1
    return last, w


def read_end_value(tr, s_end, s_px):
    S = np.array([t['s'] for t in tr])
    C = np.array([t['c'] for t in tr])
    ok = np.array([not t['shared'] for t in tr])
    for d in (14, 30, 60):
        m = ok & (np.abs(S - s_end) * s_px <= d)
        if m.sum() >= 3:
            break
    if m.sum() < 3:   # only shared ink near the end: use it, caller flags it
        m = np.abs(S - s_end) * s_px <= 30
    A = np.vander(S[m] - s_end, 2)
    coef, *_ = np.linalg.lstsq(A, C[m], rcond=None)
    resid = C[m] - A @ coef
    sig = math.sqrt((resid ** 2).sum() / max(m.sum() - 2, 1))
    used_shared = bool(any(tr[i]['shared'] for i in np.where(m)[0]))
    used_edge = bool(any(tr[i].get('edge') for i in np.where(m)[0]))
    return float(coef[-1]), float(coef[0]), sig, int(m.sum()), used_shared, used_edge


def errs(cal, s_px, v_px, se=0.0, slope=0.0, gap_px=0.0, bridged=False, extra_v=0.0):
    sx_cal, sy_cal = cal['stats']['rmsx'], cal['stats']['rmsy']
    sig_place = SIG_PLACE_PX / v_px
    sig_bridge = 0.1 * gap_px / v_px if bridged else 0.0
    sig_slope = abs(slope) * math.hypot(sx_cal, 0.5 / s_px)
    y2 = 2 * math.sqrt(sy_cal ** 2 + se ** 2 + sig_place ** 2 + sig_bridge ** 2 + sig_slope ** 2)
    return 2 * sx_cal, y2 + extra_v


def main():
    rdir, calp, cfgname, trd, outp = sys.argv[1:6]
    only = sys.argv[6:]
    cfg = importlib.import_module(cfgname)
    CAL = json.load(open(calp))
    out = []
    for pname, P in cfg.PANELS.items():
        if only and pname not in only:
            continue
        cal = CAL[P.get('cal', pname)]
        g = calib.load_gray(os.path.join(rdir, cal['img']))
        s_px, v_px = cal['stats']['sx'], cal['stats']['sy']
        T = json.load(open(os.path.join(trd, f'trace_{pname}.json')))
        resolve_shared(T, P, s_px)
        json.dump(T, open(os.path.join(trd, f'trace_{pname}_resolved.json'), 'w'))
        for k, C in P['curves'].items():
            tr = T[k]
            if not tr:
                continue
            ends = {}
            for side in ('lo', 'hi'):
                s_ink, w = find_end(g, cal, P, tr, side, s_px, v_px)
                sgn = 1 if side == 'lo' else -1
                s_end = s_ink + sgn * 0.5 * w * v_px / s_px
                ends[side] = (s_ink, s_end, w)
                yv, sl, sig, n, ush, ued = read_end_value(tr, s_end, s_px)
                x2 = 2 * math.hypot(cal['stats']['rmsx'], 0.5 * w * v_px / s_px)
                _, y2 = errs(cal, s_px, v_px, se=sig / math.sqrt(max(n, 1)), slope=sl)
                note = (f'{"left" if side == "lo" else "right"} end: centre of round end cap, half a '
                        f'stroke width inside the outermost ink (outermost ink x={s_ink:.4f})')
                flag = ''
                basis = '2sigma'
                if ush or ued:
                    flag = 'uncertain'
                    basis = 'bound'
                    y2 += 0.5 * w
                    note += '; end lies in ink merged with the other curve, y from merged run'
                ov = C.get('end_notes', {}).get(side)
                if ov:
                    note += '; ' + ov[1]
                    flag = ov[0] or flag
                out.append(dict(panel=pname, curve=k, series=C['series'], kind='curve_end', x=s_end,
                                x_err=x2, y=yv, y_err=y2, err_basis=basis, flag=flag, note=note,
                                style=C['style']))
            tg = C.get('targets') or P.get('targets')
            if tg is None:
                step = P.get('step', 0.01)
                a = math.ceil(round(ends['lo'][0] / step, 6)) * step
                b = math.floor(round(ends['hi'][0] / step, 6)) * step
                tg = [round(a + step * i, 4) for i in range(int(round((b - a) / step)) + 1)]
            for t in tg:
                if t < ends['lo'][0] - 1e-9 or t > ends['hi'][0] + 1e-9:
                    continue
                r = curves.read_at(tr, t, s_px, v_px)
                near_sh, shp = curves.nearby_shared(tr, t, s_px, d=6)
                flag, notes = '', []
                near_end = min(abs(t - ends['lo'][1]), abs(t - ends['hi'][1])) * s_px <= 10
                if r is None and near_end:
                    yv, sl, sig, n, ush, ued = read_end_value(tr, t, s_px)
                    x2, y2 = errs(cal, s_px, v_px, se=sig / math.sqrt(max(n, 1)), slope=sl)
                    nt = ('at the curve end (within 10 px of the end-cap centre, inside the ink); read by a '
                          'one-sided straight-line fit of the last 14 px of own ink')
                    basis, fl = '2sigma', ''
                    if ush or ued:
                        y2 += 0.5 * ends['lo'][2]
                        basis, fl = 'bound', 'uncertain'
                        nt += '; ink there merged with the other curve'
                    out.append(dict(panel=pname, curve=k, series=C['series'], kind='curve', x=t, x_err=x2,
                                    y=yv, y_err=y2, err_basis=basis, flag=fl, note=nt, style=C['style']))
                    continue
                if r is None:
                    near12, shp12 = curves.nearby_shared(tr, t, s_px, d=12)
                    if shp12:
                        w1 = float(np.median([q.get('w1', P['w_default']) for q in shp12]))
                        lo = min(q['lo'] for q in shp12) + 0.35 * w1
                        hi = max(q['hi'] for q in shp12) - 0.35 * w1
                        if hi < lo:
                            lo = hi = 0.5 * (lo + hi)
                        _, e2 = errs(cal, s_px, v_px)
                        others = sorted(set(o for q in shp12 for o in q['shared']))
                        out.append(dict(panel=pname, curve=k, series=C['series'], kind='box', x=t,
                                        x_err=2 * cal['stats']['rmsx'], y=0.5 * (lo + hi),
                                        y_err=0.5 * (hi - lo) + e2, err_basis='bound', flag='uncertain',
                                        style=C['style'],
                                        note=(f'ink merged with {"/".join(others)} curve; box = merged run '
                                              f'extent less 0.35 stroke width each side, plus 2 sigma '
                                              f'calibration and placement')))
                    else:
                        gv = curves.interp_guide(C['guide'], t)
                        w0 = P['w_default']
                        v, prof, pp = trace.sample(g, cal['cx'], cal['cy'], 'x', t, gv - 0.05, gv + 0.05,
                                                   0.5 / v_px)
                        rr = [q for q in trace.runs(v, prof, P.get('thr', 110), P.get('wthr', 140), minlen=4)
                              if q['gmin'] <= P.get('gmax', 92)]
                        rr = [q for q in rr if min(abs(q['lo'] - gv), abs(q['hi'] - gv),
                                                   0 if q['lo'] <= gv <= q['hi'] else 9) <= 2.5 * w0]
                        if rr:
                            q = min(rr, key=lambda q: abs(q['c'] - gv))
                            _, e2 = errs(cal, s_px, v_px)
                            out.append(dict(panel=pname, curve=k, series=C['series'], kind='box', x=t,
                                            x_err=2 * cal['stats']['rmsx'], y=0.5 * (q['lo'] + q['hi']),
                                            y_err=0.5 * (q['hi'] - q['lo']) + e2, err_basis='bound',
                                            flag='uncertain', style=C['style'],
                                            note=('no ink of this curve can be told apart here: it is hidden '
                                                  'under the other curve or in a dash gap; box = full extent '
                                                  'of the ink run where it must lie, plus 2 sigma calibration '
                                                  'and placement')))
                            continue
                        out.append(dict(panel=pname, curve=k, series=C['series'], kind='missing', x=t,
                                        x_err=None, y=None, y_err=None, err_basis='', flag='uncertain',
                                        style=C['style'], note='no ink of this curve within 45 px'))
                    continue
                used = [tr[i] for i in r['idx']]
                bridged = r['window_px'] > 6
                x2, y2 = errs(cal, s_px, v_px, se=r['se'], slope=r['slope'], gap_px=r['gap_px'],
                              bridged=bridged)
                basis = '2sigma'
                if bridged:
                    notes.append(f"read across a {r['gap_px']:.0f} px gap in this curve's ink (grid line "
                                 f"or dash gap) by a {'quadratic' if r['deg'] == 2 else 'straight-line'} "
                                 f"fit over +-{r['window_px']} px")
                if near_sh:
                    others = sorted(set(o for q in shp for o in q['shared']))
                    notes.append(f'ink merged with {"/".join(others)} curve within 6 px (crossing); read '
                                 f'from own ink either side')
                    flag = 'uncertain'
                if any(q.get('ovl') for q in used):
                    notes.append('the other curve lies on this one within a stroke width here; single-width '
                                 'ink taken as this curve')
                    flag = 'uncertain'
                if any(q.get('edge') for q in used):
                    w1 = float(np.median([q.get('w1', P['w_default']) for q in used if q.get('edge')]))
                    notes.append('the two curves overlap here; centre taken from the outer edge of the merged '
                                 'ink less half a single stroke width; bound adds 0.3 stroke width')
                    y2 += 0.3 * w1
                    basis = 'bound'
                    flag = 'uncertain'
                if r['gap_px'] > 30:
                    flag = 'uncertain'
                    notes.append('long gap')
                out.append(dict(panel=pname, curve=k, series=C['series'], kind='curve', x=t, x_err=x2,
                                y=r['v'], y_err=y2, err_basis=basis, flag=flag, note='; '.join(notes),
                                style=C['style']))
    json.dump(out, open(outp, 'w'), indent=0)
    print('readings', len(out))


if __name__ == '__main__':
    main()
