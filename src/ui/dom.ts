/**
 * Small helpers for building the interface without a framework: elements
 * with attributes and children (text is always set as text, never parsed
 * as HTML), and the few line icons the interface uses, drawn here.
 */

type Child = Node | string | null | undefined | false;

export interface ElementOptions {
  readonly className?: string;
  readonly text?: string;
  /** Attributes; `false`, null and undefined leave the attribute out. */
  readonly attrs?: Readonly<Record<string, string | number | boolean | null | undefined>>;
}

/** Create an element, with its options and children. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    if (value === false || value === null || value === undefined) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

/** The first element matching `selector`, of the type expected; throws if the page and script disagree. */
export function element<T extends Element>(
  selector: string,
  type: abstract new () => T,
  root: ParentNode = document,
): T {
  const node = root.querySelector(selector);
  if (!(node instanceof type)) throw new Error(`expected ${type.name} at ${selector}`);
  return node;
}

const SVG = 'http://www.w3.org/2000/svg';

/** Paths of the line icons, on a 24 x 24 grid. */
const ICONS = {
  chevron: ['M6 9l6 6 6-6'],
  help: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M9.6 9.2a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.3-2.4 3.8',
    'M12 17.2h.01',
  ],
  expand: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  collapse: ['M4 14h6v6', 'M20 10h-6V4', 'M14 10l7-7', 'M3 21l7-7'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  play: ['M7 5l12 7-12 7z'],
  pause: ['M8 5v14', 'M16 5v14'],
  restart: ['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5'],
  fit: ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5'],
  camera: [
    'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z',
    'M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  ],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
} as const;

export type IconName = keyof typeof ICONS;

/** A line icon, hidden from assistive technology (its control carries the name). */
export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of ICONS[name]) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/** bowshock's mark: a bow shock ahead of a body, in the accent colour. */
export function logo(): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const shock = document.createElementNS(SVG, 'path');
  shock.setAttribute('d', 'M27 4 Q6 8 5 16 Q6 24 27 28');
  shock.setAttribute('fill', 'none');
  shock.setAttribute('stroke', 'var(--accent)');
  shock.setAttribute('stroke-width', '3');
  shock.setAttribute('stroke-linecap', 'round');
  const body = document.createElementNS(SVG, 'path');
  body.setAttribute('d', 'M11 16 L27 11.5 L27 20.5 Z');
  body.setAttribute('fill', 'var(--text)');
  svg.append(shock, body);
  return svg;
}
