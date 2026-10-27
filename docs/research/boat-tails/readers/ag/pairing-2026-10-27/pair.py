#!/usr/bin/env python3
"""Pair the two blind readings of the (ag) boat-tail figures (0014 10.7 (ag)).

Usage (from any folder; standard library only):

    python3 -I pair.py <readers/ag folder> <output folder>

The readers/ag folder holds A/ and B/, each with the figure CSVs and
geometry.csv as the readers delivered them. The script compares the two
readings with each other only. It never averages a value and never picks
one reading over the other: every pair keeps both values, their
difference, both stated errors and the envelope of the two.

Rules (also in pairing.txt):

1. Points are matched within a group: the figure, its part (or panel),
   the Mach number where one figure holds several, and the series as the
   legend names it (configuration, shroud, model, meridian or symbol).
   Inside a group, points are matched by station: the abscissa values of
   both readers are joined into clusters wherever neighbours lie within
   the figure's station tolerance ('tol' in SPEC below), and inside a
   cluster the pairing keeps as many pairs as the smaller count allows
   and, among those, the one with the least summed squared distance in
   units of the two readers' summed errors, plus one unit for each pair
   whose repeat-data flags differ. What is left over is read once.
2. Agreement: on each coordinate the difference is within the two stated
   one-sigma errors summed (A's "reading error 1-sigma" and B's "reading
   error 1 sd" in each row's note). A coordinate that one reader gives as
   a category or a nominal value (not read) is not tested; the pair
   records that.
3. Envelope: the lowest and highest of the two readings, per coordinate.
   A second y envelope also takes in every alternative y that either
   reader states as a number in one of the fixed forms parsed below; the
   alternatives are always copied verbatim as well.
4. A point left over in one reading is checked against the left-over
   points of the other reading in the same figure part (and Mach number)
   under every other series: if one lies at the same station and within
   twice the summed errors in y, the two are listed as a possible label
   difference (the same symbol read under two labels). This is a pointer
   for the record, not a match.
5. Geometry: the two geometry.csv files are matched row by row through
   the hand-made table GEOMETRY below, topic by topic, with a comparison
   and a comment for each topic; every row of both files must be used.

Writes: pairs_<figure>.csv for every figure CSV; disagreements.csv,
read_once.csv and illegible.csv (extracts); listings.txt (the same in
plain text with both notes); flags.csv; labels.csv;
possible_label_differences.csv; geometry_pairs.csv; counts.csv;
input_sha256.csv. The report itself, pairing.txt, is written by hand from
these.
"""
import csv
import hashlib
import itertools
import os
import re
import sys

FIGS = [
    'rml54c16_fig5.csv',
    'rml54i22_fig2.csv', 'rml54i22_fig7.csv', 'rml54i22_fig14.csv', 'rml54i22_fig16.csv',
    'rme57e06_fig6.csv', 'rme57e06_fig7.csv', 'rme57e06_fig8.csv', 'rme57e06_fig14.csv',
    'tnd6789_fig5.csv', 'tnd6789_fig7.csv', 'tnd6789_fig12.csv', 'tnd6789_fig18.csv', 'tnd6789_fig20.csv',
    'tmx1960_fig5.csv', 'tmx1960_fig6.csv', 'tmx1960_fig7.csv', 'tmx1960_fig8.csv', 'tmx1960_fig11.csv',
    'tmx1960_fig18.csv',
]


# ---------------------------------------------------------------- labels

def part(r):
    m = re.search(r'fig\.\s*\d+\s*\(([a-z])\)', r['item'])
    return m.group(1) if m else ''


def mach(r):
    try:
        return '%.2f' % float(r['mach'])
    except ValueError:
        return r['mach'].strip()


def ldm(r):
    for s in (r['item'], r['configuration']):
        m = re.search(r'l/dm\s*=\s*([0-9.]+)', s)
        if m:
            return '%.3g' % float(m.group(1))
    return ''


def beta(r):
    """The boat-tail angle as the legend names it (series first; the
    configuration's table value only where the series names none)."""
    for s in (r['series'], r['configuration']):
        m = re.search(r'beta\s*=\s*([0-9.]+)', s)
        if m:
            return '%g' % float(m.group(1).rstrip('.'))
    return ''


def meridian(r):
    """The meridian field reduced to one label, so both readers' wordings compare."""
    s = r['meridian'].strip().lower()
    if not s:
        return ''
    if 'plane of struts' in s:
        return 'base, plane of struts'
    m = re.match(r'(-?[0-9.]+)', s)
    if m:
        return '%g' % float(m.group(1))
    if 'behind' in s or 'in line' in s:
        return '0'
    if '90' in s:
        return '90'
    return s


def flagged(r):
    s = r['series'].lower()
    if 'flag not visible' in s:
        return 'flag not visible'
    if 'flagged' in s:
        return 'flagged'
    return 'no flag'


def l54c16_series(r):
    m = re.search(r'model (\d)', r['configuration'])
    filled = 'filled' if 'filled' in r['series'].lower() else 'open'
    return ('model ' + (m.group(1) if m else '?'), filled)


def l54i22_series(r):
    m = re.search(r'Shroud (\d)', r['series'])
    return ('shroud ' + (m.group(1) if m else '?'),)


def e57_f6_series(r):
    s = r['series'].lower()
    if 'double' in s:
        return ('double strut',)
    if 'single' in s:
        return ('single strut',)
    if 'ref' in s:
        return ('ref. 10',)
    return ('other: ' + r['series'],)


def e57_f14_series(r):
    s = r['series'].lower()
    m = re.search(r'db/dj\s*=\s*([0-9.]+)', s)
    return ('solid' if 'solid' in s else 'open', 'db/dj ' + (m.group(1) if m else '?'),
            'bevel' if 'bevel' in s else 'no bevel')


def x1960_f11_series(r):
    return ('C_A,bal (square)' if 'square' in r['series'].lower() else 'computed C_A (circle)',)


def x1960_f18_series(r):
    return ('base pressure',) if 'base' in r['series'].lower() else ('phi ' + meridian(r),)


# For each figure: the frame (figure part, panel, Mach number) and the series
# inside the frame; the station tolerance in units of x; and the fields
# compared as labels on every pair.
SPEC = {
    'rml54c16_fig5.csv': dict(frame=lambda r: (part(r),), series=l54c16_series,
                              tol=lambda fr: 1.0 if fr[0] == 'b' else 0.01),
    'rml54i22_fig2.csv': dict(frame=lambda r: (part(r), mach(r)), series=l54i22_series, tol=0.01),
    'rml54i22_fig7.csv': dict(frame=lambda r: (part(r),), series=lambda r: (r['series'],), tol=0.01),
    'rml54i22_fig14.csv': dict(frame=lambda r: (part(r),), series=lambda r: (r['series'],), tol=0.01),
    'rml54i22_fig16.csv': dict(frame=lambda r: (part(r),), series=lambda r: (r['series'],), tol=0.01),
    'rme57e06_fig6.csv': dict(frame=lambda r: (part(r),), series=e57_f6_series,
                              tol=lambda fr: 0.5 if fr[0] == 'b' else 0.01),
    'rme57e06_fig7.csv': dict(frame=lambda r: (part(r),), series=lambda r: ('phi ' + meridian(r),), tol=0.1),
    'rme57e06_fig8.csv': dict(frame=lambda r: (part(r), mach(r)), series=lambda r: ('phi ' + meridian(r),),
                              tol=0.008),
    'rme57e06_fig14.csv': dict(frame=lambda r: (part(r), mach(r)), series=e57_f14_series, tol=0.01),
    'tnd6789_fig5.csv': dict(frame=lambda r: (mach(r),), series=lambda r: ('phi ' + meridian(r),), tol=0.012),
    'tnd6789_fig7.csv': dict(frame=lambda r: (part(r), 'l/dm ' + ldm(r), mach(r)), series=lambda r: ('jet off',),
                             tol=0.015),
    'tnd6789_fig12.csv': dict(frame=lambda r: ('l/dm ' + ldm(r),), series=lambda r: ('beta ' + beta(r),),
                              tol=0.02),
    'tnd6789_fig18.csv': dict(frame=lambda r: (mach(r),), series=lambda r: ('phi ' + meridian(r),), tol=0.02),
    'tnd6789_fig20.csv': dict(frame=lambda r: (), series=lambda r: ('measured (open circle)',), tol=0.02),
    'tmx1960_fig5.csv': dict(frame=lambda r: (mach(r),), series=lambda r: ('phi ' + meridian(r),), tol=0.015),
    'tmx1960_fig6.csv': dict(frame=lambda r: (mach(r),), series=lambda r: ('beta ' + beta(r),), tol=0.015),
    'tmx1960_fig7.csv': dict(frame=lambda r: (part(r),), series=lambda r: ('beta ' + beta(r),), tol=0.02),
    'tmx1960_fig8.csv': dict(frame=lambda r: (part(r),), series=lambda r: (r['series'],), tol=0.02),
    'tmx1960_fig11.csv': dict(frame=lambda r: (), series=x1960_f11_series, tol=0.02),
    'tmx1960_fig18.csv': dict(frame=lambda r: (mach(r),), series=x1960_f18_series, tol=0.03),
}


