"""Planted errors (0019 section 3.4.1): apply each mutation to the source, run the trailing-edge tests, record which
fail, restore the file. Run from the repository root:
  python3 -I docs/research/total-drag/audit/te-below-1.5/scripts/planted_errors.py > docs/research/total-drag/audit/te-below-1.5/planted-errors.out"""
import subprocess

TESTS = ['tests/base/fin-trailing-edge-transonic.test.ts', 'tests/base/fin-trailing-edge.test.ts']
MUTATIONS = [
    ('window cut to the node and the next one', 'src/base/fin-te-transonic.ts',
     'const a = TRANSONIC_TE_NODES[Math.max(0, k - 1)]!;', 'const a = TRANSONIC_TE_NODES[k]!;'),
    ('shape widening on the wrong side', 'src/base/fin-te-transonic.ts',
     "const down = p.properties.shape === 'diverging'", "const down = p.properties.shape === 'converging'"),
    ('a Johnston reading misread by 0.05 in Cp_b', 'src/base/fin-te-transonic-data.ts',
     "['a0_11', 'alpha 0 deg', 1.009, 0.01, -0.9007, -0.9007]",
     "['a0_11', 'alpha 0 deg', 1.009, 0.01, -0.9507, -0.9507]"),
    ('the floor 0.93 to 1.21 dropped below 1.5', 'src/base/fin-trailing-edge.ts',
     'low: Math.min(FIN_TRAILING_EDGE_BAND.low, e.low),', 'low: e.low,'),
    ('the nominal not joined to the curve at 1.5', 'src/base/fin-te-transonic.ts',
     'if (m === hi) return deps.cpAt15;', 'if (m === hi) return deps.cpAt15 * 1.03;'),
    ('the Mach floor moved to 0.95', 'src/base/fin-te-transonic.ts',
     'export const TRANSONIC_TE_MACH_RANGE = [1.0, 1.5] as const;',
     'export const TRANSONIC_TE_MACH_RANGE = [0.95, 1.5] as const;'),
    ('the laminar refusal below 1.5 removed', 'src/base/fin-trailing-edge.ts',
     'if ((input.transitionReynolds ?? []).some((reT) => reT >= reChord)) throw laminarBelowBand();',
     'if ((input.transitionReynolds ?? []).some((reT) => reT >= reChord)) void 0;'),
    ('the layer reach taken at each set\'s greatest X', 'src/base/fin-te-transonic.ts',
     '.map((r) => r.point.properties.layer?.[0])', '.map((r) => r.point.properties.layer?.[1])'),
    ('a layer without roughness counted toward the reach (item 6)', 'src/base/fin-te-transonic.ts',
     'layer: turbulent ? layer : undefined,', 'layer,'),
    ('a disputed wing taken as a flat wing 2 (item 6)', 'src/base/fin-te-transonic.ts',
     "        shape: 'converging',\n        faceAngleDeg: 6.88,\n        hOverC: 0.03,",
     "        shape: 'flat',\n        faceAngleDeg: 0,\n        hOverC: 0.03,"),
]

for name, path, old, new in MUTATIONS:
    src = open(path).read()
    if src.count(old) != 1:
        print(f'SKIP (not found once): {name}')
        continue
    open(path, 'w').write(src.replace(old, new))
    try:
        r = subprocess.run(['npx', 'vitest', 'run', *TESTS], capture_output=True, text=True, timeout=600)
        out = r.stdout + r.stderr
        failed = [l.strip() for l in out.splitlines() if l.strip().startswith('×')]
        summary = [l.strip() for l in out.splitlines() if l.strip().startswith('Tests ')]
        print(f"{'CAUGHT' if r.returncode != 0 else 'MISSED'}: {name}: {summary[-1] if summary else out[-300:]}")
        for f in failed:
            print('    ', f)
    finally:
        open(path, 'w').write(src)
