#!/usr/bin/env python3
"""Pair the two blind readings of the boat-tail figures (0014 10.7 (ae)).

Run from the repository root:

    python3 -I docs/research/boat-tails/readers/pairing-2026-10-26/pair.py \
        docs/research/boat-tails/readers \
        docs/research/boat-tails/readers/pairing-2026-10-26

The first argument is the folder that holds A/ and B/ (the two readers'
committed readings), the second the output folder. Needs numpy and scipy
(scipy's optimal assignment is used to pair symbols by position).

The two readings are compared with each other only. No value is
averaged, smoothed, corrected or settled: where the readings differ,
both are kept, with their envelope (the smaller and the larger value).
Nothing here reads or uses a computed result.

Outputs: pairs_<figure>.csv (every row of both readings), geometry_pairs.csv,
flags.csv and pairing.txt.
"""

import csv
import hashlib
import math
import os
import re
import sys
from collections import Counter, OrderedDict, defaultdict

import numpy as np
from scipy.optimize import linear_sum_assignment

FIGS = [
    ('rme51f26_fig7', 'RM E51F26 fig. 7'),
    ('rme51f26_fig8', 'RM E51F26 fig. 8'),
    ('rme51f26_fig24', 'RM E51F26 fig. 24'),
    ('rme51f26_fig29', 'RM E51F26 fig. 29'),
    ('rme51f26_fig30', 'RM E51F26 fig. 30'),
    ('tn3819_fig19', 'TN 3819 fig. 19'),
    ('tn3819_fig21', 'TN 3819 fig. 21'),
    ('tn3819_fig23', 'TN 3819 fig. 23'),
    ('tn3819_fig24', 'TN 3819 fig. 24'),
    ('tn3819_fig25b', 'TN 3819 fig. 25(b)'),
    ('rma52e20_fig15', 'RM A52E20 fig. 15'),
    ('tn3372_fig10', 'TN 3372 fig. 10'),
    ('tn3372_fig12', 'TN 3372 fig. 12'),
]
COLS = ['source', 'item', 'series', 'configuration', 'mach', 'x', 'x_quantity',
        'y', 'y_quantity', 'alternatives', 'flag', 'page', 'note']
GCOLS = ['source', 'quantity', 'value', 'unit', 'page', 'note']

# "reading error x +-0.0027, y +-0.00025" (A), "read error x +-0.002, y +-0.0002"
# or "read error y +-0.0006" (B)
ERR = re.compile(r'read(?:ing)? error (?:x \+-([0-9.]+)(?: deg)?, )?y \+-([0-9.]+)')

GATE = 12.0      # largest symbol distance, in units of the summed stated errors
MISMATCH = 3.0   # cost added when the two readers name a different symbol
BIG = 1.0e9


# Section: reading

def num(s):
    s = s.strip()
    return float(s) if s else None


def half_unit(s):
    """Half a unit in the last printed digit of a value as printed."""
    s = s.strip()
    if '.' in s:
        return 0.5 * 10.0 ** (-len(s.split('.')[1]))
    return 0.5


def load(path):
    rows = []
    with open(path, newline='', encoding='utf-8') as f:
        rd = csv.DictReader(f)
        if rd.fieldnames != COLS:
            raise SystemExit(f'{path}: unexpected columns {rd.fieldnames}')
        for i, r in enumerate(rd, 1):
            r = dict(r)
            m = ERR.search(r['note'])
            r['_row'] = i
            r['_ex_text'] = m.group(1) if (m and m.group(1)) else ''
            r['_ey_text'] = m.group(2) if m else ''
            r['_ex'] = float(r['_ex_text']) if r['_ex_text'] else 0.0
            r['_ey'] = float(r['_ey_text']) if r['_ey_text'] else 0.0
            r['_xv'] = num(r['x'])
            r['_yv'] = num(r['y'])
            rows.append(r)
    return rows


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def norm_ws(s):
    return ' '.join(s.split())


# Section: series and labels

def shape(s):
    sl = s.lower()
    flagged = 'flagged' in sl
    for sh in ('right-triangle', 'triangle', 'diamond', 'square', 'circle'):
        if sh in sl:
            base = 'triangle' if sh == 'right-triangle' else sh
            return ('flagged ' if flagged else '') + base
    return ''


def key(fig, r):
    """The symbol or curve a row belongs to, in the same words for both readers."""
    s = r['series']
    sl = s.lower()
    if fig in ('rme51f26_fig7', 'rme51f26_fig8'):
        th = re.search(r'theta (\d+)', s).group(1)
        return f'theta {th} deg ({shape(s)})'
    if fig == 'rme51f26_fig24':
        return shape(s)
    if fig in ('rme51f26_fig29', 'rme51f26_fig30'):
        if 'plus friction' in sl:
            return 'pressure drag plus friction drag (curve)'
        if 'friction' in sl:
            return 'friction drag, Cf 0.003 (curve)'
        if 'base drag' in sl:
            return 'experimental base drag (circle)'
        if 'characteristics' in sl:
            return 'experimental side pressure drag (circle)'
        if 'pressure drag' in sl:
            return 'pressure drag (circle)'
    if fig == 'tn3819_fig19':
        rn = re.search(r'R/inch\s*([0-9.]+)', s).group(1)
        return f'{shape(s)}, R/inch {float(rn):.2f} x 10^6'
    if fig in ('tn3819_fig21', 'tn3819_fig23', 'tn3819_fig24', 'tn3819_fig25b'):
        return shape(s)
    if fig == 'rma52e20_fig15':
        if ' line' in sl or 'curve' in sl:
            return 'present tests, ' + ('solid' if 'solid' in sl else 'dashed') + ' curve'
        for k, v in (('ref. 4', 'Ref. 4'), ('ref. 10', 'Ref. 10'),
                     ('ref. 11', 'Ref. 11'), ('unpublished', 'unpublished Ames data')):
            if k in sl:
                return f'{shape(s)}, {v}'
    if fig == 'tn3372_fig10':
        return 'square, edge orifice' if 'edge' in sl else 'circle, center orifice'
    if fig == 'tn3372_fig12':
        return 'edge orifice curve' if 'edge' in sl else 'center orifice curve'
    raise SystemExit(f'no series key for {fig}: {s}')


def grab(pat, s):
    m = re.search(pat, s)
    return m.group(1) if m else ''


def fnum(s):
    if not s:
        return ''
    if s.startswith('.'):
        s = '0' + s
    return f'{float(s):g}'


def coefficient(fig, r):
    q = r['y_quantity']
    ql = q.lower()
    if 'drag coefficient' in ql:
        sym = 'C_D'
    elif 'delta p' in ql:
        sym = 'delta p/q'
    elif fig == 'rme51f26_fig24':
        if 'does not say' in ql:
            sym = "not stated (Cp,b or C'p,b)"
        else:
            head = re.split(r'[(:]', q)[0].replace('_', '').lower()
            sym = "C'p,b" if "c'p,b" in head else 'Cp,b'
    elif fig in ('rme51f26_fig7', 'rme51f26_fig8'):
        sym = 'Cp'
    else:
        sym = 'P_B' if fig.startswith('tn3819') else 'P_b'
    if sym == "C'p,b":
        ref = 'conditions just upstream of the base'
    elif sym.startswith('not stated') or sym == 'C_D':
        ref = ''   # for C_D the reference is compared as 'C_D reference area'
    elif 'free-stream' in ql or 'free stream' in ql:
        ref = 'free stream'
    else:
        ref = ''
    return sym, ref


