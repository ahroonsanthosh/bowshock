/**
 * Stage A's scope (docs/design/0021-3d-euler-fins.md, revision 3, section
 * 6.4), estimated on the refusal audit's population (./population.ts, the
 * same seed and conditions as ./impact.test.ts). A design-time estimate: no
 * 3D solve exists, so the tests only a solve can make (the grid gates, the
 * fins' disturbance reaching the envelope surface, a neighbour's wave
 * reaching a fitted leading-edge shock, families without a band, the
 * device's memory) are not modelled, and every share below is an upper
 * bound on what Stage A could serve.
 *
 * The spacing rule for blunt leading edges (0021 revision 3, 2.7) is
 * estimated here with F. S. Billig's correlation for cylinders (standoff and
 * shock shape), the sonic point on the shock from the oblique-shock
 * relations; on the page it is taken from the 2D strip's own solution.
 *
 * Writes ./out/stage-a-scope.out. Run:
 *   ONLY=./stage-a-scope.test.ts nice -n 10 npx vitest run --config docs/research/refusals/vitest.config.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { FinRefusal } from '../../../src/fins/refusal';
import { exactSectionDrag } from '../../../src/fins/section-drag';
import { MACH_BANDS, drawAltitude, mulberry32, population, type Rocket } from './population';
import { librarySection, noseReasons, totalReasons, type ReasonKey } from './evaluate';

const here = dirname(fileURLToPath(import.meta.url));
const DEG = Math.PI / 180;
const GAMMA = 1.4;

/** The lowest normal Mach number at which Stage A serves a blunt leading edge (0021 revision 3, 2.7). */
const BLUNT_FLOOR = 1.5;

type Why =
  | 'nose not served (no 2D fitted field to start from)'
  | 'Mach below 1.2'
  | 'sharp section: leading-edge shock detached'
  | 'sharp section: reflected wave (served only once rung b3 passes)'
  | 'blunt leading edge: normal Mach number below 1.5'
  | "blunt leading edge: the strip's subsonic region reaches the mirror plane between fins (spacing rule)";

interface Case {
  readonly r: Rocket;
  readonly band: number;
  readonly mach: number;
  readonly nose: readonly ReasonKey[];
  readonly total: readonly ReasonKey[];
}

/** Mach number behind an oblique shock of angle beta (radians) at upstream Mach m. */
function machBehind(m: number, beta: number): number {
  const mn = m * Math.sin(beta);
  if (mn <= 1) return Infinity;
  const mn2 = Math.sqrt((1 + 0.5 * (GAMMA - 1) * mn * mn) / (GAMMA * mn * mn - 0.5 * (GAMMA - 1)));
  const theta = Math.atan(((2 / Math.tan(beta)) * (mn * mn - 1)) / (m * m * (GAMMA + Math.cos(2 * beta)) + 2));
  return mn2 / Math.sin(beta - theta);
}

/**
 * The lateral reach of the sonic point on a cylinder's detached shock, over the cylinder's radius, at
 * normal Mach number m: Billig's shock shape, x = R + D - Rc cot^2(mu) (sqrt(1 + y^2 tan^2(mu) / Rc^2) - 1),
 * D / R = 0.386 exp(4.67 / m^2), Rc / R = 1.386 exp(1.8 / (m - 1)^0.75), at the shock angle behind which
 * the flow is sonic.
 */
export function sonicReachOverRadius(m: number): number {
  const rc = 1.386 * Math.exp(1.8 / (m - 1) ** 0.75);
  const mu = Math.asin(1 / m);
  let lo = mu + 1e-9;
  let hi = Math.PI / 2;
  for (let k = 0; k < 200; k++) {
    const mid = 0.5 * (lo + hi);
    if (machBehind(m, mid) > 1) lo = mid;
    else hi = mid;
  }
  const c = 1 / Math.tan(0.5 * (lo + hi));
  const t = Math.tan(mu);
  return rc * Math.sqrt((c * c) / (1 - c * c * t * t));
}

const bluntLeadingEdge = (r: Rocket) =>
  r.section === 'rounded-le-square-te' || r.section === 'rounded-both' || r.section === 'square-both';

