"""Turn trace results into the deliverable CSV files.

usage: python3 -I emit.py SCRIPTS_DIR C_DIR

Reads C_DIR/scripts/curve_meta.json, C_DIR/work/t_<trace>.json and the
calibration files, writes
  C_DIR/readings/a52e01_fig8a.csv, C_DIR/readings/a52e01_fig8b.csv,
  C_DIR/wing_calls.csv, C_DIR/work/overlay_points.json.

Error model (all in plot units):
  sx, sy   scale (units per px) from the panel's affine fit
  cx, cy   RMS of the labelled-line residuals of that fit (calibration)
  row reading (centre of the stroke's run in one pixel row):
      x_err = 2*sqrt((sx*sqrt(0.5^2 + (t*py)^2))^2 + cx^2), where
      t = tan of the stroke's slope from the run length (stroke width 4.3 px)
      and py = sqrt(0.29^2 + (cy/sy)^2) px is the row uncertainty;
      y_err = 2*sqrt((0.29*sy)^2 + cy^2); basis 2sigma.
      Runs longer than 12 px (flat stroke) become bounds of half the run.
  column reading: the same with x and y swapped; basis 2sigma.
  grid crossing, merged with a grid line, boxes, turning points, ends and
  values at alpha 0: bounds, built from the stated pixel half-widths plus
  2*cx (or 2*cy).
"""
import sys
sys.path.insert(0, sys.argv[1])
import csv
import json
import math
import os
from common import to_plot

C = sys.argv[2]
meta = json.load(open(os.path.join(C, 'scripts', 'curve_meta.json')))
cals = {'a': json.load(open(os.path.join(C, 'work', 'cal29.json'))),
        'b': json.load(open(os.path.join(C, 'work', 'cal30.json')))}
PAGE = {'a': 29, 'b': 30}
SHA = '3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54'
W_STROKE = 4.3


def calib(fig, panel):
    c = [c for c in cals[fig] if c['panel'] == panel][0]
    sx = abs(c['fit_x']['coef'][1])
    sy = abs(c['fit_y']['coef'][2])
    cx = math.sqrt(sum(p['resid'] ** 2 for p in c['fit_x']['per_line'] if p['labelled']) /
                   sum(1 for p in c['fit_x']['per_line'] if p['labelled']))
    cy = math.sqrt(sum(p['resid'] ** 2 for p in c['fit_y']['per_line'] if p['labelled']) /
                   sum(1 for p in c['fit_y']['per_line'] if p['labelled']))
    return c, sx, sy, cx, cy


def r4(v):
    return '%.4f' % v


def r3(v):
    return '%.3f' % v


rows = {'a': [], 'b': []}
points = []
wing_rows = []
counts = {}

