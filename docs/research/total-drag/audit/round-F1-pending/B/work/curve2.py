import sys; sys.path.insert(0,'/tmp/scratch/f1-readers/B/work')
from calfun import *
from PIL import Image
im=np.array(Image.open('/tmp/scratch/f1-readers/B/p21_600-21.png').convert('L'))<128
p=sys.argv[1]; clo,chi=float(sys.argv[2]),float(sys.argv[3])
Ms=[float(m) for m in sys.argv[4].split(',')]
offs=[int(o) for o in (sys.argv[5] if len(sys.argv)>5 else '-30,-18,18,30').split(',')]
grid=set(round(cal[p]['ytop']-0.02*j,2) for j in range(len(cal[p]['h'])))
for M in Ms:
    x,_=val2pix(p,M,(clo+chi)/2)
    line=[]
    for o in offs:
        xi=int(round(x+o))
        _,ya=val2pix(p,M,chi); _,yb=val2pix(p,M,clo)
        col=im[int(ya):int(yb),xi-1:xi+2].mean(1)
        runs=[];s=None
        for k,v in enumerate(col):
            if v>0.5 and s is None: s=k
            if v<=0.5 and s is not None: runs.append((s,k-1)); s=None
        if s is not None: runs.append((s,len(col)-1))
        vals=[]
        for a,b in runs:
            yc=int(ya)+(a+b)/2+0.5; c=pix2val(p,xi,yc)[1]
            if any(abs(c-g)<0.0025 for g in grid) and b-a<14: continue
            vals.append('%.4f/%d'%(c,b-a+1))
        line.append('%+d:'%o+','.join(vals))
    print('M=%.2f'%M,' | '.join(line))
