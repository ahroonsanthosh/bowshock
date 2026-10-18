"""NACA RM L55G28a (NTRS 19930088905) fig. 5, PDF p. 22 at 300 dpi rotated -90 deg: total CD of model 1 against M,
M 2.5 to 3.0 (telemeter circles). First reading; a second, independent reading is pending.
Calibration: column profiles (grey < 150, dark > 70%) give vertical lines every 0.1 in M, M 0 at x 422.0 and
M 8 at x 2716.0 (286.75 px per unit M, same within 1 px at y 500, 1000, 1350); row profiles give horizontal lines
every 0.02 in CD, CD 0 at y 1462.5 and 0.8 at y 331.5 (x 700; 1413.75 px per unit), same within 2 px at x 1500.
Circles: ring template, radius 11 to 15 px (+-1), score = ring dark fraction minus half the dark fraction 5 px
inside; maxima at least 18 px apart, score >= 0.55."""
import numpy as np
from PIL import Image
a = np.array(Image.open('img/l55/f5r.png').convert('L')).astype(int)
dark = a < 150
M_of = lambda x: (x - 422.0) / 286.75
CD_of = lambda y: (1462.5 - y) / 1413.75
t = np.arange(0, 2 * np.pi, 2 * np.pi / 160)
res = []
for r in (11, 12, 13, 14, 15):
    for x in range(1110, 1300):
        for y in range(880, 1010):
            hit = 0
            for dr in (-1, 0, 1):
                xs = np.round(x + (r + dr) * np.cos(t)).astype(int); ys = np.round(y + (r + dr) * np.sin(t)).astype(int)
                hit += dark[ys, xs].sum()
            xi = np.round(x + (r - 5) * np.cos(t[::3])).astype(int); yi = np.round(y + (r - 5) * np.sin(t[::3])).astype(int)
            res.append((hit / (3 * len(t)) - 0.5 * dark[yi, xi].mean(), x, y, r))
res.sort(reverse=True)
picked = []
for s, x, y, r in res:
    if s < 0.55:
        break
    if all((x - px) ** 2 + (y - py) ** 2 > 18 ** 2 for _, px, py, _ in picked):
        picked.append((s, x, y, r))
print('x      y     r  score  M      CD')
for s, x, y, r in sorted(picked, key=lambda q: q[1]):
    print('%5d %5d %3d  %.2f  %.3f  %.4f' % (x, y, r, s, M_of(x), CD_of(y)))
