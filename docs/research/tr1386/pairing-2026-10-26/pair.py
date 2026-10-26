#!/usr/bin/env python3
"""Pair reader A's and reader B's blind readings of NACA TR 1386, figure by figure.

Written by the neutral pairing party on 2026-10-26. It reads only the two readings in
../readings/A and ../readings/B and writes, next to this script:

  pairs-fig1.csv ... pairs-fig16.csv  one file per figure, every row of both readings
  flags.csv                           every flag of both readers, with the note verbatim
  pairing.txt                         counts per figure and panel, every disagreement,
                                      every read-once item, every label difference

Rules (from the pairing request and entry (x) of docs/design/0014-refusals.md):

  * Two values agree when |a - b| <= u_a + u_b, where u_a and u_b are the readers' own
    stated reading errors for that value (the two stated errors summed; the pairing
    request gives this as the rule of the earlier pairings in this project). The rule is
    applied to each read coordinate on its own (station and P in figure 4; the x value
    and the drag coefficient elsewhere). A point pair agrees when every read coordinate
    agrees; otherwise it disagrees, and the coordinate that fails is named.
  * No value is averaged, smoothed, rounded or settled. For every pair the envelope of
    both readings is written for each coordinate, [min(a - u_a, b - u_b), max(a + u_a,
    b + u_b)], as entry (x) asks; a value read by one reader only keeps its own interval.
  * Which point is which is decided from positions and values. Both readers give each
    symbol's pixel centre in its note (A on a 600 dpi render, B on a 400 dpi render of
    the same 300 dpi scan), so B's centres are put on A's scale (times 1.5) and points
    are matched one to one by the distance between centres, nearest first, within one
    symbol width (GATE_PX, 600 dpi pixels). Pass 1 matches only rows whose symbol or
    series is the same (so a square drawn over a circle is not matched to the circle);
    pass 2 then matches what is left regardless of series, so a series label that
    differs shows up as a label difference instead of two read-once rows. Labels
    (series, model, d/D, Mach, Reynolds number, kind) are compared after matching.
  * Curves (figure 5 only) have no symbols; each reader chose their own stations. A
    station of one reader is paired with the other reader's station on the same curve
    when the two x readings agree by the rule above (nearest first, one to one); the y
    readings are then compared. A station with no partner is listed as read once; for a
    curve that means only that the other reader chose no station there.
  * Figure 1 geometry is printed text, not a reading with an error, so the rule is
    exact equality after removing spaces.
"""

import csv
import math
import os
import re
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
READ = os.path.join(HERE, '..', 'readings')
GATE_PX = 30.0  # about one symbol width on the 600 dpi render (circles and squares 28 to 30 px)
B_TO_A = 600.0 / 400.0

PX_A = re.compile(r'px=\(([-\d.]+),([-\d.]+)\)')
PX_B = re.compile(r'pixel centre \(([-\d.]+),([-\d.]+)\)')


def load(reader, kind):
    path = os.path.join(READ, reader, 'reader%s_%s.csv' % (reader, kind))
    with open(path, newline='', encoding='utf-8') as fh:
        rows = list(csv.DictReader(fh))
    tag = {'pressures': 'P', 'drag': 'D', 'geometry': 'G'}[kind]
    for i, r in enumerate(rows, start=1):
        r['_id'] = '%s-%s%03d' % (reader, tag, i)
        r['_line'] = i + 1  # line number in the CSV file, header is line 1
        r['_reader'] = reader
        if kind == 'geometry':
            continue
        pat, scale = (PX_A, 1.0) if reader == 'A' else (PX_B, B_TO_A)
        m = pat.search(r['note'])
        r['_px'] = (float(m.group(1)) * scale, float(m.group(2)) * scale) if m else None
        if kind == 'pressures':
            r['_x'], r['_ux'] = float(r['station']), float(r['station_unc'])
            r['_y'], r['_uy'] = float(r['cp']), float(r['cp_unc'])
        else:
            r['_x'], r['_ux'] = float(r['x']), float(r['x_unc'])
            r['_y'], r['_uy'] = float(r['quantity']), float(r['quantity_unc'])
    return rows


def num(s):
    s = (s or '').strip()
    if s == '':
        return None
    try:
        return float(s)
    except ValueError:
        return s


def fmt(v):
    if v is None:
        return ''
    if isinstance(v, str):
        return v
    s = '%.6f' % v
    s = s.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def shape(text):
    t = text.lower()
    for k in ('diamond', 'square', 'circle', 'triangle'):
        if k in t:
            return k
    return t


def series_class(r):
    """The symbol or series of a row, as each reader labels it, used for pass 1."""
    f = r['figure']
    s = r.get('series', r.get('series_key_text', ''))
    if f == '4':
        return shape(s)
    if f == '5':
        if r['source_kind'] == 'curve':
            return 'solid line' if ('Estimated' in s) else 'dashed line'
        return 'model ' + r['model']
    if f == '7' and r['panel'] == 'a':
        return 'd/D %s' % fmt(num(r['d_over_D']))
    if f == '7' and r['panel'] == 'b':
        if 'air off' in s:
            key = 'air off, Re=0.8M x10^6'
        else:
            m = re.search(r'Re=([\d.]+)', s.replace(' ', ''))
            key = 'air on, Re=%s x10^6' % (m.group(1) if m else '?')
        return 'd/D %s, %s' % (fmt(num(r['d_over_D'])), key)
    if f == '8':
        if 'Wave drag' in s:
            return 'Wave drag (press. distr. models)'
        if 'Foredrag' in s:
            return 'Foredrag'
        return s
    if f == '10':
        return 'foredrag circle'
    if f == '16':
        return 'model ' + r['model']
    return s


def panel_of(r):
    """Figure panel used for counts: the printed panel letter, or the Mach panel."""
    f = r['figure']
    if f in ('8', '10'):
        return 'M=%s' % r['mach']
    if f == '5':
        return 'curves' if r['source_kind'] == 'curve' else 'symbols'
    return r['panel']


