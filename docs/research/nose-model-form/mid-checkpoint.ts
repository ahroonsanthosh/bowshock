/**
 * A file-based mid-grid checkpoint for the CPU scripts (solve-common's
 * MidCheckpoint): <path>-mid.bin holds the conserved state and
 * <path>-mid.json its step count and residual marks, saved every
 * MID_EVERY_SECONDS; both are deleted once the grid has settled and its
 * per-grid checkpoint exists. A state without its step count is not
 * continued from (the cap is per grid, across restarts).
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import {
  sameFingerprint,
  type GridFingerprint,
  type GridResult,
  type GridStore,
  type MidCheckpoint,
  type SolvePath,
} from './solve-common';

export const MID_EVERY_SECONDS = Number(process.env.MID_EVERY_SECONDS ?? 900);

export function fileMidCheckpoint(path: string): MidCheckpoint & { readonly clear: () => void } {
  const file = `${path}-mid.bin`;
  const meta = `${path}-mid.json`;
  return {
    everySeconds: MID_EVERY_SECONDS,
    load: () => {
      // Both files, or nothing: a state without its step count would make
      // the cap per process again, so it is not continued from.
      if (!existsSync(file) || !existsSync(meta)) return null;
      const buf = readFileSync(file);
      const m = JSON.parse(readFileSync(meta, 'utf8')) as {
        steps: number;
        firstResidual: number;
        largestResidual: number;
      };
      return {
        conserved: new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8).slice(),
        steps: m.steps,
        firstResidual: m.firstResidual,
        largestResidual: m.largestResidual,
      };
    },
    save: (state) => {
      mkdirSync(dirname(file), { recursive: true });
      // Each file is written whole to a temporary name and renamed into
      // place (atomic on one file system); the json first, so that a crash
      // between the two leaves a step count at or above the state's (an
      // overcount, on the safe side of the cap), never below it.
      writeFileSync(
        `${meta}.tmp`,
        JSON.stringify({
          steps: state.steps,
          firstResidual: state.firstResidual,
          largestResidual: state.largestResidual,
          saved: new Date().toISOString(),
        }),
      );
      renameSync(`${meta}.tmp`, meta);
      writeFileSync(`${file}.tmp`, Buffer.from(state.conserved.buffer));
      renameSync(`${file}.tmp`, file);
    },
    clear: () => {
      for (const f of [file, meta]) if (existsSync(f)) unlinkSync(f);
    },
  };
}

const PATHS: readonly SolvePath[] = ['implicit', 'explicit', 'implicit10'];

/**
 * A file-based GridStore in `dir`: a kept grid is <key>.json (its result)
 * and <key>.bin (its state), each written to a temporary name and renamed,
 * the json last, so that both exist or the grid counts as not kept; a
 * running grid's mid states are <key>-<path>-mid.* (fileMidCheckpoint).
 */
/** The file system a kept grid is written with (injectable for the write-order test). */
export interface KeepIo {
  readonly write: (path: string, data: Buffer | string) => void;
  readonly rename: (from: string, to: string) => void;
}
const nodeIo: KeepIo = { write: writeFileSync, rename: renameSync };

/**
 * A kept grid's two files, each written to a temporary name and renamed
 * into place, the bin first and the json last, so that a grid whose json
 * exists always has its bin (a half-kept grid, json missing, is not kept).
 */
export function writeKept(
  base: string,
  result: GridResult,
  conserved: Float64Array,
  fingerprint: GridFingerprint,
  io: KeepIo = nodeIo,
): void {
  io.write(`${base}.bin.tmp`, Buffer.from(conserved.buffer));
  io.rename(`${base}.bin.tmp`, `${base}.bin`);
  io.write(`${base}.json.tmp`, JSON.stringify({ ...result, fingerprint }));
  io.rename(`${base}.json.tmp`, `${base}.json`);
}

export function fileGridStore(dir: string): GridStore {
  const at = (key: string) => join(dir, key);
  return {
    done: (key, fingerprint) => {
      const base = at(key);
      if (!existsSync(`${base}.json`) || !existsSync(`${base}.bin`)) return null;
      const { fingerprint: kept, ...result } = JSON.parse(readFileSync(`${base}.json`, 'utf8')) as GridResult & {
        fingerprint?: GridFingerprint;
      };
      // A kept grid without a fingerprint (f4d0f74's store) counts as a mismatch too.
      if (kept === undefined || !sameFingerprint(kept, fingerprint))
        return { mismatch: kept ?? ({ numerics: 'none recorded' } as GridFingerprint) };
      const buf = readFileSync(`${base}.bin`);
      return {
        result,
        conserved: new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8).slice(),
      };
    },
    keep: (key, result, conserved, fingerprint) => {
      mkdirSync(dir, { recursive: true });
      writeKept(at(key), result, conserved, fingerprint);
    },
    midFor: (key, path) => fileMidCheckpoint(`${at(key)}-${path}`),
    clearMid: (key) => {
      for (const path of PATHS) fileMidCheckpoint(`${at(key)}-${path}`).clear();
    },
  };
}

const here = dirname(new URL(import.meta.url).pathname);
/** The repository root (docs/research/nose-model-form is three below it). */
const root = resolve(here, '..', '..', '..');

/**
 * The files that determine a grid's numbers: solve-numerics.ts and every
 * file it imports, transitively, by a relative path (the src engines, the
 * grid, the scheme, the body; a bare module such as vitest or node:fs is
 * not followed). Paths relative to the repository root, sorted.
 */
export function numericsFiles(entry = join(here, 'solve-numerics.ts')): string[] {
  const seen = new Set<string>();
  const walk = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    // Value imports and re-exports by a relative path; a type-only import
    // (import type, export type) carries no numerics and is not followed,
    // nor is a non-TypeScript asset (a shader imported ?raw).
    for (const m of text.matchAll(/^(?:import|export)\s+(type\s+)?[^;]*?from\s+'(\.[^']*)'/gms)) {
      if (m[1] !== undefined) continue;
      const spec = m[2]!;
      if (spec.includes('?')) continue;
      const target = resolve(dirname(file), spec);
      const candidates = [target, `${target}.ts`, join(target, 'index.ts')];
      const found = candidates.find((c) => c.endsWith('.ts') && existsSync(c));
      if (found === undefined) throw new Error(`numericsFiles: ${spec} from ${file} not found`);
      walk(found);
    }
  };
  walk(entry);
  return [...seen].map((f) => relative(root, f)).sort();
}

/**
 * The content hash of the numerics files (sha256 over each file's path and
 * text, in sorted order; the first 16 hex digits): the compared code part
 * of a kept grid's fingerprint. A commit that leaves these files as they
 * were leaves the hash as it was, so the grids kept under it stay kept.
 */
export function numericsHash(entry?: string): string {
  const h = createHash('sha256');
  for (const f of numericsFiles(entry)) {
    h.update(f);
    h.update('\0');
    h.update(readFileSync(join(root, f)));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}
