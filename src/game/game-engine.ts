/**
 * engine loop — lead-in부터 곡 종료까지 `CTX.sharedMs`를 미는 시계. pause·
 * Resume(되감기 없는 카운트다운 재개, `judge.md` §10 "Pause Resume")도 여기 산다.
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
 *
 * pause 중에는 `ctx.sharedMs`가 pause 시점 값(anchor)에 얼어붙는다. resume은
 * `RESUME_LEAD_MS` 카운트다운 뒤 **같은 anchor**에서 이어 흐른다 — 되감기가
 * 없고, 카운트다운 동안에도 시계는 anchor에 얼어 있다(mid-start의 `LEAD_IN_MS`
 * 구간이 실제로 흐르는 것과 다르다). mid-start와 Resume 둘 다 "chart 시간이
 * 흐르지 않는 카운트다운 구간"을 갖지만, `paused`는 둘을 구분하지 않는다 —
 * 호출측(game-judge-input)이 볼 때 둘 다 "keydown/keyup을 등록만 하고 판정은
 * 안 한다"로 동일하기 때문이다.
 *
 * **mid-start(M5-6)** — `startChartMs`(기본 0)를 넘기면 0이 아닌 위치에서
 * 세션을 연다. 시계는 여전히 **흐른다**(`chartStartMs = startChartMs -
 * leadInMs`) — tick0 lead-in과 같은 이유로, 노트 스크롤-인 연출이 그대로
 * 나오게 하려는 것이다. 다만 `startChartMs`보다 이른 실제 노트가 있을 수
 * 있어(tick0 lead-in과 다른 점 — 그쪽은 음수 tick에 노트가 없다는 사실로
 * "판정 없음"이 공짜였지만, mid-start는 그렇지 않다) 이 구간 동안 `paused`가
 * `true`를 돌려주게 해 호출측이 `registerKeyDown`/`registerKeyUp`(판정
 * 시도 없음, `judge.md` §10)만 쓰게 한다. anchor(`startChartMs`)에 도달하는
 * 순간 `phase`가 `running`으로 바뀌지만 — **시드 자체(`seedPlayStateAt`)는
 * 이 파일이 부르지 않는다.** `anchorMs`가 세션을 열기 전부터 이미 알려진
 * 값이라 프레임을 기다릴 이유가 없다 — `game-session.ts`가
 * `createGameSession()` 안에서 세션을 만들기 전에 동기로 한 번 부른다.
 *
 * **`leadInMs`**(기본 `LEAD_IN_MS`)도 함께 받는다 — editor test scene의
 * "즉시 재생"(`editor-graph.md` §5, lead-in 없음)은 `leadInMs=0`으로
 * 넘긴다: `chartStartMs`가 `startChartMs`와 같아져 `leadIn` phase가 사실상
 * 첫 프레임에 바로 끝난다(카운트다운 없이 즉시 `running`).
 */

import { LEAD_IN_MS, RESUME_LEAD_MS, SONG_END_TAIL_MS } from '../core/core-constants.js';
import type { CTX } from './game-ctx.js';

export interface EngineHooks {
  /** chart 시계가 `thresholdMs`를 처음 넘는 프레임에 한 번, 그 위치와 함께 불린다. */
  onAudioStart(fromMs: number): void;
  /** curMs가 `songEndMs`를 넘는 첫 프레임에 한 번 불리고 세션이 끝난다. */
  onSongEnd(): void;
}

export interface EngineSession {
  /** wall-clock 경과를 밀어넣는다. rAF 콜백에서 매번 `nowMs`로 부른다. */
  tick(nowMs: number): void;
  readonly finished: boolean;
  /** pause 중이거나 resume 카운트다운 중이면 참 — 둘 다 chart 시간이 안 흐른다. */
  readonly paused: boolean;
  /** 지금 시각에서 얼린다. 이미 끝났거나 이미 pause 상태면 아무 일도 안 한다. */
  pause(): void;
  /** `RESUME_LEAD_MS` 뒤 pause 시점 anchor에서 이어 흐른다. `resumeNowMs`는 이 호출의 wall-clock. */
  resume(resumeNowMs: number): void;
  /**
   * wall-clock `nowMs`를 **지금 이 세션의** chart-relative ms로. `tick()`과
   * 완전히 같은 기준점을 쓴다 — 입력 이벤트의 timestamp(`env-input`의
   * `KeyEvent.timestampMs`, wall-clock 기준)를 judge가 받는 chart ms로 바꿀
   * 때 반드시 이 메서드를 거쳐야 한다. 원본 `handlePlayKeyDown`이 keydown
   * 처리 시점에 `playOffMs + (performance.now() − playT0) × rate`로 **다시
   * 계산**한 것과 같다 — keydown이 브라우저 이벤트 자체의 timestamp가
   * 아니라 이 변환을 거친 값을 쓴다.
   *
   * `pause`/`resume`이 시계 기준점을 다시 잡으므로, 세션 밖에서 고정 공식
   * (예: 세션을 열 때의 `startNowMs`만으로 다시 계산)을 쓰면 재개 이후 값이
   * 어긋난다 — 그래서 독립 함수가 아니라 세션 메서드다.
   */
  toChartMs(nowMs: number): number;
}

