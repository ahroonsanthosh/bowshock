"""RM L8B13 fig. 4(e): calib.py's output to the first-reading CSV. Usage:
python3 -I calib.py <p-15.png> rml8b13_fig4e_grid.json rml8b13_fig4e_place.csv <cal.csv>
python3 -I rml8b13_fig4e_emit.py <cal.csv> <out.csv>
<p-15.png>: PDF p. 15 at 300 dpi (pdftoppm -r 300 -f 15 -l 15), 2355 by 3105.
Errors: the placement and 0.5 px of grid trace in quadrature, over the local
scale of each axis."""
import csv
import sys

rows = list(csv.DictReader(open(sys.argv[1])))
with open(sys.argv[2], 'w', newline='') as f:
    f.write('# NACA RM L8B13 (NTRS 19930085324, sha256 9104583c...7679d824), fig. 4(e), PDF p. 15: p/p_0 at midchord on\n')
    f.write('# the two faces of the wing-flow wedge (orifices 4 in from the wing; legend circle and square) against M.\n')
    f.write('# FIRST reading (0019 reader, W7), 2026-10-23. shape_call: the symbol as read (uncertain where circle and square\n')
    f.write('# cannot be told apart at this scan). The x of reference 5 (theory) is not read. Method: method_rml8b13_fig4.md.\n')
    w = csv.writer(f)
    w.writerow(['id', 'shape_call', 'px_x', 'px_y', 'mach', 'p_over_p0', 'mach_err', 'p_over_p0_err', 'note'])
    for r in rows:
        e = (float(r['place_px']) ** 2 + 0.25) ** 0.5
        w.writerow([r['id'], r['shape_call'], r['x'], r['y'], f"{float(r['x_value']):.4f}", f"{float(r['y_value']):.4f}",
                    f"{e / float(r['x_px_per_unit']):.4f}", f"{e / float(r['y_px_per_unit']):.4f}", r['note']])
