/**
 * Which of the population's hexagonal (bevel-both) sections the registration of W9(a) can reach
 * (docs/design/0009-fin-wave-drag.md section 9, registered 2026-10-30, before any of its runs): on
 * impact.test.ts's own cases, the sections the reflected-wave refusal holds, by Mach band, and which of
 * them lie inside the registered family (equal bevels; half-angle 5 to 15 deg; bevel 0.01 to 0.4525 of the
 * chord; Mach 1.5 to 3.0) and inside a cell of its grid whose eight corners all have an attached
 * leading-edge shock with supersonic flow behind it, and, since the coordinator's ruling of 2026-10-30
 * (0009 section 9.4), a Mach number of at least 1.1 behind it. That is an upper bound on what the
 * registration can serve: a cell is served only if its corners also pass the convergence criteria, which
 * no run has tested yet. Uses only the shock-expansion code as it stands (no characteristics or Euler
 * value). Writes out/w9-family.out (or into OUT_DIR).
 *
 *   ONLY=./w9-family.test.ts npx vitest run --config docs/research/refusals/vitest.config.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { FinRefusal } from '../../../src/fins/refusal';
import { exactSectionDrag } from '../../../src/fins/section-drag';
import { hexagonal, type SymmetricSection } from '../../../src/fins/section';
import { librarySection, noseReasons, totalReasons } from './evaluate';
import { MACH_BANDS, drawAltitude, mulberry32, population } from './population';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT_DIR === undefined ? join(here, 'out') : process.env.OUT_DIR;
const N_ROCKETS = Number(process.env.N_ROCKETS ?? 2000);
const DEG = Math.PI / 180;

/** The registered grid (0009 section 9.4): bevel half-angle (deg), bevel over chord, Mach number. */
const THETA = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const BEVEL = Array.from({ length: 12 }, (_, k) => 0.01 * 2 ** (k / 2));
const MACH = [1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0];
/** The coordinator's ruling of 2026-10-30: no cell with a corner below this Mach number behind the shock is served. */
const NEAR_SONIC = 1.1;

/** The cell's lower index in a grid, the last cell taking its upper face; -1 outside. */
function cellIndex(grid: readonly number[], v: number): number {
  if (!(v >= grid[0]! && v <= grid[grid.length - 1]!)) return -1;
  for (let i = 0; i < grid.length - 2; i++) if (v < grid[i + 1]!) return i;
  return grid.length - 2;
}

/** Mach number behind the straight leading-edge shock, or the reason it has none. */
function behindShock(theta: number, mach: number): number | string {
  try {
    // The shock depends on the half-angle alone; any bevel length gives it.
    const s = hexagonal(2 * 0.05 * Math.tan(theta * DEG), 0.05);
    return exactSectionDrag(s, mach, { neglectReflectedWaves: true }).upper.faces[0]!.mach;
  } catch (e) {
    if (!(e instanceof FinRefusal)) throw e;
    return e.reason;
  }
}

/**
 * The shortest bevel (over the chord) at which section 2.1's bound puts the first reflection at or beyond
 * the trailing edge, so that the hexagon is exact today: bisection in ln b between 0.001 and 0.49 (the
 * landing moves aft as the bevel lengthens); '>0.49' where even 0.49 is refused, '-' where the shock is
 * detached or subsonic behind.
 */
function exactFrom(theta: number, mach: number): string {
  const x1 = (b: number) => {
    const v = exactSectionDrag(hexagonal(2 * b * Math.tan(theta * DEG), b), mach, { neglectReflectedWaves: true });
    return Math.min(v.upper.firstReflection, v.lower.firstReflection);
  };
  try {
    if (x1(0.49) < 1) return '>0.49';
  } catch (e) {
    if (!(e instanceof FinRefusal)) throw e;
    return '-';
  }
  let lo = 0.001;
  let hi = 0.49;
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi);
    if (x1(mid) < 1) lo = mid;
    else hi = mid;
  }
  return hi.toFixed(4);
}

