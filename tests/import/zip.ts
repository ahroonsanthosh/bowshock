/**
 * A minimal ZIP writer for the tests (stored or deflated entries, sizes in
 * the local headers), to build archives the reader must take or refuse.
 * The CRC-32 is the reader's own, which the real OpenRocket files check.
 */

import { crc32 } from '../../src/import/container';

export interface Entry {
  readonly name: string;
  readonly data: Uint8Array;
  /** 0: stored, 8: deflated (default); other numbers are written as given, stored. */
  readonly method?: number;
  readonly flags?: number;
  /** Written as the uncompressed size in place of the real one. */
  readonly declaredSize?: number;
}

export async function compress(
  data: Uint8Array,
  format: 'deflate-raw' | 'gzip',
): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(data)])
    .stream()
    .pipeThrough(new CompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function zip(entries: readonly Entry[]): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const method = e.method ?? 8;
    const body = method === 8 ? await compress(e.data, 'deflate-raw') : e.data;
    const name = new TextEncoder().encode(e.name);
    const crc = crc32(e.data);
    const size = e.declaredSize ?? e.data.length;
    const flags = e.flags ?? 0x800;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, flags, true);
    local.setUint16(8, method, true);
    local.setUint16(12, 0x21, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, body.length, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, body);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, flags, true);
    dir.setUint16(10, method, true);
    dir.setUint16(14, 0x21, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, body.length, true);
    dir.setUint32(24, size, true);
    dir.setUint16(28, name.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), name);
    offset += 30 + name.length + body.length;
  }
  const directorySize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);
  return concat([...parts, ...central, new Uint8Array(end.buffer)]);
}

export function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
