import { describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import { DEFAULT_SETTINGS } from '../core/core-settings.js';
import { LEAD_IN_MS, RESUME_LEAD_MS } from '../core/core-constants.js';
import { buildTimeline, songEndOf, tickToMs } from '../core/core-timing.js';
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd },
      hitSound: null,
    });

    session.advance(LEAD_IN_MS + songEnd.songEndMs + 1);
    expect(onSongEnd).toHaveBeenCalledTimes(1);
    expect(session.engine.finished).toBe(true);

    const shared = ctx.sharedMs;
    session.advance(LEAD_IN_MS + songEnd.songEndMs + 5000);
    expect(ctx.sharedMs).toBe(shared);
  });

  it('자연 종료 시 result가 채워진다', () => {
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    expect(session.result).toBeNull();
    session.advance(LEAD_IN_MS); // note(tick 0)를 autoplay가 먼저 확정하게 한다.
    session.advance(LEAD_IN_MS + songEnd.songEndMs + 1);
    expect(session.result).not.toBeNull();
    expect(session.result!.state).toBe('AS'); // autoplay = 전부 SYNC
  });
});

describe('createGameSession — 게이지', () => {
  it('MISS가 게이지·counts에 반영된다', () => {
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    session.advance(LEAD_IN_MS + 1000); // note를 놓쳐 MISS

    expect(session.gaugeState.counts.MISS).toBe(1);
    expect(session.gaugeState.gauge.normalPct).toBeLessThan(100);
  });

  it('terminate 모드는 게이지 사망(hardPct 0) 즉시 판을 끝낸다', () => {
    // hard MISS delta = -5, 시작 100 — 20번을 놓쳐야 죽는다(core-constants
    // GAUGE_DELTA.hard.MISS). 21개 노트를 한 박씩 띄워 전부 미스시킨다.
    const notes = Array.from({ length: 21 }, (_, i) => ({
      startTick: i * 480,
      duration: 0,
      lane: 1 as const,
      isWide: false,
    }));
    const chart = makeChart({ notes });
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
      autoplay: false,
      gaugeMode: 'hard',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd },
      hitSound: null,
    });

    const lastNoteMs = tickToMs(timeline, notes[notes.length - 1]!.startTick);
    session.advance(LEAD_IN_MS + lastNoteMs + 500); // 전부 놓쳐 hard가 죽는다.

    expect(session.gaugeState.forceEnded).toBe(true);
    expect(session.result).not.toBeNull();
    expect(session.result!.state).toBe('F');
    // songEndMs까지 기다리지 않고 그 자리에서 끝났다 — 자연 종료 훅은 안 불렸다.
    expect(onSongEnd).not.toHaveBeenCalled();

    const msAtEnd = ctx.sharedMs;
    session.advance(LEAD_IN_MS + 2000);
    expect(ctx.sharedMs).toBe(msAtEnd); // terminate 이후로는 더 안 민다.
  });
});

describe('createGameSession — pause·Resume', () => {
  it('pause 중에는 입력이 registerKeyDown/Up만 하고 판정을 안 낸다', () => {
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    session.advance(LEAD_IN_MS);
    session.pause();
    expect(session.engine.paused).toBe(true);

    session.input.onKeyDown(fakeKeyEvent('KeyE', LEAD_IN_MS));
    expect(session.judgeState.hits[0]).toBe('pending');
    expect(session.judgeState.keysHeld.has('key1')).toBe(true);
  });

  it('advance는 pause 중 chart 시간을 진행시키지 않는다', () => {
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    session.advance(LEAD_IN_MS + 200);
    session.pause();
    const shared = ctx.sharedMs;

    session.advance(LEAD_IN_MS + 5000);
    expect(ctx.sharedMs).toBe(shared);
  });

  it('resume 뒤 RESUME_LEAD_MS 지나면 되감기 없이 이어 흐르고 입력이 다시 판정을 낸다', () => {
    // note를 한참 뒤에 둬서 pause·resume 카운트다운 동안은 판정창에 안 걸린다.
    const chart = makeChart({
      notes: [{ startTick: 480 * 20, duration: 0, lane: 1, isWide: false }],
    });
    const timeline = buildTimeline(chart);
    const noteMs = tickToMs(timeline, chart.notes[0]!.startTick);
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    session.advance(LEAD_IN_MS + 100);
    session.pause();
    const anchor = ctx.sharedMs;

    session.resume(LEAD_IN_MS + 5000);
    session.advance(LEAD_IN_MS + 5000 + RESUME_LEAD_MS - 1);
    expect(ctx.sharedMs).toBeCloseTo(anchor, 5); // 카운트다운 중엔 그대로.
    expect(session.engine.paused).toBe(true);

    session.advance(LEAD_IN_MS + 5000 + RESUME_LEAD_MS + 100);
    expect(session.engine.paused).toBe(false);
    expect(ctx.sharedMs).toBeCloseTo(anchor + 100, 5); // 되감기 없음.

    // 재개 이후 시계를 note 시각까지 마저 밀고 입력하면 정상 판정된다.
    const resumeCompleteWallMs = LEAD_IN_MS + 5000 + RESUME_LEAD_MS;
    const wallAtNote = resumeCompleteWallMs + (noteMs - anchor);
    session.advance(wallAtNote);
    session.input.onKeyDown(fakeKeyEvent('KeyE', wallAtNote));
    expect(session.judgeState.hits[0]).toBe('hit');
  });
});

