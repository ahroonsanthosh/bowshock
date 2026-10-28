"""Summary of out/flat-face.jsonl (design record 0016 section 21.3): one line per solve and the
registered verdict. Run from the repository root: python3 -I docs/research/square-edge/summary.py"""
import json
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'docs/research/square-edge/out/flat-face.jsonl'
rows = [json.loads(line) for line in open(path)]
P_STAR = 0.5282817877171742


def f(x, fmt='%.3f'):
    return 'none' if x is None else fmt % x


def face(e, key):
    # An envelope with no samples (a solve that stopped before its second half) is printed empty.
    return 'empty' if e.get('samples', 1) == 0 else f(e[key])


print('M     rho   grid     steps  residual  | face: max M  min p/p02  max p/p02 | mean min-max   | sonic point')
for d in rows:
    e = d['envelope']
    print('%-5s %-5s %3dx%-3d %6d  %8s  |       %s    %s      %s     | %s-%s    | %s %s' % (
        d['mach'], d['rho'], d['ni'], d['nj'], d['steps'], f(d['residual'], '%.1e'),
        face(e, 'maxIsentropicMachFace'), face(e, 'minPOverP02Face'), face(e, 'maxPOverP02Face'),
        face(e, 'faceMeanMin'), face(e, 'faceMeanMax'), '; '.join(e['sonicAt']), d['note'][:60]))

print()
print('The registered pass criterion (0016 section 21.3, as amended before the runs), on the finest grid:')
verdict = True
for mach in sorted({d['mach'] for d in rows}):
    for rho in sorted({d['rho'] for d in rows}):
        lv = sorted((d for d in rows if d['mach'] == mach and d['rho'] == rho), key=lambda d: d['level'])
        if len(lv) < 3:
            print(f'  M {mach} rho {rho}: only {len(lv)} grids')
            verdict = False
            continue
        mid, fine = lv[1]['envelope'], lv[2]['envelope']
        if fine['minPOverP02Face'] is None or mid['minPOverP02Face'] is None:
            print(f'  M {mach} rho {rho}: no envelope (a solve stopped early)')
            verdict = False
            continue
        change = abs(fine['minPOverP02Face'] - mid['minPOverP02Face'])
        ok_m = fine['maxIsentropicMachFace'] < 1
        ok_lo = fine['minPOverP02Face'] - P_STAR > change
        ok_hi = fine['maxPOverP02Face'] <= 1 + change
        ok = ok_m and ok_lo and ok_hi
        verdict = verdict and ok
        print(f"  M {mach} rho {rho}: max wall Mach {fine['maxIsentropicMachFace']:.3f}, "
              f"least p/p02 {fine['minPOverP02Face']:.3f} (p* {P_STAR:.3f}, margin {fine['minPOverP02Face'] - P_STAR:.3f} "
              f"against the change {change:.3f}), largest p/p02 {fine['maxPOverP02Face']:.3f}: {'pass' if ok else 'FAIL'}")
print('Verdict:', 'pass' if verdict else 'fail')
