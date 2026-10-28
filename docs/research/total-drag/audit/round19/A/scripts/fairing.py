import sys, json
import numpy as np
from PIL import Image
img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
g = json.load(open(sys.argv[2])); f = json.load(open(sys.argv[3]))
Hl = [v for v in g['h'].values()]; Vl = [v for v in g['v'].values()]
def ongrid(x, y, hw=2.2):
    for b,a in Hl:
        if abs(y - (a + b*x)) < hw: return True
    for b,a in Vl:
        if abs(x - (a + b*y)) < hw: return True
    return False
bg = np.percentile(img[2150:2900, 300:1200], 90); ink = np.percentile(img[2150:2900, 300:1200], 1)
D = np.clip((bg - img)/(bg - ink), 0, 1)
def column_runs(x, ylo, yhi):
    col = D[ylo:yhi, x]; runs = []; y = 0
    while y < len(col):
        if col[y] > 0.5:
            s = y
            while y < len(col) and col[y] > 0.5: y += 1
            seg = np.arange(s, y); w = col[s:y]
            runs.append((ylo + (seg*w).sum()/w.sum(), y - s))
        else: y += 1
    return runs
for n, info in f.items():
    cx, cy = info['px'], info['py']
    r_out = 9 if info['kind']=='t' else 8
    samples = []
    for dx in list(range(-26, -r_out)) + list(range(r_out+1, 27)):
        x = int(round(cx + dx))
        best = None
        prev = None
        for yc, ln in column_runs(x, int(cy)-30, int(cy)+30):
            if ln > 7: continue                     # steep part / symbol / thick blob
            if ongrid(x, yc): continue
            if best is None or abs(yc - cy) < abs(best - cy): best = yc
        if best is not None and abs(best - cy) < 22: samples.append((x, best))
    s = np.array(samples)
    if len(s) < 6:
        print(n, "too few curve samples", len(s)); continue
    left = s[s[:,0] < cx]; right = s[s[:,0] > cx]
    deg = 2 if (len(left) > 4 and len(right) > 4) else 1
    p = np.polyfit(s[:,0], s[:,1], deg)
    resid = s[:,1] - np.polyval(p, s[:,0])
    # drop outliers once
    k = np.abs(resid) < 2.5
    p = np.polyfit(s[k,0], s[k,1], deg)
    yc = np.polyval(p, cx)
    slope = np.polyval(np.polyder(p), cx)
    perp = (cy - yc)/np.sqrt(1+slope**2)
    print(f"{n}: curve y at cx = {yc:.1f}, symbol cy = {cy:.1f}, vertical offset {cy-yc:+.1f} px (+ = symbol below curve), perpendicular {perp:+.1f} px, slope {slope:+.2f}, samples L{len(left)} R{len(right)} deg{deg} rms {np.std(resid[k]):.2f}")
