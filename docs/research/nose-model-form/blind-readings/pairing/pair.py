"""Pair reader A against reader B for the nose pressure readings.

Usage: python3 -I pair.py <readers dir> <out dir>
Writes one pairing CSV per item and prints counts plus every disagreement.
Tables: values agree only if numerically equal (printed digits compared as numbers).
Figures: values agree if |A - B| <= A's stated read error + B's stated read error for that row.
"""
import csv, os, re, sys
from decimal import Decimal

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

def load(r, f):
    with open(os.path.join(src, r, f + '.csv'), newline='') as fh:
        return list(csv.DictReader(fh))

def num(s):
    s = s.strip()
    if s.startswith('-.'):
        s = '-0' + s[1:]
    elif s.startswith('.'):
        s = '0' + s
    return Decimal(s)

COLS = ['source', 'item', 'mach', 'tunnel', 'orifice', 'symbol',
        'a_station', 'b_station', 'station_unit', 'station_tol', 'station_result',
        'a_cp', 'b_cp', 'cp_diff', 'cp_tol', 'cp_result', 'result',
        'a_flag', 'b_flag', 'a_alternatives', 'b_alternatives', 'note']

summary = {}
disagreements = []

def cmp(a, b, tol):
    d = num(a) - num(b)
    ok = abs(d) <= tol
    return d, ok

def notes_for(a, b):
    parts = []
    if a['flag'] != 'ok':
        parts.append('A note: ' + a['note'])
    if b['flag'] != 'ok':
        parts.append('B note: ' + b['note'])
    return ' | '.join(parts)

def finish(name, rows):
    path = os.path.join(out, name + '_pairing.csv')
    with open(path, 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=COLS, lineterminator='\n')
        w.writeheader()
        w.writerows(rows)
    n = len(rows)
    ag = sum(r['result'] == 'agree' for r in rows)
    amb_a = sum(r['a_flag'] in ('ambiguous', 'typo?') for r in rows)
    amb_b = sum(r['b_flag'] in ('ambiguous', 'typo?') for r in rows)
    amb_any = sum(r['a_flag'] in ('ambiguous', 'typo?') or r['b_flag'] in ('ambiguous', 'typo?') for r in rows)
    summary[name] = dict(pairs=n, agree=ag, disagree=n - ag, a_flagged=amb_a, b_flagged=amb_b, either_flagged=amb_any)
    for r in rows:
        if r['result'] != 'agree':
            disagreements.append((name, r))

def table(name, key):
    A, B = load('A', name), load('B', name)
    assert len(A) == len(B), (name, len(A), len(B))
    bmap = {key(b): b for b in B}
    assert len(bmap) == len(B)
    rows = []
    for a in A:
        b = bmap.pop(key(a))
        st_ok = num(a['station']) == num(b['station'])
        d, cp_ok = cmp(a['cp'], b['cp'], Decimal(0))
        note = []
        if a['mach'] != b['mach']:
            note.append('mach printed form differs: A %s, B %s (same value)' % (a['mach'], b['mach']) if num(a['mach']) == num(b['mach']) else 'MACH DIFFERS')
        if not cp_ok:
            if b['cp'] in a['alternatives'].split(';') or a['cp'] in b['alternatives'].split(';'):
                note.append("one reader's alternative matches the other's cp")
        n2 = notes_for(a, b)
        if n2:
            note.append(n2)
        rows.append(dict(source=a['source'], item=a['item'], mach=a['mach'], tunnel=a['tunnel'] or b['tunnel'],
                         orifice=a['orifice'], symbol='', a_station=a['station'], b_station=b['station'],
                         station_unit=a['station_unit'] + ('' if a['station_unit'] == b['station_unit'] else ' / B: ' + b['station_unit']),
                         station_tol='exact', station_result='agree' if st_ok else 'disagree',
                         a_cp=a['cp'], b_cp=b['cp'], cp_diff=str(d), cp_tol='exact',
                         cp_result='agree' if cp_ok else 'disagree',
                         result='agree' if (st_ok and cp_ok) else 'disagree',
                         a_flag=a['flag'], b_flag=b['flag'], a_alternatives=a['alternatives'],
                         b_alternatives=b['alternatives'], note='; '.join(note)))
    assert not bmap
    finish(name, rows)

