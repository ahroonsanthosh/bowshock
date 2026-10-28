# Rotate the native scan into the page's display orientation (/Rotate 90 = 90 deg clockwise), losslessly on the pixel grid.
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('L')
print('stored size', im.size, 'mode', im.mode)
r = im.transpose(Image.Transpose.ROTATE_270)  # PIL ROTATE_270 = 90 deg clockwise
r.save(sys.argv[2])
print('display size', r.size)
s = r.resize((r.size[0]//3, r.size[1]//3), Image.Resampling.LANCZOS)
s.save(sys.argv[3])
