import sys, math
def zones(path):
    z = {}; cur = None
    for line in open(path):
        s = line.strip()
        if s.upper().startswith('ZONE'):
            cur = s; z[cur] = []
        elif cur and s and not s.startswith('#') and not s.upper().startswith('VAR'):
            a = s.split(); z[cur].append((float(a[0]), float(a[1])))
    return z
vd = zones(sys.argv[1]); sa = zones(sys.argv[2])
vdk = list(vd.keys()); sak = list(sa.keys())
for i in range(4):
    v = vd[vdk[i]]; s = sa[sak[i]]
    def interp(x):
        for (x0, y0), (x1, y1) in zip(v, v[1:]):
            if x0 <= x <= x1: return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    rs = [(x, y / interp(x)) for x, y in s if 4000 <= x <= 13000 and interp(x)]
    r = [q for _, q in rs]
    print(vdk[i], '|', sak[i])
    print('  SA/VDII over 4000<Retheta<13000: min %.4f max %.4f mean %.4f (n=%d)' % (min(r), max(r), sum(r)/len(r), len(r)))
    for x, q in rs[::max(1, len(rs)//5)]: print('   Retheta %.0f ratio %.4f' % (x, q))
