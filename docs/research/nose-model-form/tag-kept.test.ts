/**
 * Tags kept allowance base grids whose fingerprint does not say what
 * numerics made them (infrastructure only, no rule; the re-review's item 1
 * after f4d0f74, and the fingerprint's change from the commit to the
 * numerics hash after 4933c23):
 *   - a grid with no fingerprint at all (kept by f4d0f74's store, before
 *     fingerprints existed) gets the fingerprint of the code that made it:
 *     TAG_COMMIT (the commit the lane was running), the CPU engine, the
 *     grid from the key, the constants as they are, the current numerics
 *     hash;
 *   - a grid whose fingerprint has a commit but no numerics hash (kept
 *     between f4d0f74 and 4933c23, when the commit was compared) gets the
 *     current numerics hash, if its commit is one of TAG_FROM (commits
 *     checked, by their diff, to have left the numerics files as they are
 *     now: f4d0f74 and 4933c23 changed only the store and the fingerprint).
 * Every retagged grid carries a note saying so. Only those grids are
 * touched; the json is rewritten atomically. Run by lane-b-subsonic.sh
 * before each solve:
 *   TAG_COMMIT=f4d0f74 TAG_FROM=f4d0f74,4933c23 CHECKPOINTS=... ONLY=./tag-kept.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 */

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { numericsHash } from './mid-checkpoint';
import { CFL, gridFingerprint, problemOf, type GridFingerprint } from './solve-common';

const ENGINE = `CPU, LU-SGS, CFL to ${CFL} (cpuTransonicEngine)`;

it('tags kept allowance grids whose fingerprint lacks the numerics hash of the code that made them', () => {
  const dir = process.env.CHECKPOINTS ?? '';
  const commit = process.env.TAG_COMMIT ?? '';
  const from = (process.env.TAG_FROM ?? '').split(',').filter((c) => c !== '');
  expect(dir !== '' && existsSync(dir), 'CHECKPOINTS must name the store').toBe(true);
  expect(commit !== '', 'TAG_COMMIT must name the commit that made the untagged grids').toBe(true);
  const numerics = numericsHash();
  const when = new Date().toISOString();
  const tagged: string[] = [];
  for (const f of readdirSync(dir)) {
    const m = /^M(\d\.\d{3})-(farField|cylinder)-(\d+)\.json$/.exec(f);
    if (m === null) continue;
    const file = join(dir, f);
    const json = JSON.parse(readFileSync(file, 'utf8')) as {
      fingerprint?: Partial<GridFingerprint> & { taggedAfterTheFact?: string };
    };
    const kept = json.fingerprint;
    let fingerprint: GridFingerprint;
    if (kept === undefined) {
      const mach = Number(m[1]);
      const size = Number(m[3]);
      const problem = problemOf(mach, 1, m[2] === 'farField' ? { farField: size } : { cylinder: size });
      fingerprint = {
        ...gridFingerprint(problem, ENGINE, { numerics, commit }),
        note: `tagged ${when} by tag-kept.test.ts: kept by ${commit}'s store, which recorded no fingerprint; numerics hash ${numerics} of the files as they are now, which ${commit} left as they are`,
      };
    } else if (kept.numerics === undefined && kept.commit !== undefined && from.includes(kept.commit)) {
      const { taggedAfterTheFact, ...rest } = kept;
      fingerprint = {
        ...(rest as GridFingerprint),
        numerics,
        note: `${taggedAfterTheFact === undefined ? '' : `${taggedAfterTheFact}; `}numerics hash ${numerics} added ${when} by tag-kept.test.ts: kept under commit ${kept.commit}, whose numerics files are the ones hashed now (the commits since changed only the store and the fingerprint)`,
      };
    } else continue;
    writeFileSync(`${file}.tmp`, JSON.stringify({ ...json, fingerprint }));
    renameSync(`${file}.tmp`, file);
    tagged.push(`${f} (${fingerprint.commit})`);
  }
  console.log(tagged.length === 0 ? 'nothing to tag' : `tagged: ${tagged.join(', ')}`);
});
