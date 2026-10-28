# Assemble readings/tn3819_fig32.csv from the measurement files.
# Error per value (data units) = (centring + 1 px for the ink centre + overlap/merge term)
#   times the scale (data units per px) + calibration error. Centring is twice the Monte Carlo
#   standard deviation of the centroid (at least 0.3 px) for symbols, and the fit/bridging
#   error for curve points. Terms are added linearly (a bound, not a quadrature sum).
import sys, os, json, csv
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
C = __import__('13_calib')
gf, tri, cur, ref, out = sys.argv[1:6]
C.load(gf)
T = json.load(open(tri)); CU = json.load(open(cur)); RF = json.load(open(ref))
rows = []
OPEN = ('meas_M2.41_R2.8e6', 'open triangle', 'Measured P_B, M = 2.41, Langley 9-inch SST, R = 2.8 x 10^6', '2.41', '2.8e6')
FLAG = ('meas_M2.41_R11.3e6', 'flagged triangle', 'Measured P_B, M = 2.41, Langley 9-inch SST, R = 11.3 x 10^6', '2.41', '11.3e6')
# per triangle: identity, overlap term (px), notes
TRI = [
 ('T10u', OPEN, 0.5, 'x/c 1.0, upper of 2. No flag: the clean paper up-right of its apex (columns 411-415, rows 1763-1767) carries no stroke. Frame line runs through it; the faired curve runs through its right part near the apex.'),
 ('T10l', FLAG, 0.5, 'x/c 1.0, lower of 2. Flag from apex up-right, tip (413.7,1805.0), 7.9 px. Frame line runs through it; right half of its base merges with gridline -0.06, base read left of the frame.'),
 ('T08u', FLAG, 1.0, 'x/c 0.8, upper of 2. Flag line passes 0.1 px from its apex, tip (544.8,1497.0). Base hidden under the curve and gridline -0.16, read 1511.9 +- 0.7 px on its right part after gridline subtraction. Squat outline (h 10.1, w 15.9).'),
 ('T08l', OPEN, 1.0, 'x/c 0.8, lower of 2. Base 1521.14 clear, sides seen rows 1514-1520 only; apex hidden by the upper symbol, curve and gridline. The two side lines meet at row 1503.7 but no left-side ink exists where that would put it (columns 536-537, rows 1506-1508), so the apex is not taken from them: centroid = base - h/3 with h = 14 +- 3 px (range of the measured symbols). ALTERNATIVE (less likely): a single tall flagged symbol only at this station, centroid row 1514.7.'),
 ('T06u', FLAG, 0.5, 'x/c 0.6, upper of 2. Flag line passes 1.8 px right of its apex, tip (673.9,1490.0); 24.8 px from the lower apex. Base hidden in the band of curve and gridline -0.16 (rows 1508-1511), taken 1509.5 +- 1.5.'),
 ('T06l', OPEN, 0.5, 'x/c 0.6, lower of 2. No flag. Apex merges with gridline -0.16 and the curve.'),
 ('T04u', OPEN, 1.0, 'x/c 0.4, upper of 2. No flag above its apex (clean paper). Base hidden in the faired curve (rows 1473-1477), taken 1474.5 +- 1.5; right side visible only rows 1470-1472 (the flag of the lower symbol crosses it).'),
 ('T04l', FLAG, 0.5, 'x/c 0.4, lower of 2. Flag line passes 1.2 px from its apex, 9.5 px from the upper apex; tip (801.5,1464.0). Apex under the faired curve.'),
 ('T02u', FLAG, 0.5, 'x/c 0.2, upper of 2. Flag line passes 1.1 px from its apex, 5.4 px from the lower apex; tip (929.2,1471.0). Base hidden in the curve and the lower symbol, taken 1490.0 +- 1.5.'),
 ('T02l', OPEN, 0.5, 'x/c 0.2, lower of 2. No flag. Apex inside the upper symbol.'),
 ('T00u', FLAG, 0.5, 'x/c 0.0, upper of 2, offset 5.5 px from the lower one (doubled sides). AMBIGUOUS IDENTITY: the one flag (tip (1055.3,1480.0)) passes 1.8 px right of this apex (7.7 px long from it) and 1.2 px left of the lower apex (11.8 px long from it); both fit the other flags (7.9-12.0 px, 0.1-1.8 px). Taken as flagged because the flag joins it the way flags join at 0.6, 0.4 and 0.2 (just right of the apex). ALTERNATIVE: open (R = 2.8 x 10^6). Base right part read at its corner; left corner merges with the end of the faired curve.'),
 ('T00l', OPEN, 0.5, 'x/c 0.0, lower of 2. AMBIGUOUS IDENTITY: see the upper symbol; ALTERNATIVE: flagged (R = 11.3 x 10^6).'),
]
def fmt(v, n): return ('%.' + str(n) + 'f') % v
k = 0
for name, ident, ov, note in TRI:
    t = T['triangles'][name]
    px, py = t['cx'], t['cy']
    d = C.to_data(px, py)
    cx_c = max(2 * t['cx_sd'], 0.3); cy_c = max(2 * t['cy_sd'], 0.3)
    xe = (cx_c + 1 + ov) * d['x_per_px'] + d['x_cal_err']
    ye = (cy_c + 1 + ov) * d['y_per_px'] + d['y_cal_err']
    k += 1
    rows.append(dict(id='S%02d' % k, series=ident[0], symbol=ident[1], legend_meaning=ident[2], mach=ident[3], reynolds=ident[4],
        x_c=fmt(d['x'], 4), x_err=fmt(xe, 4), y=fmt(d['y'], 4), y_err=fmt(ye, 4), px_x=fmt(px, 2), px_y=fmt(py, 2),
        how=('centre from the base line and an assumed height because the apex is hidden: row = base - h/3 with h = 14 +- 3 px, column = middle of the base corners (native 300 dpi scan pixels); base: ' + t['base_note'])
            if name == 'T08l' else
            ('centroid of the outline: side centre lines fitted on rows, apex at their crossing, centroid one third of the height above the base (native 300 dpi scan pixels); base: ' + t['base_note']),
        data_or_key='data',
        notes='%s [%s] apex (%.2f,%.2f) base row %.2f h %.1f w %.1f; centring 2sd (%.2f,%.2f) px, overlap %.1f px, cal (%.5f,%.5f)' % (
            note, name, t['apex'][0], t['apex'][1], t['base'], t['height'], t['width'], cx_c, cy_c, ov, d['x_cal_err'], d['y_cal_err'])))
