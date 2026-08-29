/**
 * judge 결선의 표시 전용 상태 — judge는 `JudgmentEvent[]`만 내고 그 열을
 * "어떻게 보여줄까"는 모른다(§11, J-4). 여기가 그 소비자다.
 *
 * combo는 여기서 안 든다 — `JudgeState.combo`가 이미 갖고 있으므로 중복
 * 회계를 만들지 않는다. 여기 담는 건 judge state가 스스로 못 가진 **시각**
 * 항목(마지막 판정·FAST/SLOW 플래시·hit effect)뿐이다.
 */

import type { Note } from '../core/core-chart.js';
import type { Judgment, JudgmentEvent } from '../core/core-judge.js';

export interface JudgmentFlash {
  readonly judgment: Judgment;
  readonly atMs: number;
}

export interface FastSlowFlash {
  readonly side: 'FAST' | 'SLOW';
  readonly atMs: number;
}

export interface HitEffectSpawn {
  readonly note: Note;
  readonly judgment: Judgment;
  readonly atMs: number;
}

export interface JudgeDisplayState {
  lastJudgment: JudgmentFlash | null;
  fastSlow: FastSlowFlash | null;
  hitEffects: HitEffectSpawn[];
}

export function createJudgeDisplayState(): JudgeDisplayState {
  return { lastJudgment: null, fastSlow: null, hitEffects: [] };
}

/** Fast/Slow 피드백 기록. `naming` §2 `recordFastSlow` (M2-4). */
export function recordFastSlow(
  display: JudgeDisplayState,
  side: 'FAST' | 'SLOW',
  atMs: number,
): void {
  display.fastSlow = { side, atMs };
}

/**
 * `judgeKeyDown`/`judgeKeyUp`/`judgeAdvance`가 낸 이벤트 열을 표시 상태에
 * 반영한다. 판정마다 마지막 판정 플래시를 갈아치우고 hit effect를 하나 쌓는다.
 */
export function applyJudgmentEvents(
  display: JudgeDisplayState,
  events: readonly JudgmentEvent[],
  nowMs: number,
): void {
  for (const event of events) {
    if (event.kind === 'judged') {
      display.lastJudgment = { judgment: event.judgment, atMs: nowMs };
      display.hitEffects.push({ note: event.note, judgment: event.judgment, atMs: nowMs });
    } else if (event.kind === 'fastSlow') {
      recordFastSlow(display, event.side, nowMs);
    }
  }
}

/** 지속시간이 지난 hit effect를 걷어낸다. render 프레임마다 부른다. */
export function pruneHitEffects(
  display: JudgeDisplayState,
  nowMs: number,
  durationMs: number,
): void {
  display.hitEffects = display.hitEffects.filter((effect) => nowMs - effect.atMs < durationMs);
}
