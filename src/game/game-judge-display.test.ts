import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { JudgmentEvent } from '../core/core-judge.js';
import {
  applyJudgmentEvents,
  createJudgeDisplayState,
  pruneHitEffects,
  recordFastSlow,
} from './game-judge-display.js';

const note = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] })
  .notes[0]!;

describe('recordFastSlow', () => {
  it('side와 시각을 기록한다', () => {
    const display = createJudgeDisplayState();
    recordFastSlow(display, 'FAST', 1000);
    expect(display.fastSlow).toEqual({ side: 'FAST', atMs: 1000 });
  });
});

describe('applyJudgmentEvents', () => {
  it('judged 이벤트가 lastJudgment를 갈아치우고 hit effect를 쌓는다', () => {
    const display = createJudgeDisplayState();
    const events: JudgmentEvent[] = [
      { kind: 'judged', judgment: 'PERFECT', part: 'tap', noteIndex: 0, note, diff: 20, units: 1 },
    ];
    applyJudgmentEvents(display, events, 500);

    expect(display.lastJudgment).toEqual({ judgment: 'PERFECT', atMs: 500 });
    expect(display.hitEffects).toHaveLength(1);
    expect(display.hitEffects[0]).toEqual({ note, judgment: 'PERFECT', atMs: 500 });
  });

  it('fastSlow 이벤트는 recordFastSlow와 같은 결과를 낸다', () => {
    const display = createJudgeDisplayState();
    const events: JudgmentEvent[] = [{ kind: 'fastSlow', side: 'SLOW', diff: 30 }];
    applyJudgmentEvents(display, events, 777);

    expect(display.fastSlow).toEqual({ side: 'SLOW', atMs: 777 });
  });

  it('comboReset 등 다른 kind는 표시 상태를 건드리지 않는다', () => {
    const display = createJudgeDisplayState();
    applyJudgmentEvents(display, [{ kind: 'comboReset' }], 10);
    expect(display.lastJudgment).toBeNull();
    expect(display.fastSlow).toBeNull();
    expect(display.hitEffects).toHaveLength(0);
  });
});

describe('pruneHitEffects', () => {
  it('durationMs가 지난 effect를 지운다', () => {
    const display = createJudgeDisplayState();
    display.hitEffects.push(
      { note, judgment: 'SYNC', atMs: 0 },
      { note, judgment: 'SYNC', atMs: 900 },
    );
    pruneHitEffects(display, 1000, 300);
    expect(display.hitEffects).toHaveLength(1);
    expect(display.hitEffects[0]!.atMs).toBe(900);
  });
});
