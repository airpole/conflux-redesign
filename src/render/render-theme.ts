/**
 * M2-2 범위의 표현 값. 단일 출처는 `render/theme.md` — 여기는 그 문서 §1·§3의
 * 코드 표현이다. 값을 바꾸려면 먼저 theme.md를 고친다.
 *
 * hit effect·sudden·HUD·key 빔·text event는 M2-2 범위 밖(M2-4·M2-5)이라 없다.
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