# ---------------------------------------------------------------- errors and alternatives

def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def stated_errors(reader, r):
    """(x error, y error, x status) from the row's note; None where not stated.

    x status: 'read', 'category' (B: Mach number as given, not read) or
    'nominal' (A: nominal station or Mach number of an illegible point).
    """
    note = r['note']
    xs = 'read'
    if reader == 'A':
        if re.search(r'x given is the [^;,]*not a reading', note):
            xs = 'nominal'
        m = re.search(r'reading error 1-sigma x ([0-9.eE+-]+), y ([0-9.eE+-]+)', note)
        if m:
            return num(m.group(1)), num(m.group(2)), xs
        return None, None, xs
    if 'x is the category, not read' in note or 'x is the Mach number as given, not read' in note:
        xs = 'category'
    m = re.search(r'reading error 1 sd: x \+-([0-9.]+), y \+-([0-9.]+)', note)
    if m:
        return num(m.group(1)), num(m.group(2)), xs
    m = re.search(r'reading error 1 sd: y \+-([0-9.]+)', note)
    if m:
        return None, num(m.group(1)), xs
    return None, None, xs


NUM = r'[-+]?(?:\d+\.\d*|\.\d+|\d+)'


def alt_values(reader, r):
    """Numeric alternatives in the fixed forms each reader used; the rest is free text.

    B: 'y=N (...)' and 'x=N y=N (...)'.
    A: an item that is a bare number (a y value); 'x N, y N (...)'; 'y N if ...'.
    Returns (list of (x or None, y, verbatim text), True if some alternative
    is free text and was not parsed).
    """
    out, free = [], False
    for item in [s.strip() for s in r['alternatives'].split(';') if s.strip()]:
        if reader == 'B':
            m = re.match(r'^(?:x=(%s)\s+)?y=(%s)' % (NUM, NUM), item)
            if m:
                out.append((num(m.group(1)), float(m.group(2)), item))
                continue
        else:
            if re.fullmatch(NUM, item):
                out.append((None, float(item), item))
                continue
            m = re.match(r'^x (%s), y (%s)' % (NUM, NUM), item)
            if m:
                out.append((float(m.group(1)), float(m.group(2)), item))
                continue
            m = re.match(r'^y (%s) if ' % NUM, item)
            if m:
                out.append((None, float(m.group(1)), item))
                continue
        free = True
    return out, free


def alternatives_check(a, b, altA, altB):
    """Where one reading falls among the other reader's stated alternatives."""
    out = []
    for me, mine, other, alts in (('A', a, b, altA), ('B', b, a, altB)):
        them = 'B' if me == 'A' else 'A'
        for ax, ay, text in alts:
            sy = (mine['_ey'] or 0) + (other['_ey'] or 0)
            if abs(ay - other['_y']) > sy + 1e-12:
                continue
            if ax is not None:
                if other['_xs'] != 'read':
                    continue
                sx = (mine['_ex'] or 0) + (other['_ex'] or 0)
                if abs(ax - other['_x']) > sx + 1e-12:
                    continue
            out.append("%s's reading agrees with %s's alternative '%s'" % (them, me, text))
        if alts:
            vals = [ay for _, ay, _ in alts] + [mine['_y']]
            if min(vals) <= other['_y'] <= max(vals):
                out.append("%s's y lies inside the range of %s's reading and alternatives" % (them, me))
    return '; '.join(out)


# ---------------------------------------------------------------- loading

def load(folder, fname, reader):
    rows = []
    with open(os.path.join(folder, reader, fname), newline='') as fh:
        for i, r in enumerate(csv.DictReader(fh), start=1):
            r = dict(r)
            r['_reader'] = reader
            r['_row'] = i
            r['_x'] = num(r['x'])
            r['_y'] = num(r['y'])
            ex, ey, xs = stated_errors(reader, r)
            r['_ex'], r['_ey'], r['_xs'] = ex, ey, xs
            rows.append(r)
    return rows


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        h.update(fh.read())
    return h.hexdigest()


# ---------------------------------------------------------------- matching

def clusters(points, tol):
    pts = sorted(points, key=lambda p: (p['_x'], p['_reader'], p['_row']))
    out, cur = [], []
    for p in pts:
        if cur and p['_x'] - cur[-1]['_x'] > tol:
            out.append(cur)
            cur = []
        cur.append(p)
    if cur:
        out.append(cur)
    return out


def pair_cost(a, b, tol):
    sx = None
    if a['_xs'] == 'read' and b['_xs'] == 'read' and a['_ex'] and b['_ex']:
        sx = a['_ex'] + b['_ex']
    if not sx:
        sx = tol
    c = ((a['_x'] - b['_x']) / sx) ** 2
    if a['_y'] is not None and b['_y'] is not None:
        sy = (a['_ey'] or 0) + (b['_ey'] or 0)
        if sy <= 0:
            sy = 1e-4
        c += ((a['_y'] - b['_y']) / sy) ** 2
    # the flag (repeat data) is part of the series: between pairings that are
    # about as near, the one that keeps the flag labels together is preferred
    # (one unit of the squared distance per mismatched flag label)
    if flagged(a) != flagged(b):
        c += 1.0
    return c


def best_matching(As, Bs, tol):
    """Most pairs the smaller side allows; among those, the least total cost."""
    if not As or not Bs:
        return []
    swap = len(As) > len(Bs)
    S, L = (Bs, As) if swap else (As, Bs)
    if len(L) > 9:
        raise SystemExit('cluster too large to enumerate: %d' % len(L))
    best, best_c = None, None
    for perm in itertools.permutations(range(len(L)), len(S)):
        c = sum(pair_cost(S[i], L[j], tol) if not swap else pair_cost(L[j], S[i], tol)
                for i, j in enumerate(perm))
        if best_c is None or c < best_c - 1e-12:
            best, best_c = perm, c
    pairs = []
    for i, j in enumerate(best):
        a, b = (L[j], S[i]) if swap else (S[i], L[j])
        pairs.append((a, b))
    return pairs


def fmt(v, nd=4):
    return '' if v is None else ('%.*f' % (nd, v))


def compare(a, b):
    """Status of a pair and the per-coordinate tests."""
    res = {}
    dx = a['_x'] - b['_x']
    res['dx'] = dx
    if a['_xs'] == 'read' and b['_xs'] == 'read':
        if a['_ex'] is not None and b['_ex'] is not None:
            res['sx'] = a['_ex'] + b['_ex']
            res['x_test'] = 'agree' if abs(dx) <= res['sx'] + 1e-12 else 'disagree'
        else:
            res['sx'] = None
            res['x_test'] = 'not tested: an x error is not stated'
    else:
        res['sx'] = None
        who = []
        if a['_xs'] != 'read':
            who.append('A gives x as %s' % a['_xs'])
        if b['_xs'] != 'read':
            who.append('B gives x as %s' % b['_xs'])
        res['x_test'] = 'not tested: ' + ' and '.join(who)
    ya, yb = a['_y'], b['_y']
    if ya is None and yb is None:
        res['dy'] = None
        res['sy'] = None
        res['y_test'] = 'not tested: y empty in both'
        res['status'] = 'illegible in both'
        return res
    if ya is None or yb is None:
        res['dy'] = None
        res['sy'] = None
        who = 'A' if ya is None else 'B'
        res['y_test'] = 'not tested: y empty in %s' % who
        res['status'] = 'illegible in %s, read by %s' % (who, 'B' if who == 'A' else 'A')
        return res
    dy = ya - yb
    res['dy'] = dy
    if a['_ey'] is not None and b['_ey'] is not None:
        res['sy'] = a['_ey'] + b['_ey']
        res['y_test'] = 'agree' if abs(dy) <= res['sy'] + 1e-12 else 'disagree'
    else:
        res['sy'] = None
        res['y_test'] = 'not tested: a y error is not stated'
    tests = [t for t in (res['x_test'], res['y_test']) if t in ('agree', 'disagree')]
    if 'disagree' in tests:
        bad = [c for c, t in (('x', res['x_test']), ('y', res['y_test'])) if t == 'disagree']
        res['status'] = 'disagree in ' + ' and '.join(bad)
    elif tests:
        res['status'] = 'agree'
    else:
        res['status'] = 'not tested'
    return res