def attrs(fig, r):
    """Labels of a row, reduced to what can be compared between readers.

    An empty value means the reader does not state it in that row."""
    c, n, s = r['configuration'], r['note'], r['series']
    cl, nl = c.lower(), n.lower()
    d = OrderedDict()
    d['series'] = key(fig, r)
    if 'mach' not in r['x_quantity'].lower():
        d['mach'] = r['mach'].strip()
    sym, ref = coefficient(fig, r)
    d['coefficient'] = sym
    d['coefficient reference'] = ref
    d['page'] = r['page'].strip()
    d['alpha 0 stated in configuration'] = 'yes' if re.search(r'alpha 0|zero angle of attack', cl) else ''
    if fig in ('rme51f26_fig7', 'rme51f26_fig8'):
        d['boat-tail angle'] = grab(r'(?:boattail angle|epsilon) ([0-9.]+) deg', c)
        d['Db/Dm'] = fnum(grab(r'Db/Dm ([0-9.]+)', c))
        d['no jet stated'] = 'yes' if 'no jet' in cl else ''
    if fig == 'rme51f26_fig24':
        d['Db/Dm'] = fnum(grab(r'Db/Dm (\.?[0-9.]+)', s))
        d['no jet stated'] = 'yes' if 'no jet' in cl else ''
    if fig in ('rme51f26_fig29', 'rme51f26_fig30'):
        d['Db/Dm'] = fnum(grab(r'Db/Dm (\.?[0-9.]+)', c))
        d['no jet stated'] = 'yes' if 'no jet' in cl else ''
        if 'q0 pi dm^2' in r['y_quantity'].lower():
            d['C_D reference area'] = 'q0 pi Dm^2/4 (symbol list)'
        elif 'reference area of c_d not stated' in nl:
            d['C_D reference area'] = 'not stated on the figure'
        else:
            d['C_D reference area'] = ''
    if fig.startswith('rme51f26') and fig != 'rme51f26_fig7':
        d['early-transition note (RM E51F26 PDF p. 11)'] = (
            'yes' if 'inadvertent early transition' in cl + ' ' + nl else '')
    if fig == 'tn3819_fig19':
        d['cone angle'] = grab(r'half-angle (\d+)', c) or grab(r'(\d+) deg cone', c)
        d['body diameter'] = '1 in' if re.search(r'diameter 1 in|D = 1 in', c) else ''
    if fig == 'tn3819_fig21':
        d['cone angle'] = grab(r'(\d+) deg cone', c)
        d['fineness ratio'] = grab(r'fineness ratio (\d+)', c)
        d['source (compilation of Ref. 2)'] = 'yes' if 'compilation of ref. 2' in (s + ' ' + n).lower() else ''
    if fig == 'tn3819_fig23':
        src = 'Ames' if 'ames' in s.lower() else ('NOL, ref. 5' if 'nol' in s.lower() else '')
        d['source'] = src
        if 'simple cone' in cl:
            sk = 'simple cone'
        elif 'conical boattail' in cl:
            sk = 'nose, cylinder, conical boattail'
        elif 'constant diameter' in cl:
            sk = 'nose and an afterbody of constant diameter (no boat-tail drawn)'
        else:
            sk = ''
        d['legend sketch'] = sk
    if fig == 'tn3819_fig24':
        d['h/D'] = grab(r'h/D = ([0-9.]+)', c)
        d['thickened boundary-layer note (TN 3819 p. 17)'] = 'yes' if 'thickened' in cl + ' ' + nl else ''
    if fig == 'tn3819_fig25b':
        d['body diameter 1.97 in'] = 'yes' if '1.97' in c else ''
    if fig == 'rma52e20_fig15':
        d['boat-tail'] = 'with boattail' if 'with boattail' in cl else 'no boattail'
        d['l/d'] = grab(r'l/d = ?([0-9.]+)', c)
        d['boundary layer'] = ('laminar' if 'laminar' in nl else 'turbulent' if 'turbulent' in nl else '')
        d['Re'] = grab(r'Re = ([0-9.]+ x 10\^6)', n)
    if fig.startswith('tn3372'):
        d['configuration D'] = 'yes' if 'configuration d' in cl else ''
    return d


def label_diffs(fig, a, b):
    da, db = attrs(fig, a), attrs(fig, b)
    out = []
    for k in da:
        va, vb = da[k], db.get(k, '')
        if va == vb:
            continue
        if va and vb:
            out.append(('differ', k, va, vb))
        else:
            out.append(('stated by one only', k, va, vb))
    return out


# Section: pairing

def kind(r):
    if r['_yv'] is None:
        return 'empty'
    if r['flag'] == 'curve':
        return 'curve'
    return 'symbol'


def norm_item(s):
    return s.replace(' ', '').lower()


def assign(pa, pb, cost):
    if not pa or not pb:
        return [], list(pa), list(pb)
    C = np.full((len(pa), len(pb)), BIG)
    for i, a in enumerate(pa):
        for j, b in enumerate(pb):
            c = cost(a, b)
            if c is not None:
                C[i, j] = c
    ri, ci = linear_sum_assignment(C)
    pairs, ua, ub = [], set(range(len(pa))), set(range(len(pb)))
    for i, j in zip(ri, ci):
        if C[i, j] < BIG:
            pairs.append((pa[i], pb[j]))
            ua.discard(i)
            ub.discard(j)
    return pairs, [pa[i] for i in sorted(ua)], [pb[j] for j in sorted(ub)]


def symbol_cost(fig):
    def cost(a, b):
        sx = max(a['_ex'] + b['_ex'], 1e-9)
        sy = max(a['_ey'] + b['_ey'], 1e-9)
        d = math.hypot((a['_xv'] - b['_xv']) / sx, (a['_yv'] - b['_yv']) / sy)
        if d > GATE:
            return None
        return d + (0.0 if key(fig, a) == key(fig, b) else MISMATCH)
    return cost


def station_cost(fig):
    """Curve values and empty rows pair only on the same curve at the same station."""
    def cost(a, b):
        if key(fig, a) != key(fig, b):
            return None
        if a['_xv'] is None and b['_xv'] is None:
            return 0.0
        if a['_xv'] is None or b['_xv'] is None:
            return None
        dx = abs(a['_xv'] - b['_xv'])
        if dx > a['_ex'] + b['_ex'] + 1e-12:
            return None
        return dx
    return cost


def pair_figure(fig, A, B):
    out = []
    items = sorted(set(norm_item(r['item']) for r in A + B))
    for it in items:
        a_it = [r for r in A if norm_item(r['item']) == it]
        b_it = [r for r in B if norm_item(r['item']) == it]
        sp, sa, sb = assign([r for r in a_it if kind(r) == 'symbol'],
                            [r for r in b_it if kind(r) == 'symbol'], symbol_cost(fig))
        cp, ca, cb = assign([r for r in a_it if kind(r) == 'curve'],
                            [r for r in b_it if kind(r) == 'curve'], station_cost(fig))
        ea = [r for r in a_it if kind(r) == 'empty']
        eb = [r for r in b_it if kind(r) == 'empty']
        # empty rows: with an empty row, or a leftover value, at the same station
        ep1, ea, rest_b = assign(ea, eb + sb + cb, station_cost(fig))
        ep2, eb_left, rest_a = assign([r for r in rest_b if kind(r) == 'empty'],
                                      sa + ca, station_cost(fig))
        ep2 = [(a, b) for (b, a) in ep2]
        used_a = set(id(a) for a, _ in ep1 + ep2)
        used_b = set(id(b) for _, b in ep1 + ep2)
        for a, b in sp + cp + ep1 + ep2:
            out.append((a, b))
        for a in sa + ca + ea:
            if id(a) not in used_a:
                out.append((a, None))
        for b in sb + cb + [r for r in rest_b if kind(r) == 'empty']:
            if id(b) not in used_b:
                out.append((None, b))
    # every row exactly once
    seen_a = Counter(id(a) for a, _ in out if a is not None)
    seen_b = Counter(id(b) for _, b in out if b is not None)
    assert len(seen_a) == len(A) and all(v == 1 for v in seen_a.values()), fig
    assert len(seen_b) == len(B) and all(v == 1 for v in seen_b.values()), fig

    def order(p):
        r = p[0] if p[0] is not None else p[1]
        xv = r['_xv'] if r['_xv'] is not None else -1e9
        yv = r['_yv'] if r['_yv'] is not None else 0.0
        return (norm_item(r['item']), key(fig, r) if kind(r) != 'symbol' else '', xv, -yv)
    out.sort(key=order)
    return out


def judge(fig, a, b):
    res = OrderedDict()
    if a is None or b is None:
        res['verdict'] = 'read once by A' if b is None else 'read once by B'
        return res
    ya, yb = a['_yv'], b['_yv']
    if ya is None and yb is None:
        res['verdict'] = 'both empty'
        return res
    if ya is None or yb is None:
        res['verdict'] = 'value from one reader only'
        return res
    out = []
    rnd = []
    for c in ('x', 'y'):
        va, vb = a[f'_{c}v'], b[f'_{c}v']
        s = a[f'_e{c}'] + b[f'_e{c}']
        d = abs(va - vb)
        res['d' + c] = d
        res['sum_e' + c] = s
        res[c + '_lo'] = min(va, vb)
        res[c + '_hi'] = max(va, vb)
        if d > s + 1e-12:
            out.append(c)
            h = half_unit(a[c]) + half_unit(b[c])
            rnd.append(d <= s + h + 1e-12)
    res['verdict'] = 'agree' if not out else 'disagree'
    res['outside'] = ' and '.join(out)
    res['rounding_level'] = ('' if not out else ('yes' if all(rnd) else 'no'))
    return res


def fmt(v):
    """A computed difference or bound, to 6 decimals, trailing zeros dropped."""
    if v is None or v == '':
        return ''
    s = f'{v:.6f}'.rstrip('0').rstrip('.')
    return '0' if s in ('', '-0') else s


# Section: geometry

