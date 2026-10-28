import sys, glob, os
from PIL import Image
import numpy as np
src, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(src, 'strip-*.png')))
ims = [np.array(Image.open(f).convert('L'))[::-1, :] for f in files]
full = np.vstack(ims)
Image.fromarray(full).save(out)
small = Image.fromarray(full)
small.resize((full.shape[1]//3, full.shape[0]//3), Image.LANCZOS).save(out.replace('.png', '_small.png'))
print(full.shape)
