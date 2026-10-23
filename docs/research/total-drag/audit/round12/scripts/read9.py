"""Round 12: R&M 3427 fig. 9 (boundary-layer profiles on basic model, M = 0.8), page 36 of the
AERADE PDF (sha256 0e8b4d66...c5319), native 300 ppi image extracted with pdfimages (page image is
upright for this figure; the page is printed landscape but the figure block is upright).

Usage: python3 -I read9.py PAGE_PNG OUT_DIR

Calibration (all page pixels, measured with axisline.py):
  x axis (u*) ticks above the axis line: 0 at 972.50, 0.2 at 1072.54, 0.4 at 1173.50, 0.6 at 1273.50,
    0.8 at 1374.42, 1.0 at 1475.50 (ink centroid of rows 4..10 px above the axis line).
  y axis (y, inches) ticks right of the axis line: 0.10 at 329.54, 0.05 at 528.50; 0 is the x axis
    line itself.
  Axis lines are not square to the pixel grid (scan rotation about 0.008 rad, and the two axes are
  not quite perpendicular). Each point is projected parallel to the measured y axis onto the x axis
  (for u*) and parallel to the measured x axis onto the y axis (for y), then mapped with a
  least-squares straight line through the ticks.
Symbol centres: legend-glyph template peaks from detect.py (classify mode), types and every
  keep/reject decision made by eye on enlarged crops (method.md lists them).
"""
import sys
import json
import numpy as np
from PIL import Image, ImageDraw

page, outdir = sys.argv[1], sys.argv[2]
a = np.array(Image.open(page).convert('L')) < 128

# axis line samples (x, centre row) and (y, centre col), clean 2 px runs only (axisline.py output)
xax = [(1000, 726.5), (1025, 726.5), (1050, 725.5), (1075, 725.5), (1100, 725.5), (1125, 725.5),
       (1150, 725.5), (1250, 724.5), (1275, 724.5), (1300, 724.5), (1325, 724.5), (1350, 724.5),
       (1400, 723.5), (1425, 723.5), (1450, 723.5)]
yax = [(230, 967.5), (255, 968.0), (280, 967.5), (305, 968.0), (355, 968.5), (380, 968.5),
       (405, 968.5), (430, 969.5), (455, 969.5), (480, 969.5), (505, 969.5), (530, 970.5),
       (555, 970.5), (580, 970.5), (630, 971.5), (655, 971.5), (680, 971.5)]
bx, ax_ = np.polyfit([p[0] for p in xax], [p[1] for p in xax], 1)   # row = ax_ + bx * x
dy, cy_ = np.polyfit([p[0] for p in yax], [p[1] for p in yax], 1)   # col = cy_ + dy * y


def xaxis_row(x):
    return ax_ + bx * x


def yaxis_col(y):
    return cy_ + dy * y


def foot_on_xaxis(x, y):
    """Move (x, y) parallel to the y axis until it meets the x axis; return the column there."""
    for _ in range(5):
        r = xaxis_row(x)
        x = x + dy * (r - y)
        y = r
    return x


def foot_on_yaxis(x, y):
    """Move (x, y) parallel to the x axis until it meets the y axis; return the row there."""
    for _ in range(5):
        c = yaxis_col(y)
        y = y + bx * (c - x)
        x = c
    return y


xt_px = [972.50, 1072.54, 1173.50, 1273.50, 1374.42, 1475.50]
xt_v = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
# tick centroids were taken 4..10 px above the axis; move them onto the axis along the y direction
xt_px_axis = [foot_on_xaxis(p, xaxis_row(p) - 7) for p in xt_px]
ku, cu = np.polyfit(xt_px_axis, xt_v, 1)
res_u = np.array(xt_v) - (ku * np.array(xt_px_axis) + cu)

y0row = foot_on_yaxis(yaxis_col(xaxis_row(970)), xaxis_row(970))
yt_px = [foot_on_yaxis(977, 329.54), foot_on_yaxis(977, 528.50), y0row]
yt_v = [0.10, 0.05, 0.0]
kyy, cyy = np.polyfit(yt_px, yt_v, 1)
res_y = np.array(yt_v) - (kyy * np.array(yt_px) + cyy)


def to_data(x, y):
    return ku * foot_on_xaxis(x, y) + cu, kyy * foot_on_yaxis(x, y) + cyy


