# strokeprof.py page.png orient centre lo hi a b
# orient v: vertical stroke near x=centre; for each row y in [a,b) print integrated darkness and width (px above half max) of the
#           profile x in [centre+lo, centre+hi]. orient h: same for a horizontal stroke near y=centre, over columns x in [a,b).
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]), dtype=float)
ink = np.clip((235.0 - a) / 235.0, 0, 1)
o = sys.argv[2]; c = int(sys.argv[3]); lo = int(sys.argv[4]); hi = int(sys.argv[5]); s0 = int(sys.argv[6]); s1 = int(sys.argv[7])
for t in range(s0, s1):
    p = ink[t, c + lo:c + hi + 1] if o == 'v' else ink[c + lo:c + hi + 1, t]
    w = (p > 0.5).sum()
    cen = (p * np.arange(c + lo, c + hi + 1)).sum() / max(p.sum(), 1e-9)
    print(t, 'sum %.2f' % p.sum(), 'w>0.5 %d' % w, 'cen %.1f' % cen, ''.join(' .:-=+*#%@'[min(int(v * 10), 9)] for v in p))
