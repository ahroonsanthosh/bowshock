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
  /** A rounded leading edge swept beyond the yawed-cylinder checks (0016). */
  | 'swept-leading-edge'
  /** A rounded leading edge outside the Mach or Reynolds numbers its band covers. */
  | 'leading-edge-range'
  /** A rounded leading edge on a section the model does not represent. */
  | 'leading-edge-geometry'
  /** A square-cut leading edge: bounded, but the ordering of its bounds is not shown (0016). */
  | 'square-leading-edge'
  /** Below the Mach numbers of the ARCAS increments behind the fins' own-drag band (0014 section 10.7 (f)). */
  | 'fins-own-drag-mach'
  /** A rounded leading edge below M_n 1.0 where its bounds are not argued (0019 section 3.2; not wired). */
  | 'bounded-edge-range';

export class FinRefusal extends RangeError {
  readonly reason: FinRefusalReason;

  constructor(reason: FinRefusalReason, message: string) {
    super(message);
    this.name = 'FinRefusal';
    this.reason = reason;
  }
}
