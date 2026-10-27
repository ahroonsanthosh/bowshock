# usage: python3 -I emit.py <emit.json> <out.csv> [append]
# emit.json: {"res": "<match .res.json>" or list of them, "cal": "<cal.out.json>",
#   "source":..., "item":..., "page":..., "x_quantity":..., "y_quantity":..., "xdec":4, "ydec":4,
#   "default": {series, configuration, mach, meridian, flag, alternatives, note},
#   "points": {id: {overrides..., "err_px": optional, "skip": bool}}}
# Writes one CSV row per point in the match results (in the order of 'order' if given). Each note gets the
# pixel centre, template score and the reading error (1 sigma, data units): centre uncertainty in px
# (from err_px, else from the match score) times the local scale, combined in quadrature with the
# calibration's rms intersection residual.
import sys, json, csv, math, os
E = json.load(open(sys.argv[1])); outcsv = sys.argv[2]; app = len(sys.argv) > 3 and sys.argv[3] == 'append'
cal = json.load(open(E['cal']))
res = []
for r in (E['res'] if isinstance(E['res'], list) else [E['res']]): res += json.load(open(r))
byid = {r['id']: r for r in res}
order = E.get('order', [r['id'] for r in res])
cols = ['source', 'item', 'series', 'configuration', 'mach', 'meridian', 'x', 'x_quantity', 'y', 'y_quantity', 'alternatives', 'flag', 'page', 'note']
new = not (app and os.path.exists(outcsv))
f = open(outcsv, 'a' if app else 'w', newline='')
w = csv.writer(f)
if new: w.writerow(cols)
xlog = cal['spec'].get('xscale') == 'log'; ylog = cal['spec'].get('yscale') == 'log'
for pid in order:
    r = byid[pid]; meta = dict(E.get('default', {})); meta.update(E['points'].get(pid, {}))
    if meta.get('skip'): continue
    s = r.get('score', float('nan'))
    if 'err_px' in meta: ep = meta['err_px']
    elif s != s: ep = 2.0
    elif s >= 0.9: ep = 0.7
    elif s >= 0.75: ep = 1.0
    elif s >= 0.6: ep = 1.5
    else: ep = 2.0
    ex = math.hypot(cal['sx'] * ep, cal['rms_x']); ey = math.hypot(cal['sy'] * ep, cal['rms_y'])
    X, Y = r['X'], r['Y']
    if xlog: ex = X * math.log(10) * ex
    if ylog: ey = Y * math.log(10) * ey
    xd = E.get('xdec', 4); yd = E.get('ydec', 4)
    xs = meta.get('x_override', f"{X:.{xd}f}"); ys = '' if meta.get('flag') == 'illegible' else meta.get('y_override', f"{Y:.{yd}f}")
    how = ("centre set by hand from the symbol's stroke extremes (no fit)" if s != s else
           (f"outline fit to strokes, coverage {s:.2f}" if 'coverage' in r else f"template match score {s:.2f}"))
    note = f"px=({r['px']:.1f},{r['py']:.1f}) at {cal['spec'].get('dpi', 300)} dpi; {how}; reading error 1-sigma x {ex:.2g}, y {ey:.2g}"
    if meta.get('note'): note = meta['note'] + '; ' + note
    w.writerow([E['source'], meta.get('item', E['item']), meta.get('series', ''), meta.get('configuration', ''), meta.get('mach', ''),
                meta.get('meridian', ''), xs, meta.get('x_quantity', E['x_quantity']), ys, meta.get('y_quantity', E['y_quantity']),
                meta.get('alternatives', ''), meta.get('flag', 'ok'), meta.get('page', E['page']), note])
f.close()
print('wrote', outcsv)
