"""ASCII view of a grid-cleaned region with each row's plot value.
args: src x0 x1 vlo vhi  yref vref ppu  L  [xa0 ppd]
Row value: v = vref - (y - yref)/ppu.  '#' = kept (symbol/curve) pixel, '.' = removed grid pixel."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, sys.argv[0].rsplit('/',1)[0])
from clean import clean
src=sys.argv[1]; x0,x1=map(int,sys.argv[2:4]); vlo,vhi=map(float,sys.argv[4:6])
yref,vref,ppu=map(float,sys.argv[6:9]); L=int(sys.argv[9])
xa0=float(sys.argv[10]) if len(sys.argv)>10 else None; ppd=float(sys.argv[11]) if len(sys.argv)>11 else None
ya=int(yref+(vref-vhi)*ppu); yb=int(yref+(vref-vlo)*ppu)+1
a=np.array(Image.open(src).convert('L')); pad=40
raw=a[ya-pad:yb+pad, x0-pad:x1+pad]<128
c=clean(a[ya-pad:yb+pad, x0-pad:x1+pad], L)[pad:-pad,pad:-pad]; raw=raw[pad:-pad,pad:-pad]
if xa0 is not None:
    print('cols', x0, x1, ' alpha at x0 = %+.2f, per col %.4f deg' % ((x0-xa0)/ppd, 1/ppd))
hdr=''.join(str((x0+j)%10) for j in range(x1-x0))
print(' '*16+hdr)
for i in range(c.shape[0]):
    y=ya+i; v=vref-(y-yref)/ppu
    row=''.join('#' if c[i,j] else ('.' if raw[i,j] else ' ') for j in range(c.shape[1]))
    print(f"{y:5d} {v:8.4f} {int(c[i].sum()):2d} {row}")
