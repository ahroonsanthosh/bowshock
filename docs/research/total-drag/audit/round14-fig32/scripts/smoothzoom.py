"""Bicubic zoom of a crop with contrast stretch. Usage: smoothzoom.py page out x0 y0 x1 y1 scale"""
import sys
from PIL import Image, ImageOps
src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, k = map(int, sys.argv[3:8])
im = Image.open(src).convert('L').crop((x0, y0, x1, y1))
im = ImageOps.autocontrast(im, cutoff=0.5)
im.resize((im.width * k, im.height * k), Image.BICUBIC).save(dst)
