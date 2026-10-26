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
# for each point's Mach interval and for the checks just above 1.5.
M_LO, M_HI = 0.97, 1.65


def rows(path):
    with open(A + path, newline='') as f:
        return list(csv.DictReader(l for l in f if not l.startswith('#')))


def cp_from_ratio(ratio, mach):
    return (ratio - 1.0) * 2.0 / (1.4 * mach * mach)


points = []


def add(set_, reading, id_, series, mach, mach_err, cp_low, cp_high=None):
    if not (M_LO <= mach <= M_HI):
        return
    points.append(
        dict(set=set_, reading=reading, id=id_, series=series, mach=mach, mach_err=mach_err,
             cp_low=cp_low, cp_high=cp_low if cp_high is None else cp_high))


# Each point's Mach interval: the reading's error, or the report's stated Mach accuracy where it
# states one and it is wider (0019 section 3.4.1 item 2). Stated: TN 3548 (+-0.01) and Johnston
# (+-0.010). Stating none: R&M 3427 ("slight inaccuracies", no number), R&M 3348, RM A51J25.
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


# RM A52E01 fig. 8 (0014 10.7 (ac)): from the neutral pairing, never from one reading (0019 3.4.1
# item 6). A curve's point is its value at alpha 0 where both readings give one (verdict agree or
# DISAGREE: both values, unresolved); a value read once sets nothing. A curve's wing is the one both
# readings give it (the identity map's label check), else 'any' (any of wings 2, 3 and 4). The
# panel's Mach number from the series. The two-reader pairing gives no supersonic value read twice,
# so no point is written from it; a three-way pairing is read the same way when it lands.
A52E01_PAIRING = 'pairing-2026-10-26-a51j11-a52e01'


def a52e01_points(figure, set_name):
    with open(A + f'{A52E01_PAIRING}/identity_map.csv', newline='') as f:
        idmap = {(r['figure'], r['group'], r['A_series']): r for r in csv.DictReader(f)}
    with open(A + f'{A52E01_PAIRING}/pairs_{figure}.csv', newline='') as f:
        pairs = list(csv.DictReader(f))
    for r in pairs:
        if r['category'] != 'alpha 0' or r['verdict'] not in ('agree', 'DISAGREE'):
            continue
        ident = idmap.get((figure, r['group'], r['A_series']))
        check = ident['label_check'] if ident else ''
        wing = check.split('same ')[-1] if check.startswith('agree: same wing') else 'any wing'
        series = r['B_series'] if 'M =' in r['B_series'] else r['A_series']
        if r['group'].startswith('M=1'):
            mach = float(series.split('M')[1].replace('=', '').split(';')[0].split()[0])
        else:
            mach = float(r['group'].replace('M=', ''))
        for side in ('A', 'B'):
            x, xe = float(r[f'{side}_x']), float(r[f'{side}_x_err'])
            lo, hi = (x - xe, x + xe) if r[f'{side}_basis'] == 'bound' else (x, x)
            add(set_name, f'paired, reader {side}', r[f'{side}_id'], wing, mach, 0.0, lo, hi)


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
    ' * the script). Kept: points at M 0.97 to 1.65. Each point is [id, series,',
    ' * M, half-width of its Mach interval, Cp_b low, Cp_b high]. The interval is',
    ' * the reading\'s error, or the report\'s stated Mach accuracy where wider',
    ' * (TN 3548 +-0.01, Johnston +-0.010); the two Cp_b differ only for a box of',
    ' * merged ink. RM A51J25 fig. 7\'s symbols are on M\' and p\', taken at M = M\'.',
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
