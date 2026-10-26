"""Summarise calibration logs into markdown. usage: calsummary.py LOG [LOG...]
Labelled lines are listed in full; unlabelled grid lines (valued from the
regular spacing between labels) are summarised by count and largest residual."""
import sys, re
NAMES = {'fig7': 'RM E51F26 fig. 7, PDF p. 29', 'fig8': 'RM E51F26 fig. 8, PDF p. 30', 'fig24e': 'RM E51F26 fig. 24, PDF p. 48',
         'fig29e': 'RM E51F26 fig. 29, PDF p. 56', 'fig30e': 'RM E51F26 fig. 30, PDF p. 57', 'tn19': 'TN 3819 fig. 19, PDF p. 50',
         'tn21': 'TN 3819 fig. 21, PDF p. 52 (page rotated 90 deg clockwise for reading)', 'tn23': 'TN 3819 fig. 23, PDF p. 54 (rotated 90 deg clockwise)',
         'tn24': 'TN 3819 fig. 24, PDF p. 55 (rotated 90 deg clockwise)', 'tn25': 'TN 3819 fig. 25(b), PDF p. 56 (rotated 90 deg clockwise)',
         'a15': 'RM A52E20 fig. 15, PDF p. 44', 't10': 'TN 3372 fig. 10, PDF p. 19', 't12': 'TN 3372 fig. 12, PDF p. 20'}
for f in sys.argv[1:]:
    txt = open(f).read().splitlines()
    key = f.split('/')[-1].replace('.log', '')
    unl = {}
    def flush():
        for ax_, (n, mx) in sorted(unl.items()):
            print('| %s | %d unlabelled grid lines | no | | largest residual %.2f px |' % (ax_, n, mx))
        unl.clear()
    for ln in txt:
        m = re.match(r'panel (\S+) box (.*)', ln)
        if m:
            flush()
            print('\n%s, panel %s (plot box %s px; scan 300 dpi):\n' % (NAMES[key], m.group(1), m.group(2)))
            print('| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |')
            print('| --- | --- | --- | --- | --- |')
            continue
        m = re.match(r'\s+line (x|y)=(\S+) (LABELLED|unlabelled): px at band ends/mid (\S+) (\S+) (\S+) \(fit sd (\S+) px, n=(\d+)\); residual value .*; residual px (\S+) (\S+) (\S+)', ln)
        if m:
            if m.group(3) == 'LABELLED':
                print('| %s | %s | yes | %s, %s, %s | %s, %s, %s |' % (m.group(1), m.group(2), m.group(4), m.group(5), m.group(6), m.group(9), m.group(10), m.group(11)))
            else:
                mx = max(abs(float(m.group(k))) for k in (9, 10, 11))
                n, old = unl.get(m.group(1), (0, 0.0))
                unl[m.group(1)] = (n + 1, max(old, mx))
            continue
        m = re.match(r'\s+axis (x|y) \((\S+)\): value = (.*)', ln)
        if m:
            flush()
            print('| %s fit | %s | | | |' % (m.group(1), m.group(3)))
            continue
        m = re.match(r'\s+calibration rms over all lines: (.*)', ln)
        if m:
            flush()
            print('\nResidual rms over all lines, labelled and unlabelled: %s.' % m.group(1))
