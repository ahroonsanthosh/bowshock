import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sharpFitProblem } from '../../src/analysis/fitted-flow';
import { gpuFittedFlow } from '../../src/analysis/gpu-fitted-flow';
import type { Body } from '../../src/geometry/body';
import { liveFitSource } from '../../src/render/flow-source';
import type { Presenter } from '../../src/render/presenter';
import { FlowView } from '../../src/ui/flow-view';
import { requireDevice } from './device';

/**
 * What drawing the flow live costs the solver (docs/design/0012-interface.md,
 * phase U1: under 10%): the steps per second of the drag page's first grid
 * on the Basic Finner's body at Mach 2, with and without the flow view
 * drawing it at 1280 x 720 at its live frame rate. Each is timed
 * three times, alternately, and the fastest of each kept, so that other
 * work on the machine counts against neither.
 */

const gamma = 1.4;
const deg = Math.PI / 180;

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

const noseLength = 0.5 / Math.tan(10 * deg);
const body: Body = {
  nose: { shape: { kind: 'conical' }, length: noseLength, baseRadius: 0.5 },
  cylinderLength: 10 - noseLength,
};

/** Steps per second over the checks after the first (which includes setting up). */
async function stepsPerSecond(
  view: FlowView | null,
): Promise<{ rate: number; frames: number; seconds: number }> {
  const problem = sharpFitProblem(body, { mach: 2, gamma, nj: 20, refinement: 1 });
  const times: { time: number; steps: number; frames: number }[] = [];
  await gpuFittedFlow(device, problem, {
    maxIterations: 1250,
    stepsPerMove: 1,
    checkEvery: 250,
    speedTolerance: 0,
    onLive: (live) => {
      if (view === null) return;
      if (live === null) {
        view.freeze();
        view.setLive(false);
      } else {
        view.setSource(liveFitSource(live));
        view.setLive(true);
      }
    },
    onProgress: (iterations) => {
      times.push({ time: performance.now(), steps: iterations, frames: view?.framesDrawn ?? 0 });
    },
  });
  const first = times[0]!;
  const last = times[times.length - 1]!;
  const seconds = (last.time - first.time) / 1000;
  return {
    rate: (last.steps - first.steps) / seconds,
    frames: last.frames - first.frames,
    seconds,
  };
}

describe('the flow view drawing live', () => {
  it('costs the solver less than a tenth of its steps', async () => {
    const canvas = document.createElement('canvas');
    canvas.style.width = '1280px';
    canvas.style.height = '720px';
    canvas.style.display = 'block';
    document.body.append(canvas);
    // Every frame drawn in full into a texture of the canvas's size, and
    // shown at once: the GPU work of drawing, without the copy a software
    // adapter needs to show it, which waits for the solver's steps anyway.
    let texture: GPUTexture | null = null;
    const offscreen: Presenter = {
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
    const view = await FlowView.create(device, canvas, { presentation: offscreen });
    const without: number[] = [];
    const drawn: number[] = [];
    let frames = 0;
    let seconds = 0;
    for (let round = 0; round < 3; round++) {
      without.push((await stepsPerSecond(null)).rate);
      const live = await stepsPerSecond(view);
      drawn.push(live.rate);
      frames += live.frames;
      seconds += live.seconds;
    }
    view.destroy();
    canvas.remove();
    const best = Math.max(...without);
    const bestDrawn = Math.max(...drawn);
    // Each drawn run against the run without the view just before it.
    const ratios = drawn.map((d, k) => d / without[k]!).sort((a, b) => a - b);
    const median = ratios[Math.floor(ratios.length / 2)]!;
    console.log(
      `steps per second without the view ${without.map((r) => r.toFixed(0)).join(', ')}; ` +
        `drawn live ${drawn.map((r) => r.toFixed(0)).join(', ')}, ` +
        `${(frames / seconds).toFixed(1)} frames drawn a second; ` +
        `cost, best of each ${((1 - bestDrawn / best) * 100).toFixed(1)}%, ` +
        `median of the pairs ${((1 - median) * 100).toFixed(1)}%`,
    );
    // The view did draw, live, while the solver ran.
    expect(frames).toBeGreaterThan(10);
    // The median of the paired ratios, as the 3D view's test
    // (tests/gpu/render3d-cost.test.ts, which gives the numbers): the
    // fastest run of each lets one lucky run decide on a shared machine.
    expect(median).toBeGreaterThan(0.9);
  }, 3_600_000);
});