# (type, x_px, y_px, centring sigma px, note). Sigma 1.0 for a clean symbol, 1.5 where the curve or a
# neighbour overlaps the outline, 2.0 where the outline is broken or merged.
PTS = [
    ('circle', 1471.0, 267.0, 1.0, ''),
    ('circle', 1473.0, 304.0, 1.5, 'type uncertain: outline boxy, touches square below; read as circle'),
    ('square', 1471.0, 314.5, 1.5, 'merged with circles above and below'),
    ('circle', 1471.0, 326.0, 1.5, 'merged with square above'),
    ('square', 1474.0, 353.5, 1.0, ''),
    ('circle', 1470.0, 366.0, 1.0, ''),
    ('circle', 1467.0, 385.0, 1.5, 'type uncertain: flat top and left side; template prefers circle by 0.05'),
    ('square', 1473.0, 394.5, 1.5, 'overlaps circles above and below'),
    ('circle', 1467.0, 404.0, 1.0, ''),
    ('circle', 1463.0, 424.0, 1.0, ''),
    ('square', 1468.0, 435.5, 2.0, 'type mildly uncertain: top edge merged with curve and circle'),
    ('circle', 1459.0, 445.0, 1.5, 'touches square above'),
    ('circle', 1455.0, 464.0, 1.0, ''),
    ('square', 1461.0, 473.5, 1.5, 'overlaps circles'),
    ('circle', 1449.0, 484.0, 1.0, ''),
    ('circle', 1445.0, 506.0, 1.0, ''),
    ('square', 1453.0, 514.5, 1.5, 'curve through left side'),
    ('circle', 1437.0, 525.0, 1.5, 'outline broken lower right'),
    ('circle', 1427.0, 546.0, 1.0, ''),
    ('square', 1440.0, 552.5, 1.5, 'outline broken'),
    ('circle', 1422.0, 565.0, 1.0, ''),
    ('circle', 1415.0, 583.0, 1.0, ''),
    ('square', 1420.0, 593.5, 1.5, 'curve through left side'),
    ('circle', 1404.0, 604.0, 1.5, 'outline broken right'),
    ('circle', 1395.0, 624.0, 1.0, ''),
    ('square', 1391.0, 633.5, 1.5, 'curve through it'),
    ('circle', 1380.0, 646.0, 1.5, 'outline broken right'),
    ('circle', 1353.0, 664.0, 1.0, ''),
    ('square', 1360.0, 673.5, 1.5, 'curve through it'),
    ('circle', 1321.0, 686.0, 1.0, ''),
    ('square', 1329.0, 711.5, 1.0, 'isolated, below the curve'),
    ('circle', 1262.0, 705.0, 1.0, ''),
    ('circle', 1238.0, 725.0, 1.5, 'sits on the x axis line'),
]
STATION = {'circle': 'at trailing edge', 'square': '1 in. upstream of trailing edge'}

# calibration error, in data units: rms tick residual plus 0.5 px tick-centroid quantisation
cal_u = float(np.sqrt(np.mean(res_u ** 2)) + 0.5 * abs(ku))
cal_y = float(np.sqrt(np.mean(res_y ** 2)) + 0.5 * abs(kyy))

rows = []
for i, (t, x, y, sg, note) in enumerate(PTS, 1):
    u, yy = to_data(x, y)
    eu = float(np.hypot(sg * abs(ku), cal_u))
    ey = float(np.hypot(sg * abs(kyy), cal_y))
    rows.append(dict(id=i, symbol=t, station=STATION[t], x_px=x, y_px=y, u_star=u, u_err=eu,
                     y_in=yy, y_err=ey, note=note))

# ---- the 1/7 power-law line: trace its centreline, away from symbols ----
def near_symbol(x, y, r=10):
    return any((x - p[1]) ** 2 + (y - p[2]) ** 2 < r * r for p in PTS)


# Eye-placed guide points along the drawn line (page px); the trace takes the thin ink run nearest
# the guide (rows where the line is steep, columns where it is shallow), skipping symbol areas.
GUIDE = [(1469, 244), (1471, 300), (1471, 345), (1470, 418), (1464, 455), (1456, 489), (1450, 521),
         (1440, 539), (1432, 561), (1424, 579), (1406, 613), (1405, 620), (1385, 647), (1370, 662),
         (1350, 679), (1320, 694), (1270, 712), (1220, 720), (1210, 722)]


def runs_of(idx):
    out = []
    if len(idx) == 0:
        return out
    s0 = idx[0]
    for k in range(1, len(idx) + 1):
        if k == len(idx) or idx[k] != idx[k - 1] + 1:
            out.append((s0, idx[k - 1]))
            if k < len(idx):
                s0 = idx[k]
    return out


