"""Split the curve ink of one fig. 8 panel into connected pieces (dashes) after removing grid lines.

usage: python3 -I comp8.py <render_dir> <cal_json> <panel> <out_dir> [scale]

Ink = gray < 128 (the source is bilevel). Grid lines are removed with masks centred on the fitted
lines (half width 5.5 px inside, 7.5 px for the frame). Remaining ink inside the frame is split
into 8-connected components. For each component the table gives pixel count, centroid and the
two ends along its main axis, in plot units (x = (Pb-P0)/q, y = alpha deg). An overlay image
shows every component in colour with its id, for assigning dashes to curves by eye.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import calib, trace


def grid_mask(shape, cal, x0, y0, hw_in=5.5, hw_frame=7.5):
    H, W = shape
    yy, xx = np.mgrid[0:H, 0:W]
    yy = yy + y0
    xx = xx + x0
    m = np.zeros(shape, bool)
    nv = len(cal['vlines'])
    for i, l in enumerate(cal['vlines']):
        if l is None:
            continue
        a, b = l
        hw = hw_frame if i in (0, nv - 1) else hw_in
        m |= np.abs(xx - (a + b * yy)) <= hw
    nh = len(cal['hlines'])
    for j, l in enumerate(cal['hlines']):
        if l is None:
            continue
        a, b = l
        hw = hw_frame if j in (0, nh - 1) else hw_in
        m |= np.abs(yy - (a + b * xx)) <= hw
    return m


def components(ink):
    H, W = ink.shape
    lab = np.zeros((H, W), int)
    ys, xs = np.nonzero(ink)
    n = 0
    for y, x in zip(ys, xs):
        if lab[y, x]:
            continue
        n += 1
        stack = [(y, x)]
        lab[y, x] = n
        while stack:
            cy, cx = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and ink[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n
                        stack.append((ny, nx))
    return lab, n


def panel_roi(cal):
    # frame corners from the fitted frame lines
    v0, v8 = cal['vlines'][0], cal['vlines'][-1]
    h0, h8 = cal['hlines'][0], cal['hlines'][-1]
    pts = [calib.intersect(v, h) for v in (v0, v8) for h in (h0, h8)]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return int(min(xs)) - 2, int(min(ys)) - 2, int(max(xs)) + 3, int(max(ys)) + 3


def analyse(rdir, cal):
    g = calib.load_gray(os.path.join(rdir, cal['img']))
    L, T, R, Bm = panel_roi(cal)
    sub = g[T:Bm, L:R]
    ink = sub < 128
    gm = grid_mask(sub.shape, cal, L, T)
    ink2 = ink & ~gm
    # keep only inside the frame (mask already removes frame lines; trim outside)
    lab, n = components(ink2)
    comps = []
    cx, cy = cal['cx'], cal['cy']
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(xs) < 6:
            continue
        px = xs + L
        py = ys + T
        X, Y = trace.fwd(cx, cy, px.astype(float), py.astype(float))
        mx, my = px.mean(), py.mean()
        cov = np.cov(np.vstack([px - mx, py - my])) if len(px) > 2 else np.eye(2)
        w, v = np.linalg.eigh(cov)
        d = v[:, 1]
        proj = (px - mx) * d[0] + (py - my) * d[1]
        i0, i1 = int(np.argmin(proj)), int(np.argmax(proj))
        e0 = trace.fwd(cx, cy, float(px[i0]), float(py[i0]))
        e1 = trace.fwd(cx, cy, float(px[i1]), float(py[i1]))
        comps.append(dict(id=k, n=int(len(xs)), cx=float(X.mean()), cy=float(Y.mean()),
                          length=float(proj.max() - proj.min()),
                          width=float(len(xs) / max(proj.max() - proj.min(), 1)),
                          e0=[float(e0[0]), float(e0[1])], e1=[float(e1[0]), float(e1[1])],
                          px=px.tolist(), py=py.tolist()))
    return g, (L, T, R, Bm), lab, comps, gm


def main():
    rdir, calp, panel, outd = sys.argv[1:5]
    scale = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
    cal = json.load(open(calp))[panel]
    g, (L, T, R, Bm), lab, comps, gm = analyse(rdir, cal)
    os.makedirs(outd, exist_ok=True)
    json.dump(comps, open(os.path.join(outd, f'comps_{panel}.json'), 'w'))
    rng = np.random.RandomState(3)
    im = Image.fromarray(np.where(gm, 215, 255).astype(np.uint8)).convert('RGB')
    arr = np.asarray(im).copy()
    sub = g[T:Bm, L:R]
    arr[(sub < 128) & gm] = (150, 150, 150)
    cols = {}
    for c in comps:
        col = tuple(int(v) for v in rng.randint(0, 200, 3))
        cols[c['id']] = col
        arr[np.array(c['py']) - T, np.array(c['px']) - L] = col
    im = Image.fromarray(arr)
    im = im.resize((int(im.size[0] * scale), int(im.size[1] * scale)), Image.NEAREST)
    d = ImageDraw.Draw(im)
    font = ImageFont.load_default(size=int(13 * max(scale, 1)))
    for c in comps:
        if c['n'] < 15:
            continue
        x = (np.mean(c['px']) - L) * scale + 6
        y = (np.mean(c['py']) - T) * scale - 8
        d.text((x, y), str(c['id']), fill=cols[c['id']], font=font)
    im.save(os.path.join(outd, f'comps_{panel}.png'))
    for c in sorted(comps, key=lambda c: -c['cy']):
        if c['n'] < 15:
            continue
        print(f"{c['id']:4d} n={c['n']:4d} len={c['length']:5.0f} w={c['width']:4.1f} "
              f"ctr=({c['cx']:+.3f},{c['cy']:5.2f}) ends=({c['e0'][0]:+.3f},{c['e0'][1]:5.2f})"
              f"-({c['e1'][0]:+.3f},{c['e1'][1]:5.2f})")


if __name__ == '__main__':
    main()
