"""TN 3548 fig. 6: merge the template fits with the hand placements and
write the grid file. A fit that moved more than 2.5 px (it reached the
search's edge, usually pulled by a grid line through the symbol) is not
used: the hand centre is kept, with a placement error of 2.5 px; a fit
used carries 1.0 px. Usage: python3 -I tn3548_merge.py <rough.csv> <fit.csv> <merged.csv> <grid.json>"""
import csv
import json
import sys

rough = {r['id']: r for r in csv.DictReader(open(sys.argv[1]))}
fit = list(csv.DictReader(open(sys.argv[2])))
with open(sys.argv[3], 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['id', 'kind', 'x', 'y', 'source', 'place_px'])
    for r in fit:
        if float(r['shift']) > 2.5:
            h = rough[r['id']]
            w.writerow([r['id'], r['kind'], h['x'], h['y'], 'hand', 2.5])
        else:
            w.writerow([r['id'], r['kind'], r['x'], r['y'], 'fit', 1.0])

xs = [852, 907, 962, 1017, 1072, 1127, 1182, 1237, 1292, 1347, 1403, 1458, 1512, 1567, 1622, 1677, 1733,
      1789, 1844, 1899, 1955, 2010]
ys = [527, 582, 638, 694, 749, 805, 861, 917, 972, 1028, 1083, 1139, 1194, 1251]
grid = {'x': [[round(0.6 + 0.05 * i, 2), p] for i, p in enumerate(xs)],
        'y': [[round(-0.9 + 0.05 * i, 2), p] for i, p in enumerate(ys)], 'band': 60}
json.dump(grid, open(sys.argv[4], 'w'))
