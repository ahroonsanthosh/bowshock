import sys, json
import numpy as np
g = json.load(open(sys.argv[1]))
H = {float(k):v for k,v in g['h'].items()}
V = {float(k):v for k,v in g['v'].items()}
pts = []
for xv,(bv,av) in V.items():          # x = av + bv*y
    for yv,(bh,ah) in H.items():      # y = ah + bh*x
        # solve x = av + bv*(ah + bh*x)
        x = (av + bv*ah)/(1 - bv*bh)
        y = ah + bh*x
        pts.append((xv,yv,x,y))
pts = np.array(pts)
np.save(sys.argv[2], pts)
for xv in sorted(V):
    row = pts[pts[:,0]==xv]
    row = row[np.argsort(row[:,1])]
    print(f"d/h={xv:.1f}: " + "  ".join(f"({p[2]:.1f},{p[3]:.1f})" for p in row))
# affine fit pixel -> data
A = np.c_[pts[:,2], pts[:,3], np.ones(len(pts))]
cx,_,_,_ = np.linalg.lstsq(A, pts[:,0], rcond=None)
cy,_,_,_ = np.linalg.lstsq(A, pts[:,1], rcond=None)
rx = A@cx - pts[:,0]; ry = A@cy - pts[:,1]
print("affine residuals d/h: max %.4f rms %.4f" % (abs(rx).max(), np.sqrt((rx**2).mean())))
print("affine residuals p_b : max %.4f rms %.4f" % (abs(ry).max(), np.sqrt((ry**2).mean())))
for p,a,b in zip(pts,rx,ry):
    if abs(a)>0.002 or abs(b)>0.0008: print("  big resid at", p[:2], round(a,4), round(b,4))
# spacings along axes
print("vertical spacing (px) between H lines at each V:")
for xv in sorted(V):
    row = pts[pts[:,0]==xv]; row=row[np.argsort(row[:,1])]
    print(f"  {xv:.1f}:", np.round(np.diff(row[:,3]),1))
print("horizontal spacing (px) between V lines at each H:")
for yv in sorted(H):
    col = pts[pts[:,1]==yv]; col=col[np.argsort(col[:,0])]
    print(f"  {yv:+.2f}:", np.round(np.diff(col[:,2]),1))
