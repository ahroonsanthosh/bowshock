"""Find plotted symbols in a strip of a scanned plot.
args: page.png  x0 x1 y0 y1  L  ytop(CA=1 value px) ppu  yval_at_ytop
Prints connected components (8-connected) of the grid-cleaned mask within the strip,
with bbox and centre converted to plot units: val = yval_top - (y - ytop)/ppu."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, sys.argv[0].rsplit('/',1)[0])
from clean import clean
src = sys.argv[1]
x0,x1,y0,y1,L = map(int, sys.argv[2:7])
ytop, ppu, vtop = map(float, sys.argv[7:10])
xa0 = float(sys.argv[10]); ppd = float(sys.argv[11])
a = np.array(Image.open(src).convert('L'))
pad = 40
sub = a[y0-pad:y1+pad, x0-pad:x1+pad]
m = clean(sub, L)[pad:-pad, pad:-pad]
H, W = m.shape
seen = np.zeros_like(m)
comps = []
for i in range(H):
    for j in range(W):
        if m[i,j] and not seen[i,j]:
            stack=[(i,j)]; seen[i,j]=True; pts=[]
            while stack:
                p,q = stack.pop(); pts.append((p,q))
                for dp in (-1,0,1):
                    for dq in (-1,0,1):
                        r,s = p+dp, q+dq
                        if 0<=r<H and 0<=s<W and m[r,s] and not seen[r,s]:
                            seen[r,s]=True; stack.append((r,s))
            ys=[p for p,_ in pts]; xs=[q for _,q in pts]
            comps.append((min(ys),max(ys),min(xs),max(xs),len(pts)))
for (ya,yb,xa,xb,n) in sorted(comps):
    h=yb-ya+1; w=xb-xa+1
    if n < 25 or h < 8: continue
    yc=(ya+yb)/2+y0; xc=(xa+xb)/2+x0
    print(f"y {ya+y0:5d}-{yb+y0:5d} x {xa+x0:5d}-{xb+x0:5d} h{h:3d} w{w:3d} n{n:4d}  val_c={vtop-(yc-ytop)/ppu:.4f} top={vtop-(ya+y0-ytop)/ppu:.4f} bot={vtop-(yb+y0-ytop)/ppu:.4f} alpha_c={(xc-xa0)/ppd:+.2f}")
