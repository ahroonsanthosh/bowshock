/**
 * The status of a nose solve's outcome, in a word and a colour, as help's
 * rule says it (src/ui/help.ts, bandSection): green for a value verified
 * (its band measured), amber for a value not verified, red where there is
 * no value (refused, not converged, or a failure of the GPU). The live
 * flow page and the drag page show the same words for the same outcome.
 */

import type { VerifiedDrag } from '../analysis/verified-drag';
import type { ReadoutKind } from '../ui/readout';

export interface NoseStatus {
  readonly word: string;
  readonly kind: ReadoutKind;
}

export const STOPPED: NoseStatus = { word: 'Stopped', kind: '' };
export const REFUSED: NoseStatus = { word: 'Refused', kind: 'bad' };
export const NOT_CONVERGED: NoseStatus = { word: 'Not converged', kind: 'bad' };
export const GPU_FAILED: NoseStatus = { word: 'GPU failed', kind: 'bad' };
export const VERIFIED: NoseStatus = { word: 'Verified', kind: 'ok' };
export const NOT_VERIFIED: NoseStatus = { word: 'Not verified', kind: 'warn' };

/** The status of a solve's outcome. */
export function noseOutcomeStatus(outcome: VerifiedDrag): NoseStatus {
  switch (outcome.kind) {
    case 'cancelled':
      return STOPPED;
    case 'invalid':
      return REFUSED;
    case 'not-converged':
      return NOT_CONVERGED;
    case 'solved':
      return outcome.uncertainty === undefined ? NOT_VERIFIED : VERIFIED;
  }
}
