"""Build readings/tn3819_fig32.csv from the adopted pixel readings.

Every pixel position below was read in the native 300 ppi scan of PDF page 64 (pixel index =
pixel centre). How each was found is in the 'how' text and in method.md. Data values come from
mapping.Mapper (local gridline positions, value interpolated between the two bracketing lines).

Error per value, in pixels first, then times the local data-per-pixel scale:
  x: centring + 1 scan pixel + calibration + overlap
  y: centring + 1 scan pixel + calibration + bridge + overlap + |slope| * (x error in px)
     (slope term only for curve readings, where an x uncertainty moves the reading along the curve)
calibration (px) = sqrt(local line-fit term^2 + 0.3^2), 0.3 px being how well a printed
gridline centre is defined (it wanders in steps of about 0.3 to 0.5 px along its length).
The components are added linearly (conservative).

Usage: python3 -I build.py calib.json out.csv out_points.json
"""
import csv
import json
import math
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from mapping import Mapper

m = Mapper(sys.argv[1])

T28 = 'open triangle: Measured P_B, M=2.41, Langley 9" SST, R=2.8x10^6'
T113 = 'flagged triangle: Measured P_B, M=2.41, Langley 9" SST, R=11.3x10^6'

# id, series, symbol, legend meaning, mach, reynolds, px, py, centring x px, centring y px,
# overlap x px, overlap y px, how, data_or_key, notes
SYMBOLS = [
    ('S01', 'L9_M241_R2.8', 'open triangle', T28, 2.41, '2.8e6', 410.6, 1778.6, 0.5, 0.5, 0.0, 0.0,
     'template fit (legend-key outline, 18.95 x 15.91 px) ; checked on crop; base corners 401.5 and 419.5 and base row 1783.3 to 1783.6 agree',
     'data',
     'Station x/c 1.0, upper of two. No flag (nothing leaves the apex up and right). Drawn about 2 px right of the frame line. '
     'The faired curve passes through its right half. On the left frame line, inside the frame, on the faired curve, legend size.'),
    ('S02', 'L9_M241_R11.3', 'flagged triangle (flag faint)', T113, 2.41, '11.3e6', 409.2, 1822.5, 0.5, 0.5, 0.0, 0.0,
     'vertex reading from its own strokes (sides and base); template fit (409.21, 1822.68) agrees',
     'data',
     'Station x/c 1.0, lower of two. Base lies on the -0.06 gridline. A short faint tick rises up and right just above the apex '
     '(about 3 px above it, where the faired curve meets the frame line): read as the flag, but faint, so the Reynolds number is '
     'UNSURE (alternative: open triangle R=2.8x10^6, which would give two R=2.8 symbols at this station).'),
    ('S03', 'L9_M241_R11.3', 'flagged triangle', T113, 2.41, '11.3e6', 537.5, 1510.0, 0.5, 2.0, 0.0, 1.5,
     'template fit, two triangles fitted together; apex at the gridline; base hidden',
     'data',
     'Station x/c 0.8, upper of two overlapping outlines. Clear flag from its apex. Its base would lie on the -0.16 gridline and '
     'the faired curve and cannot be seen; only the apex and upper sides are its own. Free-size fit gives y 1508.2, apex-based '
     'reading gives 1511.7; both inside the error. AMBIGUOUS: the cluster may be one symbol drawn tall (see S04 note).'),
    ('S04', 'L9_M241_R2.8', 'open triangle (no flag seen)', T28, 2.41, '2.8e6', 538.0, 1515.9, 0.6, 0.6, 0.0, 0.5,
     'base row 1520.6 to 1521.2 and base corners 530.5 and 545.5; template fits 1515.6 to 1516.0',
     'data',
     'Station x/c 0.8, lower of two overlapping outlines; base clear, lower sides clear, apex inside S03 and the gridline. '
     'Any flag of its own would fall on S03 strokes, so its Reynolds number rests only on S03 carrying the flag: UNSURE. '
     'ALTERNATIVE reading of the whole cluster as ONE symbol: centre (538.0, 1516.0), the flag then being its flag (R=11.3x10^6).'),
    ('S05', 'L9_M241_R11.3', 'flagged triangle', T113, 2.41, '11.3e6', 665.1, 1505.9, 0.5, 1.0, 0.0, 0.0,
     'template fit, two triangles fitted together; apex from side lines (665.2, 1495.6) agrees',
     'data',
     'Station x/c 0.6, upper of two. Clear flag. Its base lies on the -0.16 gridline (and the faired curve), so the base row is '
     'taken as hidden; reading from apex and sides.'),
    ('S06', 'L9_M241_R2.8', 'open triangle', T28, 2.41, '2.8e6', 664.7, 1519.7, 0.5, 0.8, 0.0, 0.0,
     'vertex reading from its own strokes; template fit gives y 1520.4',
     'data',
     'Station x/c 0.6, lower of two; its apex touches the base of S05 on the gridline. No flag.'),
    ('S07', 'L9_M241_R2.8', 'open triangle', T28, 2.41, '2.8e6', 793.2, 1469.8, 0.5, 1.3, 0.0, 0.3,
     'template fit, two triangles fitted together; free-size fit 1469.7, apex-based 1469.4, partial vertex reading 1468.5',
     'data',
     'Station x/c 0.4, upper of two (outlines overlap by about 4 px). No flag from its apex. Its base coincides with the faired '
     'curve, which runs level through it.'),
    ('S08', 'L9_M241_R11.3', 'flagged triangle', T113, 2.41, '11.3e6', 793.2, 1480.35, 0.7, 0.5, 0.3, 0.3,
     'vertex reading from its own strokes; template fits agree in y (1480.35)',
     'data',
     'Station x/c 0.4, lower of two. The flag leaves its apex (about y 1470.5) and crosses the right side of S07; '
     'the flag line meets the axis 3 to 4 px below this apex and 14 px below the apex of S07.'),
    ('S09', 'L9_M241_R11.3', 'flagged triangle', T113, 2.41, '11.3e6', 921.3, 1484.2, 0.5, 1.2, 0.0, 0.3,
     'vertex reading from its own strokes (base from its right half); template fit gives 1486.1, pulled down by the faired curve',
     'data',
     'Station x/c 0.2, upper of two (outlines overlap by about 5 px). Clear flag. Left half of its base merges with the faired curve.'),
    ('S10', 'L9_M241_R2.8', 'open triangle', T28, 2.41, '2.8e6', 921.6, 1494.4, 0.5, 0.5, 0.0, 0.3,
     'vertex reading from its own strokes; template fits agree',
     'data',
     'Station x/c 0.2, lower of two. No flag seen (the place a flag would occupy is crossed by the right side of S09).'),
    ('S11', 'L9_M241_R11.3', 'flagged triangle (assignment unsure)', T113, 2.41, '11.3e6', 1048.4, 1492.1, 0.5, 1.1, 0.0, 1.0,
     'template fit, two triangles fitted together; free-size fit 1491.6; apex-based 1492.5 to 1493.2',
     'data',
     'Station x/c 0.0, upper of two heavily overlapping outlines (centres about 5 px apart). Its sides and base corners are '
     'clear but the middle of its base is NOT visible (it would lie inside S12); only faint grey along row 1494. AMBIGUOUS: '
     '(a) two symbols, as entered; (b) one symbol only (S12) with these strokes being something else. The flag meets the axis at '
     'about y 1486, 3 to 4.5 px below this apex and at or above the apex of S12, so the flag is taken as this symbol\'s; the '
     'Reynolds assignment of S11 and S12 could be the other way round.'),
    ('S12', 'L9_M241_R2.8', 'open triangle (assignment unsure)', T28, 2.41, '2.8e6', 1048.0, 1496.9, 0.7, 0.6, 0.0, 0.5,
     'base row 1501.9 to 1502.2 and base corners 1040 and 1056; template fits 1496.6 to 1497.5',
     'data',
     'Station x/c 0.0, lower of two heavily overlapping outlines; full outline visible. The faired curve ends at the left side of '
     'this cluster. ALTERNATIVE (one symbol only): this is the only symbol at x/c 0.0 and carries the flag (R=11.3x10^6).'),
]

