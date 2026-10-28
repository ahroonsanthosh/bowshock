# Assemble the tracker output and the hand-read items into the four CSV files, and draw overlays.
# usage: python3 -I assemble.py <reader folder>
import sys, json, os, csv, io, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[0])))
import numpy as np
from readlib import Cal

A = sys.argv[1]
W = A + '/work'
SCR = A + '/scripts'

SHA51 = 'e6b779125d8359e968ad6b4d2b2c43d651ef5024f42bdb5574a6f7b93a8fdf57'
SHA52 = '3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54'

FIGS = {
 'a51j11_fig14': {
  'source': 'Cleary and Stevens, NACA RM A51J11 (1951), NTRS 19930087063, fig. 14, PDF page 36 (printed page 35)',
  'sha': SHA51, 'img': 'renders/a51-36.png',
  'image': 'pdftoppm -r 600 -gray render of PDF page 36, 4692 x 6200 px (the embedded scan is a 2344 x 3096 px 300 dpi JPEG, so the render is a 2x upsample)',
  'axes': ['x: Mach number, M (printed "Mach number, M"); scale .5 to 1.2, grid every 0.05',
           'y: Base pressure coefficient, P_b (printed "Base pressure coefficient, P_b"), axis runs 0 (bottom) to -1.2 (top), grid every 0.2; RM A51J11 has no NOTATION section and its symbol definitions were not opened',
           'caption: "Figure 14.-The variation of base pressure coefficient with Mach number at semispan station 2y/b, 0.25. Angle of attack, 0 deg."',
           'legend (top panel): solid line = "Without surface roughness"; dashed line = "With surface roughness"; panels labelled h/t, 1.0 (top), h/t, 0.6 (middle), h/t, 0.3 (bottom)',
           'no plotted symbols in this figure: only faired curves'],
  'panels': [
   ('f14_top', '', 'u', {'solid': ('h/t = 1.0, without surface roughness', 'solid line'), 'dashed': ('h/t = 1.0, with surface roughness', 'dashed line')}),
   ('f14_mid', '', 'u', {'solid': ('h/t = 0.6, without surface roughness', 'solid line'), 'dashed': ('h/t = 0.6, with surface roughness', 'dashed line')}),
   ('f14_bot', '', 'u', {'solid': ('h/t = 0.3, without surface roughness', 'solid line'), 'dashed': ('h/t = 0.3, with surface roughness', 'dashed line')})]},
 'a51j11_fig15': {
  'source': 'Cleary and Stevens, NACA RM A51J11 (1951), NTRS 19930087063, fig. 15, PDF page 37 (printed page 36)',
  'sha': SHA51, 'img': 'renders/a51-37.png',
  'image': 'pdftoppm -r 600 -gray render of PDF page 37, 4692 x 6200 px (embedded scan 2344 x 3096 px 300 dpi JPEG; render is a 2x upsample)',
  'axes': ['x: Semispan station, 2y/b (printed "Semispan station, 2y/b"); scale 0 to 1.0, grid every 0.1',
           'y: Base pressure coefficient, P_b; axis 0 (bottom) to -1.2 (top), grid every 0.2',
           'caption: "Figure 15.-The variation of base pressure coefficient with semispan station, 2y/b. Angle of attack, 0 deg."',
           'curves labelled by Mach number with leader lines: M 0.98 (long dashes), .80 (short dashes), 1.06 (dash-dot), .60 (solid); panels h/t, 1.0 (top), 0.6 (middle), 0.3 (bottom)',
           'orifice stations from the APPARATUS AND MODELS section: 2y/b = 0.25, 0.375, 0.625, 0.875; read at these, at their ends, and (extra) every 0.05',
           'no plotted symbols: only faired curves'],
  'panels': [
   ('f15_top', '', 'u', {k: ('h/t = 1.0, M = %s' % k[1:], st) for k, st in [('M0.98', 'long-dash line'), ('M0.80', 'short-dash line'), ('M1.06', 'dash-dot line'), ('M0.60', 'solid line')]}),
   ('f15_mid', '', 'u', {k: ('h/t = 0.6, M = %s' % k[1:], st) for k, st in [('M0.98', 'long-dash line'), ('M0.80', 'short-dash line'), ('M1.06', 'dash-dot line'), ('M0.60', 'solid line')]}),
   ('f15_bot', '', 'u', {k: ('h/t = 0.3, M = %s' % k[1:], st) for k, st in [('M0.98', 'long-dash line'), ('M0.80', 'short-dash line'), ('M1.06', 'dash-dot line'), ('M0.60', 'solid line')]})]},
 'a52e01_fig8a': {
  'source': 'Dugan, NACA RM A52E01 (1952), NTRS 19930087008, fig. 8(a), PDF page 29 (printed page 28)',
  'sha': SHA52, 'img': 'renders/a52-29.png',
  'image': 'pdftoppm -r 480 -gray render of PDF page 29, 4927 x 4134 px (the page is 1-bit CCITT strips at 240 dpi, so the render is a 2x upsample)',
  'axes': ['x: Pressure coefficient, (p_b - p_0)/q (NOTATION: p_b pressure at base of blunt trailing-edge wings; p_0 free-stream static pressure; q free-stream dynamic pressure; "wing base-pressure coefficient"); axis 0 (left) to -.8 (right), grid every 0.1',
           'y: Nominal angle of attack, alpha, degrees (NOTATION: angle of attack of body axis, degrees); axis 0 to 16, labels 0 to 14, grid every 2',
           'caption: "Figure 8.- Comparison of wing base pressure coefficients for three types of trailing-edge bluntness. (a) Reynolds number, 1.5 million."',
           'legend (in the M=0.925 panel): Wing 2 long dashes (legend dashes 62 to 68 px, gaps 20 to 24 px at 480 dpi); Wing 3 short dashes (26 to 34 px); Wing 4 long dash then short dash (62 to 66 px and 26 to 28 px)',
           'panels as printed: M=0.6, M=0.7, M=0.8, M=0.9, M=0.925, M=1.2, 1.4, 1.7',
           'no plotted symbols: only faired curves; read at fixed alpha steps of 0.5 deg (0.25 deg where noted)'],
  'panels': [('a_06', 'M=0.6', 'v', None), ('a_07', 'M=0.7', 'v', None), ('a_08', 'M=0.8', 'v', None),
             ('a_09', 'M=0.9', 'v', None), ('a_0925', 'M=0.925', 'v', None), ('a_sup', 'M=1.2, 1.4, 1.7', 'v', None)]},
 'a52e01_fig8b': {
  'source': 'Dugan, NACA RM A52E01 (1952), NTRS 19930087008, fig. 8(b), PDF page 30 (printed page 29)',
  'sha': SHA52, 'img': 'renders/a52-30.png',
  'image': 'pdftoppm -r 480 -gray render of PDF page 30, 4880 x 4080 px (1-bit CCITT strips at 240 dpi; 2x upsample)',
  'axes': ['x: Pressure coefficient, (p_b - p_0)/q; axis 0 to -.8, grid every 0.1',
           'y: Nominal angle of attack, alpha, degrees; axis 0 to 16, grid every 2',
           'caption: "(b) Reynolds number, 3.8 million. Figure 8.- Concluded."',
           'legend as in fig. 8(a) (Wing 2 long dashes, Wing 3 short dashes, Wing 4 long and short dashes)',
           'panels as printed: M=0.6, M=0.7, M=0.8, M=0.9, M=0.925, M=1.2, 1.4, 1.7',
           'no plotted symbols: only faired curves'],
  'panels': [('b_06', 'M=0.6', 'v', None), ('b_07', 'M=0.7', 'v', None), ('b_08', 'M=0.8', 'v', None),
             ('b_09', 'M=0.9', 'v', None), ('b_0925', 'M=0.925', 'v', None), ('b_sup', 'M=1.2, 1.4, 1.7', 'v', None)]},
}

