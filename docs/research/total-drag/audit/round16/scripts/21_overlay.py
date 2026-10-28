# Overlays: every read symbol and curve point marked and numbered as in the CSV.
#  overlays/fig32_overlay_full.png      whole plotting frame, native pixels
#  overlays/fig32_overlay_measured.png  region of the M 2.41 readings, 2x
#  overlays/fig32_stations.png          each station at 6x with the fitted outlines
# Colours: red = R 2.8e6 open triangle, blue = R 11.3e6 flagged, green = faired curve,
# orange = ref. 26 check points, grey = legend keys.
import sys, csv, json
from PIL import Image, ImageDraw
img, csvp, trip, outdir = sys.argv[1:5]
im = Image.open(img).convert('RGB')
rows = list(csv.DictReader(open(csvp)))
T = json.load(open(trip))['triangles']
F = json.load(open(trip))['flags']
COL = {'meas_M2.41_R2.8e6': (220, 0, 0), 'meas_M2.41_R11.3e6': (0, 60, 230), 'faired_M2.41': (0, 150, 0),
       'ref26_M1.50': (240, 130, 0), 'ref26_M2.00': (240, 130, 0)}
def draw(canvas, ox, oy, s, labels=True, r=5):
    d = ImageDraw.Draw(canvas)
    for row in rows:
        x = (float(row['px_x']) - ox) * s; y = (float(row['px_y']) - oy) * s
        c = COL[row['series']] if row['data_or_key'] == 'data' else (120, 120, 120)
        if row['symbol'].endswith('triangle'):
            d.ellipse([x - r, y - r, x + r, y + r], outline=c, width=2)
        else:
            d.line([(x - r, y), (x + r, y)], fill=c, width=2); d.line([(x, y - r), (x, y + r)], fill=c, width=2)
        if labels:
            dx = 8 if row['series'] != 'meas_M2.41_R2.8e6' else -30
            if row['series'] == 'faired_M2.41': dx, dy = 6, 6
            else: dy = -14
            d.text((x + dx, y + dy), row['id'], fill=c)
full = im.crop((380, 720, 2040, 2350)).copy(); draw(full, 380, 720, 1, labels=True, r=6)
full.save(outdir + '/fig32_overlay_full.png')
X0, Y0, X1, Y1, s = 395, 1300, 1070, 1850, 2
m = im.crop((X0, Y0, X1, Y1)).resize(((X1 - X0) * s, (Y1 - Y0) * s), Image.LANCZOS); draw(m, X0, Y0, s, labels=True, r=7)
m.save(outdir + '/fig32_overlay_measured.png')
# stations
ST = [('x/c 1.0', ['T10u', 'T10l'], ['F10'], (392, 1755, 432, 1840)), ('x/c 0.8', ['T08u', 'T08l'], ['F08'], (520, 1490, 558, 1528)),
      ('x/c 0.6', ['T06u', 'T06l'], ['F06'], (645, 1484, 688, 1530)), ('x/c 0.4', ['T04u', 'T04l'], ['F04'], (772, 1450, 812, 1492)),
      ('x/c 0.2', ['T02u', 'T02l'], ['F02'], (902, 1464, 940, 1505)), ('x/c 0.0', ['T00u', 'T00l'], ['F00'], (1030, 1472, 1068, 1508))]
S = 6; tiles = []
IDCOL = {'T10u': 'meas_M2.41_R2.8e6', 'T10l': 'meas_M2.41_R11.3e6', 'T08u': 'meas_M2.41_R11.3e6', 'T08l': 'meas_M2.41_R2.8e6',
         'T06u': 'meas_M2.41_R11.3e6', 'T06l': 'meas_M2.41_R2.8e6', 'T04u': 'meas_M2.41_R2.8e6', 'T04l': 'meas_M2.41_R11.3e6',
         'T02u': 'meas_M2.41_R11.3e6', 'T02l': 'meas_M2.41_R2.8e6', 'T00u': 'meas_M2.41_R11.3e6', 'T00l': 'meas_M2.41_R2.8e6'}
for title, tris, fls, (a, b, c, e) in ST:
    t = im.crop((a, b, c, e)).resize(((c - a) * S, (e - b) * S), Image.LANCZOS)
    d = ImageDraw.Draw(t)
    P = lambda x, y: ((x - a + 0.5) * S, (y - b + 0.5) * S)
    for n in tris:
        r = T[n]; col = COL[IDCOL[n]]
        ap = P(*r['apex']); l = P(r['corners'][0], r['base']); rr = P(r['corners'][1], r['base'])
        dash = n == 'T08l'
        d.line([ap, l, rr, ap], fill=col, width=1 if dash else 2)
        cx, cy = P(r['cx'], r['cy']); d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=col)
    for fn in fls:
        f = F[fn]; y0 = f['tip'][1]; y1 = y0 + 6
        d.line([P(f['a'] + f['b'] * y0, y0), P(f['a'] + f['b'] * y1, y1)], fill=(255, 0, 255), width=2)
    d.text((4, 4), title, fill=(0, 0, 0))
    tiles.append(t)
W = sum(t.width for t in tiles[:3]) + 20; H = max(t.height for t in tiles[:3]) + max(t.height for t in tiles[3:]) + 20
sheet = Image.new('RGB', (max(W, sum(t.width for t in tiles[3:]) + 20), H), (255, 255, 255))
x = 0
for t in tiles[:3]: sheet.paste(t, (x, 0)); x += t.width + 10
x = 0; y = max(t.height for t in tiles[:3]) + 10
for t in tiles[3:]: sheet.paste(t, (x, y)); x += t.width + 10
sheet.save(outdir + '/fig32_stations.png')
print('written', outdir)