describe('createGameSession — mid-start(M5-6, judge.md §10)', () => {
  it('startChartMs 이전 note는 세션을 여는 순간 이미 SYNC로 시드돼 있다', () => {
    const chart = makeChart({
      notes: [
        { startTick: 0, duration: 0, lane: 1, isWide: false },
        { startTick: 480 * 10, duration: 0, lane: 2, isWide: false },
      ],
    });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);
    const midMs = tickToMs(timeline, 480 * 5); // 두 note 사이 — 첫 note만 지났다.

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: false,
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
      startChartMs: midMs,
      leadInMs: LEAD_IN_MS,
    });

    expect(session.judgeState.hits[0]).toBe('hit'); // 이미 SYNC로 시드됨.
    expect(session.judgeState.hits[1]).toBe('pending'); // 아직 anchor 이후 note.
    expect(session.gaugeState.counts.SYNC).toBe(1);
  });

  it('leadInMs=0(test scene 즉시 재생)이면 lead-in 없이 곧바로 anchor에서 시작한다', () => {
    const chart = makeChart({
      notes: [{ startTick: 480 * 5, duration: 0, lane: 1, isWide: false }],
    });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);
    const midMs = tickToMs(timeline, 480 * 5);

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: false,
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
      startChartMs: midMs,
      leadInMs: 0,
    });

    session.advance(0); // chartStartMs===startChartMs이므로 첫 프레임에 바로 anchor를 넘는다.
    expect(session.engine.paused).toBe(false); // 카운트다운 없이 바로 running.
    expect(ctx.sharedMs).toBeCloseTo(midMs, 5);
    session.input.onKeyDown(fakeKeyEvent('KeyE', 0));
    expect(session.judgeState.hits[0]).toBe('hit');
    expect(session.display.lastJudgment?.judgment).toBe('SYNC');
  });

  it('anchor 이전(leadIn) 구간의 입력은 keysHeld만 갱신하고 판정을 만들지 않는다', () => {
    const chart = makeChart({
      notes: [{ startTick: 480 * 5, duration: 0, lane: 1, isWide: false }],
    });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);
    const midMs = tickToMs(timeline, 480 * 5);

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: false,
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
      startChartMs: midMs,
      leadInMs: LEAD_IN_MS,
    });

    session.advance(LEAD_IN_MS - 100); // 아직 anchor 전 — leadIn.
    expect(session.engine.paused).toBe(true);

    session.input.onKeyDown(fakeKeyEvent('KeyE', LEAD_IN_MS - 100));
    expect(session.judgeState.hits[0]).toBe('pending');
    expect(session.judgeState.keysHeld.has('key1')).toBe(true);
  });

  it('startChartMs===0이면 시드가 no-op이라 기존 tick-0 gameplay와 동일하다', () => {
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    expect(session.judgeState.hits[0]).toBe('pending');
    session.advance(LEAD_IN_MS);
    session.input.onKeyDown(fakeKeyEvent('KeyE', LEAD_IN_MS));
    expect(session.judgeState.hits[0]).toBe('hit');
  });
});

