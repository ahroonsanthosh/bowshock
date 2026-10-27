"""Assemble the per-figure CSV files from the fitted points and curve reads.

Usage: python3 -I assemble.py BDIR
Reads BDIR/work/out/*.json and the page images; writes BDIR/<figure>.csv.
"""
import csv
import itertools
import json
import math
import os
import subprocess
import sys

B = sys.argv[1]
OUT = os.path.join(B, 'work', 'out')
sys.path.insert(0, os.path.join(B, 'scripts'))
import figlib as fl  # noqa: E402

COLS = ['source', 'item', 'series', 'configuration', 'mach', 'x', 'x_quantity', 'y', 'y_quantity',
        'alternatives', 'flag', 'page', 'note']


def load(name):
    return json.load(open(os.path.join(OUT, name + '_points.json')))


def fx(v, nd):
    return f"{v:.{nd}f}"


def overlaps(pts):
    """Map id -> list of (other point, distance) for strong overlaps
    (centre distance below the larger symbol size)."""
    res = {}
    for a, b in itertools.combinations(pts, 2):
        if a['panel'] != b['panel']:
            continue
        d = math.hypot(a['u_fit'] - b['u_fit'], a['v_fit'] - b['v_fit'])
        if d < max(a['size_used'], b['size_used']):
            res.setdefault(a['id'], []).append((b, d))
            res.setdefault(b['id'], []).append((a, d))
    return res


def err_note(p, xnd, ynd):
    s = f"read error x +-{p['ex']:.{xnd}f}, y +-{p['ey']:.{ynd}f}"
    if p.get('fixed'):
        s += '; centre set by hand: ' + p.get('method_note', '')
    else:
        s += f"; centre from template fit to the symbol's strokes (pixel {p['u_fit']:.2f}, {p['v_fit']:.2f})"
    return s


def write(name, rows):
    with open(os.path.join(B, name), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, '') for k in COLS})
    print(name, len(rows))


def symbol_rows(pts, base, cfg_fn, series_fn, mach_fn, xnd, ynd, extra_note=None, flag_fn=None, alt_fn=None):
    ov = overlaps(pts)
    rows = []
    for p in pts:
        r = dict(base)
        r['item'] = base['item_fn'](p) if 'item_fn' in base else base['item']
        r.pop('item_fn', None)
        r['series'] = series_fn(p)
        r['configuration'] = cfg_fn(p)
        r['mach'] = mach_fn(p)
        r['x'] = fx(p['x'], xnd)
        r['y'] = fx(p['y'], ynd)
        notes = [err_note(p, xnd, ynd)]
        alts = []
        flag = 'ok'
        if p['id'] in ov:
            flag = 'ambiguous'
            for q, d in ov[p['id']]:
                notes.append(f"overlaps {q['series'].split(':')[0].split(',')[0]} ({q['id']}), centres {d:.1f} px apart")
                if d < 2.0:
                    notes.append('the two symbols coincide; both outlines are visible')
                if (p['kind'], p.get('sym')) != (q['kind'], q.get('sym')):
                    alts.append(f"y={fx(q['y'], ynd)} x={fx(q['x'], xnd)} (if identities of {p['id']} and {q['id']} are swapped)")
                else:
                    notes.append('same symbol type, so a swap of identities would not change the readings; centre found by fitting the visible arc of each outline')
        if extra_note:
            en = extra_note(p)
            if en:
                notes.append(en)
        if flag_fn:
            f2 = flag_fn(p)
            if f2:
                flag = f2
        if alt_fn:
            a2 = alt_fn(p)
            if a2:
                alts.extend(a2)
                if flag == 'ok':
                    flag = 'ambiguous'
        r['flag'] = flag
        r['alternatives'] = '; '.join(alts)
        r['note'] = '; '.join(notes)
        rows.append(r)
    return rows


