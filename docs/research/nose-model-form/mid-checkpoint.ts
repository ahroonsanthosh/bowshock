/**
 * A file-based mid-grid checkpoint for the CPU scripts (solve-common's
 * MidCheckpoint): <path>.bin holds the conserved state, saved every
 * MID_EVERY_SECONDS; it is deleted once the grid has settled and its
 * per-grid checkpoint exists.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { MidCheckpoint } from './solve-common';

export const MID_EVERY_SECONDS = Number(process.env.MID_EVERY_SECONDS ?? 900);

export function fileMidCheckpoint(path: string): MidCheckpoint & { readonly clear: () => void } {
  const file = `${path}-mid.bin`;
  return {
    everySeconds: MID_EVERY_SECONDS,
    load: () => {
      if (!existsSync(file)) return null;
      const buf = readFileSync(file);
      return new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8).slice();
    },
    save: (q) => {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(`${file}.tmp`, Buffer.from(q.buffer));
      // Rename is atomic on one file system, so a restart never reads a half-written state.
      writeFileSync(file, readFileSync(`${file}.tmp`));
      unlinkSync(`${file}.tmp`);
    },
    clear: () => {
      if (existsSync(file)) unlinkSync(file);
    },
  };
}
