/** Configuration checks shared by the CPU and GPU engines. */

export interface UniformGrid1DConfig {
  readonly nCells: number;
  readonly xMin: number;
  readonly xMax: number;
  readonly cfl: number;
  readonly left: string;
  readonly right: string;
}

/** Throw a RangeError describing the first invalid setting, if any. */
export function validateGrid1DConfig(config: UniformGrid1DConfig): void {
  if (!(Number.isInteger(config.nCells) && config.nCells >= 4)) {
    throw new RangeError('nCells must be an integer of at least 4');
  }
  if (!(config.xMax > config.xMin)) throw new RangeError('xMax must exceed xMin');
  if (!(config.cfl > 0 && config.cfl <= 1)) throw new RangeError('cfl must be in (0, 1]');
  if ((config.left === 'periodic') !== (config.right === 'periodic')) {
    throw new RangeError('periodic boundaries must be used on both sides');
  }
}

export interface Grid2DConfig {
  readonly grid: { readonly ni: number; readonly nj: number };
  readonly cfl: number;
  readonly limiter: string;
  readonly reconstruction: string;
  readonly boundaries: Readonly<
    Record<'iMin' | 'iMax' | 'jMin' | 'jMax', { readonly kind: string }>
  >;
}

/** Throw a RangeError describing the first invalid 2D setting, if any. */
export function validateGrid2DConfig(config: Grid2DConfig): void {
  const { boundaries: b, cfl, grid } = config;
  if (!(cfl > 0 && cfl <= 1)) throw new RangeError('cfl must be in (0, 1]');
  if (grid.ni < 2 || grid.nj < 2) throw new RangeError('the grid needs at least 2 x 2 cells');
  if (config.reconstruction === 'shared' && config.limiter !== 'vanAlbada') {
    // The shared factor is defined from van Albada; any other limiter would
    // be silently ignored.
    throw new RangeError("shared reconstruction requires the 'vanAlbada' limiter");
  }
  for (const [low, high] of [
    ['iMin', 'iMax'],
    ['jMin', 'jMax'],
  ] as const) {
    if ((b[low].kind === 'periodic') !== (b[high].kind === 'periodic')) {
      throw new RangeError(`periodic boundaries must be used on both ${low} and ${high}`);
    }
  }
}
