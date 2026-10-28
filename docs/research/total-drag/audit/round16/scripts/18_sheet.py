# Contact sheet of small crops (native pixels, 3x nearest) around given points, labelled.
# usage: 18_sheet.py in.jpg out.png half label:x:y ...
import sys
from PIL import Image, ImageDraw
src, dst, half = sys.argv[1], sys.argv[2], int(sys.argv[3])
items = [a.split(':') for a in sys.argv[4:]]
im = Image.open(src).convert('RGB'); s = 3; n = len(items); cols = 4
tw = 2 * half * s
sheet = Image.new('RGB', (cols * (tw + 10), ((n + cols - 1) // cols) * (tw + 24)), (255, 255, 255))
d = ImageDraw.Draw(sheet)
for k, (lab, x, y) in enumerate(items):
    x, y = int(float(x)), int(float(y))
    c = im.crop((x - half, y - half, x + half, y + half)).resize((tw, tw), Image.NEAREST)
    X = (k % cols) * (tw + 10); Y = (k // cols) * (tw + 24)
    sheet.paste(c, (X, Y + 18)); d.text((X, Y + 2), '%s (%d,%d)' % (lab, x, y), fill=(200, 0, 0))
    d.line([(X + tw // 2 - 4, Y + 18 + tw // 2), (X + tw // 2 + 4, Y + 18 + tw // 2)], fill=(255, 0, 0))
sheet.save(dst); print(dst, sheet.size)
