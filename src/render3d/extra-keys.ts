/**
 * The 3D view's keys beyond ./controls.ts's sceneKey: 7, what the faces
 * through the axis show (fibres along the flow, the numerical schlieren,
 * or the plain colour), and 8, particles carried by the computed flow. A
 * page with its own key map calls this after sceneKey, for the same keys.
 */

import type { FaceLook, FlowScene3D } from './scene';

const FACES: readonly FaceLook[] = ['fibres', 'schlieren', 'plain'];

/** What a key does to the scene (beyond sceneKey's); true if it did something. */
export function sceneExtraKey(scene: FlowScene3D, key: string): boolean {
  const L = scene.getLayers();
  switch (key) {
    case '7':
      scene.setLayers({ faces: FACES[(FACES.indexOf(L.faces) + 1) % FACES.length]! });
      return true;
    case '8':
      scene.setLayers({ particles: !L.particles });
      return true;
    default:
      return false;
  }
}
