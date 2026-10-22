"""NACA RM L52E06 (Hart 1952; NTRS 19930087048) fig. 8 (PDF p. 17, lower half; 300 dpi greyscale): base-drag
coefficient C_DB of A (the finless PARD body, solid) and C (four flat-plate fins at the base, dashed), rim and centre
pressures over their areas, against M, free flight. FIRST READING (W2: the base below Mach 1.5). Grid lines found
as dark-row and dark-column peaks: C_DB every 0.04 (0.28 at y 1895 to 0 at 2517), M every 0.05 (0.60 at x 469 to
1.40 at 1895). The curves read column by column (colruns.py, a band of +-5 px, grid rows excluded); at each M the
runs are listed from the top (the larger C_DB): above M 1.0 the upper run is A's. Usage: python3 -I l52e06_fig8.py
IMGDIR."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal
from colruns import runs_at
IMG = sys.argv[1]
img = '%s/l52e06-17.png' % IMG
hl = [(1895, 0.28), (1983, 0.24), (2072, 0.20), (2162, 0.16), (2251, 0.12), (2339, 0.08), (2429, 0.04), (2517, 0.0)]
vl = [(469 + 89.1 * k, round(0.60 + 0.05 * k, 2)) for k in range(17)]
c = Cal(img, hl, vl, list(range(500, 1850, 40)), list(range(1910, 2500, 40)))
c.report('fig. 8')
a = np.array(Image.open(img).convert('L')).astype(int)
grid = [(lambda k, cc: (lambda x: k * x + cc))(k, cc) for v, k, cc in c.h]
for M in [0.95, 0.975, 1.0, 1.025, 1.04, 1.045, 1.05, 1.055, 1.06, 1.075, 1.1, 1.15, 1.2, 1.25, 1.28]:
    r = runs_at(c, a, M, 0.27, 0.13, W=5, gridrows=grid)
    print('M %.3f: ' % M + '  '.join('%.4f (%.4f..%.4f, %d)' % t for t in r))
    # A, the adopted value from M 1.025: the largest run of at least two columns below 0.2395, where the 0.24
    # gridline's excluded rows begin (at M 1.04 to 1.06 the curve runs along that line: error +-0.0012 there).
    cand = [t for t in r if t[3] >= 2 and t[0] < 0.2395]
    if M >= 1.025 and cand:
        print('  A at M %.3f: %.4f' % (M, max(t[0] for t in cand)))
