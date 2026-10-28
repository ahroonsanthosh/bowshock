"""Planted errors (0019 section 3.4.1): apply each mutation to the source, run the trailing-edge tests, record which
fail, restore the file. Run from the repository root:
  python3 -I docs/research/total-drag/audit/te-below-1.5/scripts/planted_errors.py > docs/research/total-drag/audit/te-below-1.5/planted-errors.out
A mutation's edit is one (old, new) pair, or a list of pairs with new None; a fifth element names
further test files to run for it."""
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
     [("      reasons.push({ key: 'laminar below 1.5', refusal: laminarBelowBand() });\n    }\n"
       "  } else reasons.push(...thickLayerReasons(basis.kMach, [thin]));",
       "      void laminarBelowBand;\n    }\n  } else reasons.push(...thickLayerReasons(basis.kMach, [thin]));"),
      ("      reasons.push({ key: 'laminar below 1.5', refusal: laminarBelowBand() });\n    }\n"
       "  } else reasons.push(...thickLayerReasons(basis.kMach, stations.map(parameter)));",
       "      void laminarBelowBand;\n    }\n"
       "  } else reasons.push(...thickLayerReasons(basis.kMach, stations.map(parameter)));")], None),
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
    # F4 and R1: RM A52E01's lines at Mach 1.7 in the band above 1.5, both ends.
    ("F4: RM A52E01's lines at Mach 1.7 left out of the band above 1.5", 'src/base/fin-trailing-edge.ts',
     'band: bandAbove(mach),', 'band: FIN_TRAILING_EDGE_BAND,'),
    ("F4: C's bound on #10 taken as its value", 'src/base/fin-te-transonic-data.ts',
     "['M=1.2, 1.4, 1.7 #10 (C)', 'any wing', 1.7, 0.01, -0.1413, -0.1207],",
     "['M=1.2, 1.4, 1.7 #10 (C)', 'any wing', 1.7, 0.01, -0.131, -0.131],"),
    ("F4: D's alternative end left out", 'src/base/fin-trailing-edge.ts',
     '? [RM_A52E01_LINE10_ALTERNATIVE_END]', '? []'),
    ('F4: the widening at every Mach number above 1.5', 'src/base/fin-trailing-edge.ts',
     'const meets = l.mach + l.machErr >= a && l.mach - l.machErr <= b;', 'const meets = true;'),
    ('F4: the ratio at the turbulent K only, not from a thin layer', 'src/base/fin-trailing-edge.ts',
     'for (const kk of [1, k])', 'for (const kk of [k])'),
    ('F4: the shape widening dropped above 1.5 (any wing, 6.88 deg)', 'src/base/fin-trailing-edge.ts',
     "  const s = l.shape === 'flat' ? 0 : (transonicTrailingEdge().shapeAllowance * l.faceAngleDeg) / 4;",
     '  const s = 0;'),
    ("F4: #7 taken as wing 3, the readers' call (the rule as written makes it any wing)",
     'src/base/fin-te-transonic-data.ts',
     [("['M=1.2, 1.4, 1.7 #7 (C)', 'any wing',", "['M=1.2, 1.4, 1.7 #7 (C)', 'wing 3',"),
      ("['M=1.2, 1.4, 1.7 #7 (D)', 'any wing',", "['M=1.2, 1.4, 1.7 #7 (D)', 'wing 3',")], None),
    ("F4: #10 taken as wing 2, as the first application did (the rule as written makes it any wing)",
     'src/base/fin-te-transonic-data.ts',
     [("['M=1.2, 1.4, 1.7 #10 (C)', 'any wing',", "['M=1.2, 1.4, 1.7 #10 (C)', 'wing 2',"),
      ("['M=1.2, 1.4, 1.7 #10 (D)', 'any wing',", "['M=1.2, 1.4, 1.7 #10 (D)', 'wing 2',")], None),
    # R1 (the re-review of 5ec61dd..ae4d478): every agreeing line at Mach 1.7 enters at both ends.
    ('R1: the high end not widened (the low end only, as F4 first did)', 'src/base/fin-trailing-edge.ts',
     'if (meets) [low, high] = [Math.min(low, r.low), Math.max(high, r.high)];',
     'if (meets) [low, high] = [Math.min(low, r.low), high];'),
    ('R1: fig. 8(a) #9 left out of the band', 'src/base/fin-trailing-edge.ts',
     'const ratios = ABOVE_BAND_LINES.map((l) => [l, aboveRatios(l)] as const);',
     "const ratios = ABOVE_BAND_LINES.filter((l) => !l.curve.endsWith(' #9')).map((l) => [l, aboveRatios(l)] as const);"),
    ("R1: #9 taken as wing 4, the readers' call (the rule as written makes it any wing)",
     'src/base/fin-te-transonic-data.ts',
     [("['M=1.2, 1.4, 1.7 #9 (C)', 'any wing',", "['M=1.2, 1.4, 1.7 #9 (C)', 'wing 4',"),
      ("['M=1.2, 1.4, 1.7 #9 (D)', 'any wing',", "['M=1.2, 1.4, 1.7 #9 (D)', 'wing 4',"),
      ("['M=1.2, 1.4, 1.7 #9 (B)', 'any wing',", "['M=1.2, 1.4, 1.7 #9 (B)', 'wing 4',")], None),
    # R2: every reason, each once.
    ('R2: the coverage below 1.5 stops at its first reason (h/c 0.25 with X 0.8 at M 1.3)',
     'src/base/fin-trailing-edge.ts',
     '  return out; // every coverage reason', '  return out.slice(0, 1); // every coverage reason'),
    ("R2: the stations stop at the first one refused (a tapered plate, root X 1.7, tip h/c 0.3)",
     'src/base/fin-trailing-edge.ts',
     '      coverage.push(...transonicCoverageReasons(mach, parameter(y), thicknessAt(y) / chordAt(y)));',
     '      if (coverage.length === 0)\n        coverage.push(...transonicCoverageReasons(mach, parameter(y), thicknessAt(y) / chordAt(y)));'),
    ('R2: a swept edge refused before anything else (a swept laminar edge)', 'src/base/fin-trailing-edge.ts',
     "  if (input.tanSweep !== 0) early.push({ key: 'swept', refusal: sweptRefusal() });",
     '  if (input.tanSweep !== 0) throw sweptRefusal();'),
    # The quick look on ae4d478..1994584: the thick layer above 1.5 beside a sweep or a laminar layer.
    ('the thick-layer reason dropped above 1.5 (swept, laminar, X 4.7 at Mach 2.0; the quick look)',
     'src/base/fin-trailing-edge.ts',
     '  } else reasons.push(...thickLayerReasons(basis.kMach, [thin]));',
     '  } else void thickLayerReasons;'),
    ('the thick-layer reason dropped above 1.5 on fins of varying chord (the same, tapered)',
     'src/base/fin-trailing-edge.ts',
     '  } else reasons.push(...thickLayerReasons(basis.kMach, stations.map(parameter)));',
     '  } else void thickLayerReasons;'),
    # The review of B1 on main (M3): the layer reach over each series' own Mach intervals.
    ("M3: the layer reach by the nodes' windows alone (the old rule, RM A51J11's X to the node at 1.15)",
     'src/base/fin-te-transonic.ts',
     'return Math.min(a.layerReached, b.layerReached, Math.max(0, ...measured));',
     'return Math.min(a.layerReached, b.layerReached);'),
    # R3: the band text above 1.5 in the total.
    ("R3: the total's band text above 1.5 without the widening", 'src/total/finned-body.ts',
     ': widenedAbove(trailingEdgeBasis(conditions.mach).band)', ': false && widenedAbove(trailingEdgeBasis(conditions.mach).band)',
     ['tests/total/refused-floor.test.ts']),
]

