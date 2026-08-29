/**
 * host 배선 — `game-engine`(시계)·`game-judge-input`(수동 입력)·
 * `game-judge-autoplay`·`game-judge-display`(표시 상태)를 한 세션으로 묶는다.
 *
 * 판정 계산은 core, 언제 부를지는 game이라는 원칙 그대로: 이 파일은 **누구를
 * 언제 부르는지**만 정하고 판정 자체는 한 줄도 계산하지 않는다.
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
import type { LaneKeyId } from '../core/core-settings.js';
import type { Timeline } from '../core/core-timing.js';
import type { CTX } from './game-ctx.js';
import {
  startEngineSession,
  wallClockToChartMs,
  type EngineHooks,
  type EngineSession,
} from './game-engine.js';
import { advanceAutoplay } from './game-judge-autoplay.js';
import {
  applyJudgmentEvents,
  createJudgeDisplayState,
  pruneHitEffects,
  type JudgeDisplayState,
} from './game-judge-display.js';
import { HIT_EFFECT } from '../render/render-theme.js';
import { createJudgeInputHandlers, type JudgeInputHandlers } from './game-judge-input.js';

export interface GameSessionOptions {
  readonly ctx: CTX;
  readonly chart: Chart;
  readonly timeline: Timeline;
  readonly keyBindings: Readonly<Record<LaneKeyId, string>>;
  readonly mirror: boolean;
  readonly visualOffset: number;
  readonly autoplay: boolean;
  readonly startNowMs: number;
  readonly playbackRate: number;
  readonly engineHooks: EngineHooks;
}

export interface GameSession {
  readonly ctx: CTX;
  readonly engine: EngineSession;
  readonly judgeState: JudgeState;
  readonly context: CandidateContext;
  readonly display: JudgeDisplayState;
  /**
   * 수동 입력 핸들러. autoplay 세션에도 만들어지지만, 호출측이 env-input에
   * 이걸 실제로 물릴지는 별개다 — autoplay면 물리 입력을 물리지 않는 것으로
   * "입력 무시"가 표현된다(핸들러 자체가 autoplay를 검사하지 않는다).
   */
  readonly input: JudgeInputHandlers;
  readonly autoplay: boolean;
  /** wall-clock `nowMs`로 한 프레임을 민다. rAF 콜백에서 매번 부른다. */
  advance(nowMs: number): void;
}

export function createGameSession(options: GameSessionOptions): GameSession {
  const context: CandidateContext = {
    notes: buildJudgeNotes(options.chart, options.timeline),
    laneMap: laneMapOf(options.mirror),
  };
  const judgeState = createJudgeState(context.notes);
  const display = createJudgeDisplayState();

  const engine = startEngineSession(
    options.ctx,
    options.startNowMs,
    options.playbackRate,
    options.engineHooks,
  );

  const applyEvents = (events: readonly JudgmentEvent[], atMs: number): void => {
    applyJudgmentEvents(display, events, atMs);
  };

  const toChartMs = (wallClockMs: number): number =>
    wallClockToChartMs(options.startNowMs, options.playbackRate, wallClockMs);

  const input = createJudgeInputHandlers(
    judgeState,
    context,
    options.keyBindings,
    options.visualOffset,
    toChartMs,
    (events) => applyEvents(events, options.ctx.sharedMs),
  );

  return {
    ctx: options.ctx,
    engine,
    judgeState,
    context,
    display,
    input,
    autoplay: options.autoplay,
    advance(nowMs) {
      engine.tick(nowMs);
      if (engine.finished) return;
      const curMs = options.ctx.sharedMs;
      const events = options.autoplay
        ? advanceAutoplay(judgeState, context, curMs)
        : judgeAdvance(judgeState, context, curMs, options.visualOffset);
      applyEvents(events, curMs);
      pruneHitEffects(display, curMs, HIT_EFFECT.durationMs);
    },
  };
}
