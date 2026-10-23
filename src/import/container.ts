/**
 * The container of an OpenRocket file: since OpenRocket 13.04 a ZIP
 * archive holding the design as `rocket.ork` (beside decals, a preview
 * image and thrust curves); before that, gzip-compressed XML or plain XML.
 * As OpenRocket's own loader does (core/.../file/GeneralRocketLoader.java),
 * the container is told by its first bytes: 1f 8b is gzip, "PK" is ZIP,
 * anything else is taken as XML.
 *
 * Inflation uses the platform's DecompressionStream ('deflate-raw' and
 * 'gzip'; browsers since 2023, Node 18 and later), so the reader needs no
 * dependency. The ZIP reader takes the sizes from the central directory
 * (OpenRocket writes its entries with data descriptors, so the local
 * headers carry no sizes), checks every offset against the file, checks
 * each entry's CRC-32, and stops inflating at a limit (64 MiB by default)
 * so that a zip bomb cannot exhaust memory.
 *
 * docs/design/0018-openrocket-import.md section 2.
 */

import { OrkReadError } from './errors';

export type OrkContainer = 'zip' | 'gzip' | 'xml';

export interface UnpackOptions {
  /** The most bytes the design may inflate to (default 64 MiB). */
  readonly maxInflatedBytes?: number;
}

export interface Unpacked {
  readonly container: OrkContainer;
  /** The archive entry the design was read from (ZIP only). */
  readonly entry?: string;
  /** The design document's bytes (XML). */
  readonly bytes: Uint8Array;
}

export const DEFAULT_MAX_INFLATED_BYTES = 64 * 1024 * 1024;

const MiB = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;

/** The design document inside an OpenRocket file, whatever its container. */
export async function unpack(bytes: Uint8Array, options: UnpackOptions = {}): Promise<Unpacked> {
  const limit = options.maxInflatedBytes ?? DEFAULT_MAX_INFLATED_BYTES;
  if (bytes.length === 0) throw new OrkReadError('not-openrocket', 'The file is empty.');
  // A file larger than the limit is refused before anything is read from it.
  if (bytes.length > limit) {
    throw new OrkReadError(
      'too-large',
      `The file is ${MiB(bytes.length)}, more than the ${MiB(limit)} this reader takes.`,
    );
  }
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const inner = await inflate(bytes, 'gzip', limit, 'the gzip-compressed file');
    return { container: 'gzip', bytes: inner };
  }
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const { name, data } = await readDesignEntry(bytes, limit);
    return { container: 'zip', entry: name, bytes: data };
  }
  return { container: 'xml', bytes };
}

// ------------------------------------------------------------------ inflate

/**
 * Inflate `data` (raw deflate or gzip), refusing more than `limit` bytes
 * of output: the stream is cancelled as soon as the limit is passed.
 */
