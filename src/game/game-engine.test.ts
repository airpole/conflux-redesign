import { describe, expect, it, vi } from 'vitest';
import { LEAD_IN_MS, SONG_END_TAIL_MS } from '../core/core-constants.js';
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
