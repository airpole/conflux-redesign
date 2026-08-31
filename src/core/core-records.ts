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

/**
 * **오래된(이미 저장된) `bestJudgments`를 chart 없이 다시 읽을 때만** 쓰는
 * 자기완결 근사식이다(§2 "저장 당시 기준으로 자기완결이다") — 원 chart의
 * `totalUnits`를 모르는 상태에서 쓸 수 있는 유일한 분모가 그 판정 분포 자신의
 * 합이기 때문이다. 완주한 판이라면 이 합이 곧 그 판의 실제 `totalUnits`와
 * 같아 `core-gauge.computeResult`의 `score`와 정확히 일치한다.
 *
 * **`mergeRecord`가 "이번 판"의 score 비교에 이 함수를 쓰지 않는다** —
 * D-2026-069 참조. 방금 끝난 판은 실제 `PlayResult.score`(진짜
 * `totalUnits` 기준)를 이미 갖고 있으므로 그걸 그대로 쓴다. 이 함수는
 * `deriveRecordSummary`(과거 기록 재조회)와, 병합 비교의 **저장된 쪽**
 * (과거 기록은 그 자체 말고는 정보가 없다)에만 쓰인다.
 */
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

/**
 * 적격 판 하나가 record 갱신에 제출하는 값.
 *
 * `score`는 그 판의 **실제** `core-gauge.computeResult().score`다(chart의
 * 진짜 `totalUnits` 기준) — 호출측(`game-records.ts`, 방금 끝난 세션의
 * `PlayResult`를 이미 갖고 있다)이 그대로 넘긴다. `judgments`만으로 다시
 * 파생하지 않는다 — D-2026-069 참조.
 */
export interface RecordCandidate {
  readonly judgments: JudgmentCounts;
  readonly score: number;
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
 * - `bestJudgments`: 이번 판의 score가 저장된 파생 score보다 크면 교체.
 * - `bestState`: 우선순위가 더 높은 쪽으로 병합.
 * - `maxCombo`: 독립 max.
 *
 * `existing`이 `null`이면(첫 기록) 무조건 이번 판 값으로 시작한다.
 *
 * **비교가 비대칭이다** — "이번 판"은 `candidate.score`(실제 `PlayResult.score`,
 * 진짜 chart `totalUnits` 기준)를 그대로 쓰고, "저장된 판"은 `deriveScore`
 * (그 기록의 `bestJudgments` 합만을 분모로 쓰는 자기완결 근사, chart에 다시
 * 접근할 수 없으므로 유일한 선택지)로 다시 계산한다. 완주한 판이 저장돼
 * 있었다면 이 둘은 같은 값이다 — 갈리는 것은 과거에 **미완주** 판이 최고
 * 기록으로 저장돼 있던 드문 경우뿐이다. 그 근사는 판정 안 된 노트가
 * 분모에서 빠져 실제보다 **후하게**(높게) 나온다 — 그래서 이후의 정직한
 * 완주 판이 그 부풀려진 옛 기록을 못 넘어 교체가 늦어질 수 있다는 것이
 * 이 비대칭의 알려진 약점이다(D-2026-069, 별도 보고).
 */
export function mergeRecord(
  existing: ChartRecord | null,
  candidate: RecordCandidate,
): MergeRecordResult {
  const judgmentsImproved =
    existing === null || candidate.score > deriveScore(existing.bestJudgments);
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
