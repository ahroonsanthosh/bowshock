"""Affine calibration of the M=1.2,1.4,1.7 panel of fig 8(a), page 29.
Samples ink centroids along each grid line, fits each line, then a least-squares
affine map from pixel (x,y) to (Cp, alpha) using the labelled lines only.
Usage: python3 -I calib.py image.png out.json"""
import sys, json
import numpy as np
from PIL import Image
a = np.array(Image.open(sys.argv[1]).convert('L')) < 128
out = sys.argv[2]
vx   = [1608.98,1669.05,1730.45,1791.93,1853.04,1914.44,1975.95,2036.98,2099.94]
vval = [0,-.1,-.2,-.3,-.4,-.5,-.6,-.7,-.8]
vlab = [1,0,1,0,1,0,1,0,1]
hy   = [1457.40,1394.96,1330.52,1267.99,1205.02,1141.09,1078.92,1015.05,951.10]
hval = [0,2,4,6,8,10,12,14,16]
hlab = [1,1,1,1,1,1,1,1,0]
ytop, ybot, xl, xr = 951, 1457, 1609, 2100
def run_ok(seg):
    idx = np.where(seg)[0]
    if len(idx) == 0 or idx[0] == 0 or idx[-1] == len(seg)-1: return None
    if idx[-1]-idx[0]+1 != len(idx) or len(idx) > 5: return None
    return idx.mean()
def sv(xc):
    pts = []
    for y in range(ytop+5, ybot-4):
        w0 = int(round(xc)) - 5; m = run_ok(a[y, w0:w0+11])
        if m is not None: pts.append((w0+m, y))
    return np.array(pts)
def sh(yc):
    pts = []
    for x in range(xl+5, xr-4):
        w0 = int(round(yc)) - 5; m = run_ok(a[w0:w0+11, x])
        if m is not None: pts.append((x, w0+m))
    return np.array(pts)
rep = {'vertical': [], 'horizontal': []}
VX, VY, VV, VL = [], [], [], []
for xc, v, lab in zip(vx, vval, vlab):
    p = sv(xc)
    A = np.c_[np.ones(len(p)), p[:,1]]
    c, *_ = np.linalg.lstsq(A, p[:,0], rcond=None)
    r = p[:,0] - A@c
    rep['vertical'].append(dict(value=v, labelled=lab, n=len(p), x_at_y1200=c[0]+c[1]*1200, slope_dx_dy=c[1], rms=float(r.std())))
    VX += list(p[:,0]); VY += list(p[:,1]); VV += [v]*len(p); VL += [lab]*len(p)
HX, HY, HV, HL = [], [], [], []
for yc, v, lab in zip(hy, hval, hlab):
    p = sh(yc)
    A = np.c_[np.ones(len(p)), p[:,0]]
    c, *_ = np.linalg.lstsq(A, p[:,1], rcond=None)
    r = p[:,1] - A@c
    rep['horizontal'].append(dict(value=v, labelled=lab, n=len(p), y_at_x1850=c[0]+c[1]*1850, slope_dy_dx=c[1], rms=float(r.std())))
    HX += list(p[:,0]); HY += list(p[:,1]); HV += [v]*len(p); HL += [lab]*len(p)
VX, VY, VV, VL = map(np.array, (VX, VY, VV, VL)); HX, HY, HV, HL = map(np.array, (HX, HY, HV, HL))
# fit Cp = a0 + a1 x + a2 y on labelled vertical lines; alpha = b0 + b1 x + b2 y on labelled horizontal lines
m = VL == 1
Acp = np.c_[np.ones(m.sum()), VX[m], VY[m]]
ccp, *_ = np.linalg.lstsq(Acp, VV[m], rcond=None)
m2 = HL == 1
Aal = np.c_[np.ones(m2.sum()), HX[m2], HY[m2]]
cal, *_ = np.linalg.lstsq(Aal, HV[m2], rcond=None)
def cp(x, y): return ccp[0] + ccp[1]*x + ccp[2]*y
def al(x, y): return cal[0] + cal[1]*x + cal[2]*y
# residuals per line, in data units and pixels
print('Cp fit: Cp = %.6f + %.8f*x + %.8f*y' % tuple(ccp))
print('alpha fit: alpha = %.6f + %.8f*x + %.8f*y' % tuple(cal))
pxCp = 1/abs(ccp[1]); pxA = 1/abs(cal[2])
print('px per 0.1 Cp: %.3f ; px per 1 deg: %.3f' % (0.1*pxCp, pxA))
print('rotation from vertical lines (dx/dy mean): %.5f rad; horizontal lines (dy/dx mean): %.5f rad' % (
    np.mean([d['slope_dx_dy'] for d in rep['vertical']]), np.mean([d['slope_dy_dx'] for d in rep['horizontal']])))
print('Per-line residuals (fit value minus true), Cp units and px:')
vres = []
for v, lab in zip(vval, vlab):
    mm = VV == v
    r = cp(VX[mm], VY[mm]) - v
    vres.append(dict(value=v, labelled=lab, mean_resid=float(r.mean()), mean_resid_px=float(r.mean()*pxCp), sd=float(r.std())))
    print('  Cp line %5.2f lab=%d mean resid %+.5f (%.2f px) sd %.5f n=%d' % (v, lab, r.mean(), r.mean()*pxCp, r.std(), mm.sum()))
hres = []
for v, lab in zip(hval, hlab):
    mm = HV == v
    r = al(HX[mm], HY[mm]) - v
    hres.append(dict(value=v, labelled=lab, mean_resid=float(r.mean()), mean_resid_px=float(r.mean()*pxA), sd=float(r.std())))
    print('  alpha line %4.1f lab=%d mean resid %+.4f deg (%.2f px) sd %.4f n=%d' % (v, lab, r.mean(), r.mean()*pxA, r.std(), mm.sum()))
rmsCp = float(np.sqrt(np.mean((cp(VX[m],VY[m])-VV[m])**2)))
rmsA = float(np.sqrt(np.mean((al(HX[m2],HY[m2])-HV[m2])**2)))
print('pointwise rms on labelled lines: Cp %.5f, alpha %.4f deg' % (rmsCp, rmsA))
for d in rep['vertical']: print('  V', d)
for d in rep['horizontal']: print('  H', d)
json.dump(dict(cp=list(ccp), alpha=list(cal), px_per_0p1cp=0.1*pxCp, px_per_deg=pxA, rms_cp=rmsCp, rms_alpha=rmsA,
               vres=vres, hres=hres, lines=rep), open(out, 'w'), indent=1)
