# Draw readings on the page image.
# usage: python3 -I overlay.py img cal.json rows.json orient out.png x0 y0 x1 y1 scale [trace.json]
# rows.json: list of {curve, kind, t, val, ...}; orient 'u' means t is u and val is v.
# Also accepts a final-form rows file with keys x, y.
import sys, json
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from PIL import Image, ImageDraw
from readlib import Cal
a = sys.argv
img, calp, rowsp, orient, out = a[1:6]
x0, y0, x1, y1 = map(int, a[6:10]); sc = float(a[10])
trace = json.load(open(a[11])) if len(a) > 11 else None
cal = Cal(calp)
rows = json.load(open(rowsp))
im = Image.open(img).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((int(im.size[0] * sc), int(im.size[1] * sc)), Image.LANCZOS)
d = ImageDraw.Draw(im)
pal = [(220, 0, 0), (0, 120, 255), (0, 170, 0), (200, 0, 200), (255, 140, 0), (0, 180, 180), (120, 60, 0), (90, 90, 90), (150, 150, 0)]
names = []
for r in rows:
    if r['curve'] not in names:
        names.append(r['curve'])
if trace:
    for k, tr in trace.items():
        if k not in names:
            names.append(k)
        col = pal[names.index(k) % len(pal)]
        for p in tr:
            u, v = (p[0], p[1]) if orient == 'u' else (p[1], p[0])
            px, py = cal.to_px(u, v)
            X, Y = (px - x0) * sc, (py - y0) * sc
            d.point((X, Y), fill=col)
for r in rows:
    col = pal[names.index(r['curve']) % len(pal)]
    if 'x' in r:
        u, v = r['x'], r['y']
    else:
        u, v = (r['t'], r['val']) if orient == 'u' else (r['val'], r['t'])
    px, py = cal.to_px(u, v)
    X, Y = (px - x0) * sc, (py - y0) * sc
    s = max(6, int(0.006 * im.size[0]))
    lw = 2 if im.size[0] < 1500 else 4
    if r['kind'] in ('curve_end',):
        d.rectangle((X - s, Y - s, X + s, Y + s), outline=col, width=lw)
    elif r['kind'] == 'box':
        # box half-widths in units
        ex, ey = r.get('x_err_box', 0), r.get('y_err_box', 0)
        p1 = cal.to_px(u - ex, v - ey); p2 = cal.to_px(u + ex, v + ey)
        d.rectangle(((min(p1[0], p2[0]) - x0) * sc, (min(p1[1], p2[1]) - y0) * sc,
                     (max(p1[0], p2[0]) - x0) * sc, (max(p1[1], p2[1]) - y0) * sc), outline=col, width=lw)
    else:
        d.line((X - s, Y, X + s, Y), fill=col, width=lw)
        d.line((X, Y - s, X, Y + s), fill=col, width=lw)
    if r['kind'] == 'curve_at_zero':
        d.polygon([(X, Y - s - 4), (X + s + 4, Y), (X, Y + s + 4), (X - s - 4, Y)], outline=col)
    if r.get('label'):
        d.text((X + 5, Y - 14), str(r['label']), fill=col)
for i, nm in enumerate(names):
    d.text((10, 10 + 14 * i), nm, fill=pal[i % len(pal)])
im.save(out)
print(im.size)