def dist(a, b):
    return math.hypot(a['_px'][0] - b['_px'][0], a['_px'][1] - b['_px'][1])


def match_points(A, B):
    """One-to-one matching by pixel centre, pass 1 within series, pass 2 across."""
    pairs = []
    freeA, freeB = set(range(len(A))), set(range(len(B)))
    for pss in (1, 2):
        cand = []
        for i in freeA:
            for j in freeB:
                if pss == 1 and series_class(A[i]) != series_class(B[j]):
                    continue
                d = dist(A[i], B[j])
                if d <= GATE_PX:
                    cand.append((d, i, j))
        cand.sort()
        for d, i, j in cand:
            if i in freeA and j in freeB:
                pairs.append((i, j, d, pss))
                freeA.discard(i)
                freeB.discard(j)
    return pairs, sorted(freeA), sorted(freeB)


def match_curve(A, B):
    """Curve stations: pair when the x readings agree by the rule, nearest x first."""
    pairs = []
    freeA, freeB = set(range(len(A))), set(range(len(B)))
    cand = []
    for i in freeA:
        for j in freeB:
            dx = abs(A[i]['_x'] - B[j]['_x'])
            if dx <= A[i]['_ux'] + B[j]['_ux'] + 1e-12:
                cand.append((dx, i, j))
    cand.sort()
    for dx, i, j in cand:
        if i in freeA and j in freeB:
            pairs.append((i, j, dx, 'x'))
            freeA.discard(i)
            freeB.discard(j)
    return pairs, sorted(freeA), sorted(freeB)


def coord(a, b, c):
    va, ua, vb, ub = a['_' + c], a['_u' + c], b['_' + c], b['_u' + c]
    diff = vb - va
    tol = ua + ub
    ok = abs(diff) <= tol + 1e-12
    return {
        'diff': diff,
        'tol': tol,
        'agree': ok,
        'lo': min(va - ua, vb - ub),
        'hi': max(va + ua, vb + ub),
    }


def label_diffs(a, b, fig):
    out = []
    ca, cb = series_class(a), series_class(b)
    if ca != cb:
        out.append('series: A "%s", B "%s"' % (ca, cb))
    for k in ('model', 'd_over_D', 'mach', 'reynolds', 'measured_or_estimate', 'source_kind'):
        if k not in a:
            continue
        if fig == '7' and a['panel'] == 'b' and k == 'mach':
            continue  # both readers put the x reading in the mach column; compared as x
        if fig == '5' and a['source_kind'] == 'curve' and k == 'mach':
            continue
        va, vb = num(a[k]), num(b[k])
        if va != vb:
            out.append('%s: A "%s", B "%s"' % (k, a[k], b[k]))
    return out


def other_candidates(r, others, partner):
    out = []
    for o in others:
        if o is partner or o['_px'] is None or r['_px'] is None:
            continue
        d = dist(r, o)
        if d <= GATE_PX:
            out.append('%s at %.1f px' % (o['_id'], d))
    return out


HEAD = [
    'pair_id', 'figure', 'panel', 'status', 'match', 'centre_distance_px_600dpi',
    'A_row', 'B_row', 'A_series', 'B_series', 'A_model', 'B_model', 'A_d_over_D', 'B_d_over_D',
    'A_mach', 'B_mach', 'A_reynolds', 'B_reynolds', 'x_label',
    'A_x', 'A_x_unc', 'B_x', 'B_x_unc', 'x_diff_B_minus_A', 'x_tol_sum', 'x_agree',
    'x_envelope_lo', 'x_envelope_hi', 'y_label',
    'A_y', 'A_y_unc', 'B_y', 'B_y_unc', 'y_diff_B_minus_A', 'y_tol_sum', 'y_agree',
    'y_envelope_lo', 'y_envelope_hi', 'label_differences', 'other_rows_within_gate',
    'A_flag', 'B_flag', 'A_note', 'B_note',
]


def row_out(pid, fig, panel, status, match, d, a, b, ld, oth):
    o = dict.fromkeys(HEAD, '')
    o.update({'pair_id': pid, 'figure': fig, 'panel': panel, 'status': status, 'match': match,
              'centre_distance_px_600dpi': '' if d is None else '%.1f' % d,
              'label_differences': '; '.join(ld), 'other_rows_within_gate': '; '.join(oth)})
    lab = lambda r, k: r.get(k, '')
    for tag, r in (('A', a), ('B', b)):
        if r is None:
            continue
        o[tag + '_row'] = '%s (line %d)' % (r['_id'], r['_line'])
        o[tag + '_series'] = r.get('series', r.get('series_key_text', ''))
        o[tag + '_model'] = r['model']
        o[tag + '_d_over_D'] = r['d_over_D']
        o[tag + '_mach'] = r['mach']
        o[tag + '_reynolds'] = r['reynolds']
        o[tag + '_x'] = fmt(r['_x'])
        o[tag + '_x_unc'] = fmt(r['_ux'])
        o[tag + '_y'] = fmt(r['_y'])
        o[tag + '_y_unc'] = fmt(r['_uy'])
        o[tag + '_flag'] = r['flag']
        o[tag + '_note'] = r['note']
        o['x_label'] = lab(r, 'station_label') or lab(r, 'x_label')
        o['y_label'] = 'Pressure coefficient, P' if 'cp' in r else lab(r, 'quantity_label')
    if a is not None and b is not None:
        cx, cy = coord(a, b, 'x'), coord(a, b, 'y')
        for c, k in ((cx, 'x'), (cy, 'y')):
            o[k + '_diff_B_minus_A'] = fmt(c['diff'])
            o[k + '_tol_sum'] = fmt(c['tol'])
            o[k + '_agree'] = 'yes' if c['agree'] else 'NO'
            o[k + '_envelope_lo'] = fmt(c['lo'])
            o[k + '_envelope_hi'] = fmt(c['hi'])
    else:
        r = a if a is not None else b
        o['x_envelope_lo'] = fmt(r['_x'] - r['_ux'])
        o['x_envelope_hi'] = fmt(r['_x'] + r['_ux'])
        o['y_envelope_lo'] = fmt(r['_y'] - r['_uy'])
        o['y_envelope_hi'] = fmt(r['_y'] + r['_uy'])
    return o