def err_from_note(note, reader, item):
    if item == 'tn3716_fig3':
        return (Decimal('0.02'), Decimal('0.001')) if reader == 'A' else (Decimal('0.02'), Decimal('0.003'))
    if reader == 'A':
        m = re.search(r'read error \+-([0-9.]+) in, \+-([0-9.]+) Cp', note)
    else:
        m = re.search(r'read error \+-([0-9.]+) in station, \+-([0-9.]+) cp', note)
    return Decimal(m.group(1)), Decimal(m.group(2))

def symbol(note):
    return 'circle (theta 0)' if 'circle' in note else 'square (theta 90)'

def figure(name, by_symbol):
    A, B = load('A', name), load('B', name)
    assert len(A) == len(B), (name, len(A), len(B))
    groups = {}
    for r, rows_ in (('A', A), ('B', B)):
        for x in rows_:
            k = symbol(x['note']) if by_symbol else ''
            groups.setdefault((k, r), []).append(x)
    rows = []
    for k in sorted({g[0] for g in groups}):
        ga = sorted(groups[(k, 'A')], key=lambda x: num(x['station']))
        gb = sorted(groups[(k, 'B')], key=lambda x: num(x['station']))
        assert len(ga) == len(gb)
        for a, b in zip(ga, gb):
            ea, eb = err_from_note(a['note'], 'A', name), err_from_note(b['note'], 'B', name)
            stol, ctol = ea[0] + eb[0], ea[1] + eb[1]
            ds, s_ok = cmp(a['station'], b['station'], stol)
            dc, c_ok = cmp(a['cp'], b['cp'], ctol)
            note = []
            if not c_ok and (b['cp'] in a['alternatives'].split(';') or a['cp'] in b['alternatives'].split(';')):
                note.append("one reader's alternative matches the other's cp")
            if not c_ok:
                alt_ok = [x for x in b['alternatives'].split(';') if x and abs(num(a['cp']) - num(x)) <= ctol]
                if alt_ok:
                    note.append('B alternative %s is within tolerance of A' % ';'.join(alt_ok))
            n2 = notes_for(a, b)
            if n2:
                note.append(n2)
            rows.append(dict(source=a['source'], item=a['item'], mach=a['mach'], tunnel='', orifice='', symbol=k,
                             a_station=a['station'], b_station=b['station'],
                             station_unit=a['station_unit'] + ('' if a['station_unit'] == b['station_unit'] else ' / B: ' + b['station_unit']),
                             station_tol=str(stol), station_result='agree' if s_ok else 'disagree',
                             a_cp=a['cp'], b_cp=b['cp'], cp_diff=str(dc), cp_tol=str(ctol),
                             cp_result='agree' if c_ok else 'disagree',
                             result='agree' if (s_ok and c_ok) else 'disagree',
                             a_flag=a['flag'], b_flag=b['flag'], a_alternatives=a['alternatives'],
                             b_alternatives=b['alternatives'], note='; '.join(note)))
    finish(name, rows)

table('tn3716_table1a', lambda r: num(r['station']))
figure('tn3716_fig3', False)
table('rma53e01_table2a', lambda r: num(r['station']))
table('tn4233_table1a', lambda r: (num(r['mach']), r['orifice']))
table('tn4233_table1b', lambda r: (num(r['mach']), r['orifice']))
figure('rme51h17_fig4a', True)

for k, v in summary.items():
    print(k, v)
for name, r in disagreements:
    print('DISAGREE', name, r['symbol'], r['mach'], r['orifice'], 'A', r['a_station'], r['a_cp'], 'B', r['b_station'], r['b_cp'],
          'dcp', r['cp_diff'], 'tol', r['cp_tol'], 'st', r['station_result'], r['note'][:200])
