import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gridFromFunction, rectangularGrid } from '../../src/grid/structured';
import { colormapTable } from '../../src/render/colormap';
import { FieldRenderer } from '../../src/render/field-renderer';
import { CopyPresenter } from '../../src/render/presenter';
import { displayField, type DisplayField } from '../../src/render/fields';
import { requireDevice } from './device';

const gamma = 1.4;
const FORMAT = 'rgba8unorm';
let device: GPUDevice;

beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

/** Randomly distorted grid on [0, 2] x [0, 1] (deterministic). */
function distortedGrid(ni: number, nj: number) {
  let state = 7;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32 - 0.5;
  };
  return gridFromFunction(ni, nj, (i, j) => {
    const interior = i > 0 && i < ni && j > 0 && j < nj;
    return [
      (2 * (i + (interior ? 0.5 * random() : 0))) / ni,
      (j + (interior ? 0.5 * random() : 0)) / nj,
    ];
  });
}

/** Upload conserved variables for a primitive field evaluated at cell centres of the index space. */
function stateBuffer(
  ni: number,
  nj: number,
  field: (i: number, j: number) => [number, number, number, number],
) {
  const data = new Float32Array(4 * ni * nj);
  const cpu = {
    rho: new Float64Array(ni * nj),
    mu: new Float64Array(ni * nj),
    mv: new Float64Array(ni * nj),
    energy: new Float64Array(ni * nj),
  };
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const [rho, u, v, p] = field(i, j);
      const c = i + j * ni;
      const conserved = [
        rho,
        rho * u,
        rho * v,
        p / (gamma - 1) + 0.5 * rho * (u * u + v * v),
      ] as const;
      data.set(conserved.map(Math.fround), 4 * c);
      // The CPU reference sees exactly the f32 values the GPU sees.
      cpu.rho[c] = Math.fround(conserved[0]);
      cpu.mu[c] = Math.fround(conserved[1]);
      cpu.mv[c] = Math.fround(conserved[2]);
      cpu.energy[c] = Math.fround(conserved[3]);
    }
  }
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return { buffer, cpu };
}

