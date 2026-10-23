import { describe, expect, it } from 'vitest';
import {
  bindingLabels,
  isTextEntry,
  keyLabel,
  resolveKey,
  usedByControl,
  type FocusTarget,
  type KeyBinding,
  type KeyInput,
} from '../../src/ui/keymap';

const BINDINGS: readonly KeyBinding[] = [
  { keys: ['1'], action: 'schlieren', description: 'Schlieren' },
  { keys: ['g'], action: 'grid', description: 'Grid lines' },
  { keys: [' '], action: 'pause', description: 'Pause' },
  { keys: ['+', '='], action: 'zoom-in', description: 'Zoom in', repeat: true },
  { keys: ['ArrowLeft'], action: 'pan-left', description: 'Pan', repeat: true },
  { keys: ['h', '?'], action: 'help', description: 'Help' },
];

function press(key: string, extra: Partial<KeyInput> = {}): KeyInput {
  return { key, ctrlKey: false, metaKey: false, altKey: false, repeat: false, ...extra };
}

const BODY: FocusTarget = { tagName: 'BODY' };
const CANVAS: FocusTarget = { tagName: 'CANVAS' };

describe('the key map', () => {
  it('maps a key to its action, letters in either case', () => {
    expect(resolveKey(BINDINGS, press('1'), BODY)?.action).toBe('schlieren');
    expect(resolveKey(BINDINGS, press('g'), BODY)?.action).toBe('grid');
    expect(resolveKey(BINDINGS, press('G'), BODY)?.action).toBe('grid');
    expect(resolveKey(BINDINGS, press('?'), CANVAS)?.action).toBe('help');
    expect(resolveKey(BINDINGS, press('='), BODY)?.action).toBe('zoom-in');
    expect(resolveKey(BINDINGS, press('x'), BODY)).toBeNull();
    expect(resolveKey(BINDINGS, press('g'), null)?.action).toBe('grid');
  });

  it('leaves keys with Ctrl, Alt or Meta to the browser', () => {
    expect(resolveKey(BINDINGS, press('1', { ctrlKey: true }), BODY)).toBeNull();
    expect(resolveKey(BINDINGS, press('g', { metaKey: true }), BODY)).toBeNull();
    expect(resolveKey(BINDINGS, press('h', { altKey: true }), BODY)).toBeNull();
  });

  it('ignores every key while a text field has focus', () => {
    const textFields: FocusTarget[] = [
      { tagName: 'INPUT', type: 'text' },
      { tagName: 'INPUT', type: 'number' },
      { tagName: 'INPUT', type: '' },
      { tagName: 'input', type: 'SEARCH' },
      { tagName: 'TEXTAREA' },
      { tagName: 'DIV', isContentEditable: true },
    ];
    for (const target of textFields) {
      expect(isTextEntry(target)).toBe(true);
      for (const key of ['1', 'g', ' ', '?', '+', 'ArrowLeft']) {
        expect(resolveKey(BINDINGS, press(key), target)).toBeNull();
      }
    }
    expect(isTextEntry(BODY)).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });

  it('leaves to a focused control the keys it uses, and takes the others', () => {
    const button: FocusTarget = { tagName: 'BUTTON' };
    expect(usedByControl(button, ' ')).toBe(true);
    expect(resolveKey(BINDINGS, press(' '), button)).toBeNull();
    expect(resolveKey(BINDINGS, press('g'), button)?.action).toBe('grid');
    expect(resolveKey(BINDINGS, press('ArrowLeft'), button)?.action).toBe('pan-left');

    const slider: FocusTarget = { tagName: 'INPUT', type: 'range' };
    expect(isTextEntry(slider)).toBe(false);
    expect(resolveKey(BINDINGS, press('ArrowLeft'), slider)).toBeNull();
    expect(resolveKey(BINDINGS, press('1'), slider)?.action).toBe('schlieren');

    const checkbox: FocusTarget = { tagName: 'INPUT', type: 'checkbox' };
    expect(resolveKey(BINDINGS, press(' '), checkbox)).toBeNull();
    expect(resolveKey(BINDINGS, press('ArrowLeft'), checkbox)?.action).toBe('pan-left');

    // A select keeps what moves through and opens its list; a digit is the
    // page's, or it would pick an option and change the case.
    const select: FocusTarget = { tagName: 'SELECT' };
    expect(isTextEntry(select)).toBe(false);
    for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageDown', ' ', 'Enter', 'Escape']) {
      expect(usedByControl(select, key)).toBe(true);
    }
    expect(resolveKey(BINDINGS, press('ArrowLeft'), select)).toBeNull();
    expect(resolveKey(BINDINGS, press(' '), select)).toBeNull();
    expect(resolveKey(BINDINGS, press('1'), select)?.action).toBe('schlieren');
    expect(resolveKey(BINDINGS, press('g'), select)?.action).toBe('grid');
    expect(resolveKey(BINDINGS, press('?'), select)?.action).toBe('help');

    const link: FocusTarget = { tagName: 'A' };
    expect(resolveKey(BINDINGS, press('Enter'), link)).toBeNull();
    expect(resolveKey(BINDINGS, press('h'), link)?.action).toBe('help');
  });

  it('acts on the repeats of a held key only where the binding asks for them', () => {
    expect(resolveKey(BINDINGS, press('ArrowLeft', { repeat: true }), BODY)?.action).toBe(
      'pan-left',
    );
    expect(resolveKey(BINDINGS, press('+', { repeat: true }), BODY)?.action).toBe('zoom-in');
    expect(resolveKey(BINDINGS, press('g', { repeat: true }), BODY)).toBeNull();
  });

  it('gives a key to the binding that acts now, of two views', () => {
    let shown: 'a' | 'b' = 'a';
    const twoViews: KeyBinding[] = [
      { keys: ['1'], action: 'a-one', description: 'A', when: () => shown === 'a' },
      { keys: ['1'], action: 'b-one', description: 'B', when: () => shown === 'b' },
    ];
    const one = press('1');
    expect(resolveKey(twoViews, one, null)?.action).toBe('a-one');
    shown = 'b';
    expect(resolveKey(twoViews, one, null)?.action).toBe('b-one');
  });

  it('names keys for the help overlay', () => {
    expect(keyLabel(' ')).toBe('Space');
    expect(keyLabel('Escape')).toBe('Esc');
    expect(keyLabel('g')).toBe('G');
    expect(keyLabel('ArrowLeft')).toBe('←');
    expect(bindingLabels(BINDINGS[5]!)).toEqual(['H', '?']);
    expect(bindingLabels({ keys: ['1'], action: 'a', description: '', label: ['1 to 4'] })).toEqual(
      ['1 to 4'],
    );
  });
});
