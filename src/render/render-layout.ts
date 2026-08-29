/**
 * playfield 레이아웃 — 순수 기하 계산. canvas를 만지지 않는다.
 *
 * 정의: `render/theme.md` §3. 여기는 그 산출식의 코드 표현이다.
 */

import { PLAYFIELD_ASPECT } from './render-theme.js';

export interface PlayfieldRect {
  readonly gx: number;
  readonly gy: number;
  readonly gw: number;
  readonly gh: number;
}

/**
 * 캔버스 CSS px 크기를 16:9로 letterbox한다 `[보존]`. 넘치는 축에 여백을 두고
 * 중앙 정렬한다. 캔버스가 아직 레이아웃되지 않은 프레임(크기 0)은 빈 사각형을
 * 돌려준다 — 호출측이 그 프레임을 건너뛴다.
 */
export function computePlayfieldRect(canvasWidth: number, canvasHeight: number): PlayfieldRect {
  if (canvasWidth < 1 || canvasHeight < 1) return { gx: 0, gy: 0, gw: 0, gh: 0 };
  if (canvasWidth / canvasHeight > PLAYFIELD_ASPECT) {
    const gh = canvasHeight;
    const gw = gh * PLAYFIELD_ASPECT;
    return { gx: (canvasWidth - gw) / 2, gy: 0, gw, gh };
  }
  const gw = canvasWidth;
  const gh = gw / PLAYFIELD_ASPECT;
  return { gx: 0, gy: (canvasHeight - gh) / 2, gw, gh };
}

/** 판정선 기본 비율. 최하단이며, `judgeLinePos`는 이 값보다 올릴 수만 있다. */
export const JUDGE_LINE_DEFAULT_FRAC = 8 / 9;

/** 판정선 Y. `judgeLinePos`가 없으면 기본값, 있어도 기본보다 못 내려간다(raise-only). */
export function judgeLineY(rect: PlayfieldRect, judgeLinePos?: number): number {
  const frac = Math.min(JUDGE_LINE_DEFAULT_FRAC, judgeLinePos ?? JUDGE_LINE_DEFAULT_FRAC);
  return rect.gy + rect.gh * frac;
}

/**
 * shape 외부단위(-8~+8, [[shape]] §1)를 0..1 fraction으로.
 *
 * 원본의 raw 상수(`/64`)를 쓰지 않는다 — 재설계가 좌표계를 -8~+8 단일로
 * 통일했으므로 그 범위에서 직접 유도한다(`_extracted/EXTRACTED_FACTS.md` §12.4).
 */
export function shapePosToField(value: number): number {
  return (value + 8) / 16;
}

/** shape 좌표 → canvas x. `mirror`면 좌우를 뒤집는다. */
export function shapeX(rect: PlayfieldRect, value: number, mirror: boolean): number {
  const f = shapePosToField(value);
  return rect.gx + (mirror ? 1 - f : f) * rect.gw;
}

/**
 * lane 구분선 셋을 gameplay 투영 규칙대로 clamp한다 — 경계([0,1]) 안, 순서
 * (`line1 ≤ line2 ≤ line3`) 유지. **최소 간격 제한은 없다**(D-2026-048) — 값이
 * 붙어 선처럼 좁아지는 것도 유효하다.
 *
 * [[lane-events]] §4의 "경계+순서 클램프"를 그대로 구현한다. 순서를 세우는
 * 방법은 누적 max — 값이 뒤로 갈수록 앞선 clamp 결과보다 못 내려가게 한다.
 */
export function projectLaneLayout(layout: {
  readonly line1: number;
  readonly line2: number;
  readonly line3: number;
}): { readonly line1: number; readonly line2: number; readonly line3: number } {
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const line1 = clamp01(layout.line1);
  const line2 = Math.max(line1, clamp01(layout.line2));
  const line3 = Math.max(line2, clamp01(layout.line3));
  return { line1, line2, line3 };
}

/**
 * 판정선 기준 진행도([[core-timing]] `scrollProgressAt`)를 Y로. `progress`가
 * 0이면 판정선, `(jY-gy)/visMs`만큼 미래일수록 위(`gy` 쪽)로 올라간다.
 */
export function scrollYAt(rect: PlayfieldRect, jY: number, progress: number): number {
  return jY - progress * (jY - rect.gy);
}