KEYS = [
    ('K01', 'L9_M241_R2.8', 'open triangle', T28, 2.41, '2.8e6', 985.3, 1839.3,
     'legend key',
     'Inside the legend box (box spans about x 590 to 1170, y 1640 to 1980), immediately left of the text "R=2.8 x 10^6", '
     'not on a gridline crossing. Size 18.6 x 16.8 px by vertex reading. Not data.'),
    ('K02', 'L9_M241_R11.3', 'flagged triangle', T113, 2.41, '11.3e6', 985.3, 1878.8,
     'legend key',
     'Inside the legend box, immediately left of "R=11.3 x 10^6". Flag leaves the apex up and right at about 59 degrees. Not data.'),
]

# Faired curve and reference 26 check curves: (id, series, symbol, meaning, mach, reynolds, px, py,
#   centring y px, bridge px, slope dy/dx, how, notes)
FC = 'faired curve drawn through the Mach 2.41 measured symbols'
CURVES = [
    ('C00', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 408.86, 1803.0, 3.0, 0.0, -5.0,
     'end of the curve: last point where its ink is separate from the frame line (rows 1797 to 1803), quadratic of the traced centres gives 1806',
     'Left end at x/c 1.0 (the frame). The curve runs down through S01 and meets the frame line at about y 1801 to 1806. '
     'ALTERNATIVE: it may continue, hidden in the frame line, to the apex of S02 at y 1811.6 (P_B about -0.0636).'),
    ('C01', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 473.40, 1570.51, 0.3, 0.5, -1.87,
     'traced ink centres by rows, quadratic x(y) fitted within 12 px, intersected with the local x/c 0.9 gridline',
     'x/c 0.9. Steep here; crossing lies 2 px above the -0.14 gridline and 10 px below the Prandtl-Meyer dashed line.'),
    ('C02', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 537.79, 1510.29, 0.3, 1.5, -0.3,
     'traced centres either side of the S03/S04 cluster (gaps 11 px left, 22 px right), quadratic, intersected with the gridline',
     'x/c 0.8. The curve is hidden by the symbols and runs into the -0.16 gridline here; bridged across the symbols, error added.'),
    ('C03', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 601.43, 1504.88, 0.3, 0.0, 0.03,
     'traced column centres, quadratic within 12 px, intersected with the gridline',
     'x/c 0.7.'),
    ('C04', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 665.5, 1509.4, 0.5, 1.0, 0.0,
     'by hand from column profiles at x 650 to 656 and 677 to 683, where curve and gridline ink overlap',
     'x/c 0.6. The curve lies along the -0.16 gridline from about x 645 to 690 and behind S05/S06; its centre sits 0.3 to 0.7 px '
     'above the gridline centre (1509.9 to 1510.0). Bridged across the symbols.'),
    ('C05', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 729.30, 1501.02, 0.3, 0.0, -0.3,
     'traced column centres, quadratic within 12 px, intersected with the gridline',
     'x/c 0.5.'),
    ('C06', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 793.49, 1474.44, 0.3, 1.0, 0.0,
     'traced centres either side of the S07/S08 cluster (gaps 10.5 px each side), quadratic, intersected with the gridline',
     'x/c 0.4. Hidden by the symbols; the curve runs level along the base of S07 here. Bridged.'),
    ('C07', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 857.17, 1484.45, 0.3, 0.0, 0.14,
     'traced column centres, quadratic within 12 px, intersected with the gridline',
     'x/c 0.3.'),
    ('C08', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 921.41, 1491.79, 0.3, 1.0, 0.1,
     'traced centres either side of the S09/S10 cluster (gaps 10.4 and 10.6 px), quadratic, intersected with the gridline',
     'x/c 0.2. Hidden by the symbols; it merges with the left half of the base of S09. Bridged.'),
    ('C09', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 984.79, 1495.92, 0.3, 0.0, 0.0,
     'traced column centres, quadratic within 12 px, intersected with the gridline',
     'x/c 0.1. A Prandtl-Meyer dash crosses the curve near x 940 to 950 (masked); not near this station.'),
    ('C10', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 1048.45, 1495.06, 0.3, 1.0, -0.02,
     'level of the last 30 px of traced curve carried 7 px to the x/c 0 gridline (the curve is flat there)',
     'x/c 0.0. The curve ENDS at the left side of the S11/S12 cluster, about 7 px short of the station; this value is the '
     'curve level carried to the station, not ink at the station.'),
    ('C11', 'L9_M241_faired', 'solid curve', FC, 2.41, '', 1041.0, 1495.2, 0.3, 0.0, -0.02,
     'last traced ink centre before the curve joins the symbol outline (x 1039 to 1041)',
     'Right end of the faired curve, at the left side of the x/c 0.0 symbols.'),
]
R150 = 'Mach 1.50, ref. 26, measured P_B (short-dash long-dash curve)'
R200 = 'Mach 2.00, ref. 26, measured P_B (short-dash long-dash curve)'
CHECK = [
    ('R01', 'ref26_M150_check', 'dash-dot curve', R150, 1.50, '', 409.55, 1444.31, 0.3, 0.5, -0.23,
     'traced column centres, quadratic, at the frame (curve visible to x 413)', 'Calibration check only; sets nothing. x/c 1.0.'),
    ('R02', 'ref26_M150_check', 'dash-dot curve', R150, 1.50, '', 537.72, 1395.73, 0.3, 0.0, -0.6,
     'traced column centres, quadratic within 12 px', 'Calibration check only. x/c 0.8.'),
    ('R03', 'ref26_M150_check', 'dash-dot curve', R150, 1.50, '', 665.51, 1335.63, 0.3, 0.0, -0.2,
     'traced column centres, quadratic within 12 px', 'Calibration check only. x/c 0.6.'),
    ('R04', 'ref26_M150_check', 'dash-dot curve', R150, 1.50, '', 793.5, 1319.6, 0.5, 1.0, -0.17,
     'straight line between traced centres at x 772 and 805; curve merged with the -0.22 gridline between',
     'Calibration check only. x/c 0.4. Curve lies on the -0.22 gridline here.'),
    ('R05', 'ref26_M150_check', 'dash-dot curve', R150, 1.50, '', 921.46, 1194.63, 0.3, 0.5, -2.12,
     'traced row centres, quadratic x(y), intersected with the gridline', 'Calibration check only. x/c 0.2. Steep; at the -0.26 gridline crossing.'),
    ('R06', 'ref26_M150_check', 'dash-dot curve', R150, 1.50, '', 1048.44, 986.80, 0.3, 0.0, -0.30,
     'traced column centres, quadratic within 12 px', 'Calibration check only. x/c 0.0.'),
    ('R07', 'ref26_M200_check', 'dash-dot curve', R200, 2.00, '', 409.55, 1495.6, 0.5, 0.5, -0.1,
     'by hand: faint curve rows 1495 to 1496 at x 411 to 433, carried 2 px to the frame', 'Calibration check only. x/c 1.0. Ink faint here.'),
    ('R08', 'ref26_M200_check', 'dash-dot curve', R200, 2.00, '', 537.77, 1479.15, 0.3, 0.0, -0.2,
     'traced column centres, quadratic within 12 px', 'Calibration check only. x/c 0.8.'),
    ('R09', 'ref26_M200_check', 'dash-dot curve', R200, 2.00, '', 665.50, 1438.13, 0.3, 0.0, -0.45,
     'traced column centres, quadratic within 12 px', 'Calibration check only. x/c 0.6.'),
    ('R10', 'ref26_M200_check', 'dash-dot curve', R200, 2.00, '', 793.5, 1357.3, 1.0, 1.5, -0.7,
     'by hand: centre of the merged ink band at x 790 (1359.3) and 796 (1355.0)',
     'Calibration check only. x/c 0.4. Here the curve is merged with the Mach 1.93 calculated curve (circles) from x 785 to 808 and crosses the gridline.'),
    ('R11', 'ref26_M200_check', 'dash-dot curve', R200, 2.00, '', 921.47, 1349.83, 0.3, 0.0, 0.17,
     'traced column centres, quadratic within 12 px', 'Calibration check only. x/c 0.2.'),
    ('R12', 'ref26_M200_check', 'dash-dot curve', R200, 2.00, '', 1048.48, 1381.72, 0.3, 1.0, 0.3,
     'traced centres either side (gaps 3.5 and 12.5 px; the curve runs into the -0.20 gridline), straight line',
     'Calibration check only. x/c 0.0.'),
]

