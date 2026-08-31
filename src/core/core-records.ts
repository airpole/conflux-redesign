/**
 * 플레이 기록 — 스키마·병합 규칙·no-record gate의 순수 계산.
 *
 * 정의의 단일 출처는 `_meta/records.md`다. no-record gate는 `_meta/settings.md`
 * §2가 단일 출처이며 여기는 그 불리언 결합을 그대로 옮긴다.
 *
 * 저장/조회(env-storage `records` store I/O)는 여기 없다 — 이 파일은 core
 * 레이어라 브라우저 API를 하나도 안 쓴다(`architecture.md` §1). 실제 store
 * 배선은 `game-records.ts`(game 레이어)가 맡는다.
 *
 * 타입 이름을 `ChartRecord`로 짓는다 — `Record`는 `core-gauge.ts`의
 * `JudgmentCounts = Record<Judgment, number>`가 이미 쓰는 TS 내장 유틸리티
 * 타입 이름과 겹쳐 혼동을 만든다.
 */
import {
  ACCURACY_WEIGHT,
  SCORE_WEIGHT,
  scoreToRank,
  weighted,
  type JudgmentCounts,
  type PlayState,
  type Rank,
} from './core-gauge.js';

/**
 * 저장 스키마(§2). `score`·`accuracy`·`rank`는 필드가 아니라
 * `deriveRecordSummary`의 파생값이다.
 */
export interface ChartRecord {
  readonly bestJudgments: JudgmentCounts;
  readonly bestState: PlayState;
  readonly maxCombo: number;
}

/** `songId:chartId`(§1). init(`chartId 0`)은 기록 대상이 아니다 — 호출측이 걸러야 한다. */
export function recordKey(songId: string, chartId: number): string {
  return `${songId}:${chartId}`;
}

/**
 * 총 노트 수는 `bestJudgments`의 합이다 — 저장 당시 기준으로 자기완결이다
 * (§2). chart의 실제 `totalUnits`를 참조하지 않는다.
 */
function totalUnitsOf(judgments: JudgmentCounts): number {
  return judgments.SYNC + judgments.PERFECT + judgments.GOOD + judgments.MISS;
}

/** `bestJudgments`(또는 임의 판정 분포)에서 score를 다시 파생한다. `core-gauge.computeResult`와 같은 공식. */
export function deriveScore(judgments: JudgmentCounts): number {
  const total = totalUnitsOf(judgments);
  return total > 0 ? Math.round((weighted(judgments, SCORE_WEIGHT) / total) * 1_000_000) : 0;
}

/** 0~100. score와 가중이 달라 별개 지표다(`core-gauge.PlayResult.accuracy`와 동일 공식). */
export function deriveAccuracy(judgments: JudgmentCounts): number {
  const total = totalUnitsOf(judgments);
  return total > 0 ? (weighted(judgments, ACCURACY_WEIGHT) / total) * 100 : 0;
}

export interface RecordSummary {
  readonly score: number;
  readonly accuracy: number;
  readonly rank: Rank;
}

/** 저장된 record에서 score·accuracy·rank를 파생한다(§2 "score·accuracy·rank는 파생") — 저장 필드가 아니다. */
export function deriveRecordSummary(record: ChartRecord): RecordSummary {
  const score = deriveScore(record.bestJudgments);
  return { score, accuracy: deriveAccuracy(record.bestJudgments), rank: scoreToRank(score) };
}

/** 엄격 → 관대. bestState 병합 우선순위(§3 "AS > AP > FC > H > C > F"). */
const STATE_PRIORITY: readonly PlayState[] = ['AS', 'AP', 'FC', 'H', 'C', 'F'];

function higherPriorityState(a: PlayState, b: PlayState): PlayState {
  return STATE_PRIORITY.indexOf(a) <= STATE_PRIORITY.indexOf(b) ? a : b;
}

/** 적격 판 하나가 record 갱신에 제출하는 값. */
export interface RecordCandidate {
  readonly judgments: JudgmentCounts;
  readonly state: PlayState;
  readonly maxCombo: number;
}

export interface MergeRecordResult {
  readonly record: ChartRecord;
  /** 이번 판의 `bestJudgments`가 실제로 교체됐는가 — result의 "NEW BEST" 표시가 이걸 쓴다(§6). */
  readonly judgmentsImproved: boolean;
}

/**
 * §3 갱신 규칙 — 세 필드를 **독립적으로** 갱신한다. `bestState`·`maxCombo`는
 * `bestJudgments`와 무관하게 갱신되므로 세 필드가 같은 판에서 나온 값일
 * 필요가 없다.
 *
 * - `bestJudgments`: 이번 판의 파생 score가 저장된 파생 score보다 크면 교체.
 * - `bestState`: 우선순위가 더 높은 쪽으로 병합.
 * - `maxCombo`: 독립 max.
 *
 * `existing`이 `null`이면(첫 기록) 무조건 이번 판 값으로 시작한다.
 */
export function mergeRecord(
  existing: ChartRecord | null,
  candidate: RecordCandidate,
): MergeRecordResult {
  const candidateScore = deriveScore(candidate.judgments);
  const judgmentsImproved =
    existing === null || candidateScore > deriveScore(existing.bestJudgments);
  const bestJudgments = judgmentsImproved ? candidate.judgments : existing!.bestJudgments;

  const bestState =
    existing === null ? candidate.state : higherPriorityState(existing.bestState, candidate.state);
  const maxCombo =
    existing === null ? candidate.maxCombo : Math.max(existing.maxCombo, candidate.maxCombo);

  return { record: { bestJudgments, bestState, maxCombo }, judgmentsImproved };
}

// ── no-record gate — `_meta/settings.md` §2 단일 출처 ──────────────

export interface NoRecordConditions {
  readonly autoplay: boolean;
  readonly staticShape: boolean;
  /** 곡 처음이 아닌 지점에서 시작한 판(editor test 중간 시작 등). pause→Resume은 해당 없음. */
  readonly midStart: boolean;
  readonly editorOrigin: boolean;
}

/** `autoplay OR staticShape OR mid-start OR editorOrigin`. */
export function isNoRecord(conditions: NoRecordConditions): boolean {
  return (
    conditions.autoplay || conditions.staticShape || conditions.midStart || conditions.editorOrigin
  );
}
