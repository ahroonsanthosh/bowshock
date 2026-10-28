"""Build tn3861_fig17.csv from the outline fits and the reader's decisions.
usage: python -I build_csv.py calib.json fit.json out.csv fit_pass1.json
The decision table below records, for each symbol: which fit to use, series as the
legend prints it, crossed or not, centring uncertainty in page px, flag, and notes.
Reading errors: err = sqrt((delta_px*scale)^2 + cal^2), with scale = axis units per
page px from the affine fit, cal = 0.004 (M) and 0.0012 (CD), rounded up to 0.001."""
import sys, json, csv, math
import numpy as np
cal = json.load(open(sys.argv[1])); fits = {f['id']: f for f in json.load(open(sys.argv[2]))}
fits.update({f['id'] + '_p1': f for f in json.load(open(sys.argv[4]))})
cM = np.array(cal['affine']['M']); cC = np.array(cal['affine']['CD'])
kM = math.hypot(cM[1], cM[2]); kC = math.hypot(cC[1], cC[2])
FORCE = 'Present data from force tests M = 6.86'
PRESS = 'Present data from pressure distribution'
GP = 'Gowen and Perkins, from pressure distribution, M = 1.49 to 2.9, ref. 8'
LU = 'Lord and Ulmann, from pressure distribution, M = 4.04 (unpublished)'
BU = 'Busemann, ref. 10'
WL = 'Walter and Lange, from pressure distribution M = 2.48 to 4.92 ref. 9'
XQ = 'Crossflow Mach number'
VQ = 'Drag coefficient, C_D'
def fmt(f, kind):
    if kind == 'ref':
        M, C = f['ref_fig']
    elif kind == 'centroid':
        M, C = f['centroid_fig']
    elif kind == 'cross':
        M, C = f['cross_fig']
    return 'x=%.3f value=%.3f' % (M, C)
