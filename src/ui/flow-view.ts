/**
 * The flow view (docs/design/0012-interface.md, phase U1): a solver's flow
 * drawn full window from the GPU's own buffers while it converges, mirrored
 * about the axis, with pan and zoom (drag, wheel, pinch, keys), the four
 * fields, the split view, grid lines, the fitted shock as a line, the body
 * as a solid, and a PNG of the view.
 *
 * Drawing never reads the solution back. While the flow is live the view
 * draws at most `maxFps` frames a second, and a frame only once the GPU
 * has finished the one before, so the solver keeps the GPU; at rest it
 * draws only when something changes. The colour scale's two ends
 * are read back a few times a second for the legend (8 bytes).
 */

import {
  FlowRenderer,
  type FlowDrawOptions,
  type FlowShape,
  type FlowSource,
} from '../render/flow-renderer';
import type { FlowField } from '../render/flow-fields';
import { colormapTable, hexToRgb } from '../render/colormap';
import {
  bytesPerRow,
  CanvasPresenter,
  CopyPresenter,
  readPixels,
  type Presenter,
} from '../render/presenter';
import { formatScaleValue } from './format';
import { fitView, panBy, zoomAbout, type Bounds, type PixelRect, type View } from '../render/view';
import type { Rect } from './shell';

export interface FlowViewOptions {
  /**
   * 'canvas' draws straight into the canvas; 'copy' copies each frame
   * (software adapters); or a presenter of the caller's.
   */
  readonly presentation: 'canvas' | 'copy' | Presenter;
  /** Where the flow may be drawn when fitted, in CSS pixels of the canvas, for a drawing of this aspect. */
  readonly fitRect?: (aspect: number) => Rect;
  /** The colour scale of the field shown, when it changes (a few times a second at most). */
  readonly onScale?: (scale: FlowScale) => void;
  /** Frames a second at most while the flow is live (default 30). */
  readonly maxFps?: number;
  /** The background, as #rrggbb (default the ground's). */
  readonly background?: string;
}

/** The scale of the colour field shown (below the axis in the split view). */
export interface FlowScale {
  readonly field: FlowField;
  readonly split: boolean;
  readonly min: number;
  readonly max: number;
}

export interface FlowViewState {
  readonly field: FlowField;
  readonly split: boolean;
  readonly grid: boolean;
  readonly shock: boolean;
}

/** Schlieren's contrast k in 1 - exp(-k g): weak waves visible, shocks bright. */
const SCHLIEREN_CONTRAST = 3;
/** Grid lines are drawn at least this many CSS pixels apart (every 2^n-th line). */
const GRID_SPACING = 5;
/** How often the legend's range is read back, milliseconds. */
const RANGE_INTERVAL = 250;
/** The colour fields as a PNG's caption names them. */
const FIELD_NAMES: Readonly<Record<FlowField, string>> = {
  schlieren: 'Schlieren',
  mach: 'Mach number',
  cp: 'Pressure coefficient Cp',
  density: 'Density ρ/ρ∞',
};

export class FlowView {
  private renderer: FlowRenderer;
  private presenter: Presenter;
  private view: View | null = null;
  /** Whether the user has moved the view (then a new grid does not refit it). */
  private moved = false;
  /** The rectangle the view was fitted to; fitted again when it changes. */
  private fittedTo = '';
  private live = false;
  private dirty = true;
  private frame: number | null = null;
  private lastFrame = 0;
  private lastRange = 0;
  private drawing: Promise<void> | null = null;
  private bodyRadius = 0.5;
  private state: FlowViewState = { field: 'schlieren', split: false, grid: false, shock: true };
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private readonly listeners: (() => void)[] = [];
  private lastScale = '';
  private destroyed = false;
  private lost = false;
  private frames = 0;

  static async create(
    device: GPUDevice,
    canvas: HTMLCanvasElement,
    options: FlowViewOptions,
  ): Promise<FlowView> {
    const presenter =
      options.presentation === 'canvas'
        ? new CanvasPresenter(device, canvas)
        : options.presentation === 'copy'
          ? new CopyPresenter(device, canvas)
          : options.presentation;
    const renderer = await FlowRenderer.create(device, presenter.format);
    return new FlowView(device, canvas, options, renderer, presenter);
  }

