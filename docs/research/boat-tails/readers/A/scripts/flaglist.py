"""List non-ok rows of the figure CSVs as markdown. usage: flaglist.py CSV [CSV...]"""
import csv, sys, re
for f in sys.argv[1:]:
    rows = [r for r in csv.DictReader(open(f)) if r['flag'] != 'ok']
    if not rows:
        continue
    name = f.split('/')[-1]
    curve = [r for r in rows if r['flag'] == 'curve']
    other = [r for r in rows if r['flag'] != 'curve']
    print('\n%s:\n' % name)
    for r in other:
        note = re.sub(r'; centre px .*', '', r['note'])
        drop = ('1.91 is the free-stream', 'figure 24 gives no Mach', 'M1 being', 'the text (PDF p. 15) says M1', 'legend: all experimental',
                'the legend does not say what', 'the mach column repeats', 'Mach number from the caption', 'source as the legend',
                'one model of configuration D', 'Mach number read from', 'Mach 1.91 is', 'panel (')
        note = '; '.join(part for part in note.split('; ') if part and not part.startswith(drop))
        if not note:
            note = 'a clear symbol whose printed centre dot lies more than 2.5 px from the centre of its outline'
        print('- %s, %s, x %s, y %s: %s. Seen: %s.%s' % (r['item'], r['series'], r['x'] or '(none)', r['y'] or '(empty)', r['flag'],
              note, (' Alternatives: ' + r['alternatives'] + '.') if r['alternatives'] else ''))
    if curve:
        items = sorted(set(r['series'] for r in curve))
        print('- %d rows flagged `curve` (%s): values read on drawn curves, see section 4.' % (len(curve), '; '.join(items)))
