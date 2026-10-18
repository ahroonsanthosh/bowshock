"""Grid model for one plot panel of NASA TN D-4014 (NTRS 19670020031), 300 dpi page images.

Finds every horizontal and vertical grid line of the panel in several bands and fits each as a
straight line (so tilt and lean are corrected locally), then prints the lines with their scatter.
Usage: python3 -I d4014_grid.py IMAGE X0 X1 Y0 Y1 [OUT.json]
(X0..X1, Y0..Y1: the plot frame region in pixels, inclusive of the axes.)
Lines are listed by pixel position only; the CA or alpha value of each line is assigned by the
caller from the printed labels (checked on zoom views)."""
import sys
import json
import numpy as np
from PIL import Image


def peaks(profile, lo, thr):
    out = []
    i = 0
    while i < len(profile):
        if profile[i] > thr:
            j = i
            while j + 1 < len(profile) and profile[j + 1] > thr:
                j += 1
            seg = profile[i:j + 1]
            c = i + (np.arange(len(seg)) * seg).sum() / seg.sum()
            out.append((lo + c, j - i + 1))
            i = j + 1
        else:
            i += 1
    return out


def find_lines(a, x0, x1, y0, y1, axis, band=36, step=30, thr=0.75):
    """axis 'h': horizontal lines (row profiles in x-bands); 'v': vertical lines (column profiles in y-bands)."""
    det = []
    if axis == 'h':
        for xb in range(x0, x1 - band, step):
            prof = (a[y0:y1, xb:xb + band] < 128).mean(axis=1)
            for c, w in peaks(prof, y0, thr):
                if w <= 6:
                    det.append((xb + band / 2, c))
    else:
        for yb in range(y0, y1 - band, step):
            prof = (a[yb:yb + band, x0:x1] < 128).mean(axis=0)
            for c, w in peaks(prof, x0, thr):
                if w <= 6:
                    det.append((yb + band / 2, c))
    # cluster by position (the coordinate across the line)
    det.sort(key=lambda t: t[1])
    clusters = []
    for s, c in det:
        if clusters and abs(c - np.median([q for _, q in clusters[-1]])) < 4:
            clusters[-1].append((s, c))
        else:
            clusters.append([(s, c)])
    lines = []
    for cl in clusters:
        if len(cl) < 4:
            continue
        s, c = np.array(cl).T
        A = np.vstack([s, np.ones_like(s)]).T
        sl, ic = np.linalg.lstsq(A, c, rcond=None)[0]
        res = c - (sl * s + ic)
        good = np.abs(res) < 1.5
        if good.sum() < 4:
            continue
        sl, ic = np.linalg.lstsq(A[good], c[good], rcond=None)[0]
        r = c[good] - (sl * s[good] + ic)
        lines.append({'slope': float(sl), 'icpt': float(ic), 'n': int(good.sum()),
                      'smin': float(s[good].min()), 'smax': float(s[good].max()),
                      'maxres': float(np.abs(r).max())})
    return lines


if __name__ == '__main__':
    img = sys.argv[1]
    x0, x1, y0, y1 = map(int, sys.argv[2:6])
    a = np.array(Image.open(img).convert('L')).astype(int)
    H = find_lines(a, x0, x1, y0, y1, 'h')
    V = find_lines(a, x0, x1, y0, y1, 'v')
    xm = 0.5 * (x0 + x1)
    ym = 0.5 * (y0 + y1)
    print('horizontal lines: y at x=%d, slope px/1000px, n bands, x span, max residual' % xm)
    for L in H:
        print('  %8.2f  %+6.2f  %3d  [%4.0f,%4.0f]  %.2f' % (L['slope'] * xm + L['icpt'], L['slope'] * 1000, L['n'], L['smin'], L['smax'], L['maxres']))
    print('vertical lines: x at y=%d, slope px/1000px, n bands, y span, max residual' % ym)
    for L in V:
        print('  %8.2f  %+6.2f  %3d  [%4.0f,%4.0f]  %.2f' % (L['slope'] * ym + L['icpt'], L['slope'] * 1000, L['n'], L['smin'], L['smax'], L['maxres']))
    if len(sys.argv) > 6:
        json.dump({'h': H, 'v': V}, open(sys.argv[6], 'w'), indent=1)