# ------------------------------------------------------------------ RM E51F26
EPS = {'a': '5.63', 'b': '7.03', 'c': '9.33'}
SYM_E51 = {'circle': 'open circle: angular station theta 15 deg', 'square': 'open square: angular station theta 50 deg',
           'diamond': 'open diamond: angular station theta 90 deg'}


def e51_side(figname, csvname, page, dbdm, label):
    pts = load(figname)
    base = {'source': 'RM E51F26', 'x_quantity': 'Axial distance from model tip, x, body diameters',
            'y_quantity': 'Pressure coefficient, C_p = (p - p0)/q0 (free-stream reference, symbol list p.3)',
            'page': str(page), 'item_fn': lambda p: f"fig. {figname.split('_f')[1]}({p['panel']})"}
    rows = symbol_rows(
        pts, base,
        cfg_fn=lambda p: f"conical boattail epsilon {EPS[p['panel']]} deg; Db/Dm {dbdm} ({label}); alpha 0 deg; no jet flow",
        series_fn=lambda p: SYM_E51[p['kind']],
        mach_fn=lambda p: '1.91',
        xnd=3, ynd=4,
        extra_note=lambda p: f"Mach 1.91 is the free-stream (tunnel) Mach number from the text (PDF p.7), not printed on the figure; orifice station group {p['group']}")
    return rows


rows7 = e51_side('e51_f7', 'rme51f26_fig7.csv', 29, '0.506', 'completely boattailed')
write('rme51f26_fig7.csv', rows7)
rows8 = e51_side('e51_f8', 'rme51f26_fig8.csv', 30, '0.704', 'incompletely boattailed')
write('rme51f26_fig8.csv', rows8)

# figure 24
pts = load('e51_f24')
SER24 = {'oc': 'open circle (no flag): Db/Dm 0.506, C_p,b', 'fc': 'flagged circle (tail at lower left): Db/Dm .506, C\'_p,b',
         'os': 'open square (no flag): Db/Dm .704, C_p,b', 'fs': 'flagged square (tail at lower left): Db/Dm .704, C\'_p,b',
         'd': 'open diamond: Db/Dm 1, C\'_p,b', 't': 'right-triangle symbol: Model from reference 6'}
CFG24 = {'oc': 'conical boattail, Db/Dm 0.506', 'fc': 'conical boattail, Db/Dm 0.506', 'os': 'conical boattail, Db/Dm 0.704',
         'fs': 'conical boattail, Db/Dm 0.704', 'd': 'cylindrical afterbody, Db/Dm 1 (epsilon 0)',
         't': 'model from reference 6 (reference list, PDF p.22: NACA RM E50D10, NACA RM-10 missile, fins removed); boattail angle as plotted'}
YQ24 = {'oc': "C_p,b: base pressure coefficient on free-stream conditions, (pb - p0)/q0", 'os': "C_p,b: base pressure coefficient on free-stream conditions, (pb - p0)/q0",
        'fc': "C'_p,b: base pressure coefficient referenced to conditions just upstream of base, (pb - p1)/q1 (symbol list p.3)",
        'fs': "C'_p,b: base pressure coefficient referenced to conditions just upstream of base, (pb - p1)/q1 (symbol list p.3)",
        'd': "C'_p,b: base pressure coefficient referenced to conditions just upstream of base, (pb - p1)/q1 (symbol list p.3)",
        't': "axis: Base pressure coefficients, C_p,b and C'_p,b; the legend does not say which one this symbol shows"}
