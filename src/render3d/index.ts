/**
 * The 3D view's public API, for a page (src/render3d/scene.ts has the
 * details). In outline:
 *
 *   const scene = await FlowScene3D.create(device, canvas, {
 *     presentation: presentationFor(adapter.info), // 'canvas' or 'copy'
 *     units: { freeStreamTemperature: 293.9 },     // speed in m/s, temperature in K
 *   });
 *   scene.setRocket(rocketFromForm(form));          // body and fins, calibres
 *   scene.onScale((s) => drawLegend(s));            // the colour channel's range and unit
 *   const detach = attachControls(scene, canvas);   // mouse, touch, keys
 *
 *   // While the solver runs (gpuFittedFlow's onLive):
 *   onLive: (live) => {
 *     if (live === null) scene.freeze();            // keeps the last flow read
 *     else { scene.setFlow(liveFitSource(live)); scene.setLive(true); }
 *   },
 *   onProgress: (steps) => scene.setStatus({ steps }),
 *
 *   // A flow on the CPU instead (a cached or CPU fit):
 *   scene.setField(fieldFromCells(grid, cell, gamma, freeStream), { steps, converged });
 *
 *   scene.setLayers({ streamlines: false });         // or keys 1 to 6
 *   scene.setQuantity('temperature');                // or key Z
 *   scene.fit({ x, y, width, height });              // the part the panels leave free
 *   const png = await scene.pngBlob('Basic Finner, Mach 2');
 *   scene.destroy();
 */

export {
  FlowScene3D,
  DEFAULT_LAYERS,
  type BodyLayer,
  type FlowScene3DOptions,
  type SceneLayers,
  type SceneScale,
  type SceneStatus,
  type SliceMode,
} from './scene';
export { attachControls, sceneKey, type ControlsOptions } from './controls';
export {
  fieldFromCells,
  fieldFromConserved,
  nodesOnLines,
  sampleMeridional,
  sampleRevolved,
  type MeridionalField,
} from './field';
export { QUANTITIES, type Quantity, type Units } from './quantities';
export { basicFinnerRocket, rocketFromForm } from './presets';
export type { FinSet, PlateEdge, PlateSection, Rocket } from './rocket-mesh';
