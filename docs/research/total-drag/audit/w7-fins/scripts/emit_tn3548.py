"""Write tn3548_fig6_first.csv from calib.py's output.
Usage: python3 -I emit_tn3548.py <cal.csv> <out.csv>"""
import csv
import sys

rows = list(csv.DictReader(open(sys.argv[1])))
rows.sort(key=lambda r: (float(r['x_value']), r['kind']))
with open(sys.argv[2], 'w', newline='') as f:
    f.write('# NACA TN 3548 (Morrow and Katz, 1955; NTRS 19930084307, sha256 5a6e1b5b...67b066acd6), fig. 6 "Base pressure\n')
    f.write('# coefficient for slab wing, a body of revolution, and limiting base pressure coefficient (vacuum) plotted against\n')
    f.write('# Mach number", PDF p. 17 (printed p. 15). The slab wing\'s two base slits, free flight: circle the outboard slit,\n')
    f.write('# square the inboard slit. The faired curve, the body of revolution (its ref. 2) and the vacuum line not read. Named by\n')
    f.write('# 0014 10.7 (k) before this reading. FIRST reading (0019 reader), 2026-10-22; read once, a blind second to arrange.\n')
    f.write('# 300 dpi render, page pixels; grid every 0.05 in M and Cp_b traced (calib.py, tn3548_fig6_grid.json). source: fit\n')
    f.write('# (symfit.py, placement +-1 px) or hand (the fit was pulled more than 2.5 px, by a grid line; +-2.5 px). Errors are the\n')
    f.write('# reading\'s; the report states +-0.02 in Cp_b at M 0.8, +-0.005 at M 1.4, and M within +-0.01 (PDF p. 6).\n')
    f.write('# Method: method_tn3548_fig6.md.\n')
    w = csv.writer(f)
    w.writerow(['id', 'slit', 'symbol', 'px_x', 'px_y', 'mach', 'cp_b', 'mach_err', 'cp_b_err', 'source'])
    for r in rows:
        place = float(r['place_px'])
        em = (place ** 2 + 0.5 ** 2) ** 0.5 / float(r['x_px_per_unit'])
        ec = (place ** 2 + 0.5 ** 2) ** 0.5 / float(r['y_px_per_unit'])
        w.writerow([r['id'], 'outboard' if r['kind'] == 'circle' else 'inboard', r['kind'], r['x'], r['y'],
                    f"{float(r['x_value']):.4f}", f"{float(r['y_value']):.4f}", f'{em:.4f}', f'{ec:.4f}', r['source']])
