"""Shift a points CSV (x, y columns) and a grid JSON by (-dx, -dy), so that
calib.py traces the grid lines on a crop of one panel only (on the full
page a trace can pick up the next panel's lines). Afterwards shift back
with negative offsets. Usage:
python3 -I shift.py <in.csv> <out.csv> <dx> <dy> [<grid.json> <grid_out.json>]"""
import csv
import json
import sys

dx, dy = float(sys.argv[3]), float(sys.argv[4])
rows = list(csv.DictReader(open(sys.argv[1])))
with open(sys.argv[2], 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    for r in rows:
        r['x'] = f"{float(r['x']) - dx:.2f}"
        r['y'] = f"{float(r['y']) - dy:.2f}"
        w.writerow(r)
if len(sys.argv) > 6:
    g = json.load(open(sys.argv[5]))
    g['x'] = [[v, p - dx] for v, p in g['x']]
    g['y'] = [[v, p - dy] for v, p in g['y']]
    json.dump(g, open(sys.argv[6], 'w'))
