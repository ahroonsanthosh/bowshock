/**
 * The importer's memory guards (the interface review's item 5): a raw file
 * larger than the limit is refused before it is read, and the XML reader
 * counts elements, so that millions of tiny elements (12 million `<x/>`
 * exhausted Node's heap before) are refused with a plain message.
 */

import { describe, expect, it } from 'vitest';
import { fileSizeRefusal, MAX_IMPORT_FILE_BYTES } from '../../src/app/import-summary';
import { DEFAULT_MAX_INFLATED_BYTES, unpack } from '../../src/import/container';
import { OrkReadError } from '../../src/import/errors';
import { readOrk } from '../../src/import/read';
import { MAX_ALL_ELEMENTS, MAX_KEPT_ELEMENTS, parseXml, XmlError } from '../../src/import/xml';
import { bytesOf, document, fixture, nose, stage, tube } from './build';

async function refusal(read: Promise<unknown>): Promise<OrkReadError> {
  try {
    await read;
  } catch (e) {
    expect(e).toBeInstanceOf(OrkReadError);
    return e as OrkReadError;
  }
  throw new Error('the read was expected to fail');
}

describe('the file size, before anything is read', () => {
  it("the page's limit is the importer's", () => {
    expect(MAX_IMPORT_FILE_BYTES).toBe(DEFAULT_MAX_INFLATED_BYTES);
  });

  it('a file above the limit is refused by its size alone, in plain words', () => {
    expect(fileSizeRefusal('big.ork', MAX_IMPORT_FILE_BYTES)).toBeNull();
    expect(fileSizeRefusal('big.ork', MAX_IMPORT_FILE_BYTES + 1)).toBe(
      'Could not import big.ork: it is 64.0 MiB, more than the 64.0 MiB the page reads; ' +
        'nothing was read from it.',
    );
    expect(fileSizeRefusal('huge.ork', 3 * 1024 ** 3)).toMatch(/it is 3072\.0 MiB/);
  });

  it('the reader refuses bytes above its limit before unpacking them', async () => {
    const bytes = bytesOf(document([stage([nose(), tube()])]));
    const e = await refusal(unpack(bytes, { maxInflatedBytes: bytes.length - 1 }));
    expect(e.kind).toBe('too-large');
    expect(e.message).toMatch(/^The file is .* MiB, more than the .* MiB this reader takes\.$/);
    // At the limit it is read.
    await expect(unpack(bytes, { maxInflatedBytes: bytes.length })).resolves.toBeDefined();
  });
});

describe('the number of elements', () => {
  it('kept elements are limited, and so are all', () => {
    const many = (n: number) => `<a>${'<x/>'.repeat(n)}</a>`;
    expect(parseXml(many(10), { maxElements: 11 }).children).toHaveLength(10);
    expect(() => parseXml(many(11), { maxElements: 11 })).toThrow(XmlError);
    expect(() => parseXml(many(11), { maxElements: 11 })).toThrow(/more than 11 elements/);
    // Skipped subtrees are not kept but still counted in all.
    const skipped = `<a><s>${'<x/>'.repeat(50)}</s></a>`;
    expect(parseXml(skipped, { skip: new Set(['s']), maxElements: 5 }).children).toHaveLength(1);
    expect(() => parseXml(skipped, { skip: new Set(['s']), maxAllElements: 40 })).toThrow(
      /more than 40 elements/,
    );
  });

  it('millions of tiny elements are refused, quickly and in plain words', async () => {
    const n = 3_000_000;
    const text = `<openrocket version="1.9">${'<x/>'.repeat(n)}</openrocket>`;
    const started = performance.now();
    const e = await refusal(readOrk(new TextEncoder().encode(text)));
    expect(e.kind).toBe('malformed-xml');
    expect(e.message).toMatch(new RegExp(`more than ${MAX_KEPT_ELEMENTS} elements`));
    expect(performance.now() - started).toBeLessThan(20_000);
    expect(MAX_ALL_ELEMENTS).toBeGreaterThan(MAX_KEPT_ELEMENTS);
  });

  it('every example file is far inside both limits', async () => {
    for (const name of ['simulation-extensions.ork', 'airstart-timing.ork']) {
      await expect(readOrk(fixture(name))).resolves.toBeDefined();
    }
  });
});
