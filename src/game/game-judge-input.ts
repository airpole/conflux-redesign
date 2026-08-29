/**
 * env-input의 raw keydown/keyup을 judge 진입점에 잇는다. 물리 `code` →
 * `LaneKeyId` 변환만 하고, 판정 자체는 core가 한다 — "언제 판정을 부를지는
 * game, 계산은 core"(`_plan/architecture.md` §1).
 *
 * `KeyEvent.timestampMs`는 **wall-clock**이다(env-input, `host.now()`) — judge가
 * 받는 `rawMs`는 chart-relative ms라 그대로 못 넘긴다. `toChartMs`(호출측이
 * `EngineSession.toChartMs`를 넘긴다 — pause/Resume 재anchor까지 반영된
 * 세션의 현재 기준점)로 변환한 뒤에 넘긴다 — 원본 `handlePlayKeyDown`이
 * keydown 처리 시점에 `playOffMs + (performance.now() − playT0) × rate`로
 * 다시 계산한 것과 같다.
 *
 * `isPaused()`가 참이면(mid-start·Resume 카운트다운, `judge.md` §9) chart
 * 시간이 흐르지 않으므로 `judgeKeyDown`/`judgeKeyUp` 대신 시각을 받지 않는
 * `registerKeyDown`/`registerKeyUp`으로만 키 상태를 기록한다 — 판정도
 * 재조정도 하지 않는다.
 */

import { LANE_KEY_IDS, type LaneKeyId } from '../core/core-settings.js';
import {
  judgeKeyDown,
  judgeKeyUp,
  registerKeyDown,
  registerKeyUp,
  type CandidateContext,
  type JudgeState,
  type JudgmentEvent,
} from '../core/core-judge.js';
import type { KeyEvent } from '../env/env-input.js';

export interface JudgeInputHandlers {
  onKeyDown(e: KeyEvent): void;
  onKeyUp(e: KeyEvent): void;
}

export function createJudgeInputHandlers(
  state: JudgeState,
  context: CandidateContext,
  keyBindings: Readonly<Record<LaneKeyId, string>>,
  visualOffset: number,
  toChartMs: (wallClockMs: number) => number,
  isPaused: () => boolean,
  onEvents: (events: readonly JudgmentEvent[]) => void,
): JudgeInputHandlers {
  const codeToKey = new Map<string, LaneKeyId>();
  for (const id of LANE_KEY_IDS) codeToKey.set(keyBindings[id], id);

  return {
    onKeyDown(e) {
      const key = codeToKey.get(e.code);
      if (key === undefined) return;
      if (isPaused()) {
        registerKeyDown(state, key);
        return;
      }
      onEvents(judgeKeyDown(state, context, key, toChartMs(e.timestampMs), visualOffset));
    },
    onKeyUp(e) {
      const key = codeToKey.get(e.code);
      if (key === undefined) return;
      if (isPaused()) {
        registerKeyUp(state, key);
        return;
      }
      onEvents(judgeKeyUp(state, context, key, toChartMs(e.timestampMs), visualOffset));
    },
  };
}
