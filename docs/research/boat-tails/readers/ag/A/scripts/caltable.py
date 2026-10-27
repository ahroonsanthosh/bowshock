# usage: python3 -I caltable.py <out.md>  -> markdown calibration table from cal/*.out.json
import json, glob, os, sys
names = {
 'l54c16_f5a': ('RM L54C16 fig. 5(a)', 22), 'l54c16_f5b': ('RM L54C16 fig. 5(b)', 22),
 'l54i22_f2a': ('RM L54I22 fig. 2(a)', 16), 'l54i22_f2b': ('RM L54I22 fig. 2(b)', 16), 'l54i22_f2c': ('RM L54I22 fig. 2(c)', 16),
 'e57_f6a': ('RM E57E06 fig. 6(a)', 49), 'e57_f6b': ('RM E57E06 fig. 6(b)', 49), 'e57_f7a': ('RM E57E06 fig. 7(a)', 50),
 'e57_f8a': ('RM E57E06 fig. 8(a)', 52), 'e57_f8b': ('RM E57E06 fig. 8(b)', 52),
 'e57_f14a': ('RM E57E06 fig. 14(a)', 60), 'e57_f14b': ('RM E57E06 fig. 14(b)', 60), 'e57_f14c': ('RM E57E06 fig. 14(c)', 60),
 'd_f5a': ('TN D-6789 fig. 5, M 1.83', 21), 'd_f5b': ('TN D-6789 fig. 5, M 2.20', 21),
 'd_f12a': ('TN D-6789 fig. 12, l/dm 0.6', 35), 'd_f12b': ('TN D-6789 fig. 12, l/dm 0.8', 35), 'd_f12c': ('TN D-6789 fig. 12, l/dm 1.0', 35),
 'd_f18a': ('TN D-6789 fig. 18, M 1.83', 47), 'd_f18b': ('TN D-6789 fig. 18, M 2.20', 47), 'd_f20': ('TN D-6789 fig. 20', 49),
 'x_f5c': ('TM X-1960 fig. 5(c)', 34), 'x_f6c': ('TM X-1960 fig. 6(c)', 37), 'x_f7a': ('TM X-1960 fig. 7(a) (page rotated 90 deg cw)', 38),
 'x_f7b': ('TM X-1960 fig. 7(b) (rotated)', 39), 'x_f7c': ('TM X-1960 fig. 7(c) (rotated)', 40), 'x_f7d': ('TM X-1960 fig. 7(d) (rotated)', 41),
 'x_f11': ('TM X-1960 fig. 11 (rotated)', 48), 'x_f18': ('TM X-1960 fig. 18, M 1.20 panel', 83)}
for pg in 'abcdef':
    for k, l in ((1, '0.6'), (2, '0.8'), (3, '1.0')):
        names[f'd_f7{pg}{k}'] = (f'TN D-6789 fig. 7({pg}), l/dm {l}', {'a': 23, 'b': 24, 'c': 25, 'd': 26, 'e': 27, 'f': 28}[pg])
out = ['| figure | PDF page | x ticks: value @ px (1-D residual) | y ticks: value @ px (1-D residual) | 2-D fit rms (x; y, data units) |', '|---|---|---|---|---|']
for key, (nm, pg) in names.items():
    f = f'cal/{key}.out.json'
    if not os.path.exists(f): out.append(f'| {nm} | {pg} | missing | | |'); continue
    c = json.load(open(f))
    def fmt(t):
        s = []
        for v in t:
            val, px, res = v[0], v[1], v[2] if len(v) > 2 else None
            if isinstance(px, (int, float)): s.append(f"{val:g}@{px:.1f}" + (f" ({res:+.1g})" if isinstance(res, (int, float)) else ''))
            else: s.append(f"{val:g}@{px}" + (f" ({res:+.1g})" if isinstance(res, (int, float)) else ''))
        return '; '.join(s)
    out.append(f"| {nm} | {pg} | {fmt(c['ticks_x'])} | {fmt(c['ticks_y'])} | {c['rms_x']:.2g}; {c['rms_y']:.2g} |")
open(sys.argv[1], 'w').write('\n'.join(out) + '\n'); print(len(out) - 2, 'rows')
