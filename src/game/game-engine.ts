/**
 * engine loop — lead-in부터 곡 종료까지 `CTX.sharedMs`를 미는 시계.
 *
 * **curMs는 항상 wall-clock 기준이다** `[보존]` — 원본 `play.js` `playLoop`은
 * `playOffMs + (ts − playT0) × playbackRate`로 매 프레임 계산하고, 오디오는
 * 그 시계가 시작점을 지날 때 **한 번** 켤 뿐 이후 프레임마다 오디오 위치로
 * 재동기화하지 않는다. 이 엔진도 같다 — `env-audio.getPositionMs()`는 여기서
 * 안 읽는다.
 *
 * lead-in 3초는 시계를 `-LEAD_IN_MS`에서 출발시키는 것으로 표현된다 — 시간이
 * 흐른다는 사실 자체가 tick 0 이전 구간에도 있으므로, "판정 없음"은 이 파일이
 * 아니라 judge 결선(M2-4)이 chart tick 음수 구간에 노트가 없다는 사실로 이미
 * 만족한다.
 */

import { LEAD_IN_MS, SONG_END_TAIL_MS } from '../core/core-constants.js';
import type { CTX } from './game-ctx.js';

export interface EngineHooks {
  /** curMs가 처음 0 이상이 되는 프레임에 한 번, 음악 시작 위치(ms)와 함께 불린다. */
  onAudioStart(fromMs: number): void;
  /** curMs가 `songEndMs`를 넘는 첫 프레임에 한 번 불리고 세션이 끝난다. */
  onSongEnd(): void;
}

export interface EngineSession {
  /** wall-clock 경과를 밀어넣는다. rAF 콜백에서 매번 `nowMs`로 부른다. */
  tick(nowMs: number): void;
  readonly finished: boolean;
}

/**
 * wall-clock 시각을 chart-relative ms로. 세션 시계와 **완전히 같은 식**이다 —
 * 입력 이벤트의 timestamp(`env-input`의 `KeyEvent.timestampMs`, wall-clock
 * 기준)를 judge가 받는 chart ms로 바꿀 때도 이 식을 그대로 써야 한다. 원본
 * `handlePlayKeyDown`이 keydown 처리 시점에 `PS.playOffMs + (performance.now()
 * − PS.playT0) × rate`로 **다시 계산**한 것과 같다 — keydown이 브라우저
 * 이벤트 자체의 timestamp가 아니라 이 변환을 거친 값을 쓴다.
 */
export function wallClockToChartMs(
  startNowMs: number,
  playbackRate: number,
  nowMs: number,
): number {
  return -LEAD_IN_MS + (nowMs - startNowMs) * playbackRate;
}

/**
 * lead-in부터 시작하는 세션. `startNowMs`는 세션을 연 시점의 wall-clock
 * (`performance.now()` 등, env-time이 공급). `ctx.contentEndMs +
 * SONG_END_TAIL_MS`가 종료 조건이다(`songEndOf`와 같은 식, [[timing]] §9).
 *
 * mid-start·Resume(되감기 없는 카운트다운 재개)은 M2-5 배선 대상이라 여기
 * 없다 — 이 함수는 "처음부터"만 다룬다.
 */
export function startEngineSession(
  ctx: CTX,
  startNowMs: number,
  playbackRate: number,
  hooks: EngineHooks,
): EngineSession {
  const songEndMs = ctx.contentEndMs + SONG_END_TAIL_MS;
  let audioStarted = false;
  let finished = false;

  return {
    get finished() {
      return finished;
    },
    tick(nowMs) {
      if (finished) return;
      const curMs = wallClockToChartMs(startNowMs, playbackRate, nowMs);

      if (!audioStarted && curMs >= 0) {
        audioStarted = true;
        hooks.onAudioStart(0);
      }

      if (curMs > songEndMs) {
        finished = true;
        ctx.redrawIdle();
        hooks.onSongEnd();
        return;
      }

      ctx.sharedMs = curMs;
    },
  };
}
