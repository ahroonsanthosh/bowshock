# Fit the centre line of one pen stroke from the native scan.
# A stroke is given by a rough start and end point and a list of scan lines to use.
# mode 'rows': for each row y in the list, take the darkness-weighted centroid in x within
#   +-hw px of the rough line, fit x = a + b*y.
# mode 'cols': for each column x in the list, centroid in y, fit y = a + b*x.
# Darkness = 255 - grey; weights = max(darkness - floor, 0).
# Prints each scan line's centroid and residual so contaminated lines can be seen.
import sys, json
import numpy as np
from PIL import Image
IM = None
def load(path):
    global IM
    IM = 255 - np.asarray(Image.open(path).convert('L')).astype(float)
def stroke(mode, p0, p1, lines, hw=3, floor=40, verbose=True, name=''):
    (u0, v0), (u1, v1) = p0, p1
    ts, cs, ws = [], [], []
    for t in lines:
        if mode == 'rows':
            pred = u0 + (u1 - u0) * (t - v0) / (v1 - v0) if v1 != v0 else u0
            lo, hi = int(np.floor(pred - hw)), int(np.ceil(pred + hw))
            prof = IM[t, lo:hi + 1]
        else:
            pred = v0 + (v1 - v0) * (t - u0) / (u1 - u0) if u1 != u0 else v0
            lo, hi = int(np.floor(pred - hw)), int(np.ceil(pred + hw))
            prof = IM[lo:hi + 1, t]
        w = np.clip(prof - floor, 0, None)
        if w.sum() <= 0:
            continue
        c = lo + (np.arange(len(prof)) * w).sum() / w.sum()
        ts.append(t); cs.append(c); ws.append(w.sum())
    ts, cs = np.array(ts, float), np.array(cs, float)
    A = np.vstack([np.ones(len(ts)), ts]).T
    coef, *_ = np.linalg.lstsq(A, cs, rcond=None)
    r = cs - A @ coef
    rms = float(np.sqrt((r ** 2).mean())) if len(r) > 2 else float('nan')
    # standard error of the line at its mid point and of the slope
    n = len(ts)
    se_mid = rms / np.sqrt(max(n - 2, 1)) if n > 2 else float('nan')
    if verbose:
        print('%s %s n=%d a=%.3f b=%.4f rms=%.3f' % (name, mode, n, coef[0], coef[1], rms))
        print('   ' + ' '.join('%d:%.2f(%+.2f)' % (t, c, rr) for t, c, rr in zip(ts, cs, r)))
    return {'mode': mode, 'a': float(coef[0]), 'b': float(coef[1]), 'rms': rms, 'n': n,
            'se_mid': float(se_mid), 't': ts.tolist(), 'c': cs.tolist()}
def intersect_rows(L, R):
    # both lines x = a + b*y; return (x, y)
    y = (R['a'] - L['a']) / (L['b'] - R['b'])
    return L['a'] + L['b'] * y, y
def at(line, t):
    return line['a'] + line['b'] * t
if __name__ == '__main__':
    load(sys.argv[1])
    spec = json.load(open(sys.argv[2]))
    for s in spec:
        lines = s['lines'] if 'lines' in s else list(range(s['from'], s['to'] + 1))
        stroke(s['mode'], s['p0'], s['p1'], lines, s.get('hw', 3), s.get('floor', 40), name=s['name'])
