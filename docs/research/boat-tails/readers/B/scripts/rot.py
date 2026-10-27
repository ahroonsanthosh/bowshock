"""Rotate a page image by a multiple of 90 degrees (lossless pixel transpose).
Usage: python3 -I rot.py IN OUT ROT   (ROT = 90, 180 or 270, counter-clockwise)"""
import sys
from PIL import Image
src, out, rot = sys.argv[1], sys.argv[2], int(sys.argv[3])
t = {90: Image.Transpose.ROTATE_90, 180: Image.Transpose.ROTATE_180, 270: Image.Transpose.ROTATE_270}[rot]
im = Image.open(src).transpose(t)
im.save(out)
print(out, im.size)
