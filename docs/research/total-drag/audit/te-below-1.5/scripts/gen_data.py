"""Write src/base/fin-te-transonic-data.ts: the points of the sets that set the square trailing
edge's band below Mach 1.5 (design record 0019 section 3.4.1), every reading of each, from the
reading files under docs/research/total-drag/audit/. Nothing is averaged, moved or dropped here
except by the rules printed in the output's header (the Mach window, the PARD circles of RM A51J25
fig. 7 counted with TN 3548, the incidence and sweep of the table).

Usage, from the repository root: python3 -I docs/research/total-drag/audit/te-below-1.5/scripts/gen_data.py
"""
import csv

A = 'docs/research/total-drag/audit/'
OUT = 'src/base/fin-te-transonic-data.ts'
# Points whose Mach number lies in this window are kept: the term's range, 1.0 to 1.5, with room
# for each point's Mach interval and for the checks above 1.5 (RM A52E01 at 1.7).
M_LO, M_HI = 0.97, 1.75


def rows(path):
    with open(A + path, newline='') as f:
        return list(csv.DictReader(l for l in f if not l.startswith('#')))


def cp_from_ratio(ratio, mach):
    return (ratio - 1.0) * 2.0 / (1.4 * mach * mach)


points = []


# The least Mach interval of a set whose report states no Mach accuracy (the coordinator's
# decision of 2026-10-27 after the review, 0019 section 3.4.1 item 6): +-0.01, and +-0.02 for RM
# A51J11, whose Mach number is an average over the model's region on the bump (its Corrections
# section states no smaller variation). A point carries the wider of this and its own interval.
MACH_FLOOR = {
    'R&M 3427 fig. 13': 0.01,
    'R&M 3348 table 3': 0.01,
    'R&M 3348 fig. 30a': 0.01,
    'RM A51J25 fig. 7 symbols': 0.01,
    'RM A51J11 fig. 14': 0.02,
    'RM A51J11 fig. 15': 0.02,
    'RM A52E01 fig. 8(a)': 0.01,
    'RM A52E01 fig. 8(b)': 0.01,
}


def add(set_, reading, id_, series, mach, mach_err, cp_low, cp_high=None):
    if not (M_LO <= mach <= M_HI):
        return
    points.append(
        dict(set=set_, reading=reading, id=id_, series=series, mach=mach,
             mach_err=max(mach_err, MACH_FLOOR.get(set_, 0.0)),
             cp_low=cp_low, cp_high=cp_low if cp_high is None else cp_high))


# Each point's Mach interval: the reading's error, or the report's stated Mach accuracy where it
# states one and it is wider (0019 section 3.4.1 item 2). Stated: TN 3548 (+-0.01) and Johnston
# (+-0.010). Stating none: R&M 3427 ("slight inaccuracies", no number), R&M 3348, RM A51J25, RM
# A51J11, RM A52E01, each with at least MACH_FLOOR's margin.
# TN 3548 fig. 6: both slits. The report's Mach accuracy (+-0.01, PDF p. 6) is wider than either
# reading's error and is carried as each point's Mach interval.
for r in rows('w7-fins/tn3548_fig6_first.csv'):
    add('TN 3548 fig. 6', 'first (W7)', r['id'], r['slit'] + ' slit', float(r['mach']), 0.01, float(r['cp_b']))
for r in rows('round11/readings/tn3548_fig6.csv'):
    if r['item'] == 'symbol':
        slit = 'inboard slit' if 'inboard' in r['series'] else 'outboard slit'
        add('TN 3548 fig. 6', 'second (round 11)', r['id'], slit, float(r['M']), 0.01, float(r['Cp_b']))

# R&M 3427 fig. 13, the base holes 5 to 7.
for r in rows('w7-fins/rm3427_fig13_first.csv'):
    add('R&M 3427 fig. 13', 'first (W7)', f"h{r['hole']}-{r['mach']}", 'hole ' + r['hole'], float(r['mach']),
        float(r['mach_err']), float(r['cp_b']))
for r in rows('round10/readings/rm3427_fig13_base.csv'):
    if r['item'] == 'symbol':
        hole = r['series'].split()[1]
        add('R&M 3427 fig. 13', 'second (round 10)', r['id'], 'hole ' + hole, float(r['M_inf']),
            float(r['M_inf_err']), float(r['Cp']))

