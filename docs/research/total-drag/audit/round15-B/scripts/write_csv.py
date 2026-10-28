"""Write the four reading CSV files from the reading json files and the calibrations.

usage: python3 -I write_csv.py <work_dir> <readings_dir>
"""
import sys, os, json, math, csv, io

wd, outd = sys.argv[1], sys.argv[2]
os.makedirs(outd, exist_ok=True)
SHA51 = 'e6b779125d8359e968ad6b4d2b2c43d651ef5024f42bdb5574a6f7b93a8fdf57'
SHA52 = '3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54'
COLS = ['id', 'kind', 'panel', 'series', 'symbol', 'filled', 'x', 'x_err', 'y', 'y_err', 'err_basis', 'flag', 'note']


def geom(cx, cy):
    tv = math.degrees(math.atan(-cx[2] / cx[1]))
    th = math.degrees(math.atan(-cy[1] / cy[2]))
    return tv, th


def cal_lines(cal, name, xname, yname):
    out = []
    st = cal['stats']
    cx, cy = cal['cx'], cal['cy']
    tv, th = geom(cx, cy)
    out.append(f'# calibration {name}: affine map from render pixels (px right, py down): '
               f'{xname} = {cx[0]:.6f} + {cx[1]:.9f}*px + {cx[2]:.9f}*py ; '
               f'{yname} = {cy[0]:.6f} + {cy[1]:.9f}*px + {cy[2]:.9f}*py')
    out.append(f'# calibration {name}: scale {1 / st["sx"]:.7f} {xname} per px ({st["sx"]:.2f} px per unit), '
               f'{1 / st["sy"]:.7f} {yname} per px ({st["sy"]:.2f} px per unit); tilt of constant-{xname} grid '
               f'lines {tv:+.3f} deg (dpx/dpy), of constant-{yname} lines {th:+.3f} deg (dpy/dpx): rotation '
               f'{(tv - th) / 2:+.3f} deg, skew (non-orthogonality) {tv + th:+.3f} deg, both taken out by the affine fit')
    out.append(f'# calibration {name}: rms residual over all grid intersections {st["rmsx"]:.5f} in {xname}, '
               f'{st["rmsy"]:.5f} in {yname}; leave-one-line-out worst prediction error {st["loox"]:.5f} in '
               f'{xname}, {st["looy"]:.5f} in {yname}')
    for l in cal['report']:
        if 'mean resid' in l or 'LOO per line' in l:
            out.append('#   ' + l.lstrip('# ').strip())
    return out


def fmt(v, n):
    if v is None:
        return ''
    return f'{v:.{n}f}'


def write(path, header, rows):
    with open(path, 'w', newline='') as f:
        for h in header:
            f.write(h.rstrip() + '\n')
        w = csv.writer(f, lineterminator='\n')
        w.writerow(COLS)
        for r in rows:
            w.writerow([r.get(c, '') for c in COLS])
    print(path, len(rows))


ERRTXT = [
    '# errors: x_err and y_err are about 2 sigma (err_basis 2sigma) or a bound (err_basis bound). For a curve read',
    '#   at a fixed abscissa, the abscissa is set by me and its error is 2x the calibration rms; the ordinate error',
    '#   combines in quadrature: calibration rms, the standard error of the local fit through the stroke centres,',
    '#   a placement term for the stroke centre line, a term for reading across a gap (dash gap or masked grid',
    '#   line), and slope times the abscissa uncertainty; all doubled. Bounds add the stated extra term on top.',
]

