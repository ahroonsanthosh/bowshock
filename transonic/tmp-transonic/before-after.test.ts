/**
 * The before-and-after table of every certified and recorded transonic number (review of
 * aed95b0): the offline CPU families and nested base grids, the band under the allowance rule
 * as reviewed (aed95b0 to ad0e20e) and under the corrected rule (S2, S3) with the exact check
 * (S6). Prints markdown rows.
 */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { exactDrag } from '../../src/analysis/transonic-drag';
import type { Body } from '../../src/geometry/body';
import { domainAllowance } from '../../src/verification/domain-allowance';
import { gridConvergence } from '../../src/verification/grid-convergence';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};
const D = [55.10160405104679, 100.60719837318378, 224.2118229126046, 408.7461074989818] as const;
// Cylinder lengths in calibers of the nested grids (xEnd - L) / 2: 5, 10 and 20 asked.
const L = 1 / Math.tan((6 + 59 / 60) * deg);
const C5 = (19.214244588210985 - L) / 2;
const C10 = (28.163978552142765 - L) / 2;
const C20 = (52.161104816630946 - L) / 2;

/** The rule as reviewed: negligible within a quarter of the band or 10 x noise x value; else geometric; else refused. */
function oldAllowance(v: readonly [number, number, number], band: number, noise: number): number | null {
  const a = v[1] - v[0];
  const b = v[2] - v[1];
  const largest = Math.max(Math.abs(a), Math.abs(b));
  if (largest <= band / 4 || largest <= 10 * noise * Math.max(...v.map(Math.abs))) return largest;
  if (a * b > 0 && Math.abs(b / a) <= 0.6) return Math.abs(b) / (1 - Math.abs(b / a));
  return null;
}

interface Case {
  name: string;
  family: number[];
  far: [number, number, number];
  farD: [number, number, number];
  cyl: [number, number, number];
  mach: number;
}
const cases: Case[] = [
  {
    name: 'cone 7 deg, Mach 1.2 (r = 1 to 8)',
    family: [0.08321842815685355, 0.08305473158102415, 0.0830206160762542, 0.08301323443404968],
    far: [0.08321843162819731, 0.08321842815685355, 0.08321843684969224],
    farD: [D[0], D[1], D[2]],
    cyl: [0.08321843061525593, 0.08321842815685355, 0.08321843600632188],
    mach: 1.2,
  },
  {
    name: 'cone 7 deg, Mach 1.1 (r = 2 to 16)',
    family: [0.09446444072558348, 0.09448214156620545, 0.09449128217105732, 0.0944949749444897],
    far: [0.09446829964266552, 0.09446829629185434, 0.09446829447344199],
    farD: [D[0], D[1], D[2]],
    cyl: [0.09446830676511346, 0.09446829629185434, 0.09446830603533424],
    mach: 1.1,
  },
  {
    name: 'cone 7 deg, Mach 1.1 (r = 1 to 8)',
    family: [0.09446829629185434, 0.09446444072558348, 0.09448214156620545, 0.09449128217105732],
    far: [0.09446829964266552, 0.09446829629185434, 0.09446829447344199],
    farD: [D[0], D[1], D[2]],
    cyl: [0.09446830676511346, 0.09446829629185434, 0.09446830603533424],
    mach: 1.1,
  },
  {
    name: 'cone 7 deg, Mach 1.05 (r = 1 to 8)',
    family: [0.10651053183048755, 0.10686619083144872, 0.10703756313485618, 0.10711161750489769],
    far: [0.10650412065557352, 0.10651053183048755, 0.10651040821945537],
    farD: [D[0], D[1], D[2]],
    cyl: [0.1065105378360506, 0.10651053183048755, 0.10651053246979673],
    mach: 1.05,
  },
];

const e = (x: number | null | undefined) => (x === null || x === undefined ? 'refused' : x.toExponential(3));

