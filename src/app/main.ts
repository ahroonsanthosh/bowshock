import { detectGpu, type GpuSupport } from '../gpu/detect';

function formatBytes(bytes: number): string {
  const mib = bytes / (1024 * 1024);
  return mib >= 1024 ? `${(mib / 1024).toFixed(1)} GiB` : `${mib.toFixed(0)} MiB`;
}

function render(support: GpuSupport): string {
  if (support.kind === 'unavailable') {
    return `<p class="status warn">No WebGPU</p><p>${support.reason}</p>`;
  }
  const rows = Object.entries(support.limits)
    .map(([name, value]) => {
      const shown = name.endsWith('Size') && value > 65536 ? formatBytes(value) : String(value);
      return `<tr><th>${name}</th><td>${shown}</td></tr>`;
    })
    .join('');
  return `
    <p class="status ok">WebGPU available</p>
    <p>Adapter: ${support.adapterDescription}</p>
    <table>${rows}</table>
    <p class="features">Features: ${support.features.join(', ') || 'none'}</p>`;
}

const target = document.querySelector<HTMLElement>('#gpu-status');
if (target !== null) {
  const support = await detectGpu(navigator.gpu);
  target.innerHTML = render(support);
}
