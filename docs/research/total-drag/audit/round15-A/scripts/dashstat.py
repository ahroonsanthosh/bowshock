# Clean dash elements: ink stretches bounded on both sides by real gaps (>= 4 px), not by grid bands.
# usage: python3 -I dashstat.py "<dash2 output line>"...
import sys, re
for line in sys.argv[1:]:
    name, rest = line.split(' ', 1) if not line.startswith('wing') else (' '.join(line.split(' ')[:2]), ' '.join(line.split(' ')[2:]))
    toks = rest.split()
    els = []
    for i in range(1, len(toks) - 1):
        if toks[i][0] == '#' and toks[i-1][0] == '.' and toks[i+1][0] == '.' and int(toks[i-1][1:]) >= 4 and int(toks[i+1][1:]) >= 4:
            els.append(int(toks[i][1:]))
    gaps = [int(t[1:]) for t in toks if t[0] == '.' and 4 <= int(t[1:]) <= 40]
    print('%-8s clean dashes %s | gaps %s' % (name, sorted(els), sorted(gaps)))
