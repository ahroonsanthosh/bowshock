"""Print darkness runs along a vertical band (rows) and horizontal band (cols).
usage: colprof.py scriptdir page x_center halfw y0 y1 [thr]"""
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np, digi
p = digi.load(sys.argv[2])
x, hw, y0, y1 = map(int, sys.argv[3:7])
thr = float(sys.argv[7]) if len(sys.argv) > 7 else 0.3
prof = p[y0:y1, x-hw:x+hw+1].mean(axis=1)
i=0; out=[]
while i < len(prof):
    if prof[i] > thr:
        j=i
        while j < len(prof) and prof[j] > thr: j+=1
        seg=prof[i:j]; c=(seg*np.arange(i,j)).sum()/seg.sum()
        out.append(f"{y0+c:.1f}(w{j-i},pk{seg.max():.2f})")
        i=j
    else: i+=1
print(x, " ".join(out))
