import sys; sys.path.insert(0,'/tmp/scratch/f1-readers/B/work')
from calfun import *
from PIL import Image
im=np.array(Image.open('/tmp/scratch/f1-readers/B/p21_600-21.png').convert('L'))<128
p=sys.argv[1]; ylo,yhi=float(sys.argv[2]),float(sys.argv[3])
Ms=[float(m) for m in sys.argv[4].split(',')]
for M in Ms:
    x,_=val2pix(p,M,(ylo+yhi)/2)
    _,ya=val2pix(p,M,yhi); _,yb=val2pix(p,M,ylo)
    xi=int(round(x)); col=im[int(ya):int(yb),xi-2:xi+3].mean(1)
    runs=[];s=None
    for k,v in enumerate(col):
        if v>0.5 and s is None: s=k
        if v<=0.5 and s is not None: runs.append((s,k-1)); s=None
    if s is not None: runs.append((s,len(col)-1))
    out=[]
    for a,b in runs:
        yc=ya+ (a+b)/2+0.5; out.append('%.4f(w%d)'%(pix2val(p,x,yc)[1],b-a+1))
    print('M=%.2f x=%.0f'%(M,x),' '.join(out))