PAIR_COLS = [
    'pair_id', 'figure', 'frame', 'series_key', 'status',
    'x_A', 'x_B', 'dx', 'x_err_A', 'x_err_B', 'x_test', 'x_envelope_low', 'x_envelope_high',
    'y_A', 'y_B', 'dy', 'y_err_A', 'y_err_B', 'y_test', 'y_envelope_low', 'y_envelope_high',
    'y_alternatives_A_parsed', 'y_alternatives_B_parsed',
    'y_envelope_with_alternatives_low', 'y_envelope_with_alternatives_high',
    'alternatives_free_text', 'alternatives_check',
    'flag_A', 'flag_B', 'label_differences',
    'row_A', 'row_B', 'item_A', 'item_B', 'series_A', 'series_B', 'configuration_A', 'configuration_B',
    'mach_A', 'mach_B', 'meridian_A', 'meridian_B', 'page_A', 'page_B',
    'alternatives_A', 'alternatives_B', 'note_A', 'note_B',
]


def label_diffs(fname, a, b):
    out = []
    if a is None or b is None:
        return ''
    if meridian(a) != meridian(b):
        out.append("meridian: A '%s', B '%s'" % (a['meridian'], b['meridian']))
    if fname in ('tnd6789_fig20.csv', 'tmx1960_fig11.csv') and flagged(a) != flagged(b):
        out.append("flag: A '%s', B '%s'" % (a['series'], b['series']))
    if mach(a) != mach(b) and SPEC[fname]['frame'](a) == SPEC[fname]['frame'](b):
        try:
            if abs(float(a['mach']) - float(b['mach'])) > 0.006:
                out.append("Mach: A '%s', B '%s'" % (a['mach'], b['mach']))
        except ValueError:
            out.append("Mach: A '%s', B '%s'" % (a['mach'], b['mach']))
    return '; '.join(out)


def pair_row(pid, fname, frame, skey, a, b):
    row = {k: '' for k in PAIR_COLS}
    row.update(pair_id=pid, figure=fname, frame=' / '.join(frame), series_key=' / '.join(skey))
    for tag, r in (('A', a), ('B', b)):
        if r is None:
            continue
        row['x_' + tag] = r['x']
        row['y_' + tag] = r['y']
        row['x_err_' + tag] = fmt(r['_ex'], 5) if r['_ex'] is not None else ('(%s)' % r['_xs'] if r['_xs'] != 'read' else '')
        row['y_err_' + tag] = fmt(r['_ey'], 5)
        row['flag_' + tag] = r['flag']
        row['row_' + tag] = r['_row']
        for f in ('item', 'series', 'configuration', 'mach', 'meridian', 'page', 'alternatives', 'note'):
            row[f + '_' + tag] = r[f]
    altA, freeA = alt_values('A', a) if a else ([], False)
    altB, freeB = alt_values('B', b) if b else ([], False)
    row['y_alternatives_A_parsed'] = '; '.join('%g' % v for _, v, _ in altA)
    row['y_alternatives_B_parsed'] = '; '.join('%g' % v for _, v, _ in altB)
    free = [t for t, f in (('A', freeA), ('B', freeB)) if f]
    row['alternatives_free_text'] = ', '.join(free)
    if a is not None and b is not None:
        c = compare(a, b)
        row['status'] = c['status']
        row['dx'] = fmt(c['dx'])
        row['x_test'] = c['x_test']
        row['dy'] = fmt(c['dy'])
        row['y_test'] = c['y_test']
        if a['_xs'] == 'read' and b['_xs'] == 'read':
            lo, hi = sorted([(a['_x'], a['x']), (b['_x'], b['x'])])
            row['x_envelope_low'], row['x_envelope_high'] = lo[1], hi[1]
        row['label_differences'] = label_diffs(fname, a, b)
    else:
        r = a if a is not None else b
        tag = 'A' if a is not None else 'B'
        row['status'] = ('read once by %s' % tag) + (' (illegible there)' if r['_y'] is None else '')
    ys = [(r['_y'], r['y']) for r in (a, b) if r is not None and r['_y'] is not None]
    if ys:
        ys.sort()
        row['y_envelope_low'], row['y_envelope_high'] = ys[0][1], ys[-1][1]
        allv = [v for v, _ in ys] + [v for _, v, _ in altA + altB]
        row['y_envelope_with_alternatives_low'] = fmt(min(allv))
        row['y_envelope_with_alternatives_high'] = fmt(max(allv))
    if a is not None and b is not None and a['_y'] is not None and b['_y'] is not None:
        row['alternatives_check'] = alternatives_check(a, b, altA, altB)
    return row


# ---------------------------------------------------------------- geometry