describe('createGameSession — result 필드 (D-2026-054)', () => {
  it('자연 종료(clear) 시 gaugeTrace가 정확히 200개, progress는 1이다', () => {
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    const before = Date.now();
    session.advance(LEAD_IN_MS);
    session.advance(LEAD_IN_MS + songEnd.songEndMs + 1);

    expect(session.result!.gaugeTrace).toHaveLength(200);
    expect(session.result!.progress).toBe(1);
    expect(session.result!.playedAt).toBeGreaterThanOrEqual(before);
  });

  it('forceEnded 시 gaugeTrace가 앞쪽 일부만 차고 progress는 종료 지점의 진행률이다', () => {
    // hard MISS delta = -5, 시작 100 — 21개를 한 박씩 띄워 전부 미스시켜 죽인다.
    // 훨씬 뒤(tick 480*200)에 note를 하나 더 둬 contentEndMs를 늘린다 — 죽는
    // 시점이 곡 진행률의 앞쪽 일부가 되게 하는 장치일 뿐, 판정까지 가지 않는다.
    const notes = [
      ...Array.from({ length: 21 }, (_, i) => ({
        startTick: i * 480,
        duration: 0,
        lane: 1 as const,
        isWide: false,
      })),
      { startTick: 480 * 200, duration: 0, lane: 2 as const, isWide: false },
    ];
    const chart = makeChart({ notes });
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
      gaugeMode: 'hard',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    const lastMissNoteMs = tickToMs(timeline, notes[20]!.startTick); // 21번째(죽는 순간) — 꼬리 note 아님.
    session.advance(LEAD_IN_MS + lastMissNoteMs + 500);

    expect(session.gaugeState.forceEnded).toBe(true);
    expect(session.result!.gaugeTrace.length).toBeLessThan(200);
    expect(session.result!.progress).toBeGreaterThan(0);
    expect(session.result!.progress).toBeLessThan(1);
    expect(session.result!.progress).toBeCloseTo(ctx.sharedMs / songEnd.contentEndMs, 5);
  });

  it('fastCount/slowCount는 fastSlow 이벤트만 세고, timingErrors는 MISS를 NaN으로 넣는다', () => {
    const chart = makeChart({
      notes: [
        { startTick: 0, duration: 0, lane: 1, isWide: false },
        { startTick: 480, duration: 0, lane: 2, isWide: false },
      ],
    });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);
    const note2Ms = tickToMs(timeline, 480);

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: false,
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    session.advance(LEAD_IN_MS);
    // 40ms 일찍 쳐서 PERFECT+FAST를 낸다(WINDOW_PERFECT_MS=50 안, SYNC=25 밖).
    session.input.onKeyDown(fakeKeyEvent('KeyE', LEAD_IN_MS - 40));
    expect(session.display.lastJudgment?.judgment).toBe('PERFECT');

    // 두 번째 note는 놓쳐 MISS.
    session.advance(LEAD_IN_MS + note2Ms + 1000);
    session.advance(LEAD_IN_MS + songEnd.songEndMs + 1);

    expect(session.result!.fastCount).toBe(1);
    expect(session.result!.slowCount).toBe(0);
    expect(session.result!.timingErrors).toHaveLength(2);
    expect(session.result!.timingErrors[0]).toBeCloseTo(-40, 5);
    expect(Number.isNaN(session.result!.timingErrors[1])).toBe(true);
  });
});

describe('createGameSession — 히트음', () => {
  function fakeHitSound() {
    const source = { buffer: null, connect: vi.fn(), start: vi.fn() };
    const gain = { gain: { value: 0 }, connect: vi.fn() };
    const ctx = {
      currentTime: 0,
      destination: {},
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => gain),
    };
    return { source, ctx: ctx as unknown as AudioContext, buffer: {} as AudioBuffer };
  }

  it('성공 판정마다 히트음을 재생한다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);
    const hitSound = fakeHitSound();

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: false,
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: { ctx: hitSound.ctx, buffer: hitSound.buffer },
    });

    session.advance(LEAD_IN_MS);
    session.input.onKeyDown(fakeKeyEvent('KeyE', LEAD_IN_MS));

    expect(session.judgeState.hits[0]).toBe('hit');
    expect(hitSound.source.start).toHaveBeenCalledTimes(1);
  });

  it('MISS는 히트음을 재생하지 않는다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const timeline = buildTimeline(chart);
    const songEnd = songEndOf(timeline, chart, null);
    const ctx = fakeCtx(songEnd.contentEndMs);
    const hitSound = fakeHitSound();

    const session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: DEFAULT_SETTINGS.keyBindings,
      mirror: false,
      visualOffset: 0,
      autoplay: false,
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: { ctx: hitSound.ctx, buffer: hitSound.buffer },
    });

    // 입력 없이 계속 진행 — note를 놓쳐 MISS가 된다.
    session.advance(LEAD_IN_MS + 1000);

    expect(session.judgeState.hits[0]).toBe('missed');
    expect(hitSound.source.start).not.toHaveBeenCalled();
  });

  it('hitSound가 null이면 재생하지 않고도 판정은 그대로 동작한다', () => {
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
      gaugeMode: 'normal',
      startNowMs: 0,
      playbackRate: 1,
      engineHooks: { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      hitSound: null,
    });

    session.advance(LEAD_IN_MS);
    session.input.onKeyDown(fakeKeyEvent('KeyE', LEAD_IN_MS));

    expect(session.judgeState.hits[0]).toBe('hit');
  });
});
