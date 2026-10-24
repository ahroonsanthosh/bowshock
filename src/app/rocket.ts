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
import type { FlowScene3D, SceneScale } from '../render3d/scene';
import { excludableParts, partSizeWords, withoutText } from '../rocket/adapter';
import type { RocketDesign } from '../rocket/design';
import { PRESETS, preset } from '../rocket/presets';
import { rocketGeometry, sideViewFins } from '../rocket/geometry';
import { sceneRocketOf } from '../rocket/scene-rocket';
import { rememberedUnit, rememberUnit, type LengthUnit } from '../rocket/units';
import { Builder } from '../ui/builder';
import { curveChart, curveTable } from '../ui/curve-chart';
import { element, h } from '../ui/dom';
import { FlowView, FRAME_BUDGET, type FlowScale } from '../ui/flow-view';
import { formatCount, formatExponent, formatGrid, formatRate } from '../ui/format';
import { bandSection, colourScaleSection, schlierenSection } from '../ui/help';
import { ModeBar } from '../ui/modebar';
import { Readout, type ReadoutKind } from '../ui/readout';
import { drawingLabel, drawRocket } from '../ui/rocket-drawing';
import { Shell } from '../ui/shell';
import { CurveRun, gridsTo, secondsPerPoint, type NoseSolver } from './curve';
import { curveCsv, curveRocketName } from './curve-csv';
import { fileSizeRefusal, importSummary, loadImporter, type ImportSummary } from './import-summary';
import { bodyOutline, FlowControls, viewMenu } from './flow-controls';
import { captionLines, pointView, type PointView } from './point-view';
import { KNOWN_HEADING } from './refused-parts';
import { flightWords } from './status-words';
import { loadRender3D, sceneLegend, type Render3DModule } from './scene3d';
import {
  appBindings,
  isSceneAction,
  SCENE_KEYS,
  sceneKeyOf,
  sceneMenu,
  type AppAction,
  type SceneAction,
} from './scene-keys';
import {
  gateDisplay,
  totalDragDisplay,
  type DisplayBlock,
  type NoseSolveError,
} from './total-drag-display';
import { renderBlocks } from './total-drag-render';

const GAMMA = 1.4;

type Action = AppAction;

/** Which view of the airflow is shown: the 3D scene, or the side view (also its fallback). */
type FlowShown = '3d' | 'side';
const FLOW_SHOWN_KEY = 'bowshock:flow-view';

/**
 * The note on the airflow shown (0017 section 6.2): what is simulated and
 * what is only drawn, and what of the rocket the 3D view cannot draw.
 */
function flowNoteText(
  which: FlowShown,
  missing: readonly string[],
  failure: string | null,
): string {
  if (which === 'side') {
    return (
      'The airflow is around the body; the fins are drawn, their drag computed separately. ' +
      'Hatched: behind the base, not simulated.' +
      (failure === null ? '' : ` The 3D view could not be set up: ${failure}.`)
    );
  }
  const notDrawn =
    missing.length === 0 ? '' : ` Not drawn here: ${missing.join('; ')}; the drawing shows it.`;
  return (
    'The airflow is around the body, revolved about its axis; the fins are drawn, their drag ' +
    `computed separately. Hatched: behind the base, not simulated. Drag to turn it any way; 0 resets.${notDrawn}`
  );
}

// ------------------------------------------------------------- elements

