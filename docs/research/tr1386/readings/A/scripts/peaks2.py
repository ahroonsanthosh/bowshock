import sys
sys.path.insert(0, sys.argv[1])
import digi
p = digi.load(sys.argv[2])
shape = sys.argv[3]; size=float(sys.argv[4]); th=float(sys.argv[5])
x0,y0,x1,y1 = map(int, sys.argv[6:10])
t = digi.tmpl(shape, size, th)
m = digi.ncc(p[y0:y1, x0:x1], t)
for (x,y,v) in digi.peaks(m, 0.2, 4)[:6]:
    print(shape, x+x0, y+y0, round(v,3))
