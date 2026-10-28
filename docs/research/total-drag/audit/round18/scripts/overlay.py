"""Overlay: colour the Mach 1.7 curves by wing call, mark every reading and box from the readings CSV.
Usage: python3 -I overlay.py image.png calibration.json gridmask.npy readings.csv outdir"""
import sys, json, csv, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
img, cj, gmf, rcsv, outdir = sys.argv[1:6]
a = np.array(Image.open(img).convert('L')) < 128
gm = np.load(gmf)
C = json.load(open(cj))
Acal = np.array([[C['cp'][1], C['cp'][2]], [C['alpha'][1], C['alpha'][2]]]); bcal = np.array([C['cp'][0], C['alpha'][0]])
def px(cpv, alv): return np.linalg.solve(Acal, np.array([cpv, alv]) - bcal)
COL = {'2': (0, 90, 220), '3': (0, 150, 60), '4': (220, 70, 0)}
X0, Y0, X1, Y1 = 1675, 1135, 1800, 1462
ink = a & ~gm
sub = ink[Y0:Y1, X0:X1]
lab, n = ndi.label(sub, structure=np.ones((3, 3)))
seeds = {'3': [(1720,1160),(1718,1185),(1713,1212),(1712,1238),(1710,1260),(1708,1287),(1708,1311),(1710,1338),(1711,1358),(1715,1383),(1716,1410),(1718,1440),(1719,1451)],
         '4': [(1744,1178),(1735,1222),(1735,1255),(1738,1285),(1752,1325),(1770,1360),(1784,1400),(1778,1435)],
         '2': [(1756,1160),(1752,1195),(1749,1220),(1745,1255),(1745,1283),(1743,1315),(1742,1343),(1738,1377),(1733,1400),(1705,1435),(1687,1450)]}
owner = {}
for w, pts in seeds.items():
    for (x, y) in pts:
        best = None
        for r in range(0, 5):
            ys, xs = np.where(lab[max(y-Y0-r,0):y-Y0+r+1, max(x-X0-r,0):x-X0+r+1] > 0)
            if len(xs):
                best = lab[max(y-Y0-r,0)+ys[0], max(x-X0-r,0)+xs[0]]; break
        if best is None: print('seed missed', w, x, y); continue
        owner.setdefault(int(best), set()).add(w)
colour = np.zeros(sub.shape + (3,), np.uint8); has = np.zeros(sub.shape, bool)
yy, xx = np.mgrid[Y0:Y1, X0:X1]
for lid, ws in owner.items():
    m = lab == lid
    if len(ws) == 1:
        w = next(iter(ws)); colour[m] = COL[w]; has |= m
    elif ws == {'2', '3'}:      # wing 3 short dash merged with the wing 2 diagonal
        a3 = m & ((yy < 1413) | ((yy <= 1417) & (xx <= 1718))); a2 = m & ~a3
        colour[a3] = COL['3']; colour[a2] = COL['2']; has |= m
    elif ws == {'2', '4'}:      # crossing zone: straight stroke wing 2, diagonal wing 4
        a2 = m & ((yy < 1309) | (xx <= 1745)); a4 = m & ~a2
        colour[a2] = COL['2']; colour[a4] = COL['4']; has |= m
    else:
        print('unhandled', ws)
