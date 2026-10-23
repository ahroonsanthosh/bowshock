/**
 * A small, strict XML reader for OpenRocket files: elements, attributes,
 * character data (with the five predefined entities and character
 * references), CDATA sections, comments and processing instructions. The
 * same code runs in the browser and in Node (where the tests run), so the
 * tests exercise exactly what the page ships; browsers' DOMParser is not
 * used because Node has none.
 *
 * A document type declaration is refused: OpenRocket never writes one,
 * and refusing it rules out entity expansion (the "billion laughs"
 * attack) without having to defend against it. Nesting is limited, and
 * so is the number of elements (kept, and in all), so that a file of
 * millions of tiny elements cannot exhaust the memory; and
 * the subtrees of elements named in `skip` (OpenRocket's simulation
 * results, which can run to megabytes) are checked for well-formedness
 * but not kept.
 *
 * docs/design/0018-openrocket-import.md section 2.
 */

export interface XmlElement {
  readonly name: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly children: readonly XmlElement[];
  /** The character data directly inside the element (text and CDATA), references decoded. */
  readonly text: string;
}

/** A document that is not well-formed XML, or that this reader refuses. */
export class XmlError extends Error {
  constructor(
    message: string,
    /** Character offset in the source where the problem was found. */
    readonly offset: number,
  ) {
    super(message);
    this.name = 'XmlError';
  }
}

export interface XmlOptions {
  /** Elements whose content is checked but not kept (their children and text come back empty). */
  readonly skip?: ReadonlySet<string>;
  /** Deepest nesting accepted (default 256). */
  readonly maxDepth?: number;
  /** Most elements kept (outside `skip`'s subtrees) (default MAX_KEPT_ELEMENTS). */
  readonly maxElements?: number;
  /** Most elements in all, kept or not (default MAX_ALL_ELEMENTS). */
  readonly maxAllElements?: number;
}

/**
 * The elements a document may keep: an OpenRocket design has hundreds to
 * a few thousand outside its simulations (the largest example file, 3,623
 * in all with its simulations).
 */
export const MAX_KEPT_ELEMENTS = 100_000;
/** The elements a document may have in all, its simulations' included (each read, then dropped). */
export const MAX_ALL_ELEMENTS = 2_000_000;

interface Frame {
  readonly name: string;
  readonly attributes: Map<string, string>;
  readonly children: XmlElement[];
  readonly text: string[];
  readonly skipping: boolean;
}

const PREDEFINED: Readonly<Record<string, string>> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};

function isNameStart(c: number): boolean {
  return (
    (c >= 0x41 && c <= 0x5a) || // A-Z
    (c >= 0x61 && c <= 0x7a) || // a-z
    c === 0x5f || // _
    c === 0x3a || // :
    c >= 0x80
  );
}

function isNameChar(c: number): boolean {
  return isNameStart(c) || (c >= 0x30 && c <= 0x39) || c === 0x2d || c === 0x2e;
}

function isSpace(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}

/** A code point XML 1.0 allows as a character. */
function isXmlChar(c: number): boolean {
  return (
    c === 0x09 ||
    c === 0x0a ||
    c === 0x0d ||
    (c >= 0x20 && c <= 0xd7ff) ||
    (c >= 0xe000 && c <= 0xfffd) ||
    (c >= 0x10000 && c <= 0x10ffff)
  );
}

