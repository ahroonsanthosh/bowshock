import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sharpFitProblem } from '../../src/analysis/fitted-flow';
import { gpuFittedFlow } from '../../src/analysis/gpu-fitted-flow';
import { bodyLength } from '../../src/geometry/body';
import type { FlowSource } from '../../src/render/flow-renderer';
import { liveFitSource } from '../../src/render/flow-source';
import type { Presenter } from '../../src/render/presenter';
import { cameraFrame, eyeOf, transform, viewProjection } from '../../src/render3d/camera';
import { basicFinnerRocket } from '../../src/render3d/presets';
import { QUANTITIES } from '../../src/render3d/quantities';
import { FlowScene3D, type SceneLayers, type SliceMode } from '../../src/render3d/scene';
import { requireDevice } from './device';

/**
 * The 3D view (src/render3d/scene.ts) on the GPU: drawing a GPU fit live
 * as it converges, reading a flow's buffers back exactly, and every layer,
 * colour quantity and slice drawn without a GPU error, offscreen (headless
 * Chromium on SwiftShader cannot present to a WebGPU canvas).
 */

let device: GPUDevice;
let errors: string[] = [];
beforeAll(async () => {
  device = await requireDevice();
  device.addEventListener('uncapturederror', (e) => {
    errors.push(e.error.message);
  });
});
afterAll(() => {
  device.destroy();
});

