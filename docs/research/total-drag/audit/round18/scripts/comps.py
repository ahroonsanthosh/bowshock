"""Connected components of non-grid ink in a window. Prints geometry in px and data units,
writes a labelled colour view. Usage: comps.py img.png gridmask.npy calib.json x0 y0 x1 y1 scale out.png out.json"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
img, gmf, cj = sys.argv[1:4]
x0, y0, x1, y1 = map(int, sys.argv[4:8]); sc = int(sys.argv[8]); outp, outj = sys.argv[9:11]
a = np.array(Image.open(img).convert('L')) < 128
gm = np.load(gmf)
C = json.load(open(cj))
def cp(x, y): return C['cp'][0] + C['cp'][1]*x + C['cp'][2]*y
def al(x, y): return C['alpha'][0] + C['alpha'][1]*x + C['alpha'][2]*y
ink = a & ~gm
sub = ink[y0:y1, x0:x1]
lab, n = ndi.label(sub, structure=np.ones((3,3)))
comps = []
for i in range(1, n+1):
    ys, xs = np.where(lab == i)
    if len(xs) < 4: continue
    X = xs + x0; Y = ys + y0
    mx, my = X.mean(), Y.mean()
    P = np.c_[X-mx, Y-my]
    w, v = np.linalg.eigh(np.cov(P.T) if len(X) > 2 else np.eye(2))
    d = v[:, 1]  # major axis
    if d[1] < 0: d = -d   # point downward (increasing y)
    t = P @ d
    tn = P @ v[:, 0]
    L = t.max() - t.min() + 1
    T = tn.max() - tn.min() + 1
    e1 = (mx + d[0]*t.min(), my + d[1]*t.min()); e2 = (mx + d[0]*t.max(), my + d[1]*t.max())
    comps.append(dict(id=len(comps)+1, n=int(len(X)), bbox=[int(X.min()), int(Y.min()), int(X.max()), int(Y.max())],
        cx=float(mx), cy=float(my), length=float(L), width=float(T), angle_deg_from_vertical=float(np.degrees(np.arctan2(d[0], d[1]))),
        top=[float(e1[0]), float(e1[1])], bottom=[float(e2[0]), float(e2[1])],
        cp_c=float(cp(mx,my)), al_c=float(al(mx,my)),
        cp_top=float(cp(*e1)), al_top=float(al(*e1)), cp_bot=float(cp(*e2)), al_bot=float(al(*e2)), _lab=i))
comps.sort(key=lambda c: (c['cx']))
for k, c in enumerate(comps): c['id'] = k+1
print('id   n   bbox(x0,y0,x1,y1)        cx      cy     L    W   ang   top(Cp,al)        bot(Cp,al)')
for c in comps:
    print('%3d %4d %-24s %7.1f %7.1f %5.1f %4.1f %5.1f  (%.3f,%5.2f)  (%.3f,%5.2f)' % (c['id'], c['n'], c['bbox'], c['cx'], c['cy'], c['length'], c['width'], c['angle_deg_from_vertical'], c['cp_top'], c['al_top'], c['cp_bot'], c['al_bot']))
# view
v = np.full((y1-y0, x1-x0, 3), 255, np.uint8)
v[a[y0:y1, x0:x1]] = (190, 190, 255)
rng = np.random.default_rng(3)
cols = {}
for c in comps:
    col = tuple(int(q) for q in rng.integers(0, 200, 3))
    v[lab == c['_lab']] = col
    cols[c['id']] = col
im = Image.fromarray(v).resize(((x1-x0)*sc, (y1-y0)*sc), Image.NEAREST)
dr = ImageDraw.Draw(im)
for c in comps:
    dr.text(((c['bbox'][2]-x0)*sc + 3, (c['cy']-y0)*sc - 5), str(c['id']), fill=(255, 0, 0))
im.save(outp)
for c in comps: c.pop('_lab')
json.dump(comps, open(outj, 'w'), indent=1)
