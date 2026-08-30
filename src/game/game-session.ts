/**
 * host 배선 — `game-engine`(시계·pause/Resume)·`game-judge-input`(수동 입력)·
 * `game-judge-autoplay`·`game-judge-display`(표시 상태)·`core-gauge`(게이지·
 * clear/fail)를 한 세션으로 묶는다.
 *
 * 판정 계산은 core, 언제 부를지는 game이라는 원칙 그대로: 이 파일은 **누구를
 * 언제 부르는지**만 정하고 판정·게이지 자체는 한 줄도 계산하지 않는다.
 */

import type { Chart } from '../core/core-chart.js';
import {
  buildJudgeNotes,
  createJudgeState,
  judgeAdvance,
  laneMapOf,
  type CandidateContext,
  type JudgeState,
  type JudgmentEvent,
} from '../core/core-judge.js';
import {
  applyGaugeChange,
  computeResult,
  resetGauge,
  type GaugeMode,
  type GaugeState,
  type PlayResult,
} from '../core/core-gauge.js';
import type { LaneKeyId } from '../core/core-settings.js';
import type { Timeline } from '../core/core-timing.js';
import type { CTX } from './game-ctx.js';
import { startEngineSession, type EngineHooks, type EngineSession } from './game-engine.js';
import { advanceAutoplay } from './game-judge-autoplay.js';
import {
  applyJudgmentEvents,
  createJudgeDisplayState,
  pruneHitEffects,
  type JudgeDisplayState,
} from './game-judge-display.js';
import { HIT_EFFECT } from '../render/render-theme.js';
import { playHitSound } from '../env/env-audio.js';
import { createJudgeInputHandlers, type JudgeInputHandlers } from './game-judge-input.js';

/**
 * 히트음 재생에 필요한 것만 추린 입력 — `env-audio.createHitBuffer`로 만든
 * 버퍼와 그걸 재생할 `AudioContext`. `null`이면 무음(오디오 준비 전 등).
 */
export interface HitSoundSource {
  readonly ctx: AudioContext;
  readonly buffer: AudioBuffer;
}

export interface GameSessionOptions {
  readonly ctx: CTX;
  readonly chart: Chart;
  readonly timeline: Timeline;
  readonly keyBindings: Readonly<Record<LaneKeyId, string>>;
  readonly mirror: boolean;
  readonly visualOffset: number;
  readonly autoplay: boolean;
  readonly gaugeMode: GaugeMode;
  readonly startNowMs: number;
  readonly playbackRate: number;
  readonly engineHooks: EngineHooks;
  readonly hitSound: HitSoundSource | null;
}

/**
 * result 화면 전용 필드. core `PlayResult`에 host(진행률·벽시계)만 아는
 * 값을 얹는다 — core는 wall-clock이나 songEnd 진행률을 모른다(D-2026-054).
 */
export interface ResultData extends PlayResult {
  /** 진행률(`GAUGE_TRACE_SAMPLES`) 등분 시점의 확정 tier 값 궤적. */
  readonly gaugeTrace: readonly number[];
  /** 0~1. clear 시 항상 1, forceEnded 시 종료 지점의 진행률. */
  readonly progress: number;
  /** 판정마다 1개. MISS는 `NaN`(히스토그램·σ 계산에서 제외 — D-2026-054 §6.4). */
  readonly timingErrors: Float32Array;
  readonly fastCount: number;
  readonly slowCount: number;
  /** epoch ms. */
  readonly playedAt: number;
}

/** 게이지 궤적 그래프의 고정 샘플 개수(D-2026-054 §6.3). */
export const GAUGE_TRACE_SAMPLES = 200;

export interface GameSession {
  readonly ctx: CTX;
  readonly engine: EngineSession;
  readonly judgeState: JudgeState;
  readonly context: CandidateContext;
  readonly display: JudgeDisplayState;
  readonly gaugeState: GaugeState;
  /** 곡이 끝났거나(자연 종료) terminate로 강제 종료된 뒤에만 값이 있다. */
  readonly result: ResultData | null;
  /**
   * 수동 입력 핸들러. autoplay 세션에도 만들어지지만, 호출측이 env-input에
   * 이걸 실제로 물릴지는 별개다 — autoplay면 물리 입력을 물리지 않는 것으로
   * "입력 무시"가 표현된다(핸들러 자체가 autoplay를 검사하지 않는다).
   */
  readonly input: JudgeInputHandlers;
  readonly autoplay: boolean;
  /** wall-clock `nowMs`로 한 프레임을 민다. rAF 콜백에서 매번 부른다. */
  advance(nowMs: number): void;
  /** Esc 등 — 지금 시각에서 얼린다. */
  pause(): void;
  /** `RESUME_LEAD_MS` 카운트다운 뒤 pause 시점에서 되감기 없이 재개한다. */
  resume(resumeNowMs: number): void;
}

