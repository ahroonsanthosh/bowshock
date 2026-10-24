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
import type { GridResult, GridStore, MidCheckpoint, SolvePath } from './solve-common';

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
export function fileGridStore(dir: string): GridStore {
  const at = (key: string) => join(dir, key);
  return {
    done: (key) => {
      const base = at(key);
      if (!existsSync(`${base}.json`) || !existsSync(`${base}.bin`)) return null;
      const buf = readFileSync(`${base}.bin`);
      return {
        result: JSON.parse(readFileSync(`${base}.json`, 'utf8')) as GridResult,
        conserved: new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8).slice(),
      };
    },
    keep: (key, result, conserved) => {
      mkdirSync(dir, { recursive: true });
      const base = at(key);
      writeFileSync(`${base}.bin.tmp`, Buffer.from(conserved.buffer));
      renameSync(`${base}.bin.tmp`, `${base}.bin`);
      writeFileSync(`${base}.json.tmp`, JSON.stringify(result));
      renameSync(`${base}.json.tmp`, `${base}.json`);
    },
    midFor: (key, path) => fileMidCheckpoint(`${at(key)}-${path}`),
    clearMid: (key) => {
      for (const path of PATHS) fileMidCheckpoint(`${at(key)}-${path}`).clear();
    },
  };
}
