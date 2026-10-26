import sys
sys.path.insert(0, sys.argv[1])
import numpy as np, digi
page = digi.load(sys.argv[2])
xs = [float(v) for v in sys.argv[3].split(",")]
y0, y1, step, h = map(int, sys.argv[4:8])
for y in range(y0, y1, step):
    row = []
    for x in xs:
        prof = page[y:y+h, int(x)-25:int(x)+26].mean(axis=0)
        b = np.median(page[y:y+h, int(x)-60:int(x)+61].mean(axis=0))
        w = np.clip(prof - b - 0.1, 0, None)
        row.append(f"{(int(x)-25 + (w*np.arange(len(w))).sum()/max(w.sum(),1e-9)):.1f}({prof.max():.2f})")
    print(y, " ".join(row))
