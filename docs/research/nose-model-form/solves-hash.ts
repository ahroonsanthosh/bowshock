/**
 * A hash of every solve file in a directory (M<mach>.json), by name and
 * content, so that blind-run-3.test.ts can refuse rows when the solves it
 * evaluates are not the ones verify-subsonic.test.ts judged ((y)'s row
 * gate, item 3 of the re-check of 602d8f7).
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export function solveFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^M\d\.\d{3}\.json$/.test(f))
    .sort();
}

export function solvesHash(dir: string): string {
  const h = createHash('sha256');
  for (const f of solveFiles(dir)) {
    h.update(f);
    h.update('\0');
    h.update(createHash('sha256').update(readFileSync(join(dir, f))).digest('hex'));
    h.update('\n');
  }
  return h.digest('hex');
}

export function solvesTag(dir: string): string {
  return basename(dir);
}
