import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sharpFitProblem } from '../../src/analysis/fitted-flow';
import { gpuFittedFlow } from '../../src/analysis/gpu-fitted-flow';
import { liveFitSource } from '../../src/render/flow-source';
import type { Presenter } from '../../src/render/presenter';
import { basicFinnerRocket } from '../../src/render3d/presets';
import { FlowScene3D } from '../../src/render3d/scene';
import { requireDevice } from './device';

/**
 * What drawing the flow live in 3D costs the solver: the steps per second
 * of the drag page's first grid on the Basic Finner's body at Mach 2, with
 * and without the 3D view drawing it at 1280 x 720, every layer of its
 * default on, at its live rate (at most LIVE_DUTY of the time drawing; in
 * draft on a slow adapter). Each is timed three times, alternately, and
 * the fastest of each kept, so that other work on the machine counts
 * against neither. As the 2D view's (tests/gpu/flow-view-cost.test.ts).
 *
 * Measured when written, on SwiftShader on a loaded 4-core machine: 26.9
 * to 34.4 steps a second without the view, 25.9 to 32.5 with it, a cost
 * of 5.6% (best of each, and the median of the five pairs), 6 frames
 * drawn in 168 s (drafts: a full frame there costs seconds).
 *
 * That it drew live is checked as at least one frame in the measured
 * windows. The count itself is not a property of the view: each live
 * frame waits for the solver's batch of steps (checkEvery 250), then for
 * its own pacing (cost x (1 - duty) / duty), and the windows run from the
 * first progress report to the last, so the count follows the machine's
 * speed. It was asked to exceed 3, which held when written (6 in 168 s)
 * but not on CI's runner: 2 in 145 s at 5759a65 and 3 in 405 s at
 * b7742b5, both with the cost itself well inside (median of the pairs
 * 6.2% and 2.8%); locally on 2026-10-23, 5 in 122 s.
 */

const LIVE_DUTY = 0.06;
/** Rounds of the two, alternately: the machine's other work varies the rates from run to run. */
const ROUNDS = 5;

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

const rocket = basicFinnerRocket();

async function stepsPerSecond(
  scene: FlowScene3D | null,
): Promise<{ rate: number; frames: number; seconds: number }> {
  const problem = sharpFitProblem(rocket.body, { mach: 2, gamma: 1.4, nj: 20, refinement: 1 });
  const times: { time: number; steps: number; frames: number }[] = [];
  await gpuFittedFlow(device, problem, {
    maxIterations: 1250,
    stepsPerMove: 1,
    checkEvery: 250,
    speedTolerance: 0,
    onLive: (live) => {
      if (scene === null) return;
      if (live === null) {
        scene.freeze();
      } else {
        scene.setFlow(liveFitSource(live));
        scene.setLive(true);
      }
    },
    onProgress: (iterations) => {
      times.push({ time: performance.now(), steps: iterations, frames: scene?.framesDrawn ?? 0 });
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

describe('the 3D view drawing live', () => {
  it('costs the solver less than a tenth of its steps', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    let texture: GPUTexture | null = null;
    const offscreen: Presenter = {
      format: 'rgba8unorm',
      frameTexture: () => {
        texture ??= device.createTexture({
          size: [canvas.width, canvas.height],
          format: 'rgba8unorm',
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        return texture;
      },
      present: () => Promise.resolve(),
      destroy: () => {
        texture?.destroy();
      },
    };
    const scene = await FlowScene3D.create(device, canvas, {
      presentation: offscreen,
      pixelRatio: 1,
      liveDuty: LIVE_DUTY,
    });
    scene.setRocket(rocket);
    const without: number[] = [];
    const drawn: number[] = [];
    let frames = 0;
    let seconds = 0;
    for (let round = 0; round < ROUNDS; round++) {
      without.push((await stepsPerSecond(null)).rate);
      const live = await stepsPerSecond(scene);
      drawn.push(live.rate);
      frames += live.frames;
      seconds += live.seconds;
    }
    scene.destroy();
    const best = Math.max(...without);
    const bestDrawn = Math.max(...drawn);
    // Each drawn run against the run without the view just before it.
    const ratios = drawn.map((d, k) => d / without[k]!).sort((a, b) => a - b);
    const median = ratios[Math.floor(ratios.length / 2)]!;
    console.log(
      `3D view: steps per second without it ${without.map((r) => r.toFixed(1)).join(', ')}; ` +
        `drawn live ${drawn.map((r) => r.toFixed(1)).join(', ')}, ` +
        `${(frames / seconds).toFixed(2)} frames drawn a second (${frames} in ${seconds.toFixed(0)} s); ` +
        `cost, best of each ${((1 - bestDrawn / best) * 100).toFixed(1)}%, ` +
        `median of the pairs ${((1 - median) * 100).toFixed(1)}%`,
    );
    // The view did draw, live, while the solver ran.
    expect(frames).toBeGreaterThan(0);
    expect(bestDrawn / best).toBeGreaterThan(0.9);
  }, 3_600_000);
});
