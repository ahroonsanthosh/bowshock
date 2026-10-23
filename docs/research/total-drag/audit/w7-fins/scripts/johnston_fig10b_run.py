"""Johnston (NASA Memo 4-30-59L) fig. 10(b): placements to values. Usage:
python3 -I johnston_fig10b_run.py <page.png> <audit dir> <work dir>
<page.png>: PDF p. 33 at 300 dpi (pdftoppm -r 300 -f 33 -l 33), 2542 by 3300.
Reads johnston_fig10b_rough.csv and johnston_fig10b_grid.json from <audit
dir>; refines the circles, squares and diamonds with symrefine.py (the
triangles are placed by eye, kind 'manual'); calibrates with calib.py; writes
johnston_fig10b_first.csv to <audit dir> and an overlay to <work dir>.
Every refined centre was checked on the overlay and at 6x; where a fit
scored under 0.85 or fitted a neighbour in a cluster, the symbol was placed
by eye at 6x instead (kind 'eye' in the rough file, with its own error).
Errors: the placement (place_px; for refined symbols at least the refined
centre's shift from the eye placement, capped at 2 px), 0.5 px of
grid trace, and for triangles 4 px more in Cp (bounding-box centre against
centroid, h/6 of a 25 px symbol) and for the right triangles 4 px more in M
(s/3), in quadrature."""
import csv
import json
import os
import subprocess
import sys

page, audit, work = sys.argv[1:4]
here = os.path.dirname(os.path.abspath(__file__))
grid = json.load(open(os.path.join(audit, 'johnston_fig10b_grid.json')))
kinds = {'circle': 12, 'square': 12, 'diamond': 16,
         'grid_x': [p for _, p in grid['x']], 'grid_y': [p for _, p in grid['y']]}
kj = os.path.join(work, 'kinds.json')
json.dump(kinds, open(kj, 'w'))
ref = os.path.join(work, 'f10b_ref.csv')
subprocess.run([sys.executable, '-I', os.path.join(here, 'symrefine.py'), page,
                os.path.join(audit, 'johnston_fig10b_rough.csv'), kj, ref,
                os.path.join(work, 'overlay_f10b.png'), '650', '950', '1950', '2400', '2'], check=True)
rows = list(csv.DictReader(open(ref)))
fit = os.path.join(work, 'f10b_fit.csv')
with open(fit, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) + ['rx', 'ry'])
    w.writeheader()
    for r in rows:
        r['rx'], r['ry'] = r['x'], r['y']
        r['x'], r['y'] = r['fx'], r['fy']
        w.writerow(r)
cal = os.path.join(work, 'f10b_cal.csv')
subprocess.run([sys.executable, '-I', os.path.join(here, 'calib.py'), page,
                os.path.join(audit, 'johnston_fig10b_grid.json'), fit, cal], check=True)
out = list(csv.DictReader(open(cal)))
with open(os.path.join(audit, 'johnston_fig10b_first.csv'), 'w', newline='') as f:
    f.write('# Johnston, NASA Memo 4-30-59L (NTRS 19980228287, sha256 f6af115c...497054c3), fig. 10(b), PDF p. 33: base\n')
    f.write('# pressure coefficient C_p,b of the 20% sharp single wedge against M, alpha 0 to 8 deg. FIRST reading (0019\n')
    f.write('# reader, W7), 2026-10-23. Method: method_johnston_figs4_12.md. px: page pixels at 300 dpi.\n')
    wr = csv.writer(f)
    wr.writerow(['id', 'alpha_deg', 'symbol', 'px_x', 'px_y', 'mach', 'cpb', 'mach_err', 'cpb_err', 'note'])
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
