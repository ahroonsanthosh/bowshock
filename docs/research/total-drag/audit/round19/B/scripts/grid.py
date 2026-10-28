import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
# crop region of panel b in native coords
x0,y0,x1,y1 = 80,2100,1300,3100
sub = im[y0:y1, x0:x1]
dark = sub < 110
# column darkness profile in a band (rows) inside plot
def colprof(r0, r1):
    return dark[r0-y0:r1-y0, :].sum(axis=0)
def rowprof(c0, c1):
    return dark[:, c0-x0:c1-x0].sum(axis=1)
import itertools
for (r0,r1) in [(2160,2240),(2400,2480),(2800,2900)]:
    p = colprof(r0,r1)
    idx = np.where(p > 0.6*(r1-r0))[0]
    print('cols dark in rows',r0,r1, (idx+x0).tolist())
for (c0,c1) in [(230,300),(650,720),(1100,1180)]:
    p = rowprof(c0,c1)
    idx = np.where(p > 0.6*(c1-c0))[0]
    print('rows dark in cols',c0,c1,(idx+y0).tolist())
