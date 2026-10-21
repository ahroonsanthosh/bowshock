"""Vertical strips around abscissae, side by side, with ordinate ticks.
Usage: python3 -I strips.py <image> <cal.json> <out.png> <v_lo> <v_hi> <dv_tick> <dv_label> <halfwidth_px> <a1> [a2 ...]
Each strip has a red centre line at the abscissa and blue ticks every dv_tick
(longer, labelled, every dv_label) in the calibration's ordinate units."""
import json
import sys
from PIL import Image, ImageDraw

im = Image.open(sys.argv[1]).convert('RGB')
c = json.load(open(sys.argv[2]))
out = sys.argv[3]
vlo, vhi, dt, dl = map(float, sys.argv[4:8])
hw = int(sys.argv[8])
abs_ = [float(a) for a in sys.argv[9:]]
xpx = lambda a: c['x0'] + (a - c['xa']) * (c['x1'] - c['x0']) / (c['xb'] - c['xa'])
ypx = lambda v: c['y0'] + (v - c['v0']) * (c['y1'] - c['y0']) / (c['v1'] - c['v0'])
Y0, Y1 = sorted([ypx(vlo), ypx(vhi)])
Y0, Y1 = int(Y0) - 10, int(Y1) + 10
lab = 46
W = len(abs_) * (2 * hw + 1 + lab)
canvas = Image.new('RGB', (W, Y1 - Y0 + 20), (255, 255, 255))
d = ImageDraw.Draw(canvas)
for k, a in enumerate(abs_):
    x = int(round(xpx(a)))
    strip = im.crop((x - hw, Y0, x + hw + 1, Y1))
    ox = k * (2 * hw + 1 + lab) + lab
    canvas.paste(strip, (ox, 15))
    d.line([(ox + hw, 15), (ox + hw, 15 + Y1 - Y0)], fill=(255, 0, 0))
    d.text((ox + 2, 0), f'{a:g}', fill=(200, 0, 0))
    n = int(round((vhi - vlo) / dt))
    for i in range(n + 1):
        v = vlo + i * dt
        y = ypx(v) - Y0 + 15
        major = abs(v / dl - round(v / dl)) < 1e-6
        d.line([(ox - (12 if major else 5), y), (ox, y)], fill=(0, 0, 255))
        if major:
            d.text((ox - lab + 1, y - 5), f'{v:+.2f}', fill=(0, 0, 160))
canvas.save(out)
print(out, canvas.size)