rows24 = []
for p in pts:
    s = p['sym']
    note = (f"read error x +-{p['ex']:.3f} deg, y +-{p['ey']:.4f}; centre from template fit to the symbol's strokes "
            f"(pixel {p['u_fit']:.2f}, {p['v_fit']:.2f}); axis: Base pressure coefficients, C_p,b and C'_p,b; alpha 0, no jet flow (caption); "
            "the legend gives no Mach number for the plotted points (the M1 values 1.30, 1.91, 2.10, 3.50 label only the predicted C'_p,b lines)")
    mach = '1.91'
    flag = 'ok'
    alts = ''
    if s == 't':
        mach = ''
        flag = 'ambiguous'
        note += "; Mach number not given for this point (reference 6 title: Mach numbers 1.49 to 1.98); coefficient type not stated by the legend"
        alts = "C_p,b or C'_p,b (coefficient type unknown); value read y as given"
    else:
        note += "; Mach 1.91 is the free-stream Mach number of the tests (text PDF p.7)"
    rows24.append({'source': 'RM E51F26', 'item': 'fig. 24', 'series': SER24[s], 'configuration': CFG24[s] + '; alpha 0; no jet flow',
                   'mach': mach, 'x': fx(p['x'], 3), 'x_quantity': 'Boattail angle, epsilon (deg)', 'y': fx(p['y'], 4),
                   'y_quantity': YQ24[s], 'alternatives': alts, 'flag': flag, 'page': '48', 'note': note})
write('rme51f26_fig24.csv', rows24)


# figures 29 and 30
def trace_read(name, x):
    d = json.load(open(os.path.join(OUT, f'trace_{name}.json')))
    for r in d['reads']:
        if abs(r['x'] - x) < 1e-6:
            return r
    return None


def e51_drag(fig, page, dbdm, k):
    pts = load(f'e51_f{fig}')
    PAN = {'a': '(a) Base pressure drag and friction drag', 'b': '(b) Side pressure drag', 'c': '(c) Total drags'}
    SER = {'a': 'open circle: Experimental base drag',
           'b': f'open circle on the curve labelled Experimental ({k} characteristics)',
           'c': 'open circle: Pressure drag'}
    rows = []
    for p in pts:
        eps0 = p['id'].endswith('e0')
        cfg = ('epsilon 0: cylindrical afterbody (Db/Dm 1)' if eps0 else f'conical boattail, Db/Dm {dbdm}') + '; alpha 0; no jet flow'
        note = (f"read error x +-{p['ex']:.3f} deg, y +-{p['ey']:.4f}; centre from template fit to the symbol's strokes "
                f"(pixel {p['u_fit']:.2f}, {p['v_fit']:.2f}); panel {PAN[p['panel']]}; reference area of C_D not stated on the figure; "
                "Mach 1.91 free-stream from the text (PDF p.7)")
        if eps0:
            note += '; symbol sits on the y axis line (epsilon 0); x read slightly negative as plotted'
        rows.append({'source': 'RM E51F26', 'item': f"fig. {fig}({p['panel']})", 'series': SER[p['panel']], 'configuration': cfg,
                     'mach': '1.91', 'x': fx(p['x'], 3), 'x_quantity': 'Boattail angle, epsilon, deg', 'y': fx(p['y'], 4),
                     'y_quantity': 'Drag coefficient, C_D', 'alternatives': '', 'flag': 'ok', 'page': str(page), 'note': note})
    # curves
    calf = {'a': json.load(open(os.path.join(OUT, f'e51_f{fig}_a_cal.json'))), 'c': json.load(open(os.path.join(OUT, f'e51_f{fig}_c_cal.json')))}
    for x in (5.63, 7.03, 9.33):
        r = trace_read(f'e51_f{fig}_fric', x)
        cal = calf['a']
        ey = abs(cal['cy'][2]) * max(0.5, 2 * r['spread_px']) + cal['rms_y']
        extra = ''
        alts = ''
        flag = 'curve'
        if fig == 30 and x == 9.33:
            extra = '; near its right end the friction curve runs into the horizontal leader line of its label; this value may be on the leader'
        rows.append({'source': 'RM E51F26', 'item': f'fig. {fig}(a)', 'series': 'curve: Friction (C_f = 0.003)',
                     'configuration': f'conical boattail, Db/Dm {dbdm}; alpha 0; no jet flow', 'mach': '1.91', 'x': fx(x, 2),
                     'x_quantity': 'Boattail angle, epsilon, deg', 'y': fx(r['y'], 4), 'y_quantity': 'Drag coefficient, C_D',
                     'alternatives': alts, 'flag': flag, 'page': str(page),
                     'note': f"curve read at the tested angle (column-wise centre of the line, {r['ncols']} columns); read error y +-{ey:.4f}; "
                             "friction drag is drawn only as a curve labelled Friction (C_f = 0.003), a computed estimate rather than a measurement" + extra})
    for x in (5.63, 7.03, 9.33):
        nm = f'e51_f{fig}_tot' if x < 9 else f'e51_f{fig}_totR'
        r = trace_read(nm, x)
        cal = calf['c']
        row = {'source': 'RM E51F26', 'item': f'fig. {fig}(c)', 'series': 'curve: Experimental pressure drag plus friction drag',
               'configuration': f'conical boattail, Db/Dm {dbdm}; alpha 0; no jet flow', 'mach': '1.91', 'x': fx(x, 2),
               'x_quantity': 'Boattail angle, epsilon, deg', 'y_quantity': 'Drag coefficient, C_D', 'flag': 'curve', 'page': str(page)}
        if r is None or r.get('y') is None:
            row.update(y='', alternatives='0.1141 (value at the drawn right end of the curve, epsilon 9.17; reading at 9.33 would need extrapolation, not done)',
                       note='the curve ends at epsilon about 9.17, short of the tested angle 9.33; left empty')
        else:
            ey = abs(cal['cy'][2]) * max(0.5, 2 * r['spread_px']) + cal['rms_y']
            row.update(y=fx(r['y'], 4), alternatives='',
                       note=f"curve read at the tested angle (column-wise centre of the line, {r['ncols']} columns); read error y +-{ey:.4f}; "
                            "this component is drawn only as a curve, no symbols")
        rows.append(row)
    return rows


