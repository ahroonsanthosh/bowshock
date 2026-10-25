import { describe, expect, it } from 'vitest';
import { bandSection } from '../../src/ui/help';

describe('help', () => {
  it("states the band's allowance, and the larger one on Von Karman noses", () => {
    const text = bandSection()
      .body.filter((part): part is string => typeof part === 'string')
      .join(' ');
    expect(text).toContain('an allowance of 7e-5 of the value (8e-4 on Von Karman noses)');
  });
});
