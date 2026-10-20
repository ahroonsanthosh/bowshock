"""Which TN 3819 fig. 18 curve values were read twice? Compares the robust local fits of love18_ransac.py
(data/love18_ransac.json: the lines found near each Mach number) with the adopted curve table (the audit's
reading, data/love_tn3819_fig18.csv) at the ten Mach numbers used for the ratios. A curve value counts as read
twice when some fitted line lies within 0.0004 of it."""
import json
d = json.load(open('data/love18_ransac.json'))
adopted = {1.5: (-0.1775, -0.1733), 1.63: (-0.1717, -0.1667), 1.935: (-0.1539, -0.1486), 2.0: (-0.1496, -0.1447),
           2.414: (-0.1243, -0.1216), 2.5: (-0.1196, -0.1172), 2.681: (-0.1107, -0.1088), 3.0: (-0.0978, -0.0964),
           3.243: (-0.0885, -0.0881), 3.497: (-0.0803, -0.0803)}
n = 0
for M, (more, less) in adopted.items():
    lines = [L['P'] for L in d[str(M) if str(M) in d else ('%g' % M)]]
    out = []
    for name, v in (('more negative', more), ('less negative', less)):
        best = min(lines, key=lambda p: abs(p - v))
        ok = abs(best - v) <= 0.0004
        n += ok
        out.append('%s %.4f: nearest fit %.4f (%+.4f) %s' % (name, v, best, best - v, 'twice' if ok else 'ONE reading'))
    print('M %.3f  ' % M + ' | '.join(out))
print('curve values confirmed by the robust fits: %d of %d' % (n, 2 * len(adopted)))
