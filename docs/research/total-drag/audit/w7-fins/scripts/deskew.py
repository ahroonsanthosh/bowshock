"""Deskew a page by the slope of a long horizontal frame line measured with
linerow.py: rotate by atan(dy/dx) about the page centre (white fill).
Usage: python3 -I deskew.py <in.png> <dy> <dx> <out.png>"""
import math
import sys
from PIL import Image

dy, dx = float(sys.argv[2]), float(sys.argv[3])
ang = math.degrees(math.atan2(dy, dx))
im = Image.open(sys.argv[1]).convert('L')
im.rotate(ang, resample=Image.BICUBIC, fillcolor=255).save(sys.argv[4])
print(round(ang, 3))
