// timing 골든 — tick↔ms, BPM 조회, measure 변환.
import { prepare, load, loadChart, emit } from './harness.mjs';
import { fixtures, TPB } from './fixtures.mjs';

await prepare();
const t = await load('timing.js');
const cases = [];

for (const [name, fx] of Object.entries(fixtures)) {
  await loadChart(fx);
  const ticks = [-TPB, -1, 0, 1, TPB, TPB * 4 - 1, TPB * 4, TPB * 4 + 1, TPB * 8, TPB * 12];
  for (const tk of ticks) {
    cases.push({ fixture: name, fn: 't2ms', args: [tk], expected: t.t2ms(tk) });
  }
  for (const ms of [-1000, 0, 1, 500, 2000, 4000, 10000]) {
    cases.push({ fixture: name, fn: 'ms2t', args: [ms], expected: t.ms2t(ms) });
  }
  for (const tk of [0, TPB * 3, TPB * 4, TPB * 8, TPB * 20]) {
    cases.push({ fixture: name, fn: 'getBPMAt', args: [tk], expected: t.getBPMAt(tk) });
    cases.push({ fixture: name, fn: 'getTimeSig', args: [tk], expected: t.getTimeSig(tk) });
    cases.push({ fixture: name, fn: 'tickToMeasure', args: [tk], expected: t.tickToMeasure(tk) });
  }
  cases.push({ fixture: name, fn: 'getMinTick', args: [], expected: t.getMinTick() });
}

await emit('timing', {
  tolerance: { integer: 'exact', real: 1e-9 },
  fieldNames: 'original (conflux-editor)',
  cases,
});
