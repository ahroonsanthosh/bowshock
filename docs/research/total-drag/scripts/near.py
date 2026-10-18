import sys
import numpy as np
from PIL import Image
im=np.array(Image.open(sys.argv[1]).convert('L'))<140
axis=sys.argv[2]; lo,hi=map(int,sys.argv[3:5]); a,b=map(int,sys.argv[5:7])
if axis=='col':
    prof=im[lo:hi, a:b].mean(axis=0); base=a
else:
    prof=im[a:b, lo:hi].mean(axis=1); base=a
order=np.argsort(prof)[::-1][:6]
print([(int(i+base), round(float(prof[i]),2)) for i in sorted(order)])
