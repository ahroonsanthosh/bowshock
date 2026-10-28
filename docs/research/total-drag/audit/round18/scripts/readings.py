"""Compute the Mach 1.7 readings of NACA RM A52E01 fig. 8(a) (PDF page 29) from the stacked page image.
Every value comes from ink pixels in stated rows and column windows (no fitting of curves, no interpolation).
Usage: python3 -I readings.py image.png calibration.json gridmask.npy out.csv"""
import sys, json, math
import numpy as np
from PIL import Image
img, cj, gmf, outcsv = sys.argv[1:5]
a = np.array(Image.open(img).convert('L')) < 128
C = json.load(open(cj))
# mask only the vertical grid lines (band of +-2.6 px about each fitted line); rows used for readings are chosen clear of horizontal lines
H_, W_ = a.shape
yy, xx = np.mgrid[0:H_, 0:W_]
gm = np.zeros_like(a)
for d in C['lines']['vertical']:
    gm |= np.abs(xx - (d['x_at_y1200'] + d['slope_dx_dy']*(yy-1200))) <= 2.6
del yy, xx
def cp(x, y): return C['cp'][0] + C['cp'][1]*x + C['cp'][2]*y
def al(x, y): return C['alpha'][0] + C['alpha'][1]*x + C['alpha'][2]*y
CP_PX = abs(C['cp'][1])          # Cp per px in x
AL_PX = abs(C['alpha'][2])       # deg per px in y
# calibration 2 sigma from the scatter of labelled-line mean residuals
rv = np.array([r['mean_resid'] for r in C['vres'] if r['labelled']])
rh = np.array([r['mean_resid'] for r in C['hres'] if r['labelled']])
CAL_CP = 2*rv.std(ddof=1); CAL_AL = 2*rh.std(ddof=1)
def line_y(alpha_val, x):
    d = [h for h in C['lines']['horizontal'] if h['value'] == alpha_val][0]
    return d['y_at_x1850'] + d['slope_dy_dx']*(x-1850)
def centre(rows, x0, x1):
    """mean column of non-grid ink in the given rows and window, plus visible extent"""
    xs = []
    for y in rows:
        idx = np.where(a[y, x0:x1+1] & ~gm[y, x0:x1+1])[0] + x0
        xs += list(idx)
    xs = np.array(xs)
    return xs.mean(), xs.min(), xs.max(), len(xs)
rows = []
def add(id_, kind, series, x, xe, y, ye, basis, flag, note):
    rows.append([id_, kind, 'M=1.7 (panel M=1.2, 1.4, 1.7)', series, '%.4f' % x, '%.4f' % xe, '%.3f' % y, '%.3f' % ye, basis, flag, note])
def at_line(id_, series, alpha_val, spec, flag, note, extra_px=0.0):
    # spec: list of (rows, x0, x1) on both sides of the grid line
    xs = []; lo = 1e9; hi = -1e9
    for r, x0, x1 in spec:
        m, mn, mx, n = centre(r, x0, x1)
        xs.append(m); lo = min(lo, mn); hi = max(hi, mx)
    xm = float(np.mean(xs))
    ym = line_y(alpha_val, xm)
    half = (hi - lo + 1)/2.0 + extra_px
    xe = math.hypot(CAL_CP, half*CP_PX)
    ye = math.hypot(CAL_AL, 1.5*AL_PX)
    basis = ('calib 2sd %.4f (+) reading bound %.1f px = half the visible stroke width across rows %s, x %d to %d' %
             (CAL_CP, half, '/'.join('%d-%d' % (r[0], r[-1]) for r, _, _ in spec), lo, hi))
    add(id_, 'curve', series, cp(xm, ym), xe, alpha_val + (al(xm, ym) - alpha_val)*0, ye, basis, flag,
        note + ' [pixel x %.1f, y %.1f]' % (xm, ym))
    return xm, ym
def at_frame(id_, kind, series, spec_rows, x0, x1, flag, note):
    m, mn, mx, n = centre(spec_rows, x0, x1)
    yz = line_y(0, m)
    half = (mx - mn + 1)/2.0
    xe = math.hypot(CAL_CP, half*CP_PX)
    ye = math.hypot(CAL_AL, 2.5*AL_PX)    # frame line half thickness
    basis = ('calib 2sd %.4f (+) reading bound %.1f px = half the ink width resting on the frame, rows %d-%d, x %d to %d; alpha bound = frame half thickness 2.5 px' %
             (CAL_CP, half, spec_rows[0], spec_rows[-1], mn, mx))
    add(id_, kind, series, cp(m, yz), xe, 0.0, ye, basis, flag, note + ' [pixel x %.1f, frame centre y %.1f]' % (m, yz))
    return m