# Each topic pairs the rows (0-based data rows) of A's and B's geometry.csv
# that state the same quantity. Verdicts compare the stated values only.
G = [
    # RM E51F26
    ('body length', [0], [0], 'agree', '18 in both.'),
    ('body fineness ratio', [1], [1], 'agree', '12 both.'),
    ('maximum body diameter Dm', [], [2], 'given by B only',
     'B gives Dm 1.5 in as a derived row; A gives the same derived 1.5 in only in the notes of its fineness-ratio and fig. 6(a) body-radius rows.'),
    ('nose (contour and its source)', [2], [3], 'agree',
     'Both: first half of the body, equation (14) of reference 1 (Erdmann, Peenemuende Archiv 66/105); both say the equation is not printed in the report.'),
    ('nose length', [], [4], 'given by B only',
     'B gives 9 in as a derived row; A gives the same derived 9 in only in the note of its nose row.'),
    ('cylinder', [3], [5], 'agree', 'Both: the rest of the body cylindrical except as modified by the boat-tails.'),
    ('boat-tail angles', [4], [6], 'agree', '0, 5.63, 7.03, 9.33 deg both.'),
    ('base to body diameter ratios', [5], [7], 'agree', '0.506, 0.704, 1.0 both.'),
    ('nozzle exit to body diameter ratio', [6], [8], 'agree', '0.5 both; both derive 0.75 in.'),
    ('nozzle profile', [7], [9], 'agree', 'Same statement.'),
    ('model support', [8], [10], 'agree', 'Half-body support with splitter plate swept back 40 deg, hollow sting; both note the model is a half body.'),
    ('static orifice diameter', [9], [32], 'agree', '0.015 in both.'),
    ('manometer reading accuracy', [10], [], 'given by A only', ''),
    ('free-stream Mach number', [11], [33], 'agree', '1.91 both.'),
    ('Reynolds number', [12], [34], 'agree', '3.24 x 10^6 per foot both.'),
    ('test-section total temperature', [13], [35], 'agree', 'About 150 deg F both.'),
    ('test-section total pressure', [14], [36], 'agree', 'About atmospheric both.'),
    ('dew point', [15], [37], 'agree', '-10 to 3 deg F both.'),
    ('angles of attack tested', [16], [38], 'agree', '0, 3, 6 deg both; both read 0 only.'),
    ('jet pressure ratio range', [], [39], 'given by B only', ''),
    ('boundary-layer trip wire', [17], [40], 'agree',
     'Both: 0.005 in wire loop about 0.5 in from the tip, used for selected settings; both say the data taken with it are not identified.'),
    ('boundary-layer state ahead of the base (PDF p. 11)', [18], [], 'given by A only',
     'From PDF p. 11, outside the brief\'s page list; B did not open it.'),
    ('early transition on the 5.63 deg, Db/Dm 0.704 boat-tail (PDF p. 11)', [19], [], 'given by A only',
     'From PDF pp. 11, 15 and 19, outside the brief\'s page list; B did not open them.'),
    ('Mach number just ahead of the base M1 (PDF p. 15)', [20], [], 'given by A only',
     'From PDF p. 15, outside the brief\'s page list.'),
    ('boundary-layer surveys', [], [41], 'given by B only', ''),
    ('tunnel wall reflections', [], [42], 'given by B only', ''),
    ('afterbody segment lengths (fig. 6)', [21, 28], [11, 12], 'agree', '1.50 and 4.25 in both.'),
    ('body radius (fig. 6(a))', [23], [13], 'agree', '0.75 in both (labelled 0.75 r).'),
    ('base orifice radii, cylindrical afterbody (fig. 6(a))', [24], [23], 'agree', '0.46, 0.56, 0.66 in both.'),
    ('angular stations theta', [25], [31], 'agree', '15, 50, 90 deg both.'),
    ('boat-tail length, Db/Dm 0.704, 5.63 deg', [26], [14], 'agree', '2.25 in both.'),
    ('boat-tail length, Db/Dm 0.704, 7.03 deg', [29], [15], 'agree', '1.80 in both.'),
    ('boat-tail length, Db/Dm 0.704, 9.33 deg', [31], [16], 'agree', '1.35 in both.'),
    ('boat-tail length, Db/Dm 0.506, 5.63 deg', [35], [18], 'agree', '3.75 in both.'),
    ('boat-tail length, Db/Dm 0.506, 7.03 deg', [37], [19], 'agree', '3.00 in both.'),
    ('boat-tail length, Db/Dm 0.506, 9.33 deg', [39], [20], 'agree', '2.25 in both.'),
    ('side orifice stations, cylindrical afterbody', [22], [22], 'agree',
     'Same chain 1.00, 1.00, 1.00, 0.25 and the same stations 0.25, 1.25, 2.25, 3.25 in ahead of the base (A gives stations as the value, B the chain).'),
    ('side orifice stations, Db/Dm 0.704, 5.63 deg', [27], [24], 'agree',
     'Same chain 0.75, .62, .62, .50, .25 and stations 0.25, 0.75, 1.37, 1.99, 2.74 in.'),
    ('side orifice stations, Db/Dm 0.704, 7.03 deg', [30], [25], 'agree',
     'Same chain 0.75, .65, .65, .25 and stations 0.25, 0.90, 1.55, 2.30 in.'),
    ('side orifice stations, Db/Dm 0.704, 9.33 deg', [32], [26], 'agree',
     'Same chain 0.75, .40, .40, .25 and stations 0.25, 0.65, 1.05, 1.80 in.'),
    ('side orifice stations, Db/Dm 0.506, 5.63 deg', [36], [28], 'agree',
     'Same chain 0.50, .75, .75, .75, .75, .50 and stations 0.50, 1.25, 2.00, 2.75, 3.50, 4.00 in.'),
    ('side orifice stations, Db/Dm 0.506, 7.03 deg', [38], [29], 'agree',
     'Same chain 0.75, .56, .56, .56, .56, .50 and stations 0.50, 1.06, 1.62, 2.18, 2.74, 3.49 in.'),
    ('side orifice stations, Db/Dm 0.506, 9.33 deg', [40], [30], 'agree',
     'Same chain 0.75, .625, .625, .50, .25 and stations 0.25, 0.75, 1.375, 2.00, 2.75 in.'),
    ('base radius, Db/Dm 0.704', [33], [17], 'agree', '0.528 in both.'),
    ('base orifice radius, Db/Dm 0.704', [34], [27], 'agree', '0.45 in both.'),
    ('base radius, Db/Dm 0.506', [41], [21], 'agree',
     '0.38 in both. A alone adds that the base view of fig. 6(c) shows no base orifices.'),
    # TN 3819
    ('fig. 19 models', [42], [53, 54, 55], 'agree', '15 deg cone, 1 in diameter, longest body 5 in, both.'),
    ('fig. 19 Mach numbers', [43], [], 'given by A only',
     'As a geometry row; B gives the same 2.41, 1.93, 1.62 in the mach column of its fig. 19 CSV.'),
    ('fig. 19 Reynolds numbers', [44], [], 'given by A only',
     'As a geometry row; B gives the same R/inch values in the series column of its fig. 19 CSV.'),
    ('fig. 21 models', [45], [56], 'agree', '10 deg cone-cylinders of fineness ratio 5, both.'),
    ('fig. 21 comparison curve (text p. 16)', [], [43], 'given by B only', ''),
    ('fig. 23 models (legend sketches)', [46], [], 'given by A only',
     'As a geometry row. B gives the legend sketches in the configuration column of its fig. 23 CSV. The two differ for the triangle: A "pointed nose, long afterbody" (CSV: "an afterbody of constant diameter"), B "ogive nose, cylinder, conical boattail".'),
    ('negative boat-tail angle means a simple cone', [47], [44], 'agree',
     'Same statement (text p. 17); B adds that the method then reverts to a cone-cylinder of zero cylinder length.'),
    ('fig. 23 Mach number', [], [57], 'given by B only',
     'As a geometry row; A gives "Mach about 2.9 (caption)" in the note of its fig. 23 models row.'),
    ('fig. 24 models, h/D, source and Mach number', [48], [45, 47, 58], 'agree',
     'h/D 0.506 (a) and 0.704 (b), Cortright and Schroeder, M 1.91, both.'),
    ('fig. 24 boundary layer at beta 5.63 deg (text p. 17)', [49], [46], 'agree',
     'Both: inadvertently thickened. A\'s note: "the sentence concerns h/D = 0.704"; B\'s row 46: "h/D = 0.704 named in text". In the fig. 24 CSVs A attaches the note to the 24(b) 5.63 deg row only, B to the 5.63 deg rows of both 24(a) and 24(b).'),
    ('fig. 25 body diameter', [50], [50], 'agree', '1.97 in both (fig. 25(a) axis label).'),
    ('fig. 25 Mach number', [51], [48], 'agree', '3.24 both.'),
    ('fig. 25(b) source', [], [49], 'given by B only',
     'As a row; A gives "figure 25(b) experimental results are from reference 5" in the note of its fig. 25 diameter row.'),
    ('fig. 25(a) calculated boat-tail angles', [52], [], 'given by A only', 'Labels of the calculated part (a), not data.'),
    ('P_B definition', [], [51], 'given by B only',
     'As a row; A gives the same definition in the y_quantity of every TN 3819 CSV.'),
    ('turbulent boundary layers only (introduction)', [], [52], 'given by B only', ''),
    # RM A52E20
    ('model 8 description', [53], [59], 'agree', 'Same statement.'),
    ('model 8 body diameter d', [54], [60], 'agree', '1.25 in both.'),
    ('model 8 base diameter', [55], [61], 'agree', '0.604 d both; both derive 0.755 in.'),
    ('model 8 fineness ratio l/d', [56], [62], 'agree', '7.0 both. A derives a length of 8.75 in.'),
    ('model 8 boat-tail length and profile', [57], [64], 'agree',
     'Both: not given. Both measured the photograph and took nothing from it, with different results: A "overall length about 9.2 in and a length-to-diameter ratio near 9"; B (method.md 5.3) "photo l/d about 7.8".'),
    ('model 8 nose', [58], [63], 'agree', 'Both: not stated beyond ogive-cylinder.'),
    ('model 3 (the unboat-tailed body of fig. 15)', [59], [66], 'agree', 'Ogive-cylinder, l/d 7, both (fig. 15 legend).'),
    ('models 1 to 4', [60], [65], 'agree',
     'Same statement. B adds that model 3\'s drawing is in fig. 1(a), not listed in the brief and not opened.'),
    ('surface finish', [61], [67], 'agree', 'About 5 microinches both.'),
    ('Mach number range', [62], [68], 'agree', '2.73 to 4.98 both.'),
    ('Reynolds number', [63], [69], 'agree', 'Same values per foot both.'),
    ('fig. 15 Reynolds numbers and boundary layers', [64], [73], 'agree',
     '(a) laminar, Re 3.0 x 10^6; (b) turbulent, Re 5.0 x 10^6, both.'),
    ('Reynolds number basis', [], [70], 'given by B only',
     'As a row (body length, B page 4); A gives "Re is based on model length (symbol list, PDF p. 5)" in the note of its fig. 15 row.'),
    ('reservoir conditions', [65], [71], 'agree', 'Up to 6 atm, 50 to 70 deg F, both.'),
    ('air humidity', [], [72], 'given by B only', ''),
    ('P_b definition', [], [74], 'given by B only',
     'As a row; A gives the same definition in the y_quantity of its fig. 15 CSV.'),
    # TN 3372
    ('body diameter and basic body', [66], [75], 'agree',
     '5 in diameter both. A alone adds "wood with polished lacquer finish".'),
    ('fins', [67], [78], 'agree', 'Same statement.'),
    ('overall length, basic configuration', [68], [77], 'agree', '55.5 in both.'),
    ('nose length', [69], [76], 'agree', '17.5 in, ogival, both.'),
    ('fin root chord', [70], [79], 'agree', '8.4 in both.'),
    ('fin trailing edge ahead of the original base', [71], [82], 'agree', '0.7 in both.'),
    ('fin span tip to tip', [72], [81], 'agree', '13.4 in both.'),
    ('fin tip chord', [73], [80], 'agree', '1.3 in both.'),
    ('configuration D afterbody', [74], [83, 88], 'agree',
     '6.2 in added, converging to a base diameter of 3.3 in, dummy rocket chamber with nozzle exit flush with the base, both.'),
    ('configuration D base diameter', [75], [84], 'agree', '3.3 in both.'),
    ('configuration D afterbody profile', [76], [86], 'agree',
     'Both: curved converging contour, not dimensioned, no equation.'),
    ('configuration D fin trailing edges ahead of the base', [77], [85], 'agree', '6.9 in (0.7 + 6.2) both.'),
    ('center orifice', [78, 81], [91], 'agree',
     'On the center line inside the front bulkhead of the dummy rocket chamber, 13.5 in ahead of the base, both.'),
    ('configuration D end-view diameters', [79], [89], 'agree',
     '2.9 and 1.5 in both (B also lists the 3.3 in base). Both say the sketch does not name them; their guesses differ: A "presumably nozzle exit and throat of the dummy rocket chamber", B "1.5 = innermost circle (likely nozzle exit)".'),
    ('edge orifice', [80], [90], 'agree', 'About 3/8 in (.38 in) from the base circumference, both.'),
    ('configuration D fineness ratio', [82], [87], 'agree', '12.3 both.'),
    ('models of configuration D flown', [83], [92], 'agree', 'One, both.'),
    ('angle of attack', [84], [93], 'agree', 'Assumed at or very near zero, both.'),
    ('Reynolds number', [85], [94], 'agree', 'Based on body length, in fig. 6 (not opened), both.'),
    ('delta p/q definition', [], [95], 'given by B only',
     'As a row; A gives the same definition in the y_quantity of its TN 3372 CSVs.'),
]


