/** Thrown when a solution becomes non-physical, instead of continuing silently. */
export class NonPhysicalStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonPhysicalStateError';
  }
}
