"""NACA TR 1109 fig. 8: close ruler zoom of one panel over an abscissa window, for reading symbol centres by eye.
Lines every 0.005 in p_b/p_inf (red every 0.05, dark pink every 0.01) and every 0.05 in c/[h Re^(1/5)] (blue every
0.25). Calibration tr1109_fig8_ruler.py. Usage: python3 -I tr1109_fig8_zoom.py PANEL U0 U1 V0 V1 SCALE OUT"""
import os
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tr1109_fig8_ruler as r
pn = sys.argv[1]
u0, u1, v0, v1, S = map(float, sys.argv[2:7])
out = sys.argv[7]
X0, X1 = int(r.x_of(u0)), int(r.x_of(u1))
Y0, Y1 = int(r.y_of(pn, v1)), int(r.y_of(pn, v0))
im = Image.open('img/tr1109/p11.png').convert('RGB').crop((X0, Y0, X1, Y1))
im = im.resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.LANCZOS)
d = ImageDraw.Draw(im)
k = 0
while True:
    v = round(v0 + 0.005 * k, 3)
    if v > v1 + 1e-9:
        break
    y = (r.y_of(pn, v) - Y0) * S
    m = round(v * 1000)
    col = (255, 0, 0) if m % 50 == 0 else ((240, 120, 120) if m % 10 == 0 else (255, 215, 215))
    d.line([(0, y), ((X1 - X0) * S, y)], fill=col)
    if m % 10 == 0:
        d.text((2, y - 11), '%.2f' % v, fill=(200, 0, 0))
    k += 1
k = 0
while True:
    u = round(u0 + 0.05 * k, 3)
    if u > u1 + 1e-9:
        break
    x = (r.x_of(u) - X0) * S
    d.line([(x, 0), (x, (Y1 - Y0) * S)], fill=(0, 0, 255) if round(u * 100) % 25 == 0 else (190, 190, 255))
    if round(u * 100) % 25 == 0:
        d.text((x + 2, 2), '%.2f' % u, fill=(0, 0, 255))
    k += 1
im.save(out)
