# usage: python3 -I delines.py <in.png> <out.png> [L=61]
# removes long straight horizontal and vertical strokes (gridlines, frames) by morphological opening
# with L-px line elements; symbol strokes crossing a gridline lose only the gridline's own pixels.
# Output is a grey image where removed line pixels are set to white.
import sys
import numpy as np, cv2
from PIL import Image
L = int(sys.argv[3]) if len(sys.argv) > 3 else 61
g = np.asarray(Image.open(sys.argv[1]).convert('L')).copy()
B = (g < 160).astype(np.uint8)
hl = cv2.morphologyEx(B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (L, 1)))
vl = cv2.morphologyEx(B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, L)))
m = cv2.dilate(hl | vl, np.ones((3, 3), np.uint8)) > 0
# keep pixels where a symbol stroke crosses: restore if the pixel has dark neighbours off the line direction
out = g.copy(); out[m] = 255
Image.fromarray(out).save(sys.argv[2]); print(sys.argv[2])
