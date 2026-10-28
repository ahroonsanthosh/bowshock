# zoomgrid.py page.png calib.json out.png x0 y0 x1 y1 scale
# Nearest-neighbour zoom of a crop, with the fitted grid lines drawn as thin red lines and a pixel ruler every 10 px (blue ticks at edges).
import sys, json
import numpy as np
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
cal = json.load(open(sys.argv[2]))
x0, y0, x1, y1, s = map(int, sys.argv[4:9])
c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * s, (y1 - y0) * s), Image.Resampling.NEAREST)
d = ImageDraw.Draw(c)
for L in cal['vertical']:
    if 'x_at_y1080' not in L: continue
    for yy in range(y0, y1):
        x = L['x_at_y1080'] + L['slope_dx_per_dy'] * (yy - 1080)
        if x0 <= x < x1:
            px = (x - x0 + 0.5) * s
            d.point((px, (yy - y0 + 0.5) * s), fill=(255, 0, 0))
for L in cal['horizontal']:
    if 'y_at_x1588' not in L: continue
    for xx in range(x0, x1):
        y = L['y_at_x1588'] + L['slope_dy_per_dx'] * (xx - 1588)
        if y0 <= y < y1:
            d.point(((xx - x0 + 0.5) * s, (y - y0 + 0.5) * s), fill=(255, 0, 0))
for xx in range(x0 - x0 % 10 + 10, x1, 10):
    d.line([((xx - x0) * s, 0), ((xx - x0) * s, 6 if xx % 50 else 14)], fill=(0, 0, 255))
for yy in range(y0 - y0 % 10 + 10, y1, 10):
    d.line([(0, (yy - y0) * s), (6 if yy % 50 else 14, (yy - y0) * s)], fill=(0, 0, 255))
c.save(sys.argv[3]); print(c.size)