# R&M 3348 table 3, unswept, alpha 0, all six holes; both typings (paired identical).
for r in rows('w7-fins/rm3348_table3_first.csv'):
    if r['sweep_deg'] == '0' and r['alpha_deg'] == '0':
        m = float(r['mach'])
        add('R&M 3348 table 3', 'first typing (W7)', f"{r['case']}-h{r['hole']}", 'hole ' + r['hole'], m, 0.0,
            cp_from_ratio(float(r['pb_over_p0']), m))
for r in rows('round8/readings/rm3348_table3.csv'):
    if r['phi_deg'] == '0' and r['alpha_deg'] == '0':
        m = float(r['M0'])
        add('R&M 3348 table 3', 'second typing (round 8)', f"{r['sub_table']}-h{r['hole']}", 'hole ' + r['hole'],
            m, 0.0, cp_from_ratio(float(r['p_b_over_p0']), m))

# R&M 3348 fig. 30a, the unswept circles (eta 0.59, alpha 0).
for r in rows('w7-fins/rm3348_fig30a_first.csv'):
    if r['series'].startswith('phi 0 '):
        m = float(r['mach'])
        add('R&M 3348 fig. 30a', 'first (W7)', r['id'], 'phi 0 deg', m, float(r['mach_err']),
            cp_from_ratio(float(r['pb_over_p0']), m))
for r in rows('round10/readings/rm3348_fig30a.csv'):
    if r['item'] == 'symbol' and 'phi = 0 deg' in r['series']:
        m = float(r['M0'])
        add('R&M 3348 fig. 30a', 'second (round 10)', r['id'], 'phi 0 deg', m, float(r['M0_err']),
            cp_from_ratio(float(r['pb_p0']), m))

# Johnston fig. 10(b), alpha 0. Round 13's merged ink is a box: its Mach and Cp_b extents. The
# report states the test region's Mach number uniform within +-0.002 across and about +-0.010 up
# and down (PDF p. 6): the wider, +-0.010, is carried where it exceeds the reading's error.
JOHNSTON_MACH = 0.010
for r in rows('w7-fins/johnston_fig10b_first.csv'):
    if r['alpha_deg'] == '0':
        add('Johnston fig. 10(b)', 'first (W7)', r['id'], 'alpha 0 deg', float(r['mach']),
            max(float(r['mach_err']), JOHNSTON_MACH), float(r['cpb']))
for r in rows('round13/readings/johnston_fig10b.csv'):
    if r['series'] == 'alpha 0 deg':
        if r['x_val']:
            add('Johnston fig. 10(b)', 'second (round 13)', r['id'], 'alpha 0 deg', float(r['x_val']),
                max(float(r['x_err']), JOHNSTON_MACH), float(r['y_val']))
        else:
            m_lo, m_hi = map(float, r['extent_x'].split('..'))
            c_lo, c_hi = map(float, r['extent_y'].split('..'))
            add('Johnston fig. 10(b)', 'second (round 13), box', r['id'], 'alpha 0 deg', (m_lo + m_hi) / 2,
                max((m_hi - m_lo) / 2, JOHNSTON_MACH), c_lo, c_hi)

# RM A51J25 fig. 7 below M' 1.5, the open symbols, at M = M' (as the code serves the curve above
# 1.5). The filled PARD circles are TN 3548's flights, counted there (0014 10.7 (k)): W7's f1 and
# round 11's pard-1 are left out. W7 gives no M' error for its symbols (0.0 here).
for r in rows('w7-fins/rma51j25_fig7_below15_first.csv'):
    if r['kind'] == 'symbol' and r['id'] != 'f1':
        m = float(r['mach_prime'])
        add('RM A51J25 fig. 7 symbols', 'first (W7)', r['id'], r['note'].split(' (')[0], m, 0.0,
            cp_from_ratio(float(r['p_mid']), m))
for r in rows('round11/readings/rma51j25_fig7.csv'):
    if r['item'] == 'symbol' and not r['id'].startswith('pard'):
        m = float(r['M_prime'])
        add('RM A51J25 fig. 7 symbols', 'second (round 11)', r['id'], r['series'], m, float(r['M_prime_err']),
            cp_from_ratio(float(r['pb_over_pprime']), m))

# RM A51J11 figs. 14 and 15 (0014 10.7 (ac)): round 15's two blind readings, paired 2026-10-26
# (pairing-2026-10-26-a51j11-a52e01/, every station, end and identity agreeing). Faired curves, no
# symbols: every curve, curve_end and box row is a point (0019 3.4.1 item 6). P_b = (p_b - p)/q on
# the free stream (its NOTATION). A row read as a bound (a box, or a curve row whose error is a
# bound) enters as its range; a 2-sigma row as its value. The report states no Mach accuracy.
# Fig. 14: Mach number on the abscissa, its error the interval. Fig. 15: the panel's Mach number
# from the series (1.06 here; 0.98 lies below the term's range), exact.
ROUND15 = {'A': 'round15-A', 'B': 'round15-B'}


