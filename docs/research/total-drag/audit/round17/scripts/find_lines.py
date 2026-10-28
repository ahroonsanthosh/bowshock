"""Find long horizontal and vertical ink runs (panel frames and grid lines).

usage: python3 -I find_lines.py PAGE.npy MINLEN
Prints, for rows and columns, the positions where a run of at least MINLEN
contiguous ink pixels exists, grouped into lines with their extent.
"""
import sys
import numpy as np

ink = np.load(sys.argv[1])
minlen = int(sys.argv[2])


def runs_1d(v):
    """Return list of (start, end_exclusive) of runs of 1 in v."""
    d = np.diff(np.concatenate(([0], v.astype(np.int8), [0])))
    s = np.where(d == 1)[0]
    e = np.where(d == -1)[0]
    return list(zip(s, e))


def long_runs(img, axis):
    out = []  # (index, start, end)
    arr = img if axis == 0 else img.T
    for i in range(arr.shape[0]):
        for s, e in runs_1d(arr[i]):
            if e - s >= minlen:
                out.append((i, s, e))
    return out


for name, axis in (('rows (horizontal lines)', 0), ('cols (vertical lines)', 1)):
    rr = long_runs(ink, axis)
    print('==', name, len(rr))
    # group adjacent indices with overlapping extents
    groups = []
    for i, s, e in rr:
        placed = False
        for g in groups:
            if i - g['i1'] <= 1 and not (e < g['s'] or s > g['e']):
                g['i1'] = i
                g['s'] = min(g['s'], s)
                g['e'] = max(g['e'], e)
                g['n'] += 1
                placed = True
                break
        if not placed:
            groups.append({'i0': i, 'i1': i, 's': s, 'e': e, 'n': 1})
    for g in sorted(groups, key=lambda g: (g['s'] // 200, g['i0'])):
        print(f"  idx {g['i0']}-{g['i1']}  extent {g['s']}-{g['e']}  len {g['e']-g['s']}")
