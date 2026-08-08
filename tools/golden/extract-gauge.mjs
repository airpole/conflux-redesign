// gauge 골든 — 6모드 × 판정 열에 따른 게이지 궤적과 종료 판정.
import { prepare, load, loadChart, emit } from './harness.mjs';
import { fixtures } from './fixtures.mjs';

await prepare();
const { PS } = await load('play-state.js');
const g = await load('gauge.js');

// 판정 열 — 회복·손실·혼합·전멸
const SEQUENCES = {
  allSync:   Array(24).fill('SYNC'),
  allMiss:   Array(24).fill('MISS'),
  mixed:     ['SYNC','SYNC','GOOD','MISS','SYNC','PERFECT','MISS','MISS','SYNC','GOOD','TAIL_OK','TAIL_MISS'],
  lateCollapse: [...Array(12).fill('SYNC'), ...Array(12).fill('MISS')],
  tailOnly:  ['TAIL_OK','TAIL_MISS','TAIL_OK','TAIL_MISS'],
};

const cases = [];
for (const gaugeType of ['normal', 'hard']) {
  for (const lockTarget of ['none', 'fc', 'ap']) {
    for (const [seqName, seq] of Object.entries(SEQUENCES)) {
      await loadChart(fixtures.plain);
      // 게이지는 노트 수에 unit-scale이 걸린다 — 길이 의존을 보려고 24노트로 채운다.
      const { D } = await load('state.js');
      D.notes = Array.from({ length: 24 }, (_, i) => ({
        startTick: i * 480, duration: i % 4 === 0 ? 480 : 0, channel: (i % 4) + 1, isWide: false,
      }));
      PS.gaugeType = gaugeType;
      PS.lockTarget = lockTarget;
      g.resetGauge();
      const trace = [];
      let forceEndedAt = null;
      seq.forEach((kind, i) => {
        const ended = g.gaugeOnJudgment(kind);
        trace.push(Number(PS.gaugeValue.toFixed(10)));
        if (ended && forceEndedAt === null) forceEndedAt = i;
      });
      cases.push({
        gaugeType, lockTarget, sequence: seqName,
        expected: {
          unitScale: PS.gaugeUnitScale,
          trace,
          forceEndedAt,
          lockTier: PS.lockTier,
          evaluateEnd: g.evaluateEnd(),
        },
      });
    }
  }
}

await emit('gauge', {
  tolerance: { integer: 'exact', real: 1e-9 },
  fieldNames: 'original (conflux-editor) — gaugeType/gaugeValue, 재설계는 gaugeMode',
  cases,
});