write('rme51f26_fig29.csv', e51_drag(29, 56, '0.506', '0.83'))
write('rme51f26_fig30.csv', e51_drag(30, 57, '0.704', '0.85'))

# ------------------------------------------------------------------ TN 3819
PB = 'Base pressure coefficient, P_B = (pB - p_inf)/q_inf (free-stream reference, symbol list PDF p.6)'
pts = load('t3819_f19')
M19 = {'a': '2.41', 'b': '1.93', 'c': '1.62'}
R19 = {'a': ('.25 x 10^6', '1.00 x 10^6'), 'b': ('.30 x 10^6', '1.20 x 10^6'), 'c': ('.35 x 10^6', '1.40 x 10^6')}
base = {'source': 'TN 3819', 'x_quantity': 'Fineness ratio, L/D', 'y_quantity': PB, 'page': '50',
        'item_fn': lambda p: f"fig. 19({p['panel']})"}


def f19_note(p):
    s = 'M_inf as given under the panel (free-stream); legend gives no data source for these points'
    if p['id'] == 'bL4s':
        s += '; square largely hidden behind the circle at the same station'
    return s


rows = symbol_rows(pts, base,
                   cfg_fn=lambda p: 'cone-cylinder: 15 deg cone semi-angle (sketch), D = 1 in. (sketch), overall length L as x (L up to 5 in. in sketch)',
                   series_fn=lambda p: f"open {p['kind']}: R/inch {R19[p['panel']][0 if p['kind'] == 'circle' else 1]}",
                   mach_fn=lambda p: M19[p['panel']], xnd=3, ynd=4, extra_note=f19_note)
write('tn3819_fig19.csv', rows)

pts = load('t3819_f21')
SER21 = {'oc': 'open circle', 'fc': 'flagged circle (short tick at upper right)', 'sq': 'open square', 'tr': 'open triangle (apex up)',
         'di': 'open diamond (taller than wide)'}
base = {'source': 'TN 3819', 'item': 'fig. 21', 'x_quantity': 'Mach number, M_inf', 'y_quantity': PB, 'page': '52'}


