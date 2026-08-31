/**
 * 게이지·tier·결과 산출의 구현.
 *
 * 정의의 단일 출처는 `core/gauge.md`다. 여기는 그 §1~§5의 코드 표현이다.
 *
 * 네 가지가 구조로 못 박혀 있다:
 *
 * - **모드가 분기를 만들지 않는다.** 6모드는 `GAUGE_MODE_TABLE`의 두 열
 *   (시작 tier, 탈락 시 동작)로만 갈리고 나머지 경로는 하나다. cascade도
 *   "탈락하면 강등"이라는 한 열의 값일 뿐 별도 경로가 아니다.
 * - **누산기가 하나다.** 게이지·score·accuracy가 같은 판정 단위를 쓴다는
 *   계약(설계 대장 GA-5)의 실체가 `GaugeState.counts` 하나다 — 둘로 나누면
 *   그 계약이 다시 두 곳에 생겨 어긋날 자리가 만들어진다. judge가 누적을
 *   갖지 않는 것(D-2026-039)의 반대편이 여기다.
 * - **terminate는 게이지 값을 밟지 않는다.** `forceEnded` 하나가 종료를
 *   표현한다(`gauge.md` §1) — 두 게이지는 result 막대와 score가 함께 쓰는
 *   회계라, 종료가 그 값을 0으로 만들면 표시와 점수가 어긋난다.
 * - **state 산출이 한 줄기다.** 성적이 먼저 마크를 정하고 `tier`는 `H`와 `C`를
 *   가르는 자리에서만 쓰인다(`gauge.md` §3) — 그래서 모드별 산출 분기가 없다.
 */

import {
  GAUGE_DELTA,
  GAUGE_MAX,
  GAUGE_NORMAL_TOTAL_GAIN,
  GAUGE_START,
  NORMAL_CLEAR_PCT,
  RANK_TABLE,
} from './core-constants.js';
import type { Judgment } from './core-judge.js';

// ── tier 사다리와 모드 ──────────────────────────────────────

/**
 * 엄격 → 관대. 탈락은 이 순서로 **한 칸씩** 내려가며 비가역이다(`gauge.md` §2).
 * `normal`이 바닥이라 더 내려갈 곳이 없다.
 */
export const TIER_LADDER = ['as', 'ap', 'fc', 'hard', 'normal'] as const;
export type Tier = (typeof TIER_LADDER)[number];

export const GAUGE_MODES = ['normal', 'hard', 'fc', 'ap', 'as', 'cascade'] as const;
export type GaugeMode = (typeof GAUGE_MODES)[number];

/** 탈락했을 때 무엇이 일어나는가. */
export type BreakBehavior = 'terminate' | 'demote';

export interface GaugeModeSpec {
  /** 이 모드가 시작하는 단계. */
  readonly startTier: Tier;
  /** `normal`만 탈락 조건이 없어 `null`이다. */
  readonly onBreak: BreakBehavior | null;
}

/**
 * `gauge.md` §2의 모드 표를 그대로 옮긴 것. 모드가 정하는 것은 이 두 열뿐이다.
 * → `naming.md` §3 (구 `LOCK_TIERS`)
 */
export const GAUGE_MODE_TABLE: Readonly<Record<GaugeMode, GaugeModeSpec>> = {
  normal: { startTier: 'normal', onBreak: null },
  hard: { startTier: 'hard', onBreak: 'terminate' },
  fc: { startTier: 'fc', onBreak: 'terminate' },
  ap: { startTier: 'ap', onBreak: 'terminate' },
  as: { startTier: 'as', onBreak: 'terminate' },
  cascade: { startTier: 'as', onBreak: 'demote' },
};

/**
 * 각 tier가 **살아남는** 판정. 목록 밖의 판정이 오면 탈락이다(`gauge.md` §2).
 * `hard`는 판정이 아니라 `hardPct`가 0에 닿는 것으로 탈락하고, `normal`은
 * 플레이 중 탈락하지 않으므로 둘 다 여기 없다.
 */
const TIER_SURVIVES: Readonly<Partial<Record<Tier, readonly Judgment[]>>> = {
  as: ['SYNC'],
  ap: ['SYNC', 'PERFECT'],
  fc: ['SYNC', 'PERFECT', 'GOOD'],
};

function tierBelow(tier: Tier): Tier {
  const index = TIER_LADDER.indexOf(tier);
  return TIER_LADDER[Math.min(index + 1, TIER_LADDER.length - 1)] as Tier;
}

// ── 상태 ────────────────────────────────────────────────────

export type JudgmentCounts = Record<Judgment, number>;

/** `computeResult`가 내는 결과 state. `N`은 안 친 곡의 표기라 여기 오지 않는다. */
export const PLAY_STATES = ['AS', 'AP', 'FC', 'H', 'C', 'F'] as const;
export type PlayState = (typeof PLAY_STATES)[number];

export type Rank = (typeof RANK_TABLE)[number][0];