def box(id_, series, x0, x1, y0, y1, flag, note, kind='box'):
    corners = [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]
    cps = [cp(*c) for c in corners]; als = [al(*c) for c in corners]
    xc = (max(cps)+min(cps))/2; xe = (max(cps)-min(cps))/2 + CAL_CP
    yc = (max(als)+min(als))/2; ye = (max(als)-min(als))/2 + CAL_AL
    add(id_, kind, series, xc, xe, yc, ye, 'bound: half the box (pixel x %d-%d, y %d-%d) plus calib 2sd' % (x0, x1, y0, y1), flag, note)
def point_end(id_, series, spec_rows, x0, x1, flag, note):
    m, mn, mx, n = centre(spec_rows, x0, x1)
    yv = spec_rows[-1]
    xe = math.hypot(CAL_CP, (mx-mn+1)/2*CP_PX); ye = math.hypot(CAL_AL, 2*AL_PX)
    add(id_, 'curve_end', series, cp(m, yv), xe, al(m, yv), ye,
        'calib 2sd (+) half the ink width at the lowest rows %d-%d (x %d to %d), alpha bound 2 px' % (spec_rows[0], spec_rows[-1], mn, mx), flag, note + ' [pixel x %.1f, y %d]' % (m, yv))

R = range
# ---- curve A: short dashes, wing 3 ----
at_line('A_a4', '3', 4, [(R(1328, 1329), 1704, 1716), (R(1332, 1337), 1704, 1716)], '',
        'short dash 1328-1343 runs through the alpha 4 line')
at_line('A_a2', '3', 2, [(R(1388, 1393), 1708, 1722)], 'end-of-dash',
        'a short dash ends inside the alpha 2 line (no ink below it until row 1406); value is where that dash meets the line; alternative: the true curve at alpha 2 lies anywhere in x 1713-1721 (next dash starts at x 1714-1718)')
at_frame('A_a0', 'curve_at_zero', '3', list(R(1450, 1454)), 1712, 1726, '',
         'last short piece (rows 1450-1453) rests on the frame; 3 px gap above it')
at_frame('A_end', 'curve_end', '3', list(R(1450, 1454)), 1712, 1726, '',
         'lowest end is on the alpha 0 frame (same ink as A_a0)')
# ---- curve M: long and short alternating, wing 4 ----
at_line('M_a4', '4', 4, [(R(1325, 1329), 1747, 1760)], 'merged-in-grid',
        'short element of the diagonal branch meets the alpha 4 line; its last rows are inside the line, the long dash below starts 5 px under it; the stroke leans right about 0.5 px per row, so the value is read 2 to 5 rows above the line centre and the lean (about 1.5 px) is inside the bound')
at_line('M_a2', '4', 2, [(R(1391, 1393), 1778, 1789), (R(1397, 1401), 1778, 1789)], '',
        'short element 1391-1410 runs through the alpha 2 line')
at_frame('M_a0', 'curve_at_zero', '4', list(R(1450, 1454)), 1764, 1780, '',
         'long dash 1416-1453 runs down into the frame')
at_frame('M_end', 'curve_end', '4', list(R(1450, 1454)), 1764, 1780, '',
         'lowest end is on the alpha 0 frame (same ink as M_a0)')
# ---- curve R: long dashes, wing 2 ----
at_line('R_a4', '2', 4, [(R(1325, 1329), 1738, 1747), (R(1333, 1337), 1738, 1747)], '',
        'long dash 1303-1354 runs straight through the alpha 4 line')
at_line('R_a2', '2', 2, [(R(1387, 1391), 1733, 1742), (R(1397, 1402), 1732, 1740)], 'merged-in-grid',
        'long dash crosses the alpha 2 line at its intersection with the Cp -0.2 line; left edge of the stroke may be hidden in the vertical line, so the bound is widened by 1.5 px', extra_px=1.5)
at_frame('R_a0', 'curve_at_zero', '2', list(R(1449, 1453)), 1680, 1694, 'uncertain-end',
         'small piece (rows 1449-1452, x 1684-1690) on the frame, about 7 px below and left of the lower tip of the long diagonal dash and in line with it; every other mark on this frame is a curve end; alternative: the curve stops at the diagonal tip, see R_end_alt')
at_frame('R_end', 'curve_end', '2', list(R(1449, 1453)), 1680, 1694, 'uncertain-end',
         'lowest end taken as the piece on the frame (same ink as R_a0)')