# Section: what the readers say (quotes)

# Each entry: topic, quotes by A, quotes by B, who says so, comment.
# A quote is (file, text); the script checks that every quote occurs in that
# reader's file word for word (line breaks and runs of spaces ignored).
BRIEF = [
    ('RM E51F26 fig. 24 gives no Mach number for its plotted points; both entered 1.91, the free-stream test Mach number, from the text.',
     [('method.md', "RM E51F26 figure 24 gives no Mach number for the plotted points. Its M1 labels (1.30, 1.91, 2.10, 3.50) belong to the predicted C'p,b curves; M1 is the Mach number just upstream of the base. The text (PDF p 15) says M1 varied from 1.91 to 2.1 among the boattails. The free-stream Mach number 1.91 comes from the text.")],
     [('method.md', "RM E51F26 fig. 24: the legend gives no Mach number for the plotted points; M1 (Mach number just ahead of the base) labels 1.30, 1.91, 2.10, 3.50 belong to the predicted C'_p,b lines only. I used the test free-stream Mach number 1.91 from the text and marked it as such.")],
     'both', 'A alone adds the text\'s M1 range (PDF p. 15, outside the brief\'s pages).'),
    ("RM E51F26 fig. 24 plots two coefficients on one axis, Cp,b (free-stream reference) and C'p,b (conditions just upstream of the base), told apart by the flagged symbols.",
     [('method.md', "The axis carries two coefficients, Cp,b (free-stream reference) and C'p,b (conditions just upstream of the base), told apart by flagged symbols.")],
     [('method.md', "RM E51F26 fig. 24: the axis is \"Base pressure coefficients, C_p,b and C'_p,b\". Open circles and open squares are C_p,b, base pressure on free-stream conditions; flagged circles, flagged squares and the diamond are C'_p,b = (pb - p1)/q1, referenced to conditions just upstream of the base (symbol list).")],
     'both', 'A lists it among its brief-versus-PDF differences (method.md section 8); B states it in its section 4 (reference conditions), not in its section 8. Both label every row with the coefficient its symbol shows, and the labels agree on every pair.'),
    ('RM E51F26 fig. 24: the reference 6 triangle has no stated coefficient type and no Mach number.',
     [('method.md', 'The triangle has no Mach number in the figure'),
      ('rme51f26_fig24.csv', "base pressure coefficient, Cp,b or C'p,b (axis: base pressure coefficients, Cp,b and C'p,b); the legend does not say which")],
     [('method.md', "RM E51F26 fig. 24: the triangle \"Model from reference 6\" has no stated coefficient type or Mach number.")],
     'both', 'B lists it in section 8; A says so in section 4 and in the row\'s y_quantity. A flags the row ambiguous for where the triangle\'s centre is, B for its unknown coefficient type.'),
    ('RM E51F26 fig. 30 also plots base-bleed points; both excluded them as jet flow (rule 8).',
     [('method.md', 'RM E51F26 figure 30 (Db/Dm 0.704) also plots base-bleed points (squares in (a) and (c)). Base bleed is jet air at jet pressure ratios of 1 or less, so these were not read (rule 8). Figure 29 has no such points.')],
     [('method.md', 'RM E51F26 fig. 30 also plots base-bleed results (squares, jet flow); not read under rule 8.'),
      ('method.md', 'base bleed is air flow from the base (jet flow), excluded by rule 8.')],
     'both', 'A took the meaning of base bleed from the text (PDF pp. 3, 19, 22, outside the brief\'s pages); B does not say where it took it from.'),
    ('RM E51F26 figs. 29 and 30: friction drag and "experimental pressure drag plus friction drag" are drawn only as curves; the fig. 30(c) total curve stops short of 9.33 deg.',
     [('method.md', 'Friction drag (Cf = 0.003) and "experimental pressure drag plus friction drag" are drawn only as curves and were read at the tested angles (flag `curve`); friction drag is an estimate with an assumed friction coefficient. In figure 30(c) that curve stops at about 9.2 deg, so its 9.33 deg value is `untraced`.')],
     [('method.md', 'RM E51F26 figs. 29 and 30: besides the side, base and total components the brief names, panel (a) carries a friction-drag curve (C_f = 0.003) drawn only as a curve; I read it at the tested angles with flag `curve` because it is a drag component drawn only as a curve; it is a computed estimate, not a measurement.'),
      ('method.md', 'Its total-drag curve stops at epsilon about 9.17, before the tested 9.33.')],
     'both', 'Both leave the 9.33 deg value empty. A flags the row `untraced`; B flags it `curve` and gives the value at the curve\'s end, 0.1141 at epsilon 9.17, as an alternative. Their estimates of where the curve ends differ (about 9.2 and about 9.17 deg).'),
    ('RM E51F26: what the text says about boundary-layer transition and the trip wire.',
     [('method.md', 'RM E51F26 text: besides the trip-wire sentence on PDF p 7, the boundary-layer statements the brief asks about are on PDF pp 8, 11, 15 and 19 (outside the listed pages): turbulent boundary layers ahead of the base, and inadvertent early transition on the 5.63 deg, Db/Dm 0.704 boattail (0.20 in thick) that the report calls the cause of an inconsistent base-pressure point. The figures read here do not say which points, if any, were taken with the trip wire.'),
      ('geometry.csv', 'the figures read here do not say which, if any, of their points were taken with the wire')],
     [('method.md', 'RM E51F26 text: it does not describe boundary-layer transition beyond the trip wire used "for selected settings".'),
      ('geometry.csv', 'the text does not say which data were taken with the wire, nor where transition occurred without it')],
     'both, with different findings',
     'Both say the trip wire was used for selected settings. A says the figures read do not say which points, if any, were taken with it; B says the text does not say which data were taken with it. No row of either reading says whether its point was taken with the trip wire, so the readings do not keep tripped and untripped points apart, which 0014 10.7 (ae) item 1 expects. The readers differ on whether the text says more about transition: A found transition statements on PDF pp. 8, 11, 15 and 19 (outside the brief\'s pages) and carries the p. 11 early-transition note on the fig. 8(a), fig. 24 (5.63 deg, Db/Dm 0.704) and fig. 30(a) rows; B did not open those pages and says the text does not describe transition beyond the trip wire. This pairing does not settle which is right.'),
    ('TN 3819 p. 17: the boundary layer of the fig. 24 experimental results at beta 5.63 deg was inadvertently thickened.',
     [('method.md', 'The text (p. 17) says the boundary layer of the experimental result at beta 5.63 deg was inadvertently thickened; that note is on the (b) 5.63 deg row.'),
      ('geometry.csv', 'the sentence concerns h/D = 0.704')],
     [('geometry.csv', 'for the experimental results at beta = 5.63 deg the boundary layer was inadvertently thickened'),
      ('geometry.csv', 'h/D = 0.704 named in text (panels 0.506 and 0.704)'),
      ('tn3819_fig24.csv', 'text p.17: for the experimental results at beta = 5.63 deg the boundary layer was inadvertently thickened')],
     'both', 'A attaches the note to the 24(b) row only; B attaches it to the 5.63 deg rows of both 24(a) and 24(b).'),
    ('RM A52E20 fig. 15 has no symbols for the report\'s own models (model 3 and model 8): they are drawn only as curves, which neither reader read.',
     [('method.md', "RM A52E20 figure 15: the plotted symbols are all from other sources (refs. 4, 10, 11 and unpublished Ames 1- by 3-foot tunnel data) at M about 1.5 to 2.9. The report's own data for model 8 (boattailed) and model 3 (not boattailed) appear only as a dashed and a solid fairing over M about 2.6 to 4.7, with no symbols. The brief does not name these curves, so they were not read; they are listed as `untraced` rows.")],
     [('method.md', "RM A52E20 fig. 15: the present-test results for model 8 (and for model 3) are drawn only as curves without symbols; the plotted points are all from other sources (refs. 4, 10, 11 and unpublished Ames data). The brief's \"every plotted point, with and without the boat-tail\" therefore yields only these reference points; the present-test curves are listed as `untraced`.")],
     'both', 'Both list the same four curves as `untraced` rows with no value.'),
    ('RM A52E20 fig. 15: Reynolds numbers and boundary-layer states.',
     [('method.md', 'Figure 15 gives Reynolds numbers 3.0 x 10^6 (laminar) and 5.0 x 10^6 (turbulent), based on model length; the legend gives no transition-fixed case.')],
     [('method.md', 'The figure gives Re per panel, not per point.'),
      ('method.md', 'the figure does not say whether these Re values also apply to the reference points, and I say so in each note.')],
     'both, each adding a different point',
     'Same panel values and states. A alone says the legend gives no transition-fixed case (the brief lists it as a possible state); B alone says the figure does not say whether the panel Re applies to the reference points.'),
    ('RM A52E20 fig. 1(c) gives no boat-tail dimensions.',
     [('method.md', "RM A52E20: neither the model description (PDF p 6) nor figure 1(c) gives the boattail's length or profile; figure 1(c) is a photograph."),
      ('method.md', "the photograph's inch scale is not consistent with those numbers (overall length about 9.2 in and a length to diameter ratio near 9 when measured on the print), so no dimension was taken from the photograph.")],
     [('method.md', 'RM A52E20 fig. 1(c) is a photograph: it gives no dimension of model 8 except l/d = 7.0; the boattail profile, boattail length and nose of model 8 are not given on the listed pages.'),
      ('method.md', 'I tried measuring the photograph against its scale but the result was not self-consistent (photo l/d about 7.8 against the printed 7.0, because of shading at the edges and perspective), so I report no photo measurements.'),
      ('method.md', "Model 3's own drawing is in figure 1(a), which the brief does not list, and I did not open it.")],
     'both', 'Their photograph checks differ (A: l/d near 9; B: about 7.8); neither reports a photo dimension. Only B says the unboat-tailed body\'s drawing is fig. 1(a).'),
    ("TN 3819 fig. 21's legend does not explain its symbol shapes; fig. 19's legend gives no source.",
     [('method.md', 'TN 3819 figure 21: the legend says only that all experimental points come from the compilation of ref. 2; it does not explain the symbol shapes, so the configuration of each point is only what the caption gives (10 deg cone-cylinders, fineness ratio 5). Figure 19\'s legend gives Reynolds numbers per inch but no source.')],
     [('method.md', 'TN 3819 fig. 21: the legend does not explain the symbol shapes. TN 3819 fig. 19: the legend gives no data source.'),
      ('method.md', 'Following rule 4, every point is flagged `ambiguous` for that reason, with no alternative value unless there is also an overlap.')],
     'both', 'B flags all 40 fig. 21 rows ambiguous for this reason; A names the shape in `series` and flags only the overlap and triangle rows.'),
    ('TN 3819 writes the base-to-body diameter ratio h/D.',
     [],
     [('method.md', 'TN 3819: the base-to-body diameter ratio is written h/D in this report (Db/Dm in RM E51F26).')],
     'B only', 'A uses h/D in its TN 3819 rows without listing it as a difference.'),
    ('TN 3372: fig. 12 shows configuration D only as curves; the coefficient axes are drawn with negative values upward.',
     [('method.md', "TN 3372 figure 12 shows configuration D only as curves, as the brief allowed. TN 3372 figure 10's coefficient axis increases downward.")],
     [('method.md', 'configuration D drawn only as two dashed curves, edge orifice (upper) and center orifice (lower), identified by the label arrows'),
      ('method.md', 'Both figures draw this axis with negative values upward (-.08 at the top of fig. 10, -.32 at the top of fig. 12); the signs in my CSVs follow the axis labels.')],
     'both', 'The brief allowed a curve here. Both keep the printed signs.'),
    ("TN 3372 fig. 1's base-view diameters 2.9 and 1.5 in are not named.",
     [('method.md', "TN 3372 figure 1's end-view diameters 2.9 and 1.5 in are not named in the sketch.")],
     [('method.md', 'The base view also carries 2.9 in. and 1.5 in. diameters that the sketch does not name.')],
     'both', 'Their guesses at what the circles are differ (see geometry_pairs.csv).'),
    ('RM E51F26: the nose equation is not printed, only its source.',
     [('geometry.csv', 'the equation itself is not printed')],
     [('method.md', 'The nose equation is not in the report, only its source (reference 1, Erdmann, Peenemunde Archiv 66/105).')],
     'both', ''),
    ('RM E51F26: the model is a half body on a splitter plate (not named in the brief).',
     [('geometry.csv', 'the model is a half body on a splitter plate')],
     [('method.md', 'The model is a half body on a splitter plate (half-body support system).')],
     'both', ''),
    ('RM E51F26 fig. 8(b): plotted stations against fig. 6.',
     [('method.md', 'in panel (b) the first three stations read about 0.03 to 0.04 diameter downstream of those implied by figure 6 (10.47, 10.97, 11.40). The readings are as plotted.')],
     [],
     'A only', 'A states it as a check, not a correction; B does not compare the stations with fig. 6.'),
    ('RM E51F26 figs. 29 and 30: the reference area of C_D.',
     [('rme51f26_fig29.csv', 'drag coefficient, CD (symbol list: drag / (q0 pi Dm^2 / 4), free-stream dynamic pressure, maximum body cross-section)')],
     [('method.md', 'RM E51F26 figs. 29 and 30: drag coefficient C_D; the figure does not state the reference area.')],
     'both, with different findings', 'A takes the reference area from the symbol list (PDF p. 4); B says the figure does not state it. Both opened PDF p. 4.'),
    ('Page numbers: every PDF page in the brief matched its figure or text.',
     [('method.md', 'Page numbers: every PDF page number in the brief matched the figure or text it names')],
     [('method.md', 'Page numbers: every PDF page named in the brief matched its caption')],
     'both', ''),
]

