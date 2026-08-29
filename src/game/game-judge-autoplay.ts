/**
 * autoplay — 입력 없이 정확한 타이밍에 자동 판정한다.
 *
 * 원본 `play.js`의 autoplay(`scheduler.js` `autoJudge` + `applyTailSuccess`
 * 직접 호출)와 같은 경로를 쓴다 — 물리 키를 흉내내지 않고 `commitJudgment`·
 * `closeTail`을 입력 우회로 직접 부른다. 이 둘은 `seedPlayStateAt`이 이미
 * 같은 방식으로 쓰고 있었다(사용자 확인: "원본과 같은 경로로 가기").
 *
 * `commitJudgment(..., entry.startMs)`로 부르므로 `diff`가 항상 0이다 —
 * autoplay는 판정 오차가 없다(SYNC, wide도 SYNC 창 안).
 */

import type { Lane } from '../core/core-chart.js';
import {
  closeTail,
  commitJudgment,
  type CandidateContext,
  type JudgeState,
  type JudgmentEvent,
} from '../core/core-judge.js';

const LANES: readonly Lane[] = [1, 2, 3, 4];

/**
 * `nowMs`까지 due한 head를 전부 확정하고, due한 tail을 전부 닫는다.
 * `judgeAdvance`를 대신한다 — autoplay는 MISS 판정 경로(놓친 노트)가 없다.
 */
export function advanceAutoplay(
  state: JudgeState,
  context: CandidateContext,
  nowMs: number,
): JudgmentEvent[] {
  const events: JudgmentEvent[] = [];

  for (const entry of context.notes.ordered) {
    if (state.hits[entry.index] !== 'pending') continue;
    if (entry.startMs > nowMs) break; // ordered는 startMs 오름차순 — 이후는 전부 아직이다.
    events.push(...commitJudgment(state, context, entry, entry.startMs));
  }

  for (const lane of LANES) {
    for (const index of [...state.activeNormalHolds[lane]]) {
      const entry = context.notes.byIndex[index]!;
      if (entry.tailMs <= nowMs)
        events.push(...closeTail(state, context, index, entry.tailMs, 'SYNC'));
    }
  }
  if (state.activeWideHold !== null) {
    const index = state.activeWideHold;
    const entry = context.notes.byIndex[index]!;
    if (entry.tailMs <= nowMs)
      events.push(...closeTail(state, context, index, entry.tailMs, 'SYNC'));
  }

  return events;
}