/** Parse a whole document and return its root element. Throws XmlError. */
export function parseXml(text: string, options: XmlOptions = {}): XmlElement {
  // End-of-line handling (XML 1.0 section 2.11): CR LF and a lone CR read as LF.
  const source = text.includes('\r') ? text.replace(/\r\n?/g, '\n') : text;
  const skip = options.skip ?? new Set<string>();
  const maxDepth = options.maxDepth ?? 256;
  const maxKept = options.maxElements ?? MAX_KEPT_ELEMENTS;
  const maxAll = options.maxAllElements ?? MAX_ALL_ELEMENTS;
  let kept = 0;
  let all = 0;
  const n = source.length;
  let i = 0;

  // Typed explicitly so that the compiler knows a call to it does not return.
  const fail: (message: string, at?: number) => never = (message, at = i) => {
    throw new XmlError(`${message} (at character ${at})`, at);
  };

  /** Decode references in a run of character data or an attribute value. */
  const decode = (raw: string, start: number): string => {
    if (!raw.includes('&')) return raw;
    let out = '';
    let k = 0;
    for (;;) {
      const amp = raw.indexOf('&', k);
      if (amp < 0) return out + raw.slice(k);
      out += raw.slice(k, amp);
      const semi = raw.indexOf(';', amp);
      if (semi < 0 || semi - amp > 12) fail('an "&" that does not start a reference', start + amp);
      const ref = raw.slice(amp + 1, semi);
      if (ref.startsWith('#')) {
        const hex = ref.startsWith('#x');
        const digits = ref.slice(hex ? 2 : 1);
        const valid = hex ? /^[0-9a-fA-F]+$/.test(digits) : /^[0-9]+$/.test(digits);
        const code = valid ? parseInt(digits, hex ? 16 : 10) : NaN;
        if (!isXmlChar(code)) fail(`"&${ref};" is not a character XML allows`, start + amp);
        out += String.fromCodePoint(code);
      } else {
        const ch = PREDEFINED[ref];
        if (ch === undefined) fail(`an unknown entity "&${ref};"`, start + amp);
        out += ch;
      }
      k = semi + 1;
    }
  };

  const readName = (): string => {
    const start = i;
    if (i >= n || !isNameStart(source.charCodeAt(i))) fail('a name was expected');
    i++;
    while (i < n && isNameChar(source.charCodeAt(i))) i++;
    return source.slice(start, i);
  };

  const skipSpace = () => {
    while (i < n && isSpace(source.charCodeAt(i))) i++;
  };

  /** Skip a comment or processing instruction starting at i; false if neither starts there. */
  const skipMisc = (): boolean => {
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      if (end < 0) fail('a comment that is never closed');
      i = end + 3;
      return true;
    }
    if (source.startsWith('<?', i)) {
      const end = source.indexOf('?>', i + 2);
      if (end < 0) fail('a processing instruction that is never closed');
      i = end + 2;
      return true;
    }
    return false;
  };

  // Prolog: an optional byte-order mark, then the XML declaration (a
  // processing instruction like any other here), comments and space.
  if (source.charCodeAt(0) === 0xfeff) i = 1;
  for (;;) {
    skipSpace();
    if (source.startsWith('<!DOCTYPE', i)) {
      fail('a document type declaration, which OpenRocket files never contain, is not accepted');
    }
    if (!skipMisc()) break;
  }
  if (i >= n) fail('the document has no root element');
  if (source.charCodeAt(i) !== 0x3c) fail('the document does not start with an element');

  const stack: Frame[] = [];
  let root: XmlElement | undefined;

  const openTag = () => {
    // At '<' followed by a name.
    i++;
    const name = readName();
    const attributes = new Map<string, string>();
    for (;;) {
      const before = i;
      skipSpace();
      if (i >= n) fail(`the start tag of <${name}> is never closed`);
      const c = source.charCodeAt(i);
      if (c === 0x3e /* > */ || (c === 0x2f /* / */ && source.charCodeAt(i + 1) === 0x3e)) break;
      if (i === before) fail(`space was expected between the attributes of <${name}>`);
      const attr = readName();
      skipSpace();
      if (source.charCodeAt(i) !== 0x3d /* = */) fail(`the attribute "${attr}" has no value`);
      i++;
      skipSpace();
      const quote = source.charCodeAt(i);
      if (quote !== 0x22 && quote !== 0x27) fail(`the value of "${attr}" is not quoted`);
      const end = source.indexOf(quote === 0x22 ? '"' : "'", i + 1);
      if (end < 0) fail(`the value of "${attr}" is never closed`);
      const raw = source.slice(i + 1, end);
      if (raw.includes('<')) fail(`the value of "${attr}" contains "<"`, i + 1);
      if (attributes.has(attr)) fail(`the attribute "${attr}" is repeated on <${name}>`);
      // Attribute-value normalization: each white-space character is a space.
      attributes.set(attr, decode(raw, i + 1).replace(/[\t\n\r]/g, ' '));
      i = end + 1;
    }
    const empty = source.charCodeAt(i) === 0x2f;
    i += empty ? 2 : 1;
    const parent = stack[stack.length - 1];
    const skipping = (parent?.skipping ?? false) || skip.has(name);
    if (++all > maxAll) fail(`more than ${maxAll} elements`);
    if (!skipping && ++kept > maxKept)
      fail(`more than ${maxKept} elements outside the simulations`);
    const frame: Frame = { name, attributes, children: [], text: [], skipping };
    if (empty) {
      closeFrame(frame, parent);
    } else {
      if (stack.length >= maxDepth) fail(`elements nested deeper than ${maxDepth}`);
      stack.push(frame);
    }
  };

  const closeFrame = (frame: Frame, parent: Frame | undefined) => {
    const element: XmlElement = {
      name: frame.name,
      attributes: frame.attributes,
      children: frame.children,
      text: frame.text.join(''),
    };
    if (parent === undefined) {
      root = element;
    } else if (!parent.skipping) {
      parent.children.push(element);
    }
  };

  // The root element and everything inside it.
  do {
    if (i >= n) fail(`<${stack[stack.length - 1]!.name}> is never closed`);
    const top = stack[stack.length - 1];
    const lt = source.indexOf('<', i);
    if (top === undefined) {
      // Only the root's start tag is expected here.
      openTag();
      continue;
    }
    if (lt < 0) fail(`<${top.name}> is never closed`, n);
    if (lt > i) {
      if (!top.skipping) top.text.push(decode(source.slice(i, lt), i));
      else decode(source.slice(i, lt), i);
      i = lt;
    }
    if (source.startsWith('</', i)) {
      i += 2;
      const name = readName();
      skipSpace();
      if (source.charCodeAt(i) !== 0x3e) fail(`the end tag </${name}> is not closed by ">"`);
      i++;
      if (name !== top.name) fail(`</${name}> closes <${top.name}>`);
      stack.pop();
      closeFrame(top, stack[stack.length - 1]);
    } else if (source.startsWith('<![CDATA[', i)) {
      const end = source.indexOf(']]>', i + 9);
      if (end < 0) fail('a CDATA section that is never closed');
      if (!top.skipping) top.text.push(source.slice(i + 9, end));
      i = end + 3;
    } else if (source.startsWith('<!', i) && !source.startsWith('<!--', i)) {
      fail('a declaration inside an element');
    } else if (!skipMisc()) {
      openTag();
    }
  } while (stack.length > 0);

  // After the root: only comments, processing instructions and space.
  for (;;) {
    skipSpace();
    if (i >= n) break;
    if (!skipMisc()) fail('content after the root element');
  }
  return root!;
}

/** The first child element of that name, or undefined. */
export function child(element: XmlElement, name: string): XmlElement | undefined {
  return element.children.find((c) => c.name === name);
}
