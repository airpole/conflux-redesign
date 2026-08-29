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
      onEvents,
    );

    handlers.onKeyDown(fakeKeyEvent('KeyE', 0));
    handlers.onKeyUp(fakeKeyEvent('KeyE', 100));

    expect(onEvents).toHaveBeenCalledTimes(2);
  });
});
