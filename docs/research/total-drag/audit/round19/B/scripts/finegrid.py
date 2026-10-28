import sys, json
import numpy as np
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
aff = json.load(open(sys.argv[2]))
cx, cy = np.array(aff['cx']), np.array(aff['cy'])
# invert affine: data -> pixel
M = np.array([[cx[0], cx[1]], [cy[0], cy[1]]]); b = np.array([cx[2], cy[2]])
Mi = np.linalg.inv(M)
def px(dh, p): return Mi @ (np.array([dh, p]) - b)
d = ImageDraw.Draw(im)
for k in range(0, 51):
    dh = k*0.02
    a, c = px(dh, 0.0), px(dh, -0.32)
    d.line([tuple(a), tuple(c)], fill=(255,0,0) if k%5==0 else (255,170,170), width=1)
for k in range(0, 33):
    p = -k*0.01
    a, c = px(0.0, p), px(1.0, p)
    d.line([tuple(a), tuple(c)], fill=(0,0,255) if k%8==0 else (150,170,255), width=1)
x0,y0,x1,y1 = [int(v) for v in sys.argv[4:8]]
cr = im.crop((x0,y0,x1,y1)); cr = cr.resize((cr.width*int(sys.argv[8]), cr.height*int(sys.argv[8])), Image.LANCZOS); cr.save(sys.argv[3])
