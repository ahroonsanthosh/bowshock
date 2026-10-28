import sys, json
import numpy as np
# gridline fits from fitgrid.py (native 300 ppi pixels): vertical x = a + b*y ; horizontal y = c + d*x
V = {0.0:(241.50,-0.01034), 0.2:(445.59,-0.01095), 0.4:(651.11,-0.01367), 0.6:(847.78,-0.01281), 0.8:(1050.43,-0.01350), 1.0:(1252.18,-0.01507)}
H = {-0.32:(2144.99,0.00976), -0.24:(2342.10,0.00946), -0.16:(2536.33,0.01020), -0.08:(2731.22,0.00966), 0.0:(2925.77,0.00979)}
if len(sys.argv) > 3:
    g = json.load(open(sys.argv[3])); V = {float(k):tuple(v) for k,v in g['V'].items()}; H = {float(k):tuple(v) for k,v in g['H'].items()}
aff = json.load(open(sys.argv[2])) if len(sys.argv) > 2 and sys.argv[2] != '-' else None
c = json.load(open(sys.argv[1]))
vk = sorted(V); hk = sorted(H, reverse=True)  # hk: 0.0, -0.08, ... (increasing y downward means p from -0.32 top to 0 bottom)
def local(x, y):
    xs = [(k, V[k][0] + V[k][1]*y) for k in vk]
    for (k0,x0),(k1,x1) in zip(xs, xs[1:]):
        if x0 <= x <= x1 or (k1 == vk[-1] and x > x1) or (k0 == vk[0] and x < x0):
            dh = k0 + (k1-k0)*(x-x0)/(x1-x0); break
    ys = sorted([(H[k][0] + H[k][1]*x, k) for k in H])  # ascending y: -0.32 first
    for (y0,k0),(y1,k1) in zip(ys, ys[1:]):
        if y0 <= y <= y1 or (k1 == 0.0 and y > y1):
            p = k0 + (k1-k0)*(y-y0)/(y1-y0); break
    return dh, p
order=['C1','C2','C3','C4','C5','C6','C7','T1','T2','T3','T4','S1','S2','S3','S4']
res = {}
for n in order:
    x, y = c[n]['x'], c[n]['y']
    dh, p = local(x, y)
    line = f'{n}: px=({x:8.2f},{y:8.2f})  local d/h={dh:.4f} p={p:+.4f}'
    if aff:
        cx, cy = aff['cx'], aff['cy']
        dha = cx[0]*x + cx[1]*y + cx[2]; pa = cy[0]*x + cy[1]*y + cy[2]
        line += f'   affine d/h={dha:.4f} p={pa:+.4f}  diff d/h={dha-dh:+.4f} p={pa-p:+.4f}'
    res[n] = (dh, p)
    print(line)
json.dump(res, open(sys.argv[1].replace('.json','_data.json'),'w'), indent=1)