for name, ident, note in [('KEYopen', OPEN, 'legend key: inside the legend box (gridlines blanked), beside the text R=2.8x10^6'),
                          ('KEYflag', FLAG, 'legend key: inside the legend box, beside the text R=11.3x10^6; flag continues its left side up-right, 6.4 px')]:
    t = T['triangles'][name]; d = C.to_data(t['cx'], t['cy'])
    k += 1
    rows.append(dict(id='K%02d' % (k - 12), series=ident[0], symbol=ident[1], legend_meaning=ident[2], mach=ident[3], reynolds=ident[4],
        x_c='', x_err='', y='', y_err='', px_x=fmt(t['cx'], 2), px_y=fmt(t['cy'], 2),
        how='same outline fit as the data symbols; position not a value', data_or_key='legend key',
        notes=note + ' (plot coordinates would be x/c %.3f, P_B %.4f; meaningless)' % (d['x'], d['y'])))
# faired curve
CURV = ('faired_M2.41', 'solid line', 'Faired curve through the measured M = 2.41 symbols (not itself in the legend)', '2.41', 'both')
order = ['1.0', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.3', '0.2', '0.1', '0.0']
ends = {
 '1.0': dict(x_px=C.x_to_px(1.0, 1801.5), y_px=1801.5, fit_err_px=2.0, note='LEFT END. The curve runs down through the right part of the upper (open) symbol at x/c 1.0, shows again below its base (x 413.3 at row 1786, 411.8 at 1794, 410.2 at 1800) and meets the frame line, its ink fading out by row 1803; it does not reach the lower (flagged) symbol (rows 1803-1804 clean, then that symbol\'s flag). End row 1801.5 +- 2 (rows 1799.5 to 1803.5).', how='where the stroke meets the frame line, from the excess ink right of the frame after the frame profile is subtracted (scripts/17_leftend.py)'),
}
cid = 0
for key in order:
    if key in ends:
        e = ends[key]; px, py = e['x_px'], e['y_px']; fe = e['fit_err_px']; note = e['note']; how = e['how']; merge = 0.0
    else:
        r = CU[key]; px, py = r['x_px'], r['y_px']; fe = r['fit_err_px']; note = r.get('note', '') or ''
        if r.get('dxdy') is not None:
            how = 'x/c 0.9 lies on the steep part: curve centre traced by rows after gridline subtraction, parabola x(y) over rows 1540-1600 (the crossing itself, at the gridline intersection, not used), solved for the column of x/c 0.9'
        else:
            how = 'curve centre traced by columns after gridline subtraction; %s through %d columns within the window (%d left, %d right of the target), nearest used column %.1f px away' % (
                'parabola' if r['deg'] == 2 else 'straight line', r['n'], r.get('left', 0), r.get('right', 0), r['gap_px'])
        merge = 1.0 if key in ('0.8', '0.6', '0.4', '0.2', '0.0') else 0.0
        if key in ('0.8', '0.6', '0.4', '0.2'): note = 'BRIDGED: ' + note
        if key == '0.0': note = 'BRIDGED (extended): ' + note
    d = C.to_data(px, py)
    xe = 1.0 * d['x_per_px'] + d['x_cal_err']
    ye = (fe + 1 + merge) * d['y_per_px'] + d['y_cal_err']
    cid += 1
    rows.append(dict(id='C%02d' % cid, series=CURV[0], symbol=CURV[1], legend_meaning=CURV[2], mach=CURV[3], reynolds=CURV[4],
        x_c=fmt(d['x'], 4), x_err=fmt(xe, 4), y=fmt(d['y'], 4), y_err=fmt(ye, 4), px_x=fmt(px, 2), px_y=fmt(py, 2), how=how, data_or_key='data',
        notes=('target x/c %s. ' % key) + note + ' [fit/bridge %.2f px, merge %.1f px]' % (fe, merge)))
# right end (last visible ink)
px, py = 1040.5, 1495.6
d = C.to_data(px, py)
cid += 1
rows.append(dict(id='C%02d' % cid, series=CURV[0], symbol=CURV[1], legend_meaning=CURV[2], mach=CURV[3], reynolds=CURV[4],
    x_c=fmt(d['x'], 4), x_err=fmt(2 * d['x_per_px'] + d['x_cal_err'], 4), y=fmt(d['y'], 4), y_err=fmt(1.5 * d['y_per_px'] + d['y_cal_err'], 4),
    px_x=fmt(px, 2), px_y=fmt(py, 2), how='last column where the curve is seen apart from the symbols: it enters the upper symbol at x/c 0 at that symbol\'s left base corner', data_or_key='data',
    notes='RIGHT END (last visible ink). Nothing of the curve right of the x/c 0 symbols (columns 1058-1100 clean). Where inside the symbols it stops cannot be seen.'))
# reference 26 (calibration check)
for r in RF:
    nm = r['curve']
    meta = ('ref26_M1.50', 'short-dash long-dash line', 'M = 1.50, ref. 26, measured P_B (label and leader on the plot)', '1.50', '') if nm.startswith('A') else \
           ('ref26_M2.00', 'short-dash long-dash line', 'M = 2.00, ref. 26, measured P_B (label and leader on the plot)', '2.00', '')
    d = C.to_data(r['x_px'], r['y_px'])
    xe = 1.0 * d['x_per_px'] + d['x_cal_err']; ye = (r['fit_err_px'] + 1) * d['y_per_px'] + d['y_cal_err']
    cid += 1
    rows.append(dict(id='R%02d' % (cid - 12), series=meta[0], symbol=meta[1], legend_meaning=meta[2], mach=meta[3], reynolds=meta[4],
        x_c=fmt(d['x'], 4), x_err=fmt(xe, 4), y=fmt(d['y'], 4), y_err=fmt(ye, 4), px_x=fmt(r['x_px'], 2), px_y=fmt(r['y_px'], 2),
        how='CALIBRATION CHECK ONLY, sets nothing. Curve centre traced after gridline subtraction, %s; nearest used ink %.1f px from the target' % (r.get('form') or ('%s fit, %d columns' % ('parabola' if r['deg'] == 2 else 'straight line', r['n'])), r['gap_px']),
        data_or_key='data', notes='target x/c %.1f; check only' % r['xc_target']))
cols = ['id', 'series', 'symbol', 'legend_meaning', 'mach', 'reynolds', 'x_c', 'x_err', 'y', 'y_err', 'px_x', 'px_y', 'how', 'data_or_key', 'notes']
with open(out, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
    for r in rows: w.writerow(r)
for r in rows:
    print('%-4s %-20s %-17s x/c %7s +- %6s  P_B %8s +- %6s  px (%s, %s) %s' % (r['id'], r['series'], r['symbol'], r['x_c'], r['x_err'], r['y'], r['y_err'], r['px_x'], r['px_y'], r['data_or_key']))
