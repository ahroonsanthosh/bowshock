/**
 * W9(a)'s independent check (0009 section 9.7; 9.11, step 3): planar Euler
 * solutions of E1 to E3 on 0009 section 2.4's set-up (runs/euler.test.ts,
 * copied unchanged but for the cases and the wall pressures it records),
 * levels 0 to 3, one solve at a time. One line per solve in euler.jsonl as
 * it finishes, its wall faces in euler-walls/<case>-L<level>.json; a
 * restart skips the solves recorded.
 *
 *   ONLY=./euler.test.ts npx vitest run --config docs/research/fin-wave-drag/w9/vitest.config.ts
 */

import { execSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { Euler2D } from '../../../../src/engine-cpu/euler2d';
import { gridFromFunction } from '../../../../src/grid/structured';
import type { SymmetricSection } from '../../../../src/fins/section';
import { exactSectionDrag } from '../../../../src/fins/section-drag';
import { E_CASES, readJsonl } from './family';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const OUT = join(here, 'euler.jsonl');
const WALLS = join(here, 'euler-walls');
const gamma = 1.4;


// Section 2.4's set-up (runs/euler.test.ts).
const X_MIN = -0.3;
const X_MAX = 1.2;
const HEIGHT = 1.4;
const H0 = 0.025;
const NJ0 = 28;

function grid(section: SymmetricSection, level: number) {
  const m = 2 ** level;
  const xs = [X_MIN, ...section.x, X_MAX];
  const counts: number[] = [];
  for (let k = 0; k + 1 < xs.length; k++) counts.push(Math.round((xs[k + 1]! - xs[k]!) / H0) * m);
  const xNodes: number[] = [X_MIN];
  for (let k = 0; k + 1 < xs.length; k++) {
    for (let i = 1; i <= counts[k]!; i++) xNodes.push(xs[k]! + ((xs[k + 1]! - xs[k]!) * i) / counts[k]!);
  }
  const wall = (x: number) => {
    if (x <= 0 || x >= 1) return 0;
    for (let k = 1; k < section.x.length; k++) {
      if (x <= section.x[k]!) {
        const [x0, x1] = [section.x[k - 1]!, section.x[k]!];
        const [g0, g1] = [section.halfThickness[k - 1]!, section.halfThickness[k]!];
        return g0 + ((g1 - g0) * (x - x0)) / (x1 - x0);
      }
    }
    return 0;
  };
  const ni = xNodes.length - 1;
  const nj = NJ0 * m;
  return gridFromFunction(ni, nj, (i, j) => {
    const x = xNodes[i]!;
    const y0 = wall(x);
    return [x, y0 + ((HEIGHT - y0) * j) / nj];
  });
}

interface EulerRecord {
  readonly case: string;
  readonly level: number;
}

test('W9(a): the Euler check, E1 to E3', () => {
  const commit = execSync('git rev-parse --short HEAD', { cwd: here }).toString().trim();
  const dirty = execSync('git status --porcelain -- src', { cwd: root }).toString().trim();
  if (dirty !== '') throw new Error('src has uncommitted changes: the runs record the commit they ran on');
  mkdirSync(WALLS, { recursive: true });
  const done = new Set(readJsonl<EulerRecord>(OUT).map((r) => `${r.case}|${r.level}`));
  for (const name of ['E1', 'E2', 'E3']) {
    const { section, mach } = E_CASES[name]!;
    const free = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
    const q = 0.5 * gamma * mach * mach;
    const se = exactSectionDrag(section, mach, { neglectReflectedWaves: true });
    for (const level of [0, 1, 2, 3]) {
      if (done.has(`${name}|${level}`)) continue;
      const g = grid(section, level);
      const s = new Euler2D({
        grid: g,
        geometry: 'planar',
        gamma,
        flux: 'hllc',
        limiter: 'vanAlbada',
        reconstruction: 'sharedScaled',
        timeIntegrator: 'ssprk2',
        cfl: 0.8,
        timeStepping: 'local',
        boundaries: {
          iMin: { kind: 'inflow', state: free },
          iMax: { kind: 'outflow' },
          jMin: { kind: 'wall' },
          jMax: { kind: 'outflow' },
        },
      });
      s.setInitialCondition(() => free);
      const r0 = s.densityResidualNorm();
      const drag = () => {
        let d = 0;
        for (const f of s.boundaryFluxes('jMin')) {
          const p = f.flux[1] * f.nx + f.flux[2] * f.ny;
          d += (p - 1) * f.nx * f.area;
        }
        return (2 * d) / q;
      };
      const t0 = performance.now();
      let previous = NaN;
      let its = 0;
      const chunk = 100 * 2 ** level;
      const cap = 40000 * 2 ** level;
      let res = NaN;
      let change = NaN;
      let d = NaN;
      for (;;) {
        s.iterate(chunk);
        its += chunk;
        d = drag();
        res = s.densityResidualNorm() / r0;
        change = Math.abs(d / previous - 1);
        previous = d;
        if ((res < 1e-11 && change < 1e-11) || its >= cap) break;
      }
      const faces = s.boundaryFluxes('jMin').map((f) => ({
        x: f.x,
        y: f.y,
        p: f.flux[1] * f.nx + f.flux[2] * f.ny,
        length: f.area,
      }));
      writeFileSync(join(WALLS, `${name}-L${level}.json`), JSON.stringify(faces));
      appendFileSync(
        OUT,
        JSON.stringify({
          case: name,
          level,
          ni: g.ni,
          nj: g.nj,
          iterations: its,
          residual: res,
          change,
          converged: res < 1e-11 && change < 1e-11,
          cd: d,
          overSE: d / se.cd - 1,
          seconds: Math.round((performance.now() - t0) / 1000),
          commit,
        }) + '\n',
      );
      console.log(`${name} level ${level}: cd ${d} (${(100 * (d / se.cd - 1)).toFixed(3)}% over SE), ${its} iterations`);
    }
  }
});
