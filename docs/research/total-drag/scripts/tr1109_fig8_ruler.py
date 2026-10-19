"""NACA TR 1109 fig. 8 (PDF p. 11 at 300 dpi): base pressure on the thickness group with turbulent flow, (a) M 1.5,
Re 1.7e6, (b) M 2.0, Re 1.7e6, (c) M 3.1, Re 2.6e6. Calibration from row and column darkness profiles (grey < 180):
(a) p_b/p_inf 0.8, 0.6, 0.4, 0.2, 0 at y 289.0, 383.5, 479.0, 574.0, 668.5; (b) 762.5, 856.0, 949.5, 1042.5, 1136.0;
(c) 1232.0, 1325.0, 1418.5, 1512.0, 1603.5 (all at x 1560; lines level within 1.5 px over x 1560 to 2400);
c/[h Re^(1/5)] 0 at x 1561 to 1569 and 5.0 at x 2503.5 to 2504.5 (lean under 8 px over the page).
Ruler zoom per panel: lines every 0.01 in p_b/p_inf (red every 0.05) and every 0.25 in the abscissa.
Usage: python3 -I tr1109_fig8_ruler.py PANEL OUT"""
import sys
from PIL import Image, ImageDraw
CAL = {'a': (289.0, 668.5, 0.40, 0.62), 'b': (762.5, 1136.0, 0.28, 0.50), 'c': (1232.0, 1603.5, 0.12, 0.50)}
def y_of(panel, v):
    y8, y0 = CAL[panel][:2]
    return y0 - (y0 - y8) * v / 0.8
def x_of(u):
    return 1565.0 + (2504.0 - 1565.0) * u / 5.0
if __name__ == '__main__':
    pn, out = sys.argv[1], sys.argv[2]
    vlo, vhi = CAL[pn][2:]
    X0, X1 = int(x_of(0.3)), int(x_of(4.8))
    Y0, Y1 = int(y_of(pn, vhi)), int(y_of(pn, vlo))
    S = 1.6
    im = Image.open('img/tr1109/p11.png').convert('RGB').crop((X0, Y0, X1, Y1))
    im = im.resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    v = round(vlo, 2)
    while v <= vhi + 1e-9:
        y = (y_of(pn, v) - Y0) * S
        d.line([(0, y), ((X1 - X0) * S, y)], fill=(255, 0, 0) if round(v * 100) % 5 == 0 else (255, 185, 185))
        if round(v * 100) % 5 == 0:
            d.text((2, y - 11), '%.2f' % v, fill=(200, 0, 0))
        v = round(v + 0.01, 2)
    u = 0.5
    while u <= 4.75:
        x = (x_of(u) - X0) * S
        d.line([(x, 0), (x, (Y1 - Y0) * S)], fill=(150, 150, 255))
        d.text((x + 2, 2), '%.2f' % u, fill=(0, 0, 255))
        u += 0.25
    im.save(out)
