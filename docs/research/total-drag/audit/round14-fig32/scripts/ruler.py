"""Zoomed crop with a native-pixel ruler and light grid every 5 px.
Usage: python3 -I ruler.py page.jpg out.png x0 y0 x1 y1 scale [marks]
marks: optional 'x,y;x,y' native coords drawn as small red crosses."""
import sys
from PIL import Image, ImageDraw, ImageOps
src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
k = int(sys.argv[7])
marks = []
if len(sys.argv) > 8 and sys.argv[8]:
    marks = [tuple(map(float, m.split(','))) for m in sys.argv[8].split(';')]
im = Image.open(src).convert('L').crop((x0, y0, x1, y1))
im = ImageOps.autocontrast(im, cutoff=1)
im = im.resize((im.width * k, im.height * k), Image.NEAREST).convert('RGB')
pad = 40
out = Image.new('RGB', (im.width + pad, im.height + pad), 'white')
out.paste(im, (pad, pad))
d = ImageDraw.Draw(out)
for x in range(x0, x1 + 1):
    if x % 5 == 0:
        X = pad + (x - x0) * k
        d.line([(X, pad - (12 if x % 10 == 0 else 6)), (X, pad)], fill='black')
        d.line([(X, pad), (X, out.height)], fill=(150, 200, 255) if x % 10 else (80, 140, 255))
        if x % 10 == 0:
            d.text((X + 2, 2), str(x), fill='black')
for y in range(y0, y1 + 1):
    if y % 5 == 0:
        Y = pad + (y - y0) * k
        d.line([(pad - (12 if y % 10 == 0 else 6), Y), (pad, Y)], fill='black')
        d.line([(pad, Y), (out.width, Y)], fill=(150, 200, 255) if y % 10 else (80, 140, 255))
        if y % 10 == 0:
            d.text((2, Y + 2), str(y), fill='black')
for (mx, my) in marks:
    X = pad + (mx - x0 + 0.5) * k
    Y = pad + (my - y0 + 0.5) * k
    d.line([(X - 6, Y), (X + 6, Y)], fill='red', width=2)
    d.line([(X, Y - 6), (X, Y + 6)], fill='red', width=2)
out.save(dst)
