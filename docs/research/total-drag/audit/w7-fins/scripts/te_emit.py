"""Write the first reading of R&M 3348 figs. 47 to 52 near the trailing
edge from te_band.py's output, with the per-panel exclusion recorded.
Usage: python3 -I te_emit.py <te.jsonl> <dir> <te_band.py> <out.csv>"""
import csv
import json
import subprocess
import sys
import tempfile

te, d, band, outp = sys.argv[1:5]
# Panels whose window is narrowed, and why (checked by eye on te_view.py's views).
OVERRIDE = {(50, 'e'): (0.1, 0.70, 'a speck at p/H 0.79, x/c 0.98, excluded')}
rows = []
with tempfile.TemporaryDirectory() as tmp:
    for pmin, pmax in {(0.1, 0.88)} | {v[:2] for v in OVERRIDE.values()}:
        subprocess.run(['python3', '-I', band, te, d, f'{tmp}/b.json', '0.975', '0.990', str(pmin), str(pmax)],
                       check=True, capture_output=True)
        for r in json.load(open(f'{tmp}/b.json')):
            key = (r['fig'], r['panel'])
            want = OVERRIDE.get(key, (0.1, 0.88, ''))[:2]
            if want == (pmin, pmax):
                rows.append((r, OVERRIDE.get(key, (0, 0, ''))[2]))
rows.sort(key=lambda t: (t[0]['fig'], t[0]['panel']))
with open(outp, 'w', newline='') as f:
    for line in [
        'ARC R&M 3348 (AERADE 1826.2/3929, sha256 d2f35d8a...b383e158), figs. 47 to 52, "Pressure distributions on single-wedge',
        'section" at M_0 0.70, 0.80, 0.90, 1.00, 1.11 and 1.16, PDF pp. 81 to 86, five panels each (phi 0, 15, 30, 45, 60 deg),',
        'p/H against x/c for several incidences (solid curves positive incidence and 0 deg, broken curves negative). Named by 0014',
        '10.7 (l) for the surface pressure just ahead of the base (x/c 0.995). FIRST reading (0019 reader, W7), 2026-10-22, blind',
        'to round 10. Read: the envelope of the curves\' ink over x/c 0.975 to 0.990, least and greatest p/H; the curves converge',
        'there and cannot be told apart one by one, and x/c 0.995 lies on the edge of the frame line, 2 to 3 px from its centre.',
        'Broken curves that end before x/c 0.975 are not in the envelope. err: tick calibration (at most 0.004) and 1 px.',
        'Method: method_rm3348_figs47_52.md.']:
        f.write('# ' + line + '\n')
    w = csv.writer(f)
    w.writerow(['fig', 'mach0', 'panel', 'sweep_deg', 'xc_from', 'xc_to', 'pH_least', 'pH_greatest', 'err', 'px_top', 'px_bottom', 'note'])
    for r, note in rows:
        e = 0.004 + abs(r['p_per_px'])
        w.writerow([r['fig'], f"{r['mach']:.2f}", r['panel'], r['sweep'], 0.975, 0.990,
                    f"{r['envelope_p'][0]:.3f}", f"{r['envelope_p'][1]:.3f}", f'{e:.3f}',
                    r['envelope_px'][0], r['envelope_px'][1], note])
