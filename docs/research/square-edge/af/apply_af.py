"""(af) applied, as written with its addendum of 2026-10-27 (design record 0014 section 10.7).

Run from the repository root:

    python3 -I docs/research/square-edge/af/apply_af.py

It reads only the neutral pairing (docs/research/square-edge/readers/pairing-2026-10-27/*_pairs.csv,
which carry both readers' primaries) and writes out/verdict.txt, out/face_margins.csv and
out/not_face.csv beside this file. Nothing here settles a reading: every rule below takes the lower or
the higher of the two primaries, as (af) says.

The rules, fixed in this header before the script was first run (the coordinator's notes of
2026-10-27 on the pairing are quoted where they decide a point):

1. Conversion to p / p02 ((af), "The criteria"):
   - TN 4300 (p_l/p_o, o the stagnation point, "the total pressure behind the shock") and TN D-5392
     (p_l/p_t,2, p_t,2 the stagnation pressure behind a normal shock at the free-stream Mach number):
     the value is already over p02, whether the report measured it or computed it, so p / p02 is the
     value as read.
   - TM X-19 (p_l/p_t,2, p_t,2 measured at the face centre): the report normalises by its own
     measured stagnation-point pressure, which (af) allows ("or the report's own measured
     stagnation-point pressure where it normalises by that"); p / p02 is the value as read.
   - RM L57C18 (C_p = (p_l - p_inf)/q_inf): p / p02 = (1 + (gamma/2) M^2 C_p) / (p02/p_inf), p02/p_inf
     from Rayleigh's formula at the stated Mach number, 2 (gamma 1.4).
2. Which points are face points: a pair is a face point only if every reader who gives it a location
   gives "face". Any point either reader calls corner, afterbody or unclear is not a face point; each
   is listed in out/not_face.csv ((af): "face" means the orifices on the flat face, not on a corner
   radius, shoulder or afterbody; the coordinator: treat any point either reader calls corner or
   unclear as not a face point).
3. The two readings are the two primaries (value_A, value_B), never an alternative. (af) addendum (a):
   no face orifice is excluded. A face point read once (one reader only, or one reader illegible) has
   one reading, and it is used as both its lower and its higher reading. A point neither reader gives
   a value is listed as not evaluable.
4. a, the report's stated pressure accuracy as a fraction of p02, or 0.01 where it states none:
   - TN 4300, RM L57C18, TM X-19: no pressure accuracy stated as a number (both readers): a = 0.01.
   - TN D-5392 states 1 percent of full scale, 1.44 psf for the 1-psi gage (orifices marked *, read as
     a difference from the stagnation-point pressure) and 14.4 psf for the 10-psi gage, and 0.5 psf
     for the mercury manometers (the stagnation-point pressure). Taken whole, against the claim: a
     starred orifice's error is 1.44 + 0.5 psf, an unstarred one's 14.4 + 0.5 psf. p02 in psf is not
     printed in what either reader records; it is computed from the paired test conditions alone: the
     Reynolds number 1.88e6 on the 7.5 in. diameter, the stagnation temperature (610 deg R at Mach 2.49,
     635 at 4.06 and 4.63) and the Mach number, with Sutherland's law for the viscosity, gamma 1.4 and
     R 1716.5 ft lbf / (slug deg R). a is the error over that p02.
5. Criteria ((af) with its addendum):
   - (i) P1, on the sets that test it (normalisation.txt, written before any value was compared: RM
     L57C18 only; TM X-19 does not; TN 4300 and TN D-5392 not established, so they do not): every face
     reading, the higher of the two, at most 1 + a.
   - (ii) P2, every set: every face reading, the lower of the two, at least 0.5283 + a.
   - (iii) information only (addendum (c)): the mean of the face distribution over the radius,
     trapezoids through the lower readings (several readings at one radius: the least), the innermost
     held to the centre, with zero in place of the readings over the outer fifth of the radius; it
     passes or fails nothing. Positions: the position the lower reading's reader gives; TN 4300 fig.
     16(b) gives stations, not radii, and is left out of (iii); TM X-19's x/r is taken unsigned; TN
     D-5392's r/R is 2 s/d; RM L57C18's s (in. along the surface) over a face radius, which neither
     reader prints: A's derived radii and B's scaled ones are both used, model F (no radius from A) with
     B's only.
   - Each at every set, model and Mach number read. Pass if (i) and (ii) hold everywhere; fail
     otherwise.
6. Reynolds numbers on the face height (addendum (d), the coordinator's note): where both readers give
   one on the diameter, it is used (TM X-19 0.90e6 on 4.00 in.; TN D-5392 1.88e6 on 7.5 in.). Elsewhere
   it is computed only from a per-foot value both readers give for the pressure tests times a
   diameter both readers give (geometry_pairs.csv "agree"), the smaller of their two diameters; where
   either is missing, the set does not widen the range.

Added after the first run (b0590ba), and kept apart from the rules above:

6b. The coordinator pinned the Reynolds number's definition after b0590ba (0014 section 10.7, under
   (af)'s addendum): free-stream conditions, on the face height (a fin's thickness, a cylinder's
   diameter), the component normal to a swept edge, each report's basis converted to it. Ruling of
   2026-10-27: criteria (i) to (iii) and the PASS stand; the range is recomputed under the definition,
   a set counting only where the readers' paired records show its Reynolds number is, or converts
   exactly to, that basis. Rule 6's range is printed beside it, as b0590ba computed it.
   - TM X-19 ("based on model diameter") and TN D-5392 ("based on afterbody diameter"): neither reader
     records the conditions it is on, so neither counts.
   - RM L57C18: both readers record a free-stream value per foot, about 14e6; times the flat face's
     diameter, which neither prints (models C and D paired "agree": A derives 3.252 and 3.717 in., B
     scales about 3.3 and 3.7 in.). The range is taken as surely measured: from the larger of model
     C's two to the smaller of model D's two. Models B (diameters differ) and F (no diameter from A)
     do not count.
   - TN 4300: no per-foot value both readers give for the pressure tests: it does not count.
"""

