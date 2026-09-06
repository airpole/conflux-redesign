import { describe, expect, it, vi } from 'vitest';
import { LEAD_IN_MS, RESUME_LEAD_MS, SONG_END_TAIL_MS } from '../core/core-constants.js';
import { startEngineSession } from './game-engine.js';
import type { CTX } from './game-ctx.js';

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

describe('startEngineSession — lead-in', () => {
  it('세션을 연 순간 시계는 -LEAD_IN_MS다', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd: vi.fn() });
    session.tick(0);
    expect(ctx.sharedMs).toBe(-LEAD_IN_MS);
  });

  it('lead-in 3초 뒤 정확히 tick 0에서 음악이 시작된다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    const session = startEngineSession(ctx, 0, 1, { onAudioStart, onSongEnd: vi.fn() });

    session.tick(LEAD_IN_MS - 1);
    expect(onAudioStart).not.toHaveBeenCalled();
    expect(ctx.sharedMs).toBeCloseTo(-1, 5);

    session.tick(LEAD_IN_MS);
    expect(onAudioStart).toHaveBeenCalledTimes(1);
    expect(onAudioStart).toHaveBeenCalledWith(0);
    expect(ctx.sharedMs).toBeCloseTo(0, 5);
  });

  it('음악은 한 번만 시작된다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    const session = startEngineSession(ctx, 0, 1, { onAudioStart, onSongEnd: vi.fn() });

    session.tick(LEAD_IN_MS);
    session.tick(LEAD_IN_MS + 16);
    session.tick(LEAD_IN_MS + 32);

    expect(onAudioStart).toHaveBeenCalledTimes(1);
  });

  it('playbackRate가 시계 속도를 바꾼다', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(ctx, 0, 2, { onAudioStart: vi.fn(), onSongEnd: vi.fn() });
    session.tick(LEAD_IN_MS / 2);
    expect(ctx.sharedMs).toBeCloseTo(0, 5);
  });
});

describe('startEngineSession — 곡 종료', () => {
  it('songEndMs(contentEndMs + SONG_END_TAIL_MS) 이전엔 끝나지 않는다', () => {
    const ctx = fakeCtx(1000);
    const onSongEnd = vi.fn();
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd });
    session.tick(LEAD_IN_MS + 1000 + SONG_END_TAIL_MS);
    expect(onSongEnd).not.toHaveBeenCalled();
    expect(session.finished).toBe(false);
  });

  it('songEndMs를 넘으면 한 번만 끝나고 idle 재드로우를 호출한다', () => {
    const ctx = fakeCtx(1000);
    const onSongEnd = vi.fn();
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd });

    session.tick(LEAD_IN_MS + 1000 + SONG_END_TAIL_MS + 1);
    expect(onSongEnd).toHaveBeenCalledTimes(1);
    expect(ctx.redrawIdle).toHaveBeenCalledTimes(1);
    expect(session.finished).toBe(true);

    session.tick(LEAD_IN_MS + 1000 + SONG_END_TAIL_MS + 100);
    expect(onSongEnd).toHaveBeenCalledTimes(1);
  });

  it('종료 프레임 이후로는 sharedMs를 더 쓰지 않는다', () => {
    const ctx = fakeCtx(1000);
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd: vi.fn() });
    session.tick(LEAD_IN_MS + 1000 + SONG_END_TAIL_MS + 1);
    const msAtEnd = ctx.sharedMs;
    session.tick(LEAD_IN_MS + 1000 + SONG_END_TAIL_MS + 5000);
    expect(ctx.sharedMs).toBe(msAtEnd);
  });
});

