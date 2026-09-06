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

  // F06 — 연속 WideHold 경계에서 tail-before-head 순서가 유지돼야 한다.
  it('연속된 WideHold의 경계(같은 tick)에서 이전 tail을 먼저 닫고 다음 head를 연다(F06)', () => {
    // 120 BPM, WideHold [0,1920) → [1920,3840). 480tick=1beat=500ms(120bpm)라
    // 1920tick=2000ms, 3840tick=4000ms.
    const chart = makeChart({
      notes: [
        { startTick: 0, duration: 1920, lane: 1, isWide: true },
        { startTick: 1920, duration: 1920, lane: 1, isWide: true },
      ],
    });
    const context = contextFor(chart);
    const state = createJudgeState(context.notes);

    // 큰 한 프레임으로 두 경계를 한꺼번에 건너뛴다 — 예전 구현은 due head를
    // 전부 먼저 처리해 두 번째 head가 openHold의 "중복 WideHold" 방어
    // 경로(무효 chart 전용)를 잘못 태우고 첫 Hold의 tail을 MISS로 만들었다.
    const events = advanceAutoplay(state, context, 4000);
    const judged = events.filter((e) => e.kind === 'judged');

    expect(judged.every((e) => e.kind === 'judged' && e.judgment === 'SYNC')).toBe(true);
    expect(judged).toHaveLength(4); // head1·tail1·head2·tail2 = 4단위, 전부 SYNC.
    expect(state.activeWideHold).toBeNull();
  });

  it('여러 wall-clock 프레임(3000/3500/4000ms)으로 나눠 진행해도 결과가 같다(F06)', () => {
    const chart = makeChart({
      notes: [
        { startTick: 0, duration: 1920, lane: 1, isWide: true },
        { startTick: 1920, duration: 1920, lane: 1, isWide: true },
      ],
    });
    const context = contextFor(chart);
    const state = createJudgeState(context.notes);

    const allEvents = [
      ...advanceAutoplay(state, context, 3000),
      ...advanceAutoplay(state, context, 3500),
      ...advanceAutoplay(state, context, 4000),
    ];
    const judged = allEvents.filter((e) => e.kind === 'judged');

    expect(judged.every((e) => e.kind === 'judged' && e.judgment === 'SYNC')).toBe(true);
    expect(judged).toHaveLength(4);
  });

  it('같은 tick에 tap과 tail이 함께 있으면 tail을 먼저 닫는다(half-open [head,tail))', () => {
    // lane1 Normal Hold [0,480), lane2 tap at tick480 — 480tick에서
    // tail(lane1)과 head(lane2)가 동률이다.
    const chart = makeChart({
      notes: [
        { startTick: 0, duration: 480, lane: 1, isWide: false },
        { startTick: 480, duration: 0, lane: 2, isWide: false },
      ],
    });
    const context = contextFor(chart);
    const state = createJudgeState(context.notes);
    const boundaryMs = context.notes.byIndex[0]!.tailMs;
    expect(boundaryMs).toBe(context.notes.byIndex[1]!.startMs); // 동률 전제 확인.

    advanceAutoplay(state, context, 0); // head(lane1) 연다.
    const events = advanceAutoplay(state, context, boundaryMs);

    expect(events[0]).toEqual(
      expect.objectContaining({ kind: 'judged', part: 'tail', noteIndex: 0 }),
    );
    expect(events[1]).toEqual(
      expect.objectContaining({ kind: 'judged', part: 'tap', noteIndex: 1 }),
    );
  });
});