PAGES = [
    ('A', 'RM E51F26', 'PDF p. 4 (symbol list): OCR text and scan',
     'RM E51F26 p 4 (symbol list, report p. 3; outside the brief\'s list): OCR text and scan, to state what Cp, Cp,b, C\'p,b, CD and the subscripts mean.'),
    ('A', 'RM E51F26', 'all 60 pages: OCR text searched for "bleed" (matching lines only)',
     'RM E51F26 OCR text layer of all 60 pages searched with grep for "bleed" (only the matching lines were read).'),
    ('A', 'RM E51F26', 'PDF pp. 3 and 19: OCR text',
     'RM E51F26 OCR text of p 3 (summary) and p 19 (drag discussion), to confirm that "base bleed" means small amounts of jet air.'),
    ('A', 'RM E51F26', 'PDF p. 22 (reference list): OCR text and scan',
     'RM E51F26 p 22 (reference list): OCR text and scan, for references 1 and 6.'),
    ('A', 'RM E51F26', 'PDF pp. 1 to 24: OCR text searched (matching lines only)',
     'RM E51F26 OCR text of pp 1 to 24 searched with grep for transition, boundary layer, wire, trip, Reynolds.'),
    ('A', 'RM E51F26', 'PDF pp. 8, 11, 15 and 19: OCR text; p. 11 scan',
     'RM E51F26 OCR text of pp 8, 11, 15 and 19 (transition and boundary-layer passages) and the scan of p 11.'),
    ('A', 'TN 3819', 'PDF pp. 1 to 10: OCR text searched; p. 6: OCR text and scan',
     'TN 3819 OCR text of pp 1 to 10 searched with grep for the symbol list; p 6 (symbols) OCR text and scan, for the definition of PB.'),
    ('A', 'RM A52E20', 'PDF pp. 1 to 8: OCR text searched; pp. 4 and 5: OCR text and scans',
     'RM A52E20 OCR text of pp 1 to 8 searched with grep for the symbol list; pp 4 and 5 (symbols) OCR text and scans, for the definition of Pb, Re and the subscript 0.'),
    ('A', 'TN 3372', 'PDF pp. 1 to 8: OCR text searched; pp. 5 and 7: OCR text and scans',
     'TN 3372 OCR text of pp 1 to 8 searched with grep for the coefficient definition; pp 5 and 7 OCR text and scans (definition of delta p/q; discussion of configuration D).'),
    ('B', 'RM E51F26', 'PDF pp. 15 to 24: text layer searched for REFERENCES only',
     'RM E51F26 PDF pages 15 to 24: text layer searched by script only for the word REFERENCES (found on page 22). Nothing else on those pages was read.'),
    ('B', 'RM E51F26', 'PDF p. 4 (symbol list): text layer and image',
     "RM E51F26 PDF page 4: text layer and image (symbol list: C_p, C'_p,b definitions)."),
    ('B', 'RM E51F26', 'PDF pp. 22 and 23 (reference list): text layer',
     'RM E51F26 PDF page 22 and 23: text layer, reference list (identity of reference 1, the nose equation source, and reference 6, the figure 24 triangle).'),
    ('B', 'TN 3819, RM A52E20, TN 3372', 'text layers searched for SYMBOLS or NOTATION (TN 3819 pp. 1 to 8, RM A52E20 pp. 1 to 8, TN 3372 pp. 1 to 6); opened TN 3819 pp. 5 and 6 (text and image), RM A52E20 p. 4 (text), TN 3372 pp. 3 and 5 (text)',
     "Text layer searched by script only for the word SYMBOLS or NOTATION: TN 3819 PDF pages 1 to 8, RM A52E20 pages 1 to 8, TN 3372 pages 1 to 6. Then opened, to get each base pressure coefficient's reference conditions: TN 3819 PDF page 5 (text and image; introduction end and symbol list start), TN 3819 PDF page 6 (text and image; P_B definition), RM A52E20 PDF page 4 (text layer; notation, P_b definition, Reynolds number basis), TN 3372 PDF page 3 (text layer; summary and introduction) and PDF page 5 (text layer; definition of delta p / q and Reynolds number basis). These pages are outside the brief's list; I opened them only for the coefficient definitions and say so here."),
]

