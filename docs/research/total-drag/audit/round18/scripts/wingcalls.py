"""Write wing_calls.csv from dash endpoints read off raw pixel dumps (txt.py) and component lists (comps.py).
Lengths are straight-line distances between a dash's two ends, in px of the 240 ppi image.
Usage: python3 -I wingcalls.py out.csv"""
import sys, math
out = sys.argv[1]
def L(p, q): return math.hypot(q[0]-p[0], q[1]-p[1])
# legend samples (horizontal lines, x extents of each element), from legend.py
legend = {
 '2': dict(elems=[('dash', 1314, 1344), ('dash', 1356, 1389), ('dash', 1401, 1432), ('dash', 1445, 1475)]),
 '3': dict(elems=[('dash', 1314, 1328), ('dash', 1339, 1354), ('dash', 1364, 1378), ('dash', 1390, 1404), ('dash', 1414, 1430), ('dash', 1440, 1455), ('dash', 1464, 1476)]),
 '4': dict(elems=[('long', 1313, 1343), ('short', 1354, 1366), ('long', 1376, 1406), ('short', 1417, 1429), ('long', 1440, 1472)]),
}
leg_txt = {}
for w, d in legend.items():
    e = d['elems']
    lens = ['%s %d' % (k, b-a+1) for k, a, b in e]
    gaps = [str(e[i+1][1]-e[i][2]-1) for i in range(len(e)-1)]
    leg_txt[w] = 'elements ' + ', '.join(lens) + '; gaps ' + ', '.join(gaps)
    print('legend wing', w, leg_txt[w])
# curve elements top (higher alpha) to bottom; each (label, top_xy, bottom_xy, note)
A = [('d', (1721, 1151), (1720, 1167), ''), ('d', (1719, 1178), (1717, 1193), ''), ('d', (1714, 1203), (1713, 1221), 'runs through alpha 8 line'),
     ('d', (1713, 1230), (1711, 1247), ''), ('d', (1710, 1256), (1711, 1268), 'lower end inside alpha 6 line'), ('d', (1708, 1277), (1709, 1297), ''),
     ('d', (1708, 1304), (1708, 1319), ''), ('d', (1710, 1328), (1710, 1343), 'runs through alpha 4 line'), ('d', (1711, 1350), (1712, 1366), ''),
     ('d', (1714, 1375), (1716, 1393), 'lower end inside alpha 2 line'), ('d', (1716, 1406), (1716, 1417), 'lower end merges with the wing 2 diagonal'),
     ('d', (1718, 1433), (1719, 1446), ''), ('d', (1719, 1450), (1719, 1453), 'last piece, runs into the frame')]
M = [('L', (1750, 1153), (1738, 1203), 'upper end near the arrowhead zone, not used for the call'), ('S', (1735, 1212), (1735, 1234), ''),
     ('L', (1734, 1241), (1740, 1297), 'runs through alpha 6 line'), ('S', (1745, 1307), (1755, 1331), 'upper end inside the crossing, length 20 to 26'),
     ('L', (1758.5, 1336), (1781.5, 1385), ''), ('S', (1783.5, 1391), (1784, 1410), 'runs through alpha 2 line'),
     ('L', (1784, 1416), (1772, 1453), 'runs into the frame, so a lower bound')]
Rr = [('L', (1759, 1144), (1754, 1177), 'upper end at the alpha 10 line and an arrowhead tip, so a lower bound'), ('L', (1752, 1187), (1748.5, 1235), 'runs through alpha 8 line'),
      ('L', (1745, 1244), (1744.5, 1294), 'runs through alpha 6 line'), ('L', (1743.5, 1303), (1742.5, 1354), 'upper end inside the crossing; runs through alpha 4 line'),
      ('L', (1741, 1363), (1733.5, 1404), 'runs through the alpha 2 / Cp -0.2 grid crossing; lower end may be hidden in the vertical line'),
      ('L', (1722.5, 1413), (1696.5, 1446), 'diagonal; crosses the wing 3 column'), ('e', (1689, 1449), (1687, 1453), 'small last piece on the frame (uncertain)')]