/** A presenter drawing into a texture of the canvas's size. */
function offscreen(canvas: HTMLCanvasElement): Presenter {
  let texture: GPUTexture | null = null;
  return {
    format: 'rgba8unorm',
    frameTexture: () => {
      if (texture?.width !== canvas.width || texture.height !== canvas.height) {
        texture?.destroy();
        texture = device.createTexture({
          size: [canvas.width, canvas.height],
          format: 'rgba8unorm',
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
      }
      return texture;
    },
    present: () => Promise.resolve(),
    destroy: () => {
      texture?.destroy();
    },
  };
}

async function newScene(width = 480, height = 300): Promise<FlowScene3D> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return FlowScene3D.create(device, canvas, {
    presentation: offscreen(canvas),
    pixelRatio: 1,
    liveDuty: 0.5,
  });
}

/** Pixels that are grey (the rocket, the box) and that are coloured (the flow). */
function census(image: ImageData): { grey: number; coloured: number } {
  let grey = 0;
  let coloured = 0;
  const d = image.data;
  for (let k = 0; k < d.length; k += 4) {
    const r = d[k]!;
    const g = d[k + 1]!;
    const b = d[k + 2]!;
    const hi = Math.max(r, g, b);
    const lo = Math.min(r, g, b);
    if (hi > 110 && hi - lo < 18) grey++;
    else if (hi > 60 && hi - lo > 60) coloured++;
  }
  return { grey: grey / (d.length / 4), coloured: coloured / (d.length / 4) };
}

/** The fraction of pixels that differ between two pictures by more than a little. */
function changed(a: ImageData, b: ImageData): number {
  let n = 0;
  for (let k = 0; k < a.data.length; k += 4) {
    const d = Math.max(
      Math.abs(a.data[k]! - b.data[k]!),
      Math.abs(a.data[k + 1]! - b.data[k + 1]!),
      Math.abs(a.data[k + 2]! - b.data[k + 2]!),
    );
    if (d > 24) n++;
  }
  return n / (a.data.length / 4);
}

const ALL_OFF: Partial<SceneLayers> = {
  body: 'off',
  slice: false,
  streamlines: false,
  isosurfaces: false,
  shock: false,
  box: false,
  overlay: false,
  help: false,
  streaks: 'off',
};

describe('the 3D view', () => {
  let scene: FlowScene3D;
  const rocket = basicFinnerRocket();

  it('draws a GPU fit live as it converges, and keeps the last flow read when it ends', async () => {
    errors = [];
    scene = await newScene();
    scene.setRocket(rocket);
    const problem = sharpFitProblem(rocket.body, { mach: 2, gamma: 1.4, nj: 20, refinement: 1 });
    let liveSeen = false;
    await gpuFittedFlow(device, problem, {
      maxIterations: 1000,
      stepsPerMove: 1,
      checkEvery: 250,
      speedTolerance: 0,
      onLive: (live) => {
        if (live === null) {
          scene.freeze();
        } else {
          liveSeen = true;
          scene.setFlow(liveFitSource(live));
          scene.setLive(true);
        }
      },
      onProgress: (iterations) => {
        scene.setStatus({ steps: iterations });
      },
    });
    expect(liveSeen).toBe(true);
    // The flow was read back and drawn while the fit ran.
    const field = scene.getField();
    expect(field).not.toBeNull();
    expect(field!.ni).toBe(problem.lines.length - 1);
    expect(field!.nj).toBe(20);
    await scene.render();
    expect(scene.framesDrawn).toBeGreaterThan(1);
    expect(errors).toEqual([]);
  }, 1_800_000);

  it('reads a flow’s buffers back exactly: its state, and its nodes from lines, fractions and heights', async () => {
    const s = await newScene(64, 48);
    const ni = 3;
    const nj = 2;
    const gamma = 1.4;
    const make = (data: Float32Array<ArrayBuffer>) => {
      const b = device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(b, 0, data);
      return b;
    };
    const state = new Float32Array(4 * ni * nj);
    const prim = (c: number) => ({
      rho: 1 + 0.1 * c,
      u: 2 + 0.05 * c,
      v: 0.1 * c - 0.2,
      p: 1 + 0.02 * c,
    });
    for (let c = 0; c < ni * nj; c++) {
      const q = prim(c);
      state.set(
        [q.rho, q.rho * q.u, q.rho * q.v, q.p / (gamma - 1) + 0.5 * q.rho * (q.u ** 2 + q.v ** 2)],
        4 * c,
      );
    }
    // Lines: P = (i, 0.5), d = (0.1 i, 1) normalised loosely; fractions j / nj squared.
    const lines = new Float32Array(4 * (ni + 1));
    for (let i = 0; i <= ni; i++) lines.set([i, 0.5, 0.1 * i, 1], 4 * i);
    const fractions = new Float32Array(2 * (ni + 1) * (nj + 1));
    for (let j = 0; j <= nj; j++)
      for (let i = 0; i <= ni; i++) fractions[i + j * (ni + 1)] = (j / nj) ** 2;
    const heights = new Float32Array(4 * ni + 3);
    for (let i = 0; i <= ni; i++) {
      heights[i] = 1 + 0.25 * i; // base
      heights[3 * ni + 2 + i] = 0.125 * i; // displacement
    }
    const buffers = {
      state: make(state),
      lines: make(lines),
      fractions: make(fractions),
      heights: make(heights),
    };
    const source: FlowSource = {
      ni,
      nj,
      gamma,
      freeStream: { rho: 1, u: 2 * Math.sqrt(gamma), v: 0, p: 1 },
      mirror: true,
      fittedShock: true,
      nodes: {
        kind: 'lines',
        lines: buffers.lines,
        fractions: buffers.fractions,
        heights: buffers.heights,
      },
      state: () => buffers.state,
      bounds: () => ({ xMin: 0, xMax: 4, yMin: 0, yMax: 3 }),
    };
    s.setFlow(source);
    await s.refresh();
    const f = s.getField()!;
    for (let j = 0; j <= nj; j++) {
      for (let i = 0; i <= ni; i++) {
        const h = 1 + 0.25 * i + 0.125 * i;
        const frac = (j / nj) ** 2;
        expect(f.x[i + j * (ni + 1)]).toBeCloseTo(i + h * frac * 0.1 * i, 5);
        expect(f.r[i + j * (ni + 1)]).toBeCloseTo(0.5 + h * frac, 5);
      }
    }
    for (let c = 0; c < ni * nj; c++) {
      const q = prim(c);
      expect(f.rho[c]).toBeCloseTo(q.rho, 5);
      expect(f.u[c]).toBeCloseTo(q.u, 5);
      expect(f.v[c]).toBeCloseTo(q.v, 5);
      expect(f.p[c]).toBeCloseTo(q.p, 4);
    }
    s.freeze();
    Object.values(buffers).forEach((b) => {
      b.destroy();
    });
    s.destroy();
  });

  it('draws every layer, colour quantity and slice, in full and in draft, without a GPU error', async () => {
    errors = [];
    const layerSets: Partial<SceneLayers>[] = [
      {},
      { body: 'wireframe' },
      { solidShells: true },
      { solidShells: false },
      { faces: 'schlieren' },
      { faces: 'plain' },
      { streaks: 'still' },
      { streaks: 'moving' },
      { cutaway: false },
      { help: true },
      { ...ALL_OFF },
    ];
    const slices: SliceMode[] = ['cutaway', 'axial', 'cross'];
    for (const layers of layerSets) {
      for (const slice of slices) {
        scene.setLayers({
          ...ALL_OFF,
          body: 'solid',
          slice: true,
          streamlines: true,
          isosurfaces: true,
          shock: true,
          box: true,
          overlay: true,
          ...layers,
        });
        scene.setSlice(slice);
        scene.moveSlice(2);
        device.pushErrorScope('validation');
        await scene.render();
        expect(await device.popErrorScope()).toBeNull();
      }
    }
    scene.setSlice('cutaway');
    for (const q of QUANTITIES) {
      scene.setQuantity(q);
      device.pushErrorScope('validation');
      await scene.pixels();
      expect(await device.popErrorScope()).toBeNull();
    }
    scene.setQuantity('mach');
    // Draft frames (live, on a slow adapter).
    scene.setLive(true);
    await scene.render();
    scene.setLive(false);
    expect(errors).toEqual([]);
    // As long as the file's first test may take: on CI it ran 87.6 s alone (5759a65) and timed
    // out at 600 s beside the transonic GPU suite (b7742b5), where this file's other tests took
    // 5.3 to 5.8 times as long as before; a timeout left its loop changing the layers under the
    // next test.
  }, 1_800_000);

  it('shows the rocket where it stands, coloured by its surface pressure, fins grey; the flow’s layers add colour', async () => {
    scene.setLayers({ ...ALL_OFF, body: 'solid', cutaway: true });
    scene.setSlice('cutaway');
    scene.resetView();
    // With a flow, the body carries its computed surface pressure's colours;
    // the fins (not in the airflow) stay light grey.
    const bodyOnly = census(await scene.pixels());
    expect(bodyOnly.grey).toBeGreaterThan(0.0003);
    expect(bodyOnly.coloured).toBeGreaterThan(0.002);
    // The middle of the body is lit at its projected pixel.
    const image = await scene.pixels();
    const orbit = scene.getOrbit()!;
    const m = viewProjection(orbit, image.width / image.height, 20);
    const c = transform(m, [bodyLength(rocket.body) / 2, 0, 0]);
    const px = Math.round((0.5 + (0.5 * c[0]) / c[3]) * image.width);
    const py = Math.round((0.5 - (0.5 * c[1]) / c[3]) * image.height);
    const k = 4 * (px + py * image.width);
    const [r, g, b] = [image.data[k]!, image.data[k + 1]!, image.data[k + 2]!];
    expect(
      Math.max(r, g, b),
      `pixel ${px}, ${py} of ${image.width} x ${image.height}`,
    ).toBeGreaterThan(90);
    // Each layer of the flow changes the picture, and all but the shock
    // (drawn near white) add the palette's colours.
    for (const layer of ['slice', 'streamlines', 'isosurfaces', 'shock'] as const) {
      scene.setLayers({ ...ALL_OFF, body: 'solid', [layer]: true });
      const seen = await scene.pixels();
      expect(changed(image, seen), layer).toBeGreaterThan(0.01);
      if (layer !== 'shock') expect(census(seen).coloured, layer).toBeGreaterThan(0.005);
    }
    // Hidden behind opaque sheets, the rocket shows through them: its near
    // side, seen through at BODY_SEEN_THROUGH (0.6), over the sheets. At a
    // point of the near side off the axis's line (where the far side, lit
    // from its own side, would shade differently), the picture is 0.6 of
    // the rocket alone and 0.4 of the sheets alone.
    const at = (img: ImageData, x: number, y: number) => {
      const q = 4 * (x + y * img.width);
      return [img.data[q]!, img.data[q + 1]!, img.data[q + 2]!];
    };
    scene.setLayers({ ...ALL_OFF, body: 'solid', cutaway: false });
    const alone = await scene.pixels();
    scene.setLayers({ ...ALL_OFF, isosurfaces: true, solidShells: true, cutaway: false });
    const sheets = await scene.pixels();
    scene.setLayers({
      ...ALL_OFF,
      body: 'solid',
      isosurfaces: true,
      solidShells: true,
      cutaway: false,
    });
    const through = await scene.pixels();
    const eye = eyeOf(orbit);
    const { up } = cameraFrame(orbit);
    const xm = bodyLength(rocket.body) / 2;
    const R = rocket.body.nose.baseRadius;
    // The near side's point a third of the way from the middle towards the
    // screen's top edge.
    const toEye = [0, eye[1], eye[2]];
    const n0 = Math.hypot(toEye[1]!, toEye[2]!);
    const dir = [0, toEye[1]! / n0 + 0.8 * up[1], toEye[2]! / n0 + 0.8 * up[2]];
    const nd = Math.hypot(dir[1]!, dir[2]!);
    const near = transform(m, [xm, (R * dir[1]!) / nd, (R * dir[2]!) / nd]);
    const qx = Math.round((0.5 + (0.5 * near[0]) / near[3]) * through.width);
    const qy = Math.round((0.5 - (0.5 * near[1]) / near[3]) * through.height);
    const a = at(alone, qx, qy);
    const sh = at(sheets, qx, qy);
    const t = at(through, qx, qy);
    // The sheets do cover the rocket there.
    expect(Math.max(...sh.map((v, c) => Math.abs(v - a[c]!)))).toBeGreaterThan(20);
    for (let c = 0; c < 3; c++) {
      expect(
        Math.abs(t[c]! - (0.6 * a[c]! + 0.4 * sh[c]!)),
        `channel ${c} at ${qx}, ${qy}`,
      ).toBeLessThan(12);
    }
    scene.destroy();
  }, 600_000);
});