/**
 * 게이지 진행 상태. `JudgeState`와 같은 형태의 **가변 객체**이며 모든 연산이
 * 첫 인자로 받는다. 필드 이름의 단일 출처는 `core/naming.md` §4다.
 */
export interface GaugeState {
  readonly mode: GaugeMode;
  /** 두 값 모두 0~100. 모드와 무관하게 **병렬 누적**된다(`gauge.md` §1). */
  gauge: { hardPct: number; normalPct: number };
  /** 현재 살아있는 최고 단계. 단일 모드에서는 시작값에 고정된다. */
  tier: Tier;
  /** 단일 모드에서 tier가 탈락해 중도 종료됐다. */
  forceEnded: boolean;
  /** 판정별 **단위 수** 누적. score·accuracy·state가 모두 이 하나를 읽는다. */
  counts: JudgmentCounts;
  /** `normal` 게이지 양수 delta에 걸리는 `a`. 세션 시작 1회 계산. */
  readonly unitScale: number;
  /** chart 전체의 판정 단위 수(tap 1 · hold 2). score의 분모다. */
  readonly totalUnits: number;
}

/**
 * 세션 시작 상태를 만든다.
 *
 * 원본 `resetGauge()`는 전역 `PS`를 제자리에서 지웠다. 여기서는 새 객체를
 * 돌려준다 — 상태를 인자로 받는 형태(J-2)에서는 "어디를 지우는가"가 애초에
 * 물어질 수 없어야 한다.
 */
export function resetGauge(mode: GaugeMode, totalUnits: number): GaugeState {
  return {
    mode,
    gauge: { hardPct: GAUGE_START.hard, normalPct: GAUGE_START.normal },
    tier: GAUGE_MODE_TABLE[mode].startTier,
    forceEnded: false,
    counts: { SYNC: 0, PERFECT: 0, GOOD: 0, MISS: 0 },
    unitScale: totalUnits > 0 ? GAUGE_NORMAL_TOTAL_GAIN / totalUnits : 0,
    totalUnits,
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(GAUGE_MAX, value));
}

// ── 판정 반영 ───────────────────────────────────────────────

/**
 * 판정 하나를 게이지·카운트·tier에 반영한다. `judge`의 `JudgmentEvent` 중
 * `kind: 'judged'`인 것을 host가 흘려보내는 자리다 — gauge는 judge를 부르지
 * 않고 judge도 gauge를 모른다(D-2026-038 J-4).
 *
 * `units`는 회계 단위 수다(`judge.md` §8). Tap·head·tail은 1, Hold head MISS만
 * 2다. delta를 `units`배로 적용하는 것은 `units`번 반복하는 것과 같다 —
 * 클램프가 단조라 중간에 걸려도 결과가 같다.
 *
 * **`forceEnded` 뒤에도 그대로 반영한다** `[보존]`. `judgeAdvance` 한 번이 여러
 * 이벤트를 한꺼번에 내므로, 앞의 하나가 terminate시킨 뒤 남은 이벤트가 같은
 * 프레임에 도착하는 것은 정상이고 그 노트들은 실제로 놓친 것이다. 원본도
 * 프레임 안에서는 계속 먹이고 `PS.playForceEnded`를 **프레임 끝에서** 확인한다
 * (`play.js`). 판을 멈추는 것은 이 함수가 아니라 host의 몫이다 — 여기서 끊으면
 * 같은 프레임의 노트가 score에는 들어가고 게이지에는 안 들어가 둘이 어긋난다.
 */
export function applyGaugeChange(state: GaugeState, judgment: Judgment, units = 1): void {
  state.counts[judgment] += units;

  const normalDelta = GAUGE_DELTA.normal[judgment];
  state.gauge.normalPct = clamp(
    state.gauge.normalPct + (normalDelta > 0 ? normalDelta * state.unitScale : normalDelta) * units,
  );
  state.gauge.hardPct = clamp(state.gauge.hardPct + GAUGE_DELTA.hard[judgment] * units);

  applyTierBreak(state, judgment);
}

/** 현재 단계가 이 판정(과 게이지 값)에서 탈락하는가. */
function breaks(state: GaugeState, tier: Tier, judgment: Judgment): boolean {
  if (tier === 'hard') return state.gauge.hardPct <= 0;
  const survives = TIER_SURVIVES[tier];
  return survives !== undefined && !survives.includes(judgment);
}

/**
 * 탈락 사슬을 한 번에 내려간다. 한 판정이 여러 단계를 함께 깨뜨릴 수 있다 —
 * MISS는 `as`·`ap`·`fc`를 동시에 깨고, 그것이 `hardPct`를 0으로 만들었다면
 * `hard`까지 이어진다.
 */
function applyTierBreak(state: GaugeState, judgment: Judgment): void {
  let tier = state.tier;
  while (breaks(state, tier, judgment)) tier = tierBelow(tier);
  if (tier === state.tier) return;

  if (GAUGE_MODE_TABLE[state.mode].onBreak === 'demote') {
    state.tier = tier; // 래칫 — 사다리를 내려가기만 한다.
    return;
  }
  // terminate: tier는 탈락 직전 값으로 얼어붙고 `forceEnded`가 실패를 든다.
  state.forceEnded = true;
}