FLAGRULES = [
    ('A', 'Where symbols overlap and those variants move the centre by more than 1 px, the variant reading is given in `alternatives` and the row is flagged `ambiguous`.'),
    ('A', 'For every triangle the centre of its bounding box is given as an alternative (it lies a quarter of the half-height lower for an upward triangle) and the row is flagged `ambiguous`.'),
    ('A', "Where a symbol carries a printed centre dot and its outline is crowded by neighbours (RM A52E20 figure 15, TN 3372 figure 10), the centre is the dot's own centroid, and the outline-fit centre is given as an alternative when the two differ by more than 2.5 px."),
    ('B', 'Whenever two symbol centres lie closer than the size of the larger symbol, both points are flagged `ambiguous`, the note names the other symbol and the centre distance, and the alternatives give the readings with the two identities swapped'),
    ('B', 'Where a symbol has a printed centre dot (TN 3372 fig. 10, RM A52E20 fig. 15, TN 3819 figs. 23 and 25(b)), the primary value is still the outline centre; for TN 3372 fig. 10 the dot position is given as an alternative whenever it differs by at least 0.0005 in y or 0.002 in x.'),
    ('B', 'Following rule 4, every point is flagged `ambiguous` for that reason, with no alternative value unless there is also an overlap.'),
]

STATEMENTS = [
    ('A', 'method.md', "Nothing in the bowshock repository, its website or any other reader's folder was opened. NACA TN 3320 was not opened. In TN 3819, PDF page 57 (figure 26) was never extracted, rendered, viewed or text-extracted; every TN 3819 text search was limited to named pages (18 to 20, and 1 to 10 for the symbol list)."),
    ('B', 'method.md', "I did not open the bowshock repository, its website or GitHub, any other reader's folder, NACA TN 3320, or PDF page 57 of TN 3819."),
    ('B', 'method.md', 'TN 3819 PDF page 57 was never extracted, listed, rendered or text-searched (every TN 3819 command named its pages explicitly). TN 3320 was never fetched.'),
]


def check_quote(rd, reader, fname, text):
    path = os.path.join(rd, reader, fname)
    with open(path, encoding='utf-8') as f:
        body = norm_ws(f.read())
    if norm_ws(text) not in body:
        raise SystemExit(f'quote not found in {reader}/{fname}: {text[:80]}')
    return f'{reader}/{fname}: "{norm_ws(text)}"'


# Section: writing

def wrap(s, width=76, indent='    '):
    words, lines, cur = s.split(), [], ''
    for w in words:
        if cur and len(cur) + 1 + len(w) > width - len(indent):
            lines.append(indent + cur)
            cur = w
        else:
            cur = (cur + ' ' + w) if cur else w
    if cur:
        lines.append(indent + cur)
    return '\n'.join(lines)


