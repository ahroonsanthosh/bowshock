# usage: python3 -I emitfit.py <spec.json> <out.csv> [append]
# spec: {"res": [res.json...], "cal": {"prefix": cal.out.json}, "source", "item": {"prefix": item}, "page",
#  "x_quantity", "y_quantity", "mach": {"prefix": M}, "series": {"c": ...}, "meridian": {"c": ...},
#  "configuration": "...", "note": "...", "covmin": 0.9, "near": 25, "xdec": 4, "ydec": 4,
#  "override": {id: {flag, alternatives, note, skip, y, x}}, "station": {"key": station label}}
# Rows: coverage >= covmin -> value; flag 'ambiguous' if another fitted symbol of the same group lies within
# 'near' px, else 'ok'; coverage < covmin -> illegible, value empty. Reading error from fit coverage.
import sys, json, csv, math, os
S = json.load(open(sys.argv[1])); outcsv = sys.argv[2]; app = len(sys.argv) > 3
R = []
for rf in S['res']: R += json.load(open(rf))
cals = {k: json.load(open(v)) for k, v in S['cal'].items()}
def pick(d, i):
    for k in sorted(d, key=len, reverse=True):
        if i.startswith(k): return d[k]
rows = []
for r in R:
    i = r['id']; ov = S.get('override', {}).get(i, {})
    if ov.get('skip'): continue
    cal = pick(cals, i); grp = i.rsplit('_', 1)[0]
    others = [q for q in R if q['id'] != i and q['id'].rsplit('_', 1)[0] == grp and q.get('coverage', 1) >= S.get('covmin', 0.9)]
    near = any(math.hypot(q['px'] - r['px'], q['py'] - r['py']) < S.get('near', 25) for q in others)
    cov = r.get('coverage', float('nan'))
    good = (cov >= S.get('covmin', 0.9)) or ov.get('force')
    ep = 1.0 if cov >= 0.98 else 1.5 if cov >= 0.9 else 2.5
    if near: ep = max(ep, 2.0)
    ex = math.hypot(cal['sx'] * ep, cal['rms_x']); ey = math.hypot(cal['sy'] * ep, cal['rms_y'])
    flag = ov.get('flag', ('ambiguous' if near else 'ok') if good else 'illegible')
    xd, yd = S.get('xdec', 4), S.get('ydec', 4)
    x = ov.get('x', f"{r['X']:.{xd}f}") if good else ov.get('x', S.get('station', {}).get(grp, ''))
    y = ov.get('y', f"{r['Y']:.{yd}f}") if good and flag != 'illegible' else ''
    note = S.get('note', '')
    if near and good: note += '; overlaps other symbols at this station'
    if not good: note += f'; symbol not found as a separate outline (best outline fit coverage {cov:.2f}); x given is the nominal station, not a reading'
    if ov.get('note'): note = ov['note'] + '; ' + note
    note += f"; px=({r['px']:.1f},{r['py']:.1f}) at 300 dpi; outline fit coverage {cov:.2f}" + (f"; reading error 1-sigma x {ex:.2g}, y {ey:.2g}" if good else '')
    rows.append([S['source'], pick(S['item'], i), S['series'][r['s']], ov.get('configuration', S.get('configuration', '')), pick(S['mach'], i),
                 S.get('meridian', {}).get(r['s'], ''), x, S['x_quantity'], y, S['y_quantity'], ov.get('alternatives', ''), flag, S['page'], note.strip('; ')])
new = not (app and os.path.exists(outcsv))
with open(outcsv, 'a' if app else 'w', newline='') as f:
    w = csv.writer(f)
    if new: w.writerow(['source', 'item', 'series', 'configuration', 'mach', 'meridian', 'x', 'x_quantity', 'y', 'y_quantity', 'alternatives', 'flag', 'page', 'note'])
    w.writerows(rows)
import collections
print(outcsv, len(rows), collections.Counter(r[11] for r in rows))