def f1_plant(src):
    """RM A51J11's points at +-0 in Mach (its readings' own errors are 0 to 0.003)."""
    import re
    start = src.index("set: 'RM A51J11 fig. 14'")
    end = src.index("set: 'RM A52E01")
    seg = re.sub(r"(\[\s*'[^']*',\s*'[^']*',\s*[0-9.]+,\s*)0\.02(,)", r"\g<1>0\2", src[start:end])
    return src[:start] + seg + src[end:]


def run(name, extra):
    r = subprocess.run(['npx', 'vitest', 'run', *TESTS, *extra], capture_output=True, text=True, timeout=900)
    out = r.stdout + r.stderr
    failed = [l.strip() for l in out.splitlines() if l.strip().startswith('×')]
    summary = [l.strip() for l in out.splitlines() if l.strip().startswith('Tests ')]
    print(f"{'CAUGHT' if r.returncode != 0 else 'MISSED'}: {name}: {summary[-1] if summary else out[-300:]}", flush=True)
    for f in failed:
        print('    ', f, flush=True)


for name, path, old, new, *rest in MUTATIONS:
    extra = rest[0] if rest else []
    src = open(path).read()
    if old is None:
        mutated = f1_plant(src)
    else:
        # One edit, or several (each found once), all applied together.
        edits = old if isinstance(old, list) else [(old, new)]
        mutated = src
        for a, b in edits:
            if mutated.count(a) != 1:
                mutated = None
                break
            mutated = mutated.replace(a, b)
        if mutated is None:
            print(f'SKIP (not found once): {name}', flush=True)
            continue
    if mutated == src:
        print(f'SKIP (no change): {name}', flush=True)
        continue
    open(path, 'w').write(mutated)
    try:
        run(name, extra)
    finally:
        open(path, 'w').write(src)