// ── 결과 산출 ───────────────────────────────────────────────

/**
 * `gauge.md` §3의 산출 표. 위에서부터 처음 맞는 줄 하나다.
 *
 * 성적이 먼저 마크를 정하므로 **어느 모드로 쳤든 `FC`/`AP`/`AS`가 나온다**
 * `[보존]`. `tier`는 `H`와 `C`를 가르는 자리에서만 쓰이고, 그 자리는 cascade가
 * 아니면 모드마다 고정이라 분기가 되지 않는다.
 *
 * **`F`를 뺀 모든 마크는 완주를 요구한다** `[수정]`(GA-9). 원본 `computeState`는
 * 미스·GOOD·PERFECT 개수만 보므로, 절반만 판정된 판도 미스가 없으면 `AS`가
 * 나왔다. 실제 판은 miss sweep이 끝을 쓸고 지나가 늘 완주 상태로 끝나지만,
 * 마크의 뜻은 "이 성적으로 곡을 통과했다"이므로 판정되지 않은 단위가 남아
 * 있으면 그 뜻이 성립하지 않는다.
 */
export function evaluateState(state: GaugeState): PlayState {
  if (state.forceEnded) return 'F';
  if (judgedUnits(state) < state.totalUnits) return 'F';

  const { PERFECT, GOOD, MISS } = state.counts;
  if (MISS === 0 && GOOD === 0 && PERFECT === 0) return 'AS';
  if (MISS === 0 && GOOD === 0) return 'AP';
  if (MISS === 0) return 'FC';

  if (state.tier === 'hard') return 'H';
  return state.gauge.normalPct >= NORMAL_CLEAR_PCT ? 'C' : 'F';
}

/** 지금까지 판정이 붙은 단위 수. `totalUnits`에 닿아야 판이 끝난 것이다. */
function judgedUnits(state: GaugeState): number {
  const { SYNC, PERFECT, GOOD, MISS } = state.counts;
  return SYNC + PERFECT + GOOD + MISS;
}

/**
 * score·accuracy의 판정별 가중치. → `constants.md` §3
 *
 * `core-records.ts`(M3-7)가 저장된 `bestJudgments`에서 같은 공식으로 score·
 * accuracy를 다시 파생시키려고 재사용한다 — 가중치 표를 두 곳에 두지 않는다.
 */
export const SCORE_WEIGHT: Readonly<JudgmentCounts> = { SYNC: 1, PERFECT: 1, GOOD: 0.5, MISS: 0 };
export const ACCURACY_WEIGHT: Readonly<JudgmentCounts> = {
  SYNC: 1,
  PERFECT: 0.7,
  GOOD: 0.3,
  MISS: 0,
};

export function weighted(counts: JudgmentCounts, weight: Readonly<JudgmentCounts>): number {
  return (
    counts.SYNC * weight.SYNC +
    counts.PERFECT * weight.PERFECT +
    counts.GOOD * weight.GOOD +
    counts.MISS * weight.MISS
  );
}

/** 높음 → 낮음, 처음 도달한 임계가 rank다. → `constants.md` §3 */
export function scoreToRank(score: number): Rank {
  for (const [name, threshold] of RANK_TABLE) {
    if (score >= threshold) return name;
  }
  return 'F';
}

export interface PlayResult {
  /** 백만점제 정수. */
  readonly score: number;
  /** 0~100. score와 가중이 달라 **별개 지표**다. */
  readonly accuracy: number;
  readonly rank: Rank;
  readonly state: PlayState;
  /** 종료 시점의 살아있는 최고 tier. cascade의 확정 게이지 종류 표시가 이 값을 읽는다. */
  readonly tier: Tier;
  readonly maxCombo: number;
  readonly counts: Readonly<JudgmentCounts>;
  readonly forceEnded: boolean;
}

/**
 * 곡이 끝났을 때(또는 terminate됐을 때) 결과를 낸다.
 *
 * `maxCombo`는 `JudgeState`의 것을 그대로 받는다 — combo는 판정 중 직접 쓰여
 * judge에 남은 유일한 누적이다(D-2026-039).
 */
export function computeResult(state: GaugeState, maxCombo: number): PlayResult {
  const { counts, totalUnits } = state;
  const score =
    totalUnits > 0 ? Math.round((weighted(counts, SCORE_WEIGHT) / totalUnits) * 1_000_000) : 0;
  const accuracy = totalUnits > 0 ? (weighted(counts, ACCURACY_WEIGHT) / totalUnits) * 100 : 0;

  return {
    score,
    accuracy,
    rank: scoreToRank(score),
    state: evaluateState(state),
    tier: state.tier,
    maxCombo,
    counts: { ...counts },
    forceEnded: state.forceEnded,
  };
}
