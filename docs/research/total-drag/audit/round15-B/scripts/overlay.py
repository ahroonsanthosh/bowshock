"""Draw every reading on the rendered page, one image per figure panel set (fig. 14, fig. 15, fig. 8a, fig. 8b).

usage: python3 -I overlay.py <render_dir> <work_dir> <out_dir>
Markers: curve row = circle with cross; curve_end = square; curve_at_zero = diamond; box = rectangle of the
box (x +- x_err for fig. 8, y +- y_err for figs. 14 and 15). Colours by series (legend drawn at the top).
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFont
import trace

rdir, wd, outd = sys.argv[1:4]
os.makedirs(outd, exist_ok=True)
PAL = [(220, 0, 0), (0, 70, 230), (0, 160, 0), (200, 0, 200), (0, 170, 190), (240, 120, 0), (120, 60, 0),
       (110, 110, 110), (150, 150, 0), (90, 0, 160), (0, 110, 90), (200, 80, 120)]


def draw(img, rows, cals, key_of, fixed_x, crop, outp, title, rs=7):
    im = Image.open(os.path.join(rdir, img)).convert('RGB')
    d = ImageDraw.Draw(im)
    series = []
    for r in rows:
        s = (key_of(r), r['series'])
        if s not in series:
            series.append(s)
    for r in rows:
        if r['x'] is None:
            continue
        cal = cals[key_of(r)]
        col = PAL[series.index((key_of(r), r['series'])) % len(PAL)]
        p = trace.inv(cal['cx'], cal['cy'], [r['x']], [r['y']])
        u, v = p[0][0], p[1][0]
        if r['kind'] == 'box':
            if fixed_x:   # figs 14/15: box in y
                q = trace.inv(cal['cx'], cal['cy'], [r['x'], r['x']], [r['y'] - r['y_err'], r['y'] + r['y_err']])
                y0, y1 = sorted(q[1])
                d.rectangle((u - rs, y0, u + rs, y1), outline=col, width=3)
            else:
                q = trace.inv(cal['cx'], cal['cy'], [r['x'] - r['x_err'], r['x'] + r['x_err']], [r['y'], r['y']])
                x0, x1 = sorted(q[0])
                d.rectangle((x0, v - rs, x1, v + rs), outline=col, width=3)
        elif r['kind'] == 'curve_end':
            d.rectangle((u - rs, v - rs, u + rs, v + rs), outline=col, width=3)
        elif r['kind'] == 'curve_at_zero':
            d.polygon([(u, v - rs - 3), (u + rs + 3, v), (u, v + rs + 3), (u - rs - 3, v)], outline=col, width=3)
        else:
            d.ellipse((u - rs, v - rs, u + rs, v + rs), outline=col, width=2)
            d.line((u - 2 * rs, v, u + 2 * rs, v), fill=col, width=1)
            d.line((u, v - 2 * rs, u, v + 2 * rs), fill=col, width=1)
    im = im.crop(crop)
    font = ImageFont.load_default(size=26)
    lines = [title] + [f'{k}: {s}' for (k, s) in series]
    hdr = Image.new('RGB', (im.size[0], 34 * len(lines) + 10), 'white')
    dh = ImageDraw.Draw(hdr)
    for i, t in enumerate(lines):
        col = (0, 0, 0) if i == 0 else PAL[(i - 1) % len(PAL)]
        dh.text((10, 5 + 34 * i), t, fill=col, font=font)
    out = Image.new('RGB', (im.size[0], im.size[1] + hdr.size[1]), 'white')
    out.paste(hdr, (0, 0))
    out.paste(im, (0, hdr.size[1]))
    out.save(outp, optimize=True)
    print(outp, out.size)


R14 = json.load(open(os.path.join(wd, 'rd_f14.json')))
C14 = json.load(open(os.path.join(wd, 'cal_f14.json')))
draw('a51-36.png', [r for r in R14 if r['kind'] != 'missing'], C14, lambda r: r['panel'], True,
     (1050, 500, 3950, 4700), os.path.join(outd, 'a51j11_fig14_overlay.png'),
     'RM A51J11 fig. 14, reader B: circle = curve reading, square = curve end, rectangle = box (y +- y_err)')
R15 = json.load(open(os.path.join(wd, 'rd_f15.json')))
C15 = json.load(open(os.path.join(wd, 'cal_f15.json')))
draw('a51-37.png', [r for r in R15 if r['kind'] != 'missing'], C15, lambda r: r['panel'], True,
     (1250, 600, 3500, 4550), os.path.join(outd, 'a51j11_fig15_overlay.png'),
     'RM A51J11 fig. 15, reader B: circle = curve reading, square = curve end, rectangle = box (y +- y_err)')
R8 = json.load(open(os.path.join(wd, 'rd_f8.json')))
C8 = json.load(open(os.path.join(wd, 'cal_f8.json')))
for part, img, crop in (('a', 'a52-29.png', (700, 560, 4300, 3000)), ('b', 'a52-30.png', (700, 560, 4300, 3010))):
    rows = [r for r in R8 if r['pkey'].startswith(part + '_')]
    for r in rows:
        r['series'] = (r['curve'] + ' ' + r['series']) if 'M1.2' in r['pkey'] else r['series']
    draw(img, rows, C8, lambda r: r['pkey'], False, crop,
         os.path.join(outd, f'a52e01_fig8{part}_overlay.png'),
         f'RM A52E01 fig. 8({part}), reader B: circle = reading at fixed alpha, square = end, diamond = alpha 0, '
         f'rectangle = box (x +- x_err)', rs=6)
