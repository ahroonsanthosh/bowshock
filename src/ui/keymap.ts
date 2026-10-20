/**
 * The keyboard: which key does what on a page (docs/design/0012-interface.md
 * section 4). Keys are ignored while a text field has focus, and a key a
 * focused control uses itself (Space on a button, arrows on a slider or a
 * select) is left to that control, so the keyboard never fights the form.
 * Other keys on a select are the page's: a digit would otherwise pick the
 * option it starts with and change the case. Keys with Ctrl, Alt or Meta
 * are the browser's.
 *
 * The decisions are pure functions of plain values, tested without a
 * browser; KeyMap attaches them to a page.
 */

/** What the decisions need of a key event. */
export interface KeyInput {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly repeat: boolean;
}

/** What the decisions need of the focused element. */
export interface FocusTarget {
  readonly tagName?: string;
  /** An input's type attribute. */
  readonly type?: string;
  readonly isContentEditable?: boolean;
}

export interface KeyBinding<A extends string = string> {
  /** Values of KeyboardEvent.key ('1', 'g', '+', 'ArrowLeft', ' ', '?'); letters match either case. */
  readonly keys: readonly string[];
  readonly action: A;
  /** What the key does, for the help overlay. */
  readonly description: string;
  /** The keys as the help overlay names them; by default from `keys`. */
  readonly label?: readonly string[];
  /** Act on the repeats of a held key (panning, zooming); otherwise only on the first press. */
  readonly repeat?: boolean;
}

/** Input types that take typed text. */
const TEXT_INPUT_TYPES = new Set([
  '',
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

/** Whether the focused element takes typed text: every key belongs to it. */
export function isTextEntry(target: FocusTarget | null): boolean {
  if (target === null) return false;
  if (target.isContentEditable === true) return true;
  const tag = (target.tagName ?? '').toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') return TEXT_INPUT_TYPES.has((target.type ?? '').toLowerCase());
  return false;
}

const ARROWS_AND_PAGING = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

/** Whether the focused control uses this key itself (it then keeps it). */
export function usedByControl(target: FocusTarget | null, key: string): boolean {
  if (target === null) return false;
  if (isTextEntry(target)) return true;
  const tag = (target.tagName ?? '').toUpperCase();
  const type = (target.type ?? '').toLowerCase();
  const activates = key === ' ' || key === 'Enter';
  if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return activates;
  // A select keeps the keys that move through and open its list, and Esc that closes it.
  if (tag === 'SELECT') return ARROWS_AND_PAGING.has(key) || activates || key === 'Escape';
  if (tag === 'INPUT') {
    if (type === 'range' || type === 'radio') return ARROWS_AND_PAGING.has(key) || activates;
    if (type === 'checkbox' || type === 'button' || type === 'submit' || type === 'reset') {
      return activates;
    }
  }
  return false;
}

/** The key as bindings name it: letters in lower case. */
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

/**
 * The binding a key press triggers, or null: none with Ctrl, Alt or Meta,
 * none for keys the focused control uses, none for repeats unless the
 * binding asks for them.
 */
export function resolveKey<A extends string>(
  bindings: readonly KeyBinding<A>[],
  input: KeyInput,
  target: FocusTarget | null,
): KeyBinding<A> | null {
  if (input.ctrlKey || input.metaKey || input.altKey) return null;
  if (usedByControl(target, input.key)) return null;
  const key = normalizeKey(input.key);
  const binding = bindings.find((b) => b.keys.some((k) => normalizeKey(k) === key));
  if (binding === undefined) return null;
  if (input.repeat && binding.repeat !== true) return null;
  return binding;
}

/** How the help overlay writes a key. */
export function keyLabel(key: string): string {
  switch (key) {
    case ' ':
      return 'Space';
    case 'Escape':
      return 'Esc';
    case 'ArrowLeft':
      return '←';
    case 'ArrowRight':
      return '→';
    case 'ArrowUp':
      return '↑';
    case 'ArrowDown':
      return '↓';
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

/** The labels of a binding's keys for the help overlay. */
export function bindingLabels(binding: KeyBinding): readonly string[] {
  return binding.label ?? binding.keys.map(keyLabel);
}

/**
 * A page's key bindings, attached to the window: each key press that
 * resolves to a binding calls `handler` with its action, and its default
 * (scrolling, for Space and the arrows) is prevented.
 */
export class KeyMap<A extends string = string> {
  private listener: ((event: KeyboardEvent) => void) | null = null;

  constructor(
    readonly bindings: readonly KeyBinding<A>[],
    private readonly handler: (action: A, event: KeyboardEvent) => void,
    /** While true (an overlay is open), no binding acts. */
    private readonly suspended: () => boolean = () => false,
  ) {}

  attach(target: Window = window): void {
    this.detach();
    this.listener = (event) => {
      if (event.defaultPrevented || this.suspended()) return;
      const focused = event.target instanceof Element ? focusTarget(event.target) : null;
      const binding = resolveKey(this.bindings, event, focused);
      if (binding === null) return;
      event.preventDefault();
      this.handler(binding.action, event);
    };
    target.addEventListener('keydown', this.listener);
  }

  detach(target: Window = window): void {
    if (this.listener !== null) target.removeEventListener('keydown', this.listener);
    this.listener = null;
  }
}

function focusTarget(node: Element): FocusTarget {
  return {
    tagName: node.tagName,
    type: node instanceof HTMLInputElement ? node.type : '',
    isContentEditable: node instanceof HTMLElement && node.isContentEditable,
  };
}