curve = []
for (xa, ya), (xb, yb) in zip(GUIDE, GUIDE[1:]):
    if abs(xb - xa) <= abs(yb - ya):  # steep: scan rows
        for r in range(ya, yb):
            g = xa + (xb - xa) * (r - ya) / (yb - ya)
            lo = int(g) - 6
            rr = [((s0 + e) / 2 + lo) for s0, e in runs_of(np.where(a[r, lo:lo + 13])[0]) if e - s0 + 1 <= 5]
            rr = [v for v in rr if abs(v - g) <= 5]
            if rr:
                v = min(rr, key=lambda q: abs(q - g))
                if not near_symbol(v, r, 9):
                    curve.append((v, float(r)))
    else:  # shallow: scan columns
        for c in range(min(xa, xb), max(xa, xb)):
            g = ya + (yb - ya) * (c - xa) / (xb - xa)
            lo = int(g) - 6
            cc = [((s0 + e) / 2 + lo) for s0, e in runs_of(np.where(a[lo:lo + 13, c])[0]) if e - s0 + 1 <= 5]
            cc = [v for v in cc if abs(v - g) <= 5 and v < xaxis_row(c) - 3]
            if cc:
                v = min(cc, key=lambda q: abs(q - g))
                if not near_symbol(c, v, 9):
                    curve.append((float(c), v))
cd = [(*to_data(x, y), x, y) for x, y in curve]
cd = [p for p in cd if p[1] > 0.0005]
# fit u = (y/delta)^(1/7) for delta (least squares in u), by a 1D search
U = np.array([p[0] for p in cd]); Y = np.array([p[1] for p in cd])
best = None
for d in np.arange(0.080, 0.200, 0.0001):
    e = np.sum((np.minimum(np.clip(Y / d, 0, None) ** (1 / 7), 1.0) - U) ** 2)
    if best is None or e < best[0]:
        best = (e, d)
delta = best[1]
rms_fit = float(np.sqrt(best[0] / len(U)))
# free exponent check: fit log u = n log y + c
n_fit, c_fit = np.polyfit(np.log(Y[U < 0.99]), np.log(U[U < 0.99]), 1)

# where the drawn line ends
top = min(curve, key=lambda p: p[1])
foot = min(curve, key=lambda p: p[0])

import os
os.makedirs(outdir, exist_ok=True)
with open(os.path.join(outdir, 'rm3427-fig9-points.csv'), 'w') as f:
    f.write('id,symbol,station,x_px,y_px,u_star,u_star_err,y_in,y_in_err,note\n')
    for r in rows:
        f.write(f"{r['id']},{r['symbol']},{r['station']},{r['x_px']:.1f},{r['y_px']:.1f},"
                f"{r['u_star']:.4f},{r['u_err']:.4f},{r['y_in']:.5f},{r['y_err']:.5f},\"{r['note']}\"\n")