# ---------------- fig 14
R14 = json.load(open(os.path.join(wd, 'rd_f14.json')))
C14 = json.load(open(os.path.join(wd, 'cal_f14.json')))
PN14 = {'f14_top': ('top', 'h/t, 1.0'), 'f14_mid': ('mid', 'h/t, 0.6'), 'f14_bot': ('bot', 'h/t, 0.3')}
hdr = [
    '# NACA RM A51J11, figure 14 (blind reading, reader B)',
    '# source: Cleary, J. W. and Stevens, G. L., NACA RM A51J11 (December 11, 1951), "The effects at transonic speeds',
    '#   of thickening the trailing edge of a wing with a 4-percent-thick circular-arc airfoil"; NTRS 19930087063',
    f'# PDF page 36 (printed page 35); PDF SHA-256 {SHA51} (checked, matches the brief)',
    '# caption as printed: "Figure 14.- The variation of base pressure coefficient with Mach number at semispan',
    '#   station 2y/b, 0.25. Angle of attack, 0 deg."',
    '# image read: PDF page 36 rendered with pdftoppm -r 600 to a 4692 x 6200 px PNG (the embedded scan is a',
    '#   2344 x 3096 px RGB JPEG at 300 dpi, so 1 render px = 0.5 scan px)',
    '# axes as printed: x "Mach number, M" (0.5 to 1.2, grid every 0.05, labels every 0.1); y "Base pressure',
    '#   coefficient, P_b" (0 at bottom to -1.2 at top, grid every 0.2, labels 0, -.4, -.8, -1.2). NOTATION:',
    '#   P_b base-pressure coefficient (p_b - p)/q; p_b base pressure; p free-stream static pressure; q dynamic pressure.',
    '#   Values below are in these units as printed (P_b negative upward).',
    '# panels (three, one figure): top "h/t, 1.0", middle "h/t, 0.6", bottom "h/t, 0.3" (h trailing-edge thickness,',
    '#   t maximum thickness). Legend (top panel): solid line "Without surface roughness", dashed line "With surface',
    '#   roughness". No plotted symbols: every panel shows two faired curves only.',
    '# test conditions and model (APPARATUS AND MODELS, TESTS, CORRECTIONS): Ames 16-foot high-speed tunnel, transonic',
    '#   bump technique; semispan rectangular wings, effective aspect ratio 4, steel; 4-percent-thick circular-arc',
    '#   section with the trailing edge built up to h/t = 0, 0.3, 0.6, 1.0 and faired by straight lines; base',
    '#   pressure orifices at 25, 37.5, 62.5 and 87.5 percent semispan, mercury manometer; roughness No. 60',
    '#   carborundum from the leading edge to 0.10 chord; Mach 0.60 to 1.10 (indicated Mach is the average over the',
    '#   model region of the bump); Reynolds number about 1.7 to 2.2 million (fig. 4); data corrected for flow',
    '#   inclination over the bump; blockage and wall interference assumed negligible. No uncertainty is stated.',
    '# reading: dense centre-line trace of each curve (one scan line of constant Mach per render px), stroke centre =',
    '#   ink-weighted centroid across the stroke; value at each 0.01 in Mach by a local straight-line fit within',
    '#   +-3 px (or a quadratic across gaps); two ends = centres of the round end caps. See method.md.',
] + ERRTXT
for k in ('f14_top', 'f14_mid', 'f14_bot'):
    hdr += cal_lines(C14[k], f'{k} ({PN14[k][1]})', 'M', 'P_b')
hdr.append('# columns: series = panel label and legend entry as printed; symbol = none (curve) with its line style')
rows = []
cnt = {}
for r in R14:
    if r['kind'] == 'missing':
        continue
    short, lab = PN14[r['panel']]
    leg = 'Without surface roughness' if r['curve'] == 'solid' else 'With surface roughness'
    key = (short, r['curve'])
    cnt[key] = cnt.get(key, 0) + 1
    rows.append(dict(id=f'A51-14-{short}-{r["curve"]}-{cnt[key]:03d}', kind=r['kind'], panel='',
                     series=f'{lab}; {leg}', symbol=f'none (curve, {r["style"]} line)', filled='',
                     x=fmt(r['x'], 4), x_err=fmt(r['x_err'], 4), y=fmt(r['y'], 4), y_err=fmt(r['y_err'], 4),
                     err_basis=r['err_basis'], flag=r['flag'], note=r['note']))
