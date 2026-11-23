"""Wall total pressure / pitot by angle on a hemisphere's cap: (area-weighted mean, worst) per band."""
import csv, math, sys
bands = [(0, 5), (5, 15), (15, 30), (30, 45), (45, 60), (60, 75), (75, 90)]
for path in sys.argv[1:]:
    rows = [list(map(float, r)) for r in list(csv.reader(open(path)))[1:]]
    R = max(r[3] for r in rows)
    out = []
    for lo, hi in bands:
        s = w = 0.0; worst = 0.0
        for x0, r0, x1, r1, cp, p0 in rows:
            xm, rm = 0.5 * (x0 + x1), 0.5 * (r0 + r1)
            if xm > R: continue
            th = math.degrees(math.atan2(rm, R - xm))
            if lo <= th < hi:
                a = rm * math.hypot(x1 - x0, r1 - r0)
                s += a * (p0 - 1); w += a
                if abs(p0 - 1) > abs(worst): worst = p0 - 1
        out.append(f"{100*s/w:+.3f}({100*worst:+.2f})" if w else "  -  ")
    print(path.replace("/wall.csv", ""), " ".join(out))
