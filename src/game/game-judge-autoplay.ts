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

/** 아직 안 닫힌 활성 tail 중 가장 이른 것 하나(§7 half-open `[head, tail)`). */
function earliestActiveTail(
  state: JudgeState,
  context: CandidateContext,
): { index: number; tailMs: number } | null {
  let earliest: { index: number; tailMs: number } | null = null;
  for (const lane of LANES) {
    // insertByTail이 tailMs 오름차순을 유지하므로 각 lane은 [0]만 보면 된다.
    const index = state.activeNormalHolds[lane][0];
    if (index === undefined) continue;
    const tailMs = context.notes.byIndex[index]!.tailMs;
    if (earliest === null || tailMs < earliest.tailMs) earliest = { index, tailMs };
  }
  if (state.activeWideHold !== null) {
    const index = state.activeWideHold;
    const tailMs = context.notes.byIndex[index]!.tailMs;
    if (earliest === null || tailMs < earliest.tailMs) earliest = { index, tailMs };
  }
  return earliest;
}

/**
 * `nowMs`까지 due한 head·tail을 **시간순으로** 확정·완료한다(F06, §7 half-open
 * `[head, tail)`). 한 프레임이 경계 여럿을 건너뛰어도(예: 연속 WideHold가
 * 같은 tick에서 맞물리는 경우) 예전처럼 "due head를 전부 먼저, 그다음 due
 * tail을 전부"로 나눠 처리하면 아직 열린 이전 Hold의 tail이 닫히기도 전에
 * 다음 head가 열려 `openHold`의 "중복 WideHold" 방어 경로(§12, 원래 무효
 * chart 전용)를 정상 chart에서 잘못 태운다. 그래서 매 반복마다 "다음 미확정
 * head"와 "가장 이른 활성 tail"을 비교해 **더 이른 쪽**을 먼저 처리하고,
 * 같은 tick이면 tail을 먼저 처리한다. `judgeAdvance`를 대신한다 — autoplay는
 * MISS 판정 경로(놓친 노트)가 없다.
 */
export function advanceAutoplay(
  state: JudgeState,
  context: CandidateContext,
  nowMs: number,
): JudgmentEvent[] {
  const events: JudgmentEvent[] = [];

  // ordered는 startMs 오름차순 — 이미 처리(hit)된 항목만 건너뛰면 되므로
  // 포인터 하나로 다음 미확정 head를 찾는다.
  let headPtr = 0;

  for (;;) {
    while (
      headPtr < context.notes.ordered.length &&
      state.hits[context.notes.ordered[headPtr]!.index] !== 'pending'
    ) {
      headPtr++;
    }
    const nextHead =
      headPtr < context.notes.ordered.length ? context.notes.ordered[headPtr]! : null;
    const nextTail = earliestActiveTail(state, context);

    const headDue = nextHead !== null && nextHead.startMs <= nowMs;
    const tailDue = nextTail !== null && nextTail.tailMs <= nowMs;
    if (!headDue && !tailDue) break;

    // 동률이면 tail 우선 — `[head, tail)`은 tail 시각에 그 구간이 이미 끝나
    // 있으므로, 같은 tick에 새 head가 있어도 먼저 비워야 한다.
    if (tailDue && (!headDue || nextTail!.tailMs <= nextHead!.startMs)) {
      events.push(...closeTail(state, context, nextTail!.index, nextTail!.tailMs, 'SYNC'));
    } else {
      events.push(...commitJudgment(state, context, nextHead!, nextHead!.startMs));
      headPtr++;
    }
  }

  return events;
}
