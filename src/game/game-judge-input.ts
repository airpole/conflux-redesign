/**
 * env-input의 raw keydown/keyup을 judge 진입점(`judgeKeyDown`/`judgeKeyUp`)에
 * 잇는다. 물리 `code` → `LaneKeyId` 변환만 하고, 판정 자체는 core가 한다 —
 * "언제 판정을 부를지는 game, 계산은 core"(`_plan/architecture.md` §1).
 */

import { LANE_KEY_IDS, type LaneKeyId } from '../core/core-settings.js';
import {
  judgeKeyDown,
  judgeKeyUp,
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
  onEvents: (events: readonly JudgmentEvent[]) => void,
): JudgeInputHandlers {
  const codeToKey = new Map<string, LaneKeyId>();
  for (const id of LANE_KEY_IDS) codeToKey.set(keyBindings[id], id);

  return {
    onKeyDown(e) {
      const key = codeToKey.get(e.code);
      if (key === undefined) return;
      onEvents(judgeKeyDown(state, context, key, e.timestampMs, visualOffset));
    },
    onKeyUp(e) {
      const key = codeToKey.get(e.code);
      if (key === undefined) return;
      onEvents(judgeKeyUp(state, context, key, e.timestampMs, visualOffset));
    },
  };
}
