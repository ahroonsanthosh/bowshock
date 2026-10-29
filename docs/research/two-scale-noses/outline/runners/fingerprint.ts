// The code part of a run's fingerprint (0006, "Widening the outline:
// registration"): a sha256 over the source files a runner reaches by value
// imports, as docs/research/nose-model-form's numericsHash: each file's
// path (relative to the tree's root) and text, in sorted order, the first
// 16 hex digits. `numerics` covers the files under src/ (the solver, the
// grid, the march); `runner` the runner files themselves. A bare module
// (vitest, node:fs) is not followed, nor a type-only import, nor an asset
// imported with a query (a shader ?raw).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const here = dirname(new URL(import.meta.url).pathname);
/** The tree's root (tests/vk is two below it). */
export const root = resolve(here, '..', '..');

export function sourceFiles(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const walk = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/^(?:import|export)\s+(type\s+)?[^;]*?from\s+'(\.[^']*)'/gms)) {
      if (m[1] !== undefined) continue;
      const spec = m[2]!;
      if (spec.includes('?')) continue;
      const target = resolve(dirname(file), spec);
      const candidates = [target, `${target}.ts`, join(target, 'index.ts')];
      const found = candidates.find((c) => c.endsWith('.ts') && existsSync(c));
      if (found === undefined) throw new Error(`sourceFiles: ${spec} from ${file} not found`);
      walk(found);
    }
  };
  for (const e of entries) walk(resolve(here, e));
  return [...seen].map((f) => relative(root, f)).sort();
}

function hashOf(files: readonly string[]): string {
  const h = createHash('sha256');
  for (const f of files) {
    h.update(f);
    h.update('\0');
    h.update(readFileSync(join(root, f)));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

/** The hashes of the files reached from the given runner files (relative to tests/vk). */
export function codeHashes(entries: readonly string[]): {
  numerics: string;
  runner: string;
  srcFiles: number;
} {
  const files = sourceFiles(entries);
  const src = files.filter((f) => f.startsWith('src/'));
  const runner = files.filter((f) => !f.startsWith('src/'));
  return { numerics: hashOf(src), runner: hashOf(runner), srcFiles: src.length };
}

/** The commit the tree's src was taken from (informational). */
export const treeCommit = (): string => {
  try {
    return readFileSync(join(root, 'COMMIT'), 'utf8').trim();
  } catch {
    return 'unknown';
  }
};
