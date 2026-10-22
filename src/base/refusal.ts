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
  /** Fins near the base whose trailing edge the data do not cover (blunt, rounded). */
  | 'fin-trailing-edge'
  /**
   * Fins at or near the base swept beyond the data: for the present factor any swept leading or trailing edge
   * (it is measured on unswept fins); for the rebuilt factor sweeps outside those measured (0015 section 3.4).
   */
  | 'fin-sweep'
  /** Flat-plate fins at the base: RM L52E06 fig. 7 measures relief, outside the factor's data. */
  | 'flat-plate-fins'
  /** Swept blunt trailing edges. */
  | 'swept-trailing-edge'
  /** A laminar layer at a blunt trailing edge. */
  | 'laminar-trailing-edge'
  /** A boundary layer thick against the trailing edge, beyond the data. */
  | 'thick-layer'
  /** A rounded trailing edge: bounded, but the ordering of its bounds is not shown (0016). */
  | 'rounded-trailing-edge'
  /** An input that needs a curve more than one read interval beyond its readings. */
  | 'beyond-read-range'
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
