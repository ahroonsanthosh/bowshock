"""Draw one overlay image per panel with every reading and each curve's wing call.

usage: python3 -I overlay.py C_DIR
Colours: wing 2 red, wing 3 blue, wing 4 green (curves called with low or
medium confidence are drawn the same colour but labelled with '?').
Markers: + reading, square outline = box (merged ink, drawn at its half-widths),
circle = curve end, triangle = value at alpha 0. Raw ink is grey.
"""
import sys
import json
import os
import re
import numpy as np
from PIL import Image, ImageDraw

C = sys.argv[1]
pts = json.load(open(os.path.join(C, 'work', 'overlay_points.json')))
cals = {'a': json.load(open(os.path.join(C, 'work', 'cal29.json'))),
        'b': json.load(open(os.path.join(C, 'work', 'cal30.json')))}
inks = {'a': np.load(os.path.join(C, 'work', 'p29_native.npy')),
        'b': np.load(os.path.join(C, 'work', 'p30_native.npy'))}
COL = {'wing 2': (220, 0, 0), 'wing 3': (0, 60, 230), 'wing 4': (0, 150, 0)}
SC = 3
os.makedirs(os.path.join(C, 'overlays'), exist_ok=True)
for fig in ('a', 'b'):
    for cal in cals[fig]:
        panel = cal['panel']
        P = [p for p in pts if p['fig'] == fig and p['panel'] == panel]
        if not P:
            continue
        fr = cal['frame_nominal']
        x0, y0 = int(fr['xl']) - 40, int(fr['yt']) - 40
        x1, y1 = int(fr['xr']) + 30, int(fr['yb']) + 30
        sub = inks[fig][y0:y1, x0:x1]
        img = np.where(sub == 1, 150, 255).astype(np.uint8)
        im = Image.fromarray(np.stack([img] * 3, -1)).resize(((x1 - x0) * SC, (y1 - y0) * SC), Image.NEAREST)
        d = ImageDraw.Draw(im)

        def T(x, y):
            return ((x - x0 + 0.5) * SC, (y - y0 + 0.5) * SC)
        labelled = {}
        for p in P:
            col = COL[p['wing']]
            X, Y = T(*p['px'])
            if p['kind'] == 'box':
                hw = (p['box_hw_px'] or 2) * SC
                d.rectangle([X - hw, Y - 2 * SC, X + hw, Y + 2 * SC], outline=col, width=1)
            elif p['kind'] == 'curve_end':
                d.ellipse([X - 7, Y - 7, X + 7, Y + 7], outline=col, width=2)
            elif p['kind'] == 'curve_at_zero':
                d.polygon([(X, Y - 9), (X - 7, Y + 4), (X + 7, Y + 4)], outline=col)
            else:
                d.line([(X - 5, Y), (X + 5, Y)], fill=col, width=2)
                d.line([(X, Y - 5), (X, Y + 5)], fill=col, width=2)
            if p['kind'] == 'curve_end':
                cur = labelled.get(p['cid'])
                if cur is None or p['px'][1] < cur[1]:
                    labelled[p['cid']] = (p['px'][0], p['px'][1], col, p['wing'], p['conf'])
        for cid, (x, y, col, wing, conf) in labelled.items():
            X, Y = T(x, y)
            txt = '%s: %s%s' % (cid, wing, '' if conf == 'high' else ' ? (%s)' % conf)
            d.rectangle([X + 9, Y - 20, X + 9 + 6 * len(txt) + 4, Y - 6], fill=(255, 255, 255))
            d.text((X + 11, Y - 19), txt, fill=col)
        d.rectangle([4, 4, 760, 22], fill=(255, 255, 255))
        d.text((8, 8), 'fig. 8(%s) %s   red wing 2, blue wing 3, green wing 4; + reading, square box, circle end, triangle alpha 0; ? = not high confidence' % (fig, panel), fill=(0, 0, 0))
        name = 'fig8%s_%s.png' % (fig, panel.replace('M=', 'M').replace(', ', '_'))
        im.save(os.path.join(C, 'overlays', name))
        print(name, im.size, len(P), 'points')