point_end('R_end_alt', '2', list(R(1443, 1447)), 1688, 1702, 'alternative',
          'alternative lowest end if the piece on the frame is not part of this curve: lower tip of the long diagonal dash 1413-1446')
# ---- boxes where ink merges or crosses ----
box('X_MR', '2;4', 1738, 1749, 1294, 1310, 'crossing',
    'M (wing 4) and R (wing 2) meet here; read as a crossing: wing 2 continues straight down at x 1742-1745 and wing 4 continues down and right on the diagonal; alternative: they touch and swap (wing 4 goes straight down, wing 2 goes right)')
box('X_RA', '2;3', 1711, 1725, 1413, 1426, 'crossing',
    'the long diagonal dash of R (wing 2) crosses the short-dash column of A (wing 3); read as: wing 2 continues down and left to about Cp -0.13 at alpha 0, wing 3 continues straight down to about Cp -0.18; alternative: swap')
box('H_R', '2', 1727, 1736, 1398, 1414, 'hidden',
    'R passes the Cp -0.2 grid line here; its stroke is hidden in the line between the dash that ends at about row 1404 and the diagonal dash that starts at row 1413')
hdr = ['# source: Dugan, NACA RM A52E01 (1952), NTRS 19930087008, https://ntrs.nasa.gov/api/citations/19930087008/downloads/19930087008.pdf',
       '# sha256: 3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54',
       '# page: PDF page 29 (printed page 28), Figure 8 (a), Reynolds number 1.5 million; panel titled M=1.2, 1.4, 1.7 (bottom right); Mach 1.7 curves only, low angles',
       '# image: 10 CCITT strips (2464 px wide, 240 ppi, 1 bit) extracted with pdfimages -png, each flipped top to bottom and stacked in order -> 2464 x 2064 px (work/p29_fixed.png); no resampling',
       '# axes as printed: x = Pressure coefficient, (Pb - Po)/q, labels 0, -.2, -.4, -.6, -.8; y = Nominal angle of attack, alpha, degrees, labels 0 to 14 (on the row\'s left panel)',
       '# calibration: affine least squares; Cp = %.6f %+.8f*x %+.8f*y from 5 labelled vertical lines (0, -.2, -.4, -.6, -.8; %d sampled points); alpha = %.5f %+.8f*x %+.8f*y from 8 labelled horizontal lines (0..14; %d points)' % (
           C['cp'][0], C['cp'][1], C['cp'][2], 0, C['alpha'][0], C['alpha'][1], C['alpha'][2], 0),
       '# calibration residuals (mean per line, fit minus true): Cp lines ' + ', '.join('%g: %+.4f (%.2f px)%s' % (r['value'], r['mean_resid'], r['mean_resid_px'], '' if r['labelled'] else ' unlabelled check') for r in C['vres']),
       '# alpha lines ' + ', '.join('%g: %+.3f deg (%.2f px)%s' % (r['value'], r['mean_resid'], r['mean_resid_px'], '' if r['labelled'] else ' unlabelled check') for r in C['hres']),
       '# scale: %.2f px per 0.1 Cp, %.2f px per deg; scan rotation about -0.0058 rad (vertical lines) and -0.0038 rad (horizontal lines), the difference is skew; both absorbed by the affine fit' % (C['px_per_0p1cp'], C['px_per_deg']),
       '# calibration 2 sigma (scatter of labelled-line residuals): Cp %.4f, alpha %.3f deg' % (CAL_CP, CAL_AL),
       '# x = Cp, y = alpha in degrees; series = wing number (alternatives separated by ;); errors are calib 2 sigma combined in quadrature with a reading bound, or a box half width',
       '# curve ids: A = short-dash curve (wing 3), M = long and short alternating curve (wing 4), R = long-dash curve (wing 2); see wing_calls.csv']
# fix point counts in header
n_v = sum(d['n'] for d in C['lines']['vertical'] if d['labelled']); n_h = sum(d['n'] for d in C['lines']['horizontal'] if d['labelled'])
hdr[5] = hdr[5].replace('; 0 sampled points', '; %d sampled points' % n_v).replace('; 0 points', '; %d points' % n_h)
with open(outcsv, 'w') as f:
    for h in hdr: f.write(h + '\n')
    f.write('id,kind,panel,series,x,x_err,y,y_err,err_basis,flag,note\n')
    for r in rows:
        f.write(','.join('"%s"' % s.replace('"', "'") if (',' in s or '"' in s) else s for s in r) + '\n')
for r in rows: print(r[0], r[1], r[3], r[4], '+-', r[5], ' alpha', r[6], '+-', r[7], r[9])
