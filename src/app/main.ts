import { detectGpu, type GpuSupport } from '../gpu/detect';

function formatBytes(bytes: number): string {
  const mib = bytes / (1024 * 1024);
  return mib >= 1024 ? `${(mib / 1024).toFixed(1)} GiB` : `${mib.toFixed(0)} MiB`;
}

/** Create an element with text content; never interprets the text as HTML. */
function el(tag: string, text = '', className = ''): HTMLElement {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className !== '') node.className = className;
  return node;
}

function render(support: GpuSupport): HTMLElement[] {
  if (support.kind === 'unavailable') {
    return [el('p', 'No WebGPU', 'status warn'), el('p', support.reason)];
  }
  const table = document.createElement('table');
  for (const [name, value] of Object.entries(support.limits)) {
    const row = table.insertRow();
    row.append(el('th', name));
    const shown = name.endsWith('Size') && value > 65536 ? formatBytes(value) : String(value);
    row.append(el('td', shown));
  }
  return [
    el('p', 'WebGPU available', 'status ok'),
    el('p', `Adapter: ${support.adapterDescription}`),
    table,
    el('p', `Features: ${support.features.join(', ') || 'none'}`, 'features'),
  ];
}

const target = document.querySelector('#gpu-status');
if (target !== null) {
  const support = await detectGpu(navigator.gpu);
  target.replaceChildren(...render(support));
}
