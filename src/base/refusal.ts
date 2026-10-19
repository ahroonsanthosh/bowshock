/**
 * Thrown when a base-drag correlation is asked for a case outside the
 * evidence that sets its band (docs/design/0008-total-drag.md, section
 * 6.1: "where no measured band exists the component is refused with a
 * message, not estimated"). The message says why; `reason` names the
 * condition.
 */
export type BaseRefusalReason =
  /** Outside the Mach numbers where the band or the factor was measured. */
  | 'mach-range'
  /** Not a cylindrical afterbody (boat-tails, flares). */
  | 'afterbody'
  /** A laminar boundary layer at the base: the correlation is for turbulent layers. */
  | 'laminar-base'
  /** Fins ending between the base and one root chord ahead of it. */
  | 'fins-near-base'
  /** Fins at the base other than the four of the data. */
  | 'fin-count'
  /** Fins at the base thinner or thicker than the data bracket. */
  | 'fin-thickness'
  /** Blunt fin trailing edges: no two-dimensional base pressure transcribed. */
  | 'fin-trailing-edge-base'
  /** A geometric input out of range. */
  | 'input';

export class BaseRefusal extends RangeError {
  readonly reason: BaseRefusalReason;

  constructor(reason: BaseRefusalReason, message: string) {
    super(message);
    this.name = 'BaseRefusal';
    this.reason = reason;
  }
}