STYLE52 = {'wing 2': 'long-dash line', 'wing 3': 'short-dash line', 'wing 4': 'long-and-short-dash line'}

# identity cross-check ranges for fig. 15 (leader line versus line style, cross versus touch)
FLAG_RANGES = {
 'f15_top': [('M0.80', 0.24, 0.335, 'start: M 0.80 and M 1.06 meet near 2y/b 0.30; taken as crossing (leaders and line styles agree); alternative: they touch and the two values swap below 0.31'),
             ('M1.06', 0.24, 0.335, 'start: M 0.80 and M 1.06 meet near 2y/b 0.30; taken as crossing (leaders and line styles agree); alternative: they touch and the two values swap below 0.31')],
 'f15_bot': [('M0.98', 0.24, 0.40, 'start: M 0.98 and M 1.06 meet near 2y/b 0.33; taken as touching, because then the leaders (0.98 to the upper start, 1.06 to the lower) and the line styles agree; alternative: they cross and the values below 0.35 swap'),
             ('M1.06', 0.24, 0.40, 'start: M 0.98 and M 1.06 meet near 2y/b 0.33; taken as touching, because then the leaders and the line styles agree; alternative: they cross and the values below 0.35 swap'),
             ('M0.60', 0.24, 0.30, 'start: M 0.60 and M 0.80 meet near 2y/b 0.28; taken as crossing (leaders and styles agree); alternative: touching, values swap below 0.28'),
             ('M0.80', 0.24, 0.30, 'start: M 0.60 and M 0.80 meet near 2y/b 0.28; taken as crossing (leaders and styles agree); alternative: touching, values swap below 0.28')]}

