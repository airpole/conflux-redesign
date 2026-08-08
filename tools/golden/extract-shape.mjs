// shape 골든 — easing 3종, 체인 보간, anchor, step tick 판정.
import { prepare, load, loadChart, emit } from './harness.mjs';
import { shapeFixtures, TPB } from './fixtures.mjs';

await prepare();
const sh = await load('shape.js');
const cases = [];

// 1) easing 함수 자체
for (const type of ['Linear', 'In', 'Out', 'InOut']) {
  for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    cases.push({ group: 'ease', fn: 'ease', args: [0, 100, t, type], expected: sh.ease(0, 100, t, type) });
  }
}

// 2) 체인 보간 — 이벤트 사이·경계·구간 밖
await loadChart(shapeFixtures.chain);
const ticks = [-TPB, 0, TPB / 2, TPB, TPB * 2, TPB * 3, TPB * 4, TPB * 5, TPB * 6];
for (const tk of ticks) {
  cases.push({ group: 'chain', fn: 'getShape', args: [tk], expected: sh.getShape(tk) });
  cases.push({ group: 'chain', fn: 'getLines', args: [tk], expected: sh.getLines(tk) });
  cases.push({ group: 'chain', fn: 'isStepTick', args: [tk], expected: sh.isStepTick(tk) });
}
cases.push({ group: 'chain', fn: 'getShapeInit', args: [], expected: sh.getShapeInit() });
cases.push({ group: 'chain', fn: 'getLinesInit', args: [], expected: sh.getLinesInit() });
cases.push({ group: 'chain', fn: 'sp2f', args: [32], expected: sh.sp2f(32) });

await emit('shape', {
  tolerance: { integer: 'exact', real: 1e-9 },
  fieldNames: 'original (conflux-editor)',
  cases,
});
