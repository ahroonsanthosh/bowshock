/**
 * The rocket builder (docs/design/0017-rocketeer-interface.md section 2):
 * the rocket's dimensions in millimetres or inches, each length with its
 * value in calibres beside it, the nose and the fins' section and edges
 * chosen by pictures with plain names, and the flight. It edits a rocket
 * of a nose, one body tube and one set of trapezoidal fins; the model
 * itself is ./../rocket/design.ts, in metres.
 */

import { noseRadius, type NoseShape } from '../geometry/nose';
import type { FinEdge, FinSection, FinSetDesign, RocketDesign } from '../rocket/design';
import { aheadOfBase } from '../rocket/adapter';
import { baseStation } from '../rocket/design';
import { calibresText, lengthText, toMetres, type LengthUnit } from '../rocket/units';
import { h } from './dom';

const SVG = 'http://www.w3.org/2000/svg';

/** The nose shapes offered, by their plain names (src/geometry/nose.ts's shapes). */
export const NOSE_CHOICES: readonly {
  readonly id: string;
  readonly name: string;
  readonly shape: NoseShape;
  /** The parameter asked, if any. */
  readonly parameter?: { readonly label: string; readonly min: number; readonly max: number };
}[] = [
  { id: 'cone', name: 'Cone', shape: { kind: 'conical' } },
  {
    id: 'ogive',
    name: 'Ogive',
    shape: { kind: 'ogive', parameter: 1 },
    parameter: { label: 'Ogive shape (1: tangent, 0: cone)', min: 0, max: 1 },
  },
  { id: 'von-karman', name: 'Von Karman', shape: { kind: 'haack', parameter: 0 } },
  { id: 'ellipse', name: 'Ellipse', shape: { kind: 'ellipsoid' } },
  {
    id: 'power',
    name: 'Power',
    shape: { kind: 'power', exponent: 0.5 },
    parameter: { label: 'Power (1: cone, toward 0: blunter)', min: 0.001, max: 1 },
  },
  {
    id: 'parabolic',
    name: 'Parabolic',
    shape: { kind: 'parabolic', parameter: 1 },
    parameter: { label: 'Parabolic shape (1: tangent, 0: cone)', min: 0, max: 1 },
  },
];

/** The choice a nose shape is, and its parameter's value. */
export function noseChoiceOf(shape: NoseShape): { id: string; parameter: number | null } {
  switch (shape.kind) {
    case 'conical':
      return { id: 'cone', parameter: null };
    case 'ogive':
      return { id: 'ogive', parameter: shape.parameter };
    case 'haack':
      // The LV-Haack (C = 1/3) and the others between are Haack noses too; the picture is Von Karman's.
      return { id: 'von-karman', parameter: null };
    case 'ellipsoid':
      return { id: 'ellipse', parameter: null };
    case 'power':
      return { id: 'power', parameter: shape.exponent };
    case 'parabolic':
      return { id: 'parabolic', parameter: shape.parameter };
  }
}

/** The shape of a choice with a parameter's value. */
export function noseShapeOf(id: string, parameter: number): NoseShape {
  switch (id) {
    case 'ogive':
      return { kind: 'ogive', parameter };
    case 'von-karman':
      return { kind: 'haack', parameter: 0 };
    case 'ellipse':
      return { kind: 'ellipsoid' };
    case 'power':
      return { kind: 'power', exponent: parameter };
    case 'parabolic':
      return { kind: 'parabolic', parameter };
    default:
      return { kind: 'conical' };
  }
}

/** A nose's picture: its own profile, from its formula. */
function nosePicture(shape: NoseShape): SVGSVGElement {
  const root = document.createElementNS(SVG, 'svg');
  root.setAttribute('viewBox', '-1 -12 46 24');
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('class', 'pick__picture');
  const nose = { shape, length: 30, baseRadius: 9 };
  const upper: string[] = [];
  for (let k = 0; k <= 40; k++) {
    const x = 30 * (k / 40) ** 1.5;
    upper.push(`${x.toFixed(2)} ${(-noseRadius(nose, x)).toFixed(2)}`);
  }
  const lower = [...upper].reverse().map((p) => {
    const [x, y] = p.split(' ');
    return `${x} ${(-Number(y)).toFixed(2)}`;
  });
  const d = `M${upper.join('L')}L44 -9L44 9L${lower.join('L')}Z`;
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', d);
  root.append(p);
  return root;
}

