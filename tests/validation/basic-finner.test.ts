/**
 * Step B5 of docs/design/0008-total-drag.md: the Basic Finner gate (DREV
 * TM 9703, free flight; src/validation/basic-finner.ts).
 *
 * The first run (0010 section 6) was refused for the two fin-edge terms;
 * its assertions are in this file's version at commit 3d9978a. Both terms
 * now exist, with the choices of 0010 section 5 fixed before the second
 * run. That run is made once, after the independent reader's report (the
 * trailing-edge area and the second readings of the edge data), and its
 * per-shot residuals replace this placeholder as they come out, pass or
 * fail. Until then nothing is computed at the shots' conditions.
 */

import { describe, it } from 'vitest';

describe.skip("the Basic Finner gate, second run: pending the reader's report (0010 section 4.2)", () => {
  it('is run once, after the report', () => {
    // Intentionally empty.
  });
});
