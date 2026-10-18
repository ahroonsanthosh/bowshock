import sys
from PIL import Image, ImageDraw
# args: src out x0 x1 ytop_px(CA=1) px_per_unit(CA) camin camax step xalpha0 px_per_deg scale
src,out=sys.argv[1],sys.argv[2]
x0,x1=map(int,sys.argv[3:5]); y1v=float(sys.argv[5]); ppu=float(sys.argv[6])
camin,camax,step=map(float,sys.argv[7:10]); xa0=float(sys.argv[10]); ppd=float(sys.argv[11]); scale=float(sys.argv[12])
def ypx(ca): return y1v + (1.0-ca)*ppu
ya, yb = int(ypx(camax)), int(ypx(camin))
im = Image.open(src).convert('RGB').crop((x0,ya,x1,yb))
im = im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS)
d = ImageDraw.Draw(im)
n = int(round((camax-camin)/step))
for k in range(n+1):
    ca = camin + k*step
    y = (ypx(ca)-ya)*scale
    col = (255,0,0) if abs(round(ca*100)%5)==0 else (255,160,160)
    d.line([(0,y),(im.width,y)], fill=col, width=1)
    d.text((2,y-11), f"{ca:.3f}", fill=(200,0,0))
for a in range(-3,4):
    x=(xa0+a*ppd-x0)*scale
    d.line([(x,0),(x,im.height)], fill=(0,0,255) if a==0 else (120,120,255), width=1)
    d.text((x+2,2), f"a={a}", fill=(0,0,255))
im.save(out)