write(os.path.join(outd, 'a51j11_fig14.csv'), hdr, rows)

# ---------------- fig 15
R15 = json.load(open(os.path.join(wd, 'rd_f15.json')))
C15 = json.load(open(os.path.join(wd, 'cal_f15.json')))
PN15 = {'f15_top': ('top', 'h/t, 1.0'), 'f15_mid': ('mid', 'h/t, 0.6'), 'f15_bot': ('bot', 'h/t, 0.3')}
LAB15 = {'m098': 'M 0.98', 'm080': 'M .80', 'm106': 'M 1.06', 'm060': 'M .60'}
STATIONS = [0.25, 0.375, 0.625, 0.875]
hdr = [
    '# NACA RM A51J11, figure 15 (blind reading, reader B)',
    '# source: Cleary, J. W. and Stevens, G. L., NACA RM A51J11 (1951); NTRS 19930087063',
    f'# PDF page 37 (printed page 36); PDF SHA-256 {SHA51} (checked, matches the brief)',
    '# caption as printed: "Figure 15.- The variation of base pressure coefficient with semispan station, 2y/b.',
    '#   Angle of attack, 0 deg."',
    '# image read: PDF page 37 rendered with pdftoppm -r 600 to 4692 x 6200 px (embedded scan 2344 x 3096 px JPEG, 300 dpi)',
    '# axes as printed: x "Semispan station, 2y/b" (0 to 1.0, grid every 0.1, labels every 0.2); y "Base pressure',
    '#   coefficient, P_b" (0 at bottom to -1.2 at top, grid every 0.2); P_b = (p_b - p)/q (NOTATION).',
    '# panels: top "h/t, 1.0", middle "h/t, 0.6", bottom "h/t, 0.3". Curves labelled by leader lines from the',
    '#   printed labels "M 0.98", ".80", "1.06", ".60"; line styles (top and middle panels): 0.98 long dash, .80 short',
    '#   dash, 1.06 long-and-short dash, .60 solid. No symbols. Roughness is not stated in this caption.',
    '# orifice stations (APPARATUS AND MODELS): 2y/b = 0.25, 0.375, 0.625, 0.875. Rows are given at these',
    '#   stations, at every 0.05 from 0.25 to 0.85 (extra, to show the faired shape), and at both curve ends.',
    '#   Rows at a station carry the note "orifice station". A station lying just outside the drawn ink',
    '#   (the curve stops short of it by less than its end-cap error) has no row; see that curve_end row.',
    '# test conditions and model: as fig. 14 (Ames 16-foot high-speed tunnel, bump, semispan wing aspect ratio 4,',
    '#   4-percent circular-arc section with blunt trailing edge h/t 0.3, 0.6, 1.0). No uncertainty is stated.',
    '# reading: as fig. 14 (dense centre-line trace, local fits at fixed 2y/b). See method.md.',
] + ERRTXT
for k in ('f15_top', 'f15_mid', 'f15_bot'):
    hdr += cal_lines(C15[k], f'{k} ({PN15[k][1]})', '2y/b', 'P_b')
