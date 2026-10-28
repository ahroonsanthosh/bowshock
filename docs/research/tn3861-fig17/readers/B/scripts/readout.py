# Convert the measured symbol centres (de-jogged image pixels) to (Mc, CD), estimate reading errors, map the centres back
# to the original page-image pixels, and write tn3861_fig17.csv.
# usage: readout.py calib_final.json dejog_model.json out.csv out_detail.json
import sys, json, csv, math
cal = json.load(open(sys.argv[1])); jog = json.load(open(sys.argv[2]))
A = cal['all_lines']['Mc']; Bc = cal['all_lines']['CD']
lines = cal['lines']

def affine(u, v):
    return A[0] + A[1] * u + A[2] * v, Bc[0] + Bc[1] * u + Bc[2] * v

def local(u, v):
    """Interpolate between the two bracketing grid lines of each axis, each line taken from its own straight fit."""
    vx = sorted([(L['value'], L['pos_at_ref'] + L['slope'] * (v - 1080)) for L in lines if L['axis'] == 'Mc'])
    hy = sorted([(L['value'], L['pos_at_ref'] + L['slope'] * (u - 1588)) for L in lines if L['axis'] == 'CD'])
    mc = cd = None
    for (a, xa), (b, xb) in zip(vx[:-1], vx[1:]):
        if xa <= u <= xb: mc = a + (b - a) * (u - xa) / (xb - xa)
    for (a, ya), (b, yb) in zip(hy[:-1], hy[1:]):
        if yb <= v <= ya: cd = a + (b - a) * (ya - v) / (ya - yb)
    return mc, cd

def seg_eval(segs, t):
    for a, b, c0, c1, n in segs:
        if a <= t < b: return c0 + c1 * t
    s = segs[0] if t < segs[0][0] else segs[-1]
    return s[2] + s[3] * t

def to_original(u, v):
    # corrected(x, y) = original(x + Dx(y), y + Dy(x))
    return u + seg_eval(jog['x_segments'], v), v + seg_eval(jog['y_segments'], u)

FORCE = 'Present data from force tests M = 6.86'
PRESS = 'Present data from pressure distribution'
GP = 'Gowen and Perkins, from pressure distribution, M = 1.49 to 2.9, ref. 8'
LU = 'Lord and Ulmann, from pressure distribution, M = 4.04 (unpublished)'
BU = 'Busemann, ref. 10'
WL = 'Walter and Lange, from pressure distribution M = 2.48 to 4.92 ref. 9'

