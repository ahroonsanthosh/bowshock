/**
 * OpenRocket import: read a .ork file into the typed mirror of its rocket,
 * and map that into src/rocket's RocketDesign, every component held in
 * the design, held with a note for what the design has no place for, or
 * ignored with its reason. A library, no interface.
 *
 * docs/design/0018-openrocket-import.md.
 */

import { mapOrk, type MapOptions, type OrkMapping } from './mapping';
import type { OrkDocument } from './model';
import { readOrk, type ReadOptions } from './read';

export { DEFAULT_MAX_INFLATED_BYTES } from './container';
export { OrkReadError, type OrkReadErrorKind } from './errors';
export {
  DEFAULT_FLIGHT,
  mapOrk,
  type ComponentRef,
  type FinishNote,
  type IgnoredNote,
  type MapOptions,
  type NotRepresentedNote,
  type OrkMapping,
  type RepresentedNote,
} from './mapping';
export * from './model';
export { readOrk, type ReadOptions } from './read';

export interface OrkImport {
  readonly document: OrkDocument;
  readonly mapping: OrkMapping;
}

/**
 * Read an OpenRocket file and map its rocket into the design. Throws
 * OrkReadError, with a plain message, if the file cannot be read.
 */
export async function importOrk(
  bytes: Uint8Array,
  options: ReadOptions & MapOptions,
): Promise<OrkImport> {
  const document = await readOrk(bytes, options);
  return { document, mapping: mapOrk(document, options) };
}