def val(r, c):
    """A value as the reader printed it, with the stated error."""
    v = r[c]
    e = r['_e' + c + '_text']
    if v.strip() == '':
        return '(empty)'
    return f'{v} +-{e}' if e else f'{v} (no error stated)'


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    rd, od = sys.argv[1], sys.argv[2]
    os.makedirs(od, exist_ok=True)
    T = []              # pairing.txt lines
    inputs = []
    counts = []
    disagreements, once, empties, labels, flagpairs = [], [], [], defaultdict(list), {}
    flagrows = []
    zero_err, no_err = Counter(), Counter()
    for fig, title in FIGS:
        pa, pb = os.path.join(rd, 'A', fig + '.csv'), os.path.join(rd, 'B', fig + '.csv')
        inputs += [('A/' + fig + '.csv', sha256(pa)), ('B/' + fig + '.csv', sha256(pb))]
        A, B = load(pa), load(pb)
        for side, rows in (('A', A), ('B', B)):
            for r in rows:
                if r['_ex_text'] and float(r['_ex_text']) == 0:
                    zero_err[(side, title, 'x')] += 1
                if r['_ey_text'] and float(r['_ey_text']) == 0:
                    zero_err[(side, title, 'y')] += 1
                if r['_yv'] is not None and not r['_ex_text']:
                    no_err[(side, title, 'x')] += 1
                if r['_yv'] is not None and not r['_ey_text']:
                    no_err[(side, title, 'y')] += 1
        pairs = pair_figure(fig, A, B)
        out_rows = []
        cnt = Counter()
        fpairs = Counter()
        for n, (a, b) in enumerate(pairs, 1):
            pid = f'{fig}#{n:02d}'
            j = judge(fig, a, b)
            cnt[j['verdict']] += 1
            if j['verdict'] == 'disagree' and j['rounding_level'] == 'yes':
                cnt['disagree, rounding level'] += 1
            ld = label_diffs(fig, a, b) if (a is not None and b is not None) else []
            for cat, k, va, vb in ld:
                labels[(title, cat, k, va, vb)].append(pid)
            if a is not None and b is not None:
                fpairs[(a['flag'], b['flag'])] += 1
            r = a if a is not None else b
            row = OrderedDict()
            row['pair_id'] = pid
            row['item'] = r['item']
            row['kind'] = kind(r)
            row['verdict'] = j['verdict']
            row['outside_summed_errors'] = j.get('outside', '')
            row['within_printed_rounding'] = j.get('rounding_level', '')
            row['series_key'] = key(fig, r) if (a is None or b is None or key(fig, a) == key(fig, b)) \
                else f'A: {key(fig, a)} / B: {key(fig, b)}'
            for side, s in (('A', a), ('B', b)):
                row[f'{side}_row'] = s['_row'] if s else ''
                row[f'{side}_x'] = s['x'] if s else ''
                row[f'{side}_x_error'] = s['_ex_text'] if s else ''
                row[f'{side}_y'] = s['y'] if s else ''
                row[f'{side}_y_error'] = s['_ey_text'] if s else ''
                row[f'{side}_flag'] = s['flag'] if s else ''
            for c in ('x', 'y'):
                row[f'd{c}'] = fmt(j.get('d' + c)) if ('d' + c) in j else ''
                row[f'summed_{c}_error'] = fmt(j.get('sum_e' + c)) if ('sum_e' + c) in j else ''
            for c in ('x', 'y'):
                if (c + '_lo') in j:
                    lo, hi = (a[c], b[c]) if a['_' + c + 'v'] <= b['_' + c + 'v'] else (b[c], a[c])
                    row[f'{c}_envelope'] = f'{lo} to {hi}'
                else:
                    row[f'{c}_envelope'] = ''
            row['label_differences'] = '; '.join(f'{k}: A "{va}", B "{vb}" ({cat})' for cat, k, va, vb in ld)
            for side, s in (('A', a), ('B', b)):
                for c in COLS:
                    row[f'{side}_{c}'] = s[c] if s else ''
            out_rows.append(row)
            if j['verdict'] == 'disagree':
                disagreements.append((title, pid, a, b, j, ld))
            elif j['verdict'].startswith('read once'):
                s = a if a is not None else b
                other = B if a is not None else A
                near = ''
                if kind(s) == 'curve':
                    cand = [o for o in other if kind(o) == 'curve' and key(fig, o) == key(fig, s)]
                    if cand:
                        o = min(cand, key=lambda o: abs(o['_xv'] - s['_xv']))
                        near = (f'nearest station of the other reader on the same curve: x {o["x"]}, '
                                f'y {o["y"]} (row {o["_row"]}); the two stations differ by more than the summed x errors')
                once.append((title, pid, 'A' if a is not None else 'B', s, near))
            elif j['verdict'] in ('both empty', 'value from one reader only'):
                empties.append((title, pid, a, b, j))
            for side, s, o in (('A', a, b), ('B', b, a)):
                if s is not None and s['flag'] != 'ok':
                    flagrows.append(OrderedDict([
                        ('reader', side), ('figure', fig), ('row', s['_row']), ('pair_id', pid),
                        ('pair_verdict', j['verdict']), ('item', s['item']), ('series', s['series']),
                        ('x', s['x']), ('y', s['y']), ('flag', s['flag']),
                        ('alternatives', s['alternatives']), ('note', s['note']),
                        ('other_reader_flag', o['flag'] if o else '(not read by the other reader)'),
                        ('other_reader_alternatives', o['alternatives'] if o else ''),
                    ]))
        with open(os.path.join(od, f'pairs_{fig}.csv'), 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=list(out_rows[0].keys()), lineterminator='\n')
            w.writeheader()
            w.writerows(out_rows)
        counts.append((title, fig, len(A), len(B), cnt))
        flagpairs[title] = fpairs

    with open(os.path.join(od, 'flags.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(flagrows[0].keys()), lineterminator='\n')
        w.writeheader()
        w.writerows(flagrows)

    # geometry
    GA = list(csv.DictReader(open(os.path.join(rd, 'A', 'geometry.csv'), newline='', encoding='utf-8')))
    GB = list(csv.DictReader(open(os.path.join(rd, 'B', 'geometry.csv'), newline='', encoding='utf-8')))
    inputs += [('A/geometry.csv', sha256(os.path.join(rd, 'A', 'geometry.csv'))),
               ('B/geometry.csv', sha256(os.path.join(rd, 'B', 'geometry.csv')))]
    ua = Counter(i for t in G for i in t[1])
    ub = Counter(i for t in G for i in t[2])
    assert sorted(ua) == list(range(len(GA))) and all(v == 1 for v in ua.values()), 'A geometry rows'
    assert sorted(ub) == list(range(len(GB))) and all(v == 1 for v in ub.values()), 'B geometry rows'
    gcount = Counter()
    grows = []
    for n, (topic, ia, ib, verdict, comment) in enumerate(G, 1):
        src = (GA[ia[0]] if ia else GB[ib[0]])['source']
        gcount[verdict] += 1
        row = OrderedDict([('pair_id', f'geometry#{n:02d}'), ('source', src), ('topic', topic),
                           ('verdict', verdict), ('comment', comment)])
        for side, rows, idx in (('A', GA, ia), ('B', GB, ib)):
            row[f'{side}_rows'] = '; '.join(str(i + 1) for i in idx)
            for c in GCOLS[1:]:
                row[f'{side}_{c}'] = ' | '.join(rows[i][c] for i in idx)
        grows.append(row)
    with open(os.path.join(od, 'geometry_pairs.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(grows[0].keys()), lineterminator='\n')
        w.writeheader()
        w.writerows(grows)

    for reader in ('A', 'B'):
        inputs.append((reader + '/method.md', sha256(os.path.join(rd, reader, 'method.md'))))

    # Section: pairing.txt
    P = T.append
    P('Pairing of the two blind readings of the boat-tail figures')
    P('0014 10.7 (ae); readers A (first reading) and B (blind second reading)')
    P('Paired 2026-10-26 by a neutral party, written by pair.py in this folder.')
    P('')
    P('The readings are compared with each other only. The pairing party opened')
    P('the readers\' brief, both readers\' folders and the 0014 10.7 (ae) entry,')
    P('and no computed boat-tail result. No value is averaged, smoothed, corrected')
    P('or settled: where the readings differ, both are kept, with their envelope.')
    P('')
    P('1. Inputs (paths under docs/research/boat-tails/readers/, SHA-256)')
    P('')
    for pth, h in inputs:
        P(f'    {pth}  {h}')
    P('')
    P('2. The rule')
    P('')
    for para in [
        'Two values agree when their difference is within the two stated errors summed, on each coordinate: |xA - xB| <= ex(A) + ex(B) and |yA - yB| <= ey(A) + ey(B). A pair that fails on either coordinate is a disagreement. The values and the errors are used as each reader printed them.',
        'The stated errors are those in each row\'s note ("reading error x +-..., y +-..." for A, "read error x +-..., y +-..." for B). Where an error is printed as zero, zero is used: '
        + '; '.join(f'{s} {t}, {c} error printed as zero in {n} row{"s" if n != 1 else ""}'
                    for (s, t, c), n in sorted(zero_err.items(), key=lambda i: (i[0][0], [f[1] for f in FIGS].index(i[0][1]), i[0][2])))
        + '. Where a row with a value states no error, zero is used: '
        + '; '.join(f'{s} {t}, no {c} error in {n} row{"s" if n != 1 else ""}'
                    for (s, t, c), n in sorted(no_err.items(), key=lambda i: (i[0][0], [f[1] for f in FIGS].index(i[0][1]), i[0][2])))
        + ' (these are curve rows whose x is a station the reader chose and read at).',
        'Because some stated errors are smaller than the printed rounding of the values, each disagreement also says whether it would fall within the summed errors plus half a unit in the last printed digit of each value ("within printed rounding"). That note does not change the verdict.',
        'Matching. Within each figure panel, symbol points are matched by position: the cost of a candidate pair is its distance in units of the summed errors, sqrt((dx/(ex(A)+ex(B)))^2 + (dy/(ey(A)+ey(B)))^2), plus 3 when the two readers name a different symbol; pairs farther than 12 such units are not allowed; the set of pairs with the least total cost is taken (optimal assignment). Points read on a drawn curve pair only with the same curve at the same station (stations within the summed x errors); a curve sampled at different stations by the two readers therefore leaves points read once by each, which is not a missing point. Rows left empty pair with the other reader\'s row on the same curve or series at the same station. Every other row is read once.',
        'Labels. For every pair the readers\' series, configuration, Mach number (where the x axis is not the Mach number), coefficient and its reference, and page are reduced to the facts they state and compared. A difference is "differ" when both state the fact differently, and "stated by one only" when one reader states it and the other does not in that row. Differences in wording alone are not listed.',
    ]:
        P(wrap(para))
        P('')

    P('3. Counts per figure')
    P('')
    hdr = f'    {"figure":<20} {"A rows":>6} {"B rows":>6} {"agree":>6} {"disagr.":>7} {"(round.)":>8} {"both":>5} {"once A":>6} {"once B":>6}'
    P(hdr)
    P(f'    {"":<20} {"":>6} {"":>6} {"":>6} {"":>7} {"":>8} {"empty":>5} {"":>6} {"":>6}')
    tot = Counter()
    for title, fig, na, nb, c in counts:
        tot['A'] += na
        tot['B'] += nb
        for k in c:
            tot[k] += c[k]
        P(f'    {title:<20} {na:>6} {nb:>6} {c["agree"]:>6} {c["disagree"]:>7} {c["disagree, rounding level"]:>8} '
          f'{c["both empty"]:>5} {c["read once by A"]:>6} {c["read once by B"]:>6}')
    P(f'    {"all figures":<20} {tot["A"]:>6} {tot["B"]:>6} {tot["agree"]:>6} {tot["disagree"]:>7} '
      f'{tot["disagree, rounding level"]:>8} {tot["both empty"]:>5} {tot["read once by A"]:>6} {tot["read once by B"]:>6}')
    P('')
    P(wrap('"(round.)" counts the disagreements that fall within the summed errors plus the printed rounding. '
           '"both empty" counts pairs where both readers give the row with no value. '
           'Pairs where one reader gives a value and the other leaves the row empty: '
           f'{tot["value from one reader only"]}.'))
    P('')
    P(wrap('TN 3372 fig. 12 is drawn only as two curves, and the readers sampled them at different stations: '
           'A kept a point whenever its trace had moved 0.01 in M or 0.01 in delta p/q, plus the ends and the '
           'extremes; B read every 0.01 in M, plus the ends and the cusps. Only stations within the summed x '
           'errors pair (both ends of both curves, both cusps and 5 other stations), so most of its points are '
           'read once by design, not missed. Section 5 gives, for each, the other reader\'s nearest station on '
           'the same curve, as information only.'))
    P('')

    P('4. Every disagreement')
    P('')
    if not disagreements:
        P('    None.')
    for title, pid, a, b, j, ld in disagreements:
        P(f'  {pid} ({a["source"]}, {a["item"]}, {key(FIG_OF[title], a)})')
        P(f'    A row {a["_row"]}: x {val(a, "x")}, y {val(a, "y")}, flag {a["flag"]}')
        P(f'    B row {b["_row"]}: x {val(b, "x")}, y {val(b, "y")}, flag {b["flag"]}')
        for c in ('x', 'y'):
            inside = c not in j['outside']
            lo, hi = (a[c], b[c]) if a['_' + c + 'v'] <= b['_' + c + 'v'] else (b[c], a[c])
            P(f'    {c}: difference {fmt(j["d" + c])}, summed errors {fmt(j["sum_e" + c])}, '
              f'{"within" if inside else "outside"}; envelope {lo} to {hi}')
        P(f'    within printed rounding: {j["rounding_level"]}')
        if a['alternatives']:
            P(wrap(f'A alternatives: "{a["alternatives"]}"', indent='    '))
        if b['alternatives']:
            P(wrap(f'B alternatives: "{b["alternatives"]}"', indent='    '))
        P('')

    P('5. Every point read once')
    P('')
    if not once:
        P('    None.')
    for title, pid, who, s, near in once:
        P(f'  {pid} ({s["source"]}, {s["item"]}): read by {who} only, row {s["_row"]}')
        P(f'    {s["series"]}; x {val(s, "x")}, y {val(s, "y")}; flag {s["flag"]}')
        if s['alternatives']:
            P(wrap(f'alternatives: "{s["alternatives"]}"', indent='    '))
        if near:
            P(wrap(near, indent='    '))
        P('')

    P('6. Rows given by both readers with no value')
    P('')
    for title, pid, a, b, j in empties:
        P(f'  {pid} ({a["source"]}, {a["item"]}): A row {a["_row"]} flag {a["flag"]}, B row {b["_row"]} flag {b["flag"]}')
        P(f'    A: {a["series"]}; x "{a["x"]}"')
        P(f'    B: {b["series"]}; x "{b["x"]}"')
        if a['alternatives']:
            P(wrap(f'A alternatives: "{a["alternatives"]}"', indent='    '))
        if b['alternatives']:
            P(wrap(f'B alternatives: "{b["alternatives"]}"', indent='    '))
    P('')

    P('7. Every label difference')
    P('')
    P(wrap('Grouped by figure, kind of difference and the two labels; each line lists the pairs it covers.'))
    P('')
    for (title, cat, k, va, vb), pids in sorted(labels.items(), key=lambda t: ([f[1] for f in FIGS].index(t[0][0]), t[0][1], t[0][2])):
        P(wrap(f'{title}, {k} ({cat}): A "{va or "(not stated)"}", B "{vb or "(not stated)"}"; '
               f'{len(pids)} pair{"s" if len(pids) != 1 else ""}: ' + ', '.join(p.split('#')[1] for p in pids), indent='    '))
    P('')

    P('8. Flags')
    P('')
    P(wrap('Every row either reader flagged other than ok is in flags.csv, with its alternatives and note '
           'word for word and the other reader\'s flag on the same point. Flag combinations over the pairs '
           '(A flag / B flag: number of pairs):'))
    P('')
    for title, fp in flagpairs.items():
        P(f'    {title}: ' + '; '.join(f'{fa} / {fb}: {n}' for (fa, fb), n in sorted(fp.items())))
    P('')
    P(wrap('The two readers flag by different rules, as their method notes say:'))
    for who, q in FLAGRULES:
        P(wrap(check_quote(rd, who, 'method.md', q), indent='    '))
    P('')

    P('9. Geometry')
    P('')
    P(wrap(f'geometry_pairs.csv pairs the rows of the two geometry.csv files by the quantity they state '
           f'({len(GA)} rows from A, {len(GB)} from B, {len(G)} topics). Agree: {gcount["agree"]}; '
           f'disagree: {gcount["disagree"]}; given by A only: {gcount["given by A only"]}; '
           f'given by B only: {gcount["given by B only"]}. '
           + ('No value stated by both readers conflicts. ' if not gcount['disagree'] else '')
           + 'Disagreements and rows given by one only:'))
    P('')
    for n, (topic, ia, ib, verdict, comment) in enumerate(G, 1):
        if verdict != 'agree':
            P(wrap(f'geometry#{n:02d} {topic}: {verdict}. {comment}', indent='    '))
    P('')
    P(wrap('Agreeing topics that carry a difference in a note or an interpretation:'))
    P('')
    for n, (topic, ia, ib, verdict, comment) in enumerate(G, 1):
        if verdict == 'agree' and re.search(r'differ|alone|adds|A\'s note', comment):
            P(wrap(f'geometry#{n:02d} {topic}: {comment}', indent='    '))
    P('')

    P('10. Where a reader says the report or figure differs from the brief, and related statements')
    P('')
    for topic, qa, qb, who, comment in BRIEF:
        P(wrap(f'- {topic} Said by: {who}.', indent='  '))
        for q in qa:
            P(wrap('A, ' + check_quote(rd, 'A', *q), indent='      '))
        for q in qb:
            P(wrap('B, ' + check_quote(rd, 'B', *q), indent='      '))
        if comment:
            P(wrap(comment, indent='      '))
        P('')

    P('11. Pages opened outside the brief\'s list (from the method notes)')
    P('')
    for who in ('A', 'B'):
        P(f'  Reader {who}:')
        for w_, rep, short, q in PAGES:
            if w_ == who:
                P(wrap(f'- {rep}, {short}.', indent='    '))
                P(wrap(check_quote(rd, who, 'method.md', q), indent='        '))
        P('')
    P(wrap('Both readers also ran pdfinfo (metadata) on each whole PDF, and pdfimages -list (image metadata) '
           'on the brief\'s pages only.'))
    P('')
    P('  TN 3320, TN 3819 PDF page 57, and the other reader\'s folder:')
    for who, fname, q in STATEMENTS:
        P(wrap(check_quote(rd, who, fname, q), indent='    '))
    P('')
    P(wrap('Checked by the pairing party on the readers\' working folders before this commit (those folders hold '
           'files not committed here, so this check cannot be rerun from the repository): each reader\'s src/ '
           'holds only the four PDFs of the brief (NTRS 19930086724, 19930084517, 19930087153, 19930084618; '
           'both readers\' copies have the same SHA-256); no page image, crop or text file of TN 3819 PDF page 57 '
           'is among either reader\'s files (the only page-57 images are of RM E51F26 page 57, fig. 30, which '
           'the brief lists); no script, note or log of either reader names a path into the other reader\'s '
           'folder; each reader\'s log of opened pages (A/work/opened_log.txt, B/render/opened.log) lists the '
           'same pages as its method note. Neither reader opened TN 3320 or TN 3819 PDF page 57, nor the '
           'other reader\'s folder, as far as their notes, logs and files show.'))
    P('')

    with open(os.path.join(od, 'pairing.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(T) + '\n')


FIG_OF = {t: f for f, t in FIGS}

if __name__ == '__main__':
    main()
