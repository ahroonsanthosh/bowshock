/**
 * WebGPU capability detection.
 *
 * bowshock runs its solver on WebGPU when available and falls back to the
 * CPU reference engine otherwise. This module answers one question: can we
 * get a usable GPU device, and if not, why not? The reason is shown to the
 * user so that a missing GPU is never a silent failure.
 */

/** Adapter limits that matter for sizing solver grids. */
export const RELEVANT_LIMITS = [
  'maxBufferSize',
  'maxStorageBufferBindingSize',
  'maxStorageBuffersPerShaderStage',
  'maxComputeWorkgroupStorageSize',
  'maxComputeInvocationsPerWorkgroup',
  'maxComputeWorkgroupSizeX',
  'maxComputeWorkgroupsPerDimension',
] as const;

export type RelevantLimit = (typeof RELEVANT_LIMITS)[number];

export interface GpuAvailable {
  readonly kind: 'webgpu';
  readonly adapterDescription: string;
  readonly limits: Readonly<Record<RelevantLimit, number>>;
  readonly features: readonly string[];
}

export interface GpuUnavailable {
  readonly kind: 'unavailable';
  /** Plain-language explanation suitable for showing to the user. */
  readonly reason: string;
}

export type GpuSupport = GpuAvailable | GpuUnavailable;

/** The subset of `navigator.gpu` this module needs, so tests can supply a fake. */
export interface GpuEntryPoint {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

/**
 * Detect WebGPU support.
 *
 * @param gpu `navigator.gpu`, or `undefined` when the browser has no WebGPU.
 */
export async function detectGpu(gpu: GpuEntryPoint | undefined): Promise<GpuSupport> {
  if (gpu === undefined) {
    return {
      kind: 'unavailable',
      reason:
        'This browser does not provide WebGPU. bowshock will use the slower CPU engine at reduced resolution.',
    };
  }

  let adapter: GPUAdapter | null;
  try {
    adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
  } catch (error) {
    return { kind: 'unavailable', reason: `Requesting a GPU adapter failed: ${String(error)}` };
  }
  if (adapter === null) {
    return {
      kind: 'unavailable',
      reason:
        'WebGPU is present but no suitable GPU adapter was found (it may be disabled or blocklisted).',
    };
  }

  const limits = {} as Record<RelevantLimit, number>;
  for (const name of RELEVANT_LIMITS) {
    limits[name] = adapter.limits[name];
  }

  return {
    kind: 'webgpu',
    adapterDescription: describeAdapter(adapter.info),
    limits,
    features: [...adapter.features].sort(),
  };
}

function describeAdapter(info: GPUAdapterInfo): string {
  const parts = [info.vendor, info.architecture, info.description].filter((s) => s.length > 0);
  return parts.length > 0 ? parts.join(' / ') : 'unknown adapter';
}
