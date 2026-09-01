/**
 * song-select preview 재생 오케스트레이션 — 단일 출처 [[song-select]] §10,
 * 수치는 `core/constants.md`(`PREVIEW_DELAY_MS`/`PREVIEW_LOOP_MS`/
 * `PREVIEW_FADE_OUT_MS`).
 *
 * §10 규칙: 커서가 멈춘 뒤 `PREVIEW_DELAY_MS` 지나야 재생 시작(그 전에
 * 커서가 다시 움직이면 재생 안 함) → `metadata.previewStartMs`부터 재생 →
 * `PREVIEW_LOOP_MS` 지나면 시작 지점으로 돌아가 반복 → 구간의 마지막
 * `PREVIEW_FADE_OUT_MS` 동안 fade out(fade in 없음).
 *
 * `AudioEnv.setVolume`은 즉시 값을 바꾸는 API라(`env-audio.ts`, WebAudio
 * `AudioParam.linearRampToValueAtTime` 같은 예약형 램프가 없다) fade는
 * 짧은 간격(`FADE_STEP_MS`)마다 volume을 계단식으로 낮추는 근사다 — 매끄러운
 * 램프가 필요해지면 `env-audio.ts`에 램프 API를 추가하는 별도 작업.
 *
 * `scene-loading.ts`와 같은 관례로 실제 `setTimeout`/`setInterval`을 쓰고
 * 테스트는 `vi.useFakeTimers()`로 검증한다(주입식 시계를 쓰지 않는다).
 */
import { PREVIEW_DELAY_MS, PREVIEW_FADE_OUT_MS, PREVIEW_LOOP_MS } from '../core/core-constants.js';
import type { AudioEnv } from '../env/env-audio.js';

const FADE_STEP_MS = 100;

export interface PreviewSource {
  readonly buffer: AudioBuffer;
  readonly startMs: number;
}

export interface PreviewController {
  /** 커서가 새 chart에 멈췄다고 알린다. `PREVIEW_DELAY_MS` 동안 다시
   *  안 불리면 `load()`로 소스를 얻어 재생을 시작한다. 그 전에 다시
   *  부르면(커서가 또 움직임) 이전 예약을 취소하고 새로 잰다. */
  onCursorSettle(load: () => Promise<PreviewSource | null>): void;
  /** 재생 중이면 멈추고 모든 예약(지연·루프·fade)을 취소한다. */
  stop(): void;
}

export function createPreviewController(audio: AudioEnv): PreviewController {
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let loopTimer: ReturnType<typeof setTimeout> | null = null;
  let fadeInterval: ReturnType<typeof setInterval> | null = null;
  let generation = 0; // 비동기 load() 도중에 새 cursor settle이 오면 결과를 버리기 위한 토큰.

  function clearTimers(): void {
    if (delayTimer !== null) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (loopTimer !== null) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
    if (fadeInterval !== null) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
  }

  function scheduleFadeAndLoop(source: PreviewSource, myGeneration: number): void {
    audio.setVolume(1);

    const fadeStartDelay = PREVIEW_LOOP_MS - PREVIEW_FADE_OUT_MS;
    loopTimer = setTimeout(() => {
      if (myGeneration !== generation) return;
      let elapsed = 0;
      fadeInterval = setInterval(() => {
        elapsed += FADE_STEP_MS;
        const remaining = Math.max(0, 1 - elapsed / PREVIEW_FADE_OUT_MS);
        audio.setVolume(remaining);
      }, FADE_STEP_MS);

      loopTimer = setTimeout(() => {
        if (myGeneration !== generation) return;
        if (fadeInterval !== null) {
          clearInterval(fadeInterval);
          fadeInterval = null;
        }
        audio.play(source.buffer, source.startMs);
        scheduleFadeAndLoop(source, myGeneration);
      }, PREVIEW_FADE_OUT_MS);
    }, fadeStartDelay);
  }

  return {
    onCursorSettle(load): void {
      clearTimers();
      audio.stop();
      generation += 1;
      const myGeneration = generation;

      delayTimer = setTimeout(() => {
        void load().then((source) => {
          if (myGeneration !== generation || source === null) return;
          audio.play(source.buffer, source.startMs);
          scheduleFadeAndLoop(source, myGeneration);
        });
      }, PREVIEW_DELAY_MS);
    },
    stop(): void {
      clearTimers();
      generation += 1;
      audio.stop();
    },
  };
}
