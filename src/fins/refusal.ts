/**
 * Thrown when a fin method is asked for a case outside the conditions under
 * which its result is what it claims to be. The message says why; `reason`
 * names the condition for callers that offer something else instead.
 */
export type FinRefusalReason =
  | 'subsonic-free-stream'
  | 'detached-shock'
  | 'subsonic-behind-shock'
  | 'compression-corner'
  | 'expansion-limit'
  | 'reflected-wave'
  | 'planform'
  /** A rounded leading edge on a swept edge (no data at M 1.5 to 3). */
  | 'swept-leading-edge'
  /** A rounded leading edge outside the Mach or Reynolds numbers its band covers. */
  | 'leading-edge-range'
  /** A rounded leading edge on a section the model does not represent. */
  | 'leading-edge-geometry';

export class FinRefusal extends RangeError {
  readonly reason: FinRefusalReason;

  constructor(reason: FinRefusalReason, message: string) {
    super(message);
    this.name = 'FinRefusal';
    this.reason = reason;
  }
}
