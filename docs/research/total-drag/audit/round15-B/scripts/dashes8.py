"""Dash pattern of each assigned chain (fig. 8), to check line style (wing) calls.

usage: python3 -I dashes8.py <render_dir> <cal_json> <comp_dir> <cfg_module> [panel ...]

For consecutive pieces of a chain, the raw (unmasked) ink is sampled on the straight segment
between their facing ends. If the segment is inked over at least 80 % of its length, the two
pieces are one stroke cut by a grid line or a scan strip boundary; otherwise the gap is a real
dash gap. Prints the stroke lengths and gap lengths in render px (legend, same scale: wing 2
dashes about 64 px, gaps 22; wing 3 dashes about 30, gaps 19; wing 4 alternates about 62 and 26,
gaps 20).
"""
import sys, os, json, math, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import calib
from read8 import chain_geometry


def main():
    rdir, calp, compd, cfgname = sys.argv[1:5]
    only = sys.argv[5:]
    cfg = importlib.import_module(cfgname)
    CAL = json.load(open(calp))
    gcache = {}
    for pname, P in cfg.PANELS.items():
        if only and pname not in only:
            continue
        cal = CAL[pname]
        if cal['img'] not in gcache:
            gcache[cal['img']] = calib.load_gray(os.path.join(rdir, cal['img']))
        g = gcache[cal['img']]
        comps = {c['id']: c for c in json.load(open(os.path.join(compd, f'comps_{pname}.json')))}
        for cname, C in P['curves'].items():
            geo = chain_geometry(C['chain'], comps, cal)
            strokes = []
            gaps = []
            cur = 0.0
            for i, (inf, a, b) in enumerate(geo):
                cur += math.dist(a, b) + 8   # piece length end-centre to end-centre plus caps
                if i == len(geo) - 1:
                    strokes.append(cur)
                    break
                nb = geo[i + 1][1]
                d = math.dist(b, nb)
                n = max(int(d), 2)
                xs = np.linspace(b[0], nb[0], n)
                ys = np.linspace(b[1], nb[1], n)
                inked = (g[np.round(ys).astype(int), np.round(xs).astype(int)] < 128).mean()
                if inked >= 0.8:
                    cur += d - 8
                else:
                    strokes.append(cur)
                    gaps.append(d - 8)
                    cur = 0.0
            print(f"{pname} {cname} ({C['series']}): strokes " + ' '.join(f'{s:.0f}' for s in strokes))
            print(f"{'':>{len(pname)}} {'':>{len(cname)}}  gaps    " + ' '.join(f'{s:.0f}' for s in gaps))


if __name__ == '__main__':
    main()
