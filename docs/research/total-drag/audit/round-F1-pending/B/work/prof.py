import sys; sys.path.insert(0,'/tmp/scratch/f1-readers/B/work')
from calfun import *
from PIL import Image
im=np.array(Image.open('/tmp/scratch/f1-readers/B/p21_600-21.png').convert('L'))<128
p=sys.argv[1]; y0,y1=int(sys.argv[2]),int(sys.argv[3])
for M in [float(m) for m in sys.argv[4].split(',')]:
    x,_=val2pix(p,M,0.0 if p=='P2' else 0.19)
    s=[]
    for o in (-24,-12,12,24):
        xi=int(round(x+o)); col=im[y0:y1,xi-1:xi+2].mean(1)>0.5
        runs=[];st=None
        for k,v in enumerate(col):
            if v and st is None: st=k
            if not v and st is not None: runs.append((y0+st,y0+k-1)); st=None
        if st is not None: runs.append((y0+st,y1-1))
        s.append('%+d:'%o+','.join('%d-%d'%r for r in runs))
    print('M=%.2f x=%.0f'%(M,x),' | '.join(s))
