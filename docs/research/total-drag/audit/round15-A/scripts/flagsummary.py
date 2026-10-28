# Compact list of flagged rows, grouped by panel, series and reason.
# usage: python3 -I flagsummary.py readings_dir out.txt
import sys, csv, os, collections
d, out = sys.argv[1], sys.argv[2]
cats = [('merged', 'merged ink, box'), ('lies along the', 'hidden along a grid line, box'), ('meets a grid line', 'ink cut by a grid line, bridged'),
        ('long gap', 'long dash gap bridged'), ('large reading error', 'large error (steep or curving)'),
        ('taken as crossing', 'fig. 15 start: cross or touch identity'), ('touching, because', 'fig. 15 start: cross or touch identity'),
        ('hook', 'hook or turning region, read by hand'), ('axis', 'end or zero at the axis line, read by hand'),
        ('end near a grid line', 'end on or near a grid line'), ('ends on the alpha', 'end on or near a grid line'), ('runs into the crossing', 'end on or near a grid line'), ('runs down the', 'hidden along a grid line, box'), ('lies along the -', 'hidden along a grid line, box'), ('wing 2 / wing 4', 'wing 2 or wing 4 identity by dash pattern'),
        ('supersonic panel', 'supersonic panel, wing not identified')]
lines = []
for fn in sorted(os.listdir(d)):
    if not fn.endswith('.csv'):
        continue
    rows = [r for r in csv.reader(l for l in open(os.path.join(d, fn)) if not l.startswith('#'))][1:]
    g = collections.OrderedDict()
    for r in rows:
        if r[11] != 'uncertain':
            continue
        note = r[12]
        reasons = [c[1] for c in cats if c[0] in note] or ['other: ' + note[:80]]
        # abscissa of the reading: x for A51 (Mach or 2y/b), y (alpha) for fig. 8
        ab = r[6] if fn.startswith('a51') else r[8]
        key = (r[2], r[3])
        for rs in dict.fromkeys(reasons):
            g.setdefault(key, collections.OrderedDict()).setdefault(rs, []).append('%s %s' % (r[1].replace('curve_at_zero', 'zero').replace('curve_end', 'end').replace('curve', 'c'), ab))
    n = sum(1 for r in rows if r[11] == 'uncertain')
    lines.append('%s: %d flagged of %d rows' % (fn, n, len(rows)))
    for (panel, series), rr in g.items():
        lines.append('  %s %s' % (panel, series))
        for rs, items in rr.items():
            lines.append('    %s: %s' % (rs, ', '.join(items)))
open(out, 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