# the wing 2 end piece shares a component with a step of the frame line: keep only the piece above the frame
bad = has & (yy >= 1453) & (xx < 1712)
has &= ~bad
def font(sz):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
rows = [r for r in csv.reader(l for l in open(rcsv) if not l.startswith('#'))]
hdr = rows[0]; rows = [dict(zip(hdr, r)) for r in rows[1:]]
def render(x0, y0, x1, y1, sc, out, labels=True, fs=14):
    base = np.full((y1-y0, x1-x0, 3), 255, np.uint8)
    base[a[y0:y1, x0:x1]] = (150, 150, 150)
    # paste curve colours
    ox0, oy0 = max(x0, X0), max(y0, Y0); ox1, oy1 = min(x1, X1), min(y1, Y1)
    if ox1 > ox0 and oy1 > oy0:
        hs = has[oy0-Y0:oy1-Y0, ox0-X0:ox1-X0]; cs = colour[oy0-Y0:oy1-Y0, ox0-X0:ox1-X0]
        region = base[oy0-y0:oy1-y0, ox0-x0:ox1-x0]; region[hs] = cs[hs]
    im = Image.fromarray(base).resize(((x1-x0)*sc, (y1-y0)*sc), Image.NEAREST)
    dr = ImageDraw.Draw(im); F = font(fs)
    def P(x, y): return ((x-x0)*sc, (y-y0)*sc)
    for r in rows:
        cpv, alv = float(r['x']), float(r['y']); xe, ye = float(r['x_err']), float(r['y_err'])
        x, y = px(cpv, alv)
        ser = r['series'].split(';')[0]
        c = COL.get(ser, (0, 0, 0)) if r['kind'] != 'box' else (180, 0, 160)
        if r['kind'] == 'box':
            dx = xe/abs(C['cp'][1]); dy = ye/abs(C['alpha'][2])
            dr.rectangle([P(x-dx, y-dy), P(x+dx, y+dy)], outline=c, width=2)
            if labels: dr.text(P(x+dx+1, y-dy), r['id'], fill=c, font=F)
        else:
            if r['id'].endswith('_end') and not r['id'].endswith('alt'): continue   # same point as *_a0
            rr = 4*sc/2 + 3
            dr.ellipse([P(x, y)[0]-rr, P(x, y)[1]-rr, P(x, y)[0]+rr, P(x, y)[1]+rr], outline=(255, 0, 255) if r['flag'] else (0, 0, 0), width=2)
            dr.line([P(x-3, y), P(x+3, y)], fill=(0, 0, 0), width=1); dr.line([P(x, y-3), P(x, y+3)], fill=(0, 0, 0), width=1)
            off = {'M_a4': (rr+2, 4), 'R_a4': (rr+2, -2*fs-10), 'A_a2': (-rr-2-7*fs, -fs-4), 'R_a2': (rr+2, -fs-4), 'A_a0': (rr+2, -fs-6), 'R_a0': (rr+2, -fs-6)}.get(r['id'], (rr+2, -fs))
            if labels: dr.text((P(x, y)[0]+off[0], P(x, y)[1]+off[1]), '%s %.3f' % (r['id'], cpv), fill=c, font=F)
    return im, dr, F, P
# whole panel
im0, dr, F, P = render(1590, 925, 2125, 1490, 2, None, labels=False, fs=13)
im = Image.new('RGB', (im0.size[0] + 600, im0.size[1]), (255, 255, 255)); im.paste(im0, (0, 0)); dr = ImageDraw.Draw(im)
ty = 70
for r in rows:
    dr.text((im0.size[0] + 10, ty), '%-9s %-13s w%-4s Cp %s +- %s  a %s +- %s %s' % (r['id'], r['kind'], r['series'], r['x'], r['x_err'], r['y'], r['y_err'], r['flag']), fill=(0, 0, 0), font=font(12)); ty += 18
for w, (x, y), txt in [('3', (1676, 1180), 'A: wing 3'), ('4', (1700, 1140), ''), ('2', (1762, 1180), 'R: wing 2')]:
    if txt: dr.text(P(x, y), txt, fill=COL[w], font=font(18))
dr.text(P(1640, 1238), 'M: wing 4', fill=COL['4'], font=font(18))
dr.text((10, 10), 'NACA RM A52E01 fig. 8(a), M=1.2, 1.4, 1.7 panel. Coloured: Mach 1.7 curves alpha 0 to 10 by wing call', fill=(0, 0, 0), font=font(16))
dr.text((10, 32), 'blue wing 2 (long dash), green wing 3 (short dash), orange wing 4 (long-short). Circles: readings (magenta = flagged). Purple boxes: crossings / hidden', fill=(0, 0, 0), font=font(14))
im.save(os.path.join(outdir, 'm17_panel_overlay.png'))
# zoom of low angles
im, dr, F, P = render(1672, 1280, 1800, 1466, 6, None, labels=True, fs=16)
dr.text(P(1674, 1282), 'A wing 3', fill=COL['3'], font=font(22))
dr.text(P(1756, 1290), 'R wing 2', fill=COL['2'], font=font(22))
dr.text(P(1765, 1352), 'M wing 4', fill=COL['4'], font=font(22))
im.save(os.path.join(outdir, 'm17_lowalpha_zoom.png'))
print('done', len(owner), 'components coloured')