def pair_group(fig, rowsA, rowsB, curve=False):
    """Return output rows for one group (one panel, or one curve)."""
    if curve:
        pairs, oa, ob = match_curve(rowsA, rowsB)
    else:
        pairs, oa, ob = match_points(rowsA, rowsB)
    out = []
    for i, j, d, pss in pairs:
        a, b = rowsA[i], rowsB[j]
        cx, cy = coord(a, b, 'x'), coord(a, b, 'y')
        status = 'agree' if (cx['agree'] and cy['agree']) else 'disagree'
        match = 'curve station, x within the summed x errors' if curve else (
            'pass 1, same series' if pss == 1 else 'pass 2, series labels differ')
        oth = []
        if not curve:
            oth = ['for A: ' + s for s in other_candidates(a, rowsB, b)] + \
                  ['for B: ' + s for s in other_candidates(b, rowsA, a)]
        out.append((a, b, status, match, None if curve else d, label_diffs(a, b, fig), oth))
    for i in oa:
        a = rowsA[i]
        oth = [] if curve else ['for A: ' + s for s in other_candidates(a, rowsB, None)]
        out.append((a, None, 'read once (A only)', '', None, [], oth))
    for j in ob:
        b = rowsB[j]
        oth = [] if curve else ['for B: ' + s for s in other_candidates(b, rowsA, None)]
        out.append((None, b, 'read once (B only)', '', None, [], oth))

    def key(t):
        r = t[0] if t[0] is not None else t[1]
        return (r['_x'], -r['_y'])

    out.sort(key=key)
    return out