const quantiles = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const q = (f: number) => s[Math.min(s.length - 1, Math.floor(f * s.length))]!;
  return `${q(0).toFixed(4)} / ${q(0.05).toFixed(4)} / ${q(0.5).toFixed(4)} / ${q(0.95).toFixed(4)} / ${s[s.length - 1]!.toFixed(4)}`;
};

test('the family of W9(a) against the population', () => {
  const nodes = new Map<string, number | string>();
  for (const t of THETA) for (const m of MACH) nodes.set(`${t}|${m}`, behindShock(t, m));

  interface Case {
    band: number;
    theta: number;
    bevel: number;
    tc: number;
    mach: number;
    m1: number;
    where: string;
    sole: boolean;
    noseServed: boolean;
  }
  const cases: Case[] = [];
  const rockets = population(N_ROCKETS);
  // impact.test.ts's draws: per rocket, per band, the Mach number and then the altitude (seed 7).
  const rand = mulberry32(7);
  for (const rocket of rockets) {
    MACH_BANDS.forEach(([lo, hi], band) => {
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      const altitudeKm = drawAltitude(rand(), rand());
      if (rocket.section !== 'bevel-both') return;
      const total = totalReasons(rocket, { mach, altitudeKm });
      if (!total.includes('sectionReflected')) return;
      const section = librarySection(rocket) as SymmetricSection;
      const bevel = section.x[1]!;
      const tc = 2 * section.halfThickness[1]!;
      const theta = Math.atan(tc / 2 / bevel) / DEG;
      const v = exactSectionDrag(section, mach, { neglectReflectedWaves: true });
      const m1 = v.upper.faces[0]!.mach;
      const i = cellIndex(THETA, theta);
      const j = cellIndex(BEVEL, bevel);
      const k = cellIndex(MACH, mach);
      let where: string;
      if (!(mach >= 1.5)) where = "below Mach 1.5 (outside the family; the fins' own-drag band refuses it too)";
      else if (i < 0) where = 'half-angle outside 5 to 15 deg';
      else if (j < 0) where = 'bevel outside 0.01 to 0.4525 of the chord';
      else if (k < 0) where = 'Mach outside 1.5 to 3.0';
      else {
        const corners = [THETA[i]!, THETA[i + 1]!].flatMap((t) => [MACH[k]!, MACH[k + 1]!].map((m) => nodes.get(`${t}|${m}`)!));
        where = !corners.every((c) => typeof c === 'number')
          ? 'in a cell with a corner whose shock is detached or subsonic behind'
          : corners.every((c) => (c as number) >= NEAR_SONIC)
            ? 'inside a cell whose corners all have an attached shock, Mach 1.1 or more behind it'
            : 'in a cell with a corner below Mach 1.1 behind the shock (excluded by the ruling of 2026-10-30)';
      }
      cases.push({
        band,
        theta,
        bevel,
        tc,
        mach,
        m1,
        where,
        sole: total.length === 1 && noseReasons(rocket, mach).length === 0,
        noseServed: total.length === 1,
      });
    });
  }

  const bandName = (b: number) => `M ${MACH_BANDS[b]![0].toFixed(1)}-${MACH_BANDS[b]![1].toFixed(1)}`;
  const row = (name: string, sel: Case[]) =>
    `| ${name} | ${MACH_BANDS.map((_, b) => sel.filter((c) => c.band === b).length).join(' | ')} | ${sel.length} |`;
  const inside = cases.filter((c) => c.where.startsWith('inside'));
  const lines = [
    "# W9(a)'s family against the population (generated by w9-family.test.ts; do not edit)",
    '',
    `- rockets: ${N_ROCKETS}, each at one condition per Mach band (impact.test.ts's cases)`,
    "- the registered grid (0009 section 9.4): half-angle " +
      `${THETA.join(', ')} deg; bevel over chord ${BEVEL.map((b) => b.toFixed(4)).join(', ')}; Mach ${MACH.join(', ')}`,
    '',
    '## The grid: Mach number behind the straight leading-edge shock at each half-angle and Mach node (- where the shock is detached or the flow behind it subsonic; * below 1.1, computed but serving nothing by the ruling of 2026-10-30: the cells either bounds are not served)',
    '',
    `| Half-angle | ${MACH.map((m) => `M ${m.toFixed(1)}`).join(' | ')} |`,
    `| --- | ${MACH.map(() => '---').join(' | ')} |`,
    ...THETA.map(
      (t) =>
        `| ${t} deg | ${MACH.map((m) => {
          const v = nodes.get(`${t}|${m}`)!;
          return typeof v === 'number' ? `${v.toFixed(3)}${v < NEAR_SONIC ? '*' : ''}` : '-';
        }).join(' | ')} |`,
    ),
    '',
    "## The shortest bevel over the chord at which a hexagon is exact today (section 2.1's bound: the first reflection at or beyond the trailing edge), at each node; refused below it",
    '',
    `| Half-angle | ${MACH.map((m) => `M ${m.toFixed(1)}`).join(' | ')} |`,
    `| --- | ${MACH.map(() => '---').join(' | ')} |`,
    ...THETA.map((t) => `| ${t} deg | ${MACH.map((m) => exactFrom(t, m)).join(' | ')} |`),
    '',
    '## Hexagonal sections the reflected-wave refusal holds today, by where they lie',
    '',
    `| Cases | ${MACH_BANDS.map((_, b) => bandName(b)).join(' | ')} | All |`,
    `| --- | ${MACH_BANDS.map(() => '---').join(' | ')} | --- |`,
    row('refused for a reflected wave (bevel-both)', cases),
    ...[...new Set(cases.map((c) => c.where))].sort().map((w) => row(w, cases.filter((c) => c.where === w))),
    row('of those inside: the reflected wave the only reason refusing the total (the sole blockers)', inside.filter((c) => c.sole)),
    row('all sole blockers', cases.filter((c) => c.sole)),
    row('of those inside: the only reason left with the nose assumed served', inside.filter((c) => c.noseServed)),
    row('all with the reflected wave the only reason left, the nose assumed served', cases.filter((c) => c.noseServed)),
    '',
    '## The refused cases at Mach 1.5 and above: min / 5% / median / 95% / max',
    '',
    ...(['theta', 'bevel', 'tc', 'mach', 'm1'] as const).map(
      (k) =>
        `- ${{ theta: 'half-angle, deg', bevel: 'bevel over chord', tc: 't/c', mach: 'Mach number', m1: 'Mach number behind the leading-edge shock' }[k]}: ${quantiles(cases.filter((c) => c.mach >= 1.5).map((c) => c[k]))}`,
    ),
    '',
    ...[...new Set(cases.filter((c) => c.mach >= 1.5).map((c) => c.where))].sort().map((w) => {
      const m1 = cases.filter((c) => c.where === w).map((c) => c.m1);
      return `- Mach behind the shock, ${w}: ${Math.min(...m1).toFixed(3)} to ${Math.max(...m1).toFixed(3)}`;
    }),
    '',
    '## The refused cases at Mach 1.5 and above that lie outside every cell the family can serve',
    '',
    '| Half-angle, deg | Bevel over chord | t/c | Mach | Mach behind the shock | Where |',
    '| --- | --- | --- | --- | --- | --- |',
    ...cases
      .filter((c) => c.mach >= 1.5 && !c.where.startsWith('inside'))
      .sort((a, b) => a.mach - b.mach)
      .map((c) => `| ${c.theta.toFixed(2)} | ${c.bevel.toFixed(4)} | ${c.tc.toFixed(4)} | ${c.mach.toFixed(3)} | ${c.m1.toFixed(3)} | ${c.where} |`),
    '',
  ];
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'w9-family.out'), lines.join('\n'));
});