async function readFloats(buffer: GPUBuffer, size: number): Promise<Float32Array> {
  const readback = device.createBuffer({
    size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(buffer, 0, readback, 0, size);
  device.queue.submit([encoder.finish()]);
  await readback.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(readback.getMappedRange().slice(0));
  readback.destroy();
  return out;
}

describe('display field kernels', () => {
  const ni = 12;
  const nj = 9;
  const grid = distortedGrid(ni, nj);
  // A smooth state with gradients in every variable.
  const smooth = (i: number, j: number): [number, number, number, number] => [
    1 + 0.3 * Math.sin(0.5 * i) * Math.cos(0.4 * j),
    1.5 + 0.2 * Math.cos(0.3 * i),
    0.4 * Math.sin(0.6 * j),
    1 + 0.25 * Math.sin(0.35 * (i + j)),
  ];

  it.each(['schlieren', 'mach', 'pressure', 'density'] as DisplayField[])(
    '%s matches the TypeScript reference',
    async (field) => {
      const renderer = await FieldRenderer.create(device, FORMAT, grid);
      const { buffer, cpu } = stateBuffer(ni, nj, smooth);
      try {
        const encoder = device.createCommandEncoder();
        renderer.computeField(encoder, buffer, { field, gamma, schlierenContrast: 12 });
        device.queue.submit([encoder.finish()]);
        const gpu = await readFloats(renderer.nodeValueBuffer, 4 * (ni + 1) * (nj + 1));
        const reference = displayField(grid, cpu, field, gamma);
        const scale = Math.max(...reference.map(Math.abs));
        reference.forEach((value, n) => {
          expect(Math.abs(gpu[n]! - value) / scale).toBeLessThan(1e-5);
        });
      } finally {
        buffer.destroy();
        renderer.destroy();
      }
    },
  );
});

describe('rendering', () => {
  async function renderPixels(
    field: DisplayField,
    state: (i: number, j: number) => [number, number, number, number],
  ) {
    // A 2 x 1 domain drawn into a 64 x 64 texture: it fills the width and
    // half the height, centred, so the top and bottom quarters show the
    // background.
    const grid = rectangularGrid(8, 4, 0, 2, 0, 1);
    const renderer = await FieldRenderer.create(device, FORMAT, grid);
    const { buffer } = stateBuffer(8, 4, state);
    const target = device.createTexture({
      size: [64, 64],
      format: FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    try {
      renderer.render(
        target,
        buffer,
        { field, gamma, schlierenContrast: 12 },
        { r: 1, g: 0, b: 1, a: 1 },
      );
      const readback = device.createBuffer({
        size: 256 * 64,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      const encoder = device.createCommandEncoder();
      encoder.copyTextureToBuffer(
        { texture: target },
        { buffer: readback, bytesPerRow: 256 },
        [64, 64],
      );
      device.queue.submit([encoder.finish()]);
      await readback.mapAsync(GPUMapMode.READ);
      const pixels = new Uint8Array(readback.getMappedRange().slice(0));
      readback.destroy();
      return (x: number, y: number) => [...pixels.subarray(256 * y + 4 * x, 256 * y + 4 * x + 4)];
    } finally {
      target.destroy();
      buffer.destroy();
      renderer.destroy();
    }
  }

  it('draws a uniform flow as white schlieren, with the background outside the domain', async () => {
    const pixel = await renderPixels('schlieren', () => [1, 2, 0, 1]);
    expect(pixel(32, 32)).toEqual([255, 255, 255, 255]);
    expect(pixel(32, 4)).toEqual([255, 0, 255, 255]);
    expect(pixel(32, 60)).toEqual([255, 0, 255, 255]);
  });

  it('colours a field through the colour map, low values at the start', async () => {
    // Pressure rising with i: the left edge takes the first colour.
    const pixel = await renderPixels('pressure', (i) => [1, 0, 0, 1 + 0.1 * i]);
    const first = colormapTable(256).subarray(0, 3);
    const left = pixel(1, 32);
    for (let k = 0; k < 3; k++)
      expect(Math.abs(left[k]! - 255 * first[k]!)).toBeLessThanOrEqual(12);
    // And values increase to the right, so the colour changes.
    expect(pixel(62, 32)).not.toEqual(left);
  });
});

describe('copy presentation', () => {
  it('shows the rendered frame on a 2D canvas, rows padded correctly', async () => {
    // 77 pixels wide: rows of 308 bytes are padded to 512 in the copy, so a
    // stride error would shear the image.
    const canvas = document.createElement('canvas');
    canvas.width = 77;
    canvas.height = 60;
    const presenter = new CopyPresenter(device, canvas);
    const grid = rectangularGrid(8, 4, 0, 2, 0, 1);
    const renderer = await FieldRenderer.create(device, presenter.format, grid);
    const { buffer } = stateBuffer(8, 4, () => [1, 2, 0, 1]);
    try {
      renderer.render(
        presenter.frameTexture(),
        buffer,
        { field: 'schlieren', gamma, schlierenContrast: 12 },
        { r: 1, g: 0, b: 1, a: 1 },
      );
      await presenter.present();
      const ctx = canvas.getContext('2d')!;
      const pixel = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data];
      // The 2 x 1 domain fills 98% of the width (about 37.7 pixels tall) and
      // is centred vertically: rows 11 to 49.
      for (const y of [20, 30, 40]) {
        expect(pixel(2, y)).toEqual([255, 255, 255, 255]);
        expect(pixel(74, y)).toEqual([255, 255, 255, 255]);
      }
      expect(pixel(38, 3)).toEqual([255, 0, 255, 255]);
      expect(pixel(38, 56)).toEqual([255, 0, 255, 255]);
    } finally {
      buffer.destroy();
      renderer.destroy();
      presenter.destroy();
    }
  });
});