def f21_note(p):
    s = ('legend: All experimental points taken from compilation of Ref. 2; the legend does not explain the different symbol shapes, '
         'so the symbol meaning (source within Ref. 2) is unknown; mach = x as read')
    if p['id'] == 'p33':
        s += '; this diamond lies well above the other points near M 2.9 (out of line); read as plotted'
    if p['id'] in ('p17', 'p18'):
        s += '; two circle outlines almost concentric (offset about 9 px): read as two points; could be one symbol drawn twice'
    return s


def f21_alt(p):
    if p['id'] == 'p18':
        return ['no separate point (if the second outline is a redrawing of p17)']
    return None


rows = symbol_rows(pts, base, cfg_fn=lambda p: '10 deg cone-cylinder of fineness ratio 5 (caption)',
                   series_fn=lambda p: SER21[p['sym']] + ': source compilation of Ref. 2 (legend)',
                   mach_fn=lambda p: fx(p['x'], 3), xnd=3, ynd=4, extra_note=f21_note,
                   flag_fn=lambda p: 'ambiguous', alt_fn=f21_alt)
write('tn3819_fig21.csv', rows)

pts = load('t3819_f23')
SER23 = {'square': 'open square: Ames', 'circle': 'open circle: NOL, ref. 5', 'tri': 'open triangle: Ames'}
CFG23 = {'square': 'legend sketch: simple cone with flat base (negative beta = cone, text p.17)',
         'circle': 'legend sketch: cone nose, cylinder, conical boattail',
         'tri': 'legend sketch: ogive nose, cylinder, conical boattail'}
base = {'source': 'TN 3819', 'item': 'fig. 23', 'x_quantity': 'Boattail angle, beta, deg', 'y_quantity': PB, 'page': '54'}
rows = symbol_rows(pts, base, cfg_fn=lambda p: CFG23[p['kind']] + '; boattail angle beta as x', series_fn=lambda p: SER23[p['kind']],
                   mach_fn=lambda p: '2.9', xnd=2, ynd=4,
                   extra_note=lambda p: 'caption gives M_inf approximately 2.9 (free-stream)' + (
                       '; triangle overlaps the circle at beta about 15 (centres 14 px apart)' if p['id'] in ('p10', 'p11') else ''),
                   alt_fn=lambda p: ['x=15.28 y=-0.0636 (template fit, pulled toward the overlapping circle)'] if p['id'] == 'p11' else None)
write('tn3819_fig23.csv', rows)

pts = load('t3819_f24')
base = {'source': 'TN 3819', 'x_quantity': 'Boattail angle, beta, deg', 'y_quantity': PB, 'page': '55',
        'item_fn': lambda p: f"fig. 24({p['panel']})"}
rows = symbol_rows(pts, base,
                   cfg_fn=lambda p: f"conical boattail, h/D = {'0.506' if p['panel'] == 'a' else '0.704'} (panel caption); beta as x",
                   series_fn=lambda p: 'open circle: Exp. mean value (Cortright-Schroeder)', mach_fn=lambda p: '1.91',
                   xnd=2, ynd=4,
                   extra_note=lambda p: 'caption gives M_inf = 1.91 (free-stream)' + (
                       '; text p.17: for the experimental results at beta = 5.63 deg the boundary layer was inadvertently thickened' if p['group'].endswith('563') else ''))
write('tn3819_fig24.csv', rows)

pts = load('t3819_f25b')
base = {'source': 'TN 3819', 'item': 'fig. 25(b)', 'x_quantity': 'Boattail angle, beta, deg', 'y_quantity': PB, 'page': '56'}
rows = symbol_rows(pts, base, cfg_fn=lambda p: 'conical boattail (reference 5 models); beta as x; fig. 25(a) axis label gives D = 1.97 inches',
                   series_fn=lambda p: 'open circle: Exp. ref. 5', mach_fn=lambda p: '3.24', xnd=2, ynd=4,
                   extra_note=lambda p: 'caption gives M_inf = 3.24 (free-stream)' + ('; symbol sits on the y axis line' if p['id'] == 'b00' else ''))
