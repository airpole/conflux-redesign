/**
 * result 화면의 순수 계산 — 좌표 유도·통계·색 토큰 참조·문자열 서식.
 * DOM은 한 줄도 만들지 않는다(`scene-result.ts`가 그 몫). 단일 출처는
 * `scene/ui-design.md` §1·§2.1~§2.3·§3.
 */

import { WINDOW_GOOD_MS, WINDOW_PERFECT_MS, WINDOW_SYNC_MS } from '../core/core-constants.js';
import type { PlayState, Rank, Tier } from '../core/core-gauge.js';
import type { Difficulty } from '../core/core-chart.js';

// ── §3. 좌표 유도 ───────────────────────────────────────────

/** ms 단위 판정 창. `core-constants`가 단일 출처 — 여기서 값을 다시 정의하지 않는다. */
export const WINDOW = {
  SYNC: WINDOW_SYNC_MS,
  PERFECT: WINDOW_PERFECT_MS,
  GOOD: WINDOW_GOOD_MS,
} as const;

/** 타이밍 히스토그램의 가로축 절반폭(ms). `ui-design.md` §2.3·§3. */
export const AXIS_MS = 110;

/** ms를 `[0, 100]` 가로 % 위치로 사영한다(`ui-design.md` §3). */
export function msToPct(ms: number): number {
  return ((ms + AXIS_MS) / (AXIS_MS * 2)) * 100;
}

/** `|오차|` 구간에 따른 판정색 CSS 변수. §2.3 히스토그램 채색 규칙. */
export function judgmentColorVar(absMs: number): string {
  if (absMs <= WINDOW.SYNC) return 'var(--j-sync)';
  if (absMs <= WINDOW.PERFECT) return 'var(--j-perfect)';
  if (absMs <= WINDOW.GOOD) return 'var(--j-good)';
  return 'var(--j-miss)';
}

// ── §2.3 타이밍 통계 ────────────────────────────────────────

export interface TimingStats {
  readonly mean: number;
  readonly sigma: number;
  /** 유한 표본 수. 0이면 표시할 통계가 없다 — MISS(NaN)만 있던 판 등. */
  readonly count: number;
}

/**
 * `timingErrors`(MISS는 `NaN`)에서 평균·표준편차를 낸다. `Number.isFinite()`로
 * 거르지 않으면 `NaN`이 평균 전체를 오염시킨다(D-2026-054 §6.4 소비 쪽 주의).
 */
export function timingStats(errors: ArrayLike<number>): TimingStats {
  const finite: number[] = [];
  for (let i = 0; i < errors.length; i++) {
    const value = errors[i]!;
    if (Number.isFinite(value)) finite.push(value);
  }
  if (finite.length === 0) return { mean: 0, sigma: 0, count: 0 };

  const mean = finite.reduce((sum, v) => sum + v, 0) / finite.length;
  const variance = finite.reduce((sum, v) => sum + (v - mean) ** 2, 0) / finite.length;
  return { mean, sigma: Math.sqrt(variance), count: finite.length };
}

export interface HistogramBucket {
  /** 버킷 중심(ms). */
  readonly centerMs: number;
  readonly count: number;
}

/**
 * `[-AXIS_MS, AXIS_MS]`를 고정 폭 버킷으로 나눠 유한 표본만 센다. 버킷 폭은
 * 순수 렌더 해상도라 값 자체를 바꾸지 않는다 — 승인 대상 표본 개수(200,
 * D-2026-054)와는 다른 종류의 상수다.
 */
export function histogramBuckets(errors: ArrayLike<number>, bucketWidthMs = 5): HistogramBucket[] {
  const bucketCount = Math.round((AXIS_MS * 2) / bucketWidthMs);
  const counts = new Array<number>(bucketCount).fill(0);

  for (let i = 0; i < errors.length; i++) {
    const value = errors[i]!;
    if (!Number.isFinite(value)) continue;
    const clamped = Math.max(-AXIS_MS, Math.min(AXIS_MS, value));
    const idx = Math.min(bucketCount - 1, Math.floor((clamped + AXIS_MS) / bucketWidthMs));
    counts[idx]!++;
  }

  return counts.map((count, i) => ({
    centerMs: -AXIS_MS + bucketWidthMs * (i + 0.5),
    count,
  }));
}

// ── §1.4 clear state 색(파생) ───────────────────────────────

const STATE_COLOR_VAR: Readonly<Record<PlayState, string>> = {
  AS: 'var(--j-sync)',
  AP: 'var(--j-perfect)',
  FC: 'var(--j-good)',
  H: 'var(--gauge-HARD)',
  C: 'var(--gauge-NORMAL)',
  F: 'var(--j-miss)',
};

export function stateColorVar(state: PlayState): string {
  return STATE_COLOR_VAR[state];
}

/**
 * §2.1 "약어(FC/AS)는 곡 선택창 전용" — result는 풀네임을 쓴다.
 * `AP`(ALL PERFECT)는 `ui-design.md`가 직접 표기하지 않아 `ALL SYNC`와
 * 동형으로 추정했고 D-2026-056으로 확정됐다.
 */
const STATE_LABEL: Readonly<Record<PlayState, string>> = {
  AS: 'ALL SYNC',
  AP: 'ALL PERFECT',
  FC: 'FULL COMBO',
  H: 'HARD CLEAR',
  C: 'CLEAR',
  F: 'FAILED',
};