# id, series, crossed, centre (u, v) on the de-jogged image, centre sigma (px x, px y), how the centre was found,
# alternative centres [(label, u, v)], flag, note
P = [
 (1, LU, 'yes', (648.52, 563.29), (0.3, 0.3), 'intersection of the cross strokes', [], 'ok',
  'Top of the right side touches the CD = 2.5 grid line. Cross intersection is 13.2 px left of the right side and 13.4 px above the bottom; the outline bounding-box centre (leg 32 px) would read {r:645.71,560.68}.'),
 (2, LU, 'yes', (736.62, 758.73), (0.3, 0.3), 'intersection of the cross strokes', [], 'ok',
  'The Mc = 1.0 grid line runs through the left part of the symbol; the peak of the dashed Welsh curve is just to its left (not a symbol). Bounding-box centre (leg 32 px) would read {r:733.25,755.60}.'),
 (3, LU, 'yes', (823.97, 1003.49), (0.3, 0.3), 'intersection of the cross strokes', [], 'ok',
  'Bounding-box centre (leg 32 px) would read {r:821.16,1001.84}.'),
 (4, GP, 'no', (843.62, 1031.92), (0.8, 0.8), 'centroid of the three vertices (right side, bottom, outer ends of the legs)', [], 'ok',
  'Mc = 1.5 and CD = 1.5 grid lines run through the triangle and a solid faired line (from the Busemann symbol) runs along its hypotenuse; no cross strokes beside the grid lines (checked on profiles: the lines inside have the width and darkness of a grid line alone). Bounding-box centre would read {r:838.04,1026.35}.'),
 (5, BU, 'no', (870.54, 951.99), (0.3, 0.3), 'midpoints of left and right sides and of bottom and top of the arch', [], 'ok',
  'A solid faired line starts inside the symbol about 2 px below the centre and runs down to triangle 4.'),
 (6, FORCE, 'yes', (910.89, 1002.24), (0.3, 0.3), 'circle fit to the ring', [], 'ok',
  'Cross intersection agrees within 0.6 px ({r:911.44,1002.75}). The upper solid faired line starts at this circle.'),
 (7, PRESS, 'yes', (910.34, 1051.65), (0.3, 0.3), 'midpoints of the four sides', [], 'ok',
  'Cross intersection {r:909.22,1052.31}. The lower solid faired line starts at this square.'),
 (8, LU, 'yes', (971.41, 1021.72), (0.8, 0.4), 'intersection of the cross strokes; vertical stroke lies on the Mc = 2.0 grid line', [], 'ok',
  'Horizontal cross stroke clearly visible across the symbol (not a grid line or the faired line, which stops at the outline). The vertical stroke coincides with the Mc = 2.0 grid line: inside the symbol that line is wider and darker than outside, and the extra ink is centred 1.3 px right of the grid line; that position is used. From the right side minus the mean cross offset of symbols 1 to 3 the vertical would be 1.2 px further left ({r:970.25,1021.72}). Bounding-box centre (leg 32 px) would read {r:967.25,1020.47}. Triangle 9 touches its bottom edge.'),
 (9, GP, 'no', (962.0, 1053.5), (0.5, 0.5), 'centroid of the three vertices (hypotenuse fit, bottom, right side)', [('centre dot', 962.88, 1051.88)], 'ambiguous',
  'Right side lies on the Mc = 2.0 grid line (separated from it on profiles: right side 2.1 px right of the grid line); top vertex hidden behind the bottom edge of symbol 8. A small plotted dot is visible inside the triangle 0.9 px right of and 1.6 px above the vertex centroid; the alternative is the reading at the dot. Bounding-box centre would read {r:956.77,1048.25}.'),
 (10, WL, 'no', (1089.26, 1113.03), (1.0, 0.6), 'mean of the four vertices from line fits to the four sides', [('possible centre dot merged with the faired line', 1088.2, 1110.5)], 'ambiguous',
  'Mc = 2.5 grid line and the lower solid faired line cross the diamond; the diamond is drawn slightly irregular (side directions 42.6, 140.7, 47.0, 135.5 deg; the two diagonal midpoints differ by 1.8 px in x). A small bump on the upper edge of the faired line near the centre may be the plotted dot; the alternative is the reading there.'),
 (11, WL, 'no', (1175.86, 1110.54), (0.5, 0.6), 'mean of the four vertices from line fits (right-hand sides only partly visible)', [], 'ok',
  'Overlaps triangle 12: the right vertex of the diamond is hidden behind the triangle, whose lower-left corner lies inside the diamond. No cross strokes.'),
 (12, GP, 'no', (1193.99, 1104.23), (0.4, 0.4), 'centroid of the three vertices (hypotenuse fit, bottom, right side)', [], 'ok',
  'Overlaps diamond 11 (drawn over it). A small plotted dot inside, within 0.6 px of the vertex centroid ({r:1193.40,1104.82}). Bounding-box centre would read {r:1188.58,1098.81}.'),
 (13, WL, 'no', (1276.11, 1121.94), (0.3, 0.3), 'mean of the four vertices from line fits to the four sides', [], 'ok',
  'Clear centre dot 1.0 px above the outline centre ({r:1276.08,1120.96}). Bottom vertex touches the lower faired line.'),
 (14, FORCE, 'yes', (1323.83, 1074.54), (0.5, 0.3), 'circle fit to the ring, right side excluded', [], 'ok',
  'Right edge of the ring merges with the Mc = 3.5 grid line; cross intersection {r:1323.90,1075.43}.'),
 (15, PRESS, 'yes', (1326.98, 1145.90), (0.5, 0.4), 'midpoints of the four sides', [], 'ok',
  'Vertical cross stroke clearly visible, 0.5 px right of the side midpoint; the horizontal arm lies on the CD = 1.25 grid line (no extra ink found on that line inside the square). Top edge drawn faintly; right side lies against the Mc = 3.5 grid line (separated on profiles: 2.5 px right of the grid line).'),
 (16, WL, 'no', (1507.07, 1127.70), (0.5, 0.4), 'mean of the four vertices from line fits to the four sides', [('centre dot', 1506.02, 1125.21)], 'ambiguous',
  'Clear centre dot 1.1 px left of and 2.5 px above the outline centre; the alternative is the reading at the dot. Bottom vertex touches the lower faired line and the CD = 1.25 grid line.'),
 (17, FORCE, 'yes', (1669.00, 1107.74), (0.3, 0.3), 'circle fit to the ring', [], 'ok',
  'Cross intersection {r:1669.71,1108.34}. Its vertical cross stroke continues down through square 18.'),
 (18, PRESS, 'yes', (1670.16, 1141.69), (0.4, 0.4), 'midpoints of the four sides', [], 'ok',
  'Vertical cross stroke continuous with that of circle 17; the horizontal cross stroke is visible just above the CD = 1.25 grid line. Diamond 19 is drawn behind its right side.'),
 (19, WL, 'no', (1686.43, 1144.42), (0.9, 0.6), 'right half only: x of the bottom vertex, y of the right vertex', [], 'ok',
  'Left half hidden behind square 18; the visible half shows no cross stroke (white where the vertical arm would be, above and below the square). With the mean half-diagonal of diamonds 13 and 16 (20.8 px) the reading would be {r:1687.30,1144.90}.'),
 (20, FORCE, 'yes', (1940.03, 1120.91), (0.5, 0.4), 'circle fit to the ring, sectors crossed by other lines excluded', [], 'ok',
  'Heavily overlapped: Mc = 6.0 grid line, upper faired line, square 21 below. Cross intersection {r:1939.05,1122.47}.'),
 (21, PRESS, 'yes', (1939.58, 1142.74), (0.5, 0.6), 'midpoint of left and right sides; bottom minus half the mean side (29.4 px)', [('same position, not crossed', None, None)], 'ambiguous',
  'Top edge not drawn (inside circle 20). A vertical stroke 0.5 px left of the side midpoint runs from circle 20 down to the bottom edge of the square, continuous with the circle\'s cross; the horizontal arm would lie on the CD = 1.25 grid line, where only weak extra ink is seen. Most likely crossed, but the vertical could be the circle\'s cross line carried through.'),
 (22, FORCE, 'yes', (2106.42, 1130.10), (0.4, 0.4), 'circle fit to the ring, sectors crossed by other lines excluded', [], 'ok',
  'Cross intersection {r:2105.82,1129.74}.'),
 (23, PRESS, 'yes', (2109.29, 1149.71), (0.5, 0.6), 'midpoint of left and right sides; bottom minus half the mean side (29.4 px)', [], 'ok',
  'Top edge hidden inside circle 22 (right side visible up to about 29 px above the bottom edge, consistent with a 29 px square). Own vertical cross stroke 1.8 px right of the side midpoint (joined by a kink to the cross line of circle 22) and a light horizontal stroke at the mid-height of the square, where the lower faired line is interrupted. Cross intersection {r:2111.10,1149.50}.'),
 (24, FORCE, 'no', (2159.61, 1130.33), (0.4, 0.5), 'circle fit to the ring, sectors touched by square 25 excluded', [], 'ok',
  'No cross; the top edge of square 25 runs across the inside of the circle. A very faint grey smudge near the centre (not a stroke). Upper faired line ends at this circle.'),
 (25, PRESS, 'no', (2158.39, 1141.06), (0.4, 0.4), 'midpoints of the four sides', [], 'ok',
  'Top edge visible inside circle 24; left side coincides with the left edge of the circle. No cross.'),
]