ID_FLAG = {'a_06': True, 'a_07': False, 'a_08': True, 'a_09': True, 'a_0925': True,
           'b_06': True, 'b_07': True, 'b_08': True, 'b_09': True, 'b_0925': True}


def fmt(v, n=4):
    return ('%.' + str(n) + 'f') % v


def cal_summary(key):
    c = json.load(open(W + '/%s_cal.json' % key))
    lv = np.array([l['loo_units'] for l in c['vlines']]); lh = np.array([l['loo_units'] for l in c['hlines']])
    rv = np.array([l['resid_units'] for l in c['vlines']]); rh = np.array([l['resid_units'] for l in c['hlines']])
    s = ('# calibration %s: %d vertical grid lines (values %s to %s), %d horizontal (%s to %s); each line fitted '
         'over its length (x = a + b*y, y = c + e*x); common slopes dx/dy %.5f, dy/dx %.5f (rotation and skew); '
         'x units/px %.6f, y units/px %.6f; residuals of the linear value fit: x max %.5f rms %.5f (leave-one-out rms %.5f); '
         'y max %.5f rms %.5f (leave-one-out rms %.5f)') % (
        key, len(lv), c['vlines'][0]['value'], c['vlines'][-1]['value'], len(lh), c['hlines'][0]['value'], c['hlines'][-1]['value'],
        c['b_common'], c['e_common'], 1 / c['x_fit'][1], 1 / c['y_fit'][1],
        np.abs(rv).max(), np.sqrt((rv ** 2).mean()), np.sqrt((lv ** 2).mean()),
        np.abs(rh).max(), np.sqrt((rh ** 2).mean()), np.sqrt((lh ** 2).mean()))
    per = '# per-line residuals %s (value: resid, loo): ' % key + '; '.join(
        '%s: %+.5f, %+.5f' % (l['value'], l['resid_units'], l['loo_units']) for l in c['vlines'] + c['hlines'])
    return [s, per]