const canvas = element('#flow', HTMLCanvasElement);
const canvas3d = element('#flow3d', HTMLCanvasElement);
const flowNote = element('#flow-note', HTMLElement);
const viewNote = element('#view-note', HTMLElement);
const presetSelect = element('#preset', HTMLSelectElement);
const drawing = element('#drawing', HTMLElement);
const finestSelect = element('#finest', HTMLSelectElement);
const finestNote = element('#finest-note', HTMLElement);
const stepSelect = element('#step', HTMLSelectElement);
const computeButton = element('#compute', HTMLButtonElement);
const stopButton = element('#stop', HTMLButtonElement);
const curveRocket = element('#curve-rocket', HTMLElement);
const curveFlight = element('#curve-flight', HTMLElement);
const curveNotes = element('#curve-notes', HTMLElement);
const chartBox = element('#chart', HTMLElement);
const pointBox = element('#point', HTMLElement);
const detailsButton = element('#details', HTMLButtonElement);
const tableToggle = element('#table-toggle', HTMLButtonElement);
const tableBox = element('#table', HTMLElement);
const csvButton = element('#csv', HTMLButtonElement);
const pngButton = element('#png', HTMLButtonElement);
const progress = element('#progress', HTMLElement);
/** The curve's progress line: what is under way, and Compute beside it once the rocket changed. */
const progressText = h('span');
const progressCompute = h('button', {
  className: 'button curve__compute',
  text: 'Compute its curve',
  attrs: { type: 'button', hidden: true },
});
progressCompute.addEventListener('click', () => void start());
progress.append(progressText, progressCompute);
const drawer = element('#drawer', HTMLDialogElement);
const drawerBody = element('#drawer-body', HTMLElement);
const drawerClose = element('#drawer-close', HTMLButtonElement);
const importButton = element('#import', HTMLButtonElement);
const importFile = element('#import-file', HTMLInputElement);

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
/** The 3D view, once set up (null if it could not be). */
let scene: FlowScene3D | null = null;
/** Why the 3D view could not be set up, in plain words (null: it was, or not yet tried). */
let sceneFailure: string | null = null;
let render3d: Render3DModule | null = null;
/** The rocket whose airflow the views show (null: none shown; the 3D view shows the rocket edited). */
let flowDesign: RocketDesign | null = null;
/** What of the rocket shown the 3D view does not draw. */
let missing3d: readonly string[] = [];
let shown: FlowShown = rememberedFlow();
/** The fit being solved and drawn live, while its grid runs. */
let liveFit: LiveFit | null = null;
/** The last colour scales of each view, shown again when it is. */
let scale2d: FlowScale | null = null;
let scale3d: SceneScale | null = null;
/** The Mach number of the flow drawn, for the PNG's caption. */
let drawnMach: number | null = null;
/** The last OpenRocket import, while its rocket is the one shown. */
let imported: ImportSummary | null = null;
/** The last import that failed, said beside the rocket still shown; cleared by the next rocket. */
let importFailure: string | null = null;

// ---------------------------------------------------------------- shell

