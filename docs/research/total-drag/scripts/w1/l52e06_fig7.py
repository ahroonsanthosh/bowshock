"""NACA RM L52E06 (Hart 1952; NTRS 19930087048) fig. 7 (PDF p. 17, upper half; 300 dpi greyscale): effects of fin
interference on rim and centre base pressure, P_B against M; A, the finless body (long dash: rim; solid: centre); C,
the body with four fins at the base (medium dash: rim; short dash: centre), as the legend's lines lead to the rim
ring or the centre. FIRST READING (W1). Grid: P_B every 0.04, M every 0.05. Calibration cal.py; the curves read
column by column (colruns.py, a band of +-4 px, grid rows excluded), each dark run assigned to its curve by order
and dash pattern on the 0.35x view. Usage: python3 -I l52e06_fig7.py IMGDIR."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal
from colruns import runs_at
IMG = sys.argv[1]
img = '%s/l52e06-17.png' % IMG
c = Cal(img, [(877 + 89 * k, round(-0.24 + 0.04 * k, 2)) for k in range(6)],
        [(546 + 89.3 * k, round(0.65 + 0.05 * k, 2)) for k in range(15)], list(range(560, 1800, 30)),
        list(range(820, 1400, 30)))
c.report('fig. 7')
a = np.array(Image.open(img).convert('L')).astype(int)
grid = [(lambda k, cc: (lambda x: k * x + cc))(k, cc) for v, k, cc in c.h]
for M in [0.95, 1.0, 1.02, 1.04, 1.06, 1.08, 1.1, 1.15, 1.2, 1.25, 1.28]:
    r = runs_at(c, a, M, -0.30, -0.10, W=5, gridrows=grid)
    print('M %.2f: ' % M + '  '.join('%.4f (%.4f..%.4f, %d)' % t for t in r))
