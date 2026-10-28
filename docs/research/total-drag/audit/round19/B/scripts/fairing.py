import sys, json
import numpy as np
from PIL import Image
img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
c = json.load(open(sys.argv[2]))
V = {0.0:(241.50,-0.01034), 0.2:(445.59,-0.01095), 0.4:(651.11,-0.01367), 0.6:(847.78,-0.01281), 0.8:(1050.43,-0.01350), 1.0:(1252.18,-0.01507)}
H = {-0.32:(2144.99,0.00976), -0.24:(2342.10,0.00946), -0.16:(2536.33,0.01020), -0.08:(2731.22,0.00966), 0.0:(2925.77,0.00979)}
TH=130
def runs_col(x, y0, y1):
    col = img[y0:y1, x]
    out=[]; inr=False
    for i,v in enumerate(col):
        if v<TH and not inr: inr=True; s=i
        if v>=TH and inr:
            inr=False; w=np.clip(TH-col[s:i],0,None); out.append((y0+(w*np.arange(s,i)).sum()/w.sum(), i-s, col[s:i].min()))
    return out
def near_vgrid(x, y):
    return any(abs(x-(a+b*y))<3 for a,b in V.values())
def near_hgrid(x, y):
    return any(abs(y-(a+b*x))<3 for a,b in H.values())
syms = {k:(v['x'],v['y']) for k,v in c.items()}
def near_symbol(x,y,me):
    return any(np.hypot(x-sx,y-sy)<9.5 for k,(sx,sy) in syms.items())
def fair_offset(name, side_range=(10,30), ywin=16, guess_slope=0.0):
    cx, cy = syms[name]
    pts=[]
    for dx in list(range(-side_range[1], -side_range[0]+1)) + list(range(side_range[0], side_range[1]+1)):
        x = int(round(cx+dx))
        if near_vgrid(x, cy): continue
        rs = [r for r in runs_col(x, int(cy-ywin+guess_slope*dx), int(cy+ywin+guess_slope*dx)) if r[1]>=2]
        rs = [r for r in rs if not near_hgrid(x, r[0]) or r[1]>=4]
        rs = [r for r in rs if not near_symbol(x, r[0], name)]
        if not rs: continue
        exp = cy + guess_slope*dx
        r = min(rs, key=lambda r: abs(r[0]-exp))
        pts.append((x, r[0]))
    pts=np.array(pts)
    L = pts[pts[:,0]<cx]; R = pts[pts[:,0]>cx]
    deg = 2 if len(L)>3 and len(R)>3 else 1
    p = np.polyfit(pts[:,0]-cx, pts[:,1], deg)
    yf = np.polyval(p, 0); slope = np.polyval(np.polyder(p), 0)
    resid = np.std(pts[:,1]-np.polyval(p, pts[:,0]-cx))
    perp = (cy-yf)/np.sqrt(1+slope**2)
    return yf, slope, resid, len(L), len(R), perp
for n in ['C1','C2','C3','C4','C5','C6','T1','T2','T3','T4','S1','S2','S3','S4']:
    try:
        yf, sl, rs, nl, nr, perp = fair_offset(n)
        cy = syms[n][1]
        print(f'{n}: centre y={cy:.1f} fairing y={yf:.1f} (slope {sl:+.2f}, resid {rs:.2f}, nL={nl} nR={nr})  vertical offset={cy-yf:+.1f} px = {(cy-yf)*0.08/195:+.4f} in p (positive = symbol below fairing, less negative); perpendicular {perp:+.1f} px')
    except Exception as e:
        print(n, 'fail', e)
