import sys
from PIL import Image
import numpy as np
im = np.array(Image.open(sys.argv[1]).convert('L')) < 128
H, W = im.shape
rows = im.sum(axis=1); cols = im.sum(axis=0)
# long dark rows/cols: more than 40% of width dark
rr = [i for i in range(H) if rows[i] > 0.35*W*0.6]
cc = [j for j in range(W) if cols[j] > 0.35*H*0.4]
def groups(v):
    g=[]; 
    for x in v:
        if g and x-g[-1][-1] <= 2: g[-1].append(x)
        else: g.append([x])
    return [(a[0],a[-1],rows[a[0]] if v is rr else cols[a[0]]) for a in g]
print('W,H',W,H)
print('rows', groups(rr)[:60])
print('cols', groups(cc)[:80])