rows = []
pts = []

def fmt(v):
    t = f'{v:.4f}'
    return '0.0000' if t == '-0.0000' else t

def cal(px_term):
    return math.sqrt(px_term ** 2 + 0.3 ** 2)

for (i, ser, sym, mean, mach, re, px, py, cx, cy, ox, oy, how, dk, notes) in SYMBOLS:
    d = m.to_data(px, py)
    ex = cx + 1.0 + cal(d['cal_x_px']) + ox
    ey = cy + 1.0 + cal(d['cal_y_px']) + oy
    rows.append(dict(id=i, series=ser, symbol=sym, legend_meaning=mean, mach=mach, reynolds=re,
                     x_c=fmt(d['x_c']), x_err=f"{ex * d['sx']:.4f}", y=fmt(d['y']), y_err=f"{ey * d['sy']:.4f}",
                     px_x=f'{px:.2f}', px_y=f'{py:.2f}', how=how, data_or_key=dk,
                     notes=notes + f" Errors in px: x centring {cx}, pixel 1, calibration {cal(d['cal_x_px']):.2f}, overlap {ox}; "
                                   f"y centring {cy}, pixel 1, calibration {cal(d['cal_y_px']):.2f}, overlap {oy}. "
                                   f"Global-plane check x/c {d['gx']:.4f}, P_B {d['gy']:.4f}."))
    pts.append(dict(id=i, px=px, py=py, kind='symbol'))
