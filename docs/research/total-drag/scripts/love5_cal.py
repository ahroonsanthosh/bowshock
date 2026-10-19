"""NACA TN 3819 fig. 5 (PDF p. 36 at 300 dpi): two-dimensional base pressures. Calibration from row and column
darkness profiles (grey < 170, dark > 70% over 30 px bands): horizontal lines every 0.04 in P_B, P_B = 0 at
y 2562.0 (x 520), 2563.5 (x 1100), 2565.5 (x 1900), -0.80 at 485.5, 486.0, 488.5 (2596 px per unit); vertical
lines every 0.2 in M, M 1.0 at x 459.5 (y 600) and 457.5 (y 2450), M 4.0 at 2019.5 and 2016.5 (520 px per unit).
Ruler zoom: python3 -I love5_cal.py M0 M1 P0 P1 SCALE OUT (lines every 0.01 in P_B and 0.05 in M)."""
import sys
from PIL import Image, ImageDraw
def y_of(P, x):
    y0 = 2562.0 + (x - 520) * (3.5 / 1380)
    ytop = 485.5 + (x - 520) * (3.0 / 1380)
    return y0 + (y0 - ytop) * P / 0.80
def x_of(M, y):
    x1 = 459.5 + (y - 600) * (-2.0 / 1850)
    x4 = 2019.5 + (y - 600) * (-3.0 / 1850)
    return x1 + (x4 - x1) * (M - 1.0) / 3.0
def P_of(x, y):
    y0 = 2562.0 + (x - 520) * (3.5 / 1380)
    ytop = 485.5 + (x - 520) * (3.0 / 1380)
    return -0.80 * (y0 - y) / (y0 - ytop)
def M_of(x, y):
    x1 = 459.5 + (y - 600) * (-2.0 / 1850)
    x4 = 2019.5 + (y - 600) * (-3.0 / 1850)
    return 1.0 + 3.0 * (x - x1) / (x4 - x1)
if __name__ == '__main__':
    M0, M1, P0, P1, S = map(float, sys.argv[1:6]); out = sys.argv[6]
    X0 = int(x_of(M0, 1500)); X1 = int(x_of(M1, 1500)); Y0 = int(y_of(P0, X0)); Y1 = int(y_of(P1, X0))
    im = Image.open('img/love2d/p36.png').convert('RGB').crop((X0, Y0, X1, Y1))
    im = im.resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    k = 0
    while True:
        P = round(P0 + 0.01 * k, 3)
        if P > P1 + 1e-9:
            break
        ya, yb = (y_of(P, X0) - Y0) * S, (y_of(P, X1) - Y0) * S
        col = (255, 0, 0) if round(P * 100) % 4 == 0 else (255, 170, 170)
        d.line([(0, ya), ((X1 - X0) * S, yb)], fill=col)
        d.text((2, ya - 11), '%.2f' % P, fill=(200, 0, 0))
        k += 1
    k = 0
    while True:
        M = round(M0 + 0.05 * k, 3)
        if M > M1 + 1e-9:
            break
        xa, xb = (x_of(M, Y0) - X0) * S, (x_of(M, Y1) - X0) * S
        d.line([(xa, 0), (xb, (Y1 - Y0) * S)], fill=(0, 0, 255) if round(M * 100) % 10 == 0 else (170, 170, 255))
        if round(M * 100) % 10 == 0:
            d.text((xa + 2, 2), '%.1f' % M, fill=(0, 0, 255))
        k += 1
    im.save(out)
