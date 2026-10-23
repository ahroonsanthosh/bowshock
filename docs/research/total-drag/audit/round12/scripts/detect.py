"""Round 12: find open symbols (circle, square, ...) in a plot region by matching the legend glyphs.

Usage: python3 -I detect.py PAGE_PNG region=x0,y0,x1,y1 NAME=x0,y0,x1,y1 [NAME=...] [thr=0.75]
Each NAME box is a legend glyph (page pixels, inclusive). The glyph's ink pixels score +1 and the
pixels inside its outline (the hole) score -1; the score is (ink hits - hole hits) / ink count, so a
clean match is 1.0. A line through a symbol costs a little; a filled blob scores low.
Prints local maxima above thr for every glyph, with a 1 px refined centre (score-weighted mean of the
3x3 neighbourhood) in page pixels. Centres are the centre of the glyph's bounding box.
"""
import sys
import numpy as np
from PIL import Image

page = sys.argv[1]
args = dict(a.split('=') for a in sys.argv[2:])
thr = float(args.pop('thr', 0.75))
rx0, ry0, rx1, ry1 = map(int, args.pop('region').split(','))
ink = (np.array(Image.open(page).convert('L')) < 128).astype(float)


def hole(mask):
    """Pixels not reachable from the box edge without crossing ink (flood fill)."""
    h, w = mask.shape
    out = np.zeros_like(mask, bool)
    stack = [(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)]
    while stack:
        y, x = stack.pop()
        if 0 <= y < h and 0 <= x < w and not out[y, x] and not mask[y, x]:
            out[y, x] = True
            stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return ~out & ~mask


def corr(img, k):
    H, W = img.shape
    h, w = k.shape
    F = np.fft.rfft2(img, (H + h, W + w))
    G = np.fft.rfft2(k[::-1, ::-1], (H + h, W + w))
    full = np.fft.irfft2(F * G, (H + h, W + w))
    return full[h - 1:H, w - 1:W]  # valid part: out[i,j] = sum img[i:i+h, j:j+w]*k


reg = ink[ry0:ry1, rx0:rx1]
classify = args.pop('classify', '0') == '1'
maps, allpeaks = {}, []
for name, box in args.items():
    x0, y0, x1, y1 = map(int, box.split(','))
    g = ink[y0 - 1:y1 + 2, x0 - 1:x1 + 2] > 0  # 1 px margin
    hl = hole(g)
    # erode hole by 1 so near-misses of the outline are not punished
    hl2 = hl.copy()
    hl2[1:-1, 1:-1] = hl[1:-1, 1:-1] & hl[:-2, 1:-1] & hl[2:, 1:-1] & hl[1:-1, :-2] & hl[1:-1, 2:]
    k = g.astype(float) - hl2.astype(float)
    n = g.sum()
    s = corr(reg, k) / n
    h, w = k.shape
    cy, cx = (h - 1) / 2, (w - 1) / 2
    peaks = []
    for i in range(1, s.shape[0] - 1):
        for j in range(1, s.shape[1] - 1):
            v = s[i, j]
            if v >= thr and v == s[i - 1:i + 2, j - 1:j + 2].max():
                win = np.clip(s[i - 1:i + 2, j - 1:j + 2] - thr, 0, None)
                ii, jj = np.mgrid[-1:2, -1:2]
                wy = (win * ii).sum() / win.sum() if win.sum() else 0
                wx = (win * jj).sum() / win.sum() if win.sum() else 0
                peaks.append((rx0 + j + wx + cx, ry0 + i + wy + cy, v))
    # suppress peaks closer than 4 px (keep best)
    peaks.sort(key=lambda p: -p[2])
    kept = []
    for p in peaks:
        if all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 > 16 for q in kept):
            kept.append(p)
    kept.sort(key=lambda p: p[1])
    maps[name] = (s, cx, cy)
    allpeaks += [(name,) + p for p in kept]
    if classify:
        continue
    print(f'# {name}: glyph {w}x{h}, ink {int(n)} px, hole {int(hl2.sum())} px, {len(kept)} peaks >= {thr}')
    for x, y, v in kept:
        print(f'{name},{x:.2f},{y:.2f},{v:.3f}')

if classify:
    # merge peaks of all glyphs closer than 6 px; report every glyph's best score within 2 px
    allpeaks.sort(key=lambda p: -p[3])
    groups = []
    for p in allpeaks:
        for g in groups:
            if (p[1] - g[0][1]) ** 2 + (p[2] - g[0][2]) ** 2 < 36:
                g.append(p); break
        else:
            groups.append([p])
    groups.sort(key=lambda g: g[0][2])
    names = list(maps)
    print('best,x,y,' + ','.join(f'{n}_score,{n}_x,{n}_y' for n in names) + ',margin')
    for g in groups:
        x, y = g[0][1], g[0][2]
        out = []
        for n in names:
            s, cx, cy = maps[n]
            j, i = int(round(x - rx0 - cx)), int(round(y - ry0 - cy))
            win = s[max(i - 2, 0):i + 3, max(j - 2, 0):j + 3]
            k = np.unravel_index(np.argmax(win), win.shape)
            bi, bj = max(i - 2, 0) + k[0], max(j - 2, 0) + k[1]
            out.append((float(s[bi, bj]), rx0 + bj + cx, ry0 + bi + cy))
        order = sorted(range(len(names)), key=lambda q: -out[q][0])
        b = order[0]
        margin = out[b][0] - (out[order[1]][0] if len(order) > 1 else 0)
        print(f'{names[b]},{out[b][1]:.1f},{out[b][2]:.1f},' + ','.join(f'{v:.3f},{px:.1f},{py:.1f}' for v, px, py in out) + f',{margin:.3f}')
