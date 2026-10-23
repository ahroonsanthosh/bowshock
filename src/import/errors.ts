/**
 * Why a file could not be read as an OpenRocket design, in plain words.
 * Every failure of the reader is one of these, never a crash.
 */

export type OrkReadErrorKind =
  /** Empty, or neither a ZIP archive, a gzip file nor XML, or XML of another program. */
  | 'not-openrocket'
  /** A ZIP archive or gzip file that is damaged or truncated. */
  | 'corrupt'
  /** It would inflate to more than the limit (a guard against zip bombs). */
  | 'too-large'
  /** A valid file this reader does not take (encryption, ZIP64, an unknown compression). */
  | 'unsupported'
  /** The OpenRocket XML inside is not well-formed. */
  | 'malformed-xml';

export class OrkReadError extends Error {
  constructor(
    readonly kind: OrkReadErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'OrkReadError';
  }
}
