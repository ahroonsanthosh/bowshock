"""Grid-cleaned crop with a value ruler.
args: src out x0 x1 vmin vmax step  ytop_px vtop ppu  xa0 ppd  L scale"""
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, sys.argv[0].rsplit('/',1)[0])
from clean import clean
src,out=sys.argv[1],sys.argv[2]
x0,x1=map(int,sys.argv[3:5]); vmin,vmax,step=map(float,sys.argv[5:8])
ytop,vtop,ppu=map(float,sys.argv[8:11]); xa0,ppd=map(float,sys.argv[11:13]); L=int(sys.argv[13]); scale=float(sys.argv[14])
def ypx(v): return ytop + (vtop-v)*ppu
ya,yb=int(ypx(vmax)),int(ypx(vmin))
a=np.array(Image.open(src).convert('L'))
pad=40
c=clean(a[ya-pad:yb+pad, x0-pad:x1+pad], L)[pad:-pad,pad:-pad]
raw=a[ya:yb,x0:x1]
rgb=np.stack([np.where(c,0,255)]*3,axis=-1).astype(np.uint8)
# show removed grid pixels faintly
g=(raw<128)&~c
rgb[g]=[215,215,215]
im=Image.fromarray(rgb).resize((int((x1-x0)*scale),int((yb-ya)*scale)),Image.NEAREST)
d=ImageDraw.Draw(im)
n=int(round((vmax-vmin)/step))
for k in range(n+1):
    v=vmin+k*step; y=(ypx(v)-ya)*scale
    major = abs((v/ (step*5)) - round(v/(step*5)))<1e-6
    d.line([(0,y),(im.width,y)],fill=(255,0,0) if major else (255,170,170),width=1)
    if major: d.text((2,y-11),f"{v:.3f}",fill=(200,0,0))
for a_ in range(-4,5):
    x=(xa0+a_*ppd-x0)*scale
    if 0<=x<=im.width:
        d.line([(x,0),(x,im.height)],fill=(0,0,255),width=1); d.text((x+2,2),f"a{a_}",fill=(0,0,255))
im.save(out)