def ht_of(series):
    for v in ('0.3', '0.6', '1.0'):
        if f'h/t = {v}' in series or f'h/t, {v}' in series:
            return v
    raise ValueError(series)


def a51_point(r):
    y, ye = float(r['y']), float(r['y_err'])
    if r['kind'] == 'box' or r['err_basis'] == 'bound':
        return y - ye, y + ye
    return y, y


for reader, folder in ROUND15.items():
    for r in rows(f'{folder}/readings/a51j11_fig14.csv'):
        if r['kind'] not in ('curve', 'curve_end', 'box'):
            continue
        rough = 'with roughness' if r['series'].lower().find('without') < 0 else 'without roughness'
        lo, hi = a51_point(r)
        add('RM A51J11 fig. 14', f'round 15 reader {reader}', r['id'], f"h/t {ht_of(r['series'])}, {rough}",
            float(r['x']), float(r['x_err']), lo, hi)
    for r in rows(f'{folder}/readings/a51j11_fig15.csv'):
        if r['kind'] not in ('curve', 'curve_end', 'box'):
            continue
        mach = float(r['series'].split('M')[-1].replace('=', '').strip())
        lo, hi = a51_point(r)
        add('RM A51J11 fig. 15', f'round 15 reader {reader}', r['id'],
            f"h/t {ht_of(r['series'])}, 2y/b {float(r['x']):.3f}", mach, 0.0, lo, hi)


# RM A52E01 fig. 8 (0014 10.7 (ac)): from the three-way neutral pairing of rounds 15-A, 15-B and 17
# (pairing-2026-10-26-a52e01-three/identity_map.csv, one row per drawn curve), never from one
# reading, under 0019 3.4.1 item 6 and the coordinator's rule for three readings recorded there:
# - wing: the one every reader naming a wing names, if at least two name one and none flags it
#   uncertain; otherwise 'any wing' (any of wings 2, 3 and 4);
# - alpha 0: only a drawn curve whose status is two or more agreeing readings; it enters as every
#   reading's value (a bound as its range), the one that disagrees included; read-once, unagreed
#   and unlinked values set nothing; stations away from alpha 0 are not used;
# - Mach number: the panel's, or in the supersonic panel the Mach group all readers giving one
#   agree on (the pairing's mach_check); the report states no Mach accuracy.
A52E01_PAIRING = 'pairing-2026-10-26-a52e01-three'


def parse_alpha0(text):
    """'-0.5727 +-0.0060 (bound, flagged)' -> (low, high); None for 'no value ...'."""
    t = text.strip()
    if not t or t.startswith('no '):
        return None
    value, rest = t.split('+-')
    err = float(rest.split()[0])
    v = float(value)
    return (v - err, v + err) if 'bound' in rest else (v, v)


def wing_of(r):
    calls = [(r[f'{k}_wing'], r[f'{k}_wing_uncertain']) for k in 'ABC']
    named = [(w, u) for w, u in calls if w not in ('', 'none')]
    if len(named) >= 2 and len({w for w, _ in named}) == 1 and all(u != 'yes' for _, u in named):
        return f'wing {named[0][0]}'
    return 'any wing'


def mach_of(r):
    if not r['group'].startswith('M=1'):
        return float(r['group'].replace('M=', ''))
    machs = {r[f'{k}_mach'] for k in 'ABC' if r[f'{k}_mach']}
    if len(machs) != 1:
        raise ValueError(f"readers differ on the Mach number of {r['figure']} {r['drawn_curve']}: {machs}")
    return float(machs.pop())


# Fig. 8(a)'s Mach 1.7 curves (#7 to #10) from the four-way neutral pairing (rounds 15-A, 15-B, 17
# and 18, pairing-2026-10-27-a52e01-m17-four/identity_map.csv), under the same rule with four
# readers: a wing only if at least two name it, every naming reader names the same, and none
# is uncertain (B's "flagged uncertain", C's "confidence medium"; only "confidence high" is
# not); an alpha 0 value only from a curve whose status is two or more agreeing readings,
# entered as every reading's value. The four-way map's own Mach group is the panel's 1.7.
A52E01_FOUR = 'pairing-2026-10-27-a52e01-m17-four'


def wing_of_four(r):
    named = []
    for k in 'ABCD':
        call = r[f'{k}_wing_call']
        if call.startswith('wing '):
            named.append((call.split(',')[0], 'confidence high' not in call))
    if len(named) >= 2 and len({w for w, _ in named}) == 1 and not any(u for _, u in named):
        return named[0][0]
    return 'any wing'