def build_panel(fig, key, plabel, orient, smap, out_rows, ov_rows, counts, uncertain_list):
    cfg = json.load(open(W + '/%s_cfg.json' % key))
    cal = Cal(cfg['cal'])
    rows = json.load(open(cfg['rows_out']))
    post = json.load(open(W + '/%s_post.json' % key)) if os.path.exists(W + '/%s_post.json' % key) else {}
    dep_per_px = abs(cal.v_per_px) if orient == 'u' else abs(cal.u_per_px)
    widths = [r['width_px'] for r in rows if r['kind'] == 'curve' and not r['merged'] and r['width_px'] > 0 and not r['note']]
    w0 = float(np.median(widths)) if widths else 10.0
    errs = [r['err'] for r in rows if r['kind'] == 'curve']
    medErr = float(np.median(errs)) if errs else 0.005
    sup = key.endswith('sup')
    # replacements from the post file
    repl = {(a['curve'], round(a['t'], 4)) for a in post.get('add', []) if a.get('replace')}
    repl_end = {(r_['curve'], r_['side']) for r_ in post.get('replace_end', [])}
    # which tracker curve_end is lo / hi
    ends_seen = {}
    final = []
    for r in rows:
        name = r['curve']
        if (name, round(r['t'], 4)) in repl and r['kind'] != 'curve_end':
            continue
        if r['kind'] == 'curve_end':
            side = 'lo' if name not in ends_seen else 'hi'
            ends_seen[name] = True
            # a lower end that the tracker found is always the first one written for a curve, unless skipped
            cfgc = [c for c in cfg['curves'] if c['name'] == name][0]
            if cfgc.get('end_lo') == 'skip':
                side = 'hi'
            if (name, side) in repl_end:
                continue
            r = dict(r); r['side'] = side
        final.append(dict(r, src='tracker'))
    for a in post.get('add', []):
        d = dict(a); d['src'] = 'hand'
        final.append(d)
    for r_ in post.get('replace_end', []):
        d = dict(r_); d['kind'] = 'curve_end'; d['src'] = 'hand'
        final.append(d)
    final.sort(key=lambda r: (r['curve'], {'curve_at_zero': 0}.get(r['kind'], 1), r['t']))
    for r in final:
        name = r['curve']
        if orient == 'u':
            series, style = smap[name]
        else:
            series = name if not sup else name
            style = STYLE52.get(name, '')
            if sup:
                style = 'short-dash line' if 'short dashes' in name else 'dashed line (pattern not resolved)'
        flag = r.get('flag', '')
        notes = []
        if r['src'] == 'hand':
            kind = r['kind']
            if kind == 'box':
                cen = (r['lo'] + r['hi']) / 2; hw = abs(r['hi'] - r['lo']) / 2
                hw = float(np.sqrt(hw ** 2 + (cal.u_cal2s if orient == 'v' else cal.v_cal2s) ** 2))
                val, err, t_err, basis = cen, hw, (cal.v_cal2s if orient == 'v' else cal.u_cal2s), 'bound'
            else:
                val, err, t_err = r['val'], r['err'], r['t_err']
                basis = r.get('err_basis', '2sigma')
            notes.append(r['note'] + ' (read by hand from the zoomed image and component extremes)')
            t = r['t']
        else:
            kind = r['kind']; t = r['t']; val = r['val']; err = r['err']; t_err = r['t_err']
            basis = '2sigma'
            if r.get('hidden'):
                basis = 'bound'; flag = 'uncertain'
            if r['note']:
                notes.append(r['note'])
            if r['merged']:
                kind = 'box'; basis = 'bound'; flag = 'uncertain'
                ext = r.get('ext')
                if ext:
                    lo_, hi_ = min(ext), max(ext)
                    cen = (lo_ + hi_) / 2; hw = (hi_ - lo_) / 2
                    single = w0 * dep_per_px
                    if (hi_ - lo_) > 1.4 * single:
                        alt = 'two lines can be told apart by the run edges: line on the more negative side about %s, other about %s; which is which not certain here' % (
                            fmt(lo_ + single / 2), fmt(hi_ - single / 2))
                    else:
                        alt = 'the two lines coincide within one line width here'
                else:
                    cen = val; hw = max(err, w0 * dep_per_px / 2)
                    alt = 'ink of both lines merged around a bridged gap'
                val = cen; err = float(np.sqrt(hw ** 2 + (cal.v_cal2s if orient == 'u' else cal.u_cal2s) ** 2))
                notes.append('ink merged with %s; box is the merged run (%s)' % (', '.join(
                    (smap[m][0] if orient == 'u' else m) for m in r['merged']), alt))
            if 'meets a grid line' in r['note']:
                flag = 'uncertain'
            if 'gap of' in r['note']:
                try:
                    gp = float(r['note'].split('gap of ')[1].split(' px')[0])
                    if gp > 40:
                        flag = 'uncertain'; notes.append('long gap')
                except Exception:
                    pass
            if kind == 'curve' and err > 2.5 * medErr:
                flag = 'uncertain'; notes.append('large reading error (steep or curving line)')
            if kind == 'curve_end' and ('grid band' in r['note']):
                notes.append('end near a grid line; true end may lie inside the grid ink')
        # flag ranges (fig 15 identity)
        for (cn, lo_, hi_, why) in FLAG_RANGES.get(key, []):
            if cn == name and lo_ <= t <= hi_:
                flag = 'uncertain'; notes.append(why)
        if orient == 'v' and not sup and ID_FLAG.get(key) and name in ('wing 2', 'wing 4'):
            flag = 'uncertain'
            notes.append('wing 2 / wing 4 told apart by dash pattern only (see method.md); alternative: the other of the two')
        if sup:
            flag = 'uncertain'
            notes.append('supersonic panel: Mach group from position and label arrows; wing not identified')
        if orient == 'u':
            x, xe, y, ye = t, t_err, val, err
        else:
            x, xe, y, ye = val, err, t, t_err
        if kind == 'curve_at_zero':
            y = 0.0
        rid = '%s|%s|%s%s' % (key, name.replace(' ', ''), {'curve': 'c', 'curve_end': 'e', 'box': 'b', 'curve_at_zero': 'z'}[kind], fmt(t, 3))
        out_rows.append([rid, kind, plabel, series, style, '', fmt(x), fmt(xe), fmt(y), fmt(ye), basis, flag, '; '.join(notes)])
        ov_rows.append({'curve': series, 'kind': kind, 'x': x, 'y': y,
                        'x_err_box': xe if kind == 'box' else 0, 'y_err_box': ye if kind == 'box' else 0})
        counts[(plabel, series)] = counts.get((plabel, series), 0) + 1
        if flag:
            uncertain_list.append((fig, rid, '; '.join(notes)))
    # zero statements
    for cn, why in post.get('noz', {}).items():
        uncertain_list.append((fig, '%s|%s|no zero' % (key, cn.replace(' ', '')), why))
    return cal