import csv
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAIRING = os.path.join(HERE, '..', 'readers', 'pairing-2026-10-27')
OUT = os.path.join(HERE, 'out')
G = 1.4
P_STAR = (2 / (G + 1)) ** (G / (G - 1))  # 0.52828
P_STAR_REGISTERED = 0.5283


def rayleigh_p02_over_p(m):
    p2 = 1 + 2 * G / (G + 1) * (m * m - 1)
    m2s = (1 + 0.5 * (G - 1) * m * m) / (G * m * m - 0.5 * (G - 1))
    return p2 * (1 + 0.5 * (G - 1) * m2s) ** (G / (G - 1))


def num(s):
    s = (s or '').strip()
    if s == '':
        return None
    return float(s)


# ---- 4. TN D-5392's p02 from the paired conditions ----
R_AIR = 1716.5  # ft lbf / (slug deg R)


def sutherland_slug(t_rankine):
    # mu = 1.716e-5 (T/273.15)^1.5 (273.15 + 110.4)/(T + 110.4) Pa s; to slug/(ft s) by / 47.880
    t = t_rankine / 1.8
    return 1.716e-5 * (t / 273.15) ** 1.5 * (273.15 + 110.4) / (t + 110.4) / 47.880


def p02_psf(mach, t0_rankine, re_d, d_ft):
    t = t0_rankine / (1 + 0.5 * (G - 1) * mach * mach)
    v = mach * math.sqrt(G * R_AIR * t)
    rho = re_d * sutherland_slug(t) / (v * d_ft)
    p = rho * R_AIR * t
    return p * rayleigh_p02_over_p(mach)


TND = {2.49: 610.0, 4.06: 635.0, 4.63: 635.0}
TND_P02 = {m: p02_psf(m, t0, 1.88e6, 7.5 / 12) for m, t0 in TND.items()}


def a_for(source, mach, orifice_label):
    if source != 'TN D-5392':
        return 0.01, 'not stated as a number: 0.01'
    starred = orifice_label.endswith('*')
    err = (1.44 if starred else 14.4) + 0.5
    p02 = TND_P02[mach]
    gage = '1-psi gage' if starred else '10-psi gage'
    return err / p02, f'{gage} {err - 0.5:.2f} psf + manometer 0.5 psf over p02 {p02:.0f} psf'


