"""Refine centre-dot positions: for each guess (orig px), take the darkest 5x5-mean spot within +-r px,
then the intensity-weighted centroid of pixels darker than a threshold in a 9x9 box around it.
args: png r  x0px Mx0 ppx  y0px CDy0 ppy  then guesses as x,y pairs"""
import sys
import numpy as np
from PIL import Image
a=sys.argv
im=np.array(Image.open(a[1]).convert('L')).astype(float)
r=int(a[2]); x0p,mx0,ppx,y0p,cy0,ppy=map(float,a[3:9])
for g in a[9:]:
    gx,gy=map(float,g.split(','))
    gx,gy=int(gx),int(gy)
    best=None
    for y in range(gy-r,gy+r+1):
        for x in range(gx-r,gx+r+1):
            m=im[y-2:y+3,x-2:x+3].mean()
            if best is None or m<best[0]: best=(m,x,y)
    m,x,y=best
    box=im[y-4:y+5,x-4:x+5]; w=np.clip(200-box,0,None)
    ys,xs=np.mgrid[y-4:y+5,x-4:x+5]
    cx=(w*xs).sum()/w.sum(); cy=(w*ys).sum()/w.sum()
    print(f"guess {gx},{gy} -> dot ({cx:.1f},{cy:.1f}) min5x5 {m:.0f}  M={(cx-x0p)/ppx+mx0:.3f} CD={(y0p-cy)/ppy+cy0:.4f}")