rows = []
cnt = {}
for r in R15:
    if r['kind'] == 'missing':
        continue
    short, lab = PN15[r['panel']]
    note = r['note']
    if r['kind'] == 'curve' and any(abs(r['x'] - s) < 1e-6 for s in STATIONS):
        note = 'orifice station' + ('; ' + note if note else '')
    flag = r['flag']
    if r['panel'] == 'f15_bot' and r['curve'] in ('m098', 'm106'):
        flag = 'uncertain'
        idn = ('identity call: leader from "0.98" touches the upper start stub (-0.67) and leader from "1.06" the lower '
               '(-0.63); the two curves meet at about 2y/b 0.30 to 0.39 and I read them as touching, not crossing, so '
               'the upper stub joins the long-dash line (0.98 by style in the other panels); alternative: they cross, '
               'which swaps the right-hand parts (0.98 = long-and-short dash)')
        note = (note + '; ' if note else '') + idn
    if r['panel'] == 'f15_bot' and r['curve'] in ('m060', 'm080') and r['x'] < 0.40:
        flag = 'uncertain'
        note = (note + '; ' if note else '') + (
            'identity call: leaders from ".60" and ".80" touch the upper and lower start stubs; I read the two '
            'curves as crossing near 2y/b 0.30 (stubs continue straight), which keeps leader and line style in '
            'agreement; alternative: touching, which swaps the stubs')
    key = (short, r['curve'])
    cnt[key] = cnt.get(key, 0) + 1
    rows.append(dict(id=f'A51-15-{short}-{r["curve"]}-{cnt[key]:03d}', kind=r['kind'], panel='',
                     series=f'{lab}; {LAB15[r["curve"]]}', symbol=f'none (curve, {r["style"]} line)', filled='',
                     x=fmt(r['x'], 4), x_err=fmt(r['x_err'], 4), y=fmt(r['y'], 4), y_err=fmt(r['y_err'], 4),
                     err_basis=r['err_basis'], flag=flag, note=note))
write(os.path.join(outd, 'a51j11_fig15.csv'), hdr, rows)