for (i, ser, sym, mean, mach, re, px, py, dk, notes) in KEYS:
    rows.append(dict(id=i, series=ser, symbol=sym, legend_meaning=mean, mach=mach, reynolds=re,
                     x_c='', x_err='', y='', y_err='', px_x=f'{px:.2f}', px_y=f'{py:.2f}',
                     how='vertex reading from its own strokes', data_or_key=dk, notes=notes))
    pts.append(dict(id=i, px=px, py=py, kind='key'))
for group in (CURVES, CHECK):
    for (i, ser, sym, mean, mach, re, px, py, cy, br, sl, how, notes) in group:
        d = m.to_data(px, py)
        ex = 0.0 + 1.0 + cal(d['cal_x_px'])
        ey = cy + 1.0 + cal(d['cal_y_px']) + br + abs(sl) * ex
        if i == 'C00':
            ex = 0.7 + 1.0 + cal(d['cal_x_px'])
            ey = cy + 1.0 + cal(d['cal_y_px'])
        rows.append(dict(id=i, series=ser, symbol=sym, legend_meaning=mean, mach=mach, reynolds=re,
                         x_c=fmt(d['x_c']), x_err=f"{ex * d['sx']:.4f}", y=fmt(d['y']), y_err=f"{ey * d['sy']:.4f}",
                         px_x=f'{px:.2f}', px_y=f'{py:.2f}', how=how, data_or_key='data',
                         notes=notes + f" Errors in px: y centring {cy}, pixel 1, calibration {cal(d['cal_y_px']):.2f}, "
                                       f"bridge {br}, slope {sl} times x error {ex:.2f}. "
                                       f"Global-plane check x/c {d['gx']:.4f}, P_B {d['gy']:.4f}."))
        pts.append(dict(id=i, px=px, py=py, kind='check' if i.startswith('R') else 'curve'))

cols = ['id', 'series', 'symbol', 'legend_meaning', 'mach', 'reynolds', 'x_c', 'x_err', 'y', 'y_err',
        'px_x', 'px_y', 'how', 'data_or_key', 'notes']
with open(sys.argv[2], 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    for r in rows:
        w.writerow(r)
json.dump(pts, open(sys.argv[3], 'w'), indent=1)
for r in rows:
    print(f"{r['id']:4s} {r['series']:18s} x/c {r['x_c']:>8s} +- {r['x_err']:>7s}   P_B {r['y']:>8s} +- {r['y_err']:>7s}   px ({r['px_x']}, {r['px_y']})  {r['data_or_key']}")
