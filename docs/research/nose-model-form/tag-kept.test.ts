/**
 * Tags kept allowance base grids that carry no fingerprint (kept by the
 * store of f4d0f74, before fingerprints existed) with the fingerprint of
 * the code that made them: TAG_COMMIT (the commit the lane was running),
 * the CPU engine, the grid from the key, the constants as they are. Only
 * untagged grids are touched; the json is rewritten atomically. Run by
 * lane-b-subsonic.sh before each solve until every kept grid is tagged:
 *   TAG_COMMIT=f4d0f74 CHECKPOINTS=... ONLY=./tag-kept.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 * Infrastructure only (the re-review's item 1 after f4d0f74).
 */

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { CFL, gridFingerprint, problemOf, type GridFingerprint } from './solve-common';

const ENGINE = `CPU, LU-SGS, CFL to ${CFL} (cpuTransonicEngine)`;

it('tags kept allowance grids without a fingerprint with the code that made them', () => {
  const dir = process.env.CHECKPOINTS ?? '';
  const commit = process.env.TAG_COMMIT ?? '';
  expect(dir !== '' && existsSync(dir), 'CHECKPOINTS must name the store').toBe(true);
  expect(commit !== '', 'TAG_COMMIT must name the commit that made the untagged grids').toBe(true);
  const tagged: string[] = [];
  for (const f of readdirSync(dir)) {
    const m = /^M(\d\.\d{3})-(farField|cylinder)-(\d+)\.json$/.exec(f);
    if (m === null) continue;
    const file = join(dir, f);
    const json = JSON.parse(readFileSync(file, 'utf8')) as { fingerprint?: GridFingerprint };
    if (json.fingerprint !== undefined) continue;
    const mach = Number(m[1]);
    const size = Number(m[3]);
    const problem = problemOf(mach, 1, m[2] === 'farField' ? { farField: size } : { cylinder: size });
    const fingerprint = {
      ...gridFingerprint(problem, ENGINE, commit),
      taggedAfterTheFact: `tagged ${new Date().toISOString()} by tag-kept.test.ts: kept by ${commit}'s store, which recorded no fingerprint`,
    };
    writeFileSync(`${file}.tmp`, JSON.stringify({ ...json, fingerprint }));
    renameSync(`${file}.tmp`, file);
    tagged.push(f);
  }
  console.log(tagged.length === 0 ? 'nothing to tag' : `tagged: ${tagged.join(', ')}`);
});