# Row numbers are the data rows of each reader's geometry.csv, counted from 1
# below the header. The readers named their quantities differently and split
# them differently, so the rows are matched by hand, topic by topic; each
# topic says whether the two readings give the same thing. 'same' means the
# same value or statement (wording aside); 'same, with detail' means the
# same where both speak and one reader adds something the other does not
# contradict; 'differ' means the two say different things; 'A only' and
# 'B only' mean that only one reader has a row on it.
GEOMETRY = [
    # ---- RM L54C16
    ('RM L54C16', 'overall length', [1], [1], 'same', '18.90 in, text p. 4 and fig. 3.'),
    ('RM L54C16', 'fineness ratio', [2], [3], 'same', '7.87.'),
    ('RM L54C16', 'maximum diameter', [3], [2], 'same', '2.40 in, fig. 3.'),
    ('RM L54C16', 'nose shape', [4], [4], 'same', 'Cone of 10 deg half-angle.'),
    ('RM L54C16', 'nose length', [5], [5], 'same, with detail',
     '7.18 in from fig. 3 in both. A adds that a 10 deg half-angle cone of 2.40 in base would be about 6.81 in long, '
     'so 7.18 in may run to the nose-piece joint; B reads it as tip to nose/body joint.'),
    ('RM L54C16', 'nose definition', [6], [6], 'same', 'Straight cone; no equation or coordinates.'),
    ('RM L54C16', 'nose tip and tip radius', [7, 8], [7], 'same', 'Sharp as drawn; no radius stated.'),
    ('RM L54C16', 'nose coordinates', [9], [6], 'same', 'Not tabulated.'),
    ('RM L54C16', 'cylinder length', [10], [8], 'same',
     'Not stated; both give 18.90 - 7.18 = 11.72 in for model 1 by their own subtraction (A in the value field, '
     'B in the note).'),
    ('RM L54C16', 'boat-tail angle, model 1', [11], [9], 'same', '0 deg.'),
    ('RM L54C16', 'boat-tail angle, model 2', [12], [10], 'same', '5 deg.'),
    ('RM L54C16', 'boat-tail angle, model 3', [13], [11], 'same', '10 deg.'),
    ('RM L54C16', 'boat-tail length, models 2 and 3', [14], [14], 'same, with detail',
     'Not stated in both. B cites p. 8 (outside the brief\'s text pages) and adds its own estimate from the orifice '
     'table (about 4.6 in and 2.3 in) and that the model 3 orifice 4 entry does not fit a 10 deg cone.'),
    ('RM L54C16', 'base diameter, model 1', [15], [], 'A only',
     'A: 2.40 in (no boat-tail). B has no row; its rows say model 1 has no boat-tail.'),
    ('RM L54C16', 'base diameter, models 2 and 3', [16], [15], 'same, with detail',
     'Not stated in both. A gives the radius at the rearmost boat-tail orifice; B extrapolates the orifice radii to '
     'about 1.59 and 1.60 in.'),
    ('RM L54C16', 'boat-tail body of revolution or flaps', [17], [13], 'same', 'Conical body of revolution.'),
    ('RM L54C16', 'boat-tail profile', [18], [12], 'same', 'Straight cone.'),
    ('RM L54C16', 'shoulder', [19], [16], 'same', 'Sharp as drawn; no radius.'),
    ('RM L54C16', 'orifice stations, model 1', [20], [17], 'same', 'Fig. 2 table, same entries.'),
    ('RM L54C16', 'orifice stations, model 2', [21], [18], 'same',
     'Fig. 2 table, same entries; both note the station 0.997 point from an identical model (text p. 6).'),
    ('RM L54C16', 'orifice stations, model 3', [22], [19], 'same', 'Fig. 2 table, same entries.'),
    ('RM L54C16', 'orifice meridians', [23], [], 'A only', 'A: not stated.'),
    ('RM L54C16', 'origin of the axial station', [24], [20], 'same', 'Model nose; plotted as x/L.'),
    ('RM L54C16', 'model support', [25], [21], 'differ',
     'Same strut position along the body: one swept strut joining the cylinder, its trailing edge 6.00 in ahead '
     'of the base (fig. 3). Where it meets the body: A, the underside of the cylinder; B, a side strut. B adds '
     'thickness and chord from text p. 7, outside the brief\'s text pages.'),
    ('RM L54C16', 'fins, tails, wings or bumps', [26], [23], 'same', 'None but the strut.'),
    ('RM L54C16', 'jet-off base: nozzle exit diameter', [27], [31], 'same', '1.044 in (fig. 2, nozzles 1 to 4).'),
    ('RM L54C16', 'jet-off base: open or plugged', [28], [32], 'differ',
     'A: open nozzle exit (rocket motor not yet burning), from text pp. 4 and 5 and the fig. 5 caption. '
     'B: not stated.'),
    ('RM L54C16', 'sting diameter', [29], [33], 'same', 'No sting (strut).'),
    ('RM L54C16', 'tunnel', [30], [24], 'same', 'Langley preflight jet at Wallops Island, 27 by 27 in.'),
    ('RM L54C16', 'tunnel size', [30], [25], 'same', '27 by 27 in.'),
    ('RM L54C16', 'wall or jet-boundary reflections', [31], [26], 'same',
     'Nose 8 in upstream of the jet exit; model inside the Mach diamond (text p. 5).'),
    ('RM L54C16', 'Mach number', [32], [27], 'same', '1.59, +-0.03.'),
    ('RM L54C16', 'Reynolds number', [33], [28], 'same', '17.8e6 on model length.'),
    ('RM L54C16', 'stagnation temperature', [34], [24], 'same', 'About 780 deg R (B in its tunnel row note).'),
    ('RM L54C16', 'boundary-layer transition or trip', [35], [29], 'differ',
     'A: not mentioned in pp. 4 to 6. B: natural transition, turbulent layer, no trip, from text p. 7, which is '
     'outside the brief\'s text pages and which A did not open.'),
    ('RM L54C16', 'support effect on boat-tail pressures', [36], [22], 'differ',
     'A: not mentioned in pp. 4 to 6. B: not stated for the boat-tail; for the base the strut effect is believed '
     'small (text pp. 7 and 8, outside the brief\'s pages). Neither gives a number for the boat-tail.'),
    ('RM L54C16', 'incidence', [], [30], 'B only', 'B: zero angle of attack (summary, p. 2).'),
    ('RM L54C16', 'pressure coefficient accuracy', [37], [34], 'same', '+-0.005.'),
    ('RM L54C16', 'drag coefficient and reference area', [38], [35], 'same',
     'C_D = Cp S/S_max on the maximum cross-section; fig. 5(b) integrates the boat-tail only.'),
    ('RM L54C16', 'jet-off marking', [39], [], 'A only', 'A: fig. 5 caption, power off. B says the same in method.md.'),
    # ---- RM L54I22
    ('RM L54I22', 'overall length', [40], [36], 'same', '8.25 in.'),
    ('RM L54I22', 'maximum diameter', [41], [37], 'same', '1.25 in (fig. 1).'),
    ('RM L54I22', 'nose shape', [42], [38], 'same',
     '"20 deg conical nose"; neither says the text states half or included angle; both infer the included angle '
     'from fig. 1.'),
    ('RM L54I22', 'nose length', [43], [39], 'same', '3 11/16 in.'),
    ('RM L54I22', 'nose tip and tip radius', [44, 45], [41], 'same', 'Sharp as drawn; no radius.'),
    ('RM L54I22', 'nose definition and coordinates', [46], [40], 'same', 'Straight cone; not tabulated.'),
    ('RM L54I22', 'cylinder length', [47], [42], 'same', 'Not stated; both derive 3.06 in.'),
    ('RM L54I22', 'boat-tail profile', [48, 49, 51], [43], 'same',
     'Circular arc, radius 4.140 in (fig. 1), slope at the base about 22 deg (text p. 4).'),
    ('RM L54I22', 'boat-tail length', [50], [44], 'same', '1.50 in from fig. 1.'),
    ('RM L54I22', 'base diameter', [52], [46], 'same', '11/16 in.'),
    ('RM L54I22', 'shroud secondary diameters', [53, 54], [47], 'same', '9/16 in (0.82) and 1/2 in (0.73).'),
    ('RM L54I22', 'boat-tail body of revolution or flaps', [55], [45], 'same',
     'Body of revolution; two shrouds of the same external ordinates.'),
    ('RM L54I22', 'shoulder', [56], [48], 'same', 'No corner drawn; tangent start of the arc; not stated in text.'),
    ('RM L54I22', 'orifice stations', [57], [49], 'same', 'Z = 1.06, 0.79, 0.53, 0.29, 0.06 in; same x/L by arithmetic.'),
    ('RM L54I22', 'orifice meridians and base orifices', [58], [49, 50], 'same',
     'Boat-tail row meridian not stated; four base orifices at 90 deg, two in line with the struts.'),
    ('RM L54I22', 'origin of the axial station', [59], [51], 'same', 'Model nose (B adds Z from the base, symbol list p. 3).'),
    ('RM L54I22', 'model support', [60], [52], 'differ',
     'Same support: two swept wing struts from the sidewalls, circular-arc section, 1.53 in. Where they meet the '
     'body, both scaled from an undimensioned sketch: A about 1.4 to 3.8 in from the nose (to just aft of the '
     'nose-cylinder junction at 3.69 in), about 2.9 in ahead of the boat-tail; B about 1.5 to 3.7 in from the tip, '
     'on the conical nose, about 3 in ahead.'),
    ('RM L54I22', 'support effect on boat-tail pressures', [61], [53], 'same',
     'Text p. 5: no apparent effect on the base pressure; nothing on the boat-tail.'),
    ('RM L54I22', 'fins, tails, wings or bumps', [62], [54], 'same', 'The two wing struts only.'),
    ('RM L54I22', 'jet-off base: nozzle exit diameter', [63], [62], 'same',
     'Sonic nozzle exit 7/16 in; the supersonic nozzle has essentially the same exit area.'),
    ('RM L54I22', 'jet-off base: open or plugged', [64], [63], 'differ',
     'A: open (no primary or secondary flow; nozzle and annulus open). B: not stated; the nozzles remain in place.'),
    ('RM L54I22', 'sting diameter', [65], [64], 'same', 'No sting.'),
    ('RM L54I22', 'tunnel', [66], [55], 'same', 'Langley 9-inch supersonic tunnel, closed circuit, continuous.'),
    ('RM L54I22', 'tunnel size', [66], [56], 'same', 'About 9 in square.'),
    ('RM L54I22', 'wall or jet-boundary reflections', [67], [57], 'same', 'Not stated.'),
    ('RM L54I22', 'Mach number', [68], [58], 'same', '1.62, 1.93, 2.41 (+-0.01).'),
    ('RM L54I22', 'Reynolds number', [69], [59], 'same', '2.1e6 to 2.9e6 on body length.'),
    ('RM L54I22', 'temperatures', [70], [], 'A only', 'A: stagnation air about 80 F; tunnel about 100 F.'),
    ('RM L54I22', 'boundary-layer transition or trip', [71], [60], 'same',
     'Turbulent; 1/8-inch salt band about 1 1/4 in from the nose.'),
    ('RM L54I22', 'incidence', [72], [61], 'same', '0 deg; alignment within +-0.1 deg.'),
    ('RM L54I22', 'pressure coefficient accuracy', [73], [65], 'same', '+-0.003 (base pressure coefficient).'),
    ('RM L54I22', 'pressure coefficient definition', [], [66], 'B only', 'B: P = (p - ps)/q (symbol list, p. 3).'),
    ('RM L54I22', 'drag or axial-force coefficient', [74], [67], 'same', 'None in the figures read.'),
    ('RM L54I22', 'jet-off marking', [75], [], 'A only',
     'A: fig. 2 legend; figs. 7, 14, 16 jet on, curves only. B says the same in method.md.'),
    ('RM L54I22', 'fig. 2 abscissa labels', [76], [], 'A only',
     'A: labels .80 .82 .86 ... 1.00 on ten even lines. B reports the same labels in method.md section 4.2.'),
    ('RM L54I22', 'which nozzle in fig. 2', [63], [68], 'same', 'Not stated (A in a note, B in its own row).'),
    # ---- RM E57E06
    ('RM E57E06', 'overall length', [77], [69], 'same', '20.44 in.'),
    ('RM E57E06', 'fineness ratio', [78], [70], 'same', '10.2 (B in a note).'),
    ('RM E57E06', 'maximum diameter', [79], [70], 'same', '2.00 in.'),
    ('RM E57E06', 'nose shape', [80], [71], 'same',
     '"8 deg cone-cylinder forebody"; both infer an 8 deg half-angle from fig. 1.'),
    ('RM E57E06', 'nose length', [81], [72], 'same, with detail',
     'Not dimensioned. A gives 7.54 in tip to strut; B estimates the cone about 7.1 in long from the drawing.'),
    ('RM E57E06', 'nose tip and tip radius', [82, 83], [74], 'same', 'Sharp as drawn; no radius.'),
    ('RM E57E06', 'nose coordinates', [84], [73], 'same', 'Not tabulated.'),
    ('RM E57E06', 'cylinder and strut positions along the body', [85], [75, 85], 'same',
     '7.54 in tip to strut, 5.40 in strut chord, 7.50 in strut trailing edge to base (A in its cylinder row, '
     'B in its support row); cylinder length not stated.'),
    ('RM E57E06', 'boat-tail angles', [86], [78], 'same', '3.0, 5.6, 7.0, 11.00 deg; captions use 5.63 deg.'),
    ('RM E57E06', 'base diameters', [87], [79], 'same',
     'db/dj 1.11, 1.40, 1.67, 2.00, 2.67 with dj 0.750 in. B adds the 45 deg bevel of fig. 14.'),
    ('RM E57E06', 'boat-tail length', [], [80], 'B only', 'B: not stated; its own arithmetic per db/dj.'),
    ('RM E57E06', 'boat-tail profile', [88], [76], 'same', 'Straight cone.'),
    ('RM E57E06', 'boat-tail body of revolution or flaps', [89], [77], 'same', 'Body of revolution.'),
    ('RM E57E06', 'shoulder', [90], [81], 'same', 'Sharp corner as drawn; no radius.'),
    ('RM E57E06', 'orifice stations', [91], [82], 'same',
     'Same dimension chain read in opposite directions: taps 1/16, 5/16, 9/16, 13/16 and 1 5/16 in from the base, '
     'one 1/4 in aft of the shoulder and one 1/4 in ahead of it on the cylinder. A says the chain is partly '
     'ambiguous.'),
    ('RM E57E06', 'orifice meridians', [92], [83], 'same', 'Behind and 90 deg from the struts.'),
    ('RM E57E06', 'origin of the axial station', [93], [84], 'same',
     'Fig. 7 body station from the nose (B: origin not stated, read as from the nose); figs. 6 and 14 '
     '1 - (r/rB)^2. B adds the symbol list (p. 6, outside the brief).'),
    ('RM E57E06', 'model support', [94], [85], 'same', 'Double struts, 9.3 percent thick, 3.75 diameters ahead of the base.'),
    ('RM E57E06', 'support effect on boat-tail pressures', [95], [86], 'same',
     'Text p. 9 as quoted by both (single against double strut; rise 90 deg from the strut; bump behind it). '
     'B adds p. 16.'),
    ('RM E57E06', 'tails and the tail interference model', [96], [98, 99], 'differ',
     'Same tails (t/c 5 percent, 1 1/2 in chord, 4.5 in span, on 0, 5.63 and 9.33 deg boat-tails). Positions: '
     'A none (fig. 4 not opened); B from fig. 4(a) (p. 45, outside the brief): tail trailing edges at the base, '
     'afterbody 6.25 in, base diameter 1.05 in.'),
    ('RM E57E06', 'rocket model', [97], [97], 'same',
     'Same nozzle and shape as the basic model; boat-tail taps on the 5.63 deg boat-tail only.'),
    ('RM E57E06', 'which model each fig. 14 point comes from', [98], [100], 'same',
     'Not stated; text p. 16 says all the 5.63 deg boat-tails tested.'),
    ('RM E57E06', 'jet-off base: nozzle exit diameter', [99], [94], 'same', 'dj 0.750 in (one nozzle 1.056 in).'),
    ('RM E57E06', 'jet-off base: open or plugged', [100], [95], 'differ',
     'A: open nozzle (no jet flow). B: not stated; the nozzle is in place.'),
    ('RM E57E06', 'sting diameter', [101], [96], 'same', 'No sting.'),
    ('RM E57E06', 'tunnel', [102], [87], 'same', 'Lewis 18 by 18 in (M 1.91) and 12 by 12 in (M 3.12).'),
    ('RM E57E06', 'tunnel size', [102], [88], 'same', '18 by 18 in and 12 by 12 in.'),
    ('RM E57E06', 'wall or jet-boundary reflections', [103], [89], 'same',
     'Strut leading-edge shock meeting the wall boundary layer reaches the afterbody (text p. 9; fig. 7(b)).'),
    ('RM E57E06', 'same models or tunnel as RM E51F26', [104], [101], 'same',
     'Not stated; RM E51F26 is reference 10, cited for comparison data only.'),
    ('RM E57E06', 'Mach number', [105], [90], 'same', '1.91 and 3.12.'),
    ('RM E57E06', 'Reynolds number', [106], [91], 'same, with detail',
     'Per foot as printed. On body length by the readers\' own arithmetic: A about 5.5e6, B about 5.4e6 at M 1.91.'),
    ('RM E57E06', 'boundary-layer transition or trip', [107], [92], 'same', '0.005 in wire ring on the nose cone.'),
    ('RM E57E06', 'boundary-layer state', [108], [92], 'same', 'Fig. 8 profiles; delta/dB about 0.06 with boat-tails.'),
    ('RM E57E06', 'incidence', [], [93], 'B only', 'B: zero, not stated explicitly.'),
    ('RM E57E06', 'pressure coefficient definition', [], [102], 'B only', 'B: symbol list p. 5 (outside the brief).'),
    ('RM E57E06', 'drag or axial-force coefficient', [109], [103], 'same', 'None in the figures read.'),
    ('RM E57E06', 'jet-off marking', [110], [], 'A only', 'A: figs. 7, 8, 14 captions; fig. 6 states none.'),
    # ---- TN D-6789
    ('TN D-6789', 'model', [111], [104], 'same', 'Air-powered cone-cylinder nacelle, rounded shoulder at the nose.'),
    ('TN D-6789', 'maximum diameter', [112], [106], 'same', '15.24 cm.'),
    ('TN D-6789', 'overall length', [113], [105], 'differ',
     'Not stated as one number in either. A: 104.14 + l, giving 119.38, 116.33 and 113.28 cm (l/dm 1.0, 0.8, 0.6), '
     'reference nozzle to Sta. 121.92. B: about 122 cm to the nozzle exit, with the example 104.14 + 15.24 = 119.38 '
     'cm.'),
    ('TN D-6789', 'nose shape', [114], [107], 'same', '14 deg as drawn (half-angle), 20.75 cm shoulder radius.'),
    ('TN D-6789', 'nose length', [115], [108], 'same, with detail',
     'Not dimensioned. B adds that Sta. 52.07, about 52 cm, is the forebody/afterbody joint.'),
    ('TN D-6789', 'nose tip and tip radius', [116, 117], [109], 'same', 'Sharp as drawn; radius not stated.'),
    ('TN D-6789', 'nose coordinates', [118], [], 'A only', 'A: not tabulated.'),
    ('TN D-6789', 'cylinder length', [119], [110], 'same', 'Not stated; the cylinder runs to Sta. 104.14.'),
    ('TN D-6789', 'boat-tail angles', [120], [114], 'same', 'Fig. 4 table: 3.00, 5.02, 10.00 / 3.30, 5.00, 10.00 / 3.00, 5.00, 10.00.'),
    ('TN D-6789', 'boat-tail length', [121], [115], 'same, with detail',
     'Same table; A gives the flap length l (l/dm 1.0, 0.8, 0.6 and 15.24, 12.19, 9.14 cm), B the axial length L '
     '(L/dm, for example 15.01 cm for configuration 5).'),
    ('TN D-6789', 'base diameter', [122], [114, 116], 'same', 'db/dm per configuration, fig. 4 table.'),
    ('TN D-6789', 'jet-off base: nozzle exit', [123], [114, 116, 130], 'same',
     'Ae/Ab per configuration; open nozzle; rim between db and de excluded.'),
    ('TN D-6789', 'boat-tail profile', [124], [111], 'same', 'Straight cone (fixed boat-tails that simulate flap positions).'),
    ('TN D-6789', 'boat-tail body of revolution or flaps', [125, 126], [112], 'same',
     'Bodies of revolution; no flaps or facets described.'),
    ('TN D-6789', 'shoulder', [127], [113], 'same', 'Machined sharp corner at Sta. 104.14.'),
    ('TN D-6789', 'orifice stations', [128], [117], 'differ',
     'Same stations at phi 0 and 90. For phi 45, 135, 157.5 and 180, A: the same stations without -0.02 and .08; '
     'B: the same stations without -0.02 (both from table I, p. 16). The two fig. 5 readings both place no '
     'symbol of those meridians at x/dm 0.08.'),
    ('TN D-6789', 'orifice meridian convention', [], [118], 'B only', 'B: phi clockwise from the top looking from the rear (symbol list p. 5).'),
    ('TN D-6789', 'origin of the axial station', [129], [119], 'same', 'Boat-tail corner, Sta. 104.14.'),
    ('TN D-6789', 'model support', [130], [120], 'same, with detail',
     'Sidewall strut, 5 percent thick, 50.80 cm chord, swept; meets the forebody well ahead of the boat-tail. '
     'A: about 53 cm ahead of the corner, strut meridian not given. B: the swept strut extends aft beside the model '
     '(fig. 2 area to about 120 cm).'),
    ('TN D-6789', 'support effect on boat-tail pressures', [131, 132], [121], 'same, with detail',
     'Text p. 9: very little effect on a cylindrical afterbody (M 2.20 survey); only slight top-bottom difference '
     '(fig. 5), top row used. B adds p. 14 (reference nozzle bottom pressures in the strut wake), outside the brief.'),
    ('TN D-6789', 'fins, tails, wings or bumps', [133], [122], 'same', 'None besides the strut.'),
    ('TN D-6789', 'sting diameter', [134], [131], 'same', 'No sting.'),
    ('TN D-6789', 'tunnel', [135], [123], 'same', 'Langley 4- by 4-foot supersonic pressure tunnel.'),
    ('TN D-6789', 'tunnel size', [135], [124], 'same', '4 by 4 ft.'),
    ('TN D-6789', 'wall or jet-boundary reflections', [136], [125], 'same, with detail',
     'Not stated for M 1.83 and 2.20. B adds p. 11 on the ref. 1 data near M 1.0 (outside the brief).'),
    ('TN D-6789', 'Mach number', [137], [126], 'same', '1.83 and 2.20.'),
    ('TN D-6789', 'Reynolds number', [138], [127], 'same', '14.70e6 and 12.20e6 per metre; survey 1.55e6 to 2.07e6 on diameter.'),
    ('TN D-6789', 'boundary-layer transition or trip', [139], [128], 'same', 'No. 80 grit 2.54 cm from the nose.'),
    ('TN D-6789', 'boundary-layer thickness', [140], [121], 'same', 'About 0.1 dm (survey).'),
    ('TN D-6789', 'incidence', [141], [129], 'same', '0 deg.'),
    ('TN D-6789', 'drag coefficient and reference area', [142], [132], 'same',
     'Boat-tail only, phi 0 orifices, rim excluded, on Am.'),
    ('TN D-6789', 'pressure coefficient definition', [], [133], 'B only', 'B: symbol list p. 4 (outside the brief).'),
    ('TN D-6789', 'jet-off marking', [143], [], 'A only', 'A: captions and fig. 7 legend. B says the same in method.md.'),
    ('TN D-6789', 'reference (S.T.A.) nozzle profile', [144], [134], 'same',
     'Circular arc (3.50 dm), internal ellipse into 0.25 dm radius, L/dm 1.286, Ae/Ab 0.962. B cites p. 14.'),
    ('TN D-6789', 'reference nozzle orifices', [145], [135], 'same', 'Same stations (fig. 17 table).'),
    ('TN D-6789', 'reference nozzle axial origin', [146], [134], 'same', 'Sta. 102.32.'),
    ('TN D-6789', 'data from another report in figs. 12 and 20', [], [136], 'B only',
     'B: data at M 1.3 and below are from ref. 1 (TM X-1960), text pp. 11 and 14 (outside the brief).'),
    # ---- TM X-1960
    ('TM X-1960', 'model', [147], [137], 'same', 'The same nacelle as TN D-6789.'),
    ('TM X-1960', 'maximum diameter', [148], [139], 'same', '15.24 cm.'),
    ('TM X-1960', 'overall length', [149], [138], 'same, with detail',
     'Not stated as one number; 104.14 + L. Examples: A 119.38 cm for L/dm 1.000, B 119.15 cm for configuration 5. '
     'Both give the 119.4 cm replica of appendix B.'),
    ('TM X-1960', 'nose shape', [150], [140], 'same', '14 deg as drawn, 20.75 cm shoulder radius.'),
    ('TM X-1960', 'nose length', [151], [141], 'same', 'Not dimensioned.'),
    ('TM X-1960', 'nose tip and tip radius', [152, 153], [142], 'same', 'Sharp as drawn and photographed.'),
    ('TM X-1960', 'nose coordinates', [154], [142], 'same', 'Not tabulated.'),
    ('TM X-1960', 'cylinder length', [155], [143], 'same', 'Not dimensioned.'),
    ('TM X-1960', 'boat-tail angles and configurations', [156], [147], 'same',
     'Fig. 4 table; B lists all 21 configurations, A the 15 read here.'),
    ('TM X-1960', 'boat-tail length', [], [148], 'B only', 'B: l along the surface, L axial (L = l cos beta).'),
    ('TM X-1960', 'base diameter', [157], [147, 149], 'same', 'db/dm per configuration.'),
    ('TM X-1960', 'jet-off base: nozzle exit', [158], [147, 149, 165], 'same',
     'Ae/Ab per configuration (configuration 19 0.642); open nozzle; rim excluded.'),
    ('TM X-1960', 'boat-tail profile', [159], [144], 'same', 'Straight cone from a sharp corner at Sta. 104.14.'),
    ('TM X-1960', 'boat-tail body of revolution or flaps', [160, 161], [145], 'same', 'Bodies of revolution; no flaps.'),
    ('TM X-1960', 'shoulder', [162], [146], 'same', 'Machined sharp corner.'),
    ('TM X-1960', 'orifice stations', [163], [150], 'differ',
     'A did not open tables I and II (outside the brief\'s pages) and gives the stations as plotted in figs. 5 '
     'and 6. B read table I(a) on p. 26 (outside the brief) and gives every configuration\'s stations. Where both '
     'give them (l/dm 1.0 and 0.6) they are the same.'),
    ('TM X-1960', 'orifice meridians', [163], [151], 'same, with detail',
     'phi 0, 45, 90, 135, 157.5, 180. B adds the convention and that only phi 0 enters C_A,beta (pp. 7 and 13).'),
    ('TM X-1960', 'origin of the axial station', [164], [152], 'same', 'Boat-tail corner, Sta. 104.14.'),
    ('TM X-1960', 'model support', [165], [153], 'same',
     'Floor strut, 5 percent thick, 50.80 cm chord, swept, meeting the underside of the forebody well ahead of '
     'the boat-tail.'),
    ('TM X-1960', 'model location in the tunnel', [165], [154], 'same', '91.40 cm below the tunnel centre line, 153 cm above the floor.'),
    ('TM X-1960', 'support effect on boat-tail pressures', [166], [155], 'same, with detail',
     'Appendix B as both quote it; B adds text p. 13 (rows differ at M 0.90 and 1.30, thought to be the strut; '
     'only the top row used), outside the brief\'s text pages.'),
    ('TM X-1960', 'wall or shock reflections', [167], [159], 'same, with detail',
     'At M 1.20 the reflections fall behind the base of the normal-length model (p. 21). B adds p. 13 (M 0.95 to '
     '1.20 exclusive in doubt).'),
    ('TM X-1960', 'fins, tails, wings or bumps', [168], [156], 'same', 'None besides the strut.'),
    ('TM X-1960', 'sting diameter', [169], [166], 'same', 'No sting on the test model.'),
    ('TM X-1960', 'tunnel', [170], [157], 'same', 'Langley 16-foot transonic tunnel.'),
    ('TM X-1960', 'tunnel size', [170], [158], 'same', '4.73 m across the flats.'),
    ('TM X-1960', 'blockage', [171], [155], 'same', '0.19 percent.'),
    ('TM X-1960', 'Mach number', [172], [160], 'same', '0.30 to 1.30; read at 1.20, 1.25, 1.30.'),
    ('TM X-1960', 'Reynolds number', [173], [161], 'differ',
     'A: not stated in the pages read. B: 8e6 to 16e6 on model length, from the summary (p. 4), outside the '
     'brief\'s pages.'),
    ('TM X-1960', 'boundary-layer transition or trip', [174], [162], 'same', 'No. 100 grit 5.08 cm from the nose.'),
    ('TM X-1960', 'boundary-layer thickness', [175], [163], 'same', 'About 1.52 cm (delta/dm 0.1) at the corner.'),
    ('TM X-1960', 'incidence', [176], [164], 'same', '0 deg.'),
    ('TM X-1960', 'axial-force coefficient C_A,beta', [177], [167], 'same', 'Boat-tail only, phi 0, rim and friction excluded, on Am.'),
    ('TM X-1960', 'fig. 11 coefficients', [178], [168], 'same', 'Both include the base; on Am.'),
    ('TM X-1960', 'pressure coefficient definition', [], [169], 'B only', 'B: symbol list p. 6 (outside the brief).'),
    ('TM X-1960', 'jet-off marking', [179], [], 'A only', 'A: captions say jet off.'),
    ('TM X-1960', 'reference (S.T.A.) nozzle profile', [180], [170], 'same',
     'Circular arc 3.50 dm, Ae/Ab 0.980; both note TN D-6789\'s copy gives 0.962.'),
    ('TM X-1960', 'reference nozzle orifices', [181], [171], 'same', 'Same stations (fig. 17 table).'),
]