def to_p02(source, mach, value):
    if source == 'RM L57C18':
        return (1 + 0.5 * G * mach * mach * value) / rayleigh_p02_over_p(mach)
    return value


TESTS_P1 = {'RM L57C18': True, 'TM X-19': False, 'TN 4300': False, 'TN D-5392': False}

FIGURES = [
    ('TN 4300', 'tn4300_fig7'),
    ('TN 4300', 'tn4300_fig16'),
    ('RM L57C18', 'rml57c18_fig5'),
    ('TM X-19', 'tmx19_fig5'),
]
TABLES = [
    ('TN D-5392', 'tnd5392_table1', 2.49),
    ('TN D-5392', 'tnd5392_table2', 4.06),
    ('TN D-5392', 'tnd5392_table3', 4.63),
]

# The Mach number of each series of TN 4300 fig. 7, as both readers give it.
TN4300_FIG7_MACH = {'4-in. model D': 2.00, '4-in. Unitary tunnel': 2.49, '3-in. ref. 3': 2.01}


def fig_mach(source, row, series):
    if source == 'TN 4300' and row['pair'].startswith('tn4300_fig7'):
        for k, m in TN4300_FIG7_MACH.items():
            if series.startswith(k):
                return m
        return None  # series unclear
    if source == 'TN 4300':
        return 2.0
    if source == 'RM L57C18':
        return 2.0
    return 2.49  # TM X-19 fig. 5


def series_key(source, row, series):
    if source == 'RM L57C18':
        return series.split(',')[0]  # 'model B'
    if source == 'TM X-19':
        return '4-in. cylinder'
    if row['pair'].startswith('tn4300_fig16'):
        item = (row.get('item_A') or row.get('item_B') or '')
        return f'12-in. model A, {item}'
    for k in TN4300_FIG7_MACH:
        if series.startswith(k):
            return k
    return 'series unclear'


faces = []
not_face = []
not_evaluable = []

for source, name in FIGURES:
    for r in csv.DictReader(open(os.path.join(PAIRING, name + '_pairs.csv'))):
        locs = {x for x in (r['location_A'], r['location_B']) if x}
        readings = [(who, num(r['value_' + who]), num(r['position_' + who]), r['series_' + who])
                    for who in ('A', 'B') if num(r['value_' + who]) is not None]
        if locs != {'face'}:
            not_face.append({'pair': r['pair'], 'source': source, 'location_A': r['location_A'],
                             'location_B': r['location_B'], 'value_A': r['value_A'],
                             'value_B': r['value_B'], 'position_A': r['position_A'],
                             'position_B': r['position_B'], 'series': r['series_A'] or r['series_B']})
            continue
        if not readings:
            not_evaluable.append((r['pair'], source, r['status'], r['series_A'] or r['series_B'],
                                  r['position_A'] or r['position_B']))
            continue
        series = sorted({s for _, _, _, s in readings if s})
        # Each reader's series with its own Mach number; a series of no stated Mach (unclear) takes
        # every Mach number of the figure.
        pairs = set()
        for s in series:
            m = fig_mach(source, r, s)
            for mm in ([m] if m is not None else sorted(TN4300_FIG7_MACH.values())):
                pairs.add((series_key(source, r, s), mm))
        pairs = sorted(pairs)
        machs = sorted({mm for _, mm in pairs})
        keys = sorted({k for k, _ in pairs})
        low = min(readings, key=lambda x: x[1])
        high = max(readings, key=lambda x: x[1])
        item = r.get('item_A') or r.get('item_B') or ''
        faces.append({
            'pair': r['pair'], 'source': source, 'item': item, 'groups': keys, 'group_machs': pairs,
            'machs': machs, 'status': r['status'],
            'readings': len(readings), 'value_A': r['value_A'], 'value_B': r['value_B'],
            'lower_raw': low[1], 'higher_raw': high[1], 'lower_by': low[0],
            'position': low[2], 'orifice': '', 'quantity': 'C_p' if source == 'RM L57C18' else 'p/p02',
        })

