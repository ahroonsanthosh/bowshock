"""Write a first-reading CSV from calib.py's output.
Usage: python3 -I emit_reading.py <cal.csv> <config.json> <out.csv>
config: {"header": [comment lines], "series": {"id prefix": "series name"},
"x_name": ..., "y_name": ..., "digits": 4}. Errors: the placement px
(merge_fit.py) and 0.5 px of grid trace, in quadrature, over the local
scale of each axis."""
import csv
import json
import sys

rows = list(csv.DictReader(open(sys.argv[1])))
cfg = json.load(open(sys.argv[2]))
d = cfg.get('digits', 4)
with open(sys.argv[3], 'w', newline='') as f:
    for line in cfg['header']:
        f.write('# ' + line + '\n')
    w = csv.writer(f)
    w.writerow(['id', 'series', 'symbol', 'px_x', 'px_y', cfg['x_name'], cfg['y_name'],
                cfg['x_name'] + '_err', cfg['y_name'] + '_err', 'source'])
    for r in rows:
        series = next(v for k, v in cfg['series'].items() if r['id'].startswith(k))
        e = (float(r['place_px']) ** 2 + 0.25) ** 0.5
        w.writerow([r['id'], series, r['kind'], r['x'], r['y'],
                    f"{float(r['x_value']):.{d}f}", f"{float(r['y_value']):.{d}f}",
                    f"{e / float(r['x_px_per_unit']):.{d}f}", f"{e / float(r['y_px_per_unit']):.{d}f}",
                    r['source']])
