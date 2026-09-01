import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PREVIEW_DELAY_MS, PREVIEW_FADE_OUT_MS, PREVIEW_LOOP_MS } from '../core/core-constants.js';
import { createPreviewController, type PreviewSource } from './game-song-preview.js';
import type { AudioEnv } from '../env/env-audio.js';

function fakeAudio(): AudioEnv & { plays: Array<{ buffer: unknown; fromMs: number }> } {
  const plays: Array<{ buffer: unknown; fromMs: number }> = [];
  return {
    plays,
    async decode() {
      throw new Error('not used in these tests');
    },
    play(buffer, fromMs) {
      plays.push({ buffer, fromMs });
    },
    stop: vi.fn(),
    getPositionMs: () => null,
    setVolume: vi.fn(),
  };
}

const source: PreviewSource = { buffer: {} as AudioBuffer, startMs: 1234 };

describe('createPreviewController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('PREVIEW_DELAY_MS 전에는 재생하지 않는다', () => {
    const audio = fakeAudio();
    const controller = createPreviewController(audio);
    const load = vi.fn(async () => source);

    controller.onCursorSettle(load);
    vi.advanceTimersByTime(PREVIEW_DELAY_MS - 1);

    expect(load).not.toHaveBeenCalled();
    expect(audio.plays).toEqual([]);
  });

  it('PREVIEW_DELAY_MS 지나면 load()로 얻은 소스를 previewStartMs부터 재생한다', async () => {
    const audio = fakeAudio();
    const controller = createPreviewController(audio);
    const load = vi.fn(async () => source);

    controller.onCursorSettle(load);
    await vi.advanceTimersByTimeAsync(PREVIEW_DELAY_MS);

    expect(audio.plays).toEqual([{ buffer: source.buffer, fromMs: source.startMs }]);
  });

  it('지연 중 커서가 다시 움직이면 이전 예약을 취소하고 새로 잰다', async () => {
    const audio = fakeAudio();
    const controller = createPreviewController(audio);
    const firstLoad = vi.fn(async () => source);
    const secondLoad = vi.fn(async () => ({ ...source, startMs: 9999 }));

    controller.onCursorSettle(firstLoad);
    vi.advanceTimersByTime(PREVIEW_DELAY_MS - 1);
    controller.onCursorSettle(secondLoad);
    await vi.advanceTimersByTimeAsync(PREVIEW_DELAY_MS);

    expect(firstLoad).not.toHaveBeenCalled();
    expect(audio.plays).toEqual([{ buffer: source.buffer, fromMs: 9999 }]);
  });

  it('PREVIEW_LOOP_MS 지나면 시작 지점으로 돌아가 다시 재생한다', async () => {
    const audio = fakeAudio();
    const controller = createPreviewController(audio);
    controller.onCursorSettle(async () => source);

    await vi.advanceTimersByTimeAsync(PREVIEW_DELAY_MS);
    await vi.advanceTimersByTimeAsync(PREVIEW_LOOP_MS);

    expect(audio.plays).toEqual([
      { buffer: source.buffer, fromMs: source.startMs },
      { buffer: source.buffer, fromMs: source.startMs },
    ]);
  });

  it('루프 구간 마지막 PREVIEW_FADE_OUT_MS 동안 volume을 점점 낮춘다', async () => {
    const audio = fakeAudio();
    const controller = createPreviewController(audio);
    controller.onCursorSettle(async () => source);

    await vi.advanceTimersByTimeAsync(PREVIEW_DELAY_MS);
    (audio.setVolume as ReturnType<typeof vi.fn>).mockClear();
    await vi.advanceTimersByTimeAsync(PREVIEW_LOOP_MS - PREVIEW_FADE_OUT_MS + 100);

    expect(audio.setVolume).toHaveBeenCalled();
    const calls = (audio.setVolume as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(calls[calls.length - 1]).toBeLessThan(1);
  });

  it('stop()이 재생·모든 예약을 취소한다', () => {
    const audio = fakeAudio();
    const controller = createPreviewController(audio);
    controller.onCursorSettle(async () => source);

    controller.stop();
    vi.advanceTimersByTime(PREVIEW_DELAY_MS + PREVIEW_LOOP_MS);

    expect(audio.plays).toEqual([]);
    expect(audio.stop).toHaveBeenCalled();
  });

  it('load()가 null을 돌려주면(예: asset 없음) 재생하지 않는다', async () => {
    const audio = fakeAudio();
    const controller = createPreviewController(audio);
    controller.onCursorSettle(async () => null);

    await vi.advanceTimersByTimeAsync(PREVIEW_DELAY_MS);

    expect(audio.plays).toEqual([]);
  });
});
