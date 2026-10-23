/**
 * Read an OpenRocket file (.ork) into the typed mirror of its rocket:
 * unpack the container (./container.ts), decode the text, parse the XML
 * (./xml.ts) and read the components (./parse.ts). Every failure is an
 * OrkReadError with a plain message; nothing else is thrown for any input.
 *
 * docs/design/0018-openrocket-import.md section 2.
 */

import { unpack, type UnpackOptions } from './container';
import { OrkReadError } from './errors';
import type { OrkDocument } from './model';
import { documentOf } from './parse';
import { parseXml, XmlError } from './xml';

export type ReadOptions = UnpackOptions;

/**
 * Elements whose content is not kept: the simulations' time series (the
 * bulk of a file) and display settings, not the design.
 */
const NOT_KEPT = new Set(['databranch', 'photostudio', 'docprefs', 'datatypes']);

/** The encoding of an XML document from its byte-order mark or declaration (UTF-8 by default). */
function encodingOf(bytes: Uint8Array): { label: string; skip: number } {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return { label: 'utf-8', skip: 3 };
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { label: 'utf-16le', skip: 2 };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { label: 'utf-16be', skip: 2 };
  let head = '';
  for (const b of bytes.subarray(0, 200)) head += String.fromCharCode(b);
  const m = /^\s*<\?xml[^>]*?\bencoding\s*=\s*["']([A-Za-z][A-Za-z0-9._-]*)["']/.exec(head);
  return { label: m?.[1] ?? 'utf-8', skip: 0 };
}

export async function readOrk(bytes: Uint8Array, options: ReadOptions = {}): Promise<OrkDocument> {
  const unpacked = await unpack(bytes, options);
  const inside =
    unpacked.container === 'zip'
      ? `the archive's "${unpacked.entry ?? ''}"`
      : unpacked.container === 'gzip'
        ? 'the gzip-compressed document'
        : 'the file';
  const notOpenRocket = () =>
    new OrkReadError(
      'not-openrocket',
      unpacked.container === 'xml'
        ? 'The file is not an OpenRocket design: it is neither a ZIP archive, a gzip file nor XML.'
        : `The file is not an OpenRocket design: ${inside} is not XML.`,
    );

  const { label, skip } = encodingOf(unpacked.bytes);
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(label, { fatal: true });
  } catch {
    throw new OrkReadError(
      'unsupported',
      `${inside === 'the file' ? 'The file' : inside} declares the text encoding "${label}", ` +
        'which this browser cannot decode.',
    );
  }
  let text: string;
  try {
    text = decoder.decode(unpacked.bytes.subarray(skip));
  } catch {
    throw notOpenRocket();
  }
  if (!/^\s*</.test(text)) throw notOpenRocket();

  let root;
  try {
    root = parseXml(text, { skip: NOT_KEPT });
  } catch (e) {
    if (!(e instanceof XmlError)) throw e;
    if (unpacked.container === 'xml' && !text.slice(0, 1000).includes('<openrocket')) {
      throw notOpenRocket();
    }
    throw new OrkReadError(
      'malformed-xml',
      `The OpenRocket design in ${inside} is not well-formed XML: ${e.message}.`,
    );
  }
  if (root.name === 'RockSimDoc' || root.name === 'RASAeroDoc') {
    const program = root.name === 'RockSimDoc' ? 'RockSim' : 'RASAero';
    throw new OrkReadError(
      'not-openrocket',
      `The file is a ${program} design, not an OpenRocket one; open it in OpenRocket and save it ` +
        'as an OpenRocket file.',
    );
  }
  if (root.name !== 'openrocket') {
    throw new OrkReadError(
      'not-openrocket',
      `The file is XML but not an OpenRocket design: its root element is <${root.name}>, not ` +
        '<openrocket>.',
    );
  }
  return documentOf(root, unpacked.container);
}
