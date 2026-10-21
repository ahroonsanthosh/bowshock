/**
 * The app (docs/design/0017-rocketeer-interface.md): the rocket builder on
 * the left, the airflow filling the window behind, and the drag curve
 * pinned on the right; on phones the airflow on top, the point shown
 * pinned, and the Rocket, Curve and View tabs below.
 *
 * Every number, band, status and reason comes from the logic
 * (src/app/total-drag.ts through ./curve.ts and ./point-view.ts); this
 * module only lays them out, runs the solves one at a time on the GPU,
 * and draws the flow being solved.
 */

import { verifiedFittedDragGpu } from '../analysis/gpu-fitted-flow';
import { FITTED_DRAG_FLOOR, ORDER_TOLERANCE } from '../analysis/verified-drag';
import { GpuExecutionError } from '../engine-gpu/gpu-common';
import type { LiveFit } from '../engine-gpu/shock-fitting-gpu';
import type { Body } from '../geometry/body';
import { liveFitSource } from '../render/flow-source';
import { presentationFor } from '../render/presenter';
import { excludableParts, withoutText } from '../rocket/adapter';
import type { RocketDesign } from '../rocket/design';
import { PRESETS, preset } from '../rocket/presets';
import { rocketGeometry, sideViewFins } from '../rocket/geometry';
import { rememberedUnit, rememberUnit, type LengthUnit } from '../rocket/units';
import { Builder } from '../ui/builder';
import { curveChart, curveTable } from '../ui/curve-chart';
import { element, h } from '../ui/dom';
import { FlowView } from '../ui/flow-view';
import { formatCount, formatExponent, formatGrid, formatRate } from '../ui/format';
import { bandSection, colourScaleSection, schlierenSection } from '../ui/help';
import { Readout, type ReadoutKind } from '../ui/readout';
import { drawingLabel, drawRocket } from '../ui/rocket-drawing';
import { Shell } from '../ui/shell';
import { CurveRun, gridsTo, secondsPerPoint, type NoseSolver } from './curve';
import { curveCsv } from './curve-csv';
import {
  bodyOutline,
  FlowControls,
  VIEW_BINDINGS,
  viewMenu,
  type ViewAction,
} from './flow-controls';
import { pointView, type PointView } from './point-view';
import {
  gateDisplay,
  totalDragDisplay,
  type DisplayBlock,
  type NoseSolveError,
} from './total-drag-display';
import { renderBlocks } from './total-drag-render';

const GAMMA = 1.4;

type Action = ViewAction | 'pause' | 'compute';

// ------------------------------------------------------------- elements

const canvas = element('#flow', HTMLCanvasElement);
const presetSelect = element('#preset', HTMLSelectElement);
const drawing = element('#drawing', HTMLElement);
const finestSelect = element('#finest', HTMLSelectElement);
const finestNote = element('#finest-note', HTMLElement);
const stepSelect = element('#step', HTMLSelectElement);
const computeButton = element('#compute', HTMLButtonElement);
const stopButton = element('#stop', HTMLButtonElement);
const curveRocket = element('#curve-rocket', HTMLElement);
const curveNotes = element('#curve-notes', HTMLElement);
const chartBox = element('#chart', HTMLElement);
const pointBox = element('#point', HTMLElement);
const detailsButton = element('#details', HTMLButtonElement);
const tableToggle = element('#table-toggle', HTMLButtonElement);
const tableBox = element('#table', HTMLElement);
const csvButton = element('#csv', HTMLButtonElement);
const pngButton = element('#png', HTMLButtonElement);
const progress = element('#progress', HTMLElement);
const drawer = element('#drawer', HTMLDialogElement);
const drawerBody = element('#drawer-body', HTMLElement);
const drawerClose = element('#drawer-close', HTMLButtonElement);

// ---------------------------------------------------------------- state

