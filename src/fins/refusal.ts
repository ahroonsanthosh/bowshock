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
  | 'planform';

export class FinRefusal extends RangeError {
  readonly reason: FinRefusalReason;

  constructor(reason: FinRefusalReason, message: string) {
    super(message);
    this.name = 'FinRefusal';
    this.reason = reason;
  }
}
