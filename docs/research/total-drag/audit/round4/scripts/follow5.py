"""Follow one line of fig. 5 through the dense raw scan (work/raw5_all.txt): start at (M0, P0),
predict by linear fit of the last accepted points, accept the run nearest the prediction within tol.
usage: follow5.py M0 P0 Mend tol"""
import sys
import numpy as np
M0, P0, Mend, tol = map(float, sys.argv[1:5])
rows = []
for l in open(sys.argv[5] if len(sys.argv) > 5 else "work/raw5_all.txt"):
    x, rest = l.split(" M", 1); M, vals = rest.split(":", 1)
    rows.append((float(M), [float(t) for t in vals.split()]))
acc = [(M0, P0)]
direction = 1 if Mend > M0 else -1
for M, v in (rows if direction > 0 else rows[::-1]):
    if (M - M0) * direction <= 0 or (M - Mend) * direction > 0 or not v: continue
    pts = np.array(acc[-12:])
    if len(pts) >= 3:
        c = np.polyfit(pts[:, 0], pts[:, 1], 1); pred = np.polyval(c, M)
    else:
        pred = acc[-1][1]
    best = min(v, key=lambda p: abs(p - pred))
    gap = abs(M - acc[-1][0])
    if abs(best - pred) < tol + 0.02 * gap:
        acc.append((M, best))
A = np.array(acc)
np.save(sys.argv[6] if len(sys.argv) > 6 else "work/follow.npy", A)
# coverage
print(f"accepted {len(A)} points, M {A[:, 0].min():.3f}..{A[:, 0].max():.3f}")
for Mq in [float(m) for m in "1.0 1.1 1.2 1.3 1.4 1.5 1.6 1.7 1.8 1.9 2.0 2.2 2.4 2.5 2.6 2.8 3.0 3.2 3.4 3.5 3.6 3.8 3.95".split()]:
    sel = np.abs(A[:, 0] - Mq) < 0.03
    if sel.sum() >= 4:
        c = np.polyfit(A[sel, 0], A[sel, 1], 2 if sel.sum() > 8 else 1)
        r = A[sel, 1] - np.polyval(c, A[sel, 0])
        print(f"  M {Mq:.2f}: {np.polyval(c, Mq):.4f} (n{sel.sum()}, sd {r.std():.4f})")
