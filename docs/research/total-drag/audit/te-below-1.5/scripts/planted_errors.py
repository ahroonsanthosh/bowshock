"""Planted errors (0019 section 3.4.1): apply each mutation to the source, run the trailing-edge tests, record which
fail, restore the file. Run from the repository root:
  python3 -I docs/research/total-drag/audit/te-below-1.5/scripts/planted_errors.py > docs/research/total-drag/audit/te-below-1.5/planted-errors.out"""
import subprocess

TESTS = ['tests/base/fin-trailing-edge-transonic.test.ts', 'tests/base/fin-trailing-edge.test.ts',
         'tests/base/fin-trailing-edge-transonic-independent.test.ts']
MUTATIONS = [
    ('window cut to the node and the next one', 'src/base/fin-te-transonic.ts',
     'const a = TRANSONIC_TE_NODES[Math.max(0, k - 1)]!;', 'const a = TRANSONIC_TE_NODES[k]!;'),
    ('the two-sided fallback ignored after the contradiction', 'src/base/fin-te-transonic.ts',
     'export const SHAPE_WIDENING_TWO_SIDED = true;', 'export const SHAPE_WIDENING_TWO_SIDED = false;'),
    ('the shape allowance halved', 'src/base/fin-te-transonic.ts',
     'const s = (allowance * p.properties.faceAngleDeg) / SHAPE_REFERENCE_ANGLE_DEG;',
     'const s = (0.5 * allowance * p.properties.faceAngleDeg) / SHAPE_REFERENCE_ANGLE_DEG;'),
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
     '  if (laminar) all.push(laminarBelowBand());', '  if (laminar) void laminarBelowBand;'),
    ('only the first reason given for an edge beyond the reach and laminar (review F10)',
     'src/base/fin-trailing-edge.ts',
     '  if (all.length > 1) throw new TrailingEdgeRefusals(all);', '  if (all.length > 1) throw all[0]!;'),
    ('the layer reach taken at each set\'s greatest X', 'src/base/fin-te-transonic.ts',
     '.map((r) => r.point.properties.layer?.[0])', '.map((r) => r.point.properties.layer?.[1])'),
    ('a layer without roughness counted toward the reach (item 6)', 'src/base/fin-te-transonic.ts',
     'layer: turbulent ? layer : undefined,', 'layer,'),
    ('a disputed wing taken as a flat wing 2 (item 6)', 'src/base/fin-te-transonic.ts',
     "        shape: 'converging',\n        faceAngleDeg: 6.88,\n        hOverC: 0.03,",
     "        shape: 'flat',\n        faceAngleDeg: 0,\n        hOverC: 0.03,"),
    # The independent reviewer's plants that the tests of 5ec61dd did not catch (review F3).
    ("the window by each point's nominal Mach number, its interval ignored (review P1)",
     'src/base/fin-te-transonic.ts',
     'const inWindow = ratios.filter((r) => r.point.machHigh >= a && r.point.machLow <= b);',
     'const inWindow = ratios.filter((r) => r.point.mach >= a && r.point.mach <= b);'),
    ('K dropped from the served term below 1.5 (review P2)', 'src/base/fin-trailing-edge.ts',
     '  const k = thickLayerFactor(basis.kMach, thin);\n',
     '  const k = basis.belowBand ? thickLayerFactor(basis.kMach, 1) : thickLayerFactor(basis.kMach, thin);\n'),
    ('K read at Mach 2.0 below 1.5 (review P2b)', 'src/base/fin-trailing-edge.ts',
     '    kMach: above,\n    belowBand: true,', '    kMach: 2.0,\n    belowBand: true,'),
    ('RM A52E01 counted toward the layer reach (review F2)', 'src/base/fin-te-transonic.ts',
     "        hOverC: 0.03,\n        layer: undefined,\n        ratioLayer: [0, wing34[1]],",
     "        hOverC: 0.03,\n        layer: wing2,\n        ratioLayer: [0, wing34[1]],"),
    ('RM A51J11 without its +-0.02 Mach margin, every point at +-0 (review F1)', 'src/base/fin-te-transonic-data.ts',
     None, None),
    # F4: RM A52E01's wing 2 at Mach 1.7 in the band above 1.5.
    ("F4: wing 2 at Mach 1.7 left out of the band above 1.5", 'src/base/fin-trailing-edge.ts',
     'band: { low: bandLowAbove(mach), high: FIN_TRAILING_EDGE_BAND.high },', 'band: FIN_TRAILING_EDGE_BAND,'),
    ("F4: C's bound taken as its value", 'src/base/fin-trailing-edge.ts',
     'cpHigh: -0.131 + 0.0103,', 'cpHigh: -0.131,'),
    ("F4: D's alternative end left out", 'src/base/fin-trailing-edge.ts',
     'cpLow: -0.1469,', 'cpLow: -0.1413,'),
    ('F4: the widening at every Mach number above 1.5', 'src/base/fin-trailing-edge.ts',
     'const meets = p.mach + p.machErr >= a && p.mach - p.machErr <= b;', 'const meets = true;'),
    ('F4: the ratio at the turbulent K only, not from a thin layer', 'src/base/fin-trailing-edge.ts',
     'for (const kk of [1, k])', 'for (const kk of [k])'),
    ("F4: #7's shape widening dropped (any wing, 6.88 deg)", 'src/base/fin-trailing-edge.ts',
     '  const s = (transonicTrailingEdge().shapeAllowance * p.faceAngleDeg) / 4;', '  const s = 0;'),
    ("F4: #7 taken as wing 2 (no shape widening, wing 2's layer)", 'src/base/fin-trailing-edge.ts',
     '  hOverC: 0.015,\n  reynolds: 1.5e6,\n  faceAngleDeg: 6.88,', '  hOverC: 0.03,\n  reynolds: 1.5e6,\n  faceAngleDeg: 0,'),
]

def f1_plant(src):
    """RM A51J11's points at +-0 in Mach (its readings' own errors are 0 to 0.003)."""
    import re
    start = src.index("set: 'RM A51J11 fig. 14'")
    end = src.index("set: 'RM A52E01")
    seg = re.sub(r"(\[\s*'[^']*',\s*'[^']*',\s*[0-9.]+,\s*)0\.02(,)", r"\g<1>0\2", src[start:end])
    return src[:start] + seg + src[end:]


for name, path, old, new in MUTATIONS:
    src = open(path).read()
    if old is None:
        mutated = f1_plant(src)
        if mutated == src:
            print(f'SKIP (no change): {name}')
            continue
        open(path, 'w').write(mutated)
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
        continue
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
