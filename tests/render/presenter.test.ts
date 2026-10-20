import { describe, expect, it } from 'vitest';
import { presentationFor } from '../../src/render/presenter';

describe('how frames reach the page', () => {
  it('copies them on software adapters, where presenting to a canvas can lose the device', () => {
    const adapter = (vendor: string, architecture: string, description = '') => ({
      vendor,
      architecture,
      description,
    });
    expect(presentationFor(adapter('google', 'swiftshader'))).toBe('copy');
    expect(presentationFor(adapter('mesa', '', 'llvmpipe (LLVM 15.0.7, 256 bits)'))).toBe('copy');
    expect(presentationFor({ ...adapter('', ''), isFallbackAdapter: true })).toBe('copy');
    expect(presentationFor(adapter('nvidia', 'ampere'))).toBe('canvas');
    expect(presentationFor(adapter('apple', 'metal-3'))).toBe('canvas');
    expect(presentationFor(adapter('intel', 'gen-12lp'))).toBe('canvas');
  });
});