for m in meta['curves']:
    fig = m['fig']
    cal, sx, sy, cx, cy = calib(fig, m['panel'])
    tr = json.load(open(os.path.join(C, 'work', 't_%s.json' % m['trace'])))
    parts = [c for name in m['parts'] for c in tr['curves'] if c['name'] == name]
    assert len(parts) == len(m['parts']), m['cid']
    conf_unc = m['conf'] in ('medium', 'low')
    series = m['wing'] + ((';' + m['alt']) if (conf_unc and m['alt']) else '')
    wflag = 'uncertain' if conf_unc else ''
    wnote = ('wing call %s confidence; alternative %s' % (m['conf'], m['alt'].replace(';', ' or '))) if conf_unc else ''
    label_note = ('curve label printed: %s; ' % m['printed_label']) if m['printed_label'] else ''
    out = []
    seen = set()
    py = math.sqrt(0.29 ** 2 + (cy / sy) ** 2)

    def add(kind, X, Y, xv, yv, xe, ye, basis, flag, note, box_hw_px=None):
        key = (kind, round(X * 2) / 2, round(Y * 2) / 2)
        if key in seen:
            return
        seen.add(key)
        f = 'uncertain' if (flag or wflag) else ''
        n = '; '.join(t for t in (label_note.rstrip('; '), wnote, note) if t)
        out.append([kind, xv, xe, yv, ye, basis, f, n, X, Y, box_hw_px])

    for part in parts:
        has_cols = any(r['mode'] == 'column' for r in part['readings'])
        for r in part['readings']:
            mode = r['mode']
            if 'px' not in r:
                continue
            X, Y = r['px']
            xv, yv = r['x'], r['y']
            if mode in ('row', 'nearest_ink'):
                run = r.get('runlen', 4)
                if run > 12:
                    xe = (run / 2.0) * sx + 2 * cx
                    ye = 0.5 * sy + 2 * cy
                    add('curve', X, Y, xv, yv, xe, ye, 'bound', 'uncertain',
                        'flat stroke: the row crosses %d px of ink; value is the run centre, x_err is half the run%s' % (run, '; see the fixed-x (column) rows for this part' if has_cols else ''))
                    continue
                t = math.sqrt(max(0.0, (run / W_STROKE) ** 2 - 1.0))
                xe = 2 * math.sqrt((sx * math.sqrt(0.5 ** 2 + (t * py) ** 2)) ** 2 + cx ** 2)
                ye = 2 * math.sqrt((0.29 * sy) ** 2 + cy ** 2)
                note = ''
                if mode == 'nearest_ink':
                    note = 'target alpha %.2f fell in a dash gap%s; read at the nearest ink, at its own alpha (no bridging)' % (
                        r['alpha_target'], ' at the alpha %g grid line, so there is no ink on that line' % r['alpha_target'] if (abs(r['alpha_target'] - round(r['alpha_target'])) < 1e-6 and round(r['alpha_target']) % 2 == 0) else '')
                add('curve', X, Y, xv, yv, xe, ye, '2sigma', '', note)
            elif mode == 'column':
                run = r.get('runlen', 4)
                xe = 2 * math.sqrt((0.29 * sx) ** 2 + cx ** 2)
                if run > 8:
                    ye = (run / 2.0) * sy + 2 * cy
                    add('curve', X, Y, xv, yv, xe, ye, 'bound', 'uncertain',
                        'read at fixed x %.3f on a steep part; the column crosses %d px of ink' % (r['x_target'], run))
                else:
                    t = math.sqrt(max(0.0, (run / W_STROKE) ** 2 - 1.0))
                    ye = 2 * math.sqrt((sy * math.sqrt(0.5 ** 2 + (t * 0.29) ** 2)) ** 2 + cy ** 2)
                    add('curve', X, Y, xv, yv, xe, ye, '2sigma', '',
                        'read at fixed x %.3f (column) on a flat part of the curve' % r['x_target'])
            elif mode == 'grid_crossing':
                hw = abs(r['x_above'] - r['x_below']) / 2.0 + 1.0
                add('curve', X, Y, xv, yv, hw * sx + 2 * cx, 1.0 * sy + 2 * cy, 'bound', '',
                    'stroke crosses the alpha %g grid line; value spans the stroke centres just above and below the line' % r['alpha_target'])
            elif mode == 'merged_line':
                hb = r['half_bound_px']
                how = r['how']
                if hb <= 1.0 and ('edge' in how) and 'horizontal' not in how:
                    add('curve', X, Y, xv, yv, hb * sx + 2 * cx, 1.0 * sy + 2 * cy, 'bound', '',
                        'stroke overlaps a grid line; centre taken as its visible %s' % how)
                else:
                    add('box', X, Y, xv, yv, hb * sx + 2 * cx, 1.0 * sy + 2 * cy, 'bound', 'uncertain',
                        'merged ink: %s; x_err is the half-width of the box' % how, box_hw_px=hb)
            elif mode.startswith('turning'):
                kindtxt = {'turning_max_x': 'most negative x (rightmost point) of a bend or hook',
                           'turning_min_x': 'least negative x (leftmost point) of a bend',
                           'turning_max_alpha': 'highest point',
                           'turning_min_alpha': 'lowest point'}[mode]
                add('curve', X, Y, xv, yv, 1.0 * sx + 2 * cx, 3.0 * sy + 2 * cy, 'bound', '',
                    'turning point: %s, read at the stroke centre' % kindtxt)
            elif mode == 'zero_line':
                continue  # handled below
    # ends
    ends = []
    for part in parts:
        for e in (part['start_px'], part['end_px']):
            xv, yv = to_plot(cal, e[0], e[1])
            ends.append((float(yv), float(xv), e))
    ends.sort()
    lo, hi = ends[0], ends[-1]
    for which, (yv, xv, e), note, fl in (('upper', hi, m['start_note'], m['start_flag']),
                                         ('lower', lo, m['end_note'], m['end_flag'])):
        add('curve_end', e[0], e[1], xv, yv, 2.0 * sx + 2 * cx, 2.0 * sy + 2 * cy, 'bound', fl,
            '%s end, centre of the last 2.5 px of stroke: %s' % (which, note.split(': ', 1)[1] if note.startswith(which + ' end: ') else note))
    # alpha 0
    lowpart = min(parts, key=lambda p: to_plot(cal, *p['end_px'])[1] if to_plot(cal, *p['end_px'])[1] < to_plot(cal, *p['start_px'])[1] else to_plot(cal, *p['start_px'])[1])
    zr = [r for p in parts for r in p['readings'] if r['mode'] == 'zero_line']
    override = m.get('zero_override')
    if m['cid'] == 'b06-Left':
        override = 'not_seen'
    if m['cid'] == 'b0925-Md':
        override = 'box_k3'
    if override == 'not_seen' or not zr:
        yv, xv, e = lo
        txt = ('does not visibly reach alpha 0; this row gives the lowest ink (its own alpha), not a value at alpha 0'
               if override != 'not_seen' else
               'cannot tell whether it reaches alpha 0: below the last visible ink it would be hidden in the -0.2 grid line; this row gives the lowest visible ink, not a value at alpha 0')
        add('curve_at_zero', e[0], e[1], xv, yv, 2.0 * sx + 2 * cx, 2.0 * sy + 2 * cy, 'bound', 'uncertain', txt)
    elif override == 'box_k3':
        vl = [v for v in cal['vlines'] if v and v['k'] == 3][0]
        zrow = [h for h in cal['hlines'] if h and h['j'] == 0][0]
        X = vl['a'] + vl['b'] * 1466
        Y = zrow['a'] + zrow['b'] * X
        xv, yv = to_plot(cal, X, Y)
        add('curve_at_zero', X, Y, float(xv), 0.0, 4.0 * sx + 2 * cx, 2.5 * sy, 'bound', 'uncertain',
            'reaches alpha 0 inside the -0.3 grid line; box over the line and the hook', box_hw_px=4.0)
    else:
        for r in zr:
            run = r['runlen']
            X, Y = r['px']
            gap = r['px'][1] - r['lowest_row']
            hw = run / 2.0 + 1.5
            fl = 'uncertain' if run > 8 else ''
            note = ('stroke runs into the alpha 0 line; x is the centre of its lowest free row %d px above the line centre' % round(gap))
            if run > 8:
                note += '; the stroke meets the line at a shallow angle over %d px' % run
            add('curve_at_zero', X, Y, r['x'], 0.0, hw * sx + 2 * cx, 2.5 * sy, 'bound', fl, note)
    # sort by alpha (descending) for readability, ends and zero kept
    out.sort(key=lambda o: (-o[3]))
    for i, o in enumerate(out, 1):
        kind, xv, xe, yv, ye, basis, f, n, X, Y, bhw = o
        rid = '%s-%03d' % (m['cid'], i)
        rows[fig].append([rid, kind, m['panel'], series, '', '', r4(xv), r4(xe), r3(yv), r3(ye), basis, f, n])
        points.append({'fig': fig, 'panel': m['panel'], 'cid': m['cid'], 'wing': m['wing'], 'conf': m['conf'],
                       'kind': kind, 'px': [X, Y], 'box_hw_px': bhw, 'id': rid})
    counts.setdefault((fig, m['panel'], m['wing']), []).append((m['cid'], len(out)))
    lg = meta['legend_px'][m['wing']]
    wing_rows.append(['8(%s)' % fig, m['panel'], m['printed_label'], m['wing'], m['alt'],
                      lg['dash'], lg['gap'], m['dash'], m['gap'], m['pattern'], m['conf'],
                      'curve %s; %d rows; %s' % (m['cid'], len(out), m['note'] if m['note'] else 'no meetings')])

