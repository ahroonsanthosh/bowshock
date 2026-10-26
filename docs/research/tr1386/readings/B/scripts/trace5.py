import sys, json, numpy as np
from PIL import Image
W="/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"
g=np.asarray(Image.open(f"{W}/p400-11.png").convert("L"),dtype=np.float32)
f=json.load(open("calib/fit_f5.json"))
fx,fy=f["11|5||x"],f["11|5||y"]
def x_of_M(M,y=1700):
    return (M-fx["b"]*y-fx["c"])/fx["a"]
def val(x,y): return fy["a"]*x+fy["b"]*y+fy["c"]
def Mof(x,y): return fx["a"]*x+fx["b"]*y+fx["c"]
for M in [float(s) for s in sys.argv[1:]]:
    x=int(round(x_of_M(M)))
    col=g[1560:2140,x-1:x+2].mean(axis=1)
    dark=col<175
    runs=[];i=0
    while i<len(col):
        if dark[i]:
            j=i
            while j<len(col) and dark[j]: j+=1
            w=255-col[i:j]; c=(np.arange(i,j)*w).sum()/w.sum()+1560
            if not (j-i<=4 and col[i:j].min()>95):
                runs.append(f"y={c:.1f}(w{j-i},min{int(col[i:j].min())})->{val(x,c):.3f}")
            i=j
        else: i+=1
    print(f"M={M} x={x} Mtrue={Mof(x,1800):.3f}: "+"  ".join(runs))
