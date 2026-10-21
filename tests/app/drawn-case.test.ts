import { describe, expect, it } from 'vitest';
import { DrawnCaseRecord, pngCaption, pngName } from '../../src/app/drawn-case';

describe('the case a saved PNG names and captions', () => {
  it('is the case drawn, not the one being set up: Mach 2 drawn, 3 chosen, K at once', () => {
    const record = new DrawnCaseRecord();
    // Nothing drawn yet: nothing to save.
    expect(record.current).toBeNull();
    // A run at Mach 2 (run 1): its grid drawn, a check, its outcome.
    record.drawnGrid(1, 2, '191×20');
    record.checked(1, 0.10461700515611559);
    record.settled(1, '0.10462', 'Not verified');
    // Mach 3 chosen: run 2 stops run 1 and sets up; the Mach 2 flow stays drawn.
    record.checked(2, 0.2);
    record.settled(2, 'none', 'Refused');
    const drawn = record.current!;
    expect(pngName(drawn, 'mach')).toBe('bowshock-basic-finner-M2-mach.png');
    expect(pngCaption(drawn)).toEqual([
      'bowshock: the Basic Finner, M 2.00, α 0°, grid 191×20',
      'wave Cd 0.10462 (Not verified)',
    ]);
    // Once run 2's grid is drawn, the PNG is of Mach 3.
    record.drawnGrid(2, 3, '191×20');
    expect(pngName(record.current!, 'split')).toBe('bowshock-basic-finner-M3-split.png');
    expect(pngCaption(record.current!)).toEqual([
      'bowshock: the Basic Finner, M 3.00, α 0°, grid 191×20',
      'wave Cd: solving, no check yet',
    ]);
    record.checked(2, 0.0712345);
    expect(pngCaption(record.current!)[1]).toBe(
      'wave Cd on this grid 0.07123 (solving, not verified)',
    );
    // The run's next grid keeps its value until the next check.
    record.drawnGrid(2, 3, '382×40');
    expect(pngCaption(record.current!)).toEqual([
      'bowshock: the Basic Finner, M 3.00, α 0°, grid 382×40',
      'wave Cd on this grid 0.07123 (solving, not verified)',
    ]);
  });
});
