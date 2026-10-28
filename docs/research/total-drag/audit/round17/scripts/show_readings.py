"""Print the readings of a trace result compactly.

usage: python3 -I show_readings.py TRACE.json [curve_name]
"""
import sys
import json

res = json.load(open(sys.argv[1]))
only = sys.argv[2] if len(sys.argv) > 2 else None
for c in res['curves']:
    if only and c['name'] != only:
        continue
    print('==', c['name'], 'start', ['%.4f' % v for v in c['start_plot']], 'end', ['%.4f' % v for v in c['end_plot']])
    for r in c['readings']:
        if 'px' not in r:
            print('   NONE', r)
            continue
        extra = ''
        if r['mode'] == 'grid_crossing':
            extra = 'above %.1f below %.1f' % (r['x_above'], r['x_below'])
        elif r['mode'] == 'merged_line':
            extra = '%s run %s line %s +-%.1fpx' % (r['how'], r['merged_run'], r['line'], r['half_bound_px'])
        elif r['mode'] == 'nearest_ink':
            extra = 'offset %+.1f rows, run %d' % (r['offset_rows'], r['runlen'])
        elif r['mode'] in ('row', 'column', 'zero_line') or r['mode'].startswith('turning'):
            extra = 'run %d' % r['runlen']
        at = r['alpha_target'] if r['alpha_target'] is not None else float('nan')
        print('   a=%5.2f  %-16s px=(%.1f,%.1f)  x=%+.4f y=%.3f  %s' % (at, r['mode'], r['px'][0], r['px'][1], r['x'], r['y'], extra))