const shell = new Shell<Action>({
  root: '',
  page: 'home',
  title: 'Drag curve',
  // One key map (0017 section 6.1): the page's keys, then each view's, acting on the view shown.
  bindings: appBindings({ is3d: () => scene3dShown(), isSide: () => sideView() !== null }),
  view: [
    {
      label: '3D view',
      key: 'V',
      action: () => {
        showFlow('3d');
      },
      pressed: () => shown === '3d',
      shown: () => scene !== null,
    },
    {
      label: 'Side view',
      key: 'V',
      action: () => {
        showFlow('side');
      },
      pressed: () => shown === 'side',
      shown: () => scene !== null,
    },
    ...sceneMenu(
      () => (scene3dShown() ? scene : null),
      (action) => {
        sceneAct(action);
      },
    ),
    ...viewMenu(
      () => sideView(),
      () => void savePng(),
      true,
    ).map((item) =>
      item.key === 'F'
        ? { ...item, action: fitView }
        : item.key === 'K'
          ? item
          : { ...item, shown: () => sideView() !== null },
    ),
  ],
  onAction: (action, event) => {
    if (action === 'pause') togglePause();
    else if (action === 'compute') void start();
    else if (action === 'flow-view') showFlow(shown === '3d' ? 'side' : '3d');
    else if (action === 'png') void savePng();
    else if (isSceneAction(action)) sceneAct(action);
    else if (scene3dShown()) sharedIn3d(action, event?.shiftKey === true);
    else controls.act(action);
  },
  help: {
    title: 'Drag curve: keys and help',
    sections: [
      {
        title: 'This page',
        body: [
          'Describe your rocket on the left, or start from a preset. The curve on the right is its drag coefficient against Mach number, from 1.0 to 3.0, each point with its error band and a status in plain words; the highest Mach number the rocket flies is marked on it.',
          'Each point needs the airflow round the nose solved on your GPU, on grids each twice as fine as the one before; the rest of the drag (friction, the base, the fins) is computed from measured correlations. A point the methods cannot give to a known accuracy shows no number, with the reason.',
          'Lengths are in millimetres or inches, each with its value in calibres (the body diameter) beside it.',
          'The airflow shows in 3D, or from the side (key V). The number keys act on the view shown: in 3D they show and hide its layers, from the side they choose the field. In 3D, drag to turn the view any way (over the top and underneath too; 0 resets it), right drag or Shift drag to pan, and use the wheel or a pinch to zoom.',
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

/** The phone's View tab: the side view's buttons, or the 3D view's, as shown. */
const viewControls = element('#view-controls', HTMLElement);
const sideButtons = h('div', { className: 'view-controls__group' });
const sceneButtons = h('div', { className: 'view-controls__group', attrs: { hidden: true } });
viewControls.append(sideButtons, sceneButtons);

const controls = new FlowControls(
  () => sideView(),
  () => void savePng(),
  shell.bottom,
  sideButtons,
  () => {
    shell.topBar.refresh();
  },
  true,
);

// ------------------------------------------------------- the two views

/** The 3D view's buttons in the View tab: each key's, toggles pressed while on. */
const sceneButtonList = [
  ...SCENE_KEYS.map((k) => {
    const button = h('button', {
      className: 'button',
      text: k.label,
      attrs: { type: 'button', 'aria-pressed': k.pressed === undefined ? null : 'false' },
    });
    button.addEventListener('click', () => {
      sceneAct(k.action);
    });
    return { button, pressed: k.pressed };
  }),
  ...(
    [
      ['Fit to the view', fitView],
      ['Save a PNG', () => void savePng()],
    ] as const
  ).map(([label, act]) => {
    const button = h('button', { className: 'button', text: label, attrs: { type: 'button' } });
    button.addEventListener('click', act);
    return { button, pressed: undefined };
  }),
];
sceneButtons.append(...sceneButtonList.map((b) => b.button));

function refreshSceneButtons(): void {
  for (const { button, pressed } of sceneButtonList) {
    if (pressed !== undefined && scene !== null) {
      button.setAttribute('aria-pressed', String(pressed(scene)));
    }
  }
}

/** The 3D | Side switch (key V), before the field mode bar; shown once the 3D view is set up. */
const flowSwitch = new ModeBar<FlowShown>({
  label: 'Airflow view',
  modes: [
    { id: '3d', label: '3D', key: 'V', hint: 'The rocket and its airflow in 3D' },
    {
      id: 'side',
      label: 'Side',
      key: 'V',
      hint: 'The airflow seen from the side, mirrored about the axis',
    },
  ],
  onMode: (mode) => {
    showFlow(mode);
  },
});
flowSwitch.element.classList.add('flow-switch');
flowSwitch.element.hidden = true;
controls.modes.element.before(flowSwitch.element);

/**
 * The legend: on desktops under the note at the top left of the view (the
 * rocket panel runs the window's height, and the glow's legend is tall);
 * on phones in the bottom row, a line above the sheet.
 */
const flowAside = element('#flow-aside', HTMLElement);
const wide = window.matchMedia('(min-width: 700px)');
function placeLegend(): void {
  if (wide.matches) flowAside.append(controls.legend.element);
  else shell.bottom.prepend(controls.legend.element);
}
placeLegend();
wide.addEventListener('change', placeLegend);

function rememberedFlow(): FlowShown {
  try {
    return localStorage.getItem(FLOW_SHOWN_KEY) === 'side' ? 'side' : '3d';
  } catch {
    return '3d';
  }
}

/** The side view, while it is the one shown: its keys, mode bar and menu act on it only then. */
function sideView(): FlowView | null {
  return shown === 'side' || scene === null ? view : null;
}

function scene3dShown(): boolean {
  return scene !== null && shown === '3d';
}

/** A 3D view's key or menu item: what render3d's own key does. */
function sceneAct(action: SceneAction): void {
  if (scene === null || render3d === null) return;
  render3d.sceneKey(scene, sceneKeyOf(action));
  shell.topBar.refresh();
  refreshSceneButtons();
}

/** The keys both views have (fit, zoom, the arrows), on the 3D view. */
function sharedIn3d(action: Action, shift: boolean): void {
  if (scene === null || render3d === null) return;
  const key: Partial<Record<Action, string>> = {
    fit: '0',
    'zoom-in': '+',
    'zoom-out': '-',
    'pan-left': 'ArrowLeft',
    'pan-right': 'ArrowRight',
    'pan-up': 'ArrowUp',
    'pan-down': 'ArrowDown',
  };
  const k = key[action];
  if (k !== undefined) render3d.sceneKey(scene, k, shift);
}

/** Fit the rocket to the view shown (F, and the View menu). */
function fitView(): void {
  if (scene3dShown()) fitScene();
  else view?.fit();
}

/** Whether the flow is being solved now (a grid running, not paused): then the view shown draws live. */
function solvingLive(): boolean {
  return liveFit !== null && !paused && run?.running === true;
}

/** Only the view shown draws live, so that the solver pays for one view's frames, not two. */
function setLive(): void {
  const live = solvingLive();
  view?.setLive(live && sideView() !== null);
  scene?.setLive(live && sideView() === null);
}

/** Show this view of the airflow (the side view if the 3D view is not set up). */
function showFlow(which: FlowShown): void {
  const is3d = which === '3d' && scene !== null;
  shown = is3d ? '3d' : 'side';
  try {
    localStorage.setItem(FLOW_SHOWN_KEY, which);
  } catch {
    // Remembering the choice is a convenience only.
  }
  canvas.hidden = is3d;
  canvas3d.hidden = !is3d;
  flowSwitch.setMode(shown);
  controls.modes.element.hidden = is3d;
  sideButtons.hidden = is3d;
  sceneButtons.hidden = !is3d;
  refreshSceneButtons();
  showFlowNote();
  if (scene !== null && is3d) {
    // Hidden, the 3D view read the flow only as each grid began: give it the flow drawn now.
    const source = liveFit !== null ? liveFitSource(liveFit) : (view?.source ?? null);
    if (source !== null) scene.setFlow(source);
    fitScene();
    // The view's own scale, once it has drawn a flow (none yet: no legend, rather than the other's).
    if (scale3d !== null) showScale3d(scale3d);
    else controls.legend.hide();
  } else {
    view?.invalidate();
    controls.legend.hide();
    controls.showViewState();
    if (scale2d !== null) controls.showScale(scale2d);
  }
  setLive();
  shell.topBar.refresh();
}

/** The phone's short note on the airflow shown (the full note is on the View tab). */
const PHONE_FLOW_NOTE: Readonly<Record<'3d' | 'side', string>> = {
  '3d':
    'The axisymmetric solution, revolved; fins are not in the airflow. Hatched: behind the ' +
    'base, not simulated.',
  side:
    'The axisymmetric solution; fins are drawn, not in the airflow. Hatched: behind the base, ' +
    'not simulated.',
};

/** The phone's line where this browser solves nothing. */
const PHONE_NO_GPU =
  'This browser has no WebGPU, so no airflow is solved here: open the page in a recent Chrome ' +
  'or Edge.';

function showFlowNote(): void {
  const text = flowNoteText(shown, missing3d, sceneFailure);
  flowNote.textContent = text;
  viewNote.textContent = text;
  showSheetNote();
}

/**
 * On phones, in the first screen: what the picture is (or that this
 * browser solves nothing), and what a cross on the curve means.
 */
function showSheetNote(): void {
  shell.sheet.note.replaceChildren(
    h('p', { text: noGpu ? PHONE_NO_GPU : PHONE_FLOW_NOTE[shown] }),
    h(
      'p',
      {},
      h('span', { className: 'cross', text: '\u2715' }),
      ' No number: the drag there cannot be given to a known accuracy; the Curve tab says why.',
    ),
  );
}

/**
 * Fit the 3D view into the part of the window the panels leave free
 * (device pixels): the one fit, at opening, on a change of layout and by
 * F or 0, so that 0 goes back to the first view exactly. `untouched`:
 * only if the user has not moved the view since its last fit.
 */
function fitScene(untouched = false): void {
  if (scene === null) return;
  const dpr = window.devicePixelRatio || 1;
  // A three-quarter view is about 1.4 times as wide as tall: between the panels, as a rule.
  const r = shell.drawingRect(1.4);
  // The scene fits the flow's outline and then comes closer (0.84 of the distance), so the
  // outline runs about 7% past each side of the rect, the nose's tip with it: inset by more,
  // so that the whole rocket stays clear of the panels.
  const dx = 0.12 * r.width;
  const dy = 0.04 * r.height;
  const rect = {
    x: (r.x + dx) * dpr,
    y: (r.y + dy) * dpr,
    width: (r.width - 2 * dx) * dpr,
    height: (r.height - 2 * dy) * dpr,
  };
  if (untouched) scene.refit(rect);
  else scene.fit(rect);
}

/** The 3D view's colour scale in the page's legend. */
function showScale3d(s: SceneScale): void {
  controls.legend.show(sceneLegend(s));
}

/**
 * The rocket in the 3D view, from the page's one geometry: the rocket
 * whose airflow is shown, or with none the rocket as edited, so that the
 * view follows the builder.
 */
function showSceneRocket(): void {
  if (scene === null) return;
  const of = sceneRocketOf(flowDesign ?? design);
  scene.setRocket(of.rocket);
  missing3d = of.missing;
  showFlowNote();
}

/** No airflow shown (the rocket changed): both views cleared, the 3D view showing the rocket. */
function clearFlow(): void {
  flowDesign = null;
  drawnMach = null;
  liveFit = null;
  scene?.setFlow(null);
  scene?.setField(null);
  view?.setSource(null);
  showSceneRocket();
}

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
  // The file's notes no longer describe the rocket once it is edited.
  imported = null;
  importFailure = null;
  if (presetSelect.value !== 'typed') {
    if (presetSelect.querySelector('option[value="typed"]') === null) {
      presetSelect.append(h('option', { text: 'Your rocket', attrs: { value: 'typed' } }));
    }
    presetSelect.value = 'typed';
  }
  // The airflow shown was the last rocket's: cleared, unless its curve is still being solved.
  if (run?.running !== true) clearFlow();
  // What the logic says without solving (refused points, parts to choose about), once typing pauses.
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    if (run?.running === true) return;
    preview();
  }, 400);
  renderCurve();
}

presetSelect.addEventListener('change', () => {
  const p = PRESETS.find((x) => x.id === presetSelect.value);
  if (p === undefined) return;
  design = p.design;
  without = false;
  imported = null;
  importFailure = null;
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
  flowDesign = solvedDesign();
  showSceneRocket();
  scene?.setUnits({ freeStreamTemperature: hooks.form.temperature });
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
        // Both views are given each grid (to show either at a switch); only the one shown draws live.
        if (live === null) {
          liveFit = null;
          view?.freeze();
          scene?.freeze();
          setLive();
          return;
        }
        liveFit = live;
        rate = { refinement, time: performance.now(), iterations: 0, cells: live.ni * live.nj };
        readout.set('grid', formatGrid(live.ni, live.nj));
        readout.set('level', `(${Math.round(Math.log2(refinement)) + 1} of ${grids})`);
        view?.setSource(liveFitSource(live));
        scene?.setFlow(liveFitSource(live));
        scene?.setStatus({ steps: 0, converged: false });
        setLive();
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
          scene?.setStatus({ steps: iterations, cellRate: perSecond });
        } else {
          scene?.setStatus({ steps: iterations });
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
/** The rocket of the curve being solved (the one shown may since have been edited). */
function solvedDesign(): RocketDesign {
  return run?.options.design ?? design;
}

function finShapes() {
  let fins;
  try {
    fins = sideViewFins(rocketGeometry(solvedDesign()));
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
  if (run?.running !== true) return;
  paused = !paused;
  if (!paused) {
    resume?.();
    resume = null;
  }
  setLive();
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
  clearFlow();
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
  setLive();
  showState('Solving', '');
  renderCurve();
  running = mine.run().then(() => {
    if (run !== mine) return;
    stopButton.disabled = true;
    setLive();
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
  if (run?.running !== true) preview();
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
  // The rocket of the curve shown (the builder's may since have been edited), as its points are.
  curveRocket.textContent = curveTitle(r);
  curveFlight.textContent = flightWords(r?.options.design ?? design);
  renderNotes();
  if (r === null) {
    chartBox.replaceChildren();
    pointBox.replaceChildren();
    progressText.textContent = '';
    progressCompute.hidden = true;
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
      flight: r.options.design.flight.maxMach,
    }),
  );
  renderPoint(r, pointViews);
  if (!tableBox.hidden) tableBox.replaceChildren(curveTable(pointViews, selected, select));
  // The points still to solve, the one under way among them (refused points solved last for
  // their nose's part, 0011 section 10).
  const solving = r.current;
  const toGo = r.queue.length + (solving === null ? 0 : 1);
  // Changed: the way to the new curve beside the curve itself (Compute is at the builder's
  // foot, often scrolled out of view, or on another tab on phones).
  progressCompute.hidden = !changed;
  progressText.textContent = changed
    ? 'The rocket or the grids changed since this curve.'
    : solving !== null
      ? `Solving Mach ${r.points[solving]!.mach.toFixed(2)}; ${toGo} point${toGo === 1 ? '' : 's'} to go${paused ? ' (paused: Space resumes)' : ''}.`
      : r.done
        ? 'Done.'
        : '';
  computeButton.textContent = changed || r.done ? 'Compute the curve' : 'Compute again';
}

/** The curve's rocket, and the parts it is computed without: the run's own, where there is one. */
function curveTitle(r: CurveRun | null): string {
  return r === null
    ? curveRocketName(design, without)
    : curveRocketName(r.options.design, r.options.without);
}

function renderNotes(): void {
  const parts = excludableParts(design);
  // Each part with its size and place, where its source gives them.
  const named = parts.map((p) => {
    const size = p.of === undefined ? '' : partSizeWords(p.of, unit);
    return size === '' ? p.part : `${p.part} (${size})`;
  });
  const notes: HTMLElement[] = [];
  if (importFailure !== null) {
    notes.push(h('div', { className: 'note note--import' }, h('p', { text: importFailure })));
  }
  // "it" for one part, "them" for several or for one counted ("the 2 rail buttons").
  const them = parts.length > 1 || parts.some((p) => /^the \d+ /.test(p.part)) ? 'them' : 'it';
  if (parts.length > 0 && !without) {
    const button = h('button', {
      className: 'button',
      text: `Compute without ${them}`,
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
          text: `bowshock does not model the drag of ${named.join(', ')}. With ${them} on the rocket no number is given; you can compute the rocket without ${them}, and every number is then labelled so.`,
        }),
        button,
      ),
    );
  }
  // A preset's variant, one click away (the 98 mm example with rounded trailing edges, and back).
  const variant = PRESETS.find((p) => p.id === presetSelect.value)?.variant;
  if (variant !== undefined) {
    const button = h('button', {
      className: 'button',
      text: variant.button,
      attrs: { type: 'button' },
    });
    button.addEventListener('click', () => {
      presetSelect.value = variant.id;
      presetSelect.dispatchEvent(new Event('change'));
    });
    notes.push(
      h('div', { className: 'note note--choice' }, h('p', { text: variant.text }), button),
    );
  }
  if (imported !== null) {
    const shown = imported.notTaken.slice(0, 3);
    const more = imported.notTaken.length - shown.length;
    notes.push(
      h(
        'div',
        { className: 'note note--import' },
        h('p', { text: imported.headline }),
        shown.length === 0 ? null : h('ul', {}, ...shown.map((t) => h('li', { text: t }))),
        more > 0 ? h('p', { text: `And ${more} more, in Details.` }) : null,
        imported.finish === null ? null : h('p', { text: imported.finish }),
      ),
    );
  } else {
    for (const n of design.notes) {
      notes.push(h('p', { className: 'note', text: `${n.feature}: ${n.reason}` }));
    }
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
          h('span', { className: 'point__cd' }, 'C', h('sub', { text: 'D' }), ` ${v.headline}`),
          v.band === null
            ? h('span', { className: 'point__band', text: ' no band yet' })
            : h('span', {
                className: 'point__band',
                text: ` ${v.headlineBand} (${v.percent ?? ''})`,
              }),
        ),
    h('p', { className: 'point__sentence', text: v.status.sentence }),
    // Validated: the logic's own claim and caveats, word for word.
    v.claim === null ? null : h('p', { className: 'point__claim', text: v.claim }),
    // Beside the logic's claim (or alone, without a number): the tested window, not a result.
    v.tested === null ? null : h('p', { className: 'point__tested', text: `${v.tested}.` }),
    v.caveats.length === 0
      ? null
      : h('ul', { className: 'point__reasons' }, ...v.caveats.map((text) => h('li', { text }))),
    // Several reasons: every one, in plain words.
    v.reasons.length > 1
      ? h('ul', { className: 'point__reasons' }, ...v.reasons.map((text) => h('li', { text })))
      : null,
    v.change === null ? null : h('p', { className: 'point__change', text: v.change }),
    // A refused point: the parts served, each with its band and label, and the floor (0011 section 10).
    ...knownLines(v),
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
        : [
            '  C',
            h('sub', { text: 'D' }),
            ` ${v.headline}`,
            v.headlineBand === null ? '' : `  ${v.headlineBand}`,
          ]),
    ),
    chip.cloneNode(true),
  );
}

/** The parts whose label the user opened in the point block, by Mach number and part. */
const openLabels = new Set<string>();

/** A refused point's parts and floor, for the point block: none for any other point. */
function knownLines(v: PointView): HTMLElement[] {
  if (v.floor === null) return [];
  const parts =
    v.parts.length === 0 && v.notShown.length === 0
      ? null
      : h(
          'ul',
          { className: 'point__parts' },
          ...v.parts.map((p) => {
            // The label, word for word, folded under its part (it can run to a paragraph); the
            // block is redrawn as other points solve, so a part opened stays open.
            const key = `${v.mach} ${p.line}`;
            const fold = h(
              'details',
              { className: 'point__fold', attrs: { open: openLabels.has(key) } },
              h('summary', { className: 'point__part', text: p.line }),
              h('span', { className: 'point__part-label', text: p.label }),
            );
            fold.addEventListener('toggle', () => {
              if (fold.open) openLabels.add(key);
              else openLabels.delete(key);
            });
            return h('li', {}, fold);
          }),
          ...v.notShown.map((text) => h('li', { className: 'point__part-label', text })),
        );
  return [
    h(
      'div',
      { className: 'point__known' },
      h('p', { className: 'point__known-head', text: KNOWN_HEADING }),
      parts,
      h('p', {
        className: v.floor.startsWith('At least')
          ? 'point__floor'
          : 'point__floor point__floor--none',
        text: v.floor,
      }),
    ),
  ];
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
        out.push(
          blocks(
            totalDragDisplay({
              kind: 'refused',
              refusals: result.refusals,
              parts: result.parts,
            }),
          ),
        );
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
  if (imported !== null) {
    const list = (title: string, items: readonly string[]) =>
      items.length === 0
        ? []
        : [h('h3', { text: title }), h('ul', {}, ...items.map((t) => h('li', { text: t })))];
    out.push(
      h('h3', { text: 'The OpenRocket file' }),
      h('p', { text: imported.headline }),
      h('p', { text: `The flight: ${imported.flight}.` }),
      ...list('Not taken exactly', imported.notTaken),
      ...list('Taken', imported.taken),
      ...list('Left out (not part of the outside)', imported.ignored),
    );
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
  link.download = `bowshock-${slug(run.options.design.name)}-drag.csv`;
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 10_000);
  shell.toasts.show(`Saved ${link.download}`);
});

