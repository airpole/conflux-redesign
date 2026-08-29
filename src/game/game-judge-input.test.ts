import { describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import { DEFAULT_SETTINGS } from '../core/core-settings.js';
import {
  buildJudgeNotes,
  createJudgeState,
  laneMapOf,
  type CandidateContext,
} from '../core/core-judge.js';
import { buildTimeline } from '../core/core-timing.js';
import { createJudgeInputHandlers } from './game-judge-input.js';
import type { KeyEvent } from '../env/env-input.js';

function fakeKeyEvent(code: string, timestampMs: number): KeyEvent {
  return { code, repeat: false, timestampMs };
}

describe('createJudgeInputHandlers', () => {
  it('바인딩된 code의 keydown이 judge 이벤트를 낸다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const timeline = buildTimeline(chart);
    const notes = buildJudgeNotes(chart, timeline);
    const context: CandidateContext = { notes, laneMap: laneMapOf(false) };
    const state = createJudgeState(notes);
    const onEvents = vi.fn();

    const handlers = createJudgeInputHandlers(
      state,
      context,
      DEFAULT_SETTINGS.keyBindings,
      0,
      (wallClockMs) => wallClockMs,
      () => false,
      onEvents,
    );

    // key1 → lane 1, 기본 바인딩 'KeyE'.
    handlers.onKeyDown(fakeKeyEvent('KeyE', 0));

    expect(onEvents).toHaveBeenCalledTimes(1);
    const events = onEvents.mock.calls[0]![0];
    expect(events.some((e: { kind: string }) => e.kind === 'judged')).toBe(true);
  });

  it('바인딩되지 않은 code는 무시한다', () => {
    const chart = makeChart();
    const timeline = buildTimeline(chart);
    const notes = buildJudgeNotes(chart, timeline);
    const context: CandidateContext = { notes, laneMap: laneMapOf(false) };
    const state = createJudgeState(notes);
    const onEvents = vi.fn();

    const handlers = createJudgeInputHandlers(
      state,
      context,
      DEFAULT_SETTINGS.keyBindings,
      0,
      (wallClockMs) => wallClockMs,
      () => false,
      onEvents,
    );

    handlers.onKeyDown(fakeKeyEvent('KeyZ', 0));
    handlers.onKeyUp(fakeKeyEvent('KeyZ', 0));

    expect(onEvents).not.toHaveBeenCalled();
  });

  it('keyup도 바인딩된 code면 judge로 전달된다', () => {
    const chart = makeChart({
      notes: [{ startTick: 0, duration: 480, lane: 1, isWide: false }],
    });
    const timeline = buildTimeline(chart);
    const notes = buildJudgeNotes(chart, timeline);
    const context: CandidateContext = { notes, laneMap: laneMapOf(false) };
    const state = createJudgeState(notes);
    const onEvents = vi.fn();

    const handlers = createJudgeInputHandlers(
      state,
      context,
      DEFAULT_SETTINGS.keyBindings,
      0,
      (wallClockMs) => wallClockMs,
      () => false,
      onEvents,
    );

    handlers.onKeyDown(fakeKeyEvent('KeyE', 0));
    handlers.onKeyUp(fakeKeyEvent('KeyE', 100));

    expect(onEvents).toHaveBeenCalledTimes(2);
  });

  it('KeyEvent.timestampMs(wall-clock)를 toChartMs로 변환한 뒤 judge에 넘긴다', () => {
    // wall-clock 3000ms 시점의 keydown이 lead-in 3000ms 뒤 chart tick 0과
    // 같은 순간이라면, 변환 없이 그대로 3000을 넘기면 note가 이미 지난
    // 것으로 오판된다(회귀 재현) — toChartMs(3000) = 0으로 바뀌어야 한다.
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const timeline = buildTimeline(chart);
    const notes = buildJudgeNotes(chart, timeline);
    const context: CandidateContext = { notes, laneMap: laneMapOf(false) };
    const state = createJudgeState(notes);
    const onEvents = vi.fn();

    const handlers = createJudgeInputHandlers(
      state,
      context,
      DEFAULT_SETTINGS.keyBindings,
      0,
      (wallClockMs) => wallClockMs - 3000,
      () => false,
      onEvents,
    );

    handlers.onKeyDown(fakeKeyEvent('KeyE', 3000));

    expect(state.hits[0]).toBe('hit');
    const events = onEvents.mock.calls[0]![0] as { kind: string; judgment?: string }[];
    expect(events.some((e) => e.kind === 'judged' && e.judgment === 'SYNC')).toBe(true);
  });

  it('isPaused()가 참이면 registerKeyDown/Up만 하고 판정을 부르지 않는다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const timeline = buildTimeline(chart);
    const notes = buildJudgeNotes(chart, timeline);
    const context: CandidateContext = { notes, laneMap: laneMapOf(false) };
    const state = createJudgeState(notes);
    const onEvents = vi.fn();

    const handlers = createJudgeInputHandlers(
      state,
      context,
      DEFAULT_SETTINGS.keyBindings,
      0,
      (wallClockMs) => wallClockMs,
      () => true,
      onEvents,
    );

    handlers.onKeyDown(fakeKeyEvent('KeyE', 0));

    expect(onEvents).not.toHaveBeenCalled();
    expect(state.hits[0]).toBe('pending');
    expect(state.keysHeld.has('key1')).toBe(true);

    handlers.onKeyUp(fakeKeyEvent('KeyE', 100));
    expect(onEvents).not.toHaveBeenCalled();
    expect(state.keysHeld.has('key1')).toBe(false);
  });
});