export async function inflate(
  data: Uint8Array,
  format: 'deflate-raw' | 'gzip',
  limit: number,
  what: string,
): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new OrkReadError(
      'unsupported',
      'This browser cannot decompress files (it has no DecompressionStream); a current ' +
        'Chrome, Edge, Firefox or Safari can.',
    );
  }
  let stream: DecompressionStream;
  try {
    stream = new DecompressionStream(format);
  } catch {
    throw new OrkReadError(
      'unsupported',
      `This browser cannot decompress ${format} data; a current Chrome, Edge, Firefox or Safari can.`,
    );
  }
  const writer = stream.writable.getWriter();
  // Errors surface on the reading side; the writer's own promises are
  // settled here so that none is left unhandled.
  void (async () => {
    try {
      await writer.write(new Uint8Array(data));
      await writer.close();
    } catch {
      // Reported by the reader.
    }
  })();
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        throw new OrkReadError(
          'too-large',
          `${capitalise(what)} inflates to more than ${MiB(limit)}, the most this reader takes ` +
            '(a guard against zip bombs). If it is a real design, save it from OpenRocket ' +
            'without its simulation data.',
        );
      }
      chunks.push(value);
    }
  } catch (e) {
    if (e instanceof OrkReadError) throw e;
    throw new OrkReadError(
      'corrupt',
      `${capitalise(what)} is damaged: its compressed data cannot be inflated` +
        (e instanceof Error && e.message !== '' ? ` (${e.message})` : '') +
        '.',
    );
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------- ZIP

export interface ZipEntry {
  readonly name: string;
  readonly flags: number;
  readonly method: number;
  readonly crc32: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localHeaderOffset: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

const damaged = (detail: string) =>
  new OrkReadError('corrupt', `The file is a damaged ZIP archive: ${detail}.`);

/** The entries of a ZIP archive, from its central directory. Throws OrkReadError. */
export function readZipDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number) => view.getUint16(at, true);
  const u32 = (at: number) => view.getUint32(at, true);
  // The end-of-central-directory record: 22 bytes and a comment of up to
  // 65535, so it starts within the last 65557 bytes.
  let eocd = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 22 - 65535); at--) {
    if (u32(at) === EOCD_SIGNATURE && at + 22 + u16(at + 20) <= bytes.length) {
      eocd = at;
      break;
    }
  }
  if (eocd < 0) throw damaged('its directory is missing, so it is probably truncated');
  const disk = u16(eocd + 4);
  const directoryDisk = u16(eocd + 6);
  const entriesHere = u16(eocd + 8);
  const entries = u16(eocd + 10);
  const directorySize = u32(eocd + 12);
  const directoryOffset = u32(eocd + 16);
  if (entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
    throw new OrkReadError(
      'unsupported',
      'The file is a ZIP64 archive, which OpenRocket does not write; it is not read.',
    );
  }
  if (disk !== 0 || directoryDisk !== 0 || entriesHere !== entries) {
    throw new OrkReadError('unsupported', 'The file is a multi-part ZIP archive; it is not read.');
  }
  if (directoryOffset + directorySize > eocd) {
    throw damaged('its directory lies outside the file');
  }
  const list: ZipEntry[] = [];
  let at = directoryOffset;
  for (let k = 0; k < entries; k++) {
    if (at + 46 > eocd || u32(at) !== CENTRAL_SIGNATURE) {
      throw damaged(`directory entry ${k + 1} of ${entries} is not where the directory says`);
    }
    const flags = u16(at + 8);
    const method = u16(at + 10);
    const crc32 = u32(at + 16);
    const compressedSize = u32(at + 20);
    const uncompressedSize = u32(at + 24);
    const nameLength = u16(at + 28);
    const extraLength = u16(at + 30);
    const commentLength = u16(at + 32);
    const localHeaderOffset = u32(at + 42);
    const end = at + 46 + nameLength + extraLength + commentLength;
    if (end > eocd) throw damaged(`directory entry ${k + 1} runs past the directory`);
    const rawName = bytes.subarray(at + 46, at + 46 + nameLength);
    // Bit 11: the name is UTF-8; otherwise code page 437, of which the
    // names that matter here (ASCII) are the same.
    let name = '';
    if ((flags & 0x800) !== 0) name = new TextDecoder('utf-8').decode(rawName);
    else for (const b of rawName) name += String.fromCharCode(b);
    list.push({
      name,
      flags,
      method,
      crc32,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    at = end;
  }
  return list;
}

/**
 * The entry holding the design: as OpenRocket, the first whose name ends
 * in ".ork" (OpenRocket writes it first, as "rocket.ork").
 */
async function readDesignEntry(
  bytes: Uint8Array,
  limit: number,
): Promise<{ name: string; data: Uint8Array }> {
  const entries = readZipDirectory(bytes);
  const ordered = [...entries].sort((a, b) => a.localHeaderOffset - b.localHeaderOffset);
  const entry = ordered.find((e) => /\.ork$/i.test(e.name));
  if (entry === undefined) {
    const other = ordered.find((e) => /\.(rkt|cdx1)$/i.test(e.name));
    if (other !== undefined) {
      throw new OrkReadError(
        'not-openrocket',
        `The archive holds "${other.name}", a RockSim or RASAero design, not an OpenRocket one; ` +
          'open it in OpenRocket and save it as an OpenRocket file.',
      );
    }
    const names = ordered.map((e) => `"${e.name}"`).join(', ');
    throw new OrkReadError(
      'not-openrocket',
      'The file is a ZIP archive but holds no OpenRocket design (no entry ending in ".ork"' +
        (names === '' ? '; it is empty' : `; it holds ${names}`) +
        ').',
    );
  }
  return { name: entry.name, data: await readEntry(bytes, entry, limit) };
}

/** One entry's contents, inflated and checked against its size and CRC-32. */
export async function readEntry(
  bytes: Uint8Array,
  entry: ZipEntry,
  limit: number,
): Promise<Uint8Array> {
  const what = `the archive's "${entry.name}"`;
  if ((entry.flags & 0x1) !== 0) {
    throw new OrkReadError('unsupported', `${capitalise(what)} is encrypted; it is not read.`);
  }
  if (entry.uncompressedSize > limit) {
    throw new OrkReadError(
      'too-large',
      `${capitalise(what)} says it inflates to ${MiB(entry.uncompressedSize)}, more than the ` +
        `${MiB(limit)} this reader takes (a guard against zip bombs). If it is a real design, ` +
        'save it from OpenRocket without its simulation data.',
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const at = entry.localHeaderOffset;
  if (at + 30 > bytes.length || view.getUint32(at, true) !== LOCAL_SIGNATURE) {
    throw damaged(`${what} is not where its directory entry says`);
  }
  const start = at + 30 + view.getUint16(at + 26, true) + view.getUint16(at + 28, true);
  const end = start + entry.compressedSize;
  if (end > bytes.length) throw damaged(`${what} runs past the end of the file`);
  const compressed = bytes.subarray(start, end);
  let data: Uint8Array;
  if (entry.method === 0) {
    data = compressed;
  } else if (entry.method === 8) {
    // The declared size bounds the inflation: more output than declared is damage.
    data = await inflate(compressed, 'deflate-raw', entry.uncompressedSize, what).catch(
      (e: unknown) => {
        if (e instanceof OrkReadError && e.kind === 'too-large') {
          throw damaged(`${what} inflates to more than its declared size`);
        }
        throw e;
      },
    );
  } else {
    throw new OrkReadError(
      'unsupported',
      `${capitalise(what)} uses compression method ${entry.method}; only stored (0) and ` +
        'deflated (8) entries are read, which is what OpenRocket writes.',
    );
  }
  if (data.length !== entry.uncompressedSize) {
    throw damaged(`${what} is ${data.length} bytes, not the ${entry.uncompressedSize} declared`);
  }
  if (crc32(data) !== entry.crc32) throw damaged(`${what} fails its CRC-32 check`);
  return data;
}

let CRC_TABLE: Uint32Array | undefined;

/** CRC-32 (IEEE 802.3, reflected, polynomial 0xEDB88320), as ZIP uses. */
export function crc32(data: Uint8Array): number {
  if (CRC_TABLE === undefined) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
