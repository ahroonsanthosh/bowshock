/**
 * An OpenRocket import as the page tells it (docs/design/0017-rocketeer-interface.md
 * section 1, task 3): what was taken, what could not be and why, what was
 * left out as not part of the outside, and where the flight came from.
 * The importer is the library of src/import/ (design record 0018); the
 * page loads it when it is part of the build (`import.meta.glob`), so
 * these types are the importer's result as the page reads it.
 */

import type { RocketDesign } from '../rocket/design';

/** A component or setting, as the importer names it. */
export interface ImportedNote {
  readonly component: string;
  readonly reason?: string;
  readonly as?: string;
  /** For what was not represented: 'no-design' keeps the design from being made. */
  readonly effect?: 'no-design' | 'note';
}

/** The importer's mapping (src/import/mapping.ts's OrkMapping), as the page reads it. */
export interface ImportMapping {
  readonly design: RocketDesign | null;
  readonly represented: readonly ImportedNote[];
  readonly notRepresented: readonly ImportedNote[];
  readonly ignored: readonly ImportedNote[];
  readonly finishes: readonly {
    readonly component: string;
    readonly finish: string;
    readonly label: string | null;
  }[];
  readonly flightFrom: string;
}

/** The importer's entry (src/import/index.ts's importOrk), as the page calls it. */
export type ImportOrk = (
  bytes: Uint8Array,
  options: { readonly fileName: string },
) => Promise<{ readonly mapping: ImportMapping }>;

export interface ImportSummary {
  /** One line: the file and what it gave. */
  readonly headline: string;
  /** What could not be taken exactly, each with its reason. */
  readonly notTaken: readonly string[];
  /** What was taken, for Details. */
  readonly taken: readonly string[];
  /** Left out as not part of the outside, for Details. */
  readonly ignored: readonly string[];
  /** Where the flight came from, and the finishes (which the drag does not model: a smooth surface). */
  readonly flight: string;
  readonly finish: string | null;
}

/** The import in plain words. */
export function importSummary(fileName: string, m: ImportMapping): ImportSummary {
  const notTaken = m.notRepresented.map((n) => `${n.component}: ${n.reason ?? 'not represented'}`);
  const finishes = [...new Set(m.finishes.map((f) => f.label ?? f.finish))];
  return {
    headline:
      m.design === null
        ? `${fileName}: no rocket could be made from it.`
        : `${fileName}: ${m.represented.length} part${m.represented.length === 1 ? '' : 's'} taken` +
          (notTaken.length === 0
            ? ', all of them exactly.'
            : `; ${notTaken.length} not exactly, listed below.`),
    notTaken,
    taken: m.represented.map((n) => `${n.component}${n.as === undefined ? '' : `: ${n.as}`}`),
    ignored: m.ignored.map((n) => `${n.component}: ${n.reason ?? 'left out'}`),
    flight: m.flightFrom,
    finish:
      finishes.length === 0
        ? null
        : `Surface finish in the file: ${finishes.join(', ')}. bowshock computes a smooth surface ` +
          '(no roughness is modelled).',
  };
}

/**
 * The largest file the page reads, checked on the file's size before any
 * of it is read (the importer's own limit, DEFAULT_MAX_INFLATED_BYTES).
 */
export const MAX_IMPORT_FILE_BYTES = 64 * 1024 * 1024;

/** Why a file of this many bytes is not read, or null where it is small enough. */
export function fileSizeRefusal(fileName: string, size: number): string | null {
  if (size <= MAX_IMPORT_FILE_BYTES) return null;
  const mib = (b: number) => `${(b / (1024 * 1024)).toFixed(1)} MiB`;
  return (
    `Could not import ${fileName}: it is ${mib(size)}, more than the ` +
    `${mib(MAX_IMPORT_FILE_BYTES)} the page reads; nothing was read from it.`
  );
}

/** The importer, if this build has it. */
export async function loadImporter(): Promise<ImportOrk | null> {
  const found = import.meta.glob<{ importOrk: ImportOrk }>('../import/index.ts');
  const load = Object.values(found)[0];
  if (load === undefined) return null;
  const module = await load();
  return module.importOrk;
}
