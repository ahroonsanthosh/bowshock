import sys, json
import numpy as np
sys.argv = ['x', sys.argv[1], '1.0']
exec(open(__file__.replace('run_native.py','measure.py')).read())

def half_cross(xs, ys, v, th):
    for i in range(len(v)-1):
        if (v[i]-th)*(v[i+1]-th) < 0:
            f = (v[i]-th)/(v[i]-v[i+1]); return xs[i]+f*(xs[i+1]-xs[i]), ys[i]+f*(ys[i+1]-ys[i])
    return None
def col_edge(x, y0, y1, th=130):
    ys = np.arange(y0, y1, 0.05); xs = np.full_like(ys, x)
    v = map_coordinates(img, [ys, xs], order=1)
    return half_cross(xs, ys, v, th)[1]

circles = {'C1':(564,2511),'C2':(712,2489),'C3':(815,2454),'C4':(915,2409),'C5':(1015,2376),'C6':(1115,2375),'C7':(1208,2921)}
squares = {'S1':(512,2657),'S2':(612,2650),'S3':(815,2621),'S4':(1115,2589)}
out = {}
for n,(x,y) in circles.items():
    cx,cy,r,sd,nu = circle_center(x,y)
    out[n] = dict(x=cx, y=cy, info=f'inner r={r:.2f} fit sd={sd:.2f} n={nu}')
for n,(x,y) in squares.items():
    cx,cy,w,h = square_center(x,y)
    out[n] = dict(x=cx, y=cy, info=f'inner w={w:.2f} h={h:.2f}')
# triangles: outer silhouette edges (half-max, threshold 130) along apex and base columns
W = 2.5  # stroke width estimate, px
tri = {}
# T1: apex column 514, base columns 509..512 (bottom edge scanning downward from inside base stroke)
a1 = np.mean([col_edge(c, 2582, 2590) for c in (514.0, 514.5)])
b1 = np.mean([1.0*__import__('numpy').nan_to_num(0)+ [e for e in [None]][0] if False else 0 for _ in [0]]) if False else None
def bottom_edge(cols, y0, y1):
    vals=[]
    for c in cols:
        ys = np.arange(y0, y1, 0.05); v = map_coordinates(img, [ys, np.full_like(ys, c)], order=1)
        # last crossing from dark to bright
        idx = [i for i in range(len(v)-1) if v[i] < 130 <= v[i+1]]
        i = idx[-1]; f = (130-v[i])/(v[i+1]-v[i]); vals.append(ys[i]+f*0.05)
    return float(np.mean(vals)), float(np.std(vals))
def top_edge(cols, y0, y1):
    vals=[]
    for c in cols:
        ys = np.arange(y0, y1, 0.05); v = map_coordinates(img, [ys, np.full_like(ys, c)], order=1)
        idx = [i for i in range(len(v)-1) if v[i] >= 130 > v[i+1]]
        i = idx[0]; f = (v[i]-130)/(v[i]-v[i+1]); vals.append(ys[i]+f*0.05)
    return float(np.mean(vals)), float(np.std(vals))
T = {}
T['T1'] = dict(apex=top_edge([513.5,514.0,514.5],2582,2592), base=bottom_edge([508,510,512,516,518,520],2596,2604), x=np.mean([514.3,514.0,514.35]))
T['T2'] = dict(apex=None, base=bottom_edge([600,602,604,606,608,610],2594,2603), x=np.mean([605.7,605.8,605.9,605.9,605.95]))
T['T3'] = dict(apex=None, base=bottom_edge([808,810,812,817,818],2557,2565), x=np.mean([813.0,813.25,813.15,813.5]))
T['T4'] = dict(apex=top_edge([1113.5,1114.0,1114.5],2458,2466), base=bottom_edge([1110,1111,1112,1113,1114],2470,2480), x=np.mean([1114.0,1113.6,1113.35,1113.35]))
H = np.mean([T[k]['base'][0]-T[k]['apex'][0] for k in ('T1','T4')]); print('heights', {k:T[k]['base'][0]-T[k]['apex'][0] for k in ('T1','T4')})
for k,t in T.items():
    yb = t['base'][0]
    ya = t['apex'][0] if t['apex'] else yb - H
    yc = (2*yb + ya)/3 - W/6
    out[k] = dict(x=t['x'], y=yc, info=f"apex_top={ya:.2f}{'(from mean height)' if not t['apex'] else ''} base_bottom={yb:.2f}+-{t['base'][1]:.2f} height={yb-ya:.2f}")
print('mean triangle outer height', H)
json.dump(out, open(sys.argv[0].replace('run_native.py','centres_native.json') if False else '/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/f23b-readers/B/scripts/centres_native.json','w'), indent=1)
for k,v in out.items(): print(k, f"x={v['x']:.2f} y={v['y']:.2f}", v['info'])