def geometry_pairs(src, out):
    rows = {}
    for tag in ('A', 'B'):
        with open(os.path.join(src, tag, 'geometry.csv'), newline='') as fh:
            rows[tag] = list(csv.DictReader(fh))
    used = {'A': set(), 'B': set()}
    outrows = []
    for src_name, topic, ra, rb, comp, comment in GEOMETRY:
        rec = dict(source=src_name, topic=topic, comparison=comp, comment=comment,
                   rows_A='; '.join(str(i) for i in ra), rows_B='; '.join(str(i) for i in rb))
        for tag, idx in (('A', ra), ('B', rb)):
            parts = {k: [] for k in ('quantity', 'value', 'unit', 'page', 'note')}
            for i in idx:
                r = rows[tag][i - 1]
                if r['source'] != src_name:
                    raise SystemExit('geometry row %s%d is %s, not %s' % (tag, i, r['source'], src_name))
                used[tag].add(i)
                for k in parts:
                    parts[k].append(r[k])
            for k, v in parts.items():
                rec[k + '_' + tag] = ' || '.join(v)
        outrows.append(rec)
    missing = {t: [i for i in range(1, len(rows[t]) + 1) if i not in used[t]] for t in ('A', 'B')}
    if missing['A'] or missing['B']:
        raise SystemExit('geometry rows not mapped: %r' % missing)
    cols = ['source', 'topic', 'comparison', 'comment', 'rows_A', 'rows_B',
            'quantity_A', 'value_A', 'unit_A', 'page_A', 'quantity_B', 'value_B', 'unit_B', 'page_B',
            'note_A', 'note_B']
    with open(os.path.join(out, 'geometry_pairs.csv'), 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=cols, lineterminator='\n')
        w.writeheader()
        w.writerows(outrows)
    return outrows