/**
 * lead-in부터 시작하는 세션. `startNowMs`는 세션을 연 시점의 wall-clock
 * (`performance.now()` 등, env-time이 공급). `ctx.contentEndMs +
 * SONG_END_TAIL_MS`가 종료 조건이다(`songEndOf`와 같은 식, [[timing]] §9).
 *
 * `startChartMs`(기본 0)·`leadInMs`(기본 `LEAD_IN_MS`)는 M5-6 mid-start
 * 확장이다 — 헤더 docstring 참조. 세션을 연 뒤 anchor(`startChartMs`)에
 * 닿기 전까지는 `paused`가 `true`다(새 `leadIn` phase) — **시드
 * (`seedPlayStateAt`) 자체는 이 함수가 부르지 않는다**, `game-session.ts`가
 * 세션을 만들기 전에 동기로 한 번 부른다.
 */
export function startEngineSession(
  ctx: CTX,
  startNowMs: number,
  playbackRate: number,
  hooks: EngineHooks,
  startChartMs = 0,
  leadInMs = LEAD_IN_MS,
): EngineSession {
  const songEndMs = ctx.contentEndMs + SONG_END_TAIL_MS;

  // "지금 흐르는 시계"를 (chartStartMs, wallStartMs) 기준점 하나로 표현한다 —
  // curMs = chartStartMs + (nowMs - wallStartMs) × rate. resume은 이 기준점을
  // anchor로 다시 잡는 것으로 표현된다.
  let chartStartMs = startChartMs - leadInMs;
  let wallStartMs = startNowMs;
  let audioStarted = false;
  let audioStartThresholdMs = startChartMs;
  let finished = false;

  type Phase = 'running' | 'paused' | 'resuming' | 'leadIn';
  let phase: Phase = startChartMs === 0 && leadInMs === LEAD_IN_MS ? 'running' : 'leadIn';
  let anchorMs = 0;
  let resumeStartWallMs = 0;

  // paused/resuming 동안만 시계가 얼려 있다 — leadIn은 흐른다(노트 스크롤-인
  // 연출을 유지하려고, 헤더 docstring 참조). tick()과 toChartMs() 둘 다 이
  // 기준점(chartStartMs/wallStartMs 또는 anchorMs)만 보고 계산하므로 항상
  // 서로 같은 값을 낸다 — 재개 이후 별도 공식으로 다시 계산할 필요가 없다.
  function currentChartMs(nowMs: number): number {
    if (phase === 'paused' || phase === 'resuming') return anchorMs;
    return chartStartMs + (nowMs - wallStartMs) * playbackRate;
  }

  return {
    get finished() {
      return finished;
    },
    get paused() {
      return phase !== 'running';
    },
    pause() {
      if (finished || phase === 'paused' || phase === 'resuming') return;
      anchorMs = ctx.sharedMs;
      phase = 'paused';
    },
    resume(resumeNowMs) {
      if (finished || phase !== 'paused') return;
      phase = 'resuming';
      resumeStartWallMs = resumeNowMs;
    },
    toChartMs(nowMs) {
      return currentChartMs(nowMs);
    },
    tick(nowMs) {
      if (finished) return;

      if (phase === 'paused') return; // ctx.sharedMs는 anchor에 그대로 얼어 있다.

      if (phase === 'resuming') {
        const elapsed = nowMs - resumeStartWallMs;
        if (elapsed < RESUME_LEAD_MS) return; // 카운트다운 중 — 여전히 anchor.
        // 카운트다운 끝 — anchor에서 이어 흐르도록 기준점을 다시 잡는다.
        phase = 'running';
        chartStartMs = anchorMs;
        wallStartMs = resumeStartWallMs + RESUME_LEAD_MS;
        audioStarted = false;
        audioStartThresholdMs = anchorMs;
      }

      const curMs = currentChartMs(nowMs);

      if (phase === 'leadIn' && curMs >= startChartMs) {
        // mid-start anchor 도달 — 시드는 이미 세션을 열기 전에 끝나 있다
        // (game-session.ts). 여기서는 판정을 막던 phase만 푼다.
        phase = 'running';
      }

      if (!audioStarted && curMs >= audioStartThresholdMs) {
        audioStarted = true;
        hooks.onAudioStart(audioStartThresholdMs);
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
