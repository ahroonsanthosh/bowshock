"""Zoom of NASA TN D-4014 fig. 4 (chamber axial-force coefficient) with a calibrated ruler.
Calibration: horizontal grid lines found by d4014_grid.py (every 0.01 in CA,c), fitted as y = Y0 - ppu*CA
at x = 1220 with the measured tilt (y grows to the left, slope in px per px); alpha lines from the printed
-4, 0, 4 labels' grid lines (located on zoom views). Ruler: red lines every 0.005, labelled; blue at
each degree. Usage: PAGE PANEL X0 Y0 X1 Y1 SCALE OUT"""
import sys
import numpy as np
from PIL import Image, ImageDraw
CAL = {
    # page, panel: (CA,c values and y at x=1220 of the lines used for the fit), tilt dy/dx, alpha0 x, px/deg
    (23, 'off'): ([(0.12, 366.88), (0.11, 404.39), (0.10, 443.13), (0.09, 482.61), (0.07, 561.24), (0.05, 637.73),
                   (0.03, 715.74), (0.02, 754.76), (0.01, 792.24)], -0.0050),
    (23, 'dF0'): ([(0.07, 1337.78), (0.06, 1374.27), (0.04, 1453.74), (0.03, 1492.56), (0.02, 1530.02),
                   (0.01, 1569.21), (0.0, 1609.16)], -0.0035),
    # page 24 (fig. 4(b), configuration 2): lines from row profiles (dark > 80%) in the band x 1000-1050,
    # next to alpha 0 (x about 1035); tilt from the band x 880-930 (about -1 px per 120 px) applied about x 1025
    (24, 'off'): ([(0.08, 535.5), (0.07, 574.5), (0.06, 614.5), (0.05, 655.0), (0.04, 695.0), (0.03, 734.0),
                   (0.02, 774.0), (0.01, 813.0), (0.0, 854.0)], -0.006, 1025),
    (24, 'dF0'): ([(0.06, 1251.5), (0.05, 1291.0), (0.04, 1331.5), (0.03, 1370.5), (0.02, 1410.5),
                   (0.01, 1450.0), (0.0, 1491.0)], -0.006, 1025),
}
def fit(page, panel):
    pts, tilt = CAL[(page, panel)][:2]
    ca, y = np.array(pts).T
    b, a = np.polyfit(ca, y, 1)
    res = y - (a + b * ca)
    return a, b, tilt, float(np.abs(res).max())
def xref(page, panel):
    e = CAL[(page, panel)]
    return e[2] if len(e) > 2 else 1220
def y_of(page, panel, ca, x):
    a, b, tilt, _ = fit(page, panel)
    return a + b * ca + tilt * (x - xref(page, panel))
def ca_of(page, panel, x, y):
    a, b, tilt, _ = fit(page, panel)
    return (y - tilt * (x - xref(page, panel)) - a) / b
if __name__ == '__main__':
    page = int(sys.argv[1]); panel = sys.argv[2]
    X0, Y0, X1, Y1 = map(int, sys.argv[3:7]); S = float(sys.argv[7]); out = sys.argv[8]
    a, b, tilt, mr = fit(page, panel)
    print('fit: y = %.2f %+.2f*CA at x 1220 (%.2f px per 0.01), max residual %.2f px, tilt %.4f' % (a, b, -b / 100, mr, tilt))
    im = Image.open('img/d4014hi-%d.png' % page).convert('RGB').crop((X0, Y0, X1, Y1))
    im = im.resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for k in range(0, 25):
        ca = 0.005 * k
        ya, yb = y_of(page, panel, ca, X0), y_of(page, panel, ca, X1)
        if Y0 <= ya <= Y1:
            col = (255, 0, 0) if k % 2 == 0 else (255, 150, 150)
            d.line([(0, (ya - Y0) * S), ((X1 - X0) * S, (yb - Y0) * S)], fill=col, width=1)
            d.text((2, (ya - Y0) * S - 11), '%.3f' % ca, fill=(200, 0, 0))
    im.save(out)
