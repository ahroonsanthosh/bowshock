/**
 * Total zero-incidence, power-off drag from its components, with the bands
 * combined as docs/design/0008-total-drag.md section 6.3 requires:
 *
 * - each component carries a model-form band, the lowest and highest C_D
 *   its evidence allows (for a band stated as measured over modelled from
 *   r_lo to r_hi, r_lo C_D to r_hi C_D); the total's band is their linear
 *   sum, not a quadrature sum, since the same experiments constrain
 *   several components and independence has not been shown. The sum is a
 *   minimum: each band is the range seen on a few data sets, not a
 *   coverage interval;
 * - inputs the user states or does not know (transition, roughness, wall
 *   temperature) carry their own bands, the change of the total between
 *   the input's ends, shown beside the model-form band and never folded
 *   into it (0002 section 3, 0008 section 2.3).
 *
 * A refused component refuses the total (0008 section 6.1); nothing here
 * estimates a missing component. See docs/design/0010-base-drag-and-total.md.
 */

export interface DragComponent {
  readonly name: string;
  /** Nominal value, on the reference area of the total. */
  readonly cd: number;
  /** Lowest and highest C_D the component's model-form band allows. */
  readonly low: number;
  readonly high: number;
  /** What the value is: solved, exact, correlation, estimate (and on what). */
  readonly label: string;
  /** Where the band comes from. */
  readonly band: string;
  /**
   * Set when the component is "bounded, not measured" (0014 section 10.2):
   * the reason a total that contains it names in its claim, in words.
   */
  readonly bounded?: string;
}

export interface InputBand {
  readonly name: string;
  /** Change of the total from its nominal at the input's ends, C_D: low <= 0 <= high. */
  readonly low: number;
  readonly high: number;
  readonly label: string;
}

export interface TotalDrag {
  readonly cd: number;
  /** Model-form band: the linear sum of the components' bands. */
  readonly low: number;
  readonly high: number;
  readonly components: readonly DragComponent[];
  /** Input bands, separate from the model-form band. */
  readonly inputs: readonly InputBand[];
}

export interface ComponentRefusal {
  readonly component: string;
  readonly reason: string;
  readonly message: string;
}

/** Thrown when any component of a total is refused; lists every refusal. */
export class TotalDragRefusal extends RangeError {
  readonly refusals: readonly ComponentRefusal[];

  constructor(refusals: readonly ComponentRefusal[]) {
    super(
      'the total drag is refused: ' +
        refusals.map((r) => `${r.component} (${r.reason}): ${r.message}`).join('; '),
    );
    this.name = 'TotalDragRefusal';
    this.refusals = refusals;
  }
}

function checkFinite(name: string, values: readonly number[]): void {
  if (!values.every(Number.isFinite)) throw new RangeError(`${name}: a value is not finite`);
}

/** Sums the components and their bands linearly; keeps the input bands apart. */
export function combineComponents(
  components: readonly DragComponent[],
  inputs: readonly InputBand[] = [],
): TotalDrag {
  if (components.length === 0) throw new RangeError('a total needs at least one component');
  let cd = 0;
  let low = 0;
  let high = 0;
  for (const c of components) {
    checkFinite(c.name, [c.cd, c.low, c.high]);
    if (!(c.low <= c.high)) throw new RangeError(`${c.name}: the band's low end exceeds its high`);
    cd += c.cd;
    low += c.low;
    high += c.high;
  }
  for (const i of inputs) {
    checkFinite(i.name, [i.low, i.high]);
    if (!(i.low <= 0 && i.high >= 0)) {
      throw new RangeError(`${i.name}: an input band must contain the nominal (low <= 0 <= high)`);
    }
  }
  return { cd, low, high, components, inputs };
}

/** The model-form band widened by every input band (linear): [low, high] in C_D. */
export function bandWithInputs(total: TotalDrag): readonly [number, number] {
  let low = total.low;
  let high = total.high;
  for (const i of total.inputs) {
    low += i.low;
    high += i.high;
  }
  return [low, high];
}

/** A component from its nominal and a band stated as measured over modelled. */
export function componentWithRatioBand(
  name: string,
  cd: number,
  ratio: readonly [number, number],
  label: string,
  band: string,
): DragComponent {
  return { name, cd, low: ratio[0] * cd, high: ratio[1] * cd, label, band };
}
