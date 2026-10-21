/**
 * The controls of a page that shows a solve's flow in the flow view
 * (docs/design/0012-interface.md sections 3 and 4): the fields and their
 * keys, the view's keys and View menu, the readout, the legend and the
 * mode bar, the phone's View tab. Shared by the live flow page and the
 * drag page, so that both look and answer the same.
 */

import { bodyLength, bodyRadius, type Body } from '../geometry/body';
import type { FlowField } from '../render/flow-fields';
import { h } from '../ui/dom';
import type { FlowScale, FlowView } from '../ui/flow-view';
import type { KeyBinding } from '../ui/keymap';
import { Legend } from '../ui/legend';
import { ModeBar } from '../ui/modebar';
import { Readout } from '../ui/readout';
import type { MenuItem } from '../ui/site';

export type ViewAction =
  | 'field-1'
  | 'field-2'
  | 'field-3'
  | 'field-4'
  | 'split'
  | 'grid'
  | 'shock'
  | 'fit'
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'png';

export type RunAction = 'pause' | 'again';

export const FLOW_FIELDS: readonly {
  field: FlowField;
  key: string;
  label: string;
  name: string;
}[] = [
  { field: 'schlieren', key: '1', label: 'Schlieren', name: 'Schlieren' },
  { field: 'mach', key: '2', label: 'Mach', name: 'Mach number' },
  { field: 'cp', key: '3', label: 'Cp', name: 'Pressure coefficient' },
  { field: 'density', key: '4', label: 'Density', name: 'Density' },
];

/** A field named in a link (?field=), or schlieren. */
export function flowField(value: string | null): FlowField {
  return FLOW_FIELDS.find((f) => f.field === value)?.field ?? 'schlieren';
}

export const VIEW_BINDINGS: readonly KeyBinding<ViewAction>[] = [
  { keys: ['1'], action: 'field-1', description: 'Schlieren: the density gradient, light on dark' },
  { keys: ['2'], action: 'field-2', description: 'Mach number' },
  { keys: ['3'], action: 'field-3', description: 'Pressure coefficient' },
  { keys: ['4'], action: 'field-4', description: 'Density, over the free stream’s' },
  {
    keys: ['d'],
    action: 'split',
    description: 'Split view: schlieren above the axis, the field chosen below',
  },
  { keys: ['g'], action: 'grid', description: 'Grid lines' },
  { keys: ['s'], action: 'shock', description: 'The fitted shock as a line' },
  { keys: ['f'], action: 'fit', description: 'Fit the body to the view (also a double click)' },
  {
    keys: ['+', '='],
    action: 'zoom-in',
    description: 'Zoom in (also the wheel, or a pinch)',
    repeat: true,
    label: ['+'],
  },
  { keys: ['-', '_'], action: 'zoom-out', description: 'Zoom out', repeat: true, label: ['−'] },
  {
    keys: ['ArrowLeft'],
    action: 'pan-left',
    description: 'Pan (also a drag)',
    repeat: true,
    label: ['←', '→', '↑', '↓'],
  },
  { keys: ['ArrowRight'], action: 'pan-right', description: '', repeat: true },
  { keys: ['ArrowUp'], action: 'pan-up', description: '', repeat: true },
  { keys: ['ArrowDown'], action: 'pan-down', description: '', repeat: true },
  { keys: ['k'], action: 'png', description: 'Save a PNG of the view' },
];

export const RUN_BINDINGS: readonly KeyBinding<RunAction>[] = [
  { keys: [' '], action: 'pause', description: 'Pause or resume the solver' },
  { keys: ['r'], action: 'again', description: 'Run again from the start' },
];

/** The legend of each colour field. */
const SCALES: Readonly<Record<Exclude<FlowField, 'schlieren'>, { title: string; units: string }>> =
  {
    mach: { title: 'Mach number', units: '' },
    cp: { title: 'Pressure coefficient', units: 'Cp' },
    density: { title: 'Density', units: 'ρ / ρ∞' },
  };

/** The body's outline (x, r) from the tip to the base, and down the base to the axis. */
export function bodyOutline(body: Body): [number, number][] {
  const end = bodyLength(body);
  const nose = body.nose.length;
  const points: [number, number][] = [];
  const n = 96;
  for (let k = 0; k <= n; k++) {
    // Denser near the tip, where a curved nose bends most.
    const x = nose * (k / n) ** 1.5;
    points.push([x, bodyRadius(body, x)]);
  }
  if (end > nose) points.push([end, bodyRadius(body, end)]);
  points.push([end, 0]);
  return points;
}

/** The readout of a solve drawn live: the case, the grid's progress, the machine, the state. */
export function flowReadout(): Readout {
  return new Readout([
    [
      { id: 'mach', label: 'M' },
      { id: 'alpha', label: 'α' },
      { id: 'grid', label: 'grid' },
    ],
    [
      { id: 'step', label: 'step' },
      { id: 'shock', label: 'shock speed' },
      { id: 'cd', label: 'wave Cd, this grid' },
    ],
    [{ id: 'rate' }, { id: 'gpu' }],
    [{ id: 'state' }],
  ]);
}

