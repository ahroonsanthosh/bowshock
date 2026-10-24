/**
 * Mouse, touch and keyboard for the 3D view, after FluidX3D's (as its
 * README describes them): number keys switch layers that combine (4
 * cycles the iso-surfaces: glowing, lit solid, none), Z cycles the colour
 * quantity, T the slice and Q / E move it, H shows the help; a drag (or
 * one finger) turns the view any way, as a trackball (over the top and
 * underneath, no limit), the wheel zooms. Also: right drag or shift drag
 * pans, two fingers pinch and pan, the arrow keys turn it the same way
 * (with shift, pan), + and - zoom, 0 resets the view.
 */

import type { FlowScene3D } from './scene';

export interface ControlsOptions {
  /** Keys are read when this element (default the canvas) has focus. */
  readonly keyTarget?: HTMLElement;
  /** False: no keys (the page's own key map calls sceneKey); the pointer and wheel only. */
  readonly keys?: boolean;
  /** Called after a key changed something, with the key. */
  readonly onChange?: (key: string) => void;
}

/**
 * What a key does to the scene (the keys of this module's header); true if
 * it did something. A page with its own key map calls this for the keys
 * it gives the 3D view, so that the keys and what they do are one.
 */
export function sceneKey(scene: FlowScene3D, key: string, shift = false): boolean {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const L = scene.getLayers();
  const step = 0.05;
  let handled = true;
  switch (key) {
    case '1':
      scene.setLayers({
        body: L.body === 'solid' ? 'wireframe' : L.body === 'wireframe' ? 'off' : 'solid',
      });
      break;
    case '2':
      scene.setLayers({ slice: !L.slice });
      break;
    case '3':
      scene.setLayers({ streamlines: !L.streamlines });
      break;
    case '4':
      // Glowing shells, lit solid shells, none.
      scene.setLayers(
        !L.isosurfaces
          ? { isosurfaces: true, solidShells: false }
          : L.solidShells
            ? { isosurfaces: false }
            : { solidShells: true },
      );
      break;
    case '5':
      scene.setLayers({ shock: !L.shock });
      break;
    case '6':
      scene.setLayers({ cutaway: !L.cutaway });
      break;
    case 'z':
    case 'Z':
      scene.cycleQuantity();
      break;
    case 't':
    case 'T':
      scene.cycleSlice();
      break;
    case 'q':
    case 'Q':
      scene.moveSlice(-1);
      break;
    case 'e':
    case 'E':
      scene.moveSlice(1);
      break;
    case 'h':
    case 'H':
      scene.setLayers({ help: !L.help });
      break;
    case 'Escape':
      if (L.help) scene.setLayers({ help: false });
      else handled = false;
      break;
    case '0':
    case 'Home':
      scene.resetView();
      break;
    case '+':
    case '=':
      scene.zoomBy(1.15);
      break;
    case '-':
    case '_':
      scene.zoomBy(1 / 1.15);
      break;
    case 'ArrowLeft':
      if (shift) scene.panPixels(-40 * dpr, 0);
      else scene.orbitBy(step, 0);
      break;
    case 'ArrowRight':
      if (shift) scene.panPixels(40 * dpr, 0);
      else scene.orbitBy(-step, 0);
      break;
    case 'ArrowUp':
      if (shift) scene.panPixels(0, -40 * dpr);
      else scene.orbitBy(0, step);
      break;
    case 'ArrowDown':
      if (shift) scene.panPixels(0, 40 * dpr);
      else scene.orbitBy(0, -step);
      break;
    default:
      handled = false;
  }
  return handled;
}

/** Attach the controls; returns a function that removes them. */
export function attachControls(
  scene: FlowScene3D,
  canvas: HTMLCanvasElement,
  options: ControlsOptions = {},
): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let pan = false;
  let pinch: { distance: number; x: number; y: number } | null = null;
  const dpr = () => window.devicePixelRatio || 1;
  const ORBIT_PER_PIXEL = 0.006;

  const down = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pan = e.button === 2 || e.shiftKey || e.button === 1;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
    }
  };
  const move = (e: PointerEvent) => {
    const last = pointers.get(e.pointerId);
    if (last === undefined) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch !== null) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      if (pinch.distance > 0) scene.zoomBy(distance / pinch.distance);
      scene.panPixels((cx - pinch.x) * dpr(), (cy - pinch.y) * dpr());
      pinch = { distance, x: cx, y: cy };
      return;
    }
    if (pan) scene.panPixels(dx * dpr(), dy * dpr());
    else scene.orbitBy(-dx * ORBIT_PER_PIXEL, dy * ORBIT_PER_PIXEL);
  };
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const lines = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    scene.zoomBy(Math.exp((-e.deltaY * lines) / 500));
  };
  const menu = (e: Event) => {
    e.preventDefault();
  };

  const key = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (sceneKey(scene, e.key, e.shiftKey)) {
      e.preventDefault();
      options.onChange?.(e.key);
    }
  };

  const keyTarget = options.keyTarget ?? canvas;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('contextmenu', menu);
  const keys = options.keys !== false;
  if (keys) keyTarget.addEventListener('keydown', key);
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('contextmenu', menu);
    if (keys) keyTarget.removeEventListener('keydown', key);
  };
}
