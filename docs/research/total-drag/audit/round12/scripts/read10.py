"""Round 12: R&M 3427 fig. 10 (variation of boundary-layer thickness with Mach number), page 36 of
the AERADE PDF (sha256 0e8b4d66...c5319), native 300 ppi image from pdfimages; figure upright.

Usage: python3 -I read10.py PAGE_PNG OUT_DIR

Calibration (page pixels, measured with axisline.py):
  x axis (M_inf): ticks above the axis line at 0.5 -> 1223.69 and 1.0 -> 1476.50; 0 is the y axis
    line (centre column 972.5 at the x axis, fitted).
  y axis (delta/h): ticks right of the axis line at 0.2 -> 1317.50 and 0.1 -> 1517.50; 0 is the x
    axis line (centre row about 1714.6, fitted).
  The zero lines and the tick pairs disagree by about 2 px on each axis (uncertain call in
  method.md); each axis is a least-squares line through all three, and the residual sets the
  calibration error.
Projection as in read9.py: parallel to the fitted y axis onto the x axis for M, and parallel to the
fitted x axis onto the y axis for delta/h.
"""
import sys
import os
import json
import numpy as np
from PIL import Image, ImageDraw

page, outdir = sys.argv[1], sys.argv[2]
a = np.array(Image.open(page).convert('L')) < 128

xax = [(980, 1715.0), (1005, 1715.5), (1030, 1715.0), (1055, 1715.0), (1080, 1715.0), (1105, 1715.0),
       (1130, 1715.0), (1155, 1714.5), (1180, 1714.5), (1205, 1714.5), (1255, 1714.5), (1280, 1714.5),
       (1305, 1714.5), (1330, 1714.5), (1355, 1714.5), (1380, 1714.5), (1405, 1714.5), (1430, 1714.5),
       (1455, 1714.5), (1505, 1714.5), (1530, 1714.5), (1555, 1714.5)]
yax = [(1240, 970.5), (1265, 970.5), (1290, 970.5), (1340, 970.5), (1365, 970.5), (1390, 971.5),
       (1415, 971.5), (1440, 971.5), (1465, 971.5), (1490, 971.5), (1565, 972.5), (1590, 972.5),
       (1615, 972.5), (1640, 972.5), (1665, 972.5), (1690, 972.5)]
bx, ax_ = np.polyfit([p[0] for p in xax], [p[1] for p in xax], 1)
dy, cy_ = np.polyfit([p[0] for p in yax], [p[1] for p in yax], 1)
xaxis_row = lambda x: ax_ + bx * x
yaxis_col = lambda y: cy_ + dy * y


def foot_on_xaxis(x, y):
    for _ in range(5):
        r = xaxis_row(x); x = x + dy * (r - y); y = r
    return x


def foot_on_yaxis(x, y):
    for _ in range(5):
        c = yaxis_col(y); y = y + bx * (c - x); x = c
    return y


origin_x = foot_on_xaxis(yaxis_col(xaxis_row(972)), xaxis_row(972))  # where the axes cross
origin_y = foot_on_yaxis(yaxis_col(xaxis_row(972)), xaxis_row(972))
xt_px = [origin_x, foot_on_xaxis(1223.69, xaxis_row(1223.69) - 7), foot_on_xaxis(1476.50, xaxis_row(1476.5) - 7)]
xt_v = [0.0, 0.5, 1.0]
km, cm = np.polyfit(xt_px, xt_v, 1)
res_m = np.array(xt_v) - (km * np.array(xt_px) + cm)
yt_px = [origin_y, foot_on_yaxis(979, 1517.50), foot_on_yaxis(979, 1317.50)]
yt_v = [0.0, 0.1, 0.2]
kd, cd_ = np.polyfit(yt_px, yt_v, 1)
res_d = np.array(yt_v) - (kd * np.array(yt_px) + cd_)
# alternative calibration from the two labelled ticks only (no zero lines), for the uncertain call
km2 = 0.5 / (xt_px[2] - xt_px[1]); cm2 = 0.5 - km2 * xt_px[1]
kd2 = 0.1 / (yt_px[2] - yt_px[1]); cd2 = 0.1 - kd2 * yt_px[1]


def to_data(x, y, alt=False):
    fx, fy = foot_on_xaxis(x, y), foot_on_yaxis(x, y)
    if alt:
        return km2 * fx + cm2, kd2 * fy + cd2
    return km * fx + cm, kd * fy + cd_


cal_m = float(np.sqrt(np.mean(res_m ** 2)) + 0.5 * abs(km))
cal_d = float(np.sqrt(np.mean(res_d ** 2)) + 0.5 * abs(kd))

