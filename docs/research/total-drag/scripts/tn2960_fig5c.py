"""NACA TN 2960 (Gowen and Perkins 1953; NTRS 19930084018) fig. 5(c), PDF p. 20 at 300 dpi (page image as
rendered; the plot is upright, its lettering turned): circumferential pressure coefficient P on a 1-inch circular
cylinder normal to the stream at M 1.49 (Re 5.8e5), 1.98 (5.5e5) and 2.90 (7.2e5). FIRST READING (second pending).
Calibration from row and column darkness profiles (grey < 170): P 2.4 to -1.6 every 0.4 at y 446.0 ... 1950.0
(x 700) and 443.5 ... 1945.5 (x 1700); theta 0 to 180 every 20 deg at x 553.5 ... 1915.0 (y 1900) and 551.0 ...
1912.5 (y 500). Mode 'ruler TH0 TH1 P0 P1 S OUT': zoom with lines every 0.05 in P and 5 deg in theta, for reading
symbol centres by eye. Mode 'integrate': integrates the eye readings in READ: total C_D = integral over 0..pi of
P cos(theta) dtheta (pressure drag per unit span on the diameter, both sides symmetric), front side over 0..pi/2,
rear side over pi/2..pi; trapezoid rule on the read points, plus the stagnation value P(0) from the readings."""
import math
import sys
from PIL import Image, ImageDraw
def y_of(P, x):
    y24 = 446.0 + (x - 700) * (443.5 - 446.0) / 1000.0
    ym16 = 1950.0 + (x - 700) * (1945.5 - 1950.0) / 1000.0
    return y24 + (ym16 - y24) * (2.4 - P) / 4.0
def x_of(th, y):
    x0 = 553.5 + (y - 1900) * (551.0 - 553.5) / -1400.0
    x180 = 1915.0 + (y - 1900) * (1912.5 - 1915.0) / -1400.0
    return x0 + (x180 - x0) * th / 180.0
# eye readings (theta deg: P) on img/tn2960/f5c_*.png, symbol centres; see data/tn2960_fig5c_first_reading.txt
READ = {
    # front side from img/tn2960/f5c_front.png (faired curve, or the mean of the +theta and flagged -theta symbols
    # where the curve runs between them); rear side from img/tn2960/f5c_rear.png (faired curve)
    1.49: {0: 1.511, 15: 1.431, 30: 1.172, 45: 0.769, 60: 0.354, 75: -0.002, 90: -0.285, 100: -0.39, 105: -0.434,
           120: -0.457, 135: -0.46, 150: -0.46, 165: -0.46, 180: -0.46},
    1.98: {0: 1.670, 15: 1.577, 30: 1.322, 45: 0.918, 60: 0.464, 75: 0.125, 90: -0.134, 100: -0.221, 105: -0.246,
           120: -0.277, 135: -0.274, 150: -0.274, 165: -0.274, 180: -0.262},
    2.90: {0: 1.750, 15: 1.664, 30: 1.380, 45: 0.979, 60: 0.546, 75: 0.241, 90: 0.020, 100: -0.056, 105: -0.072,
           120: -0.096, 135: -0.096, 150: -0.096, 165: -0.096, 180: -0.096},
}
if __name__ == '__main__' and sys.argv[1] == 'ruler':
    t0, t1, p0, p1, S = map(float, sys.argv[2:7])
    im = Image.open('img/tn2960/p20u.png').convert('RGB')
    X0, X1 = int(x_of(t0, 1200)), int(x_of(t1, 1200))
    Y0, Y1 = int(y_of(p1, X0)), int(y_of(p0, X0))
    z = im.crop((X0, Y0, X1, Y1)).resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.LANCZOS)
    d = ImageDraw.Draw(z)
    k = 0
    while True:
        P = round(p0 + 0.05 * k, 3)
        if P > p1 + 1e-9:
            break
        ya, yb = (y_of(P, X0) - Y0) * S, (y_of(P, X1) - Y0) * S
        m = round(P * 100)
        d.line([(0, ya), (z.size[0], yb)], fill=(255, 0, 0) if m % 20 == 0 else (255, 190, 190))
        if m % 10 == 0:
            d.text((2, ya - 11), '%.2f' % P, fill=(200, 0, 0))
        k += 1
    th = t0
    while th <= t1 + 1e-9:
        xa, xb = (x_of(th, Y0) - X0) * S, (x_of(th, Y1) - X0) * S
        d.line([(xa, 0), (xb, z.size[1])], fill=(0, 0, 255) if round(th) % 10 == 0 else (190, 190, 255))
        if round(th) % 10 == 0:
            d.text((xa + 2, 2), '%d' % round(th), fill=(0, 0, 255))
        th += 5.0
    z.save(sys.argv[7])
    print(z.size)

def pitot_cp(M, g=1.4):
    a = ((g + 1) * M * M / 2) ** (g / (g - 1))
    b = ((g + 1) / (2 * g * M * M - (g - 1))) ** (1 / (g - 1))
    return (a * b - 1) / (g / 2 * M * M)
def trap(pts):
    s = 0.0
    for (t1, p1), (t2, p2) in zip(pts, pts[1:]):
        f1, f2 = p1 * math.cos(math.radians(t1)), p2 * math.cos(math.radians(t2))
        s += 0.5 * (f1 + f2) * math.radians(t2 - t1)
    return s
if __name__ == '__main__' and sys.argv[1] == 'integrate':
    fig7 = {1.49: 1.487, 1.98: 1.424, 2.90: 1.346}
    for M, r in READ.items():
        pts = sorted(r.items())
        fr = trap([q for q in pts if q[0] <= 90])
        re = trap([q for q in pts if q[0] >= 90])
        print('M %.2f: P(0) read %.3f, Rayleigh pitot Cp %.3f; C_D front %.3f, rear %.3f, total %.3f '
              '(fig. 7 first reading %.3f, ratio %.3f); front share %.1f%%; front/Newtonian 4/3 %.3f; '
              'front/(2/3 pitot Cp) %.3f' % (M, r[0], pitot_cp(M), fr, re, fr + re, fig7[M], (fr + re) / fig7[M],
              100 * fr / (fr + re), fr / (4 / 3), fr / (2 / 3 * pitot_cp(M))))