export function createGameSession(options: GameSessionOptions): GameSession {
  const context: CandidateContext = {
    notes: buildJudgeNotes(options.chart, options.timeline),
    laneMap: laneMapOf(options.mirror),
  };
  const judgeState = createJudgeState(context.notes);
  const display = createJudgeDisplayState();
  const gaugeState = resetGauge(options.gaugeMode, context.notes.totalUnits);

  let result: ResultData | null = null;

  // ── result 전용 누적 (D-2026-054) ──────────────────────────
  let lastCurMs = options.startNowMs;
  let fastCount = 0;
  let slowCount = 0;
  const timingErrorsBuf: number[] = [];
  const hardTrace: number[] = [];
  const normalTrace: number[] = [];
  let nextSampleIdx = 0;

  /** 진행률 200등분 경계를 지날 때마다 hard·normal 값을 함께 찍는다(§6.3). */
  const sampleGaugeTrace = (curMs: number): void => {
    const contentEndMs = options.ctx.contentEndMs;
    while (
      nextSampleIdx < GAUGE_TRACE_SAMPLES &&
      curMs >= ((nextSampleIdx + 1) * contentEndMs) / GAUGE_TRACE_SAMPLES
    ) {
      hardTrace.push(gaugeState.gauge.hardPct);
      normalTrace.push(gaugeState.gauge.normalPct);
      nextSampleIdx++;
    }
  };

  const finalize = (): void => {
    if (result !== null) return; // 이미 끝났다 — 두 번 계산하지 않는다.

    // clear는 정확히 200개로 채운다 — forceEnded만 앞쪽 일부로 남는다(§6.3).
    if (!gaugeState.forceEnded) {
      while (nextSampleIdx < GAUGE_TRACE_SAMPLES) {
        hardTrace.push(gaugeState.gauge.hardPct);
        normalTrace.push(gaugeState.gauge.normalPct);
        nextSampleIdx++;
      }
    }

    const gaugeTrace =
      gaugeState.tier === 'hard'
        ? hardTrace
        : gaugeState.tier === 'normal'
          ? normalTrace
          : hardTrace.map(() => 100);
    const progress = gaugeState.forceEnded
      ? Math.max(0, Math.min(1, lastCurMs / options.ctx.contentEndMs))
      : 1;

    result = {
      ...computeResult(gaugeState, judgeState.maxCombo),
      gaugeTrace,
      progress,
      timingErrors: Float32Array.from(timingErrorsBuf),
      fastCount,
      slowCount,
      playedAt: Date.now(),
    };
  };

  const engine = startEngineSession(options.ctx, options.startNowMs, options.playbackRate, {
    onAudioStart: options.engineHooks.onAudioStart,
    onSongEnd: () => {
      finalize();
      options.engineHooks.onSongEnd();
    },
  });

  const applyEvents = (events: readonly JudgmentEvent[], atMs: number): void => {
    applyJudgmentEvents(display, events, atMs);
    lastCurMs = atMs;
    for (const event of events) {
      if (event.kind === 'fastSlow') {
        if (event.side === 'FAST') fastCount++;
        else slowCount++;
        continue;
      }
      if (event.kind !== 'judged') continue;
      applyGaugeChange(gaugeState, event.judgment, event.units);
      timingErrorsBuf.push(event.judgment === 'MISS' ? NaN : event.diff);
      // 원본 `play-judgment.js`: tail 닫힘과 MISS는 소리를 내지 않는다
      // (`if (!silent) playHit()`은 성공한 tap/hold-head 판정에서만 불린다).
      if (options.hitSound !== null && event.part !== 'tail' && event.judgment !== 'MISS') {
        playHitSound(options.hitSound.ctx, options.hitSound.buffer, options.ctx.hitVol);
      }
    }
    sampleGaugeTrace(atMs);
  };

  const input = createJudgeInputHandlers(
    judgeState,
    context,
    options.keyBindings,
    options.visualOffset,
    (wallClockMs) => engine.toChartMs(wallClockMs),
    () => engine.paused,
    (events) => {
      applyEvents(events, options.ctx.sharedMs);
      // terminate 모드는 게이지 사망 즉시 끝난다 — 원본도 프레임 끝에서
      // playForceEnded를 확인한다(`gauge.md`의 applyGaugeChange 주석 참조).
      if (gaugeState.forceEnded) finalize();
    },
  );

  return {
    ctx: options.ctx,
    engine,
    judgeState,
    context,
    display,
    gaugeState,
    get result() {
      return result;
    },
    input,
    autoplay: options.autoplay,
    advance(nowMs) {
      if (result !== null) return; // 이미 끝난 세션은 더 진행하지 않는다.
      engine.tick(nowMs);
      if (engine.finished) return; // onSongEnd 훅이 이미 finalize했다.
      if (engine.paused) return; // pause·Resume 카운트다운 — chart 시간이 안 흐른다.

      const curMs = options.ctx.sharedMs;
      const events = options.autoplay
        ? advanceAutoplay(judgeState, context, curMs)
        : judgeAdvance(judgeState, context, curMs, options.visualOffset);
      applyEvents(events, curMs);

      if (gaugeState.forceEnded) {
        finalize();
        return;
      }
      pruneHitEffects(display, curMs, HIT_EFFECT.durationMs);
    },
    pause() {
      engine.pause();
    },
    resume(resumeNowMs) {
      engine.resume(resumeNowMs);
    },
  };
}
