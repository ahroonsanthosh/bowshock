"""RM A51J25 fig. 7 below M' 1.5: write the first reading from the ink runs
a51_read.py lists. The run taken at each M' is the one holding the faired
curve (with the PARD filled circles on it); the other runs in that column
belong to the open symbols, read separately. At M' 1.50 the curve's run
(935 to 947) touches the bottom of the open symbol s4 (its outline from
915), so its top is uncertain by the square's stroke, 3 px.
Usage: python3 -I a51_emit.py <out.csv>"""
import csv
import sys


# the lines a51_read.py fits (printed by it): M' = AX * x' + BX, p = AY * y' + BY
import numpy as np

xt = np.array([(1.0, 669.8), (2.0, 942.85), (3.0, 1215.85), (4.0, 1488.97)])
yt = np.array([(1.0, 598.5), (0.8, 732.0), (0.6, 862.46), (0.4, 994.5), (0.2, 1126.42), (0.0, 1255.5)])
ax, bx = np.polyfit(xt[:, 1], xt[:, 0], 1)
ay, by = np.polyfit(yt[:, 1], yt[:, 0], 1)


def mval(x, y):
    return ax * (x - 0.0057 * (y - 1252.0)) + bx


def pval(x, y):
    return ay * (y + 0.008 * (x - 680.0)) + by


BAND = [(722, 865, 897, ''), (736, 888, 912, ''), (750, 898, 913, ''), (763, 904, 921, ''),
        (777, 914, 930, ''), (791, 922, 938, ''), (804, 935, 947, 'the top touches symbol s4: +-3 px more')]
SYM = [('f1', 'filled circle (Langley PARD), the curve\'s upper end', 719.5, 871.5, 3.0),
       ('s1', 'square with a triangle inside (the legend\'s Langley 9 x 12 in delta symbol, or an Ames square over a triangle)', 738.0, 929.0, 2.0),
       ('s2', 'half-filled triangle (the legend\'s Langley 9 in, two-dimensional)', 781.0, 907.0, 2.5),
       ('s3', 'diamond (Langley 9 x 12 in, rectangular)', 783.6, 952.0, 2.0),
       ('s4', 'square with a triangle inside (as s1)', 805.0, 924.0, 2.0)]
pp = abs(ay)
with open(sys.argv[1], 'w', newline='') as f:
    f.write('# NACA RM A51J25 (Chapman, 1951; NTRS 20030067332, sha256 97fa733b...80bf5e0b9bf), fig. 7 "Airfoils, base pressure\n')
    f.write("# versus Mach number\", PDF p. 14 (printed p. 26): p_b/p' against M', BELOW M' 1.5 only. FIRST reading for 0019 (W7),\n")
    f.write('# 2026-10-22, blind to rounds 4 and 10. 300 dpi render of a 1-bit scan. band rows: the ink of the faired curve with the\n')
    f.write('# PARD filled circles drawn on it (not separable), top and bottom edges in p_b/p\' at the M\' given, its midpoint, and\n')
    f.write("# err = half the band plus 1.5 px of calibration. symbol rows: open symbols and the one separable filled circle, centres\n")
    f.write('# by hand (err = placement px in p). Method: method_rma51j25_fig7.md.\n')
    w = csv.writer(f)
    w.writerow(['kind', 'id', 'mach_prime', 'px_x', 'px_y_top', 'px_y_bottom', 'p_top', 'p_bottom', 'p_mid', 'p_err', 'note'])
    for x, t, b, note in BAND:
        m = mval(x, (t + b) / 2)
        pt, pb = pval(x, t), pval(x, b)
        w.writerow(['band', f'b{m:.2f}', f'{m:.3f}', x, t, b, f'{pt:.4f}', f'{pb:.4f}', f'{(pt + pb) / 2:.4f}',
                    f'{(pt - pb) / 2 + 1.5 * pp + (3 * pp if note else 0):.4f}', note])
    for i, name, x, y, e in SYM:
        w.writerow(['symbol', i, f'{mval(x, y):.3f}', x, y, '', '', '', f'{pval(x, y):.4f}', f'{(e + 1.5) * pp:.4f}', name])