D = [
 # id, fit, series, crossed, delta_px, flag, alternatives(list of (label, fit, kind) or str), note
 ('S01', 'S01', LU, 'yes', 1.0, 'ok', [],
  'Quarter-circle symbol with cross. Centre = area centroid of the fitted outline. Cross arms intersect at {cross} (about 0.5 px from the centroid). Centre of the bounding square would be {ref}, not used because the cross marks the centroid.'),
 ('S02', 'S02', LU, 'yes', 1.5, 'ok', [],
  'Quarter-circle symbol with cross. M = 1 grid line runs through its left part. Centre = area centroid. Cross arms intersect at {cross}. Bounding-square centre would be {ref}, not used.'),
 ('S03', 'S03', LU, 'yes', 1.5, 'ok', [],
  'Quarter-circle symbol with cross. Centre = area centroid. Cross arms intersect at {cross}. Bounding-square centre would be {ref}, not used.'),
 ('S04', 'S04', GP, 'no', 1.5, 'ambiguous', [('centre of bounding square (midpoint of hypotenuse)', 'S04', 'ref')],
  'Right-triangle symbol, no cross: the M = 1.5 and CD = 1.5 grid lines cross it about 4 px from its centroid and no stroke passes through the centroid. A solid line (the one ending inside the Busemann symbol) crosses its top corner and runs along part of its hypotenuse. Centre = area centroid (the convention a pencil dot supports in the triangle at x 2.911). Ambiguous only in the centre convention.'),
 ('S05', 'S05', BU, 'no', 1.5, 'ok', [],
  'D-shaped symbol (flat bottom, round top), no cross. Centre = area centroid of the outline. Centre of the round top (bounding-square centre) would be {ref}. A solid line from lower left ends inside the symbol about 3 px below the round-top centre. The line is not read.'),
 ('S06', 'S06', FORCE, 'yes', 1.0, 'ok', [],
  'Circle with cross. Outline-fit centre. Cross arms intersect at {cross}.'),
 ('S07', 'S07', PRESS, 'yes', 1.0, 'ok', [],
  'Square with cross. Outline-fit centre. Cross arms intersect at {cross}.'),
 ('S08', 'S08', LU, 'yes', 2.0, 'ambiguous', [('centre of bounding square', 'S08', 'ref')],
  'Quarter-circle symbol overlapping the triangle below it (they share the corner region) and touched by the upper solid curve. Horizontal cross arm clearly visible inside the outline, about 1 px above the centroid. Vertical arm not separable: it would lie on the M = 2 grid line, about 2 px right of the centroid. Right edge drawn faint. Centre = area centroid.'),
 ('S09', 'S09', GP, 'no', 2.5, 'ambiguous', [('centre of bounding square (midpoint of hypotenuse)', 'S09', 'ref'), ('area centroid again but with the triangle size fixed at 32 px like the other triangles', 'S09f', 'centroid')],
  'Right-triangle symbol, no cross. Its top corner touches the quarter-circle above. Its right side lies on the M = 2 grid line, so the size comes from the bottom side and hypotenuse only (fitted 29 px, smaller than the other triangles). A faint pencil mark lies 4 px from the centroid. Centre = area centroid.'),
 ('S10', 'S10', WL, 'no', 1.5, 'ambiguous', ['series: a dotted diamond the legend does not explain (see x 3.247 and 4.191)'],
  'Diamond. The lower solid curve and the M = 2.5 grid line pass through it. A small dark bump on the curve near the centre may be a dot like those in the diamonds at x 3.247 and 4.191 (hidden by the curve). A short stroke about 4 px long extends below the bottom corner. Neither mark is in the legend. Outline-fit centre.'),
 ('S11', 'S11', WL, 'no', 2.0, 'ambiguous', [('free-size fit to all four sides', 'S11_p1', 'ref')],
  'Diamond overlapped on its upper right side by the triangle at x 2.911. Centre fitted to the three free sides with the size fixed at the other diamonds size (41.6 px corner to corner). A free-size fit to all four sides gives the same reading within 0.5 px. Whether it carries a dot cannot be seen.'),
 ('S12', 'S12', GP, 'no', 1.5, 'ambiguous', [('centre of bounding square (midpoint of hypotenuse)', 'S12', 'ref')],
  'Right-triangle symbol, no cross. Its lower left corner lies inside the diamond at x 2.838. A faint pencil dot inside it sits within 0.5 px of the area centroid, which is the centre used.'),
 ('S13', 'S13', WL, 'no', 1.0, 'ambiguous', ['series: a dotted diamond the legend does not explain'],
  'Diamond with a solid inked dot inside (dot centre 1.2 px above the outline centre). The legend diamond has no dot. Read as Walter and Lange. Lower corner touches the lower solid curve. Outline-fit centre.'),
 ('S14', 'S14', FORCE, 'yes', 1.0, 'ok', [],
  'Circle with cross. The M = 3.5 grid line touches its right side. Outline-fit centre. Cross arms intersect at {cross}.'),
 ('S15', 'S15', PRESS, 'yes', 1.5, 'ok', [],
  'Square with cross. Vertical cross arm clearly visible. Horizontal arm merges with the lower solid curve. Right side lies on the M = 3.5 grid line and the top side is faint, so the size is fixed at 29 px (free fit gives x 3.453, value 1.254).'),
 ('S16', 'S16', WL, 'no', 1.0, 'ambiguous', ['series: a dotted diamond the legend does not explain'],
  'Diamond with a solid inked dot inside (dot 2.5 px above and 1 px left of the outline centre). The legend diamond has no dot. Read as Walter and Lange. Lower corner touches the CD = 1.25 grid line and the lower curve. Outline-fit centre.'),
 ('S17', 'S17', FORCE, 'yes', 1.0, 'ok', [],
  'Circle with cross. Its bottom touches the square below. Outline-fit centre. Cross arms intersect at {cross}.'),
 ('S18', 'S18', PRESS, 'yes', 1.0, 'ok', [],
  'Square with cross, drawn on top of the diamond at x 4.925 (its own outline is complete). Outline-fit centre. Cross arms intersect at {cross}.'),
 ('S19', 'S19', WL, 'no', 3.0, 'ambiguous', [('free-size fit to all sides', 'S19_p1', 'ref')],
  'Diamond whose left half is hidden behind the square at x 4.856. Only its top, right and bottom corners show. Centre from the two right-hand sides only, with the size fixed at the other diamonds size. A free-size fit to all sides gives the same reading within 0.5 px. Its right corner touches the M = 5 grid line. Whether it carries a dot cannot be seen.'),
 ('S20', 'S20', FORCE, 'yes', 1.5, 'ok', [],
  'Circle with cross. The M = 6 grid line runs through its right part. Its lower part overlaps the square below. Outline-fit centre. Cross arms intersect at {cross}.'),
 ('S21', 'S21', PRESS, 'yes', 2.0, 'ambiguous', [('free-size fit to the same sides', 'S21v', 'centroid')],
  'Square with cross, its top side hidden inside the circle above. Centre from the bottom and the lower parts of the sides, size fixed at 29 px. Vertical cross arm visible. Horizontal arm would lie on the CD = 1.25 grid line.'),
 ('S22', 'S22', FORCE, 'yes', 1.0, 'ok', [],
  'Circle with cross. Its lower part overlaps the square below. Outline-fit centre. Cross arms intersect at {cross}.'),
 ('S23', 'S23', PRESS, 'yes', 2.0, 'ambiguous', ['x=6.656 value=1.233 (vertical cross stroke taken as the centre line in x)'],
  'Square with its top side hidden inside the circle above. Centre from the bottom and the lower parts of the sides, size fixed at 29 px. A heavy vertical stroke inside (its own, 5 px right of the circle cross arm and about 2 px right of the square centre) is read as the cross. Horizontal arm would lie on the lower solid curve. Uncrossed was considered and rejected because the stroke belongs to the square, not to the circle.'),
 ('S24', 'S24', FORCE, 'no', 1.0, 'ok', [],
  'Circle, no cross. A horizontal stroke crosses its inside about 4 px above the centre, ending at the circle edges. It is read as the top side of the square below (it makes that square 30 px tall) or the end of the upper solid curve, which arrives at the circle edge at the centre height. A faint grey smudge near the centre. Outline-fit centre.'),
 ('S25', 'S25f', PRESS, 'no', 1.5, 'ambiguous', [('fit taking the stroke inside the circle as the top side', 'S25', 'centroid')],
  'Square, no cross, overlapping the circle above it. Centre from the bottom and the lower parts of the sides, size fixed at 29 px. Taking the stroke inside the circle as its top side gives nearly the same centre.'),
]
rows = []
for sid, fid, series, crossed, dpx, flag, alts, note in D:
    f = fits[fid]
    M, C = f['centroid_fig']
    x, y = f['centroid_px']
    xe = math.ceil(math.hypot(dpx*kM, 0.004)*1000 - 1e-9)/1000
    ve = math.ceil(math.hypot(dpx*kC, 0.0012)*1000 - 1e-9)/1000
    alt_s = []
    for a in alts:
        if isinstance(a, str):
            alt_s.append(a)
        else:
            label, af, kind = a
            alt_s.append('%s (%s)' % (fmt(fits[af], kind), label))
    subs = {}
    if 'cross_fig' in f:
        subs['cross'] = 'x %.3f, value %.3f' % tuple(f['cross_fig'])
    subs['ref'] = 'x %.3f, value %.3f' % tuple(f['ref_fig'])
    n = note.replace('{cross}', subs.get('cross', '?')).replace('{ref}', subs['ref'])
    n = '%s. %s px is in the 300 dpi page image (2364 x 3094, origin top left, x right, y down).' % (sid, n)
    rows.append(dict(series=series, crossed=crossed, x='%.3f' % M, x_quantity=XQ, x_err='%.3f' % xe,
                     value='%.3f' % C, value_quantity=VQ, value_err='%.3f' % ve,
                     px='%.1f,%.1f' % (x, y), alternatives='; '.join(alt_s), flag=flag, page='33', note=n))
rows.sort(key=lambda r: float(r['x']))
cols = ['series', 'crossed', 'x', 'x_quantity', 'x_err', 'value', 'value_quantity', 'value_err', 'px',
        'alternatives', 'flag', 'page', 'note']
with open(sys.argv[3], 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=cols); w.writeheader(); w.writerows(rows)
for r in rows:
    print(r['note'][:4], r['series'][:22].ljust(22), r['crossed'].ljust(3), r['x'], r['x_err'], r['value'], r['value_err'], r['flag'], '|', r['alternatives'])
