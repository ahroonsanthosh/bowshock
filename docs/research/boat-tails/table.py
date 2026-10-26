"""The boat-tail lane's results as a Markdown table for design record 0023
section 2.3: for each case, the characteristics' boat-tail drag
(extrapolated), linearised theory's error, and each fitted grid's error.
Usage: python3 -I table.py <out dir>"""
import glob
import json
import os
import sys

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'out')
print('| Case | Characteristics | Linearised | nj = 20 | nj = 40 | nj = 80 | nj = 160 |')
print('| --- | --- | --- | --- | --- | --- | --- |')
for path in sorted(glob.glob(os.path.join(out, '*.jsonl'))):
    rows = [json.loads(line) for line in open(path) if line.strip()]
    moc = {r['intervals']: r['tail'] for r in rows if r['kind'] == 'moc' and 'tail' in r}
    if len(moc) < 3:
        continue
    n = sorted(moc)[-3:]
    b, c = moc[n[1]], moc[n[2]]
    ref = c + (c - b) / 3
    lin = next((r['tail'] for r in rows if r['kind'] == 'linear'), None)
    fits = {r['refinement']: r for r in rows if r['kind'] == 'fit'}
    cells = []
    for r in (1, 2, 4, 8):
        f = fits.get(r)
        if f is None:
            cells.append('')
        else:
            mark = '' if f['failure'] is None else ' (refused)'
            cells.append(f'{(f["tail"] / ref - 1) * 100:+.3f}%{mark}')
    lin_cell = f'{(lin / ref - 1) * 100:+.1f}%' if lin is not None else ''
    name = os.path.basename(path)[:-6]
    print(f'| `{name}` | {ref:.7f} | {lin_cell} | ' + ' | '.join(cells) + ' |')
