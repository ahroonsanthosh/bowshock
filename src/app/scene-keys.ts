/**
 * The 3D view's keys in the page's one key map (docs/design/0017-
 * rocketeer-interface.md section 6.1): FluidX3D's keys as src/render3d
 * gives them (sceneKey), bound by the page only while the 3D view is
 * shown, so that a number key acts on the view shown and never on both;
 * the same actions in the View menu, for mouse and touch; and the help's
 * words for them. What each key does is render3d's own (sceneKey); which
 * keys the page has, and what the help says of them, is here.
 */

import type { FlowScene3D } from '../render3d/scene';
import type { KeyBinding } from '../ui/keymap';
import type { MenuItem } from '../ui/site';
import { GLOW_BINDING, VIEW_BINDINGS, type ViewAction } from './flow-controls';

export type SceneAction =
  | 'scene-body'
  | 'scene-slice'
  | 'scene-streamlines'
  | 'scene-shells'
  | 'scene-shock'
  | 'scene-cutaway'
  | 'scene-colour'
  | 'scene-slice-turn'
  | 'scene-slice-back'
  | 'scene-slice-on';

interface SceneKey {
  readonly action: SceneAction;
  /** The key render3d's sceneKey takes for it. */
  readonly key: string;
  /** In the View menu. */
  readonly label: string;
  /** In the help. */
  readonly description: string;
  /** For a toggle: whether it is on. */
  readonly pressed?: (scene: FlowScene3D) => boolean;
}

export const SCENE_KEYS: readonly SceneKey[] = [
  {
    action: 'scene-body',
    key: '1',
    label: 'Rocket: solid, wireframe, hidden',
    description: 'The rocket: solid, wireframe or hidden',
  },
  {
    action: 'scene-slice',
    key: '2',
    label: 'Slice',
    description: 'The colour quantity on a slice through the flow',
    pressed: (s) => s.getLayers().slice,
  },
  {
    action: 'scene-streamlines',
    key: '3',
    label: 'Streamlines',
    description: 'Streamlines',
    pressed: (s) => s.getLayers().streamlines,
  },
  {
    action: 'scene-shells',
    key: '4',
    label: 'Shells: glowing, solid, none',
    description: 'Shells of equal colour quantity: glowing, solid or none',
  },
  {
    action: 'scene-shock',
    key: '5',
    label: 'Shock',
    description: 'The bow shock’s surface',
    pressed: (s) => s.getLayers().shock,
  },
  {
    action: 'scene-cutaway',
    key: '6',
    label: 'Cutaway',
    description: 'A quarter of the flow cut away, to see the rocket',
    pressed: (s) => s.getLayers().cutaway,
  },
  {
    action: 'scene-colour',
    key: 'z',
    label: 'Colour: the next quantity',
    description:
      'The colour quantity: Mach number, speed, density, temperature, pressure coefficient',
  },
  {
    action: 'scene-slice-turn',
    key: 't',
    label: 'Slice: the next orientation',
    description: 'The slice: on the cutaway’s faces, through the axis, or across it',
  },
  {
    action: 'scene-slice-back',
    key: 'q',
    label: 'Move the slice back',
    description: 'Move the slice (turn it about the axis, or along it)',
  },
  { action: 'scene-slice-on', key: 'e', label: 'Move the slice on', description: '' },
];

const BY_ACTION = new Map(SCENE_KEYS.map((k) => [k.action, k]));

export function isSceneAction(action: string): action is SceneAction {
  return BY_ACTION.has(action as SceneAction);
}

/** The key render3d's sceneKey takes for this action. */
export function sceneKeyOf(action: SceneAction): string {
  return BY_ACTION.get(action)!.key;
}

/** The 3D view's bindings, acting while `when` holds, listed in the help under `group`. */
export function sceneBindings(when: () => boolean, group: string): KeyBinding<SceneAction>[] {
  return SCENE_KEYS.map((k) => ({
    keys: [k.key],
    action: k.action,
    description: k.description,
    ...(k.action === 'scene-slice-back' ? { label: ['Q', 'E'] } : {}),
    ...(k.action === 'scene-slice-back' || k.action === 'scene-slice-on' ? { repeat: true } : {}),
    when,
    group,
  }));
}

/** The View menu's items for the 3D view, listed while it is shown. */
export function sceneMenu(
  scene: () => FlowScene3D | null,
  act: (action: SceneAction) => void,
): MenuItem[] {
  return SCENE_KEYS.map((k) => ({
    label: k.label,
    key: k.key.toUpperCase(),
    action: () => {
      act(k.action);
    },
    shown: () => scene() !== null,
    ...(k.pressed === undefined
      ? {}
      : {
          pressed: () => {
            const s = scene();
            return s !== null && k.pressed!(s);
          },
        }),
  }));
}

/** Every key the app page acts on. */
export type AppAction = ViewAction | SceneAction | 'pause' | 'compute' | 'flow-view';

/** The side view's own keys; its other keys both views share. */
const SIDE_ACTIONS = new Set<string>([
  'field-1',
  'field-2',
  'field-3',
  'field-4',
  'split',
  'grid',
  'shock',
]);

/** The shared keys' words, for both views. */
const SHARED_WORDS: Partial<Record<string, Partial<KeyBinding<ViewAction>>>> = {
  fit: {
    keys: ['f', '0'],
    description: 'Fit the rocket to the view; in 3D, back to the first view (also a double click)',
  },
  'pan-left': {
    description: 'Pan the side view, or turn the 3D view (with Shift, pan it); also a drag',
  },
};

/**
 * The app's one key map: the page's keys (both views'), then the 3D
 * view's, acting while it is shown, then the side view's, acting while it
 * is; so that no key does two things at once, and the help lists every
 * key under the view it acts on.
 */
export function appBindings(views: {
  readonly is3d: () => boolean;
  readonly isSide: () => boolean;
}): KeyBinding<AppAction>[] {
  return [
    {
      keys: ['v'],
      action: 'flow-view',
      description: 'Switch the airflow between the 3D view and the side view',
    },
    { keys: [' '], action: 'pause', description: 'Pause or resume the airflow solve' },
    { keys: ['r'], action: 'compute', description: 'Compute the curve' },
    ...VIEW_BINDINGS.filter((b) => !SIDE_ACTIONS.has(b.action)).map((b) => ({
      ...b,
      ...SHARED_WORDS[b.action],
    })),
    ...sceneBindings(views.is3d, '3D view'),
    ...[...VIEW_BINDINGS.filter((b) => SIDE_ACTIONS.has(b.action)), GLOW_BINDING].map((b) => ({
      ...b,
      when: views.isSide,
      group: 'Side view',
    })),
  ];
}