/** A section's picture, seen along the span: the leading edge left. */
function sectionPicture(d: string): SVGSVGElement {
  const root = document.createElementNS(SVG, 'svg');
  root.setAttribute('viewBox', '0 -8 46 16');
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('class', 'pick__picture');
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', d);
  root.append(p);
  return root;
}

const SECTION_PICTURES: Readonly<Record<'flat' | 'wedge' | 'diamond', string>> = {
  flat: 'M2 -4H44V4H2Z',
  wedge: 'M2 0L44 -5V5Z',
  diamond: 'M2 0L23 -5L44 0L23 5Z',
};
const LEADING_PICTURES: Readonly<Record<FinEdge['kind'], string>> = {
  square: 'M6 -4H44V4H6Z',
  rounded: 'M10 -4H44V4H10A4 4 0 0 1 10 -4Z',
  bevelled: 'M2 0L18 -4H44V4H18Z',
};
const TRAILING_PICTURES: Readonly<Record<FinEdge['kind'], string>> = {
  square: 'M2 -4H40V4H2Z',
  rounded: 'M2 -4H36A4 4 0 0 1 36 4H2Z',
  bevelled: 'M2 -4H28L44 0L28 4H2Z',
};
const EDGE_NAMES: Readonly<Record<FinEdge['kind'], string>> = {
  square: 'Square',
  rounded: 'Rounded',
  bevelled: 'Bevelled',
};

export interface BuilderOptions {
  readonly onChange: (design: RocketDesign) => void;
  readonly onUnit: (unit: LengthUnit) => void;
}

/** The fins of a design the builder edits: its one trapezoidal fin set. */
function finsOf(design: RocketDesign): FinSetDesign | undefined {
  const f = design.finSets[0];
  return f !== undefined && f.planform.kind === 'trapezoidal' ? f : undefined;
}

/** Whether the builder can edit this design field by field (one tube, one trapezoidal fin set). */
export function editable(design: RocketDesign): boolean {
  return (
    design.body.length === 1 &&
    design.body[0]!.kind === 'tube' &&
    design.finSets.length === 1 &&
    finsOf(design) !== undefined
  );
}

type Trapezoid = Extract<FinSetDesign['planform'], { kind: 'trapezoidal' }>;

export class Builder {
  readonly element: HTMLElement;
  private current: RocketDesign;
  private unitNow: LengthUnit;
  /** Each writes a value that follows the others (a length's calibres, the overall length). */
  private readonly refreshers: (() => void)[] = [];
  private readonly lengthInputs: {
    readonly input: HTMLInputElement;
    readonly metres: () => number;
  }[] = [];

  constructor(
    design: RocketDesign,
    unit: LengthUnit,
    private readonly options: BuilderOptions,
  ) {
    this.current = design;
    this.unitNow = unit;
    this.element = h('div', { className: 'builder' });
    this.render();
  }

  get design(): RocketDesign {
    return this.current;
  }

  /** Show another rocket (a preset, an import), every field from it. */
  setDesign(design: RocketDesign): void {
    this.current = design;
    this.render();
  }

  get unit(): LengthUnit {
    return this.unitNow;
  }

  setUnit(unit: LengthUnit): void {
    this.unitNow = unit;
    this.render();
  }

  // ------------------------------------------------------------ rendering

  private change(design: RocketDesign): void {
    this.current = { ...design, source: { kind: 'typed' } };
    this.refreshCalibres();
    this.options.onChange(this.current);
  }

  private refreshCalibres(): void {
    for (const refresh of this.refreshers) refresh();
  }

