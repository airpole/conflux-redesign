import { describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import { DEFAULT_SETTINGS } from '../core/core-settings.js';
import { LEAD_IN_MS } from '../core/core-constants.js';
import { buildTimeline, songEndOf } from '../core/core-timing.js';
import type { CTX } from './game-ctx.js';
import { createGameSession } from './game-session.js';
import type { KeyEvent } from '../env/env-input.js';

function fakeCtx(contentEndMs: number): CTX {
  return {
    sharedMs: 0,
    contentEndMs,
    hitVol: 1,
    pvSpd: 3,
    nThk: 15,
    redrawIdle: vi.fn(),
  };
}

function fakeKeyEvent(code: string, timestampMs: number): KeyEvent {
  return { code, repeat: false, timestampMs };
}

describe('createGameSession — 수동 입력', () => {
  it('lead-in 중에는 판정이 없고, tick 0을 넘기면 입력이 판정을 만든다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: false,
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
    });

    session.advance(LEAD_IN_MS);
    expect(ctx.sharedMs).toBeCloseTo(0, 5);
    expect(session.judgeState.hits[0]).toBe('pending');

    session.input.onKeyDown(fakeKeyEvent('KeyE', LEAD_IN_MS));
    expect(session.judgeState.hits[0]).toBe('hit');
    expect(session.display.lastJudgment?.judgment).toBe('SYNC');
  });

  it('놓친 note는 advance() 반복만으로 MISS가 된다(judgeAdvance 배선)', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: false,
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
    });

    session.advance(LEAD_IN_MS + 1000);

    expect(session.judgeState.hits[0]).toBe('missed');
    expect(session.display.lastJudgment?.judgment).toBe('MISS');
  });
});

describe('createGameSession — autoplay', () => {
  it('입력 없이도 정확한 타이밍에 SYNC로 확정한다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: true,
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
    });

    session.advance(LEAD_IN_MS);

    expect(session.judgeState.hits[0]).toBe('hit');
    expect(session.display.lastJudgment).toEqual({ judgment: 'SYNC', atMs: 0 });
  });
});

describe('createGameSession — 곡 종료', () => {
  it('songEnd 이후로는 advance가 더 이상 judge를 진행시키지 않는다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);
    const onSongEnd = vi.fn();

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: true,
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd },
    });

    session.advance(LEAD_IN_MS + songEnd.songEndMs + 1);
    expect(onSongEnd).toHaveBeenCalledTimes(1);
    expect(session.engine.finished).toBe(true);

    const shared = ctx.sharedMs;
    session.advance(LEAD_IN_MS + songEnd.songEndMs + 5000);
    expect(ctx.sharedMs).toBe(shared);
  });
});