write('tn3819_fig25b.csv', rows)

# ------------------------------------------------------------------ RM A52E20
pts = load('a52_f15')
SER15 = {'c': 'open circle: From Ref. 4', 's10': 'open square: From Ref. 10', 's11': 'open square: From Ref. 11',
         'fs': 'flagged square (tick at upper right): From unpublished data NACA Ames 1- by 3-foot SSWT'}
CFG15 = {'c': 'Ogive-cylinder, l/d = 7 (no boattail; legend sketch)', 's10': 'Ogive-cylinder with boattail, l/d = 7 (legend sketch)',
         's11': 'Ogive-cylinder with boattail, l/d = 7 (legend sketch)', 'fs': 'Ogive-cylinder with boattail, l/d = 7 (legend sketch)'}
BL = {'a': 'panel (a) Laminar boundary layer, Re = 3.0 x 10^6', 'b': 'panel (b) Turbulent boundary layer, Re = 5.0 x 10^6'}
base = {'source': 'RM A52E20', 'x_quantity': 'Mach number, M_0', 'y_quantity': 'Base pressure coefficient, P_b = (pb - p0)/q0 (referred to free-stream conditions, notation PDF p.4)',
        'page': '44', 'item_fn': lambda p: f"fig. 15({p['panel']})"}
rows = symbol_rows(pts, base, cfg_fn=lambda p: CFG15[p['sym']], series_fn=lambda p: SER15[p['sym']],
                   mach_fn=lambda p: fx(p['x'], 3), xnd=3, ynd=4,
                   extra_note=lambda p: (BL[p['panel']] + ' (boundary-layer state and Re as the panel caption gives them; Re based on body length per text p.3; '
                                         'the figure does not say whether the caption Re applies to the reference points); mach = x as read (free-stream M_0); '
                                         'figure title: corrected for condensation'))
for pan, lab, span in (('a', 'solid curve: Present tests Model 3 (Ogive-cylinder l/d = 7)', 'drawn from about M 2.6 to 4.7'),
                       ('a', 'dashed curve: Present tests Model 8 (Ogive-cylinder with boattail l/d = 7)', 'drawn from about M 3.1 to 4.7'),
                       ('b', 'solid curve: Present tests Model 3 (Ogive-cylinder l/d = 7)', 'drawn from about M 2.6 to 4.7'),
                       ('b', 'dashed curve: Present tests (Ogive-cylinder with boattail l/d = 7)', 'drawn from about M 2.6 to 4.7')):
    rows.append({'source': 'RM A52E20', 'item': f'fig. 15({pan})', 'series': lab,
                 'configuration': 'Ogive-cylinder l/d = 7' if 'Model 3' in lab else 'Ogive-cylinder with boattail l/d = 7 (model 8)',
                 'mach': '', 'x': '', 'x_quantity': 'Mach number, M_0', 'y': '',
                 'y_quantity': 'Base pressure coefficient, P_b', 'alternatives': '', 'flag': 'untraced', 'page': '44',
                 'note': f"{BL[pan]}; the present-test results are drawn only as a curve without symbols ({span}, approximate); "
                         "the brief asks for plotted points only and names no curve here, so the curve was not read"})
write('rma52e20_fig15.csv', rows)

# ------------------------------------------------------------------ TN 3372
pts = load('t3372_f10')
img = os.path.join(B, 'render', 'tn3372', 'p19-000.jpg')
cal10 = json.load(open(os.path.join(OUT, 't3372_f10_main_cal.json')))
dots = {}
for p in pts:
    o = subprocess.run(['python3', '-I', os.path.join(B, 'scripts', 'dotfind.py'), img, str(p['u_fit']), str(p['v_fit']), '5'],
                       capture_output=True, text=True).stdout.split()
    du, dv, pk = float(o[2]), float(o[4]), float(o[6])
    dots[p['id']] = (du, dv, pk, fl.apply_xform(cal10, du, dv))