/** Stage A's own refusals of a case (empty: the fins' pressure drag would be solved). */
function stageA(c: Case, b3Passed: boolean): Why[] {
  const out: Why[] = [];
  if (c.mach < 1.2) out.push('Mach below 1.2');
  else if (c.nose.length > 0) out.push('nose not served (no 2D fitted field to start from)');
  // A boat-tail lies behind the fins in this population (population.ts): the domain ends at the fins'
  // trailing edges, ahead of it, so it is not a refusal of the fins' solve (its total stays refused).
  if (!bluntLeadingEdge(c.r)) {
    try {
      exactSectionDrag(librarySection(c.r) as never, c.mach);
    } catch (e) {
      if (!(e instanceof FinRefusal)) throw e;
      if (e.reason === 'reflected-wave') {
        if (!b3Passed) out.push('sharp section: reflected wave (served only once rung b3 passes)');
      } else out.push('sharp section: leading-edge shock detached');
    }
  } else {
    const mn = c.mach * Math.cos(c.r.leadingEdgeSweepDeg * DEG);
    if (mn < BLUNT_FLOOR) out.push('blunt leading edge: normal Mach number below 1.5');
    else {
      // The subsonic region's lateral reach (from the fin's midplane) against the distance from the
      // midplane to the mirror plane at the root, R sin(pi / N).
      const reach = (sonicReachOverRadius(mn) * c.r.thickness) / 2;
      const gap = (c.r.diameter / 2) * Math.sin(Math.PI / c.r.finCount);
      if (reach >= gap) {
        out.push("blunt leading edge: the strip's subsonic region reaches the mirror plane between fins (spacing rule)");
      }
    }
  }
  return out;
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;

test('Stage A scope (revision 3) on the refusal population', () => {
  const rockets = population(2000);
  const rand = mulberry32(7);
  const cases: Case[] = [];
  for (const r of rockets) {
    MACH_BANDS.forEach(([lo, hi], band) => {
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      const altitudeKm = drawAltitude(rand(), rand());
      cases.push({ r, band, mach, nose: noseReasons(r, mach), total: totalReasons(r, { mach, altitudeKm }) });
    });
  }
  const bandName = (b: number) => (b < 0 ? 'all bands' : `M ${MACH_BANDS[b]![0].toFixed(1)}-${MACH_BANDS[b]![1].toFixed(1)}`);
  const sel = (b: number) => cases.filter((c) => b < 0 || c.band === b);
  const bands = [-1, 0, 1, 2, 3];
  const lines: string[] = [
    '# Stage A (0021 revision 3): scope on the refusal population (generated by stage-a-scope.test.ts; do not edit)',
    '',
    'Upper bounds: grid gates, the envelope check, neighbours\' waves at a fitted shock, families without a band and device memory are not modelled.',
    `Cases: 2000 rockets x one condition in each Mach band (the same draw as impact.test.ts, seed 7). Blunt leading edges from normal Mach ${BLUNT_FLOOR}, with the spacing rule estimated by Billig's correlation.`,
    '',
    '| Share of cases | ' + bands.map(bandName).join(' | ') + ' |',
    '| --- |' + bands.map(() => ' --- |').join(''),
  ];
  const row = (name: string, f: (c: Case) => boolean) =>
    lines.push(`| ${name} | ` + bands.map((b) => pct(sel(b).filter(f).length, sel(b).length)).join(' | ') + ' |');
  const solved = (b3: boolean) => (c: Case) => stageA(c, b3).length === 0;
  row('fins solved (b3 not passed)', solved(false));
  row('fins solved (b3 passed)', solved(true));
  row('  of which a total is possible (not rounded trailing edges; b3 passed)', (c) => solved(true)(c) && c.r.section !== 'rounded-both');
  for (const s of ['rounded-le-square-te', 'rounded-both', 'square-both', 'bevel-both', 'bevel-le-square-te', 'double-wedge'] as const) {
    row(`  of which ${s} (b3 passed)`, (c) => c.r.section === s && solved(true)(c));
  }
  row('totals today', (c) => c.nose.length === 0 && c.total.length === 0);
  const withStageA = (square: boolean) => (c: Case) => {
    if (c.nose.length > 0) return false;
    if (!solved(true)(c)) return c.total.length === 0;
    const lifted = new Set<ReasonKey>(['sectionReflected']);
    if (square) lifted.add('squareLe');
    return c.total.every((k) => lifted.has(k));
  };
  row('totals with Stage A (b3 passed), square edges kept out of totals', withStageA(false));
  row('totals with Stage A (b3 passed), square edges in totals as bounded (0014 10.2)', withStageA(true));
  lines.push('');

  lines.push('Why Stage A refuses (a case may have several), all bands:', '');
  const whys = new Map<Why, number>();
  for (const c of cases) for (const w of stageA(c, false)) whys.set(w, (whys.get(w) ?? 0) + 1);
  for (const [w, n] of [...whys].sort((a, b) => b[1] - a[1])) lines.push(`- ${w}: ${pct(n, cases.length)}`);
  lines.push('');

  // The spacing rule by plate thickness, among blunt-edged plates at or above the floor whose nose is served.
  lines.push('The spacing rule on blunt-edged plates at normal Mach 1.5 and above (nose served), by thickness:', '');
  lines.push('| Thickness | Cases | Refused by the spacing rule |', '| --- | --- | --- |');
  const eligible = cases.filter(
    (c) => c.mach >= 1.2 && c.nose.length === 0 && bluntLeadingEdge(c.r) && c.mach * Math.cos(c.r.leadingEdgeSweepDeg * DEG) >= BLUNT_FLOOR,
  );
  for (const [lo, hi] of [
    [0, 2.5e-3],
    [2.5e-3, 4e-3],
    [4e-3, 5.5e-3],
    [5.5e-3, 1],
  ] as const) {
    const inBin = eligible.filter((c) => c.r.thickness >= lo && c.r.thickness < hi);
    const refused = inBin.filter((c) => stageA(c, true).some((w) => w.startsWith("blunt leading edge: the strip's")));
    lines.push(`| ${(lo * 1000).toFixed(1)} to ${hi >= 1 ? 'max' : (hi * 1000).toFixed(1)} mm | ${inBin.length} | ${inBin.length ? pct(refused.length, inBin.length) : '-'} |`);
  }
  lines.push('');
  lines.push('Billig estimate of the sonic reach, over the plate thickness, at normal Mach 1.3, 1.5, 2.0, 3.0: ' +
    [1.3, 1.5, 2.0, 3.0].map((m) => (sonicReachOverRadius(m) / 2).toFixed(1)).join(', '));
  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', 'stage-a-scope.out'), lines.join('\n') + '\n');
});
