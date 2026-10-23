"""R&M 3323 fig. 4: placements to values, and the first-reading CSV.
Usage: python3 -I rm3323_fig4_run.py <panel images dir> <audit dir>
<panel images dir> holds f4A.png to f4D.png, the 300 dpi page (pdftoppm -r
300 -f 23 -l 23) cropped at (700, 380, 1240, 1160), (1340, 380, 1890, 1160),
(700, 1720, 1250, 2500) and (1350, 1720, 1900, 2500) for M 0.6, 0.8, 1.0
and 1.2. Reads rm3323_fig4_place.csv and rm3323_fig4{A..D}_grid.json from
<audit dir>, runs calib.py's calibration (each grid line traced along its
length) on each panel, and writes rm3323_fig4_first.csv there.

A centre is the centre of the symbol's body's bounding box (flags left
out). Errors per row: the placement (place_px), 0.5 px of grid trace, and
for triangles 2 px more in Cp_b (the bounding-box centre against the
centroid, h/6 of a 12 px symbol), in quadrature, over the local scale."""
import csv
import json
import os
import subprocess
import sys

imgdir, audit = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
MACH = {'A': 0.6, 'B': 0.8, 'C': 1.0, 'D': 1.2}
REF = {'31': 'RM L8B13', '32': 'RM A51J11', '33': 'RM A52E01', '34': 'TN 3548', '35': 'R&M 3348',
       '38': 'R&M 3427', '39': 'Pearcey (unpublished)', '40': 'Holder, Pearcey and Nash (RAeS 1962)',
       '41': 'TN D-1056 (X-15)', '35?': 'uncertain (see method)'}
rows = list(csv.DictReader(open(os.path.join(audit, 'rm3323_fig4_place.csv'))))
out = []
for p in 'ABCD':
    sub = [r for r in rows if r['panel'] == p]
    tmp_in = os.path.join(imgdir, f'_f4{p}_in.csv')
    tmp_out = os.path.join(imgdir, f'_f4{p}_cal.csv')
    with open(tmp_in, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(sub[0].keys()))
        w.writeheader()
        w.writerows(sub)
    subprocess.run([sys.executable, '-I', os.path.join(here, 'calib.py'), os.path.join(imgdir, f'f4{p}.png'),
                    os.path.join(audit, f'rm3323_fig4{p}_grid.json'), tmp_in, tmp_out], check=True)
    out += list(csv.DictReader(open(tmp_out)))
with open(os.path.join(audit, 'rm3323_fig4_first.csv'), 'w', newline='') as f:
    f.write('# ARC R&M 3323 (AERADE 1826.2/3903, sha256 2f1976e9...38933c3a), fig. 4, PDF p. 23: Cp_b against h/c (%), zero\n')
    f.write('# incidence, at M 0.6, 0.8, 1.0, 1.2. FIRST reading (0019 reader, W7), 2026-10-23. ref: the report\'s reference\n')
    f.write('# number (method_rm3323_figs4_5.md section 1); flag 1: a flagged symbol (roughness band), ?: uncertain. err: placement,\n')
    f.write('# grid trace and, for triangles, the centre\'s definition. px in the panel crop (see scripts/rm3323_fig4_run.py).\n')
    w = csv.writer(f)
    w.writerow(['id', 'mach', 'ref', 'source', 'symbol', 'flag', 'px_x', 'px_y', 'h_over_c_pct', 'cpb',
                'h_over_c_err', 'cpb_err', 'note'])
    for r in out:
        e = float(r['place_px'])
        ex = (e * e + 0.25) ** 0.5
        ey = (e * e + 0.25 + (4.0 if r['kind'].startswith('tri') else 0.0)) ** 0.5
        w.writerow([r['id'], MACH[r['panel']], r['ref'], REF[r['ref']], r['kind'], r['flag'], r['x'], r['y'],
                    f"{float(r['x_value']):.3f}", f"{float(r['y_value']):.4f}",
                    f"{ex / float(r['x_px_per_unit']):.3f}", f"{ey / float(r['y_px_per_unit']):.4f}", r['note']])

# Overlays for checking by eye: each placement as a red cross and its id, at 3x, into <panel images dir>.
from PIL import Image, ImageDraw  # noqa: E402

for p in 'ABCD':
    im = Image.open(os.path.join(imgdir, f'f4{p}.png')).convert('RGB')
    im = im.resize((im.size[0] * 3, im.size[1] * 3), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for r in rows:
        if r['panel'] != p:
            continue
        X, Y = float(r['x']) * 3, float(r['y']) * 3
        d.line([(X - 6, Y), (X + 6, Y)], fill=(255, 0, 0))
        d.line([(X, Y - 6), (X, Y + 6)], fill=(255, 0, 0))
        d.text((X + 22, Y - 6), r['id'], fill=(0, 0, 255))
    im.save(os.path.join(imgdir, f'overlay_f4{p}.png'))
