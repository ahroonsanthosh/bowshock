import json, sys
out = sys.argv[1]
vx = [2992.2, 3114.8, 3238.2, 3363.4, 3488.2, 3611.3, 3735.9, 3859.2, 3982.9, 4106.1, 4231.5, 4355.7, 4480.6, 4603.6, 4728.3, 4852.6, 4976.4]
vlines = [dict(val=0.5 * i, x=[x, x], y=[3420, 3420]) for i, x in enumerate(vx)]
# y at x=3025 and x=4575, value 1.0 at top down to 0 at bottom
hy = [(2356.7, 2339.7), (2481.5, 2463.8), (2607.2, 2586.8), (2729.6, 2710.5), (2853.4, 2834.9), (2976.2, 2958.7),
      (3098.5, 3082.5), (3221.7, 3203.4), (3346.9, 3328.3), (3471.4, 3453.4), (3592.0, 3578.6)]
hlines = [dict(y=[a, b], x=[3025, 4575], vals={"CDW": round(1.0 - 0.1 * i, 3)}) for i, (a, b) in enumerate(hy) if i != 6]
pts = [dict(id="C4p_a", series="Model 4p", shape="circle", scale="CDW", xy=[3366, 2761], win=8),
       dict(id="C4p_b", series="Model 4p", shape="circle", scale="CDW", xy=[3470, 2633], win=6),
       dict(id="C4p_c", series="Model 4p", shape="circle", scale="CDW", xy=[3741, 2538], win=6),
       dict(id="S6p_a", series="Model 6p", shape="square", scale="CDW", xy=[3473, 2632], fixed=True),
       dict(id="S6p_b", series="Model 6p", shape="square", scale="CDW", xy=[3737, 2567], win=6),
       dict(id="S6p_c", series="Model 6p", shape="square", scale="CDW", xy=[3925, 2510], win=8)]
cfg = dict(page="work/p600-11.png", vlines=vlines, vtrack=[2380, 3580, 30], hlines=hlines, htrack=[3010, 4960, 25],
           shapes={"circle": [30, 4], "square": [30, 4]}, points=pts)
json.dump(cfg, open(out, "w"), indent=1)
