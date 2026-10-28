"""Overlays for TN 3819 fig. 32: every read symbol and curve point marked and numbered as in the CSV.
Usage: python3 -I overlay.py page.jpg readings.csv outdir
Writes: fig32_overlay_full.png (plot area, native pixels, 2x), fig32_overlay_stations.png
(each Mach 2.41 station zoomed 8x with the adopted centres and the legend-size outline)."""
import csv
import sys
from PIL import Image, ImageDraw, ImageOps

page, rpath, outdir = sys.argv[1:4]
rows = list(csv.DictReader(open(rpath)))
base = Image.open(page).convert('L')
W_T, H_T = 18.95, 15.91  # legend-key outline size used for the template fit

def colour(r):
    if r['data_or_key'] == 'legend key':
        return (255, 140, 0)
    if r['series'].endswith('R11.3'):
        return (220, 0, 0)
    if r['series'].endswith('R2.8'):
        return (0, 80, 255)
    if r['series'].endswith('faired'):
        return (0, 150, 0)
    return (190, 0, 190)

# full view
x0, y0, x1, y1 = 380, 720, 2030, 2320
k = 2
im = base.crop((x0, y0, x1, y1)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.LANCZOS).convert('RGB')
d = ImageDraw.Draw(im)
def P(x, y):
    return ((x - x0 + 0.5) * k, (y - y0 + 0.5) * k)
for r in rows:
    px, py = float(r['px_x']), float(r['px_y'])
    c = colour(r)
    X, Y = P(px, py)
    if r['id'].startswith(('S', 'K')):
        pts = [P(px, py - 2 * H_T / 3), P(px - W_T / 2, py + H_T / 3), P(px + W_T / 2, py + H_T / 3)]
        d.line(pts + [pts[0]], fill=c, width=1)
        d.line([(X - 4, Y), (X + 4, Y)], fill=c, width=1)
        d.line([(X, Y - 4), (X, Y + 4)], fill=c, width=1)
        left = r['id'] in ('S01', 'S03', 'S05', 'S07', 'S09', 'S11', 'K01', 'K02')
        tx = X - 62 if left else X + 22
        d.text((tx, Y - 6), r['id'], fill=c)
    else:
        d.ellipse([X - 5, Y - 5, X + 5, Y + 5], outline=c, width=2)
        d.text((X + 6, Y - 16), r['id'], fill=c)
d.text((10, 10), 'TN 3819 fig. 32 readings: red flagged triangle R=11.3e6, blue open triangle R=2.8e6, '
       'orange legend keys, green faired curve points, magenta ref. 26 check points', fill=(0, 0, 0))
im.save(f'{outdir}/fig32_overlay_full.png')

# station zooms
stations = [('x/c 1.0', 392, 1752, 430, 1838, ['S01', 'S02', 'C00']),
            ('x/c 0.8', 518, 1490, 558, 1530, ['S03', 'S04', 'C02']),
            ('x/c 0.6', 645, 1484, 685, 1530, ['S05', 'S06', 'C04']),
            ('x/c 0.4', 773, 1450, 813, 1492, ['S07', 'S08', 'C06']),
            ('x/c 0.2', 901, 1466, 941, 1506, ['S09', 'S10', 'C08']),
            ('x/c 0.0', 1028, 1474, 1068, 1508, ['S11', 'S12', 'C10', 'C11'])]
k = 8
panels = []
byid = {r['id']: r for r in rows}
for (title, a0, b0, a1, b1, ids) in stations:
    c = ImageOps.autocontrast(base.crop((a0, b0, a1, b1)), cutoff=0.5)
    c = c.resize(((a1 - a0) * k, (b1 - b0) * k), Image.NEAREST).convert('RGB')
    dd = ImageDraw.Draw(c)
    def Q(x, y):
        return ((x - a0 + 0.5) * k, (y - b0 + 0.5) * k)
    for i in ids:
        r = byid[i]
        px, py = float(r['px_x']), float(r['px_y'])
        col = colour(r)
        X, Y = Q(px, py)
        if i.startswith('S'):
            pts = [Q(px, py - 2 * H_T / 3), Q(px - W_T / 2, py + H_T / 3), Q(px + W_T / 2, py + H_T / 3)]
            dd.line(pts + [pts[0]], fill=col, width=2)
            dd.line([(X - 8, Y), (X + 8, Y)], fill=col, width=2)
            dd.line([(X, Y - 8), (X, Y + 8)], fill=col, width=2)
            dd.text((X + 10, Y - 4), i, fill=col)
        else:
            if 0 <= X <= c.width and 0 <= Y <= c.height:
                dd.ellipse([X - 7, Y - 7, X + 7, Y + 7], outline=col, width=2)
                dd.text((X + 9, Y + 6), i, fill=col)
    panel = Image.new('RGB', (c.width, c.height + 20), 'white')
    panel.paste(c, (0, 20))
    ImageDraw.Draw(panel).text((4, 4), title + ': ' + ', '.join(ids), fill=(0, 0, 0))
    panels.append(panel)
Wt = sum(p.width for p in panels) + 10 * (len(panels) - 1)
Ht = max(p.height for p in panels)
sheet = Image.new('RGB', (Wt, Ht), 'white')
x = 0
for p in panels:
    sheet.paste(p, (x, 0))
    x += p.width + 10
sheet.save(f'{outdir}/fig32_overlay_stations.png')
print('written', f'{outdir}/fig32_overlay_full.png', f'{outdir}/fig32_overlay_stations.png')
