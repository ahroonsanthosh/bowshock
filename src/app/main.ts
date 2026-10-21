/**
 * The front page: the site's top bar and help, and whether this browser
 * offers WebGPU and, if so, the adapter and the limits that size the
 * solver grids.
 */

import { detectGpu, type GpuSupport } from '../gpu/detect';
import { h } from '../ui/dom';
import { bandSection, colourScaleSection, Help, HELP_BINDING } from '../ui/help';
import { KeyMap } from '../ui/keymap';
import { siteMenus } from '../ui/site';
import { TopBar } from '../ui/topbar';

function formatBytes(bytes: number): string {
  const mib = bytes / (1024 * 1024);
  return mib >= 1024 ? `${(mib / 1024).toFixed(1)} GiB` : `${mib.toFixed(0)} MiB`;
}

function render(support: GpuSupport): HTMLElement[] {
  if (support.kind === 'unavailable') {
    return [h('p', { className: 'muted', text: support.reason })];
  }
  const table = h('table', {}, h('caption', { className: 'visually-hidden', text: 'GPU limits' }));
  const body = h('tbody');
  for (const [name, value] of Object.entries(support.limits)) {
    const shown = name.endsWith('Size') && value > 65536 ? formatBytes(value) : String(value);
    body.append(
      h('tr', {}, h('th', { text: name, attrs: { scope: 'row' } }), h('td', { text: shown })),
    );
  }
  table.append(body);
  return [
    h('p', { text: `Adapter: ${support.adapterDescription}` }),
    table,
    h('p', { className: 'features', text: `Features: ${support.features.join(', ') || 'none'}` }),
  ];
}

const help = new Help({
  title: 'Keys and help',
  bindings: [HELP_BINDING],
  sections: [
    {
      title: 'The pages',
      body: [
        'The live flow, ramp and shock tube pages are run from the keyboard as well as by their buttons: press H on one of them for its keys.',
      ],
    },
    colourScaleSection(),
    bandSection(),
  ],
});
const topBar = new TopBar({
  root: '',
  menus: siteMenus('', 'home'),
  onHelp: () => {
    help.open();
  },
  dialogOpen: () => help.isOpen,
});
document.body.prepend(topBar.element);
document.body.append(help.element);
new KeyMap(
  [HELP_BINDING],
  () => {
    help.toggle();
  },
  () => help.isOpen,
).attach();

const support = await detectGpu(navigator.gpu);
document.querySelector('#gpu-status')?.replaceChildren(...render(support));
// The one line in view: whether the pages can run here.
document
  .querySelector('#gpu-line')
  ?.replaceChildren(
    support.kind === 'webgpu'
      ? h('span', { className: 'badge badge--ok', text: 'WebGPU available' })
      : h('span', { className: 'badge badge--warn', text: 'No WebGPU' }),
    ' ',
    support.kind === 'webgpu'
      ? `Your GPU: ${support.adapterDescription}`
      : 'The ramp and the shock tube run on the CPU instead; the drag page needs WebGPU.',
  );
