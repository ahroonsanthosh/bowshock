"""Run te_panel.py's measurement over the panels of R&M 3348 figs. 47 to
52 and write one JSON line per panel. Boxes (page pixels at 300 dpi) were
set from quarter-scale views of PDF pp. 81 to 86.
Usage: python3 -I te_all.py <dir with p-081.png ... p-086.png> <te_panel.py> <out.jsonl>"""
import json
import subprocess
import sys

FIGS = {47: (81, 0.70), 48: (82, 0.80), 49: (83, 0.90), 50: (84, 1.00), 51: (85, 1.11), 52: (86, 1.16)}
SMALL = {
    81: {'a': (195, 140, 350, 300), 'b': (365, 140, 525, 300), 'c': (540, 140, 700, 300),
         'd': (265, 320, 425, 475), 'e': (435, 320, 600, 475)},
    82: {'a': (205, 70, 360, 235), 'b': (375, 70, 530, 235), 'c': (545, 70, 705, 235),
         'd': (275, 250, 435, 405), 'e': (482, 250, 642, 405)},
    83: {'a': (205, 145, 365, 300), 'b': (375, 145, 530, 300), 'c': (540, 145, 700, 300),
         'd': (265, 320, 425, 470), 'e': (440, 320, 600, 475)},
    84: {'a': (190, 65, 350, 235), 'b': (365, 65, 525, 235), 'c': (540, 65, 700, 235),
         'd': (260, 250, 420, 405), 'e': (435, 250, 600, 405)},
    85: {'a': (190, 140, 350, 300), 'b': (365, 140, 525, 300), 'c': (540, 140, 700, 300),
         'd': (260, 320, 420, 475), 'e': (435, 320, 600, 475)},
    86: {'a': (195, 85, 350, 235), 'b': (365, 85, 525, 235), 'c': (540, 85, 700, 235),
         'd': (265, 265, 425, 415), 'e': (440, 265, 600, 415)},
}
SWEEP = {'a': 0, 'b': 15, 'c': 30, 'd': 45, 'e': 60}
d, script, outp = sys.argv[1:4]
with open(outp, 'w') as f:
    for fig, (page, mach) in FIGS.items():
        for panel, (sx0, sy0, sx1, sy1) in SMALL[page].items():
            box = [4 * sx0 - 40, 4 * sy0 - 40, 4 * sx1 + 40, 4 * sy1 + 40]
            r = subprocess.run(['python3', '-I', script, f'{d}/p-{page:03d}.png', *map(str, box)],
                               capture_output=True, text=True, check=True)
            o = json.loads(r.stdout)
            o.update(fig=fig, page=page, mach=mach, panel=panel, sweep=SWEEP[panel], box=box)
            f.write(json.dumps(o) + '\n')