STATION = {'circle': 'at trailing edge', 'square': '1 in. upstream of trailing edge'}
PTS = [  # type, x, y (template peaks, detect.py classify), centring sigma px, note
    ('square', 1171.0, 1475.5, 1.0, ''),
    ('circle', 1373.0, 1430.0, 1.0, ''),
    ('square', 1375.0, 1466.5, 1.0, ''),
    ('square', 1475.0, 1484.5, 1.0, 'outline has a small gap on the right side'),
    ('square', 1525.0, 1514.5, 1.0, 'outline has a small gap on the right side'),
]
rows = []
for i, (t, x, y, sg, note) in enumerate(PTS, 1):
    m, dh = to_data(x, y)
    m2, dh2 = to_data(x, y, alt=True)
    rows.append(dict(id=i, symbol=t, station=STATION[t], x_px=x, y_px=y, M=m,
                     M_err=float(np.hypot(sg * abs(km), cal_m)), dh=dh,
                     dh_err=float(np.hypot(sg * abs(kd), cal_d)), M_ticks_only=m2, dh_ticks_only=dh2,
                     note=note))

# ---- dashed flat-plate lines: column scan for thin runs near an eye-placed guide ----
GUIDES = {
    'turbulent from leading edge': [(1066, 1216), (1080, 1226), (1094, 1238), (1116, 1252), (1145, 1266),
                                    (1172, 1278), (1200, 1287), (1250, 1300), (1300, 1312), (1350, 1320), (1400, 1323),
                                    (1450, 1326), (1500, 1327), (1568, 1329)],
    'laminar': [(1056, 1596), (1071, 1601), (1080, 1605), (1097, 1610), (1110, 1614), (1127, 1618),
                (1135, 1621), (1153, 1625), (1165, 1627), (1200, 1631), (1250, 1638),
                (1300, 1645), (1350, 1648), (1400, 1650), (1450, 1651), (1500, 1651), (1582, 1652)],
}


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


lines = {}
for name, G in GUIDES.items():
    gx = np.array([p[0] for p in G], float); gy = np.array([p[1] for p in G], float)
    pts = []
    for c in range(int(gx[0]) - 4, int(gx[-1]) + 5):
        g = float(np.interp(c, gx, gy))
        lo = int(g) - 6
        cc = [(s0 + e) / 2 + lo for s0, e in runs_of(np.where(a[lo:lo + 13, c])[0]) if e - s0 + 1 <= 5]
        cc = [v for v in cc if abs(v - g) <= 4]
        if cc:
            pts.append((float(c), min(cc, key=lambda q: abs(q - g))))
    P_ = np.array(pts)
    # reject arrow-leader pixels: more than 1.8 px from a smoothing fit (cubic in x), twice
    keep = np.ones(len(P_), bool)
    for _ in range(3):
        co = np.polyfit(P_[keep, 0], P_[keep, 1], 4)
        r = P_[:, 1] - np.polyval(co, P_[:, 0])
        keep = np.abs(r) < 1.8
    data = np.array([to_data(x, y) for x, y in P_[keep]])
    # dashes: groups of consecutive kept columns
    xs = P_[keep, 0]
    breaks = np.where(np.diff(xs) > 2)[0]
    dashes = np.split(np.arange(len(xs)), breaks + 1)
    dash_mid = [(*to_data(P_[keep][d, 0].mean(), P_[keep][d, 1].mean()), int(len(d))) for d in dashes if len(d) >= 4]
    lines[name] = dict(pix=P_[keep], data=data, rejected=int((~keep).sum()), dashes=dash_mid,
                       fit=np.polyfit(data[:, 0], data[:, 1], 4))

os.makedirs(outdir, exist_ok=True)
with open(os.path.join(outdir, 'rm3427-fig10-points.csv'), 'w') as f:
    f.write('id,symbol,station,x_px,y_px,M_inf,M_inf_err,delta_over_h,delta_over_h_err,'
            'M_inf_ticks_only,delta_over_h_ticks_only,note\n')
    for r in rows:
        f.write(f"{r['id']},{r['symbol']},{r['station']},{r['x_px']:.1f},{r['y_px']:.1f},{r['M']:.4f},"
                f"{r['M_err']:.4f},{r['dh']:.4f},{r['dh_err']:.4f},{r['M_ticks_only']:.4f},"
                f"{r['dh_ticks_only']:.4f},\"{r['note']}\"\n")
