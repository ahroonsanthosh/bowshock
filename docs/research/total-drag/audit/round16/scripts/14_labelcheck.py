# Check the printed tick labels against the gridlines they name.
# y labels: ink (darkness > 110) in columns 300-398 within +-22 px of the line's row at the
#   left frame; report the vertical centroid of the ink minus the line's row.
# x labels: ink in rows 2283-2330 within +-30 px of the line's column at the bottom frame;
#   report the horizontal centroid minus the line's column (minus signs pull it left), and
#   the centroid of the ink right of the minus sign (digits only) for negative labels.
import sys, json
import numpy as np
from PIL import Image
D = 255 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
G = json.load(open(sys.argv[2]))
names_y = ['-.40', '-.36', '-.32', '-.28', '-.24', '-.20', '-.16', '-.12', '-.08', '-.04', '0', '.04', '.08']
names_x = ['1.0', '.8', '.6', '.4', '.2', '0', '-.2', '-.4', '-.6', '-.8', '-1.0', '-1.2', '-1.4']
print('y labels: label, line row at x=409, ink centroid row, offset px')
for k, i in enumerate(range(0, 25, 2)):
    l = G['horizontal'][i]; yl = l['a'] + l['b'] * (409 - 1200)
    y0 = int(yl - 22); win = D[y0:int(yl + 23), 300:399]
    w = np.where(win > 110, win, 0)
    yc = y0 + (w.sum(axis=1) * np.arange(w.shape[0])).sum() / w.sum()
    print('  %5s  %8.2f  %8.2f  %+.2f' % (names_y[k], yl, yc, yc - yl))
print('x labels: label, line column at y=2272, ink centroid column, offset px, digits-only offset')
for k, i in enumerate(range(0, 26, 2)):
    if k >= len(names_x): break
    l = G['vertical'][i]; xl = l['a'] + l['b'] * (2272 - 1500)
    x0 = int(xl - 30); win = D[2283:2331, x0:int(xl + 31)]
    w = np.where(win > 110, win, 0)
    colsum = w.sum(axis=0)
    xc = x0 + (colsum * np.arange(len(colsum))).sum() / colsum.sum()
    # digits only: drop ink columns of a leading minus (ink only in a short row band)
    rows_with = (w > 0).sum(axis=0)
    cols = np.where(colsum > 0)[0]
    tall = cols[rows_with[cols] >= 6]
    xd = x0 + (colsum[tall] * tall).sum() / colsum[tall].sum() if len(tall) else float('nan')
    print('  %5s  %8.2f  %8.2f  %+.2f  %+.2f' % (names_x[k], xl, xc, xc - xl, xd - xl))