  private render(): void {
    this.refreshers.length = 0;
    this.lengthInputs.length = 0;
    const d = this.current;
    if (!editable(d)) {
      this.element.replaceChildren(
        h('p', {
          className: 'panel__note',
          text:
            'This rocket has parts the builder does not edit one by one (more than one tube, a ' +
            'transition, or fins that are not trapezoids). Its drawing and its result are shown as ' +
            'imported.',
        }),
      );
      return;
    }
    this.element.replaceChildren(
      this.unitToggle(),
      h('h3', { className: 'builder__heading', text: 'Body' }),
      this.lengthField(
        'diameter',
        'Diameter',
        () => this.current.nose.diameter,
        (m) => this.withDiameter(m),
      ),
      this.noseField(),
      this.lengthField(
        'nose-length',
        'Nose length',
        () => this.current.nose.length,
        (m) => ({
          ...this.current,
          nose: { ...this.current.nose, length: m },
          finSets: this.keepFinsAtBase((x) => ({ ...x, nose: { ...x.nose, length: m } })),
        }),
      ),
      this.lengthField(
        'tube-length',
        'Body tube length',
        () => this.tube().length,
        (m) => ({
          ...this.current,
          body: [{ ...this.tube(), length: m }],
          finSets: this.keepFinsAtBase((x) => ({ ...x, body: [{ ...this.tube(), length: m }] })),
        }),
      ),
      this.overall(),
      h('h3', { className: 'builder__heading', text: 'Fins' }),
      this.numberField('fin-count', 'Number of fins', this.fins().count, 1, 1, (n) =>
        this.withFins({ count: n }),
      ),
      this.lengthField(
        'root-chord',
        'Root chord',
        () => this.trapezoid().rootChord,
        (m) => this.withPlanform({ rootChord: m }, true),
      ),
      this.lengthField(
        'tip-chord',
        'Tip chord',
        () => this.trapezoid().tipChord,
        (m) => this.withPlanform({ tipChord: m }),
      ),
      this.lengthField(
        'span',
        'Span (root to tip)',
        () => this.trapezoid().span,
        (m) => this.withPlanform({ span: m }),
      ),
      this.lengthField(
        'sweep',
        'Sweep (tip leading edge behind the root’s)',
        () => this.trapezoid().sweepLength,
        (m) => this.withPlanform({ sweepLength: m }),
        true,
      ),
      this.lengthField(
        'thickness',
        'Thickness',
        () => this.fins().thickness,
        (m) => this.withFins({ thickness: m }),
      ),
      this.sectionField(),
      this.lengthField(
        'ahead',
        'Trailing edges ahead of the base (0: at the base)',
        () => this.ahead(),
        (m) => this.withAhead(m),
        true,
      ),
      h('h3', { className: 'builder__heading', text: 'Flight' }),
      this.numberField('max-mach', 'Highest Mach number', d.flight.maxMach, 0.1, 1, (x) => ({
        ...this.current,
        flight: { ...this.current.flight, maxMach: x },
      })),
      this.altitudeField(),
    );
    this.refreshCalibres();
  }

  private unitToggle(): HTMLElement {
    const group = h('div', {
      className: 'segmented',
      attrs: { role: 'radiogroup', 'aria-label': 'Units' },
    });
    for (const u of ['mm', 'in'] as const) {
      const button = h('button', {
        className: 'segmented__option',
        text: u === 'mm' ? 'mm' : 'inches',
        attrs: { type: 'button', role: 'radio', 'aria-checked': String(u === this.unitNow) },
      });
      button.addEventListener('click', () => {
        if (u === this.unitNow) return;
        this.options.onUnit(u);
      });
      group.append(button);
    }
    return h('div', { className: 'builder__units' }, h('span', { text: 'Units' }), group);
  }

  private tube() {
    return this.current.body[0] as Extract<RocketDesign['body'][number], { kind: 'tube' }>;
  }

  private fins(): FinSetDesign {
    return this.current.finSets[0]!;
  }

  private trapezoid(): Trapezoid {
    return this.fins().planform as Trapezoid;
  }

  /** How far the fins' trailing edges lie ahead of the base, m (0 within rounding, as the adapter takes it). */
  private ahead(): number {
    const f = this.fins();
    return aheadOfBase(this.current, f.rootLeadingEdge + this.trapezoid().rootChord);
  }

  /** The fins kept the same distance ahead of the base when the body's lengths change. */
  private keepFinsAtBase(next: (d: RocketDesign) => RocketDesign): FinSetDesign[] {
    const ahead = this.ahead();
    const moved = next(this.current);
    const f = this.fins();
    return [{ ...f, rootLeadingEdge: baseStation(moved) - ahead - this.trapezoid().rootChord }];
  }