for source, name, mach in TABLES:
    for r in csv.DictReader(open(os.path.join(PAIRING, name + '_pairs.csv'))):
        locs = {x for x in (r['location_A'], r['location_B']) if x}
        if locs != {'face'}:
            not_face.append({'pair': r['pair'], 'source': source, 'location_A': r['location_A'],
                             'location_B': r['location_B'], 'value_A': r['value_A'],
                             'value_B': r['value_B'], 'position_A': r['s_d_A'],
                             'position_B': r['s_d_B'], 'series': f"orifice {r['orifice_label_A']}"})
            continue
        vals = [(who, num(r['value_' + who])) for who in ('A', 'B') if num(r['value_' + who]) is not None]
        if not vals:
            not_evaluable.append((r['pair'], source, r['status'], r['orifice_label_A'], r['s_d_A']))
            continue
        low = min(vals, key=lambda x: x[1])
        high = max(vals, key=lambda x: x[1])
        sd = num(r['s_d_A']) if num(r['s_d_A']) is not None else num(r['s_d_B'])
        faces.append({
            'pair': r['pair'], 'source': source, 'item': {'tnd5392_table1': 'table I', 'tnd5392_table2': 'table II', 'tnd5392_table3': 'table III'}[name],
            'groups': [f"model 1, phi {r['phi_A']}"], 'machs': [mach],
            'group_machs': [(f"model 1, phi {r['phi_A']}", mach)], 'status': r['status'],
            'readings': len(vals), 'value_A': r['value_A'], 'value_B': r['value_B'],
            'lower_raw': low[1], 'higher_raw': high[1], 'lower_by': low[0],
            'position': 2 * sd, 'orifice': r['orifice_label_A'] or r['orifice_label_B'],
            'quantity': 'p/p02',
        })

# ---- criteria (i) and (ii) at every face point ----
for f in faces:
    a, a_how = a_for(f['source'], f['machs'][0], f['orifice'])
    f['a'], f['a_how'] = a, a_how
    # RM L57C18 converts through the Mach number; every other set is Mach-free.
    f['lower'] = to_p02(f['source'], 2.0, f['lower_raw'])
    f['higher'] = to_p02(f['source'], 2.0, f['higher_raw'])
    f['p2_threshold'] = P_STAR_REGISTERED + a
    f['p2_margin'] = f['lower'] - f['p2_threshold']
    f['p2_pass'] = f['p2_margin'] >= 0
    if TESTS_P1[f['source']]:
        f['p1_threshold'] = 1 + a
        f['p1_margin'] = f['p1_threshold'] - f['higher']
        f['p1_pass'] = f['p1_margin'] >= 0
    else:
        f['p1_threshold'] = f['p1_margin'] = None
        f['p1_pass'] = None

os.makedirs(OUT, exist_ok=True)
cols = ['pair', 'source', 'item', 'group', 'mach', 'orifice', 'position', 'status', 'readings',
        'value_A', 'value_B', 'quantity', 'lower_p_over_p02', 'higher_p_over_p02', 'a', 'a_how',
        'ii_threshold', 'ii_margin', 'ii', 'i_threshold', 'i_margin', 'i']
with open(os.path.join(OUT, 'face_margins.csv'), 'w', newline='') as fh:
    w = csv.writer(fh)
    w.writerow(cols)
    for f in faces:
        w.writerow([f['pair'], f['source'], f['item'], '; '.join(f['groups']),
                    '; '.join(f'{m:.2f}' for m in f['machs']), f['orifice'],
                    '' if f['position'] is None else f"{f['position']:.4f}", f['status'], f['readings'],
                    f['value_A'], f['value_B'], f['quantity'], f"{f['lower']:.4f}", f"{f['higher']:.4f}",
                    f"{f['a']:.4f}", f['a_how'], f"{f['p2_threshold']:.4f}", f"{f['p2_margin']:+.4f}",
                    'pass' if f['p2_pass'] else 'FAIL',
                    '' if f['p1_threshold'] is None else f"{f['p1_threshold']:.4f}",
                    '' if f['p1_margin'] is None else f"{f['p1_margin']:+.4f}",
                    'not tested by this set' if f['p1_pass'] is None else ('pass' if f['p1_pass'] else 'FAIL')])

