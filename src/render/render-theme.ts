/**
 * M2-2·M2-4 범위의 표현 값. 단일 출처는 `render/theme.md` — 여기는 그 문서
 * §1·§3의 코드 표현이다. 값을 바꾸려면 먼저 theme.md를 고친다.
 *
 * sudden·key 빔·text event·게이지 채색·카운터/정확도(M2-5)는 아직 없다.
 */

export const CANVAS_BG = '#000';
export const PLAYFIELD_BG = '#050508';

export const PLAYFIELD_ASPECT = 16 / 9;

export const NOTE_COLOR = {
  wideHead: '#4AE8FF',
  wideBody: '#008898',
  normalHead: '#ffffff',
  normalBody: '#8888a0',
} as const;

export const SHAPE_BOUNDARY = {
  color: '#ffffffc8',
  lineWidth: 3,
} as const;

export const LANE_DIVIDER = {
  color: '#ffffff22',
  lineWidth: 1.5,
} as const;

export const SHAPE_STEP_LINE = {
  color: '#7ad6ff66',
  lineWidth: 2,
} as const;

/** 게이지 값이 없는(=idle) 상태의 판정선 트랙. 라이브 게이지 채색은 M2-5. */
export const JUDGE_TRACK = {
  trackColor: 'rgba(255,255,255,0.10)',
  baselineColor: '#ffffff',
  thicknessPx: 6,
  glowThicknessPx: 12,
} as const;

/** 판정별 색 — `render/theme.md` §1 "판정 색(hit effect)". 판정 텍스트에도 쓴다. */
export const JUDGMENT_COLOR = {
  SYNC: '#ffffff',
  PERFECT: '#ffe44a',
  GOOD: '#4aff8a',
  MISS: '#ff4a6a',
} as const;

export const FAST_SLOW_COLOR = {
  FAST: '#ff5a6a',
  SLOW: '#5aa0ff',
} as const;

/** hit effect(물결 반원) — `render/theme.md` §3 "sudden · hit effect". */
export const HIT_EFFECT = {
  /** shape 폭과 무관한 고정 반지름 — shape가 collapse해도 안 사라진다. */
  radiusFactor: 0.045,
  wideRadiusMultiplier: 1.6,
  durationMs: 300,
} as const;

/** HUD 텍스트(콤보·판정·FAST/SLOW) — `render/theme.md` §3 "HUD". */
export const HUD_TEXT = {
  comboSizeFactor: 0.06,
  judgmentSizeFactor: 0.021,
  fastSlowSizeFactor: 0.016,
  /** `comboY = jY - gh × (8/9 − comboOffsetFrac)`. */
  comboOffsetFrac: 0.22,
  /** 텍스트 줄 사이 여백 = `gw × gapFactor`. */
  gapFactor: 0.008,
  comboColor: '#ffffffdd',
  fastSlowFlashMs: 500,
} as const;