/** The View menu: the fields, the toggles, fit and the PNG. */
export function viewMenu(view: () => FlowView | null, savePng: () => void): MenuItem[] {
  return [
    ...FLOW_FIELDS.map((f) => ({
      label: f.name,
      key: f.key,
      action: () => view()?.setField(f.field),
      pressed: () => view()?.shown.field === f.field,
    })),
    {
      label: 'Split view',
      key: 'D',
      action: () => view()?.toggleSplit(),
      pressed: () => view()?.shown.split === true,
    },
    {
      label: 'Grid lines',
      key: 'G',
      action: () => view()?.toggleGrid(),
      pressed: () => view()?.shown.grid === true,
    },
    {
      label: 'Shock line',
      key: 'S',
      action: () => view()?.toggleShock(),
      pressed: () => view()?.shown.shock === true,
    },
    { label: 'Fit to the view', key: 'F', action: () => view()?.fit() },
    { label: 'Save a PNG', key: 'K', action: savePng },
  ];
}

/**
 * The legend and the mode bar (in the shell's bottom row), the phone's
 * View tab, and the view's keys: what the flow view shows, kept in step
 * with it.
 */
export class FlowControls {
  readonly legend = new Legend();
  readonly modes: ModeBar<FlowField, 'split' | 'grid' | 'shock'>;
  private readonly viewButtons: { button: HTMLButtonElement; toggle: string | null }[];

  constructor(
    private readonly view: () => FlowView | null,
    private readonly savePng: () => void,
    /** Where the bottom row goes (the shell's) and the phone's View tab's buttons. */
    bottom: HTMLElement,
    viewControls: HTMLElement,
    /** Called after the view's state is shown (to refresh the menus). */
    private readonly refreshed: () => void,
  ) {
    this.modes = new ModeBar<FlowField, 'split' | 'grid' | 'shock'>({
      modes: FLOW_FIELDS.map((f) => ({ id: f.field, label: f.label, key: f.key, hint: f.name })),
      toggles: [
        { id: 'split', label: 'Split', key: 'D' },
        { id: 'grid', label: 'Grid', key: 'G' },
        { id: 'shock', label: 'Shock', key: 'S' },
      ],
      onMode: (field) => view()?.setField(field),
      onToggle: (toggle) => {
        if (toggle === 'split') view()?.toggleSplit();
        else if (toggle === 'grid') view()?.toggleGrid();
        else view()?.toggleShock();
      },
    });
    bottom.append(this.legend.element, this.modes.element);
    // The phone's View tab: the toggles and actions as buttons (the mode bar keeps the fields).
    this.viewButtons = (
      [
        ['Split view', 'split', () => view()?.toggleSplit()],
        ['Grid lines', 'grid', () => view()?.toggleGrid()],
        ['Shock line', 'shock', () => view()?.toggleShock()],
        ['Fit to the view', null, () => view()?.fit()],
        ['Save a PNG', null, savePng],
      ] as const
    ).map(([label, toggle, action]) => {
      const button = h('button', {
        className: 'button',
        text: label,
        attrs: { type: 'button', 'aria-pressed': toggle === null ? null : 'false' },
      });
      button.addEventListener('click', action);
      viewControls.append(button);
      return { button, toggle };
    });
  }

  /** A key of the view's. */
  act(action: ViewAction): void {
    const v = this.view();
    if (v === null) return;
    switch (action) {
      case 'field-1':
      case 'field-2':
      case 'field-3':
      case 'field-4':
        v.setField(FLOW_FIELDS[Number(action.slice(-1)) - 1]!.field);
        break;
      case 'split':
        v.toggleSplit();
        break;
      case 'grid':
        v.toggleGrid();
        break;
      case 'shock':
        v.toggleShock();
        break;
      case 'fit':
        v.fit();
        break;
      case 'zoom-in':
        v.zoom(1.25);
        break;
      case 'zoom-out':
        v.zoom(0.8);
        break;
      case 'pan-left':
        v.panFraction(-0.08, 0);
        break;
      case 'pan-right':
        v.panFraction(0.08, 0);
        break;
      case 'pan-up':
        v.panFraction(0, 0.08);
        break;
      case 'pan-down':
        v.panFraction(0, -0.08);
        break;
      case 'png':
        this.savePng();
        break;
    }
  }

  /** Reflect what the view shows in the mode bar, the View tab and the menus. */
  showViewState(): void {
    const v = this.view();
    if (v === null) return;
    const s = v.shown;
    this.modes.setMode(s.field);
    this.modes.setToggle('split', s.split);
    this.modes.setToggle('grid', s.grid);
    this.modes.setToggle('shock', s.shock);
    for (const { button, toggle } of this.viewButtons) {
      if (toggle === 'split' || toggle === 'grid' || toggle === 'shock') {
        button.setAttribute('aria-pressed', String(s[toggle]));
      }
    }
    this.refreshed();
    if (s.field === 'schlieren' && !s.split) {
      this.legend.show({
        kind: 'schlieren',
        title: 'Schlieren',
        note: 'Density gradient, light on dark. The bow shock is the white line.',
      });
    }
  }

  /** The colour scale of the field shown (the view's onScale). */
  showScale(scale: FlowScale): void {
    if (scale.field === 'schlieren') return;
    const { title, units } = SCALES[scale.field];
    this.legend.show({
      kind: 'colormap',
      title,
      units,
      min: scale.min,
      max: scale.max,
      note: scale.split ? 'Below the axis; schlieren above it.' : '',
    });
  }
}