# write readings
for fig in ('a', 'b'):
    path = os.path.join(C, 'readings', 'a52e01_fig8%s.csv' % fig)
    with open(path, 'w', newline='') as fh:
        fh.write('# source: Dugan, NACA RM A52E01 (1952), "Effects of three types of blunt trailing edges on the aerodynamic characteristics of a plane tapered wing of aspect ratio 3.1, with a 3-percent-thick biconvex section"\n')
        fh.write('# NTRS id: 19930087008; URL https://ntrs.nasa.gov/api/citations/19930087008/downloads/19930087008.pdf\n')
        fh.write('# figure: fig. 8 (%s); PDF page %d; PDF SHA-256 %s\n' % (fig, PAGE[fig], SHA))
        if fig == 'a':
            fh.write('# caption as printed: "(a) Reynolds number, 1.5 million." / "Figure 8.- Comparison of wing base pressure coefficients for three types of trailing-edge bluntness."\n')
            fh.write('# image read: the page\'s native 1-bit CCITT strips (10 strips, each stored flipped top to bottom) stitched to 2464 x 2064 px at 240 ppi; checked against a 600 dpi poppler render (98 percent ink overlap within 1 px)\n')
            fh.write('# x axis as printed: Pressure coefficient, (P_b - P_0)/q   (labels 0 -.2 -.4 -.6 -.8; grid every 0.1)\n')
        else:
            fh.write('# caption as printed: "(b) Reynolds number, 3.8 million." / "Figure 8.- Concluded."\n')
            fh.write('# image read: the page\'s native 1-bit CCITT strips (14 strips, each stored flipped top to bottom) stitched to 2432 x 2032 px at 240 ppi; checked against a 600 dpi poppler render (99 percent ink overlap within 1 px)\n')
            fh.write('# x axis as printed: Pressure coefficient, (p_b - p_0)/q   (labels 0 -.2 -.4 -.6 -.8; grid every 0.1)\n')
        fh.write('# y axis as printed: Nominal angle of attack, alpha, degrees   (labels 0 to 14 every 2; top grid line 16 unlabelled)\n')
        fh.write('# legend as printed (in the M=0.925 panel): Wing 2 long dashes; Wing 3 short dashes; Wing 4 long and short dashes alternating; each with a section sketch\n')
        fh.write('# x and y are in the plot\'s own units as printed (x is the pressure coefficient, negative to the right; y is alpha in degrees); no symbols are plotted, only faired curves\n')
        fh.write('# calibration: per panel, each grid line fitted along its length (tilt kept), intersections taken, then least-squares affine maps x = a0 + a1*X + a2*Y and alpha = b0 + b1*X + b2*Y (X, Y native pixels) through the labelled lines only (x: 0,-.2,-.4,-.6,-.8; alpha: 0..14, except 12 and 14 hidden by the legend box in the M=0.925 panel)\n')
        for c in cals[fig]:
            fx, fy = c['fit_x'], c['fit_y']
            rx = ' '.join('%+.1f:%+.4f(loo %+.4f)' % (p['value'], p['resid'], p['loo']) for p in fx['per_line'] if p['labelled'])
            ux = ' '.join('%+.1f:%+.4f' % (p['value'], p['resid']) for p in fx['per_line'] if not p['labelled'])
            ry = ' '.join('%g:%+.3f(loo %+.3f)' % (p['value'], p['resid'], p['loo']) for p in fy['per_line'] if p['labelled'])
            uy = ' '.join('%g:%+.3f' % (p['value'], p['resid']) for p in fy['per_line'] if not p['labelled'])
            fh.write('# calib %s: x = %.6f %+.8f*X %+.8f*Y ; alpha = %.4f %+.8f*X %+.8f*Y ; scale %.6f x-units/px, %.5f deg/px\n'
                     % (c['panel'], fx['coef'][0], fx['coef'][1], fx['coef'][2], fy['coef'][0], fy['coef'][1], fy['coef'][2],
                        abs(fx['coef'][1]), abs(fy['coef'][2])))
            fh.write('#   x residuals (labelled, value:resid, leave-one-out): %s ; unlabelled check lines: %s\n' % (rx, ux))
            fh.write('#   alpha residuals (labelled, value:resid, leave-one-out): %s ; unlabelled check lines: %s\n' % (ry, uy))
        fh.write('# errors: 2sigma for single-row and single-column readings (stroke centre 0.5 px, slope, calibration RMS); bound for grid crossings, merged ink (box), turning points, ends and values at alpha 0. See method.md.\n')
        fh.write('# rows: kind curve = reading at fixed alpha (or fixed x on flat parts, or a turning point); curve_end = an end of the drawn stroke; curve_at_zero = where the stroke meets the alpha 0 line (flagged when it does not); box = merged ink, x_err and y_err are half-widths\n')
        w = csv.writer(fh)
        w.writerow(['id', 'kind', 'panel', 'series', 'symbol', 'filled', 'x', 'x_err', 'y', 'y_err', 'err_basis', 'flag', 'note'])
        for r in rows[fig]:
            w.writerow(r)
    print(path, len(rows[fig]), 'rows')

with open(os.path.join(C, 'wing_calls.csv'), 'w', newline='') as fh:
    w = csv.writer(fh)
    w.writerow(['figure', 'panel', 'printed_label', 'wing', 'alternatives', 'legend_dash_px', 'legend_gap_px',
                'curve_dash_px', 'curve_gap_px', 'pattern', 'confidence', 'note'])
    for r in wing_rows:
        w.writerow(r)
print('wing_calls.csv', len(wing_rows), 'curves')
json.dump(points, open(os.path.join(C, 'work', 'overlay_points.json'), 'w'))
for k in sorted(counts):
    print(k, counts[k])
