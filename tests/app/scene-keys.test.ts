/**
 * The app's one key map (src/app/scene-keys.ts;
 * docs/design/0017-rocketeer-interface.md section 6.1): with either view
 * shown, every key does one thing; each 3D key is one render3d's own
 * sceneKey acts on; the help lists each view's keys under its name.
 */

import { describe, expect, it } from 'vitest';
import { sceneKey } from '../../src/render3d/controls';
import { DEFAULT_LAYERS, type FlowScene3D, type SceneLayers } from '../../src/render3d/scene';
import { appBindings, SCENE_KEYS, sceneMenu } from '../../src/app/scene-keys';
import { HELP_BINDING } from '../../src/ui/help';
import { normalizeKey, resolveKey, type KeyBinding } from '../../src/ui/keymap';

const press = (key: string) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  repeat: false,
});

/** The bindings acting now, keyed by key: a key acting twice is a clash. */
function activeKeys(bindings: readonly KeyBinding[]): Map<string, string[]> {
  const keys = new Map<string, string[]>();
  for (const b of bindings.filter((x) => x.when?.() !== false)) {
    for (const k of b.keys) {
      const key = normalizeKey(k);
      keys.set(key, [...(keys.get(key) ?? []), b.action]);
    }
  }
  return keys;
}

/** A stand-in scene: records what render3d's sceneKey asks of it. */
function standInScene(): { scene: FlowScene3D; calls: string[] } {
  const calls: string[] = [];
  let layers: SceneLayers = DEFAULT_LAYERS;
  const scene = {
    getLayers: () => layers,
    setLayers: (l: Partial<SceneLayers>) => {
      layers = { ...layers, ...l };
      calls.push(`layers ${Object.keys(l).join(',')}`);
    },
    cycleQuantity: () => calls.push('quantity'),
    cycleSlice: () => calls.push('slice orientation'),
    moveSlice: (n: number) => calls.push(`move slice ${n}`),
    resetView: () => calls.push('reset'),
    zoomBy: () => calls.push('zoom'),
    orbitBy: () => calls.push('orbit'),
    panPixels: () => calls.push('pan'),
  } as unknown as FlowScene3D;
  return { scene, calls };
}

describe("the app's key map", () => {
  for (const shown of ['3d', 'side'] as const) {
    it(`gives every key one action with the ${shown === '3d' ? '3D' : 'side'} view shown`, () => {
      const bindings = [
        ...appBindings({ is3d: () => shown === '3d', isSide: () => shown === 'side' }),
        HELP_BINDING,
      ];
      for (const [key, actions] of activeKeys(bindings)) {
        expect(actions, `key ${key}`).toHaveLength(1);
      }
      // The number keys act on the view shown.
      const one = resolveKey(bindings, press('1'), null)?.action;
      expect(one).toBe(shown === '3d' ? 'scene-body' : 'field-1');
      const five = resolveKey(bindings, press('5'), null)?.action;
      expect(five).toBe(shown === '3d' ? 'scene-shock' : 'glow');
      // Z, T, Q and E are the 3D view's only; D, G and S the side view's.
      expect(resolveKey(bindings, press('z'), null)?.action ?? null).toBe(
        shown === '3d' ? 'scene-colour' : null,
      );
      expect(resolveKey(bindings, press('g'), null)?.action ?? null).toBe(
        shown === 'side' ? 'grid' : null,
      );
      // The page's keys act in both.
      for (const key of ['v', ' ', 'r', 'f', '0', 'k', 'h', '+', 'ArrowLeft']) {
        expect(resolveKey(bindings, press(key), null), key).not.toBeNull();
      }
    });
  }

  it("binds each 3D key to an action render3d's sceneKey takes", () => {
    for (const k of SCENE_KEYS) {
      const { scene, calls } = standInScene();
      expect(sceneKey(scene, k.key), k.key).toBe(true);
      expect(calls.length, k.key).toBeGreaterThan(0);
    }
  });

  it('lists each view’s keys in the help under its name, every key described', () => {
    const bindings = appBindings({ is3d: () => true, isSide: () => false });
    const groups = [...new Set(bindings.map((b) => b.group ?? ''))];
    expect(groups).toEqual(['', '3D view', 'Side view']);
    const listed = bindings.filter((b) => b.description !== '').length;
    expect(listed).toBeGreaterThan(20);
  });

  it('has a View menu item for every 3D key, listed only while the 3D view is shown', () => {
    const { scene } = standInScene();
    let shown: FlowScene3D | null = scene;
    const items = sceneMenu(
      () => shown,
      () => {},
    );
    expect(items.map((i) => i.key)).toEqual(SCENE_KEYS.map((k) => k.key.toUpperCase()));
    expect(items.every((i) => i.shown?.() === true)).toBe(true);
    shown = null;
    expect(items.every((i) => i.shown?.() === false)).toBe(true);
  });
});
