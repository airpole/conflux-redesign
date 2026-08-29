import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import {
  buildJudgeNotes,
  createJudgeState,
  laneMapOf,
  type CandidateContext,
} from '../core/core-judge.js';
import { buildTimeline } from '../core/core-timing.js';
import { advanceAutoplay } from './game-judge-autoplay.js';

function contextFor(chart: ReturnType<typeof makeChart>): CandidateContext {
  const timeline = buildTimeline(chart);
  return { notes: buildJudgeNotes(chart, timeline), laneMap: laneMapOf(false) };
}

describe('advanceAutoplay', () => {
  it('startMs에 도달한 tap을 diff 0(SYNC)로 확정한다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const context = contextFor(chart);
    const state = createJudgeState(context.notes);

    const events = advanceAutoplay(state, context, 0);

    expect(events).toEqual([
      expect.objectContaining({ kind: 'judged', judgment: 'SYNC', diff: 0, noteIndex: 0 }),
    ]);
    expect(state.hits[0]).toBe('hit');
  });

  it('아직 안 온 note는 확정하지 않는다', () => {
    const chart = makeChart({
      notes: [{ startTick: 480 * 100, duration: 0, lane: 1, isWide: false }],
    });
    const context = contextFor(chart);
    const state = createJudgeState(context.notes);

    const events = advanceAutoplay(state, context, 0);

    expect(events).toHaveLength(0);
    expect(state.hits[0]).toBe('pending');
  });

  it('같은 note를 두 번 확정하지 않는다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const context = contextFor(chart);
    const state = createJudgeState(context.notes);

    advanceAutoplay(state, context, 0);
    const events = advanceAutoplay(state, context, 100);

    expect(events).toHaveLength(0);
  });

  it('hold의 head를 열고, tailMs에 도달하면 tail도 SYNC로 닫는다', () => {
    const chart = makeChart({
      notes: [{ startTick: 0, duration: 480, lane: 1, isWide: false }],
    });
    const context = contextFor(chart);
    const state = createJudgeState(context.notes);
    const tailMs = context.notes.byIndex[0]!.tailMs;

    const opened = advanceAutoplay(state, context, 0);
    expect(opened.some((e) => e.kind === 'holdOpened')).toBe(true);
    expect(state.activeNormalHolds[1]).toEqual([0]);

    const beforeTail = advanceAutoplay(state, context, tailMs - 1);
    expect(beforeTail).toHaveLength(0);
    expect(state.activeNormalHolds[1]).toEqual([0]);

    const closed = advanceAutoplay(state, context, tailMs);
    expect(closed).toEqual([
      expect.objectContaining({ kind: 'judged', judgment: 'SYNC', part: 'tail', noteIndex: 0 }),
    ]);
    expect(state.activeNormalHolds[1]).toEqual([]);
  });

  it('여러 note가 같은 프레임에 도달하면 전부 확정한다', () => {
    const chart = makeChart({
      notes: [
        { startTick: 0, duration: 0, lane: 1, isWide: false },
        { startTick: 0, duration: 0, lane: 2, isWide: false },
      ],
    });
    const context = contextFor(chart);
    const state = createJudgeState(context.notes);

    const events = advanceAutoplay(state, context, 0);

    expect(events.filter((e) => e.kind === 'judged')).toHaveLength(2);
  });
});
