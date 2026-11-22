import math, glob, sys
case, step = sys.argv[1], int(sys.argv[2])
out = []
for f in sorted(glob.glob(case + '/postProcessing/resid/*/volFieldValue.dat'), key=lambda p: float(p.split('/')[-2])):
    rows = [l.split() for l in open(f) if l[0] != '#']
    for r in rows[::step]:
        v = float(r[1])
        out.append(r[0] + ':' + (str(round(0.5*math.log10(v) - math.log10(1.4), 2)) if v > 0 else '0'))
print(' '.join(out))