def main():
    os.makedirs(A + '/readings', exist_ok=True); os.makedirs(A + '/overlays', exist_ok=True)
    summary = {}
    allunc = []
    for fig, spec in FIGS.items():
        out_rows = []; counts = {}; unc = []
        head = ['# ' + spec['source'], '# SHA-256 of the PDF: ' + spec['sha'], '# image read: ' + spec['image']]
        head += ['# ' + a for a in spec['axes']]
        for key, plabel, orient, smap in spec['panels']:
            head += cal_summary(key)
            ov = []
            cal = build_panel(fig, key, plabel, orient, smap, out_rows, ov, counts, unc)
            json.dump(ov, open(W + '/ov_rows_%s.json' % key, 'w'))
            z = np.load(W + '/%s_comp.npz' % key) if os.path.exists(W + '/%s_comp.npz' % key) else None
            cfg = json.load(open(W + '/%s_cfg.json' % key))
            if z is not None:
                x0, y0, x1, y1 = [int(v) for v in z['box']]
            else:
                x0, y0, x1, y1 = 0, 0, 100, 100
            pad = 40
            subprocess.run(['python3', '-I', SCR + '/overlay.py', A + '/' + spec['img'], cfg['cal'], W + '/ov_rows_%s.json' % key,
                            orient, A + '/overlays/%s_%s.png' % (fig, key), str(x0 - pad), str(y0 - pad), str(x1 + pad), str(y1 + pad), '1.0'],
                           check=True, capture_output=True)
        head.append('# error basis: 2sigma = about two standard deviations from calibration (2 x leave-one-out rms), centring (2 px at 600 dpi for RM A51J11, 3 px at 480 dpi for RM A52E01), local slope times the abscissa calibration error, and bridging residual where a gap was bridged; bound = a box that contains the line (merged ink, or a line hidden in a grid line)')
        head.append('# columns: x and y in the plot units as printed; for fig. 8 x is the pressure coefficient and y the angle of attack')
        head.append('id,kind,panel,series,symbol,filled,x,x_err,y,y_err,err_basis,flag,note')
        buf = io.StringIO()
        w = csv.writer(buf, lineterminator='\n')
        for r in out_rows:
            w.writerow(r)
        open(A + '/readings/%s.csv' % fig, 'w').write('\n'.join(head) + '\n' + buf.getvalue())
        summary[fig] = {'rows': len(out_rows), 'counts': {'%s / %s' % k: v for k, v in counts.items()},
                        'flagged': sum(1 for r in out_rows if r[11])}
        allunc += unc
    json.dump(summary, open(W + '/summary.json', 'w'), indent=1)
    with open(W + '/uncertain.txt', 'w') as f:
        for u in allunc:
            f.write('%s\t%s\t%s\n' % u)
    print(json.dumps(summary, indent=1))


main()