def seq(el):
    lens = ['%s%.0f' % (k if k in 'LSe' else '', L(p, q) + 1) for k, p, q, n in el]   # +1: count pixels inclusive, as for the legend
    gaps = ['%.0f' % (L(el[i][2], el[i+1][1]) - 1) for i in range(len(el)-1)]   # -1: blank pixels between ends
    return ' '.join(lens), ' '.join(gaps)
rows = []
for cid, el, call, conf, pat, alt in [
  ('A', A, '3', 'high', 'uniform short dashes, 13 elements, no long element', 'none credible: wing 4 would need long elements of 31 px or more between the short ones and there are none in 13 consecutive elements'),
  ('M', M, '4', 'high', 'long and short elements strictly alternating (L S L S L S L)', 'wing 2 only if every short element were a broken long dash; rejected because each short element has clean gaps on both sides and they alternate regularly'),
  ('R', Rr, '2', 'high', 'uniform long dashes, 6 consecutive, no short element between them', 'wing 4 only if short elements were hidden; rejected because every gap is clean paper of 8 or 9 px, too short to hold a short element plus two gaps')]:
    lens, gaps = seq(el)
    rows.append((cid, el, call, conf, pat, alt, lens, gaps))
    print(cid, 'lengths', lens, '| gaps', gaps)
with open(out, 'w') as f:
    f.write('# NACA RM A52E01 fig. 8 (a), PDF page 29, panel M=1.2, 1.4, 1.7; Mach 1.7 curves; sha256 3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54\n')
    f.write('# lengths in px of the 240 ppi page image (61.4 px = 0.1 Cp, 31.6 px = 1 deg); element lengths count pixels inclusive end to end (as for the legend), top (higher alpha) to bottom, read from raw pixel dumps\n')
    f.write('# element prefix: L long, S short, e end piece; gaps are end to end distances between consecutive elements (some partly covered by grid lines, see notes)\n')
    for w in '234':
        f.write('# legend wing %s: %s\n' % (w, leg_txt[w]))
    f.write('# legend summary: wing 2 long dash 32 (31-34), gap 11; wing 3 short dash 15 (13-17), gap 9; wing 4 long 31-33 and short 13 alternating, gaps 9-10 (long/short ratio 2.4)\n')
    f.write('curve,mach,alpha_span_measured,x_band_cp,element_lengths_px,gap_lengths_px,pattern,legend_match,wing_call,confidence,alternative,notes\n')
    info = {
     'A': ('0 to 9.7', '-0.16 to -0.19', 'element mean 16.5 px (12 complete elements, 12 to 21) and gaps 3 to 15 px (most 6 to 10) vs legend wing 3 dash 15, gap 9: same scale and same form',
           'one of the 1.7 label arrows points at it near alpha 10; lowest end on the frame at Cp -0.183'),
     'M': ('0 to 9.6', '-0.21 to -0.29', 'complete long elements 52, 57, 55 (mean 55) and short 23, 21 to 27, 20 (mean 23), ratio 2.4 vs legend wing 4 long 31, short 13, ratio 2.4: same form, drawn about 1.75 times the legend scale; gaps 5 to 10 px',
           'enters from the left above alpha 5, crosses the wing 2 curve at alpha 4.8 to 5.1, then runs down and right to Cp -0.29 at alpha 2 and back to Cp -0.271 at alpha 0'),
     'R': ('0 to 9.9', '-0.13 to -0.25', 'complete long dashes 49, 51, 52, 43, 43 (mean 48), gaps 8 to 9 px where clean vs legend wing 2 dash 32, gap 11: same form, drawn about 1.5 times the legend scale',
           'straight down near Cp -0.22 above alpha 4, bends left past the Cp -0.2 grid line at alpha 1.4 to 1.8, crosses the wing 3 column at alpha 1.0 to 1.4, ends on the frame at about Cp -0.132 (uncertain end piece)'),
    }
    for cid, el, call, conf, pat, alt, lens, gaps in rows:
        span, band, match, notes = info[cid]
        notes_full = notes + '; element notes: ' + '; '.join('%d %s' % (i+1, n) for i, (k, p, q, n) in enumerate(el) if n)
        vals = [cid, '1.7', span, band, lens, gaps, pat, match, call, conf, alt, notes_full]
        f.write(','.join('"%s"' % v if (',' in v or ';' in v) else v for v in vals) + '\n')