const params = new URLSearchParams(location.search);
let design: RocketDesign = preset(params.get('preset') ?? 'basic-finner').design;
let unit: LengthUnit = rememberedUnit();
/** The user chose to compute without the parts bowshock does not model. */
let without = false;
let run: CurveRun | null = null;
/** The run on the GPU; settled once it has released its grids. */
let running: Promise<void> = Promise.resolve();
/** The point shown (chart, point block, pinned line, Details). */
let selected: number | null = null;
/** The rocket was changed since the curve shown was started. */
let changed = false;
let paused = false;
let resume: (() => void) | null = null;
let device: GPUDevice | null = null;
let noGpu = false;
let lost: string | null = null;
let view: FlowView | null = null;
/** The Mach number of the flow drawn, for the PNG's caption. */
let drawnMach: number | null = null;

// ---------------------------------------------------------------- shell

const shell = new Shell<Action>({
  root: '',
  page: 'home',
  title: 'Drag curve',
  bindings: [
    ...VIEW_BINDINGS,
    { keys: [' '], action: 'pause', description: 'Pause or resume the airflow solve' },
    { keys: ['r'], action: 'compute', description: 'Compute the curve' },
  ],
  view: viewMenu(
    () => view,
    () => void savePng(),
  ),
  onAction: (action) => {
    if (action === 'pause') togglePause();
    else if (action === 'compute') void start();
    else controls.act(action);
  },
  help: {
    title: 'Drag curve: keys and help',
    sections: [
      {
        title: 'This page',
        body: [
          'Describe your rocket on the left, or start from a preset. The curve on the right is its drag coefficient against Mach number, from 1.0 to the highest Mach number it flies, each point with its error band and a status in plain words.',
          'Each point needs the airflow round the nose solved on your GPU, on grids each twice as fine as the one before; the rest of the drag (friction, the base, the fins) is computed from measured correlations. A point the methods cannot give to a known accuracy shows no number, with the reason.',
          'Lengths are in millimetres or inches, each with its value in calibres (the body diameter) beside it.',
        ],
      },
      schlierenSection(),
      colourScaleSection(),
      bandSection(),
    ],
  },
});

const readout = new Readout([
  [
    { id: 'mach', label: 'M' },
    { id: 'alpha', label: 'α' },
    { id: 'grid', label: 'grid' },
    { id: 'level' },
  ],
  [
    { id: 'step', label: 'step' },
    { id: 'shock', label: 'shock speed' },
    { id: 'cd', label: 'nose wave Cd, this grid' },
  ],
  [{ id: 'rate' }, { id: 'gpu' }],
  [{ id: 'state' }],
]);
document.querySelector('main')?.append(readout.element);

const controls = new FlowControls(
  () => view,
  () => void savePng(),
  shell.bottom,
  element('#view-controls', HTMLElement),
  () => {
    shell.topBar.refresh();
  },
);

// -------------------------------------------------------------- builder

for (const p of PRESETS) {
  presetSelect.append(h('option', { text: p.label, attrs: { value: p.id } }));
}
presetSelect.value = design.source.kind === 'preset' ? design.source.id : 'basic-finner';

const builder = new Builder(design, unit, {
  onChange: (next) => {
    design = next;
    rocketChanged();
  },
  onUnit: (next) => {
    unit = next;
    rememberUnit(next);
    builder.setUnit(next);
    showDrawing();
    renderCurve();
  },
});
element('#builder', HTMLElement).append(builder.element);

function showDrawing(): void {
  drawRocket(drawing, design, unit);
  drawing.setAttribute('aria-label', drawingLabel(design, unit));
}

/** The rocket was edited: the drawing at once; the curve is redone on Compute. */
let previewTimer: number | undefined;
function rocketChanged(): void {
  showDrawing();
  changed = true;
  if (presetSelect.value !== 'typed') {
    if (presetSelect.querySelector('option[value="typed"]') === null) {
      presetSelect.append(h('option', { text: 'Your rocket', attrs: { value: 'typed' } }));
    }
    presetSelect.value = 'typed';
  }
  // What the logic says without solving (refused points, parts to choose about), once typing pauses.
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    if (run !== null && !run.done) return;
    preview();
  }, 400);
  renderCurve();
}