def four_way_curves():
    with open(A + f'{A52E01_FOUR}/identity_map.csv', newline='') as f:
        return list(csv.DictReader(f))


def a52e01_points(figure, set_name):
    with open(A + f'{A52E01_PAIRING}/identity_map.csv', newline='') as f:
        curves = [r for r in csv.DictReader(f) if r['figure'] == figure]
    four = {r['drawn_curve']: r for r in four_way_curves() if r['figure'] == figure}
    for r in curves:
        if r['drawn_curve'] in four:
            r4 = four[r['drawn_curve']]
            if not r4['alpha0_status'].startswith('TWO OR MORE AGREEING READINGS'):
                continue
            for k in 'ABCD':
                v = parse_alpha0(r4[f'alpha0_{k}'])
                if v is not None:
                    add(set_name, f'four-way pairing, reader {k}', f"{r['drawn_curve']} ({k})",
                        wing_of_four(r4), 1.7, 0.0, v[0], v[1])
            continue
        if not r['alpha0_status'].startswith('TWO OR MORE AGREEING READINGS'):
            continue
        mach, wing = mach_of(r), wing_of(r)
        for k in 'ABC':
            v = parse_alpha0(r[f'alpha0_{k}'])
            if v is not None:
                add(set_name, f'three-way pairing, reader {k}', f"{r['drawn_curve']} ({k})", wing, mach, 0.0,
                    v[0], v[1])


a52e01_points('a52e01_fig8a', 'RM A52E01 fig. 8(a)')
a52e01_points('a52e01_fig8b', 'RM A52E01 fig. 8(b)')


def ts_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def num(x):
    return repr(round(x, 6))


lines = [
    '/**',
    ' * The points behind the square trailing edge\'s band below Mach 1.5 (design',
    ' * record 0019 section 3.4.1), every reading of each set, on the free-stream',
    ' * Mach number and pressure: Cp_b = (p_b / p_0 - 1) / (0.7 M_0^2), converted',
    ' * here from p_b / p_0 where a source plots that. Generated by',
    ' * docs/research/total-drag/audit/te-below-1.5/scripts/gen_data.py from the',
    ' * reading files under docs/research/total-drag/audit/ (do not edit; re-run',
    ' * the script). Kept: points at M 0.97 to 1.75. Each point is [id, series,',
    ' * M, half-width of its Mach interval, Cp_b low, Cp_b high]. The interval is',
    ' * the reading\'s error, or the report\'s stated Mach accuracy where wider',
    ' * (TN 3548 +-0.01, Johnston +-0.010); where the report states none, at least',
    ' * +-0.01 (RM A51J11 +-0.02, its Mach number an average over the model on the',
    ' * bump). The two Cp_b differ only for a box of merged ink or a bound.',
    ' * RM A51J25 fig. 7\'s symbols are on M\' and p\', taken at M = M\'.',
    ' */',
    '',
    'export type TransonicPoint = readonly [',
    '  id: string,',
    '  series: string,',
    '  mach: number,',
    '  machErr: number,',
    '  cpLow: number,',
    '  cpHigh: number,',
    '];',
    '',
    'export interface TransonicReadingGroup {',
    '  readonly set: string;',
    '  readonly reading: string;',
    '  readonly points: readonly TransonicPoint[];',
    '}',
    '',
    'export const TRANSONIC_TE_READINGS: readonly TransonicReadingGroup[] = [',
]
groups = []
for p in points:
    found = [g for g in groups if (g[0], g[1]) == (p['set'], p['reading'])]
    if found:
        found[0][2].append(p)
    else:
        groups.append((p['set'], p['reading'], [p]))
for set_, reading, pts in groups:
    lines.append(f"  {{ set: {ts_str(set_)}, reading: {ts_str(reading)}, points: [")
    for p in pts:
        lines.append(
            f"    [{ts_str(p['id'])}, {ts_str(p['series'])}, {num(p['mach'])}, {num(p['mach_err'])}, "
            f"{num(p['cp_low'])}, {num(p['cp_high'])}],")
    lines.append('  ] },')
lines.append('];')
lines.append('')
with open(OUT, 'w') as f:
    f.write('\n'.join(lines))
by = {}
for p in points:
    by[(p['set'], p['reading'])] = by.get((p['set'], p['reading']), 0) + 1
for k, v in sorted(by.items()):
    print(v, *k)
print(len(points), 'points written to', OUT)