  private withDiameter(m: number): RocketDesign {
    return {
      ...this.current,
      nose: { ...this.current.nose, diameter: m },
      body: [{ ...this.tube(), diameter: m }],
    };
  }

  private withFins(change: Partial<FinSetDesign>): RocketDesign {
    return { ...this.current, finSets: [{ ...this.fins(), ...change }] };
  }

  /** A planform change; a new root chord keeps the trailing edge where it was. */
  private withPlanform(change: Partial<Trapezoid>, keepTrailingEdge = false): RocketDesign {
    const p = this.trapezoid();
    const next = { ...p, ...change };
    const f = this.fins();
    const rootLeadingEdge = keepTrailingEdge
      ? f.rootLeadingEdge + p.rootChord - next.rootChord
      : f.rootLeadingEdge;
    return this.withFins({ planform: next, rootLeadingEdge });
  }

  private withAhead(m: number): RocketDesign {
    return this.withFins({
      rootLeadingEdge: baseStation(this.current) - m - this.trapezoid().rootChord,
    });
  }

  // -------------------------------------------------------------- fields

  private field(id: string, label: string, ...controls: (Node | string)[]): HTMLElement {
    return h(
      'div',
      { className: 'field' },
      h('label', { className: 'field__label', text: label, attrs: { for: `b-${id}` } }),
      ...controls,
    );
  }

  /** A length in the unit shown, with its calibres beside it. */
  private lengthField(
    id: string,
    label: string,
    metres: () => number,
    set: (m: number) => RocketDesign,
    zeroAllowed = false,
  ): HTMLElement {
    const input = h('input', {
      attrs: {
        id: `b-${id}`,
        type: 'number',
        inputmode: 'decimal',
        step: 'any',
        min: 0,
        value: lengthText(metres(), this.unitNow),
        'aria-describedby': `b-${id}-cal`,
      },
    });
    const out = h('output', {
      className: 'field__cal',
      attrs: { id: `b-${id}-cal`, for: `b-${id}` },
    });
    const error = h('span', { className: 'field__error', attrs: { hidden: true } });
    input.addEventListener('input', () => {
      const typed = input.value.trim() === '' ? Number.NaN : Number(input.value);
      const ok = Number.isFinite(typed) && (typed > 0 || (zeroAllowed && typed === 0));
      input.setAttribute('aria-invalid', String(!ok));
      error.hidden = ok;
      error.textContent = ok
        ? ''
        : zeroAllowed
          ? 'Enter zero or a positive length'
          : 'Enter a positive length';
      this.change(set(toMetres(typed, this.unitNow)));
    });
    if (id === 'diameter') out.textContent = '= 1 cal (the calibre)';
    else {
      this.refreshers.push(() => {
        out.textContent = `= ${calibresText(metres(), this.current.nose.diameter)}`;
      });
    }
    this.lengthInputs.push({ input, metres });
    return this.field(
      id,
      label,
      h(
        'div',
        { className: 'field__length' },
        input,
        h('span', { className: 'field__unit', text: this.unitNow }),
        out,
      ),
      error,
    );
  }

  private numberField(
    id: string,
    label: string,
    value: number,
    step: number,
    min: number,
    set: (x: number) => RocketDesign,
  ): HTMLElement {
    const input = h('input', {
      attrs: {
        id: `b-${id}`,
        type: 'number',
        inputmode: 'decimal',
        step,
        min,
        value: String(value),
      },
    });
    input.addEventListener('input', () => {
      const typed = input.value.trim() === '' ? Number.NaN : Number(input.value);
      input.setAttribute('aria-invalid', String(!(typed >= min)));
      this.change(set(typed));
    });
    return this.field(id, label, input);
  }

  private altitudeField(): HTMLElement {
    const feet = this.unitNow === 'in';
    const scale = feet ? 0.3048 : 1;
    const input = h('input', {
      attrs: {
        id: 'b-altitude',
        type: 'number',
        inputmode: 'decimal',
        step: 'any',
        value: String(Number((this.current.flight.altitude / scale).toPrecision(7))),
      },
    });
    input.addEventListener('input', () => {
      const typed = input.value.trim() === '' ? Number.NaN : Number(input.value);
      this.change({
        ...this.current,
        flight: { ...this.current.flight, altitude: typed * scale },
      });
    });
    return this.field('altitude', `Altitude above sea level (${feet ? 'ft' : 'm'})`, input);
  }

