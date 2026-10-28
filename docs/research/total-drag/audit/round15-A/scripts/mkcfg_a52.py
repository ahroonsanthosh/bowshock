# Build a tracker config for one A52E01 fig. 8 panel.
# usage: python3 -I mkcfg_a52.py S panel img curves.json
import sys, json
S, panel, img, cj = sys.argv[1:5]
cur = json.load(open(cj))
z = __import__('numpy').load(S + '/work/%s_comp.npz' % panel)
x0, y0, x1, y1 = [int(v) for v in z['box']]
targets = [round(0.5 * i, 2) for i in range(1, 33)]
cfg = {'img': S + '/renders/%s.png' % img, 'cal': S + '/work/%s_cal.json' % panel,
       'comp': S + '/work/%s_comp.npz' % panel, 'orient': 'v', 'scan': [x0 + 2, x1 - 3],
       'grid_iso': [float(v) for v in range(0, 17, 2)], 'grid_halfband_px': 7,
       'min_run_px': 4, 'place_px': 3.0, 'drop_touching': True, 'touch_minw': cur.get('touch_minw', 9), 'end_T': 128,
       'exclude_comps': cur.get('exclude', []),
       'trace_out': S + '/work/%s_trace.json' % panel, 'rows_out': S + '/work/%s_rows.json' % panel,
       'targets': cur.get('targets', targets), 'curves': cur['curves']}
json.dump(cfg, open(S + '/work/%s_cfg.json' % panel, 'w'), indent=1)
