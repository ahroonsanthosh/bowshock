import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { crc32, readZipDirectory, unpack } from '../../src/import/container';
import { OrkReadError } from '../../src/import/errors';
import { readOrk } from '../../src/import/read';
import { bytesOf, document, fixture, nose, stage, tube } from './build';
import { compress, concat, zip } from './zip';

/** The OrkReadError a read ends in; fails the test if it ends any other way. */
async function refusal(read: Promise<unknown>): Promise<OrkReadError> {
  try {
    await read;
  } catch (e) {
    expect(e).toBeInstanceOf(OrkReadError);
    return e as OrkReadError;
  }
  throw new Error('the read was expected to fail');
}

const small = bytesOf(document([stage([nose(), tube()])]));

describe('container: which kind of file', () => {
  it("reads a real OpenRocket ZIP archive's rocket.ork (data descriptors, UTF-8 names)", async () => {
    const bytes = fixture('a-simple-model-rocket.ork');
    const entries = readZipDirectory(bytes);
    expect(entries.map((e) => e.name)).toEqual([
      'rocket.ork',
      'decals/BodyStripe.png',
      'decals/TailStripe.png',
    ]);
    expect(entries[0]!.flags & 0x8).toBe(0x8); // sizes after the data, not in the local header
    const u = await unpack(bytes);
    expect(u.container).toBe('zip');
    expect(u.entry).toBe('rocket.ork');
    expect(u.bytes.length).toBe(entries[0]!.uncompressedSize);
    expect(new TextDecoder().decode(u.bytes.subarray(0, 39))).toBe(
      "<?xml version='1.0' encoding='utf-8'?>\n",
    );
  });

  it("reads gzip-compressed XML (older OpenRocket), made here by Python's gzip module", async () => {
    const u = await unpack(fixture('minimum-diameter-gzip.ork'));
    expect(u.container).toBe('gzip');
    expect(u.bytes).toEqual(fixture('minimum-diameter.ork'));
  });

  it('reads plain XML', async () => {
    const u = await unpack(fixture('minimum-diameter.ork'));
    expect(u.container).toBe('xml');
    expect(u.bytes).toEqual(fixture('minimum-diameter.ork'));
  });

  it('reads stored and deflated entries, taking the first entry ending in .ork', async () => {
    for (const method of [0, 8]) {
      const archive = await zip([
        { name: 'preview.png', data: new Uint8Array([1, 2, 3]), method },
        { name: 'my rocket.ORK', data: small, method },
        { name: 'second.ork', data: new Uint8Array([0]), method },
      ]);
      const u = await unpack(archive);
      expect(u.entry).toBe('my rocket.ORK');
      expect(u.bytes).toEqual(small);
    }
  });

  it('CRC-32 is the standard one (check value of "123456789")', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('container: damaged and refused files, each with a plain message', () => {
  it('an empty file', async () => {
    const e = await refusal(readOrk(new Uint8Array()));
    expect(e.kind).toBe('not-openrocket');
    expect(e.message).toBe('The file is empty.');
  });

  it('random bytes', async () => {
    const bytes = new Uint8Array(4096);
    let s = 12345;
    for (let i = 0; i < bytes.length; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      bytes[i] = s >>> 24;
    }
    bytes[0] = 0x00;
    const e = await refusal(readOrk(bytes));
    expect(e.kind).toBe('not-openrocket');
    expect(e.message).toMatch(/neither a ZIP archive, a gzip file nor XML/);
  });

  it('a truncated archive', async () => {
    const bytes = fixture('a-simple-model-rocket.ork');
    const e = await refusal(readOrk(bytes.subarray(0, bytes.length >> 1)));
    expect(e.kind).toBe('corrupt');
    expect(e.message).toMatch(/damaged ZIP archive: its directory is missing/);
  });

  it('a byte changed inside the compressed design', async () => {
    const bytes = new Uint8Array(fixture('a-simple-model-rocket.ork'));
    bytes[5000] = bytes[5000]! ^ 0xff;
    const e = await refusal(readOrk(bytes));
    expect(e.kind).toBe('corrupt');
    expect(e.message).toMatch(/rocket\.ork/);
  });

  it('a stored entry whose data no longer matches its CRC-32', async () => {
    const archive = await zip([{ name: 'rocket.ork', data: small, method: 0 }]);
    const at = 30 + 'rocket.ork'.length + 10;
    archive[at] = archive[at]! ^ 0x01;
    const e = await refusal(readOrk(archive));
    expect(e.kind).toBe('corrupt');
    expect(e.message).toMatch(/fails its CRC-32 check/);
  });

  it('"PK" and nothing else of an archive', async () => {
    const e = await refusal(readOrk(new TextEncoder().encode('PK and then nothing useful at all')));
    expect(e.kind).toBe('corrupt');
  });

  it('a truncated gzip file', async () => {
    const bytes = fixture('minimum-diameter-gzip.ork');
    const e = await refusal(readOrk(bytes.subarray(0, bytes.length - 40)));
    expect(e.kind).toBe('corrupt');
    expect(e.message).toMatch(/gzip-compressed file is damaged/);
  });

  it('an archive with no .ork entry', async () => {
    const archive = await zip([{ name: 'notes.txt', data: new Uint8Array([65]) }]);
    const e = await refusal(readOrk(archive));
    expect(e.kind).toBe('not-openrocket');
    expect(e.message).toMatch(/holds no OpenRocket design.*"notes\.txt"/);
  });

  it('an archive holding a RockSim design', async () => {
    const archive = await zip([{ name: 'rocket.rkt', data: new Uint8Array([60]) }]);
    const e = await refusal(readOrk(archive));
    expect(e.kind).toBe('not-openrocket');
    expect(e.message).toMatch(/RockSim or RASAero design/);
  });

  it('an encrypted entry', async () => {
    const archive = await zip([{ name: 'rocket.ork', data: small, flags: 0x801 }]);
    const e = await refusal(readOrk(archive));
    expect(e.kind).toBe('unsupported');
    expect(e.message).toMatch(/is encrypted/);
  });

  it('an unknown compression method', async () => {
    const archive = await zip([{ name: 'rocket.ork', data: small, method: 12 }]);
    const e = await refusal(readOrk(archive));
    expect(e.kind).toBe('unsupported');
    expect(e.message).toMatch(/compression method 12/);
  });

  it('a ZIP64 archive', async () => {
    const archive = await zip([{ name: 'rocket.ork', data: small }]);
    new DataView(archive.buffer).setUint32(archive.length - 6, 0xffffffff, true);
    const e = await refusal(readOrk(archive));
    expect(e.kind).toBe('unsupported');
    expect(e.message).toMatch(/ZIP64/);
  });
});

describe('container: zip bombs', () => {
  const zeros = new Uint8Array(2 * 1024 * 1024);

  it('refuses an entry that says it inflates past the limit, before inflating it', async () => {
    const archive = await zip([{ name: 'rocket.ork', data: small, declaredSize: 2 ** 31 }]);
    const e = await refusal(readOrk(archive));
    expect(e.kind).toBe('too-large');
    expect(e.message).toMatch(/2048\.0 MiB, more than the 64\.0 MiB/);
  });

  it('stops inflating an entry at its declared size', async () => {
    const archive = await zip([{ name: 'rocket.ork', data: zeros, declaredSize: 1000 }]);
    const e = await refusal(readOrk(archive));
    expect(e.kind).toBe('corrupt');
    expect(e.message).toMatch(/inflates to more than its declared size/);
  });

  it('stops inflating a gzip file at the limit', async () => {
    const bomb = await compress(zeros, 'gzip');
    expect(bomb.length).toBeLessThan(10_000);
    const e = await refusal(readOrk(bomb, { maxInflatedBytes: 1024 * 1024 }));
    expect(e.kind).toBe('too-large');
    expect(e.message).toMatch(/more than 1\.0 MiB.*zip bombs/);
  });

  it('stops inflating a ZIP entry at the limit', async () => {
    const archive = await zip([{ name: 'rocket.ork', data: zeros }]);
    const e = await refusal(readOrk(archive, { maxInflatedBytes: 1024 * 1024 }));
    expect(e.kind).toBe('too-large');
  });
});

describe('container: no input ends in anything but a design or an OrkReadError', () => {
  it('property: any single damaged byte, or any truncation, of an archive', async () => {
    const archive = await zip([
      { name: 'rocket.ork', data: small },
      { name: 'decal.png', data: new Uint8Array(64).fill(7), method: 0 },
    ]);
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: archive.length - 1 }),
        fc.integer({ min: 1, max: 255 }),
        fc.integer({ min: 0, max: archive.length }),
        async (at, xor, cut) => {
          const damaged = new Uint8Array(archive);
          damaged[at] = damaged[at]! ^ xor;
          for (const bytes of [damaged, archive.subarray(0, cut)]) {
            try {
              await readOrk(bytes);
            } catch (e) {
              expect(e).toBeInstanceOf(OrkReadError);
            }
          }
        },
      ),
      { seed: 18, numRuns: 150 },
    );
  });

  it('property: arbitrary bytes behind each signature', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom([0x50, 0x4b], [0x1f, 0x8b], [0x3c], [0xef, 0xbb, 0xbf, 0x3c]),
        fc.uint8Array({ maxLength: 300 }),
        async (head, tail) => {
          try {
            await readOrk(concat([new Uint8Array(head), tail]));
          } catch (e) {
            expect(e).toBeInstanceOf(OrkReadError);
          }
        },
      ),
      { seed: 19, numRuns: 200 },
    );
  });
});