with open(os.path.join(OUT, 'not_face.csv'), 'w', newline='') as fh:
    w = csv.writer(fh)
    w.writerow(['pair', 'source', 'series_or_orifice', 'location_A', 'location_B', 'position_A',
                'position_B', 'value_A', 'value_B', 'why not a face point'])
    for x in not_face:
        why = ('either reader calls it corner or unclear'
               if {'corner', 'unclear'} & {x['location_A'], x['location_B']} else 'afterbody (both)')
        w.writerow([x['pair'], x['source'], x['series'], x['location_A'], x['location_B'],
                    x['position_A'], x['position_B'], x['value_A'], x['value_B'], why])

# ---- (iii), information only ----
RML_RADII = {  # face radius, in.: A derived (diameter / 2), B scaled (diameter / 2)
    'model B': (2.323 / 2, 2.7 / 2), 'model C': (3.252 / 2, 3.3 / 2),
    'model D': (3.717 / 2, 3.7 / 2), 'model F': (None, 2.6 / 2),
}


def mean_over_radius(points):
    """points: [(r/R, p/p02)], the least reading at each radius; zero beyond 0.8."""
    by_r = {}
    for r, p in points:
        k = round(r, 3)
        by_r[k] = min(p, by_r.get(k, p))
    pts = sorted(by_r.items())
    if not pts:
        return None
    if pts[0][0] > 0:
        pts.insert(0, (0.0, pts[0][1]))
    if pts[-1][0] < 1:
        pts.append((1.0, pts[-1][1]))  # the outermost held to the corner
    total = 0.0
    for (r0, p0), (r1, p1) in zip(pts, pts[1:]):
        lo, hi = max(r0, 0.0), min(r1, 0.8)
        if hi <= lo:
            continue
        pa = p0 + (p1 - p0) * (lo - r0) / (r1 - r0)
        pb = p0 + (p1 - p0) * (hi - r0) / (r1 - r0)
        total += 0.5 * (pa + pb) * (hi - lo)
    return total


iii = []
groups = {}
for f in faces:
    if f['position'] is None or f['item'] == 'fig. 16(b)':
        continue
    for g, m in f['group_machs']:
        groups.setdefault((f['source'], f['item'] if f['source'] == 'TN 4300' else '', g, m), []).append(f)
for (source, item, g, m), fs in sorted(groups.items()):
    if source == 'RM L57C18':
        for who, idx in (('A', 0), ('B', 1)):
            rad = RML_RADII[g][idx]
            if rad is None:
                iii.append((source, item, g, m, f"face radius from {who}", None, 'no radius'))
                continue
            v = mean_over_radius([(f['position'] / rad, f['lower']) for f in fs])
            iii.append((source, item, g, m, f"face radius from {who}, {rad:.3f} in.", v, len(fs)))
    else:
        v = mean_over_radius([(abs(f['position']), f['lower']) for f in fs])
        iii.append((source, item, g, m, '', v, len(fs)))
# TN D-5392 pooled over the meridians as well
for m in (2.49, 4.06, 4.63):
    fs = [f for f in faces if f['source'] == 'TN D-5392' and f['machs'][0] == m]
    iii.append(('TN D-5392', '', 'model 1, all meridians pooled', m, '',
                mean_over_radius([(f['position'], f['lower']) for f in fs]), len(fs)))

# ---- 6. Reynolds numbers on the face height ----
reynolds = [
    ('TM X-19', '4.00-in. cylinder', 0.90e6, 'given on the diameter by both readers'),
    ('TN D-5392', '7.5-in. cylinder', 1.88e6, 'given on the (afterbody) diameter by both; the face spans it'),
    ('RM L57C18', 'model C', 14e6 * 3.252 / 12,
     '14e6 per ft (free stream, both) x 3.252 in. (A derived 3.252, B scaled about 3.3: paired "agree"; the smaller)'),
    ('RM L57C18', 'model D', 14e6 * 3.700 / 12,
     '14e6 per ft (free stream, both) x 3.700 in. (A derived 3.717, B scaled about 3.7: paired "agree"; the smaller)'),
]
no_reynolds = [
    ('RM L57C18', 'model B', 'face diameters differ (A 2.323 derived, B about 2.7 scaled)'),
    ('RM L57C18', 'model F', 'A gives no face diameter'),
    ('TN 4300', 'models D and A, and fig. 7\'s comparison series',
     'the 14e6 per ft both quote is stated for the heat-transfer data; A records none for the pressure '
     'data, B writes it against the fig. 7 points: no per-foot value both give for the pressure tests '
     '(fig. 7\'s 4-in. Unitary series, 2.7e6 per ft, likewise stated for the heat-transfer test; the '
     '3-in. ref. 3 series has none)'),
]

