# Model the periodic scan jogs (sawtooth offsets) and write a corrected page image.
# usage: dejog.py scriptsdir page_gray.png calib.json out_corrected.png out_model.json
# Dx(row): x offset of vertical grid lines at each display row, relative to each line's straight fit (median over lines),
#          modelled as a straight line within each segment between jogs.
# Dy(col): same for the y offset of horizontal grid lines along each column.
# The corrected image samples the original at (x + Dx(y), y + Dy(x)), so grid lines become straight.
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import measure_lib as M
gray = np.asarray(Image.open(sys.argv[2]), dtype=float)
ink = M.load(sys.argv[2]); cal = json.load(open(sys.argv[3]))
H, W = gray.shape

def per_index(lines, key, slopekey, ref, idx_range, orient):
    vals = []
    for i in idx_range:
        r = []
        for L in lines:
            p = L[key] + L[slopekey] * (i - ref)
            s = (M.vstroke(ink, p, i, i + 1, half=3) if orient == 'v' else M.hstroke(ink, p, i, i + 1, half=3))
            if s and abs(s[0][1] - p) < 1.6:
                r.append(s[0][1] - p)
        vals.append(np.median(r) if len(r) >= 2 else np.nan)
    return np.array(vals)

def find_steps(idx, v, thr=0.6):
    steps = []
    for i in range(4, len(v) - 4):
        a = np.nanmedian(v[i - 4:i]); b = np.nanmedian(v[i:i + 4])
        # the scan's jogs are one-pixel steps; smaller or larger steps come from symbols and curves crossing the lines
        if np.isfinite(a) and np.isfinite(b) and 0.8 <= abs(b - a) <= 1.2:
            steps.append((int(idx[i]), float(b - a)))
    # merge consecutive detections: keep the one with the largest jump within 6 px
    merged = []
    for s in steps:
        if merged and s[0] - merged[-1][0] <= 6:
            if abs(s[1]) > abs(merged[-1][1]): merged[-1] = s
        else:
            merged.append(s)
    return merged

def piecewise_model(idx, v, bounds):
    edges = [idx[0]] + [b for b, _ in bounds] + [idx[-1] + 1]
    segs = []
    for a, b in zip(edges[:-1], edges[1:]):
        m = (idx >= a) & (idx < b) & np.isfinite(v)
        if m.sum() < 10:
            segs.append((int(a), int(b), float(np.nanmedian(v[m])) if m.any() else 0.0, 0.0, int(m.sum()))); continue
        t = idx[m]; s = v[m]; keep = np.ones(len(t), bool)
        for _ in range(6):
            c = np.polyfit(t[keep], s[keep], 1); r = s - np.polyval(c, t)
            sig = max(np.std(r[keep]), 0.05); nk = np.abs(r) < 3 * sig
            if (nk == keep).all(): break
            keep = nk
        segs.append((int(a), int(b), float(c[1]), float(c[0]), int(keep.sum())))
    return segs

def evaluate(segs, i):
    for a, b, c0, c1, n in segs:
        if a <= i < b: return c0 + c1 * i
    a, b, c0, c1, n = segs[0] if i < segs[0][0] else segs[-1]
    return c0 + c1 * i

vlines = [L for L in cal['vertical'] if 'x_at_y1080' in L and 0.5 <= L['value'] <= 8.5]
hlines = [L for L in cal['horizontal'] if 'y_at_x1588' in L and 0.0 < L['value'] < 2.75]
rows = np.arange(415, 1752); cols = np.arange(492, 2684)
vx = per_index(vlines, 'x_at_y1080', 'slope_dx_per_dy', 1080, rows, 'v')
hy = per_index(hlines, 'y_at_x1588', 'slope_dy_per_dx', 1588, cols, 'h')
bx = find_steps(rows, vx); by = find_steps(cols, hy)
sx = piecewise_model(rows, vx, bx); sy = piecewise_model(cols, hy, by)
print('x jogs at rows', bx); print('x model segments (row0,row1,c0,c1,n)', sx)
print('y jogs at cols', by); print('y model segments (col0,col1,c0,c1,n)', sy)
Dx = np.array([evaluate(sx, i) for i in range(H)]); Dy = np.array([evaluate(sy, j) for j in range(W)])
# residual of the model
rx = vx - Dx[rows]; ry = hy - Dy[cols]
print('after model: per-row x residual rms %.3f px, per-col y residual rms %.3f px' % (np.sqrt(np.nanmean(rx ** 2)), np.sqrt(np.nanmean(ry ** 2))))
yy, xx = np.mgrid[0:H, 0:W].astype(float)
src_x = xx + Dx[:, None]; src_y = yy + Dy[None, :]
corr = ndi.map_coordinates(gray, [src_y, src_x], order=1, mode='nearest')
Image.fromarray(np.clip(corr, 0, 255).astype(np.uint8)).save(sys.argv[4])
json.dump({'x_jogs': bx, 'x_segments': sx, 'y_jogs': by, 'y_segments': sy,
           'Dx_rows_415_1751': [round(float(v), 3) for v in Dx[415:1752]], 'Dy_cols_492_2683': [round(float(v), 3) for v in Dy[492:2684]]},
          open(sys.argv[5], 'w'), indent=0)
