import json, csv, math
import numpy as np
r = json.load(open('readings_fit.json')); inner = json.load(open('centres_inner.json'))
sens = [json.load(open(f)) for f in ['sens_13_1.4.json','sens_13_2.4.json','sens_17_1.4.json','sens_17_2.4.json']]
mach = {'o':'1.5','t':'2.0','s':'2.9'}; sym = {'o':'circle','t':'triangle','s':'square'}
CAL = 0.5
rows = []; table = []
for n,i in r.items():
    sx = max(0.3, max(abs(s[n]['px']-i['px']) for s in sens))
    sy = max(0.3, max(abs(s[n]['py']-i['py']) for s in sens))
    if i['kind'] != 't' and not math.isnan(inner[n]['py']):
        sx = max(sx, abs(inner[n]['px']-i['px'])); sy = max(sy, abs(inner[n]['py']-i['py']))
    if i['kind'] == 't':
        conv = abs(i['py'] - i['py_bboxmid'])/2     # centroid vs bounding-box middle
        sy = math.hypot(sy, conv)
        if n == 't2': sy = math.hypot(sy, 0.5)       # apex partly under the fairing
    e_dh = math.hypot(sx, CAL) * 0.2/i['cell_w_px']
    e_pb = math.hypot(sy, CAL) * 0.08/i['cell_h_px']
    e_dh = math.ceil(e_dh*1e4)/1e4; e_pb = math.ceil(e_pb*1e4)/1e4
    flags = ''; alt = ''
    if n == 'c7':
        flags = 'ambiguous'
        alt = ('mach=2.0 (all three fairings end at this one circle; no triangle is drawn here); '
               'mach=2.9 (same; no square is drawn here); '
               'possibly a common limiting point for all three Mach numbers rather than a measured M=1.5 point')
    rows.append(dict(mach=mach[i['kind']], legend_symbol=sym[i['kind']], d_over_h=f"{i['d_over_h']:.4f}", p_b=f"{i['p_b']:.4f}",
                     d_over_h_error=f"{e_dh:.4f}", p_b_error=f"{e_pb:.4f}", flags=flags, alternatives=alt, _n=n))
    table.append((n, i['px'], i['py'], sx, sy, e_dh, e_pb))
rows.sort(key=lambda d: (float(d['mach']), float(d['d_over_h'])))
cols = ['mach','legend_symbol','d_over_h','p_b','d_over_h_error','p_b_error','flags','alternatives']
with open('f23b.csv','w',newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore', lineterminator='\n'); w.writeheader()
    for d in rows: w.writerow(d)
for d in rows: print(d['_n'], d['mach'], d['legend_symbol'], d['d_over_h'], d['p_b'], d['d_over_h_error'], d['p_b_error'], d['flags'])
print()
for t in table: print("%s px=%.2f py=%.2f sig_cx=%.2f sig_cy=%.2f" % t[:5])