it('before and after', () => {
  const noise = 1e-7;
  const rows: string[] = [
    '| Case | Value | Grids | Floor | Far, before | Far, after | Cylinder, before | Cylinder, after | Band, before | Band, after | Exact check |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const c of cases) {
    const est = gridConvergence(c.family, { orderTolerance: 0.5, noise });
    if (est.kind === 'unresolved') {
      rows.push(`| ${c.name} | no band: ${est.reason} | | | | | | | refused | refused | |`);
      continue;
    }
    const grids = est.uncertainty;
    const floor = 7e-5 * Math.abs(est.value);
    const farOld = oldAllowance(c.far, grids, noise);
    const cylOld = oldAllowance(c.cyl, grids, noise);
    const farNew = domainAllowance(c.far, c.farD, noise);
    const cylNew = domainAllowance(c.cyl, [C5, C10, C20], noise);
    const fn = farNew.kind === 'refused' ? null : farNew.allowance;
    const cn = cylNew.kind === 'refused' ? null : cylNew.allowance;
    const before = farOld === null || cylOld === null ? null : grids + floor + farOld + cylOld;
    const after = fn === null || cn === null ? null : grids + floor + fn + cn;
    const exact = exactDrag(cone, c.mach, 1.4);
    const check =
      exact === null
        ? 'none'
        : `${exact.value.toFixed(7)}, error ${(est.value - exact.value).toExponential(2)}, ${after !== null && Math.abs(est.value - exact.value) <= after ? 'inside' : 'OUTSIDE'}`;
    rows.push(
      `| ${c.name} | ${est.value.toFixed(7)} | ${e(grids)} | ${e(floor)} | ${e(farOld)} | ${e(fn)} (${farNew.kind}) | ${e(cylOld)} | ${e(cn)} (${cylNew.kind}) | ${e(before)} | ${e(after)} | ${check} |`,
    );
  }
  // Allowances recorded in 0013 without a family.
  const nested: [string, readonly [number, number, number, number], number][] = [
    ['5-cal. ogive, Mach 1.1', [0.043520201980717405, 0.04352020192142608, 0.04352019786180999, 0.043520204527045046], 1.1],
    ['5-cal. ogive, Mach 1.05', [0.04181776788920967, 0.04182875391945238, 0.04183116792884408, 0.04183116468745445], 1.05],
    ['cone, Mach 1.02', [0.10903164228339668, 0.109800801244637, 0.10969795361513447, 0.10969998420500345], 1.02],
    ['cone, Mach 1.01', [0.09975348457485804, 0.10261026960618434, 0.10351345309568905, 0.1034732094263092], 1.01],
    ['cone, Mach 1.0', [0.0897884889365743, 0.09171531708471234, 0.09292826439834694, 0.09328843962216965], 1.0],
    ['5-cal. ogive, Mach 1.0', [0.015531346369411083, 0.01717069015991946, 0.018406814640679985, 0.01886773676334449], 1.0],
  ];
  rows.push('', '| Far boundaries only | Family | Before (band 0) | After | C(408.7) - C(100.6) |', '| --- | --- | --- | --- | --- |');
  for (const [name, v] of nested) {
    const three = [v[0], v[1], v[2]] as [number, number, number];
    const moved = [v[1], v[2], v[3]] as [number, number, number];
    const old100 = oldAllowance(three, 0, noise);
    const new100 = domainAllowance(three, [D[0], D[1], D[2]], noise);
    rows.push(`| ${name} | 100.6 | ${e(old100)} | ${e(new100.kind === 'refused' ? null : new100.allowance)} (${new100.kind}) | ${(v[3] - v[1]).toExponential(3)} |`);
    const old224 = oldAllowance(moved, 0, noise);
    const new224 = domainAllowance(moved, [D[1], D[2], D[3]], noise);
    rows.push(`| ${name} | 224.2 | ${e(old224)} | ${e(new224.kind === 'refused' ? null : new224.allowance)} (${new224.kind}) | (no larger domain) |`);
  }
  writeFileSync('tests/tmp-transonic/before-after.md', rows.join('\n') + '\n');
});
