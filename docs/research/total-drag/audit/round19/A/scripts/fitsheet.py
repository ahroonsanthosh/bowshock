import sys, json
import numpy as np
from PIL import Image, ImageDraw
raw = Image.open(sys.argv[1]).convert('RGB')
f = json.load(open(sys.argv[2]))
z = 10; half = 14
names = list(f.keys())
groups = [names[0:5], names[5:10], names[10:15]]
for gi,grp in enumerate(groups):
    W = 2*half*z
    sheet = Image.new('RGB', (len(grp)*(W+8), W+22), (255,255,255))
    d = ImageDraw.Draw(sheet)
    for i,n in enumerate(grp):
        info = f[n]; cx, cy = info['px'], info['py']
        x0, y0 = round(cx)-half, round(cy)-half
        c = raw.crop((x0,y0,x0+2*half,y0+2*half)).resize((W,W), Image.NEAREST)
        dd = ImageDraw.Draw(c)
        def P(x,y): return ((x - x0 + 0.5)*z, (y - y0 + 0.5)*z)   # pixel centres
        k = info['kind']
        if k=='o':
            rx, ry = info['s1'], info['s2']
            pts = [P(cx+rx*np.cos(t), cy+ry*np.sin(t)) for t in np.linspace(0,2*np.pi,90)]
            dd.line(pts+[pts[0]], fill=(255,0,0), width=2)
        elif k=='s':
            a,b = info['s1'], info['s2']
            pts = [P(cx-a,cy-b),P(cx+a,cy-b),P(cx+a,cy+b),P(cx-a,cy+b)]
            dd.line(pts+[pts[0]], fill=(255,0,0), width=2)
        else:
            bw,h = info['s1'], info['s2']
            pts = [P(cx,cy-2*h/3),P(cx+bw/2,cy+h/3),P(cx-bw/2,cy+h/3)]
            dd.line(pts+[pts[0]], fill=(255,0,0), width=2)
            bx,by = P(cx, info['py_bboxmid']); dd.ellipse((bx-4,by-4,bx+4,by+4), outline=(0,160,0), width=2)
        X,Y = P(cx,cy)
        dd.line((X-12,Y,X+12,Y), fill=(0,0,255), width=2); dd.line((X,Y-12,X,Y+12), fill=(0,0,255), width=2)
        sheet.paste(c,(i*(W+8),20))
        d.text((i*(W+8)+4,4), f"{n} ({cx:.1f},{cy:.1f})", fill=(0,0,0))
    sheet.save(f'fitsheet{gi}.png')
