import sys
sys.path.insert(0, sys.argv[1])
import numpy as np, digi
p = digi.load(sys.argv[2])
x0,y0,x1,y1 = map(int, sys.argv[3:7])
reg = p[y0:y1, x0:x1]
print("rows (mean darkness):")
for i,v in enumerate(reg.mean(axis=1)): print(y0+i, f"{v:.2f}", "#"*int(v*60))
print("cols:")
for i,v in enumerate(reg.mean(axis=0)): print(x0+i, f"{v:.2f}", "#"*int(v*60))
