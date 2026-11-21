import json, numpy as np
cal=json.load(open('/tmp/scratch/f1-readers/B/work/cal.json'))
def vx(p,i,y): a,b=cal[p]['v'][i][:2]; return a+b*y
def hy(p,j,x): a,b=cal[p]['h'][j][:2]; return a+b*x
def pix2val(p,x,y):
    nv=len(cal[p]['v']); nh=len(cal[p]['h'])
    # iterate: x-lines evaluated at y, y-lines at x
    xs=np.array([vx(p,i,y) for i in range(nv)]); ys=np.array([hy(p,j,x) for j in range(nh)])
    M=np.interp(x,xs,0.80+0.02*np.arange(nv),left=np.nan,right=np.nan)
    if x<xs[0]: M=0.80+0.02*(x-xs[0])/(xs[1]-xs[0])
    if x>xs[-1]: M=1.44+0.02*(x-xs[-1])/(xs[-1]-xs[-2])
    vals=cal[p]['ytop']-0.02*np.arange(nh)
    C=np.interp(y,ys,vals)  # ys increasing, vals decreasing ok
    if y<ys[0]: C=vals[0]+0.02*(ys[0]-y)/(ys[1]-ys[0])
    if y>ys[-1]: C=vals[-1]-0.02*(y-ys[-1])/(ys[-1]-ys[-2])
    return float(M),float(C)
def val2pix(p,M,C):
    x=1300.;y=2000.
    nv=len(cal[p]['v']); nh=len(cal[p]['h'])
    if p=='P2': y=2880.
    if p=='P3': y=4000.
    for _ in range(5):
        xs=np.array([vx(p,i,y) for i in range(nv)]); x=float(np.interp(M,0.80+0.02*np.arange(nv),xs))
        ys=np.array([hy(p,j,x) for j in range(nh)]); vals=cal[p]['ytop']-0.02*np.arange(nh)
        y=float(np.interp(-C,-vals,ys))
    return x,y