  private constructor(
    private readonly device: GPUDevice,
    readonly canvas: HTMLCanvasElement,
    private readonly options: FlowViewOptions,
    renderer: FlowRenderer,
    presenter: Presenter,
  ) {
    this.renderer = renderer;
    this.presenter = presenter;
    this.resize();
    canvas.classList.add('draggable');
    new ResizeObserver(() => {
      this.resize();
      if (!this.moved) this.view = null;
      this.invalidate();
    }).observe(canvas);
    this.attachPointer();
    // A lost device draws nothing more: the last frame stays on the canvas.
    void device.lost.then(() => {
      this.lost = true;
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;
    });
  }

  /** Frames of the flow drawn so far (for measuring what drawing costs). */
  get framesDrawn(): number {
    return this.frames;
  }

  /** What is shown. */
  get shown(): FlowViewState {
    return this.state;
  }

  /** The source drawn, if any. */
  get source(): FlowSource | null {
    return this.renderer.source;
  }

  /** Called whenever what is shown changes (field, toggles). */
  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  /**
   * Draw this flow from now on (null: none). A new source keeps the view
   * if the user has moved it, and fits it otherwise.
   */
  setSource(source: FlowSource | null): void {
    this.renderer.setSource(source);
    if (!this.moved) this.view = null;
    this.lastScale = '';
    this.invalidate();
  }

  /**
   * Keep showing the flow drawn now once its solver is released (a copy
   * on the GPU), so that it can still be explored. Call it before the
   * solver's buffers are destroyed.
   */
  freeze(): void {
    this.renderer.freeze();
    this.invalidate();
  }

  /** The body's outline (x, r) from the tip to the base, drawn as a solid; its radius scales schlieren. */
  setBody(outline: readonly (readonly [number, number])[] | null): void {
    this.renderer.setBody(outline);
    if (outline !== null && outline.length > 0) {
      this.bodyRadius = Math.max(...outline.map(([, r]) => r));
    }
    this.invalidate();
  }

  /** Shapes drawn over the flow as they are, behind or in front of the body (the fins seen from the side). */
  setShapes(shapes: readonly FlowShape[]): void {
    this.renderer.setShapes(shapes);
    this.invalidate();
  }

  /** Whether the flow is changing (a solver running): then the view draws continuously. */
  setLive(live: boolean): void {
    this.live = live;
    this.invalidate();
  }

  setField(field: FlowField): void {
    this.update({ field });
  }

  toggleSplit(): void {
    this.update({ split: !this.state.split });
  }

  toggleGrid(): void {
    this.update({ grid: !this.state.grid });
  }

  toggleShock(): void {
    this.update({ shock: !this.state.shock });
  }

  /** Fit the flow to the window (F). */
  fit(): void {
    this.moved = false;
    this.view = null;
    this.invalidate();
  }

  /** Zoom by `factor` about the middle of the drawing area (+ and -). */
  zoom(factor: number): void {
    const view = this.currentView();
    if (view === null) return;
    const rect = this.fitRectPixels(1);
    this.setView(
      zoomAbout(
        view,
        factor,
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        this.canvas.width,
        this.canvas.height,
        this.fittedScale(),
      ),
    );
  }

  /** Pan by a fraction of the view's size (the arrow keys): positive x to the right, y up. */
  panFraction(fx: number, fy: number): void {
    const view = this.currentView();
    if (view === null) return;
    // The flow moves the other way to the view.
    this.setView(panBy(view, -fx * this.canvas.width, fy * this.canvas.height));
  }

  /** Draw the next frame (soon, within the live frame rate). */
  invalidate(): void {
    this.dirty = true;
    this.schedule();
  }

  /**
   * The values drawn at these points, for tests: the field's interpolated
   * value, as the field pass draws it, at each point.
   */
  probe(
    points: readonly (readonly [number, number])[],
    field: FlowField,
    split = false,
  ): Promise<number[]> {
    return this.renderer.probe(points, { ...this.drawOptions(), field, split });
  }