  /** A row of pictures to choose from, as radio buttons. */
  private pick(
    name: string,
    legend: string,
    options: readonly { id: string; label: string; picture: SVGSVGElement }[],
    chosen: string,
    onPick: (id: string) => void,
  ): HTMLElement {
    const set = h('fieldset', { className: 'pick' }, h('legend', { text: legend }));
    for (const o of options) {
      const input = h('input', {
        className: 'pick__input',
        attrs: {
          type: 'radio',
          name: `b-${name}`,
          id: `b-${name}-${o.id}`,
          value: o.id,
          checked: o.id === chosen,
        },
      });
      input.addEventListener('change', () => {
        if (input.checked) onPick(o.id);
      });
      set.append(
        input,
        h(
          'label',
          { className: 'pick__option', attrs: { for: `b-${name}-${o.id}` } },
          o.picture,
          h('span', { text: o.label }),
        ),
      );
    }
    return set;
  }

  private noseField(): HTMLElement {
    const now = noseChoiceOf(this.current.nose.shape);
    const choice = NOSE_CHOICES.find((c) => c.id === now.id)!;
    const parameterBox = h('div');
    const showParameter = (id: string, value: number | null) => {
      const c = NOSE_CHOICES.find((x) => x.id === id)!;
      if (c.parameter === undefined) {
        parameterBox.replaceChildren();
        return;
      }
      const p = c.parameter;
      const start =
        value ??
        (c.shape.kind === 'power'
          ? c.shape.exponent
          : c.shape.kind === 'conical' || c.shape.kind === 'ellipsoid'
            ? 0
            : (c.shape as { parameter: number }).parameter);
      const input = h('input', {
        attrs: {
          id: 'b-nose-parameter',
          type: 'number',
          step: 'any',
          min: p.min,
          max: p.max,
          value: String(start),
        },
      });
      input.addEventListener('input', () => {
        const x = input.value.trim() === '' ? Number.NaN : Number(input.value);
        input.setAttribute('aria-invalid', String(!(x >= p.min && x <= p.max)));
        this.change({ ...this.current, nose: { ...this.current.nose, shape: noseShapeOf(id, x) } });
      });
      parameterBox.replaceChildren(this.field('nose-parameter', p.label, input));
    };
    showParameter(choice.id, now.parameter);
    const pick = this.pick(
      'nose',
      'Nose shape',
      NOSE_CHOICES.map((c) => ({ id: c.id, label: c.name, picture: nosePicture(c.shape) })),
      choice.id,
      (id) => {
        const c = NOSE_CHOICES.find((x) => x.id === id)!;
        this.change({ ...this.current, nose: { ...this.current.nose, shape: c.shape } });
        showParameter(id, null);
      },
    );
    return h('div', {}, pick, parameterBox);
  }