# ---- the verdict ----
def worst(fs, key):
    return min(fs, key=lambda f: f[key]) if fs else None


lines = []
say = lines.append
say('(af) APPLIED, WITH ITS ADDENDUM OF 2026-10-27 (0014 section 10.7)')
say('docs/research/square-edge/af/apply_af.py, on the pairing of 2026-10-27 (eaee32b)')
say('')
say(f'p*/p02 as registered: {P_STAR_REGISTERED} (exact {P_STAR:.5f})')
say('Sets that test P1 (normalisation.txt, before any comparison): RM L57C18. Not: TM X-19 (its own')
say('measured face-centre pressure); TN 4300 and TN D-5392 (not established).')
say('TN D-5392 p02 from the paired conditions (Re 1.88e6 on 7.5 in., T0, M; Sutherland): ' +
    ', '.join(f'M {m}: {p:.0f} psf' for m, p in sorted(TND_P02.items())))
say('')
say('MINIMUM OF CRITERION (ii) PER SET, ITEM AND MACH NUMBER (the lower reading, p/p02; threshold 0.5283 + a)')
summary = {}
for f in faces:
    for m in f['machs']:
        summary.setdefault((f['source'], f['item'], m), []).append(f)
all_ii = True
for (source, item, m), fs in sorted(summary.items()):
    w2 = worst(fs, 'p2_margin')
    ok = all(f['p2_pass'] for f in fs)
    all_ii = all_ii and ok
    pos = '' if w2['position'] is None else f", at {w2['position']:.4f}"
    orf = f", orifice {w2['orifice']}" if w2['orifice'] else ''
    say(f'  {source} {item}, M {m:.2f}: {len(fs)} face points; least lower reading {w2["lower"]:.4f}'
        f'{orf}{pos} ({w2["pair"]}), a {w2["a"]:.4f}, margin {w2["p2_margin"]:+.4f}: '
        f'{"pass" if ok else "FAIL"}')
say('')
say('CRITERION (i), P1, ON THE SETS THAT TEST IT (the higher reading, p/p02; threshold 1 + a)')
all_i = True
for (source, item, m), fs in sorted(summary.items()):
    if not TESTS_P1[source]:
        continue
    w1 = worst(fs, 'p1_margin')
    ok = all(f['p1_pass'] for f in fs)
    all_i = all_i and ok
    say(f'  {source} {item}, M {m:.2f}: {len(fs)} face points; largest higher reading {w1["higher"]:.4f}'
        f' ({w1["pair"]}, C_p {w1["higher_raw"]:.4f}), a {w1["a"]:.4f}, margin {w1["p1_margin"]:+.4f}: '
        f'{"pass" if ok else "FAIL"}')
say('')
say('CRITERION (iii), INFORMATION ONLY (the face mean over the radius, zero over the outer fifth; 0.5283 for reference)')
for source, item, g, m, how, v, n in iii:
    if v is None:
        say(f'  {source} {item} {g}, M {m:.2f}: {how}: not computed ({n})')
    else:
        say(f'  {source} {item} {g}, M {m:.2f}{" (" + how + ")" if how else ""}: {v:.4f} over {n} points')
say('')
say('FACE POINTS WITH ONE READING (used as both their lower and higher reading)')
for f in faces:
    if f['readings'] == 1:
        say(f"  {f['pair']} ({f['status']}): {f['lower_raw']:.4f}, margin (ii) {f['p2_margin']:+.4f}")
