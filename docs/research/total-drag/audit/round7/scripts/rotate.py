"""Rotate a rendered page by 90 degrees (lossless transpose).

usage: python3 -I rotate.py IN.png OUT.png cw|ccw
"""
import sys
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
im = Image.open(sys.argv[1])
op = Image.Transpose.ROTATE_270 if sys.argv[3] == "cw" else Image.Transpose.ROTATE_90
im.transpose(op).save(sys.argv[2])
print(sys.argv[2], im.transpose(op).size)
