"""Merge symfit.py's fits with the rough (hand) centres. A fit that moved
more than LIMIT px is not used (it was pulled by a line or a neighbour):
the hand centre is kept with a placement error HAND px; a kind with no
template (plus) is hand-placed, HAND_PLUS px; a fit used carries FIT px.
Usage: python3 -I merge_fit.py <rough.csv> <fit.csv> <out.csv> [LIMIT HAND HAND_PLUS FIT]"""
import csv
import sys

limit, hand, hand_plus, fit_err = (float(v) for v in (sys.argv[4:8] if len(sys.argv) > 7 else (3.0, 2.5, 1.5, 1.0)))
rough = list(csv.DictReader(open(sys.argv[1])))
fits = {r['id']: r for r in csv.DictReader(open(sys.argv[2]))}
with open(sys.argv[3], 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['id', 'kind', 'x', 'y', 'source', 'place_px'])
    for r in rough:
        ft = fits.get(r['id'])
        if ft is None:
            w.writerow([r['id'], r['kind'], r['x'], r['y'], 'hand', hand_plus])
        elif float(ft['shift']) > limit:
            w.writerow([r['id'], r['kind'], r['x'], r['y'], 'hand', hand])
        else:
            w.writerow([r['id'], r['kind'], ft['x'], ft['y'], 'fit', fit_err])