async function savePng(): Promise<void> {
  if ((view === null && scene === null) || drawnMach === null) {
    shell.toasts.show('Nothing to save yet: the airflow shows once its first grid is set up.');
    return;
  }
  // The rocket and curve of the flow drawn (the rocket shown may since have been edited).
  const drawn = flowDesign ?? design;
  const point = run?.points.find((p) => p.mach === drawnMach);
  const v = point === undefined ? null : pointView(point, finest() < 16);
  const name = `bowshock-${slug(drawn.name)}-mach-${drawnMach.toFixed(2)}.png`;
  const rocketLine = curveRocketName(drawn, run?.options.without === true);
  const machLine = `Mach ${drawnMach.toFixed(2)}, zero incidence: the airflow around the body`;
  // The result line, and for a refused point its parts and floor (0011 section 10).
  const result = v === null ? [] : captionLines(v);
  try {
    if (scene !== null && shown === '3d') {
      // The scene's PNG has its own readout (grid, steps, Mach number), legend and notes.
      const caption = [rocketLine, ...result].filter((line) => line !== '');
      download(await scene.pngBlob(caption), name);
    } else if (view !== null) {
      const caption = [rocketLine, machLine, ...result].filter((line) => line !== '');
      await view.savePng(name, caption);
    }
    shell.toasts.show(`Saved ${name}`);
  } catch (error) {
    shell.toasts.show(`Could not save the PNG: ${String(error)}`, 'bad');
  }
}
pngButton.addEventListener('click', () => void savePng());

