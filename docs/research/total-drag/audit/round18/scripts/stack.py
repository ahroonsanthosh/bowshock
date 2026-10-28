import sys, glob, os
from PIL import Image
import numpy as np
src, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(src, 'strip-*.png')))
ims = [np.array(Image.open(f).convert('L')) for f in files]
for f, a in zip(files, ims):
    print(os.path.basename(f), a.shape, a.dtype, a.min(), a.max())
full = np.vstack(ims)
Image.fromarray(full).save(out)
print('full', full.shape)