  private sectionField(): HTMLElement {
    const s = this.fins().section;
    const kind = s.kind === 'airfoil' ? 'flat' : s.kind;
    const box = h('div');
    const detail = h('div');
    const showDetail = (section: FinSection) => {
      if (section.kind === 'flat') {
        detail.replaceChildren(
          this.edgePick('leading', 'Leading edge', section.leadingEdge, LEADING_PICTURES),
          this.edgePick('trailing', 'Trailing edge', section.trailingEdge, TRAILING_PICTURES),
        );
      } else if (section.kind === 'wedge') {
        detail.replaceChildren(
          this.lengthField(
            'le-radius',
            'Leading-edge radius (0: sharp)',
            () => {
              const x = this.fins().section;
              return x.kind === 'wedge' ? x.leadingEdgeRadius : 0;
            },
            (m) => this.withFins({ section: { kind: 'wedge', leadingEdgeRadius: m } }),
            true,
          ),
        );
        this.refreshCalibres();
      } else if (section.kind === 'diamond') {
        const input = h('input', {
          attrs: {
            id: 'b-ridge',
            type: 'number',
            step: 'any',
            min: 1,
            max: 99,
            value: String(Math.round(100 * section.ridge)),
          },
        });
        input.addEventListener('input', () => {
          const x = input.value.trim() === '' ? Number.NaN : Number(input.value) / 100;
          this.change(this.withFins({ section: { kind: 'diamond', ridge: x } }));
        });
        detail.replaceChildren(
          this.field('ridge', 'Thickest at (% of the chord from the leading edge)', input),
        );
      } else {
        detail.replaceChildren(
          h('p', { className: 'panel__note', text: 'An airfoil section, as imported.' }),
        );
      }
    };
    const pick = this.pick(
      'section',
      'Fin section',
      (['flat', 'wedge', 'diamond'] as const).map((k) => ({
        id: k,
        label: k === 'flat' ? 'Flat plate' : k === 'wedge' ? 'Wedge' : 'Diamond',
        picture: sectionPicture(SECTION_PICTURES[k]),
      })),
      kind,
      (id) => {
        const section: FinSection =
          id === 'wedge'
            ? { kind: 'wedge', leadingEdgeRadius: 0 }
            : id === 'diamond'
              ? { kind: 'diamond', ridge: 0.5 }
              : {
                  kind: 'flat',
                  leadingEdge: { kind: 'rounded' },
                  trailingEdge: { kind: 'square' },
                };
        this.change(this.withFins({ section }));
        showDetail(section);
      },
    );
    showDetail(s);
    box.append(pick, detail);
    return box;
  }

  private edgePick(
    which: 'leading' | 'trailing',
    legend: string,
    edge: FinEdge,
    pictures: Readonly<Record<FinEdge['kind'], string>>,
  ): HTMLElement {
    const bevel = h('div');
    const setEdge = (next: FinEdge) => {
      const s = this.fins().section;
      if (s.kind !== 'flat') return;
      this.change(
        this.withFins({
          section: which === 'leading' ? { ...s, leadingEdge: next } : { ...s, trailingEdge: next },
        }),
      );
    };
    const showBevel = (e: FinEdge) => {
      if (e.kind !== 'bevelled') {
        bevel.replaceChildren();
        return;
      }
      bevel.replaceChildren(
        this.lengthField(
          `${which}-bevel`,
          `${which === 'leading' ? 'Leading' : 'Trailing'}-edge bevel length`,
          () => {
            const s = this.fins().section;
            const x =
              s.kind === 'flat' ? (which === 'leading' ? s.leadingEdge : s.trailingEdge) : null;
            return x?.kind === 'bevelled' ? x.length : Number.NaN;
          },
          (m) => {
            const s = this.fins().section;
            if (s.kind !== 'flat') return this.current;
            const next: FinEdge = { kind: 'bevelled', length: m };
            return this.withFins({
              section:
                which === 'leading' ? { ...s, leadingEdge: next } : { ...s, trailingEdge: next },
            });
          },
        ),
      );
      this.refreshCalibres();
    };
    const pick = this.pick(
      `${which}-edge`,
      legend,
      (['square', 'rounded', 'bevelled'] as const).map((k) => ({
        id: k,
        label: EDGE_NAMES[k],
        picture: sectionPicture(pictures[k]),
      })),
      edge.kind,
      (id) => {
        const next: FinEdge =
          id === 'bevelled'
            ? { kind: 'bevelled', length: 3 * this.fins().thickness }
            : { kind: id as 'square' | 'rounded' };
        setEdge(next);
        showBevel(next);
      },
    );
    showBevel(edge);
    return h('div', {}, pick, bevel);
  }

  private overall(): HTMLElement {
    const out = h('output', { className: 'field__cal', attrs: { id: 'b-overall' } });
    const value = h('span', { className: 'field__overall' });
    this.refreshers.push(() => {
      const m = baseStation(this.current);
      value.textContent = `${lengthText(m, this.unitNow)} ${this.unitNow}`;
      out.textContent = `= ${calibresText(m, this.current.nose.diameter)}`;
    });
    return h(
      'div',
      { className: 'field field--readonly' },
      h('span', { className: 'field__label', text: 'Overall length' }),
      h('div', { className: 'field__length' }, value, out),
    );
  }

  /** Lengths shown again in the unit now (after a change of unit). */
  get inputs(): readonly HTMLInputElement[] {
    return this.lengthInputs.map((l) => l.input);
  }
}
