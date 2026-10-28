# sides.py scriptsdir page.png spec...  where each spec is  label:o:near:a0-a1[,b0-b1...]
# o = v (vertical stroke, near = x, ranges are rows) or h (horizontal stroke, near = y, ranges are columns)
import sys
sys.path.insert(0, sys.argv[1])
import measure_lib as M
ink = M.load(sys.argv[2])
for spec in sys.argv[3:]:
    lab, o, near, rngs = spec.split(':')
    near = float(near); samples = []
    for r in rngs.split(','):
        a0, a1 = map(int, r.split('-'))
        samples += (M.vstroke if o == 'v' else M.hstroke)(ink, near, a0, a1 + 1, half=4)
    a, b, rms, n = M.robust_line(samples)
    t = [s[0] for s in samples]; tm = 0.5 * (min(t) + max(t))
    vals = [round(s[1], 1) for s in samples]
    print('%-14s %s pos %.2f at %s=%.1f (slope %.4f, rms %.2f, n %d/%d)  %s' % (lab, o, a + b * tm, 'y' if o == 'v' else 'x', tm, b, rms, n, len(samples), vals))
