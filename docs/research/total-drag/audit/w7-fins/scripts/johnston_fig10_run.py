"""Johnston (NASA Memo 4-30-59L) fig. 10(a), (b) or (c): placements to
values. Usage:
python3 -I johnston_fig10_run.py <a|b|c> <page.png> <audit dir> <work dir>
<page.png>: the panel's PDF page at 300 dpi (pdftoppm -r 300; p. 32 for (a),
33 for (b), 34 for (c)), 2542 by 3300. Reads johnston_fig10<p>_rough.csv
and johnston_fig10<p>_grid.json from <audit dir>; refines the symbols of
kinds circle, square, diamond, triangle and rtri with symrefine.py (kinds
'manual' and 'eye' are placed by eye and kept); calibrates with calib.py;
writes johnston_fig10<p>_first.csv to <audit dir> and an overlay to <work
dir>. Every refined centre was checked on the overlay (and in clusters at
6x); where a fit scored low or fitted a neighbour, the symbol was placed by
eye at 6x instead (kind 'eye', with its own error).
Errors: the placement (place_px; for refined symbols at least the refined
centre's shift from the eye placement, capped at 2 px), 0.5 px of grid
trace, and for triangles 4 px more in the ordinate (bounding-box centre
against centroid, h/6 of a 25 px symbol) and for the right triangles 4 px
more in M (s/3), in quadrature."""
import csv
import json
import os
import subprocess
import sys

panel, page, audit, work = sys.argv[1:5]
NAME = {'a': ('c_d,f', 'section forebody drag coefficient', 32),
        'b': ('C_p,b', 'base pressure coefficient', 33),
        'c': ('c_d,t', 'section total pressure drag coefficient', 34)}[panel]
here = os.path.dirname(os.path.abspath(__file__))
gfile = os.path.join(audit, f'johnston_fig10{panel}_grid.json')
grid = json.load(open(gfile))
kinds = {'circle': 12, 'square': 12, 'diamond': 16, 'triangle': 12, 'rtri': 12,
         'grid_x': [p for _, p in grid['x']], 'grid_y': [p for _, p in grid['y']]}
kj = os.path.join(work, f'kinds10{panel}.json')
json.dump(kinds, open(kj, 'w'))
ref = os.path.join(work, f'f10{panel}_ref.csv')
subprocess.run([sys.executable, '-I', os.path.join(here, 'symrefine.py'), page,
                os.path.join(audit, f'johnston_fig10{panel}_rough.csv'), kj, ref,
                os.path.join(work, f'overlay_f10{panel}.png'), '650', '350', '2150', '2400', '2'], check=True)
rows = list(csv.DictReader(open(ref)))
fit = os.path.join(work, f'f10{panel}_fit.csv')
with open(fit, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) + ['rx', 'ry'])
    w.writeheader()
    for r in rows:
        r['rx'], r['ry'] = r['x'], r['y']
        r['x'], r['y'] = r['fx'], r['fy']
        w.writerow(r)
cal = os.path.join(work, f'f10{panel}_cal.csv')
subprocess.run([sys.executable, '-I', os.path.join(here, 'calib.py'), page, gfile, fit, cal], check=True)
out = list(csv.DictReader(open(cal)))
with open(os.path.join(audit, f'johnston_fig10{panel}_first.csv'), 'w', newline='') as f:
    f.write(f'# Johnston, NASA Memo 4-30-59L (NTRS 19980228287, sha256 f6af115c...497054c3), fig. 10({panel}), PDF p. {NAME[2]}:\n')
    f.write(f'# {NAME[1]} {NAME[0]} of the 20% sharp single wedge against M, alpha 0 to 8 deg. FIRST reading (0019\n')
    f.write('# reader, W7), 2026-10-23. Method: method_johnston_figs4_12.md. px: page pixels at 300 dpi.\n')
    wr = csv.writer(f)
    yname = {'a': 'cdf', 'b': 'cpb', 'c': 'cdt'}[panel]
    wr.writerow(['id', 'alpha_deg', 'symbol', 'px_x', 'px_y', 'mach', yname, 'mach_err', yname + '_err', 'note'])
    for r in out:
        e = float(r['place_px'])
        if r['kind'] not in ('manual', 'eye'):
            e = max(e, min(float(r['shift']), 2.0))
        ex = (e * e + 0.25 + (16.0 if r['alpha'].startswith('8') or r['alpha'].endswith('?') else 0.0)) ** 0.5
        ey = (e * e + 0.25 + (16.0 if r['alpha'][0] in '68' else 0.0)) ** 0.5
        sym = {'0': 'circle', '2': 'square', '4': 'diamond', '6': 'triangle', '8': 'right triangle'}[r['alpha'][0]]
        if r['alpha'].endswith('?'):
            sym = 'triangle (kind uncertain)'
        wr.writerow([r['id'], r['alpha'], sym, r['x'], r['y'], f"{float(r['x_value']):.4f}",
                     f"{float(r['y_value']):.4f}", f"{ex / float(r['x_px_per_unit']):.4f}",
                     f"{ey / float(r['y_px_per_unit']):.4f}", r['note']])
