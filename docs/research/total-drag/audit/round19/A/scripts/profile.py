import sys
import numpy as np
from PIL import Image
img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
# panel b region in native coords
x0,y0,x1,y1 = 200,2130,1250,2950
sub = img[y0:y1, x0:x1]
dark = sub < 120
# row sums
rs = dark.sum(axis=1)
cs = dark.sum(axis=0)
print("rows with many dark px:")
for i,v in enumerate(rs):
    if v > 250: print(y0+i, v)
print("cols with many dark px:")
for j,v in enumerate(cs):
    if v > 250: print(x0+j, v)
