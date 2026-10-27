# usage: python3 -I cropc.py <in.png> <x0> <y0> <x1> <y1> <scale> <out.png> <lo> <hi>
# crop + contrast stretch (grey lo..hi -> 0..255) + Lanczos upscale, for faint strokes and dots
import sys
import numpy as np
from PIL import Image
a = sys.argv; x0, y0, x1, y1 = map(int, a[2:6]); sc = float(a[6]); lo, hi = float(a[8]), float(a[9])
g = np.asarray(Image.open(a[1]).convert('L')).astype(float)[y0:y1, x0:x1]
g = np.clip((g - lo) / (hi - lo) * 255, 0, 255).astype(np.uint8)
Image.fromarray(g).resize((int((x1 - x0) * sc), int((y1 - y0) * sc)), Image.LANCZOS).save(a[7]); print(a[7])
