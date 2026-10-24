/**
 * A file-based mid-grid checkpoint for the CPU scripts (solve-common's
 * MidCheckpoint): <path>-mid.bin holds the conserved state and
 * <path>-mid.json its step count and residual marks, saved every
 * MID_EVERY_SECONDS; both are deleted once the grid has settled and its
 * per-grid checkpoint exists. A state without its step count is not
 * continued from (the cap is per grid, across restarts).
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
        return { mismatch: kept ?? ({ commit: 'none recorded' } as GridFingerprint) };
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