export function stateLabel(state: PlayState): string {
  return STATE_LABEL[state];
}

// ── §1.6 랭크 색 ────────────────────────────────────────────

// `ui-design.md` §1.6은 `E`를 언급하지 않는다(`RANK_TABLE`엔 있음) — 표가 이미
// 인접 랭크를 그룹으로 묶는 구조라(S+/S, A+/A, C/D) 그 패턴을 한 칸 더 밀어
// `C`/`D` 그룹에 넣었고 D-2026-056으로 확정됐다.
const RANK_COLOR_VAR: Readonly<Record<Rank, string>> = {
  U: 'var(--cyan)',
  'S+': '#ffd23f',
  S: '#ffd23f',
  'A+': '#ececf4',
  A: '#ececf4',
  B: '#b0b0c8',
  C: '#8a8aa4',
  D: '#8a8aa4',
  E: '#8a8aa4',
  F: 'var(--j-miss)',
};

export function rankColorVar(rank: Rank): string {
  return RANK_COLOR_VAR[rank];
}

// ── §1.5 난이도 티어 ────────────────────────────────────────

/** `core-chart`의 `Difficulty`(Trace/Drift/Surge/Flux/Phase)를 티어 칩 토큰에 잇는다. */
const DIFFICULTY_TIER_VAR: Readonly<Record<Exclude<Difficulty, 'init'>, string>> = {
  Trace: 'var(--tier-TRACE)',
  Drift: 'var(--tier-DRIFT)',
  Surge: 'var(--tier-SURGE)',
  Flux: 'var(--tier-FLUX)',
  Phase: 'var(--tier-PHASE)',
};

const DIFFICULTY_INK_VAR: Readonly<Record<Exclude<Difficulty, 'init'>, string>> = {
  Trace: 'var(--ink-TRACE)',
  Drift: 'var(--ink-DRIFT)',
  Surge: 'var(--ink-SURGE)',
  Flux: 'var(--ink-FLUX)',
  Phase: 'var(--ink-PHASE)',
};

export function tierChipColors(difficulty: Difficulty): { bg: string; ink: string } | null {
  if (difficulty === 'init') return null; // editor 전용 — 플레이 결과에 나타나지 않는다.
  return { bg: DIFFICULTY_TIER_VAR[difficulty], ink: DIFFICULTY_INK_VAR[difficulty] };
}

// ── §1.3 게이지 종류 라벨(옵션 패널 "Gauge:") ────────────────

/**
 * `tier`를 옵션 패널 라벨로 편다. cascade는 확정된 tier로만 나타나므로
 * `GaugeMode`가 아니라 `PlayResult.tier`를 받는다(§2.4 "Cascade는 표기하지
 * 않는다"). fc/ap/as 풀네임은 `stateLabel`과 동형 — Deferred Finding 동일.
 */
const TIER_GAUGE_LABEL: Readonly<Record<Tier, string>> = {
  normal: 'Normal',
  hard: 'Hard',
  fc: 'Full Combo',
  ap: 'All Perfect',
  as: 'All Sync',
};

export function gaugeLabel(tier: Tier): string {
  return TIER_GAUGE_LABEL[tier];
}

export function gaugeColorVar(tier: Tier): string {
  if (tier === 'normal') return 'var(--gauge-NORMAL)';
  if (tier === 'hard') return 'var(--gauge-HARD)';
  return `var(--gauge-${tier.toUpperCase()})`;
}

// ── §2.2 기록 델타 ──────────────────────────────────────────

export interface Delta {
  readonly text: string;
  /** 색 선택용 — 동률(0)은 dim이지 양수 취급이 아니다. */
  readonly sign: -1 | 0 | 1;
}

/**
 * 표시 자릿수로 반올림한 **뒤에** 부호를 가른다(§2.2 "부동소수점 방지").
 * `decimals`는 accuracy=2, score=0.
 */
export function computeDelta(current: number, previous: number, decimals: number): Delta {
  const factor = 10 ** decimals;
  const rounded = Math.round((current - previous) * factor) / factor;
  const sign: Delta['sign'] = rounded > 0 ? 1 : rounded < 0 ? -1 : 0;
  const magnitude = Math.abs(rounded).toFixed(decimals);
  // U+2212(MINUS SIGN) — 하이픈 혼용 금지(§5).
  const signChar = sign === -1 ? '−' : '+';
  return { text: `${signChar}${magnitude}`, sign };
}

export function deltaColorVar(sign: Delta['sign']): string {
  if (sign > 0) return 'var(--cyan)';
  if (sign < 0) return 'var(--j-miss)';
  return 'var(--dim)';
}

// ── §1.7 FAST/SLOW ──────────────────────────────────────────

export function fastSlowColorVar(count: number, side: 'FAST' | 'SLOW'): string {
  if (count === 0) return 'var(--dimmer)';
  return side === 'FAST' ? 'var(--fast)' : 'var(--slow)';
}

// ── 서식 ────────────────────────────────────────────────────

export function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

export function formatAccuracy(accuracy: number): string {
  return `${accuracy.toFixed(2)}%`;
}

export function formatPlayedAt(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