say('')
say('NOT EVALUABLE (a face point no reader gives a value)')
for p in not_evaluable:
    say(f'  {p[0]} ({p[2]}): {p[3]}, at {p[4]}')
say('')
say('NOT FACE POINTS (out/not_face.csv): ' + str(len(not_face)) + ' in all; those either reader calls corner or unclear:')
for x in not_face:
    if {'corner', 'unclear'} & {x['location_A'], x['location_B']}:
        say(f"  {x['pair']} {x['series']}: A {x['location_A'] or '-'}, B {x['location_B'] or '-'};"
            f" values A {x['value_A']}, B {x['value_B']}")
say('')
say('REYNOLDS NUMBERS ON THE FACE HEIGHT (addendum (d))')
for s, mdl, re, how in reynolds:
    say(f'  {s} {mdl}: {re:.3g} ({how})')
for s, mdl, why in no_reynolds:
    say(f'  {s} {mdl}: none ({why})')
lo = min(r[2] for r in reynolds)
hi = max(r[2] for r in reynolds)
say(f'  The range the paired sets measured, as b0590ba computed it (rule 6): {lo:.3g} to {hi:.3g}.')
say('')
say('REYNOLDS NUMBERS UNDER THE PINNED DEFINITION (rule 6b: free-stream conditions, face height, normal component)')
say('  TM X-19 0.90e6 "based on model diameter": the conditions not recorded by either reader; does not count.')
say('  TN D-5392 1.88e6 "based on afterbody diameter": the conditions not recorded by either reader; does not count.')
say('  TN 4300: no per-foot value both readers give for its pressure tests; does not count.')
re_c = (14e6 * 3.252 / 12, 14e6 * 3.3 / 12)
re_d = (14e6 * 3.717 / 12, 14e6 * 3.7 / 12)
say(f'  RM L57C18 model C: about 14e6 per ft (free stream, both readers) x 3.252 (A) or about 3.3 (B) in.: '
    f'{re_c[0]:.4g} or {re_c[1]:.4g}')
say(f'  RM L57C18 model D: x 3.717 (A) or about 3.7 (B) in.: {re_d[0]:.4g} or {re_d[1]:.4g}')
say('  RM L57C18 models B and F: their face diameters not paired; do not count.')
lo_b, hi_b = max(re_c), min(re_d)
say(f'  The range surely measured, from the larger of model C\'s to the smaller of model D\'s: '
    f'{lo_b:.4g} to {hi_b:.4g}.')
say('  It differs from rule 6\'s because TM X-19 and TN D-5392, whose numbers set rule 6\'s lower end, do not')
say('  count under the definition, and model C\'s number is now taken at the larger of its two diameters.')
say('  Both ends rest on RM L57C18\'s models C and D, whose corners are rounded (0.4 and 0.1 in.), not square.')
say('')
say('DISCLOSURES (from the pairing, recorded here; they change no rule above)')
say('  - RM L57C18 fig. 5: neither reading is blind to table II (p. 16, C_p at every orifice): A had its')
say('    text layer on screen, B its text layer and page image, before reading fig. 5; both say they did')
say('    not use its values. Nothing here is set from table II, which neither reader read.')
say("  - RM L57C18 fig. 5(f), model F: all 9 points disagree because the readers' axis calibrations differ")
say('    by about one minor grid division; the calibration is not settled: (ii) takes the lower reading,')
say('    (i) the higher.')
say("  - The pairing party, printing 0014 to read (af), also saw the record of (aa)'s computed check in")
say('    words; it compared no reading with it.')
say('  - Face orifices nearest the corner: every set has them (TN 4300 x/r 0.98, TM X-19 0.975, TN')
say("    D-5392 r/R 0.96; RM L57C18's face orifices lie inboard of its rounded corners), and none is")
say('    excluded.')
say('')
verdict = all_i and all_ii
say(f'VERDICT: {"PASS" if verdict else "FAIL"} ((i) {"holds" if all_i else "fails"}; (ii) {"holds" if all_ii else "fails"})')
text = '\n'.join(lines) + '\n'
open(os.path.join(OUT, 'verdict.txt'), 'w').write(text)
sys.stdout.write(text)
