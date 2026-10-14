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
