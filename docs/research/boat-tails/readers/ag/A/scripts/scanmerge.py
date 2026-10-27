# usage: python3 -I scanmerge.py <scan.json> <out.json> [mind=6]
# merges scan candidates: where candidates of different shapes lie within mind px, keeps the one with
# the highest coverage*mean (ties to higher coverage); prints the survivors sorted by x
import sys, json, math
R = json.load(open(sys.argv[1])); mind = float(sys.argv[3]) if len(sys.argv) > 3 else 6
R.sort(key=lambda r: -(r['cov'] * r['mean']))
keep = []
for r in R:
    if any(math.hypot(r['x'] - k['x'], r['y'] - k['y']) < mind for k in keep): continue
    keep.append(r)
keep.sort(key=lambda r: (r['x'], r['y']))
json.dump(keep, open(sys.argv[2], 'w'), indent=0)
for i, r in enumerate(keep):
    print(f"{i:3d} {r['shape']:>8} ({r['x']:.0f},{r['y']:.0f}) cov {r['cov']:.2f} mean {r['mean']:.0f} inner {r['inner']:.0f}")
