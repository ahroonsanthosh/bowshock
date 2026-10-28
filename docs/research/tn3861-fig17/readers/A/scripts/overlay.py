"""Draw the read points (from the CSV px column) on the upright figure for a visual check.
usage: python -I overlay.py page.png readings.csv out.png x0 y0 x1 y1 scale"""
import sys, csv
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
x0, y0, x1, y1 = map(int, sys.argv[4:8]); sc = float(sys.argv[8])
crop = im.crop((x0, y0, x1, y1)); H = crop.size[1]
crop = crop.transpose(Image.ROTATE_270)
crop = crop.resize((int(crop.size[0]*sc), int(crop.size[1]*sc)), Image.LANCZOS)
d = ImageDraw.Draw(crop)
for r in csv.DictReader(open(sys.argv[2])):
    px, py = map(float, r['px'].split(','))
    u = (H - 1 - (py - y0))*sc; v = (px - x0)*sc
    col = (220, 0, 0) if r['flag'] == 'ok' else (0, 90, 255)
    d.ellipse([u-3, v-3, u+3, v+3], outline=col, width=2)
    d.text((u+5, v-14), r['note'][:3], fill=col)
crop.save(sys.argv[3])
