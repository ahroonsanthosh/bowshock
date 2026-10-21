/**
 * OpenRocket import: read a .ork file into the typed mirror of its rocket,
 * and map that onto the design the drag model takes, every component
 * represented exactly, reported as not represented, or ignored, each with
 * its reason. A library, no interface.
 *
 * docs/design/0018-openrocket-import.md.
 */

import { mapRocket, type OrkMapping } from './mapping';
import type { OrkDocument } from './model';
import { readOrk, type ReadOptions } from './read';

export { DEFAULT_MAX_INFLATED_BYTES } from './container';
export type { DesignFinSet, FlatPlateSection, ImportedDesign } from './design';
export { OrkReadError, type OrkReadErrorKind } from './errors';
export {
  mapRocket,
  ROUGHNESS_NOTE,
  type ComponentRef,
  type FinishNote,
  type IgnoredNote,
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

/** Read an OpenRocket file and map its rocket. Throws OrkReadError if the file cannot be read. */
export async function importOrk(bytes: Uint8Array, options: ReadOptions = {}): Promise<OrkImport> {
  const document = await readOrk(bytes, options);
  return { document, mapping: mapRocket(document.rocket) };
}
