import sys, json
import numpy as np
from PIL import Image
img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
g = json.load(open(sys.argv[2]))
Hl = sorted([(float(k),v) for k,v in g['h'].items()])          # y = a + b x ; keys -0.32..0
Vl = sorted([(float(k),v) for k,v in g['v'].items()])          # x = a + b y
syms = {
 'c1':('o',564,2512),'c2':('o',713,2489),'c3':('o',815,2455),'c4':('o',915,2408),'c5':('o',1015,2376),'c6':('o',1115,2376),'c7':('o',1207,2920),
 't1':('t',516,2593),'t2':('t',606,2590),'t3':('t',815,2554),'t4':('t',1115,2467),
 's1':('s',513,2656),'s2':('s',613,2649),'s3':('s',815,2623),'s4':('s',1115,2589)}
HW = 14  # half window
def darkness(win):
    bg = np.percentile(win, 90); ink = np.percentile(win, 3)
    return np.clip((bg - win)/(bg - ink), 0, 1)
def gridmask(x0, y0, shape, halfw=1.8):
    """True where pixel lies within halfw px of a fitted gridline"""
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    X = xx + x0; Y = yy + y0
    m = np.zeros(shape, bool)
    for _,(b,a) in Hl: m |= np.abs(Y - (a + b*X)) < halfw
    for _,(b,a) in Vl: m |= np.abs(X - (a + b*Y)) < halfw
    return m
def run_from(profile, start, step):
    """walk from index start in direction step while profile<0.5; return subpixel 50% crossing"""
    i = start
    n = len(profile)
    while 0 <= i+step < n and profile[i+step] < 0.5:
        i += step
    if not (0 <= i+step < n): return None
    a, b = profile[i], profile[i+step]
    return i + step*(0.5 - a)/(b - a)
def chords(D, seed, axis):
    """for each line through the white interior, return (line coord, lo edge, hi edge)"""
    out = []
    sy, sx = seed
    if axis == 'h':
        for r in range(D.shape[0]):
            prof = D[r]
            # interior column closest to seed that is white
            cand = [c for c in range(sx-3, sx+4) if 0<=c<D.shape[1] and prof[c] < 0.5]
            if not cand: continue
            c = min(cand, key=lambda c: abs(c-sx))
            lo = run_from(prof, c, -1); hi = run_from(prof, c, +1)
            if lo is None or hi is None: continue
            out.append((r, lo, hi))
    else:
        for c in range(D.shape[1]):
            prof = D[:, c]
            cand = [r for r in range(sy-3, sy+4) if 0<=r<D.shape[0] and prof[r] < 0.5]
            if not cand: continue
            r = min(cand, key=lambda r: abs(r-sy))
            lo = run_from(prof, r, -1); hi = run_from(prof, r, +1)
            if lo is None or hi is None: continue
            out.append((c, lo, hi))
    return out
res = {}
for name,(kind,gx,gy) in syms.items():
    x0, y0 = gx-HW, gy-HW
    win = img[y0:y0+2*HW+1, x0:x0+2*HW+1]
    D = darkness(win)
    gm = gridmask(x0, y0, D.shape)
    # seed: lightest pixel near the guess that is not on a gridline
    sub = np.where(gm, 9, D)[HW-4:HW+5, HW-4:HW+5]
    sy, sx = np.unravel_index(np.argmin(sub), sub.shape); sy += HW-4; sx += HW-4
    # erase gridline pixels only inside the interior: flood white region first with gridline treated as white
    Dg = D.copy()
    # interior estimate: pixels within 5 px of seed
    yy, xx = np.mgrid[0:D.shape[0], 0:D.shape[1]]
    near = (yy-sy)**2 + (xx-sx)**2 <= 5.0**2
    Dg[gm & near] = 0.0
    hc = chords(Dg, (sy,sx), 'h'); vc = chords(Dg, (sy,sx), 'v')
    # reject chords that run along a gridline (parallel) : check gridmask fraction on the chord line
    def ok_h(r): return gm[r, sx-3:sx+4].mean() < 0.5
    def ok_v(c): return gm[sy-3:sy+4, c].mean() < 0.5
    hc = [h for h in hc if ok_h(h[0]) and (h[2]-h[1]) < 12]
    vc = [v for v in vc if ok_v(v[0]) and (v[2]-v[1]) < 12]
    info = {'kind':kind, 'nh':len(hc), 'nv':len(vc)}
    hmid = np.array([(lo+hi)/2 for _,lo,hi in hc]); hwid = np.array([hi-lo for _,lo,hi in hc]); hrow = np.array([r for r,_,_ in hc])
    vmid = np.array([(lo+hi)/2 for _,lo,hi in vc]); vcol = np.array([c for c,_,_ in vc])
    vlo = np.array([lo for _,lo,_ in vc]); vhi = np.array([hi for _,_,hi in vc])
    cx = np.median(hmid)
    if kind in ('o','s'):
        cy = np.median(vmid)
        info['cx_sd'] = float(np.std(hmid)); info['cy_sd'] = float(np.std(vmid))
        info['inner_w'] = float(np.median(hwid)); info['inner_h'] = float(np.median(vhi-vlo))
    else:
        # triangle: base = bottom inner edge (vhi) for central columns; apex from width-vs-row fit
        central = np.abs(vcol - cx) <= 2
        ybase = np.median(vhi[central])
        # width vs row: use rows where width > 2
        sel = hwid > 2.0
        p = np.polyfit(hrow[sel], hwid[sel], 1)
        yapex = -p[1]/p[0]
        cy = ybase - (ybase - yapex)/3.0
        info.update(ybase=float(ybase), yapex=float(yapex), slope=float(p[0]), cy_bboxmid=float(y0+(ybase+yapex)/2))
        info['cx_sd'] = float(np.std(hmid))
    info['px'] = float(x0+cx); info['py'] = float(y0+cy)
    res[name] = info
    print(name, kind, f"px=({x0+cx:.2f},{y0+cy:.2f}) nh={len(hc)} nv={len(vc)}", {k:(round(v,2) if isinstance(v,float) else v) for k,v in info.items() if k not in ('px','py','kind','nh','nv')})
json.dump(res, open(sys.argv[3],'w'), indent=1)