with open(os.path.join(outdir, 'rm3427-fig9-powerlaw-line.csv'), 'w') as f:
    f.write('x_px,y_px,u_star,y_in\n')
    step = max(1, len(cd) // 60)
    for u, yy, x, y in sorted(cd, key=lambda p: p[1])[::step]:
        f.write(f'{x:.1f},{y:.1f},{u:.4f},{yy:.5f}\n')
summary = dict(
    calibration=dict(u_per_px=ku, u_at_px0=cu, u_tick_residuals=res_u.tolist(), y_per_px=kyy,
                     y_at_px0=cyy, y_tick_residuals=res_y.tolist(), xaxis_slope=bx, yaxis_slope=dy,
                     cal_err_u=cal_u, cal_err_y=cal_y),
    counts=dict(total=len(rows), circles=sum(r['symbol'] == 'circle' for r in rows),
                squares=sum(r['symbol'] == 'square' for r in rows)),
    powerlaw=dict(n_traced=len(cd), delta_in_fit=delta, rms_u_residual=rms_fit,
                  free_exponent=n_fit, top_end=dict(zip(['u', 'y'], to_data(*top))),
                  axis_end=dict(zip(['u', 'y'], to_data(*foot)))))
json.dump(summary, open(os.path.join(outdir, 'rm3427-fig9-summary.json'), 'w'), indent=1)
print(json.dumps(summary, indent=1))
for r in rows:
    print(r['id'], r['symbol'][0], f"{r['u_star']:.3f}+-{r['u_err']:.3f}", f"{r['y_in']:.4f}+-{r['y_err']:.4f}")


# ---- overlay check: map every read value back to page pixels and draw it over the scan ----
def to_px(u, yy):
    """Invert to_data by Newton iteration (the map is nearly affine)."""
    x, y = (u - cu) / ku, (yy - cyy) / kyy
    for _ in range(20):
        fu, fy = to_data(x, y)
        h = 0.5
        j11 = (to_data(x + h, y)[0] - fu) / h; j12 = (to_data(x, y + h)[0] - fu) / h
        j21 = (to_data(x + h, y)[1] - fy) / h; j22 = (to_data(x, y + h)[1] - fy) / h
        det = j11 * j22 - j12 * j21
        du, dv = u - fu, yy - fy
        x += (j22 * du - j12 * dv) / det
        y += (-j21 * du + j11 * dv) / det
    return x, y


X0, Y0, X1, Y1, S = 940, 220, 1500, 760, 3
im = Image.open(page).convert('RGB').crop((X0, Y0, X1, Y1)).resize(((X1 - X0) * S, (Y1 - Y0) * S), Image.NEAREST)
d = ImageDraw.Draw(im)
P = lambda x, y: ((x - X0) * S, (y - Y0) * S)
# fitted 1/7 law (magenta) from the read delta
prevp = None
for k in range(0, 400):
    yy = delta * (k / 399) ** 1 if k else 1e-6
    u = (yy / delta) ** (1 / 7)
    if u < 0.45:
        continue
    q = P(*to_px(u, yy))
    if prevp:
        d.line([prevp, q], fill=(220, 0, 220), width=1)
    prevp = q
d.line([prevp, P(*to_px(1.0, 0.125))], fill=(220, 0, 220), width=1)
for u, yy, x, y in cd:  # traced line points (green), drawn from the data values
    px, py = P(*to_px(u, yy))
    d.ellipse([px - 1.5, py - 1.5, px + 1.5, py + 1.5], fill=(0, 170, 0))
for r in rows:  # symbols drawn from the data values
    px, py = P(*to_px(r['u_star'], r['y_in']))
    c = (230, 0, 0) if r['symbol'] == 'circle' else (0, 80, 255)
    rad = 7 * S
    if r['symbol'] == 'circle':
        d.ellipse([px - rad, py - rad, px + rad, py + rad], outline=c, width=1)
    else:
        d.rectangle([px - rad, py - rad, px + rad, py + rad], outline=c, width=1)
    d.text((px + rad + 2, py - 6), str(r['id']), fill=c)
for v in xt_v:  # tick positions from the calibration (orange)
    px, py = P(*to_px(v, 0.0))
    d.line([(px, py), (px, py + 12)], fill=(255, 140, 0), width=2)
for v in yt_v:
    px, py = P(*to_px(0.0, v))
    d.line([(px - 12, py), (px, py)], fill=(255, 140, 0), width=2)
ov = os.path.join(outdir, '..', 'overlays', 'rm3427-fig9-overlay.png')
im.save(ov)
# residuals of the traced line against the fitted law
res = U - np.minimum((Y / delta) ** (1 / 7), 1)
for lo_, hi_ in [(0, 0.01), (0.01, 0.03), (0.03, 0.06), (0.06, 0.13)]:
    m = (Y >= lo_) & (Y < hi_)
    if m.any():
        print(f'trace residual u - law, y in [{lo_},{hi_}): mean {res[m].mean():+.4f}, n {m.sum()}')
# joint fit of exponent and delta: u = min(1, (y/delta)^n)
best2 = None
for n in np.arange(0.08, 0.30, 0.0025):
    for dd in np.arange(0.040, 0.160, 0.0005):
        e = np.sum((np.minimum((Y / dd) ** n, 1.0) - U) ** 2)
        if best2 is None or e < best2[0]:
            best2 = (e, n, dd)
print(f'joint fit: n = {best2[1]:.4f} (1/n = {1 / best2[1]:.2f}), delta = {best2[2]:.4f} in, rms u {np.sqrt(best2[0] / len(U)):.4f}')
# where the drawn line first reaches u >= 0.995 going up (as drawn)
up = sorted(zip(Y, U))
first = next((yy for yy, u in up if u >= 0.995), None)
print(f'drawn line first reaches u* >= 0.995 at y = {first:.4f} in')
summary['powerlaw'].update(joint_fit_n=float(best2[1]), joint_fit_delta=float(best2[2]),
                           joint_fit_rms_u=float(np.sqrt(best2[0] / len(U))),
                           y_where_line_reaches_u_0995=float(first))
json.dump(summary, open(os.path.join(outdir, 'rm3427-fig9-summary.json'), 'w'), indent=1)
