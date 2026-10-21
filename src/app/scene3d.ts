/**
 * The 3D view as the page uses it (docs/design/0017-rocketeer-interface.md
 * section 6.1): src/render3d's FlowScene3D (another agent's, on its own
 * branch until merged), loaded with `import.meta.glob` so that the page
 * builds without it and offers the 3D view once it is part of the build.
 * These types are the scene's API as the page calls it: the page owns the
 * rocket, the curve and the GPU device, and hands the scene the rocket
 * (in calibres, the solver's unit) and the live fit's own GPU buffers.
 */

import type { Body } from '../geometry/body';
import type { FlowSource } from '../render/flow-renderer';
import type { TotalDragForm } from './total-drag';

/** The scene's rocket, as the page reads it: the body, and the fins with their roll (radians). */
export interface SceneRocket {
  readonly body: Body;
  readonly fins?: { readonly roll?: number } | undefined;
}

/** The colour channel's scale, as the scene reports it for the page's legend. */
export interface SceneScaleSeen {
  readonly label: string;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  /** The palette, t in [0, 1] of the range, sRGB 0 to 1. */
  readonly colour: (t: number) => readonly [number, number, number];
}

/** What the page calls on the scene. */
export interface Scene3D {
  setRocket(rocket: SceneRocket | null): void;
  setFlow(source: FlowSource | null): void;
  freeze(): void;
  setLive(live: boolean): void;
  setStatus(status: {
    readonly steps?: number | undefined;
    readonly converged?: boolean | undefined;
    readonly cellRate?: number | undefined;
    readonly caption?: string | undefined;
  }): void;
  /** The free stream's static temperature (K), for speeds in m/s and temperatures in K. */
  setUnits(units: { readonly freeStreamTemperature?: number | undefined }): void;
  /** The page draws its own legend and notes: the scene's text layer off (it is always in a PNG). */
  setLayers(layers: { readonly overlay?: boolean }): void;
  onScale(listener: (scale: SceneScaleSeen) => void): () => void;
  /** Fit the view into this part of the canvas, device pixels from its top left. */
  fit(rect: { x: number; y: number; width: number; height: number } | null): void;
  /** Draw again (after the page resized the canvas). */
  requestDraw(): void;
  pngBlob(caption?: string): Promise<Blob>;
  destroy(): void;
}

/** src/render3d/index.ts, as the page reads it. */
export interface Render3DModule {
  readonly FlowScene3D: {
    create(
      device: GPUDevice,
      canvas: HTMLCanvasElement,
      options: {
        readonly presentation?: 'canvas' | 'copy';
        /** Most of the time live frames may take, by their own measured cost. */
        readonly liveDuty?: number;
      },
    ): Promise<Scene3D>;
  };
  /** Mouse, touch, and the scene's keys while its canvas has focus; returns a function removing them. */
  attachControls(
    scene: Scene3D,
    canvas: HTMLCanvasElement,
    options?: { readonly onChange?: (key: string) => void },
  ): () => void;
  /** The scene's rocket from the logic's inputs: the body, and the fins where the logic takes them. */
  rocketFromForm(form: TotalDragForm): SceneRocket;
}

const FOUND = import.meta.glob<Render3DModule>('../render3d/index.ts');

/** Whether this build has the 3D view (known before it is loaded). */
export const HAS_RENDER3D = Object.keys(FOUND).length > 0;

/** The 3D view's module, if this build has it. */
export async function loadRender3D(): Promise<Render3DModule | null> {
  const load = Object.values(FOUND)[0];
  return load === undefined ? null : load();
}

/** A CSS gradient of a scale's palette, left to right from low to high. */
export function paletteGradient(colour: SceneScaleSeen['colour'], stops = 17): string {
  const parts = Array.from({ length: stops }, (_, k) => {
    const [r, g, b] = colour(k / (stops - 1)).map((c) => Math.round(255 * c));
    return `rgb(${r} ${g} ${b}) ${((100 * k) / (stops - 1)).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${parts.join(', ')})`;
}
