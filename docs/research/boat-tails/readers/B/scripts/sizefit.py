"""Find the symbol size that best matches an isolated symbol (grey-level score).
Usage: python3 -I sizefit.py IMG kind u v smin smax [method]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import figlib as fl
a = sys.argv[1:]
img = fl.load_gray(a[0]); kind = a[1]; u = float(a[2]); v = float(a[3])
smin, smax = float(a[4]), float(a[5])
f = fl.SymbolFitter(img, box=(int(u) - 40, int(v) - 40, int(u) + 40, int(v) + 40))
f.method = a[6] if len(a) > 6 else 'gray'
best = None
for s in np.arange(smin, smax + 1e-9, 0.25):
    r = f.fit(kind, s, u, v, radius=5, step=0.25)
    print(f"size {s:5.2f} score {r['score']:.3f} u {r['u']:.2f} v {r['v']:.2f}")
    if best is None or r['score'] > best[1]:
        best = (s, r['score'], r['u'], r['v'])
print("BEST", best)