def main():
    PA, PB = load('A', 'pressures'), load('B', 'pressures')
    DA, DB = load('A', 'drag'), load('B', 'drag')
    GA, GB = load('A', 'geometry'), load('B', 'geometry')

    allA = PA + DA
    allB = PB + DB
    used = Counter()
    results = defaultdict(list)  # figure -> list of output dicts
    summary = []  # (figure, panel, status) counts
    detail = defaultdict(list)  # kind -> list of (pid, text)

    # groups: (figure, group key, rows A, rows B, curve?)
    groups = []
    for fig, pan in (('4', 'a'), ('4', 'b'), ('4', 'c')):
        groups.append((fig, 'panel ' + pan,
                       [r for r in PA if r['panel'] == pan], [r for r in PB if r['panel'] == pan], False))
    for fig, pan in (('5', ''), ('7', 'a'), ('7', 'b'), ('8', ''), ('10', ''), ('16', '')):
        ra = [r for r in DA if r['figure'] == fig and r['panel'] == pan and r['source_kind'] == 'symbol']
        rb = [r for r in DB if r['figure'] == fig and r['panel'] == pan and r['source_kind'] == 'symbol']
        groups.append((fig, ('panel ' + pan) if pan else 'whole figure', ra, rb, False))
    for cl in ('solid line', 'dashed line'):
        ra = [r for r in DA if r['figure'] == '5' and r['source_kind'] == 'curve' and series_class(r) == cl]
        rb = [r for r in DB if r['figure'] == '5' and r['source_kind'] == 'curve' and series_class(r) == cl]
        groups.append(('5', cl, ra, rb, True))

    counter = Counter()
    for fig, gname, ra, rb, curve in groups:
        for a, b, status, match, d, ld, oth in pair_group(fig, ra, rb, curve):
            counter[fig] += 1
            pid = 'F%s-%03d' % (fig, counter[fig])
            r0 = a if a is not None else b
            panel = panel_of(r0)
            if fig == '5' and curve:
                panel = 'curve: ' + gname
            for r in (a, b):
                if r is not None:
                    used[r['_id']] += 1
                    r['_pid'] = pid
            o = row_out(pid, fig, panel, status, match, d, a, b, ld, oth)
            results[fig].append(o)
            summary.append((fig, panel, status, bool(ld)))
            if status == 'disagree':
                detail['disagree'].append((fig, pid, o))
            elif status.startswith('read once'):
                detail['once'].append((fig, pid, o))
            if ld:
                detail['labels'].append((fig, pid, o))

    # every row of both readings must appear exactly once
    for r in allA + allB:
        assert used[r['_id']] == 1, r['_id']
    assert len(used) == len(allA) + len(allB)

    # figure 1 geometry
    norm = lambda s: re.sub(r'\s+', '', s or '')
    gb = {r['model']: r for r in GB}
    ga = {r['model']: r for r in GA}
    geo_rows = []
    for m in sorted(set(ga) | set(gb), key=lambda s: (len(s), s)):
        a, b = ga.get(m), gb.get(m)
        o = {'model': m, 'A_row': a['_id'] if a else '', 'B_row': b['_id'] if b else ''}
        diffs = []
        for k in ('d_over_D', 'cone_half_angle_as_printed', 'D_in', 'L_in', 'role'):
            va, vb = (a or {}).get(k, ''), (b or {}).get(k, '')
            o['A_' + k], o['B_' + k] = va, vb
            na, nb = norm(va), norm(vb)
            if k == 'cone_half_angle_as_printed':
                na = re.sub(r'\(.*\)', '', na)
                nb = re.sub(r'\(.*\)', '', nb)
            if na != nb:
                diffs.append(k)
        if a is None or b is None:
            o['status'] = 'read once (%s only)' % ('A' if a else 'B')
        else:
            o['status'] = 'agree' if not diffs else 'disagree: ' + ', '.join(diffs)
        o['A_note'], o['B_note'] = (a or {}).get('note', ''), (b or {}).get('note', '')
        geo_rows.append(o)
    ghead = ['model', 'status', 'A_row', 'B_row']
    for k in ('d_over_D', 'cone_half_angle_as_printed', 'D_in', 'L_in', 'role'):
        ghead += ['A_' + k, 'B_' + k]
    ghead += ['A_note', 'B_note']
    with open(os.path.join(HERE, 'pairs-fig1.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=ghead)
        w.writeheader()
        w.writerows(geo_rows)

    for fig, rows in results.items():
        with open(os.path.join(HERE, 'pairs-fig%s.csv' % fig), 'w', newline='', encoding='utf-8') as fh:
            w = csv.DictWriter(fh, fieldnames=HEAD)
            w.writeheader()
            w.writerows(rows)

    # flags
    fl_rows = []
    for r in allA + allB:
        if not r['flag']:
            continue
        for f in r['flag'].split(';'):
            fl_rows.append({'reader': r['_reader'], 'row': '%s (line %d)' % (r['_id'], r['_line']),
                            'pair_id': r['_pid'], 'figure': r['figure'], 'panel': panel_of(r),
                            'flag': f, 'all_flags_of_row': r['flag'], 'note_verbatim': r['note']})
    with open(os.path.join(HERE, 'flags.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=['reader', 'row', 'pair_id', 'figure', 'panel', 'flag',
                                           'all_flags_of_row', 'note_verbatim'])
        w.writeheader()
        w.writerows(fl_rows)

    write_report(summary, detail, geo_rows, fl_rows, allA, allB, results)


ORDER = ['1', '4', '5', '7', '8', '10', '16']


def write_report(summary, detail, geo_rows, fl_rows, allA, allB, results):
    byid = {r['_id']: r for r in allA + allB}
    L = []
    p = L.append
    p('PAIRING OF TWO BLIND READINGS OF NACA TR 1386 (generated by pair.py, 2026-10-26)')
    p('')
    p('Readings paired: reader A and reader B, files in ../readings/A and ../readings/B.')
    p('Rows: A %d pressure + %d drag + %d geometry; B %d pressure + %d drag + %d geometry.' % (
        sum(1 for r in allA if 'cp' in r), sum(1 for r in allA if 'cp' not in r),
        sum(1 for g in geo_rows if g['A_row']), sum(1 for r in allB if 'cp' in r),
        sum(1 for r in allB if 'cp' not in r), sum(1 for g in geo_rows if g['B_row'])))
    p('')
    p('RULE. Two values agree when |a - b| <= u_a + u_b (the two stated reading errors')
    p('summed), the rule the pairing request names as the one of the earlier pairings in')
    p('this project (those pairings were not opened here). It is applied to each read')
    p('coordinate on its own; a point pair agrees when every read coordinate agrees. Nothing')
    p('is averaged, smoothed or settled; every pair carries the envelope of both readings,')
    p('[min(a - u_a, b - u_b), max(a + u_a, b + u_b)], per coordinate, in the pairs files.')
    p('Matching: by symbol centre (both readers give it; B times 1.5 onto A\'s 600 dpi scale),')
    p('nearest first, one to one, within %.0f px (one symbol width), first within the same' % GATE_PX)
    p('symbol or series, then across series. Labels are compared after matching. Figure 5')
    p('curve stations are paired when their x readings agree by the rule. See pair.py.')
    p('')
    p('Contents: 1 counts; 2 every disagreement; 3 every read-once item; 4 label')
    p('differences; 5 flags (all flags verbatim in flags.csv); 6 notes on matching, curves')
    p('and differences between the readers that are not values; 7 places where the report')
    p('disagrees with itself; 8 what each reader opened. Sections 1 to 5 are generated,')
    p('6 to 8 are hand-written. Which series are a measured pressure foredrag under (x)')
    p('item (2) is decided in series-classification.txt. Row ids: A-P012 is line 13 of')
    p('readerA_pressures.csv, B-D007 is line 8 of readerB_drag.csv, and so on.')
    p('')
    p('=' * 78)
    p('1. COUNTS PER FIGURE AND PANEL')
    p('=' * 78)
    p('Columns: agree, disagree, read once by A only, read once by B only; then pairs with a')
    p('label difference (counted among agree or disagree, not in addition).')
    p('')
    p('Figure 1 (geometry, exact text): %d models; agree %d, differ %d, read once %d.' % (
        len(geo_rows), sum(1 for g in geo_rows if g['status'] == 'agree'),
        sum(1 for g in geo_rows if g['status'].startswith('disagree')),
        sum(1 for g in geo_rows if g['status'].startswith('read once'))))
    tot = Counter()
    by = defaultdict(Counter)
    for fig, panel, status, hasld in summary:
        k = {'agree': 'agree', 'disagree': 'disagree', 'read once (A only)': 'onceA',
             'read once (B only)': 'onceB'}[status]
        by[(fig, panel)][k] += 1
        by[(fig, panel)]['label'] += hasld
    for fig in ORDER[1:]:
        keys = sorted([k for k in by if k[0] == fig], key=lambda k: k[1])
        ft = Counter()
        for k in keys:
            c = by[k]
            ft.update(c)
        p('')
        p('Figure %-3s total        agree %3d  disagree %3d  once A %3d  once B %3d  | label diff %3d' % (
            fig, ft['agree'], ft['disagree'], ft['onceA'], ft['onceB'], ft['label']))
        for k in keys:
            c = by[k]
            p('  %-24s agree %3d  disagree %3d  once A %3d  once B %3d  | label diff %3d' % (
                k[1], c['agree'], c['disagree'], c['onceA'], c['onceB'], c['label']))
        if fig != '5':
            tot.update(ft)
        else:
            sym = Counter()
            for k in keys:
                if k[1] == 'symbols':
                    sym.update(by[k])
            tot.update(sym)
    p('')
    p('All figures, symbols only (figure 5 curve stations left out): agree %d, disagree %d,' % (
        tot['agree'], tot['disagree']))
    p('read once by A only %d, read once by B only %d, pairs with a label difference %d.' % (
        tot['onceA'], tot['onceB'], tot['label']))
    ds = []
    npass2 = 0
    for fig in ORDER[1:]:
        for o in results.get(fig, []):
            if o['centre_distance_px_600dpi']:
                ds.append((float(o['centre_distance_px_600dpi']), o['pair_id']))
            if o['match'].startswith('pass 2'):
                npass2 += 1
    ds.sort()
    p('Matched symbol pairs: %d; centre distance (600 dpi px) median %.1f, largest %.1f (%s);' % (
        len(ds), ds[len(ds) // 2][0], ds[-1][0], ds[-1][1]))
    p('%d pairs more than 5 px apart; %d pairs matched across series (pass 2).' % (
        sum(1 for d in ds if d[0] > 5), npass2))

    def pair_line(o):
        s = []
        s.append('  %s  figure %s%s; A %s; B %s; status %s' % (
            o['pair_id'], o['figure'], (', ' + o['panel']) if o['panel'] else '', o['A_row'] or '-',
            o['B_row'] or '-', o['status']))
        if o['A_row'] and o['B_row']:
            s.append('    series: A "%s" | B "%s"' % (o['A_series'], o['B_series']))
            s.append('    x (%s): A %s +- %s, B %s +- %s; B - A = %s, summed errors %s, %s; envelope [%s, %s]' % (
                o['x_label'], o['A_x'], o['A_x_unc'], o['B_x'], o['B_x_unc'], o['x_diff_B_minus_A'],
                o['x_tol_sum'], 'agree' if o['x_agree'] == 'yes' else 'DISAGREE', o['x_envelope_lo'],
                o['x_envelope_hi']))
            s.append('    y (%s): A %s +- %s, B %s +- %s; B - A = %s, summed errors %s, %s; envelope [%s, %s]' % (
                o['y_label'], o['A_y'], o['A_y_unc'], o['B_y'], o['B_y_unc'], o['y_diff_B_minus_A'],
                o['y_tol_sum'], 'agree' if o['y_agree'] == 'yes' else 'DISAGREE', o['y_envelope_lo'],
                o['y_envelope_hi']))
            if o['centre_distance_px_600dpi']:
                s.append('    symbol centres %s px apart (600 dpi), %s' % (o['centre_distance_px_600dpi'], o['match']))
        else:
            t = 'A' if o['A_row'] else 'B'
            s.append('    series "%s"; model "%s"; d/D "%s"; Mach "%s"; Re "%s"' % (
                o[t + '_series'], o[t + '_model'], o[t + '_d_over_D'], o[t + '_mach'], o[t + '_reynolds']))
            s.append('    x (%s) %s +- %s; y (%s) %s +- %s' % (
                o['x_label'], o[t + '_x'], o[t + '_x_unc'], o['y_label'], o[t + '_y'], o[t + '_y_unc']))
        if o['other_rows_within_gate']:
            s.append('    other rows within %.0f px: %s' % (GATE_PX, o['other_rows_within_gate']))
            if not (o['A_row'] and o['B_row']):
                for rid in re.findall(r'([AB]-[PD]\d{3}) at', o['other_rows_within_gate']):
                    r = byid[rid]
                    s.append('    the other reader\'s symbol here, %s (paired as %s), flag "%s"; note (verbatim): %s' % (
                        rid, r['_pid'], r['flag'], r['note']))
        if o['label_differences']:
            s.append('    label differences: %s' % o['label_differences'])
        for t in ('A', 'B'):
            if o[t + '_row']:
                s.append('    %s flag "%s"; note (verbatim): %s' % (t, o[t + '_flag'], o[t + '_note']))
        return s

    p('')
    p('=' * 78)
    p('2. EVERY DISAGREEMENT (pairs where a coordinate differs by more than the summed errors)')
    p('=' * 78)
    dis = [x for x in detail['disagree']]
    if not dis:
        p('None.')
    for fig in ORDER:
        for f, pid, o in dis:
            if f == fig:
                L.extend(pair_line(o))
                p('')
    geo_dis = [g for g in geo_rows if g['status'].startswith('disagree')]
    p('Figure 1 geometry: %s' % ('no difference' if not geo_dis else ', '.join(
        '%s (%s)' % (g['model'], g['status']) for g in geo_dis)))

    p('')
    p('=' * 78)
    p('3. EVERY READ-ONCE ITEM')
    p('=' * 78)
    p('3.1 Symbols (a point one reader gives and the other does not)')
    p('')
    for fig in ORDER:
        for f, pid, o in detail['once']:
            if f == fig and not o['panel'].startswith('curve'):
                L.extend(pair_line(o))
                p('')
    p('3.2 Figure 5 curve stations read by one reader only (each reader chose their own')
    p('    stations; these are not missing points). Listed compactly: id, reader, curve, x, y.')
    p('')
    for f, pid, o in detail['once']:
        if o['panel'].startswith('curve'):
            t = 'A' if o['A_row'] else 'B'
            p('  %s  %s only  %s  x %s +- %s  y %s +- %s  (%s)' % (
                pid, t, o['panel'][7:], o[t + '_x'], o[t + '_x_unc'], o[t + '_y'], o[t + '_y_unc'],
                o[t + '_row']))
    p('')

    p('=' * 78)
    p('4. EVERY LABEL DIFFERENCE ON A MATCHED PAIR')
    p('=' * 78)
    p('(Mach is not compared where both readers put the x reading in the Mach column:')
    p('figure 7(b) and the figure 5 curves.)')
    p('')
    for fig in ORDER:
        for f, pid, o in detail['labels']:
            if f == fig:
                p('  %s figure %s %s: %s' % (pid, fig, o['panel'], o['label_differences']))
    p('')
    p('Axis labels as each reader recorded them, per figure and panel:')
    seen = defaultdict(set)
    for r in allA + allB:
        pan = r['panel'] if r['figure'] in ('4', '7') else ''
        xl = r.get('station_label') or r.get('x_label', '')
        yl = 'Pressure coefficient, P (fixed by the CSV format)' if 'cp' in r else r.get('quantity_label', '')
        seen[(r['figure'], pan)].add((r['_reader'], xl, yl))
    for k in sorted(seen, key=lambda k: (ORDER.index(k[0]), k[1])):
        p('  figure %s%s:' % (k[0], ('(' + k[1] + ')') if k[1] else ''))
        for t, xl, yl in sorted(seen[k]):
            p('    %s: x "%s"; y "%s"' % (t, xl, yl))
    p('')

    p('=' * 78)
    p('5. FLAGS OF BOTH READERS')
    p('=' * 78)
    p('Every flag of every row, with the row\'s note verbatim, is in flags.csv. Counts:')
    fc = Counter((r['figure'], r['panel'], r['flag'], r['reader']) for r in fl_rows)
    keys = sorted({(k[0], k[1], k[2]) for k in fc}, key=lambda k: (ORDER.index(k[0]), k[1], k[2]))
    for k in keys:
        p('  figure %-3s %-22s %-9s A %3d  B %3d' % (k[0], k[1], k[2], fc[k + ('A',)], fc[k + ('B',)]))
    p('')
    p('Flags other than OTHER, AXIS, CURVE, NOSOURCE and OVERLAP, row by row (verbatim notes):')
    for r in fl_rows:
        if r['flag'] in ('DISAGREE', 'SERIES', 'FAINT', 'OFFSCALE'):
            p('  %s %s figure %s %s [%s]: %s' % (r['reader'], r['row'], r['figure'], r['panel'],
                                               r['all_flags_of_row'], r['note_verbatim']))
    p('')
    L.append(NOTES.strip('\n'))
    with open(os.path.join(HERE, 'pairing.txt'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(L).rstrip() + '\n')


# Hand-written by the pairing party after reading both readings in full. Pair ids refer to
# the pairs files written above. Quotations are copied verbatim from the readers' files.
NOTES = r'''
==============================================================================
6. NOTES BY THE PAIRING PARTY (hand-written)
==============================================================================
6.1 Matching

Every matched pair has the same symbol and series in both readings (no pair needed
the cross-series pass). One match is a close call: in figure 16 at M=1.96, B gives
one model 3 diamond (B-D121) where A gives two ("doubled point", A-D124 and A-D125).
B-D121 is 8.7 px from A-D125 and 9.8 px from A-D124, so it is paired with A-D125
(F16-015) and A-D124 is read once (F16-014). B-D121 agrees by the rule with A-D124
too (M 1.966 +- 0.018 against 1.968 +- 0.026; C_DF 0.0975 +- 0.0018 against
0.0968 +- 0.0026), so the call changes no count of agreement. B also flags this
symbol SERIES: "it could also be model 14 (half-filled diamond)".

Doubled symbols (two copies a few pixels apart):
- both readers give two rows: figure 7(a) d/D .15 at M 1.24 (F7-003, F7-004),
  d/D .50 at M 1.96 (F7-010, F7-011), d/D .15 at M 3.06 (F7-018, F7-019); figure 8
  M=3.06 d/D .075 (F8-001, F8-002). Both readers also give two touching circles at
  figure 8 M=1.44 d/D .30 (F8-015, F8-017) and d/D .50 (F8-024, F8-026).
- A only: figure 7(b) at F7-045, F7-049 and F7-072, and figure 16 at F16-014. B's
  note on its single symbol at each place is quoted in section 3.1.
- B only: figure 8 M=1.44 d/D .15 (F8-007, B's "possible second circle"). A's notes,
  section 9 (verbatim): "a possible second circle at d/D .15 was checked on a
  darkness profile and rejected (the extra strokes are the estimate curves)." A's
  working log (A/work/progress.txt, not committed) has two entries on it, verbatim:
  "M1.44 flags: flagged = lower circle at .3 and .5, single flagged at .075, flagged
  visible + hidden unflagged at .15." and, later, "fig8: dropped 144_15h (single
  circle confirmed by profile)".

Points both readers looked for and did not find (agreed absences): figure 4(c) M=3.80
has no symbol at the second station (14 against 15); figure 16 model 2 at M=1.44.

6.2 Figure 5 curves

Both readers read both lines from about M 1.04 to 7.9 (A 1.04 to 7.89, B 1.048 to
7.956), both put the dashed line above the solid one at low M and below it at high
M, and both give the same value to both lines where they run together (A: "From
about M=2.1 to 5.25"; B: "from about M=2.2 to 5"). Curve stations pair only where
the two x readings agree by the rule (summed x errors 0.026): 47 station pairs, all
at M 3.9 or below. Above M 3.9 A read at 4.25, 4.75, 5.25 ... and B at steps of
about 0.1, and no two stations come within 0.026, so every station there is listed
as read once. No station was compared against a value interpolated between another
reader's stations, because that would combine that reader's values.
The two curve disagreements (F5-010, F5-012) are on the solid line at M about 1.1
and 1.2, where the two x readings differ by 0.016 and 0.010 (inside the summed x
errors) and A's own stations at M 1.10 and 1.15 differ by 0.047 in C_DW. Both lines
are estimates, not measurements of this report.

6.3 Differences between the readers that are not reading values (recorded, not resolved)

(a) Figure 8, M=1.44, Reynolds number of each circle. A gives no Reynolds number on
    all six rows and flags SERIES: "panel prints M=1.44 Re=1.17x10^6 & 3.14x10^6;
    the report does not say which symbols belong to which Reynolds number"; A's notes
    9: "The d/D .075 circle carries a short diagonal tick whose meaning is not
    given." B quotes the key: "key: 'Flagged symbols denote Re=1.17x10^6'" and gives
    1170000 to the ticked circles (F8-005, F8-009, F8-024), 3140000 to the unticked
    upper d/D .50 circle (F8-026), and no value to both d/D .30 circles and its
    possible hidden d/D .15 circle. The pairing party looked at the key (PDF p. 14,
    100 dpi): a line reading "Flagged symbols denote Re=1.17x10^6" is printed under
    the key, so A's statement that the report does not say is not borne out by the
    print. Which circle carries a flag was not looked at and is not settled here; the
    Reynolds labels stay as each reader gave them. A's working log (not committed)
    reads, verbatim, "Fig 8 M=1.44: flagged symbols = Re 1.17e6." and "Fig 8 M1.44:
    vertical strokes through .15/.3/.5 symbols are grid lines; .075 has clear 45deg
    flag tick."
(b) Figure 10 key. A's working quotations (A/work/quotes.txt, not committed):
    "p15 fig 10 key: "Experiment / o Foredrag / Estimate / ___ Wave drag / ----
    Foredrag (estimated wave drag + Blasius' laminar skin friction)"". B, notes
    section 4: "the figure has no key, the circles are the experiment and the two
    lines are the estimates"; B's row notes: "figure 10 has no key: the circles are
    the experiment and the two curves are the estimates (text p. 15)". The pairing
    party looked (PDF p. 15, 100 dpi): a key with those entries is printed above the
    upper panel. Both readers call the circles the experimental foredrag.
(c) Figure 16 y-axis label. A: "Foredrag coefficient, C_DF (a small mark by the C
    may be a prime)"; B: "Foredrag coefficient, C_DF". Not looked at (a faint mark;
    looking would be a third reading of it). The p. 6 symbol list, as A quotes it,
    defines "C'_DF foredrag coefficient based on volume to the 2/3 power, (total
    drag-base drag)/qV^(2/3)".
(d) Figure 16 symbol words. Same models at the same places, but A describes models 7
    and 8 as "D-shaped symbol" and model 9 as "small circle", while B's method lists
    the key symbols as "open circle, square, diamond, right-pointing triangle, right
    triangle, quarter-rounded square, D, octagon for models 1 to 9" (eight symbols for
    the eight force models 1 to 5 and 7 to 9).
(e) Figure 10 caption angle. A lists it among the report's disagreements (section
    7.3 below); B: "These agree if the caption gives the full angle; not flagged."
(f) Figure 7(b) air-off Mach numbers below 1.2. A flags DISAGREE on F7-024, F7-025
    and F7-026; B reads the same circles at M 1.056, 1.125 and 1.150 and does not
    flag them (section 7.5 below).
(g) Figure 8 M=1.96 wave drag squares. B flags DISAGREE (figure 4 prints M=1.97);
    A: "(0.01 difference, noted only)" and no flag (section 7.2 below).
(h) Figure 5 symbols, Mach column. A gives the Mach read on figure 5's axis ("x here
    is the Mach read from the figure 5 axis"); B gives "the figure 4 test Mach number
    for model 4p nearest the read x" (and the same for 6p). The x readings agree in
    all six pairs; the Mach labels differ in five (section 4).
(i) Flags that differ row by row (all in flags.csv): figure 4(c) OVERLAP (A 4 rows,
    B none); figure 5 NOSOURCE on curves (B only) and OVERLAP; figure 7(b) OVERLAP
    (A 22, B 26); figure 8 SERIES (A 6, B 3) and OVERLAP; figure 16 OVERLAP (A 6,
    B 7) and SERIES (B 1).
(j) Figure 1 geometry: the same values in every field; wording differs (A "8° 52'",
    B "8°52'"; A adds "(sketch, series value)" to the angle of models 7 to 9). B
    marks the force role of models 2 to 5 and 7 to 9 as inferred. The figure 1 note
    is quoted with a comma by B ("Models 1f through 5f, are free-flight models") and
    in A's working quotations, and without it in A's geometry notes.

6.4 What the pairing party looked at in the report

Two crops of the scan at 100 dpi, only to check the printed keys in 6.3(a) and
6.3(b): PDF p. 14 (figure 8, right column top) and PDF p. 15 (figure 10). No symbol,
curve or value was read, and no value was averaged, smoothed or settled.

==============================================================================
7. PLACES WHERE THE REPORT DISAGREES WITH ITSELF, AS THE READERS FLAGGED OR NOTED THEM
==============================================================================
(Step 2. Recorded with both readers' words; not resolved.)

7.1 Figure 4(c) Mach 3.80 against the text's 3.7. Both readers flag DISAGREE on all
    14 M=3.80 rows (F4 panel c).
    A: "Fig 4(c) prints M=3.80 (p10 text also says "Mach numbers between 1.5 and
    3.8"), but p8 says the pressure tests were at "Mach numbers of 1.5, 2, 3, and
    3.7"."
    B: "the panel prints M=3.80 (and M=3.04, M=1.97); text p. 8 says the pressure
    tests were made "at Mach numbers of 1.5, 2, 3, and 3.7"; text p. 10 says
    "between 1.5 and 3.8". Both recorded; not resolved."

7.2 Figure 8 wave drag squares against figure 4's Mach numbers.
    A: "Fig 8 plots a model 4p (d/D 0.30) wave drag square in the M=3.06 panel, while
    fig 4(a) gives M=3.10 for model 4p. Flag DISAGREE on that row. The M=1.96 panel
    squares come from tests figure 4 labels M=1.97 (0.01 difference, noted only)."
    B: "figure 4(a) and 4(b) print M=1.97 and M=3.10 (4p) and 3.06 (5p) for the
    pressure models; the figure 8 wave drag squares sit in panels printed M=1.96 and
    M=3.06. Text p. 15 says "at Mach numbers of 3.06 and 1.96". Recorded as printed
    in each place."
    Flags: F8-014 (4p square, M=3.06) DISAGREE by both; F8-013 and F8-021 (M=1.96)
    DISAGREE by B only.

7.3 Figure 10 caption, 18 deg 56 min, against figure 1(b), half-angle 9 deg 28 min.
    A: "Fig 10 caption: "constant cone angle=18 deg 56'"; figure 1(b) sketch prints
    omega=9 deg 28' and p6 defines omega as "cone half angle, deg". 18 deg 56' is
    twice 9 deg 28', so the caption likely gives the full angle; recorded in the
    geometry notes, not resolved."
    B: "Figure 10 caption p. 15 gives "constant cone angle=18°56'"; figure 1(b)
    prints omega=9°28' (cone half angle, p. 6 symbol list "omega cone half angle,
    deg"). These agree if the caption gives the full angle; not flagged."

7.4 Figure 8, M 1.44, Reynolds key. The panel prints two Reynolds numbers; both
    readers quote "Re=1.17x10^6 & 3.14x10^6". The p. 8 table, as both readers copy
    it, lists two Reynolds numbers for M 1.44 (1.17 and 3.14, x10^6, tunnel No. 1).
    A, notes 8(e): "prints two Reynolds numbers (1.17x10^6 & 3.14x10^6) with no key
    to which symbol is which; reynolds left blank and flagged SERIES on those 6 rows.
    Observation only: fig 7(a) shows the M=1.44 column tied to Re=3.14x10^6 alone."
    B quotes the key "Flagged symbols denote Re=1.17x10^6" and assigns by the tick
    where it can (see 6.3(a)). Recorded: figure 8 is "The data from figure 7(a) ...
    replotted" (p. 13, both readers), yet figure 7(a) ties its M=1.44 column to
    Re=3.14x10^6 alone (both readers give 3140000 on every 7(a) row at M 1.44), while
    figure 8's M=1.44 panel prints both Reynolds numbers and has up to two circles
    per bluntness.

7.5 Figure 7(b) air-off Mach numbers below the text's range. A flags DISAGREE on
    three rows: "Fig 7(b): three air-off circles read at Mach about 1.06, 1.13 and
    1.15 (x axis), below the "1.2 to 4.2" range in p8. Flag DISAGREE. (Two more
    circles read at 1.195 and 1.198 are within my reading error of 1.2 and are not
    flagged.)" B reads the same three circles at 1.056, 1.125 and 1.150, quotes the
    same p. 8 sentence ("With no air flow through the wind tunnel, Mach numbers
    varied from 1.2 to 4.2"), and does not flag them.

7.6 Figure 16 key prints the d/D of models 3, 4, 8 and 9 as "150" and "300" without
    a decimal point. A, notes 8(f): "Fig 16 key prints d/D for models 3, 4, 8, 9 as
    "150" and "300" (no decimal point)." B, series text: "150 (decimal point not
    visible)", "300 (decimal point not visible)", and for model 8 "150 (decimal point
    not clear)". Both readers read the figure 1 values .150 and .300 for these models.

7.7 Figure 16 y-axis label, possible prime (A only; see 6.3(c)). A, notes 8(g):
    "Fig 16 y-axis label reads "Foredrag coefficient, C_DF" with a small mark next to
    the C that may be a prime (p6 defines C'_DF as the volume-based coefficient). I
    could not decide; recorded in quantity_label."

Not disagreements, but both readers record them because readings rest on them:
- Figure 4(a) prints no x-axis label and no x tick numbers; both readers took the
  0 to 1.0 grid of figure 4(b) and flag AXIS on all 48 rows.
- Figure 4 prints no Reynolds number; both use p. 8, "about 4x10^6".
- Figure 1(b)'s table prints model 8's d/D ".150" with a stray mark (A: "printed
  with a stray mark"; B: "with the point set low, like a comma").

==============================================================================
8. WHAT EACH READER OPENED (step 4)
==============================================================================
A, method.md (verbatim): "Only two inputs were opened: `tr1386/reader-brief.txt` and
`tr1386/NACA-TR-1386.pdf`. Nothing else in `tr1386/` (no crops, no thumbnails, never
`tr1386/B/`) and nothing from the bowshock repository or any branch. No web search."
B, method.md (verbatim): "Reader B worked only from the brief and the PDF." B, notes
section 1 (verbatim): "No commercial or web digitiser was used and nothing outside
the PDF was consulted."

Neither reader's method notes report opening anything outside the brief, and the
readers' scripts open only files in their own folders. Points within the brief that
are worth knowing:
- Both used the PDF's own text layer to find pages; A also took a few p. 6 symbol
  definitions from it: "(one exception, flagged in the notes: a few right-column
  symbol definitions on p6, which I later checked on the image)".
- Both read figure 5's two estimate curves because Part B asks for every plotted
  series of figure 5, although the brief's general rule says not to transcribe
  estimate curves; both mark them estimate and CURVE and say so.
- Cross-checks between figures of the report: B, method.md: "The model 7, 8, 9
  readings agree with figure 10 within about 0.002, which supports the
  identification against the similar open symbols of models 10 and 11." A's working
  log: "upper circles at .3/.5 match fig 7(a) Re 3.14e6 values (note only)". These
  stay inside the report, but those labels are not independent of the other figure.

The pairing party's own access, for the record: the reader brief, the PDF (SHA-256
checked), all of A/ and B/ (including the readers' working logs and A's working
quotations; no render or crop of theirs was viewed), and lines 1823 to 2010 of
docs/design/0014-refusals.md on origin/claude/wip/w6-build. Creating the working
branch printed the one-line titles of the branch's three newest commits (about W6
fits at Mach 1.3; no TR 1386 model or value in them); nothing else on the branch was
opened. In the session's scratch space the pairing party first put its own working
files in a folder that turned out to hold two files of another task; it moved its
own files out and did not open the other two.
'''


if __name__ == '__main__':
    main()