with open(os.path.join(outdir, 'rm3427-fig10-flatplate-lines.csv'), 'w') as f:
    f.write('line,kind,M_inf,delta_over_h,delta_over_h_err,dash_columns\n')
    for name, L in lines.items():
        e = float(np.hypot(1.0 * abs(kd), cal_d))
        for m, dh, n in L['dashes']:
            f.write(f'{name},dash centre,{m:.4f},{dh:.4f},{e:.4f},{n}\n')
        lo, hi = L['data'][:, 0].min(), L['data'][:, 0].max()
        for m in np.arange(np.ceil(lo * 20) / 20, hi + 1e-9, 0.05):
            f.write(f"{name},smoothed (quartic through traced columns),{m:.2f},{np.polyval(L['fit'], m):.4f},{e:.4f},\n")
        f.write(f"{name},drawn left end,{lo:.4f},{np.polyval(L['fit'], lo):.4f},{e:.4f},\n")
        f.write(f"{name},drawn right end,{hi:.4f},{np.polyval(L['fit'], hi):.4f},{e:.4f},\n")
summary = dict(
    calibration=dict(M_per_px=km, M_tick_residuals=res_m.tolist(), dh_per_px=kd,
                     dh_tick_residuals=res_d.tolist(), xaxis_slope=bx, yaxis_slope=dy, cal_err_M=cal_m,
                     cal_err_dh=cal_d, origin_px=[origin_x, origin_y]),
    counts=dict(total=len(rows), circles=sum(r['symbol'] == 'circle' for r in rows),
                squares=sum(r['symbol'] == 'square' for r in rows)),
    lines={n: dict(columns=len(L['pix']), rejected=L['rejected'], dashes=len(L['dashes']),
                   M_range=[float(L['data'][:, 0].min()), float(L['data'][:, 0].max())],
                   rms_about_fit=float(np.sqrt(np.mean((L['data'][:, 1] - np.polyval(L['fit'], L['data'][:, 0])) ** 2))))
           for n, L in lines.items()})
json.dump(summary, open(os.path.join(outdir, 'rm3427-fig10-summary.json'), 'w'), indent=1)
print(json.dumps(summary, indent=1))
for r in rows:
    print(r['id'], r['symbol'], f"M {r['M']:.3f}+-{r['M_err']:.3f}  d/h {r['dh']:.4f}+-{r['dh_err']:.4f}  "
          f"(ticks only: {r['M_ticks_only']:.3f}, {r['dh_ticks_only']:.4f})")


# ---- overlay check: read values mapped back to pixels ----
def to_px(m, dh):
    x, y = (m - cm) / km, (dh - cd_) / kd
    for _ in range(20):
        fm, fd = to_data(x, y); h = 0.5
        j11 = (to_data(x + h, y)[0] - fm) / h; j12 = (to_data(x, y + h)[0] - fm) / h
        j21 = (to_data(x + h, y)[1] - fd) / h; j22 = (to_data(x, y + h)[1] - fd) / h
        det = j11 * j22 - j12 * j21
        x += (j22 * (m - fm) - j12 * (dh - fd)) / det
        y += (-j21 * (m - fm) + j11 * (dh - fd)) / det
    return x, y


X0, Y0, X1, Y1, S = 940, 1190, 1600, 1760, 2
im = Image.open(page).convert('RGB').crop((X0, Y0, X1, Y1)).resize(((X1 - X0) * S, (Y1 - Y0) * S), Image.NEAREST)
d = ImageDraw.Draw(im)
Q = lambda x, y: ((x - X0) * S, (y - Y0) * S)
for name, L in lines.items():
    ms = np.linspace(L['data'][:, 0].min(), L['data'][:, 0].max(), 200)
    pp = [Q(*to_px(m, np.polyval(L['fit'], m))) for m in ms]
    d.line([(px, py + 6) for px, py in pp], fill=(220, 0, 220), width=1)  # drawn 3 px below, to see both
    for m, dh, n in L['dashes']:
        px, py = Q(*to_px(m, dh)); d.ellipse([px - 3, py - 3, px + 3, py + 3], outline=(0, 160, 0))
for r in rows:
    px, py = Q(*to_px(r['M'], r['dh']))
    c = (230, 0, 0) if r['symbol'] == 'circle' else (0, 80, 255)
    rad = 7 * S
    (d.ellipse if r['symbol'] == 'circle' else d.rectangle)([px - rad, py - rad, px + rad, py + rad], outline=c)
    d.text((px + rad + 3, py - 6), str(r['id']), fill=c)
for v in xt_v:
    px, py = Q(*to_px(v, 0)); d.line([(px, py), (px, py + 14)], fill=(255, 140, 0), width=2)
for v in yt_v:
    px, py = Q(*to_px(0, v)); d.line([(px - 14, py), (px, py)], fill=(255, 140, 0), width=2)
im.save(os.path.join(outdir, '..', 'overlays', 'rm3427-fig10-overlay.png'))
