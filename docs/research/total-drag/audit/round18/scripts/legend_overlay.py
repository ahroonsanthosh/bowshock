"""Legend crop with each measured element bracketed and its length in px. Usage: legend_overlay.py image.png out.png"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
a = np.array(Image.open(sys.argv[1]).convert('L')) < 128
x0, y0, x1, y1, sc = 1090, 985, 1495, 1100, 3
els = {1001: [(1314, 1344), (1356, 1389), (1401, 1432), (1445, 1475)],
       1043: [(1314, 1328), (1339, 1354), (1364, 1378), (1390, 1404), (1414, 1430), (1440, 1455), (1464, 1476)],
       1084: [(1313, 1343), (1354, 1366), (1376, 1406), (1417, 1429), (1440, 1472)]}
v = np.full((y1-y0, x1-x0, 3), 255, np.uint8); v[a[y0:y1, x0:x1]] = (120, 120, 120)
im = Image.fromarray(v).resize(((x1-x0)*sc, (y1-y0)*sc), Image.NEAREST); dr = ImageDraw.Draw(im)
f = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
F = ImageFont.truetype(f, 14) if os.path.exists(f) else ImageFont.load_default()
for yc, lst in els.items():
    for k, (a_, b_) in enumerate(lst):
        X0 = (a_-x0)*sc; X1 = (b_+1-x0)*sc; Y = (yc-y0)*sc
        dr.line([(X0, Y+10), (X1, Y+10)], fill=(220, 0, 0), width=2)
        dr.line([(X0, Y+5), (X0, Y+15)], fill=(220, 0, 0), width=2); dr.line([(X1, Y+5), (X1, Y+15)], fill=(220, 0, 0), width=2)
        dr.text((X0 + 2, Y + 14), str(b_-a_+1), fill=(220, 0, 0), font=F)
        if k + 1 < len(lst):
            g = lst[k+1][0] - b_ - 1
            dr.text(((b_+1-x0)*sc + 2, Y - 26), 'g%d' % g, fill=(0, 0, 200), font=F)
dr.text((5, 5), 'Legend, fig. 8(a) M=0.925 panel: element lengths (red) and gaps (blue g) in px', fill=(0, 0, 0), font=F)
im.save(sys.argv[2])