describe('startEngineSession — pause·Resume (judge.md §10 "Pause Resume")', () => {
  it('pause하면 시계가 그 시점 값에 얼어붙는다', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd: vi.fn() });
    session.tick(LEAD_IN_MS + 500);
    expect(ctx.sharedMs).toBeCloseTo(500, 5);

    session.pause();
    expect(session.paused).toBe(true);

    session.tick(LEAD_IN_MS + 5000);
    expect(ctx.sharedMs).toBeCloseTo(500, 5);
  });

  it('resume 호출 뒤 RESUME_LEAD_MS 동안은 여전히 anchor에 얼어 있다', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd: vi.fn() });
    session.tick(LEAD_IN_MS + 500);
    session.pause();

    session.resume(LEAD_IN_MS + 5000);
    expect(session.paused).toBe(true); // 카운트다운도 paused다.

    session.tick(LEAD_IN_MS + 5000 + RESUME_LEAD_MS - 1);
    expect(ctx.sharedMs).toBeCloseTo(500, 5);
    expect(session.paused).toBe(true);
  });

  it('RESUME_LEAD_MS가 지나면 되감기 없이 anchor에서 이어 흐른다', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd: vi.fn() });
    session.tick(LEAD_IN_MS + 500);
    session.pause();
    session.resume(LEAD_IN_MS + 5000);

    session.tick(LEAD_IN_MS + 5000 + RESUME_LEAD_MS);
    expect(session.paused).toBe(false);
    expect(ctx.sharedMs).toBeCloseTo(500, 5); // 재개 순간 = anchor, 되감기 없음.

    session.tick(LEAD_IN_MS + 5000 + RESUME_LEAD_MS + 200);
    expect(ctx.sharedMs).toBeCloseTo(700, 5); // 그 뒤로는 정상 진행.
  });

  it('resume 완료 시 음악이 anchor 위치에서 다시 한 번 시작된다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    const session = startEngineSession(ctx, 0, 1, { onAudioStart, onSongEnd: vi.fn() });
    session.tick(LEAD_IN_MS + 500);
    session.pause();
    session.resume(LEAD_IN_MS + 5000);
    session.tick(LEAD_IN_MS + 5000 + RESUME_LEAD_MS);

    expect(onAudioStart).toHaveBeenCalledTimes(2);
    expect(onAudioStart).toHaveBeenLastCalledWith(500);
  });

  it('paused가 아닐 때 resume은 아무 일도 안 한다', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd: vi.fn() });
    session.tick(LEAD_IN_MS + 500);
    session.resume(LEAD_IN_MS + 5000); // pause 안 한 상태 — no-op.
    session.tick(LEAD_IN_MS + 600);
    expect(ctx.sharedMs).toBeCloseTo(600, 5);
  });

  // F02 — pause 전이에 음악 정지 훅이 연결돼야 한다.
  it('pause()가 실제로 paused로 전이할 때 onPause가 정확히 한 번 불린다', () => {
    const ctx = fakeCtx(10000);
    const onPause = vi.fn();
    const session = startEngineSession(ctx, 0, 1, {
      onAudioStart: vi.fn(),
      onSongEnd: vi.fn(),
      onPause,
    });
    session.tick(LEAD_IN_MS + 500);
    session.pause();
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('이미 paused인 상태에서 다시 pause()를 불러도 onPause는 중복 호출되지 않는다(멱등)', () => {
    const ctx = fakeCtx(10000);
    const onPause = vi.fn();
    const session = startEngineSession(ctx, 0, 1, {
      onAudioStart: vi.fn(),
      onSongEnd: vi.fn(),
      onPause,
    });
    session.tick(LEAD_IN_MS + 500);
    session.pause();
    session.pause();
    session.pause();
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('resuming 카운트다운 중에는 pause()가 onPause를 다시 부르지 않는다', () => {
    const ctx = fakeCtx(10000);
    const onPause = vi.fn();
    const session = startEngineSession(ctx, 0, 1, {
      onAudioStart: vi.fn(),
      onSongEnd: vi.fn(),
      onPause,
    });
    session.tick(LEAD_IN_MS + 500);
    session.pause();
    session.resume(LEAD_IN_MS + 5000);
    session.pause(); // 카운트다운 중 — 이미 resuming/paused 취급이라 no-op.
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('종료된 세션에는 onPause가 불리지 않는다', () => {
    const ctx = fakeCtx(1000);
    const onPause = vi.fn();
    const session = startEngineSession(ctx, 0, 1, {
      onAudioStart: vi.fn(),
      onSongEnd: vi.fn(),
      onPause,
    });
    session.tick(LEAD_IN_MS + 5000); // songEnd + tail을 넘겨 종료.
    expect(session.finished).toBe(true);
    session.pause();
    expect(onPause).not.toHaveBeenCalled();
  });

  it('onPause를 넘기지 않아도 pause()는 정상 동작한다(선택적 훅)', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd: vi.fn() });
    session.tick(LEAD_IN_MS + 500);
    expect(() => session.pause()).not.toThrow();
    expect(session.paused).toBe(true);
  });
});

describe('startEngineSession — mid-start(M5-6, judge.md §10)', () => {
  it('startChartMs를 넘기면 세션을 연 순간 시계는 startChartMs - leadInMs다', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      3000,
      LEAD_IN_MS,
    );
    session.tick(0);
    expect(ctx.sharedMs).toBeCloseTo(3000 - LEAD_IN_MS, 5);
    expect(session.paused).toBe(true); // leadIn phase — 판정 없음, keydown/up만.
  });

  it('anchor(startChartMs)에 도달하면 leadIn이 끝나고 paused가 풀린다', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      3000,
      LEAD_IN_MS,
    );
    session.tick(LEAD_IN_MS - 1);
    expect(session.paused).toBe(true);
    expect(ctx.sharedMs).toBeCloseTo(3000 - 1, 5);

    session.tick(LEAD_IN_MS);
    expect(session.paused).toBe(false);
    expect(ctx.sharedMs).toBeCloseTo(3000, 5);
  });

  it('leadInMs=0이면 카운트다운 없이 첫 프레임부터 즉시 running이다(test scene 즉시 재생)', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      3000,
      0,
    );
    session.tick(0);
    expect(session.paused).toBe(false);
    expect(ctx.sharedMs).toBeCloseTo(3000, 5);

    session.tick(200);
    expect(ctx.sharedMs).toBeCloseTo(3200, 5);
  });

  it('audioStartThreshold는 startChartMs다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart, onSongEnd: vi.fn() },
      3000,
      LEAD_IN_MS,
    );
    session.tick(LEAD_IN_MS - 1);
    expect(onAudioStart).not.toHaveBeenCalled();
    session.tick(LEAD_IN_MS);
    expect(onAudioStart).toHaveBeenCalledWith(3000);
  });

  it('leadIn 구간에서도 pause할 수 있다(anchor 이전에 얼어붙는다)', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart: vi.fn(), onSongEnd: vi.fn() },
      3000,
      LEAD_IN_MS,
    );
    session.tick(1000);
    expect(session.paused).toBe(true); // 아직 leadIn.
    const frozenAt = ctx.sharedMs;

    session.pause();
    expect(session.paused).toBe(true);
    session.tick(5000);
    expect(ctx.sharedMs).toBeCloseTo(frozenAt, 5); // pause가 leadIn 값을 그대로 얼렸다.
  });

  it('startChartMs===0·leadInMs 기본값이면 기존 tick-0 lead-in과 동일하다', () => {
    const ctx = fakeCtx(10000);
    const session = startEngineSession(ctx, 0, 1, { onAudioStart: vi.fn(), onSongEnd: vi.fn() });
    session.tick(0);
    expect(session.paused).toBe(false); // 기존 동작: tick-0 lead-in은 애초부터 'running'.
    expect(ctx.sharedMs).toBeCloseTo(-LEAD_IN_MS, 5);
  });
});