# ---------------- fig 8
R8 = json.load(open(os.path.join(wd, 'rd_f8.json')))
C8 = json.load(open(os.path.join(wd, 'cal_f8.json')))
order = ['M0.6', 'M0.7', 'M0.8', 'M0.9', 'M0.925', 'M1.2-1.7']
for part, page, rlab in (('a', 29, '1.5 million'), ('b', 30, '3.8 million')):
    hdr = [
        f'# NACA RM A52E01, figure 8 ({part}) (blind reading, reader B)',
        '# source: Dugan, D. W., NACA RM A52E01 (1952), "Effects of three types of blunt trailing edges on the',
        '#   aerodynamic characteristics of a plane tapered wing of aspect ratio 3.1 with a 3-percent-thick biconvex',
        '#   section"; NTRS 19930087008',
        f'# PDF page {page} (printed page {page - 1}); PDF SHA-256 {SHA52} (checked, matches the brief)',
        '# caption as printed: "Figure 8.- Comparison of wing base pressure coefficients for three types of',
        f'#   trailing-edge bluntness." Part caption: "({part}) Reynolds number, {rlab}."' +
        (' Page heading "Figure 8.- Concluded."' if part == 'b' else ''),
        f'# image read: PDF page {page} rendered with pdftoppm -r 480 (the page is landscape; pdftoppm applies the page',
        '#   rotation) to a {} px PNG; the embedded scan is 1-bit CCITT strips at 240 dpi, so 1 render px = 0.5 scan px'.format(
            '4927 x 4134' if part == 'a' else '4880 x 4080'),
        '# axes as printed: x "Pressure coefficient, (P_b-P_0)/q" (0 at left to -.8 at right, grid every 0.1,',
        '#   labels 0, -.2, -.4, -.6, -.8); y "Nominal angle of attack, alpha, degrees" (0 at bottom, grid every 2,',
        '#   labels 0 to 14, top frame 16). NOTATION: (p_b - p_0)/q wing base-pressure coefficient; p_b pressure at',
        '#   base of blunt trailing-edge wings; p_0 free-stream static pressure; q free-stream dynamic pressure.',
        '# panels as printed: M=0.6, M=0.7, M=0.8 (top row), M=0.9, M=0.925, M=1.2, 1.4, 1.7 (bottom row). In the',
        '#   last panel the Mach number of each curve is given by labels "1.7", "1.4", "1.2" with arrows.',
        '# legend (in the M=0.925 panel) as printed: "Wing 2" long-dash line, "Wing 3" short-dash line, "Wing 4"',
        '#   long-and-short-dash line, each with a sketch of the section (wing 2 blunt full-thickness trailing edge,',
        '#   wing 3 boattail to half thickness, wing 4 longer taper to half thickness). No symbols: curves only.',
        '#   Legend dash lengths on this render: wing 2 about 64 px dashes and 22 px gaps; wing 3 about 30 and 19;',
        '#   wing 4 alternating about 62 and 26 with 20 px gaps. Curves are assigned to wings by dash pattern.',
        '# test conditions and model (APPARATUS, Models, TESTS AND PROCEDURE, Reduction of Data): Ames 6- by 6-foot',
        '#   supersonic wind tunnel, sting-mounted body-wing model, internal 4-inch four-component strain-gage balance;',
        '#   wing aspect ratio 3.1, taper ratio 0.39, 3-percent-thick circular-arc biconvex streamwise section, nose',
        '#   included angle 6.88 deg, boattail angle wing 2 0, wing 3 6.88, wing 4 2.02 deg, total area 2.425 sq ft,',
        '#   mean aerodynamic chord 0.944 ft, sweepback of 25-percent chord 11.4 deg, no dihedral, camber, twist or',
        '#   incidence; wing 2 constant thickness from midchord to trailing edge, wing 3 constant thickness to 87.5',
        '#   percent chord then constant slope to half the maximum thickness, wing 4 same trailing-edge thickness',
        '#   with a constant slope to tangency; body fineness ratio 12.5. Base pressure: one static orifice in the',
        '#   trailing edge of each modified wing at about 50 percent semispan of the right wing panel. Mach 0.6 to',
        '#   0.925 and 1.2 to 1.7; Reynolds number 1.5 and 3.8 million. Subsonic wall corrections Delta alpha =',
        '#   0.57 C_L and Delta C_D = 0.0100 C_L^2; constriction correction (Mach up 3 percent at 0.925); no',
        '#   wall corrections at supersonic speeds. No uncertainty is stated for the base pressures.',
        '# reading: grid lines masked out of the 1-bit ink, the remaining ink split into connected pieces (dashes),',
        '#   pieces assigned to curves by me (chains), each curve read at fixed alpha steps (1 deg if that gives at',
        '#   least 8 rows, else 0.5 deg): stroke centre on the line alpha = const where the curve has ink, else on',
        '#   the straight line between the facing dash ends; one row per crossing (branch) where a curve folds back',
        '#   in alpha; both ends; alpha = 0 row (curve_at_zero) where the curve runs into the bottom frame, else an',
        '#   empty row saying it does not. box rows: ink merged with a grid line, an arrow or another curve. See method.md.',
        '# errors: x_err about 2 sigma (or a bound): calibration rms, 2 px placement (1 scan px), gap term 0.15 x gap',
        '#   length, and slope dx/dalpha times the alpha uncertainty; y_err is 2x the alpha calibration rms (alpha is',
        '#   set by me) except for ends, which carry their own bound.',
    ]
    for pk in order:
        key = f'{part}_{pk}'
        hdr += cal_lines(C8[key], key, 'x', 'alpha')
    rows = []
    cnt = {}
    for pk in order:
        key = f'{part}_{pk}'
        rr = [r for r in R8 if r['pkey'] == key]
        for r in rr:
            ser = r['series']
            if pk == 'M1.2-1.7':
                mach = r['curve'].split()[0].replace('M', 'M = ')
                ser = f'{mach}; {ser}'
            ck = (key, r['curve'])
            cnt[ck] = cnt.get(ck, 0) + 1
            cid = r['curve'].replace(' ', '')
            rows.append(dict(id=f'A52-8{part}-{pk}-{cid}-{cnt[ck]:03d}', kind=r['kind'], panel=r['panel'],
                             series=ser, symbol=f'none (curve, {r["style"]} line)', filled='',
                             x=fmt(r['x'], 4), x_err=fmt(r['x_err'], 4), y=fmt(r['y'], 3),
                             y_err=fmt(r['y_err'], 3), err_basis=r['err_basis'], flag=r['flag'], note=r['note']))
    write(os.path.join(outd, f'a52e01_fig8{part}.csv'), hdr, rows)