import re
def fill(note):
    # {r:u,v} -> 'x=..., value=...' for a point given in de-jogged pixels
    def rep(m):
        u, v = float(m.group(1)), float(m.group(2)); a, b = affine(u, v)
        return 'x=%.3f, value=%.3f' % (a, b)
    return re.sub(r'\{r:([0-9.]+),([0-9.]+)\}', rep, note)

MC_CAL = 0.002   # rms of interior vertical grid-line mean residuals, rounded up
CD_CAL = 0.001
rows = []; detail = []
for (k, series, crossed, (u, v), (sx, sy), how, alts, flag, note) in P:
    mc, cd = affine(u, v)
    mcl, cdl = local(u, v)
    ex = math.sqrt((sx * A[1]) ** 2 + MC_CAL ** 2 + (mcl - mc) ** 2)
    ey = math.sqrt((sy * Bc[2]) ** 2 + CD_CAL ** 2 + (cdl - cd) ** 2)
    ex = math.ceil(ex * 1000) / 1000; ey = math.ceil(ey * 1000) / 1000
    uo, vo = to_original(u, v)
    alt_txt = []
    for lab, au, av in alts:
        if au is None:
            alt_txt.append('crossed=no with the same x and value')
        else:
            amc, acd = affine(au, av)
            alt_txt.append('x=%.3f value=%.3f (%s)' % (amc, acd, lab))
    nt = 'symbol %d; centre: %s; px in the 300 ppi page image (3094 x 2364 px, PDF page 33 in its displayed orientation). ' % (k, how) + fill(note)
    rows.append({'series': series, 'crossed': crossed, 'x': '%.3f' % mc, 'x_quantity': 'Crossflow Mach number', 'x_err': '%.3f' % ex,
                 'value': '%.3f' % cd, 'value_quantity': 'Drag coefficient, C_D', 'value_err': '%.3f' % ey,
                 'px': '(%.1f, %.1f)' % (uo, vo), 'alternatives': '; '.join(alt_txt), 'flag': flag, 'page': '33', 'note': nt})
    detail.append(dict(id=k, u_dejog=u, v_dejog=v, u_page=uo, v_page=vo, mc=mc, cd=cd, mc_local=mcl, cd_local=cdl, x_err=ex, value_err=ey))
    print('%2d %-3s x %.4f (local %.4f) +- %.3f | CD %.4f (local %.4f) +- %.3f | px (%.1f, %.1f) | %s %s' % (k, crossed, mc, mcl, ex, cd, cdl, ey, uo, vo, flag, '; '.join(alt_txt)))
rows.sort(key=lambda r: float(r['x']))
with open(sys.argv[3], 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['series', 'crossed', 'x', 'x_quantity', 'x_err', 'value', 'value_quantity', 'value_err', 'px', 'alternatives', 'flag', 'page', 'note'])
    w.writeheader(); w.writerows(rows)
json.dump(detail, open(sys.argv[4], 'w'), indent=1)