SER10 = {'square': 'square with centre dot: Edge orifice', 'circle': 'circle with centre dot: Center orifice'}
base = {'source': 'TN 3372', 'item': 'fig. 10', 'x_quantity': 'Mach number, M',
        'y_quantity': 'Delta p / q: base pressure minus free-stream static pressure, divided by free-stream dynamic pressure (text p.3); axis drawn with negative values upward',
        'page': '19'}


def f10_alt(p):
    du, dv, pk, (x, y) = dots[p['id']]
    if pk > 30 and (abs(y - p['y']) >= 0.0005 or abs(x - p['x']) >= 0.002):
        return [f"y={fx(y, 4)} x={fx(x, 3)} (from the symbol's centre dot instead of its outline)"]
    return None


def f10_note(p):
    s = ('configuration D (converging afterbody, base diameter 3.3 in., dummy rocket chamber with nozzle exit flush with base); one model flown; '
         'free flight, assumed at or near zero angle of attack (text p.4); no jet (cold dummy chamber); mach = x as read')
    if p.get('faint'):
        s += '; symbol very faint in the scan'
    if p['id'] in ('c18', 'c19'):
        s += '; circle faint in the scan, part of its outline missing'
    return s


def f10_flag(p):
    if p.get('faint') or p['id'] in ('c18', 'c19', 's03'):
        return 'ambiguous'
    return None


rows = symbol_rows(pts, base, cfg_fn=lambda p: 'configuration D', series_fn=lambda p: SER10[p['kind']],
                   mach_fn=lambda p: fx(p['x'], 3), xnd=3, ynd=4, extra_note=f10_note, flag_fn=f10_flag, alt_fn=f10_alt)
write('tn3372_fig10.csv', rows)

cal12 = json.load(open(os.path.join(OUT, 't3372_f12_main_cal.json')))
rows = []
for fname, ser in (('f12_edge_read.json', 'curve: Config. D edge orifice'), ('f12_center_read.json', 'curve: Config. D center orifice')):
    for r in json.load(open(os.path.join(OUT, fname))):
        if r.get('y') is None:
            continue
        ey = abs(cal12['cy'][2]) * max(0.6, r['run_px'] / 3.0) + cal12['rms_y']
        st = r['station']
        lab = st if isinstance(st, str) else f'station M {st:.2f}'
        note = (f"{lab}; curve read in pixel column {r['u']} (shift {r['shift_px']} px from the station to the nearest drawn column clear of grid lines); "
                f"stroke run {r['run_px']} px; read error y +-{ey:.4f}; x as read; configuration D curve drawn without symbols")
        alts = ''
        flag = 'curve'
        if ser.endswith('edge orifice') and isinstance(st, float) and abs(st - 0.99) < 1e-6:
            note += '; the label arrow for Config. D edge orifice ends on the curve here; the arrowhead may bias the reading'
        if ser.endswith('center orifice') and isinstance(st, float) and abs(st - 0.95) < 1e-6:
            note += '; the label arrow for Config. D center orifice ends on the curve here; the arrowhead may bias the reading'
        if r['run_px'] >= 9:
            note += '; steep part of the curve: y poorly defined in a single column'
        rows.append({'source': 'TN 3372', 'item': 'fig. 12', 'series': ser, 'configuration': 'configuration D', 'mach': fx(r['x'], 3),
                     'x': fx(r['x'], 3), 'x_quantity': 'Mach number, M', 'y': fx(r['y'], 4),
                     'y_quantity': 'Delta p / q (text p.3); axis drawn with negative values upward', 'alternatives': alts,
                     'flag': flag, 'page': '20', 'note': note})
write('tn3372_fig12.csv', rows)
