"""Markdown tables of the grid-line calibration for method.md.
usage: python -I calib_tables.py calib.json"""
import sys, json
import numpy as np
c = json.load(open(sys.argv[1]))
X = c['crossings']
print('| Axis | Value | Labelled | Fitted line (page px) | Angle (deg) | Line sd (px) | Samples used | Traced span (px) | Position at mid-span (px) | Mean residual of the fit at this line |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for L in c['lines']:
    if L['axis'] == 'M':
        eq = 'y = %.2f %+.5f x' % (L['a'], L['b'])
        pos = 'y = %.2f at x = %.0f' % (L['mid_pos'], L['mid_along'])
        rs = [x['rM'] for x in X if x['M'] == L['value']]
        unit = 'M'
    else:
        eq = 'x = %.2f %+.5f y' % (L['a'], L['b'])
        pos = 'x = %.2f at y = %.0f' % (L['mid_pos'], L['mid_along'])
        rs = [x['rCD'] for x in X if x['CD'] == L['value']]
        unit = 'CD'
    name = 'Crossflow Mach number' if L['axis'] == 'M' else 'Drag coefficient'
    print('| %s | %s | %s | %s%s | %+.3f | %.2f | %d of %d | %.0f to %.0f | %s | %+.4f in %s (%d crossings) |' % (
        name, ('%.2f' % L['value']).rstrip('0').rstrip('.') if L['value'] else '0', 'yes' if L['labelled'] else 'no', eq,
        ' (slope fixed)' if L['fixed_slope'] else '', L['angle_deg'], L['sd_px'], L['n_used'], L['n_samples'],
        L['along_min'], L['along_max'], pos, np.mean(rs), unit, len(rs)))
print()
print('| M | CD | px | py | residual M | residual CD |')
print('| --- | --- | --- | --- | --- | --- |')
for x in X:
    if x['labelled']:
        print('| %.0f | %.1f | %.2f | %.2f | %+.4f | %+.4f |' % (x['M'], x['CD'], x['px'], x['py'], x['rM'], x['rCD']))
s = c['stats']; a = c['affine']
print()
print('M  = %.6f %+.9f px %+.9f py' % tuple(a['M']))
print('CD = %.6f %+.9f px %+.9f py' % tuple(a['CD']))
print(s)
