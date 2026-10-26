import sys; sys.path.insert(0, sys.argv[1])
import digi
p = digi.load(sys.argv[2])
shape = sys.argv[3]; x=float(sys.argv[4]); y=float(sys.argv[5])
best=[]
for s in range(int(sys.argv[6]) if len(sys.argv)>6 else 20, 46, 2):
    for th in (3,4,5,6):
        t = digi.tmpl(shape, s, th)
        r = digi.refine(p, x, y, t, 10)
        best.append((r[2], s, th, round(r[0],1), round(r[1],1)))
best.sort(reverse=True)
for b in best[:8]: print(b)