  /** Save the view as a PNG file (K), with the case's caption and the colour scale. */
  async savePng(name: string, caption: readonly string[] = []): Promise<void> {
    const blob = await this.pngBlob(caption);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 10_000);
  }

  /**
   * The view as a PNG image, drawn afresh at the canvas's size, with the
   * caption's lines and the colour scale (if a colour field is shown) at
   * its bottom left, so that the image says what it shows.
   */
  async pngBlob(caption: readonly string[] = []): Promise<Blob> {
    const view = this.currentView();
    if (this.renderer.source === null || view === null) throw new Error('no flow is drawn yet');
    const { width, height } = this.canvas;
    const texture = this.device.createTexture({
      size: [width, height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const buffer = this.device.createBuffer({
      size: bytesPerRow(width) * height,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    try {
      this.renderer.draw(texture, { ...this.drawOptions(), view });
      const image = new ImageData(width, height);
      await readPixels(this.device, texture, buffer, image);
      // The colour scale of this very frame, read after it was drawn.
      const scale = await this.drawnScale();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context !== null) {
        context.putImageData(image, 0, 0);
        this.drawCaption(context, caption, scale);
      }
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob === null) reject(new Error('the browser could not make a PNG'));
          else resolve(blob);
        }, 'image/png');
      });
    } finally {
      texture.destroy();
      buffer.destroy();
    }
  }

  /**
   * The colour scale of the frame just drawn (none for schlieren alone):
   * read from the GPU, waiting while the legend's own read holds the
   * readback buffer.
   */
  private async drawnScale(): Promise<FlowScale | null> {
    const { field, split } = this.state;
    if (field === 'schlieren' && !split) return null;
    const shown: FlowField = split && field === 'schlieren' ? 'mach' : field;
    for (let k = 0; k < 40; k++) {
      const range = await this.renderer.readRange(split ? 1 : 0);
      if (range !== null) return { field: shown, split, min: range.min, max: range.max };
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('the colour scale could not be read');
  }

  /** The caption and the colour scale, bottom left on a backing. */
  private drawCaption(
    context: CanvasRenderingContext2D,
    caption: readonly string[],
    colour: FlowScale | null,
  ): void {
    const dpr = window.devicePixelRatio || 1;
    const lines = [...caption];
    if (colour !== null) {
      const ends = `${formatScaleValue(colour.min)} to ${formatScaleValue(colour.max)}`;
      lines.push(`${FIELD_NAMES[colour.field]}${colour.split ? ' below the axis' : ''}: ${ends}`);
    }
    if (lines.length === 0) return;
    const size = Math.round(12 * dpr);
    const line = Math.round(1.5 * size);
    const pad = Math.round(8 * dpr);
    const barHeight = colour === null ? 0 : Math.round(8 * dpr);
    context.font = `${size}px 'JetBrains Mono', monospace`;
    const textWidth = Math.max(...lines.map((l) => context.measureText(l).width));
    const boxWidth = Math.ceil(textWidth) + 2 * pad;
    const boxHeight = lines.length * line + (barHeight > 0 ? barHeight + pad : 0) + 2 * pad;
    const x = pad;
    const y = context.canvas.height - boxHeight - pad;
    context.fillStyle = 'rgb(17 21 28 / 0.9)';
    context.fillRect(x, y, boxWidth, boxHeight);
    context.fillStyle = '#e6e8eb';
    context.textBaseline = 'top';
    lines.forEach((text, k) => {
      context.fillText(text, x + pad, y + pad + k * line + (line - size) / 2);
    });
    if (colour !== null) {
      const top = y + pad + lines.length * line;
      const table = colormapTable(64);
      const gradient = context.createLinearGradient(x + pad, 0, x + boxWidth - pad, 0);
      for (let k = 0; k < 64; k++) {
        const [r, g, b] = [0, 1, 2].map((c) => Math.round(255 * table[4 * k + c]!));
        gradient.addColorStop(k / 63, `rgb(${r} ${g} ${b})`);
      }
      context.fillStyle = gradient;
      context.fillRect(x + pad, top, boxWidth - 2 * pad, barHeight);
    }
  }

  /** Stop drawing and release the GPU resources (not the source's). */
  destroy(): void {
    this.destroyed = true;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.renderer.destroy();
    this.presenter.destroy();
  }

  // ------------------------------------------------------------ internals

  private update(change: Partial<FlowViewState>): void {
    this.state = { ...this.state, ...change };
    this.lastScale = '';
    for (const listener of this.listeners) listener();
    this.invalidate();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
  }

  private schedule(): void {
    if (this.frame !== null || this.destroyed || this.lost) return;
    this.frame = requestAnimationFrame((time) => {
      this.frame = null;
      this.tick(time);
    });
  }

  private tick(time: number): void {
    const interval = 1000 / (this.options.maxFps ?? 30);
    const due = this.dirty || (this.live && time - this.lastFrame >= interval);
    // One frame at a time: a frame being copied to the page (CopyPresenter)
    // holds its buffers until it is shown.
    if (due && this.drawing === null) {
      const asked = this.dirty;
      this.lastFrame = time;
      this.dirty = false;
      const frame = this.renderer.source === null ? this.drawEmpty() : this.drawFrame(time, asked);
      this.drawing = frame
        // A frame in flight when the device is lost fails: that is expected.
        .catch((error: unknown) => {
          if (!this.lost) throw error;
        })
        .finally(() => {
          this.drawing = null;
        });
    }
    if (this.live || this.dirty) this.schedule();
  }

  private async drawFrame(time: number, asked: boolean): Promise<void> {
    const view = this.currentView();
    if (view === null) return;
    this.renderer.draw(this.presenter.frameTexture(), { ...this.drawOptions(), view });
    this.frames += 1;
    // One frame in flight: the next is drawn only once the GPU has done
    // this one, so frames never queue up behind the solver's steps and
    // drawing takes at most a frame per batch of steps the GPU runs.
    await Promise.all([this.presenter.present(), this.device.queue.onSubmittedWorkDone()]);
    // The legend's range: after a frame asked for (a change), and every
    // RANGE_INTERVAL while live.
    if (asked || time - this.lastRange >= RANGE_INTERVAL || this.lastScale === '') {
      this.lastRange = time;
      void this.readScale().catch((error: unknown) => {
        if (!this.lost) throw error;
      });
    }
  }

  /** Nothing to draw: clear to the background. */
  private drawEmpty(): Promise<void> {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.presenter.frameTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: this.background(),
        },
      ],
    });
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    return this.presenter.present();
  }

  private async readScale(): Promise<void> {
    const split = this.state.split;
    const field: FlowField = split
      ? this.state.field === 'schlieren'
        ? 'mach'
        : this.state.field
      : this.state.field;
    const range = await this.renderer.readRange(split ? 1 : 0);
    if (range === null || this.options.onScale === undefined) return;
    const key = `${field} ${split} ${range.min} ${range.max}`;
    if (key === this.lastScale) return;
    this.lastScale = key;
    this.options.onScale({ field, split, min: range.min, max: range.max });
  }

  private drawOptions(): Omit<FlowDrawOptions, 'view'> {
    return {
      ...this.state,
      schlierenContrast: SCHLIEREN_CONTRAST,
      lengthScale: this.bodyRadius,
      gridStride: this.gridStride(),
      background: this.background(),
    };
  }

  private background(): GPUColor {
    const [r, g, b] = hexToRgb(this.options.background ?? '#07090c');
    return { r, g, b, a: 1 };
  }

  /** Every 2^n-th grid line, so that lines stay GRID_SPACING CSS pixels apart or more. */
  private gridStride(): number {
    const source = this.renderer.source;
    const view = this.view;
    if (source === null || view === null) return 1;
    const b = source.bounds();
    const spacing = ((b.yMax - b.yMin) / source.nj) * view.ppu;
    const dpr = window.devicePixelRatio || 1;
    const want = (GRID_SPACING * dpr) / Math.max(spacing, 1e-9);
    return want <= 1 ? 1 : 2 ** Math.ceil(Math.log2(want));
  }

  /** The source's extent, mirrored about the axis if it is drawn so. */
  private bounds(): Bounds | null {
    const source = this.renderer.source;
    if (source === null) return null;
    const b = source.bounds();
    if (!source.mirror) return b;
    const y = Math.max(Math.abs(b.yMin), Math.abs(b.yMax));
    return { xMin: b.xMin, xMax: b.xMax, yMin: -y, yMax: y };
  }

  private fitRectPixels(aspect: number): PixelRect {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.options.fitRect?.(aspect) ?? {
      x: 0,
      y: 0,
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
    };
    return {
      x: rect.x * dpr,
      y: rect.y * dpr,
      width: Math.max(1, rect.width * dpr),
      height: Math.max(1, rect.height * dpr),
    };
  }

  /** The view that fits the flow now. */
  private fittedView(): View | null {
    const bounds = this.bounds();
    if (bounds === null) return null;
    return fitView(
      bounds,
      this.fitRectPixels(this.boundsAspect()),
      this.canvas.width,
      this.canvas.height,
    );
  }

  private fittedScale(): number {
    return this.fittedView()?.ppu ?? 1;
  }

  private currentView(): View | null {
    // Fitted again when the space it may take changes (a panel grows, the
    // window turns), unless the user has moved it.
    if (!this.moved && this.view !== null && this.fitKey() !== this.fittedTo) this.view = null;
    if (this.view === null) {
      this.view = this.fittedView();
      this.fittedTo = this.fitKey();
    }
    return this.view;
  }

  /** The rectangle a fitted view takes now, as a key. */
  private fitKey(): string {
    const r = this.fitRectPixels(this.boundsAspect());
    return `${r.x} ${r.y} ${r.width} ${r.height} ${this.canvas.width} ${this.canvas.height}`;
  }

  private boundsAspect(): number {
    const b = this.bounds();
    return b === null ? 1 : (b.xMax - b.xMin) / Math.max(b.yMax - b.yMin, 1e-12);
  }

  private setView(view: View): void {
    this.view = view;
    this.moved = true;
    this.invalidate();
  }

  private attachPointer(): void {
    const canvas = this.canvas;
    const dpr = () => window.devicePixelRatio || 1;
    const local = (event: PointerEvent | WheelEvent) => {
      const box = canvas.getBoundingClientRect();
      return { x: (event.clientX - box.left) * dpr(), y: (event.clientY - box.top) * dpr() };
    };
    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, local(event));
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', (event) => {
      const previous = this.pointers.get(event.pointerId);
      if (previous === undefined) return;
      const view = this.currentView();
      const here = local(event);
      if (view === null) return;
      if (this.pointers.size === 1) {
        this.setView(panBy(view, here.x - previous.x, here.y - previous.y));
      } else if (this.pointers.size === 2) {
        const other = [...this.pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
        if (other !== undefined) {
          const before = Math.hypot(previous.x - other.x, previous.y - other.y);
          const after = Math.hypot(here.x - other.x, here.y - other.y);
          const mid = { x: (here.x + other.x) / 2, y: (here.y + other.y) / 2 };
          const moved = panBy(view, (here.x - previous.x) / 2, (here.y - previous.y) / 2);
          this.setView(
            zoomAbout(
              moved,
              after / Math.max(before, 1),
              mid.x,
              mid.y,
              canvas.width,
              canvas.height,
              this.fittedScale(),
            ),
          );
        }
      }
      this.pointers.set(event.pointerId, here);
    });
    const release = (event: PointerEvent) => {
      this.pointers.delete(event.pointerId);
      if (this.pointers.size === 0) canvas.style.cursor = '';
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('dblclick', () => {
      this.fit();
    });
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const view = this.currentView();
        if (view === null) return;
        const p = local(event);
        const lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
        const factor = Math.exp(-event.deltaY * lines * 0.0015);
        this.setView(
          zoomAbout(view, factor, p.x, p.y, canvas.width, canvas.height, this.fittedScale()),
        );
      },
      { passive: false },
    );
  }
}