describe('startEngineSession — chart/device audio offset 좌표 변환(F03, timing.md §8)', () => {
  it('두 offset을 안 넘기면(기본 0) 이전과 동일하게 startChartMs에서 fromMs=startChartMs로 트리거된다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    const session = startEngineSession(ctx, 0, 1, { onAudioStart, onSongEnd: vi.fn() });
    session.tick(LEAD_IN_MS);
    expect(onAudioStart).toHaveBeenCalledWith(0);
  });

  it('chartOffset 양수면 tick0에 이미 그만큼 진행된 buffer 위치로 시작한다(musicEndMs = musicDurationMs - offset과 정합)', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    // chartOffsetMs=300 — bufferPos(trueMs) = trueMs + 300, trueMs=0(tick0)이면 300.
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart, onSongEnd: vi.fn() },
      0,
      LEAD_IN_MS,
      0,
      300,
    );
    session.tick(LEAD_IN_MS);
    expect(onAudioStart).toHaveBeenCalledWith(300);
  });

  it('chartOffset 음수면 tick0에도 아직 buffer가 시작 전이라 -offset 시점까지 트리거를 늦추고 fromMs=0으로 시작한다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    // chartOffsetMs=-300 — bufferPos(0) = -300(음수, 아직 시작 전) → -chartOffsetMs=300ms까지 늦춘다.
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart, onSongEnd: vi.fn() },
      0,
      LEAD_IN_MS,
      0,
      -300,
    );

    session.tick(LEAD_IN_MS); // curMs=0 — 아직 트리거 전이어야 한다.
    expect(onAudioStart).not.toHaveBeenCalled();

    session.tick(LEAD_IN_MS + 300); // curMs=300 — 이제 트리거.
    expect(onAudioStart).toHaveBeenCalledTimes(1);
    expect(onAudioStart).toHaveBeenCalledWith(0);
  });

  it('audioOffset 양수면 device 출력 지연을 보정하려고 그만큼 더 일찍 트리거하되 fromMs는 원래 위치 그대로다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    // audioOffsetMs=200 — threshold = 0(trueMs) - 200 = -200. curMs=-200에서 트리거, fromMs는 여전히 0.
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart, onSongEnd: vi.fn() },
      0,
      LEAD_IN_MS,
      200,
      0,
    );

    session.tick(LEAD_IN_MS - 200 - 1);
    expect(onAudioStart).not.toHaveBeenCalled();

    session.tick(LEAD_IN_MS - 200);
    expect(onAudioStart).toHaveBeenCalledTimes(1);
    expect(onAudioStart).toHaveBeenCalledWith(0);
  });

  it('audioOffset 음수면 device 출력이 앞서 나오는 걸 보정하려고 그만큼 더 늦게 트리거한다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart, onSongEnd: vi.fn() },
      0,
      LEAD_IN_MS,
      -200,
      0,
    );

    session.tick(LEAD_IN_MS + 200 - 1);
    expect(onAudioStart).not.toHaveBeenCalled();

    session.tick(LEAD_IN_MS + 200);
    expect(onAudioStart).toHaveBeenCalledTimes(1);
    expect(onAudioStart).toHaveBeenCalledWith(0);
  });

  it('두 offset이 함께 있어도 독립적으로 합성된다(chartOffset=500, audioOffset=100)', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    // trueMs = max(0, -500) = 0. fromMs = 0+500 = 500. threshold = 0-100 = -100.
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart, onSongEnd: vi.fn() },
      0,
      LEAD_IN_MS,
      100,
      500,
    );

    session.tick(LEAD_IN_MS - 100);
    expect(onAudioStart).toHaveBeenCalledTimes(1);
    expect(onAudioStart).toHaveBeenCalledWith(500);
  });

  it('Resume에서도 같은 좌표 변환이 anchor 기준으로 다시 적용된다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart, onSongEnd: vi.fn() },
      0,
      LEAD_IN_MS,
      0,
      300,
    );
    session.tick(LEAD_IN_MS + 500);
    expect(onAudioStart).toHaveBeenCalledWith(300); // 첫 시작.

    session.pause();
    const anchor = ctx.sharedMs; // 500
    session.resume(LEAD_IN_MS + 5000);
    session.tick(LEAD_IN_MS + 5000 + RESUME_LEAD_MS);

    expect(onAudioStart).toHaveBeenCalledTimes(2);
    expect(onAudioStart).toHaveBeenLastCalledWith(anchor + 300); // anchor(500) + chartOffset(300).
  });

  it('mid-start(startChartMs>0)에서도 같은 변환을 쓴다', () => {
    const ctx = fakeCtx(10000);
    const onAudioStart = vi.fn();
    const session = startEngineSession(
      ctx,
      0,
      1,
      { onAudioStart, onSongEnd: vi.fn() },
      1000, // startChartMs
      0, // leadInMs=0(즉시재생)
      0,
      200, // chartOffsetMs
    );
    session.tick(0);
    expect(onAudioStart).toHaveBeenCalledWith(1200); // trueMs=1000, fromMs=1000+200.
  });
});