presetSelect.addEventListener('change', () => {
  const p = PRESETS.find((x) => x.id === presetSelect.value);
  if (p === undefined) return;
  design = p.design;
  without = false;
  builder.setDesign(design);
  showDrawing();
  void start();
});

// ------------------------------------------------------------ the curve

const finest = () => Number(finestSelect.value);
const step = () => Number(stepSelect.value);

/** The nose solve the drag page uses, on this page's GPU, drawn as it converges. */
const gpuSolver: NoseSolver = async (body: Body, mach: number, hooks) => {
  const gpu = device;
  if (gpu === null) {
    const none: NoseSolveError = { kind: 'error', message: 'no GPU', gpuFailed: true };
    return none;
  }
  view?.setBody(bodyOutline(body));
  view?.setShapes(finShapes());
  readout.set('mach', mach.toFixed(2));
  readout.set('alpha', '0°');
  for (const id of ['grid', 'level', 'step', 'shock', 'cd', 'rate']) readout.set(id, null);
  let rate: { refinement: number; time: number; iterations: number; cells: number } | null = null;
  const grids = gridsTo(finest());
  try {
    return await verifiedFittedDragGpu(gpu, body, {
      mach,
      gamma: GAMMA,
      // No early stop: always to the finest grid chosen, as the drag page does.
      tolerance: 0,
      maxRefinement: finest(),
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
      signal: hooks.signal,
      gate,
      onLevel: hooks.onLevel,
      onLive: (live: LiveFit | null, refinement) => {
        if (live === null) {
          view?.freeze();
          return;
        }
        rate = { refinement, time: performance.now(), iterations: 0, cells: live.ni * live.nj };
        readout.set('grid', formatGrid(live.ni, live.nj));
        readout.set('level', `(${Math.round(Math.log2(refinement)) + 1} of ${grids})`);
        view?.setSource(liveFitSource(live));
        drawnMach = mach;
      },
      onCheck: (refinement, iterations, speed, drag) => {
        readout.set('step', formatCount(iterations));
        readout.set('shock', formatExponent(speed, 1));
        readout.set('cd', drag.toFixed(5));
        const now = performance.now();
        if (rate?.refinement === refinement && now > rate.time && !paused) {
          const perSecond =
            ((iterations - rate.iterations) * rate.cells * 1000) / (now - rate.time);
          readout.set('rate', formatRate(perSecond, 'cell'));
        }
        rate = { refinement, time: now, iterations, cells: rate?.cells ?? 0 };
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const gpuFailed =
      lost !== null || error instanceof GpuExecutionError || error instanceof DOMException;
    return { kind: 'error', message: lost ?? message, gpuFailed };
  }
};

/** The fins seen from the side, in calibres (the solver's unit), shaded by how much of each face shows. */
function finShapes() {
  let fins;
  try {
    fins = sideViewFins(rocketGeometry(design));
  } catch {
    return [];
  }
  return fins.flatMap((f) =>
    f.polygons.map((points) => {
      const t = f.behind ? 0.12 : 0.35 + 0.65 * f.facing;
      const shade = (a: number, b: number) => (a + (b - a) * t) / 255;
      return {
        points,
        fill: [shade(58, 168), shade(64, 176), shade(74, 188), 1],
        edge: f.behind ? [0.17, 0.19, 0.22, 1] : [0.85, 0.87, 0.9, 1],
        behind: f.behind,
      };
    }),
  );
}

/** Resolves when the solve is not paused. */
function gate(): Promise<void> {
  if (!paused) return Promise.resolve();
  return new Promise((resolve) => {
    resume = resolve;
  });
}

function togglePause(): void {
  if (run === null || run.done) return;
  paused = !paused;
  if (!paused) {
    resume?.();
    resume = null;
  }
  view?.setLive(!paused);
  showState(paused ? 'Paused' : 'Solving', '');
  renderCurve();
}

function showState(text: string, kind: ReadoutKind): void {
  readout.set('state', text, kind);
}

/** The curve's points for this rocket as the logic gives them before any solve. */
function preview(): void {
  run = new CurveRun(curveOptions(), gpuSolver, () => {
    renderCurve();
  });
  selected = defaultSelection(run);
  renderCurve();
}

function curveOptions() {
  return { design, without, step: step(), finest: finest(), noGpu };
}

/** Stop the curve under way (if any) and compute this rocket's. */
async function start(): Promise<void> {
  run?.stop();
  paused = false;
  resume?.();
  resume = null;
  // Two solves never share the GPU: wait until the last has released its grids.
  await running;
  changed = false;
  const mine = new CurveRun(curveOptions(), gpuSolver, (r, k) => {
    if (r !== run) return;
    // Follow each point as its solve starts; between, the user's choice holds.
    const s = k >= 0 ? r.points[k]?.state : undefined;
    if (s?.kind === 'solving' && s.grid === 0) selected = k;
    renderCurve();
  });
  run = mine;
  selected = defaultSelection(mine);
  stopButton.disabled = false;
  view?.setLive(true);
  showState('Solving', '');
  renderCurve();
  running = mine.run().then(() => {
    if (run !== mine) return;
    stopButton.disabled = true;
    view?.setLive(false);
    const numbers = mine.points.filter(
      (p) => p.state.kind === 'done' && p.state.result.kind === 'total',
    ).length;
    showState(numbers > 0 ? 'Done' : 'No numbers', numbers > 0 ? 'ok' : 'bad');
    if (selected === null || mine.points[selected]?.state.kind !== 'done') {
      selected = defaultSelection(mine);
    }
    renderCurve();
    shell.announce(`Drag curve done: ${numbers} of ${mine.points.length} points with a number.`);
  });
  await running;
}

/** The point to show first: one with a number, else the first. */
function defaultSelection(r: CurveRun): number | null {
  if (r.points.length === 0) return null;
  const solving = r.current;
  if (solving !== null) return solving;
  const withNumber = r.points.findIndex(
    (p) => p.state.kind === 'done' && p.state.result.kind === 'total',
  );
  return withNumber >= 0 ? withNumber : 0;
}

computeButton.addEventListener('click', () => void start());
stopButton.addEventListener('click', () => {
  run?.stop();
  paused = false;
  resume?.();
  resume = null;
});
finestSelect.addEventListener('change', () => {
  changed = true;
  renderCurve();
});
stepSelect.addEventListener('change', () => {
  changed = true;
  if (run === null || run.done) preview();
  renderCurve();
});

// ------------------------------------------------------------- display

function views(r: CurveRun): PointView[] {
  return r.points.map((p) => pointView(p, finest() < 16));
}

/** "about 3 min", "about 40 s", "about 2.5 h". */
function aboutTime(seconds: number): string {
  if (seconds < 90) return `about ${Math.max(1, Math.round(seconds))} s`;
  if (seconds < 5400) return `about ${Math.round(seconds / 60)} min`;
  return `about ${(seconds / 3600).toFixed(1)} h`;
}

function renderFinestNote(): void {
  const perPoint = run === null ? null : secondsPerPoint(run);
  const time =
    perPoint === null
      ? 'the time a point takes on this GPU is shown once its first grid is solved'
      : `${aboutTime(perPoint)} a point on this GPU, measured`;
  finestNote.textContent =
    finest() >= 16
      ? `Five grids, 20 to 320 cells across: gives an error band; about 8 times as long as 160 (${time}).`
      : `Four grids, 20 to 160 cells across: gives an error band; ${time}.`;
}

function renderCurve(): void {
  renderFinestNote();
  const r = run;
  const parts = withoutText(without ? excludableParts(design).map((e) => e.part) : []);
  curveRocket.textContent = `${design.name}${parts === '' ? '' : `, ${parts}`}`;
  renderNotes();
  if (r === null) {
    chartBox.replaceChildren();
    pointBox.replaceChildren();
    progress.textContent = '';
    return;
  }
  const pointViews = views(r);
  chartBox.replaceChildren(
    curveChart({
      points: r.points,
      views: pointViews,
      selected,
      solving: r.current,
      onSelect: select,
      width: chartBox.clientWidth || 340,
    }),
  );
  renderPoint(r, pointViews);
  if (!tableBox.hidden) tableBox.replaceChildren(curveTable(pointViews, selected, select));
  const queue = r.points.filter((p) => p.state.kind === 'solving' || p.state.kind === 'waiting');
  const solving = r.current;
  progress.textContent = changed
    ? 'The rocket or the grids changed: press Compute the curve for its curve.'
    : solving !== null
      ? `Solving Mach ${r.points[solving]!.mach.toFixed(2)}; ${queue.length} point${queue.length === 1 ? '' : 's'} to go${paused ? ' (paused: Space resumes)' : ''}.`
      : r.done
        ? 'Done.'
        : r.points.length === 0
          ? 'No points: the highest Mach number is below 1.0.'
          : '';
  computeButton.textContent = changed || r.done ? 'Compute the curve' : 'Compute again';
}

function renderNotes(): void {
  const parts = excludableParts(design);
  const notes: HTMLElement[] = [];
  if (parts.length > 0 && !without) {
    const button = h('button', {
      className: 'button',
      text: `Compute without ${parts.length === 1 ? 'it' : 'them'}`,
      attrs: { type: 'button' },
    });
    button.addEventListener('click', () => {
      without = true;
      void start();
    });
    notes.push(
      h(
        'div',
        { className: 'note note--choice' },
        h('p', {
          text: `bowshock does not model the drag of ${parts.map((p) => p.part).join(', ')}. With ${parts.length === 1 ? 'it' : 'them'} on the rocket no number is given; you can compute the rocket without ${parts.length === 1 ? 'it' : 'them'}, and every number is then labelled so.`,
        }),
        button,
      ),
    );
  }
  for (const n of design.notes) {
    notes.push(h('p', { className: 'note', text: `${n.feature}: ${n.reason}` }));
  }
  curveNotes.replaceChildren(...notes);
}

function renderPoint(r: CurveRun, pointViews: readonly PointView[]): void {
  if (selected === null || pointViews[selected] === undefined) {
    pointBox.replaceChildren();
    shell.sheet.pinned.replaceChildren();
    return;
  }
  const v = pointViews[selected]!;
  const k = selected;
  const prev = h('button', {
    className: 'icon-button point__step',
    text: '‹',
    attrs: { type: 'button', 'aria-label': 'The point before', disabled: k === 0 },
  });
  const next = h('button', {
    className: 'icon-button point__step',
    text: '›',
    attrs: { type: 'button', 'aria-label': 'The point after', disabled: k === r.points.length - 1 },
  });
  prev.addEventListener('click', () => {
    select(k - 1);
  });
  next.addEventListener('click', () => {
    select(k + 1);
  });
  const chip = h('span', {
    className: `status-word status-word--${v.status.tone}`,
    text: v.status.word,
  });
  const lines: (HTMLElement | null)[] = [
    h(
      'div',
      { className: 'point__head' },
      prev,
      h('span', { className: 'point__mach', text: `Mach ${v.mach}` }),
      next,
      chip,
    ),
    v.value === null
      ? null
      : h(
          'p',
          { className: 'point__value' },
          h('span', { className: 'point__cd' }, 'C', h('sub', { text: 'D' }), ` ${v.value}`),
          v.band === null
            ? h('span', { className: 'point__band', text: ' no band yet' })
            : h('span', { className: 'point__band', text: ` ${v.band} (${v.percent ?? ''})` }),
        ),
    h('p', { className: 'point__sentence', text: v.status.sentence }),
    v.change === null ? null : h('p', { className: 'point__change', text: v.change }),
    v.without === ''
      ? null
      : h('p', { className: 'point__without', text: `Computed ${v.without}.` }),
  ];
  pointBox.replaceChildren(...lines.filter((l): l is HTMLElement => l !== null));
  // The phone's pinned line: the point shown, always in view (not a live region).
  shell.sheet.pinned.replaceChildren(
    h(
      'span',
      { className: 'pinned__value' },
      `M ${v.mach}`,
      ...(v.value === null
        ? []
        : ['  C', h('sub', { text: 'D' }), ` ${v.value}`, v.band === null ? '' : `  ${v.band}`]),
    ),
    chip.cloneNode(true),
  );
}

function select(k: number): void {
  if (run === null || k < 0 || k >= run.points.length) return;
  selected = k;
  renderCurve();
}

tableToggle.addEventListener('click', () => {
  tableBox.hidden = !tableBox.hidden;
  tableToggle.setAttribute('aria-expanded', String(!tableBox.hidden));
  renderCurve();
});

// ------------------------------------------------------------- details

function detailsBlocks(): HTMLElement[] {
  const r = run;
  if (r === null || selected === null) return [h('p', { text: 'No point is shown yet.' })];
  const p = r.points[selected]!;
  const out: HTMLElement[] = [h('h3', { text: `Mach ${p.mach.toFixed(2)}` })];
  const blocks = (b: readonly DisplayBlock[]) => {
    const box = h('div', { className: 'details__blocks' });
    renderBlocks(box, b);
    return box;
  };
  const s = p.state;
  if (s.kind === 'done') {
    const result = s.result;
    if (result.kind === 'total') {
      if (result.without.length > 0) {
        out.push(
          h('p', { className: 'point__without', text: `Computed ${withoutText(result.without)}.` }),
        );
      }
      out.push(blocks(totalDragDisplay(result.view)));
    } else if (result.kind === 'refused') {
      if (result.refusals.length > 0) {
        out.push(blocks(totalDragDisplay({ kind: 'refused', refusals: result.refusals })));
      }
      if (p.nose !== null && p.nose.kind === 'error') {
        out.push(h('p', { text: `The airflow solve: ${p.nose.message}.` }));
      } else if (
        p.nose !== null &&
        (p.nose.kind === 'invalid' || p.nose.kind === 'not-converged')
      ) {
        out.push(
          h('p', {
            text: `The airflow solve, on the grid at refinement ${p.nose.refinement}: ${p.nose.reason}.`,
          }),
        );
      }
    } else if (result.kind === 'not-modelled') {
      out.push(h('p', { text: 'What bowshock does not model on this rocket, and why:' }));
      out.push(
        h(
          'ul',
          {},
          ...result.features.map((f) =>
            h('li', { text: `${f.feature}: ${f.reason}. To get a number: ${f.change}.` }),
          ),
        ),
      );
    } else {
      out.push(h('p', { text: pointView(p, finest() < 16).status.sentence }));
    }
  } else {
    out.push(h('p', { text: pointView(p, finest() < 16).status.sentence }));
  }
  // The nose's grids, as solved.
  const reports = p.nose !== null && 'reports' in p.nose ? p.nose.reports : [];
  if (reports.length > 0) {
    const table = h('table', {}, h('caption', { text: 'The nose’s grids, as solved' }));
    const head = table.createTHead().insertRow();
    for (const text of ['Cells', 'Steps', 'Nose wave C_D, this grid'])
      head.append(h('th', { text }));
    const body = table.createTBody();
    for (const report of reports) {
      const row = body.insertRow();
      row.insertCell().textContent = formatGrid(report.cells.ni, report.cells.nj);
      row.insertCell().textContent = formatCount(report.iterations);
      row.insertCell().textContent = report.drag.toFixed(6);
    }
    out.push(h('div', { className: 'table-wrap' }, table));
  }
  out.push(h('h3', { text: 'The test behind the claims' }), blocks(gateDisplay()));
  out.push(
    h(
      'p',
      {},
      'Every input of the model, in calibres, at one Mach number: ',
      h('a', { text: 'All inputs', attrs: { href: 'demos/nose-drag.html' } }),
      '.',
    ),
  );
  return out;
}

detailsButton.addEventListener('click', () => {
  drawerBody.replaceChildren(...detailsBlocks());
  drawer.showModal();
  drawerBody.focus();
});
drawerClose.addEventListener('click', () => {
  drawer.close();
});
drawer.addEventListener('close', () => {
  detailsButton.focus();
});

// ------------------------------------------------------------- exports

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

csvButton.addEventListener('click', () => {
  if (run === null) return;
  const text = curveCsv(
    run,
    `exported from ${location.origin}${location.pathname} on ${new Date().toISOString()}`,
  );
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  link.download = `bowshock-${slug(design.name)}-drag.csv`;
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 10_000);
  shell.toasts.show(`Saved ${link.download}`);
});

async function savePng(): Promise<void> {
  if (view === null || drawnMach === null) {
    shell.toasts.show('Nothing to save yet: the airflow shows once its first grid is set up.');
    return;
  }
  const parts = withoutText(without ? excludableParts(design).map((e) => e.part) : []);
  const point = run?.points.find((p) => p.mach === drawnMach);
  const v = point === undefined ? null : pointView(point, finest() < 16);
  const name = `bowshock-${slug(design.name)}-mach-${drawnMach.toFixed(2)}.png`;
  const caption = [
    `${design.name}${parts === '' ? '' : `, ${parts}`}`,
    `Mach ${drawnMach.toFixed(2)}, zero incidence: the airflow around the body`,
    v === null
      ? ''
      : `C_D ${v.value ?? 'none'}${v.band === null ? '' : `, band ${v.band}`}: ${v.status.word}`,
  ].filter((line) => line !== '');
  try {
    await view.savePng(name, caption);
    shell.toasts.show(`Saved ${name}`);
  } catch (error) {
    shell.toasts.show(`Could not save the PNG: ${String(error)}`, 'bad');
  }
}
pngButton.addEventListener('click', () => void savePng());

// ----------------------------------------------------------------- GPU

async function startGpu(): Promise<void> {
  showState('Starting the GPU', '');
  const gpu = navigator.gpu as GPU | undefined;
  const adapter = await gpu?.requestAdapter().catch(() => null);
  if (!adapter) {
    noGpu = true;
    showState('No WebGPU', 'bad');
    return;
  }
  try {
    device = await adapter.requestDevice({
      requiredLimits: {
        maxBufferSize: adapter.limits.maxBufferSize,
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      },
    });
  } catch (error) {
    noGpu = true;
    showState(`The GPU could not be started: ${String(error)}`, 'bad');
    return;
  }
  void device.lost.then((info) => {
    if (info.reason === 'destroyed') return;
    lost = info.message === '' ? info.reason : info.message;
    run?.stop();
    view?.setLive(false);
    showState('GPU lost', 'bad');
    shell.toasts.show(`The GPU was lost (${lost}); reload the page to start it again.`, 'bad', 8);
  });
  readout.set('gpu', adapter.info.description || adapter.info.architecture || adapter.info.vendor);
  try {
    view = await FlowView.create(device, canvas, {
      presentation: presentationFor(adapter.info),
      fitRect: (aspect) => shell.drawingRect(aspect),
      onScale: (scale) => {
        controls.showScale(scale);
      },
    });
  } catch (error) {
    showState(`The airflow view could not be set up: ${String(error)}`, 'bad');
    return;
  }
  view.onChange(() => {
    controls.showViewState();
  });
  view.setField('mach');
  controls.showViewState();
  shell.onLayout(() => {
    view?.invalidate();
  });
}

showDrawing();
preview();
await startGpu();
await start();
