import { cappedNose, noseRadius, type Nose } from './nose.ts';
const out: unknown[] = [];
for (const kind of ['ogive', 'vk'] as const) {
  for (const L of [3, 4, 5]) {
    for (const ratio of [0.03, 0.05, 0.1, 0.15]) {
      const shape = kind === 'ogive' ? { kind: 'ogive', parameter: 1 } : { kind: 'haack', parameter: 0 };
      const nose = { shape, length: L, baseRadius: 0.5, tipRadius: ratio * 0.5 } as Nose;
      const c = cappedNose(nose);
      const xs: number[] = [];
      const rs: number[] = [];
      for (let k = 0; k <= 400; k++) {
        const x = L * (k / 400) ** 3;
        xs.push(x);
        rs.push(noseRadius(nose, x));
      }
      out.push({ kind, L, ratio, offset: c.offset, tangentX: c.tangentX, centreX: c.centreX, parentLength: c.parent.length, xs, rs });
    }
  }
}
console.log(JSON.stringify(out));
