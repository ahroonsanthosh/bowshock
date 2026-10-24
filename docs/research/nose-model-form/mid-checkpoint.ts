/**
 * A file-based mid-grid checkpoint for the CPU scripts (solve-common's
 * MidCheckpoint): <path>-mid.bin holds the conserved state and
 * <path>-mid.json its step count and residual marks, saved every
 * MID_EVERY_SECONDS; both are deleted once the grid has settled and its
 * per-grid checkpoint exists. A state without its step count is not
 * continued from (the cap is per grid, across restarts).
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { MidCheckpoint } from './solve-common';

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
      writeFileSync(`${file}.tmp`, Buffer.from(state.conserved.buffer));
      // Rename is atomic on one file system, so a restart never reads a half-written state.
      writeFileSync(file, readFileSync(`${file}.tmp`));
      unlinkSync(`${file}.tmp`);
      writeFileSync(
        meta,
        JSON.stringify({
          steps: state.steps,
          firstResidual: state.firstResidual,
          largestResidual: state.largestResidual,
          saved: new Date().toISOString(),
        }),
      );
    },
    clear: () => {
      for (const f of [file, meta]) if (existsSync(f)) unlinkSync(f);
    },
  };
}
