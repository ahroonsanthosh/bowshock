# usage: python3 -I px2data.py <cal.out.json> x y [x y ...]   -> data coordinates via the affine calibration
import sys, json
c = json.load(open(sys.argv[1])); v = list(map(float, sys.argv[2:]))
for i in range(0, len(v), 2):
    px, py = v[i], v[i + 1]
    X = c['ax'][0] + c['ax'][1] * px + c['ax'][2] * py; Y = c['ay'][0] + c['ay'][1] * px + c['ay'][2] * py
    if c['spec'].get('xscale') == 'log': X = 10 ** X
    if c['spec'].get('yscale') == 'log': Y = 10 ** Y
    print(f"({px},{py}) -> X {X:.5f}  Y {Y:.5f}")
