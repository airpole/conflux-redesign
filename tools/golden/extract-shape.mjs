// shape 골든 — easing 곡선, 체인 보간, anchor, 즉시점프, Arc 교번.
//
// 원본 `ease()`의 실제 가지는 `Linear` / `In-Sine` / `Out-Sine` / `Arc` 넷이고,
// 목록에 없는 이름은 조용히 Linear로 떨어진다. 이전 판은 `In`/`Out`/`InOut`을
// 넘겨 21건이 전부 그 기본 가지를 쟀다 — In-Sine·Out-Sine은 한 번도 측정된 적이
// 없었다(D-2026-043).
//
// 표본 tick에는 보간 **도중** 지점을 넣는다. 끝점만 재면 어떤 곡선을 쓰든 값이
// 같아서, easing이 실제로 걸리는지 확인할 수 없다.
import { prepare, load, loadChart, emit } from './harness.mjs';
import { shapeFixtures, TPB as T } from './fixtures.mjs';

await prepare();
const sh = await load('shape.js');
const cases = [];

const shape = (fixture, fn, args, expected) =>
  cases.push({ group: 'chain', fixture, fn, args, expected });

// ── 1) easing 곡선 자체 ─────────────────────────────────────
// `Arc`는 원본에만 있는 네 번째 가지다. 입력 경로가 저장 전에 전부 Out-Sine/
// In-Sine으로 바꿔치기하므로 실제 차트에는 남지 않는다 — 대장 SH-5(`없음`).
for (const type of ['Linear', 'In-Sine', 'Out-Sine', 'Arc']) {
  for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    cases.push({
      group: 'ease',
      fn: 'ease',
      args: [0, 100, t, type],
      expected: sh.ease(0, 100, t, type),
    });
  }
}
// 목록 밖 이름이 Linear로 떨어지는 것 자체가 관측 대상이다.
for (const t of [0.25, 0.5, 0.75]) {
  cases.push({
    group: 'ease',
    fn: 'ease',
    args: [0, 100, t, 'Nonsense'],
    expected: sh.ease(0, 100, t, 'Nonsense'),
  });
}

// ── 2) 두 체인 + easing 3종 + 즉시점프 ──────────────────────
await loadChart(shapeFixtures.chain);
for (const tk of [
  -T, 0, T / 2, T, T * 1.25, T * 1.5, T * 1.75, T * 2, T * 2.5,
  T * 3, T * 3.25, T * 3.5, T * 3.75, T * 4, T * 5,
]) {
  shape('chain', 'getShape', [tk], sh.getShape(tk));
  shape('chain', 'isStepTick', [tk], sh.isStepTick(tk));
}
shape('chain', 'getShapeInit', [], sh.getShapeInit());
shape('chain', 'getStepTicks', [-T, T * 5], sh.getStepTicks(-T, T * 5));

// ── 3) anchor 없는 체인 → 기본 기하 ─────────────────────────
await loadChart(shapeFixtures.noAnchor);
shape('noAnchor', 'getShapeInit', [], sh.getShapeInit());
for (const tk of [0, T, T * 1.5, T * 2]) shape('noAnchor', 'getShape', [tk], sh.getShape(tk));

// ── 4) 중간 anchor는 무시된다 ───────────────────────────────
await loadChart(shapeFixtures.midAnchor);
for (const tk of [0, T, T * 2, T * 3, T * 3.5, T * 4, T * 4.5, T * 5]) {
  shape('midAnchor', 'getShape', [tk], sh.getShape(tk));
}

// ── 5) anchor 둘 — 배열 순서가 이긴다 ───────────────────────
await loadChart(shapeFixtures.anchorOrder);
shape('anchorOrder', 'getShapeInit', [], sh.getShapeInit());
shape('anchorOrder', 'getShape', [0], sh.getShape(0));

// ── 6) 같은 tick 정렬 — 즉시점프가 먼저 ─────────────────────
await loadChart(shapeFixtures.sameTick);
for (const tk of [0, T, T * 1.5, T * 2]) shape('sameTick', 'getShape', [tk], sh.getShape(tk));

// ── 7) 잇단 즉시점프 ────────────────────────────────────────
await loadChart(shapeFixtures.steps);
for (const tk of [0, T - 1, T, T * 2 - 1, T * 2, T * 3, T * 4]) {
  shape('steps', 'getShape', [tk], sh.getShape(tk));
  shape('steps', 'isStepTick', [tk], sh.isStepTick(tk));
}
shape('steps', 'getStepTicks', [0, T * 4], sh.getStepTicks(0, T * 4));

// ── 8) 겹치는 보간 ──────────────────────────────────────────
await loadChart(shapeFixtures.overlapping);
for (const tk of [T, T * 1.5, T * 2, T * 2.5, T * 3, T * 4, T * 5, T * 6]) {
  shape('overlapping', 'getShape', [tk], sh.getShape(tk));
}

// ── 9) Arc 교번 ─────────────────────────────────────────────
await loadChart(shapeFixtures.arc);
for (const tk of [0, T, T * 2, T * 3, T * 4, T * 5, T * 6]) {
  shape('arc', 'resolveArcEasing', [true, tk], sh.resolveArcEasing(true, tk));
}

// ── 10) 좌표 단위 ───────────────────────────────────────────
for (const p of [0, 16, 32, 48, 64]) {
  cases.push({ group: 'unit', fn: 'sp2f', args: [p], expected: sh.sp2f(p) });
}

await emit('shape', {
  tolerance: { integer: 'exact', real: 1e-9 },
  fieldNames: 'original (conflux-editor)',
  cases,
});