def describe(r):
    """One line naming where a pair sits: figure part, Mach number, series."""
    a = r['item_A'] or r['item_B']
    mach_ = r['mach_A'] or r['mach_B']
    return '%s, M %s, %s' % (a, mach_, r['series_key'])


def side(r, tag):
    if r['row_' + tag] == '':
        return '%s: no point read here' % tag
    return ('%s (row %s): x %s (err %s), y %s (err %s), flag %s; series "%s"; alternatives: %s'
            % (tag, r['row_' + tag], r['x_' + tag], r['x_err_' + tag] or 'not stated', r['y_' + tag] or 'empty',
               r['y_err_' + tag] or 'not stated', r['flag_' + tag], r['series_' + tag],
               r['alternatives_' + tag] or 'none'))


def write_listings(path, all_pairs, cross):
    L = []
    def block(title, rows, extra):
        L.append('')
        L.append(title)
        L.append('=' * len(title))
        if not rows:
            L.append('(none)')
        for r in rows:
            L.append('')
            L.append('%s  %s; %s' % (r['pair_id'], describe(r), r['status']))
            L.append('  ' + side(r, 'A'))
            L.append('  ' + side(r, 'B'))
            extra(r)
            for tag in ('A', 'B'):
                if r['note_' + tag]:
                    L.append('  %s note: %s' % (tag, r['note_' + tag]))
    def dis_extra(r):
        L.append('  difference: dx %s (x test: %s); dy %s against summed errors %s (y test: %s)'
                 % (r['dx'] or 'n/a', r['x_test'], r['dy'] or 'n/a',
                    fmt((num(r['y_err_A']) or 0) + (num(r['y_err_B']) or 0), 5), r['y_test']))
        L.append('  envelope of the two: y %s to %s; with the numeric alternatives: %s to %s'
                 % (r['y_envelope_low'], r['y_envelope_high'], r['y_envelope_with_alternatives_low'],
                    r['y_envelope_with_alternatives_high']))
        if r['alternatives_check']:
            L.append('  alternatives check: ' + r['alternatives_check'])
        if r['label_differences']:
            L.append('  label differences: ' + r['label_differences'])
    def plain_extra(r):
        if r['label_differences']:
            L.append('  label differences: ' + r['label_differences'])
    block('Disagreements (difference larger than the two stated errors summed, on x or y)',
          [r for r in all_pairs if r['status'].startswith('disagree')], dis_extra)
    block('Points read once (no point of the other reading at that station in that series)',
          [r for r in all_pairs if r['status'].startswith('read once')], plain_extra)
    block('Illegible items (y left empty by one reader or both)',
          [r for r in all_pairs if 'illegible' in r['status'] and not r['status'].startswith('read once')],
          plain_extra)
    block('Pairs whose labels differ (flag or meridian field)',
          [r for r in all_pairs if r['label_differences'] and not r['status'].startswith('disagree')],
          plain_extra)
    L.append('')
    t = 'Possible label differences among points read once (same station, y within twice the summed errors)'
    L.append(t)
    L.append('=' * len(t))
    for c in cross:
        L.append('%s  A %s (%s at x %s, y %s; alternatives: %s)  B %s (%s at x %s, y %s; alternatives: %s)'
                 % (c['figure'], c['pair_id_A'], c['series_A'], c['x_A'], c['y_A'], c['alternatives_A'] or 'none',
                    c['pair_id_B'], c['series_B'], c['x_B'], c['y_B'], c['alternatives_B'] or 'none'))
    with open(path, 'w') as fh:
        fh.write('\n'.join(L).lstrip('\n') + '\n')


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    counts = []
    flags = []
    cross = []
    labels = []
    all_pairs = []
    hashes = []
    for fname in FIGS:
        A = load(src, fname, 'A')
        B = load(src, fname, 'B')
        hashes.append((fname, sha256(os.path.join(src, 'A', fname)), sha256(os.path.join(src, 'B', fname))))
        spec = SPEC[fname]
        tolf = spec['tol'] if callable(spec['tol']) else (lambda fr, t=spec['tol']: t)
        groups = {}
        for r in A + B:
            fr = spec['frame'](r)
            sk = spec['series'](r)
            groups.setdefault((fr, sk), []).append(r)
        pairs = []
        leftovers = []
        for (fr, sk) in sorted(groups):
            pts = groups[(fr, sk)]
            tol = tolf(fr)
            for cl in clusters(pts, tol):
                As = [p for p in cl if p['_reader'] == 'A']
                Bs = [p for p in cl if p['_reader'] == 'B']
                m = best_matching(As, Bs, tol)
                used = set()
                for a, b in m:
                    pairs.append((fr, sk, a, b))
                    used.add(id(a))
                    used.add(id(b))
                for p in cl:
                    if id(p) not in used:
                        pairs.append((fr, sk, p if p['_reader'] == 'A' else None, p if p['_reader'] == 'B' else None))
                        leftovers.append((fr, sk, p))
        # order: frame, series, station
        def okey(t):
            fr, sk, a, b = t
            r = a if a is not None else b
            return (fr, sk, r['_x'], -(r['_y'] if r['_y'] is not None else 9))
        pairs.sort(key=okey)
        stem = fname[:-4]
        rows = []
        for i, (fr, sk, a, b) in enumerate(pairs, start=1):
            rows.append(pair_row('%s-%03d' % (stem, i), fname, fr, sk, a, b))
        with open(os.path.join(out, 'pairs_' + fname), 'w', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=PAIR_COLS, lineterminator='\n')
            w.writeheader()
            w.writerows(rows)
        all_pairs.extend(rows)
        # possible label differences among left-over points
        for (fr, sk, p) in leftovers:
            if p['_reader'] != 'A':
                continue
            for (fr2, sk2, q) in leftovers:
                if q['_reader'] != 'B' or fr2 != fr or sk2 == sk:
                    continue
                if abs(p['_x'] - q['_x']) > tolf(fr):
                    continue
                if p['_y'] is not None and q['_y'] is not None:
                    s = (p['_ey'] or 0) + (q['_ey'] or 0)
                    if abs(p['_y'] - q['_y']) > 2 * s + 1e-12:
                        continue
                pa = next(r['pair_id'] for r in rows if r['row_A'] == p['_row'])
                pb = next(r['pair_id'] for r in rows if r['row_B'] == q['_row'])
                cross.append(dict(figure=fname, frame=' / '.join(fr), pair_id_A=pa, pair_id_B=pb,
                                  series_key_A=' / '.join(sk), series_key_B=' / '.join(sk2),
                                  x_A=p['x'], y_A=p['y'], x_B=q['x'], y_B=q['y'],
                                  series_A=p['series'], series_B=q['series'],
                                  flag_A=p['flag'], flag_B=q['flag'],
                                  alternatives_A=p['alternatives'], alternatives_B=q['alternatives']))
        # flags of both readers (every row not flagged ok)
        pid_of = {}
        for r in rows:
            if r['row_A'] != '':
                pid_of[('A', r['row_A'])] = (r['pair_id'], r['status'])
            if r['row_B'] != '':
                pid_of[('B', r['row_B'])] = (r['pair_id'], r['status'])
        for r in A + B:
            if r['flag'] != 'ok':
                pid, st = pid_of[(r['_reader'], r['_row'])]
                flags.append(dict(reader=r['_reader'], figure=fname, row=r['_row'], pair_id=pid, pair_status=st,
                                  item=r['item'], series=r['series'], configuration=r['configuration'],
                                  mach=r['mach'], meridian=r['meridian'], x=r['x'], y=r['y'], flag=r['flag'],
                                  alternatives=r['alternatives'], page=r['page'], note=r['note']))
        # label inventory per group
        for (fr, sk) in sorted(groups):
            for tag in ('A', 'B'):
                pts = [p for p in groups[(fr, sk)] if p['_reader'] == tag]
                if not pts:
                    labels.append(dict(figure=fname, frame=' / '.join(fr), series_key=' / '.join(sk), reader=tag,
                                       rows=0, series='', configuration='', mach='', meridian='',
                                       x_quantity='', y_quantity=''))
                    continue
                def uniq(f):
                    seen = []
                    for p in pts:
                        if p[f] not in seen:
                            seen.append(p[f])
                    return ' || '.join(seen)
                labels.append(dict(figure=fname, frame=' / '.join(fr), series_key=' / '.join(sk), reader=tag,
                                   rows=len(pts), series=uniq('series'), configuration=uniq('configuration'),
                                   mach=uniq('mach'), meridian=uniq('meridian'),
                                   x_quantity=uniq('x_quantity'), y_quantity=uniq('y_quantity')))
        st = [r['status'] for r in rows]
        counts.append(dict(
            figure=fname, rows_A=len(A), rows_B=len(B), pairs=sum(1 for r in rows if r['row_A'] != '' and r['row_B'] != ''),
            agree=st.count('agree'),
            disagree_x=st.count('disagree in x'), disagree_y=st.count('disagree in y'),
            disagree_xy=st.count('disagree in x and y'),
            illegible_A_read_B=st.count('illegible in A, read by B'),
            illegible_B_read_A=st.count('illegible in B, read by A'),
            illegible_both=st.count('illegible in both'),
            not_tested=st.count('not tested'),
            read_once_A=sum(1 for s in st if s.startswith('read once by A')),
            read_once_B=sum(1 for s in st if s.startswith('read once by B')),
            flagged_A=sum(1 for r in A if r['flag'] != 'ok'), flagged_B=sum(1 for r in B if r['flag'] != 'ok'),
        ))

    def write(name, rows, cols):
        with open(os.path.join(out, name), 'w', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=cols, lineterminator='\n')
            w.writeheader()
            w.writerows(rows)

    write('counts.csv', counts, list(counts[0].keys()))
    write('flags.csv', flags, ['reader', 'figure', 'row', 'pair_id', 'pair_status', 'item', 'series', 'configuration',
                               'mach', 'meridian', 'x', 'y', 'flag', 'alternatives', 'page', 'note'])
    write('possible_label_differences.csv', cross,
          ['figure', 'frame', 'pair_id_A', 'pair_id_B', 'series_key_A', 'series_key_B', 'x_A', 'y_A', 'x_B', 'y_B',
           'series_A', 'series_B', 'flag_A', 'flag_B', 'alternatives_A', 'alternatives_B'])
    write('labels.csv', labels, ['figure', 'frame', 'series_key', 'reader', 'rows', 'series', 'configuration',
                                 'mach', 'meridian', 'x_quantity', 'y_quantity'])
    write('disagreements.csv', [r for r in all_pairs if r['status'].startswith('disagree')], PAIR_COLS)
    write('read_once.csv', [r for r in all_pairs if r['status'].startswith('read once')], PAIR_COLS)
    write('illegible.csv', [r for r in all_pairs if 'illegible' in r['status']], PAIR_COLS)
    write('input_sha256.csv', [dict(figure=f, sha256_A=a, sha256_B=b) for f, a, b in hashes]
          + [dict(figure='geometry.csv', sha256_A=sha256(os.path.join(src, 'A', 'geometry.csv')),
                  sha256_B=sha256(os.path.join(src, 'B', 'geometry.csv')))],
          ['figure', 'sha256_A', 'sha256_B'])
    write_listings(os.path.join(out, 'listings.txt'), all_pairs, cross)
    g = geometry_pairs(src, out)
    print('pairs written for %d figures; %d pairs in all; %d geometry topics' % (len(FIGS), len(all_pairs), len(g)))


if __name__ == '__main__':
    main()