function download(blob: Blob, name: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 10_000);
}

// -------------------------------------------------------------- import

// Loaded on its own: the page draws and solves without waiting for it; the button shows once it has.
let importer: Awaited<ReturnType<typeof loadImporter>> = null;
importButton.hidden = true;
loadImporter()
  .then((load) => {
    importer = load;
    importButton.hidden = load === null;
  })
  .catch((error: unknown) => {
    shell.toasts.show(`OpenRocket import is not available here: ${String(error)}`, 'bad', 8);
  });
importButton.addEventListener('click', () => {
  importFile.click();
});
importFile.addEventListener('change', () => {
  const file = importFile.files?.[0];
  importFile.value = '';
  if (file === undefined || importer === null) return;
  const load = importer;
  // A failed import: the rocket shown, its notes and its curve stay as they were, and say so.
  const failed = (message: string) => {
    importFailure = `${message} The rocket shown is still ${design.name}, as before.`;
    renderCurve();
    shell.toasts.show(importFailure, 'bad', 8);
  };
  // Too large: refused on its size, before any of it is read.
  const tooLarge = fileSizeRefusal(file.name, file.size);
  if (tooLarge !== null) {
    failed(tooLarge);
    return;
  }
  void (async () => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { mapping } = await load(bytes, { fileName: file.name });
      const summary = importSummary(file.name, mapping);
      if (mapping.design === null) {
        failed(summary.headline);
        return;
      }
      imported = summary;
      importFailure = null;
      design = mapping.design;
      without = false;
      if (presetSelect.querySelector('option[value="imported"]') === null) {
        presetSelect.append(h('option', { attrs: { value: 'imported' } }));
      }
      const option = presetSelect.querySelector<HTMLOptionElement>('option[value="imported"]')!;
      option.textContent = `Imported: ${design.name}`;
      presetSelect.value = 'imported';
      builder.setDesign(design);
      showDrawing();
      shell.announce(imported.headline);
      await start();
    } catch (error) {
      failed(
        `Could not import ${file.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  })();
});

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
      // The app's colours: the spectrum on black; room behind the base to show where nothing is simulated.
      palette: 'spectrum',
      background: '#000000',
      fitAft: 0.12,
      onScale: (scale) => {
        scale2d = scale;
        if (sideView() !== null) controls.showScale(scale);
      },
    });
  } catch (error) {
    showState(`The airflow view could not be set up: ${String(error)}`, 'bad');
    return;
  }
  view.onChange(() => {
    controls.showViewState();
  });
  view.setLook('glow');
  controls.showViewState();
  await startScene(device, adapter.info);
  showFlow(shown);
  shell.onLayout(() => {
    view?.invalidate();
    fitScene();
  });
}

/**
 * The 3D view (src/render3d), if this build has it, on the solver's device
 * (so that it reads the live fit's buffers in place), its live frames held
 * to the same share of the time as the side view's (FRAME_BUDGET).
 */
async function startScene(gpu: GPUDevice, info: GPUAdapterInfo): Promise<void> {
  const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
  try {
    render3d = await loadRender3D();
  } catch (error) {
    // Its code is a file of its own, fetched now: a dropped connection, or a site updated since the page loaded.
    failScene(`its code could not be fetched (${message(error)}); reloading the page may fix it`);
    return;
  }
  try {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(2, Math.round(canvas3d.clientWidth * dpr));
      const height = Math.max(2, Math.round(canvas3d.clientHeight * dpr));
      // Setting a canvas's size clears it, even to the size it has: the frame shown stays until redrawn.
      if (canvas3d.width !== width) canvas3d.width = width;
      if (canvas3d.height !== height) canvas3d.height = height;
    };
    // Shown while it is set up, so that its first frame is at the window's size.
    canvas3d.hidden = false;
    resize();
    const made = await render3d.FlowScene3D.create(gpu, canvas3d, {
      presentation: presentationFor(info),
      liveDuty: FRAME_BUDGET,
    });
    // The page's own legend, notes and readout stand in for the scene's text (a PNG has it).
    // The look: glowing shells of the colour quantity with streamlines, the shock and a cutaway.
    made.setLayers({ overlay: false, slice: false });
    made.onScale((s) => {
      scale3d = s;
      if (shown === '3d') showScale3d(s);
    });
    // Pointer and wheel only: the keys are the page's one key map's (scene-keys.ts).
    render3d.attachControls(made, canvas3d, { keys: false });
    new ResizeObserver(() => {
      resize();
      fitScene();
      made.requestDraw();
    }).observe(canvas3d);
    scene = made;
    // The free part of the window changes as the readout and the legend fill in: the opening
    // view follows it (until the user moves it), so that it is the view F and 0 give.
    const free = new ResizeObserver(() => {
      fitScene(true);
    });
    for (const e of document.querySelectorAll('.readout, .hud-bottom')) free.observe(e);
    flowSwitch.element.hidden = false;
    showSceneRocket();
  } catch (error) {
    failScene(`the GPU did not set it up (${message(error)})`);
  }
}

/** The 3D view could not be set up: said on the page (toast and the airflow's note) and in the console. */
function failScene(why: string): void {
  scene = null;
  canvas3d.hidden = true;
  sceneFailure = why;
  console.error(`bowshock: the 3D view could not be set up: ${why}`);
  shell.toasts.show(
    `The 3D view could not be set up: ${why}. The side view shows the airflow.`,
    'bad',
    8,
  );
  showFlowNote();
}

showDrawing();
preview();
await startGpu();
// Without WebGPU no view is set up: the phone's first screen still says what is (not) solved.
showSheetNote();
await start();
