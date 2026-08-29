/**
 * playfield 렌더 — shape 경계·lane 구분선·note·판정선(idle 트랙)·판정 표시.
 *
 * M2-2 범위: "실측 레이아웃대로 판정선·lane·노트가 그려지고, scrollSpeed
 * 변경이 밀도만 바꾼다"(`_plan/build-order.md` M2-2) — 판정선은 항상 "idle"
 * 트랙(빈 게이지)으로 그린다(게이지 채색은 M2-5).
 *
 * M2-4 범위: 콤보·마지막 판정 텍스트·FAST/SLOW 플래시·hit effect. 카운터·
 * 정확도·score·pause 버튼·곡정보 띠(전부 `render/theme.md`가 게이지/카운터
 * 데이터를 요구)는 M2-5·M2-6 — 그 값이 실제로 생기는 시점에 짓는다(D-2026-046과
 * 같은 이유). sudden·key 빔·text event도 아직 없다.
 *
 * canvas API는 함수 인자로 받는다(`DrawContext` — CanvasRenderingContext2D의
 * 부분집합) — env-*와 같은 이유로, jsdom 없이 Node에서 mock으로 계약을 검사한다.
 */

import { NORMAL_CLEAR_PCT, SCROLL_VIEW_MS } from '../core/core-constants.js';
import { laneLayoutAt, shapeGeometryAt, type FieldGeometry } from '../core/core-shape.js';
import { msToTick, scrollProgressAt, tickToMs, type Timeline } from '../core/core-timing.js';
import type { Note } from '../core/core-chart.js';
import type { Judgment } from '../core/core-judge.js';
import {
  CANVAS_BG,
  FAST_SLOW_COLOR,
  GAUGE_COLOR,
  HIT_EFFECT,
  HUD_TEXT,
  JUDGE_TRACK,
  JUDGMENT_COLOR,
  LANE_DIVIDER,
  NOTE_COLOR,
  PLAYFIELD_BG,
  SHAPE_BOUNDARY,
} from './render-theme.js';
import {
  JUDGE_LINE_DEFAULT_FRAC,
  projectLaneLayout,
  scrollYAt,
  shapeX,
  type PlayfieldRect,
} from './render-layout.js';

/** 노트 가시 구간 밖 여유폭(ms). 경계에 걸친 note가 프레임 경계에서 안 끊기게. */
const NOTE_VISIBILITY_MARGIN_MS = 300;

export interface DrawContext {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
}

// ── 샘플링(경계·lane 곡선을 부드럽게 그리기 위한 tick 격자) ──────

export interface FieldSample {
  readonly y: number;
  readonly loX: number;
  readonly hiX: number;
  readonly dividerX: readonly [number, number, number];
}

/**
 * 현재 보이는 tick 구간을 균등 `sampleCount`개로 나눠 각 지점의 경계·구분선
 * 좌표를 미리 계산한다. 판정선(`progress=0`)부터 위(`progress=1`)까지다.
 */
export function buildFieldSamplePoints(
  geometry: FieldGeometry,
  timeline: Timeline,
  rect: PlayfieldRect,
  jY: number,
  curMs: number,
  scrollSpeed: number,
  mirror: boolean,
  sampleCount: number,
): FieldSample[] {
  const visMs = SCROLL_VIEW_MS / scrollSpeed;
  const botTk = msToTick(timeline, curMs);
  const topTk = msToTick(timeline, curMs + visMs);
  const samples: FieldSample[] = [];

  for (let s = 0; s <= sampleCount; s++) {
    const tick = botTk + (topTk - botTk) * (s / sampleCount);
    const progress = scrollProgressAt(timeline, tick, curMs, scrollSpeed);
    const y = scrollYAt(rect, jY, progress);
    const { blue, red } = shapeGeometryAt(geometry, tick);
    const leftX = shapeX(rect, Math.min(blue, red), mirror);
    const rightX = shapeX(rect, Math.max(blue, red), mirror);
    const loX = Math.min(leftX, rightX);
    const hiX = Math.max(leftX, rightX);
    const projected = projectLaneLayout(laneLayoutAt(geometry, tick));
    const dividerX: [number, number, number] = [
      loX + projected.line1 * (hiX - loX),
      loX + projected.line2 * (hiX - loX),
      loX + projected.line3 * (hiX - loX),
    ];
    samples.push({ y, loX, hiX, dividerX });
  }
  return samples;
}

function strokePolyline(ctx: DrawContext, points: readonly { x: number; y: number }[]): void {
  if (points.length < 2) return;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

export function drawShapeBoundary(ctx: DrawContext, samples: readonly FieldSample[]): void {
  ctx.strokeStyle = SHAPE_BOUNDARY.color;
  ctx.lineWidth = SHAPE_BOUNDARY.lineWidth;
  strokePolyline(
    ctx,
    samples.map((s) => ({ x: s.loX, y: s.y })),
  );
  strokePolyline(
    ctx,
    samples.map((s) => ({ x: s.hiX, y: s.y })),
  );
}

export function drawLaneDividers(ctx: DrawContext, samples: readonly FieldSample[]): void {
  ctx.strokeStyle = LANE_DIVIDER.color;
  ctx.lineWidth = LANE_DIVIDER.lineWidth;
  for (let line = 0; line < 3; line++) {
    strokePolyline(
      ctx,
      samples.map((s) => ({ x: s.dividerX[line]!, y: s.y })),
    );
  }
}

// ── notes ───────────────────────────────────────────────────

export interface NoteRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
}

/** lane(1~4) 구간의 [x, width]. loX..hiX를 `projected` 세 구분선으로 4등분한다. */
function laneSegment(
  loX: number,
  hiX: number,
  projected: { readonly line1: number; readonly line2: number; readonly line3: number },
  lane: 1 | 2 | 3 | 4,
): { readonly x: number; readonly width: number } {
  const bounds = [0, projected.line1, projected.line2, projected.line3, 1];
  const f0 = bounds[lane - 1]!;
  const f1 = bounds[lane]!;
  const x0 = loX + f0 * (hiX - loX);
  const x1 = loX + f1 * (hiX - loX);
  return { x: x0, width: x1 - x0 };
}

/**
 * note 머리(head) 사각형. tap이든 hold든 `startTick`의 위치다.
 *
 * 두께 = `noteThicknessPx × (wide ? 1 : 0.9)`, 좌우 패딩 = normal `width×0.05`
 * / wide `0` — `render/theme.md` §3 "notes · lane".
 */
export function computeNoteHeadRect(
  note: Note,
  geometry: FieldGeometry,
  timeline: Timeline,
  rect: PlayfieldRect,
  jY: number,
  curMs: number,
  scrollSpeed: number,
  mirror: boolean,
  noteThicknessPx: number,
): NoteRect {
  const progress = scrollProgressAt(timeline, note.startTick, curMs, scrollSpeed);
  const y = scrollYAt(rect, jY, progress);
  const { blue, red } = shapeGeometryAt(geometry, note.startTick);
  const leftX = shapeX(rect, Math.min(blue, red), mirror);
  const rightX = shapeX(rect, Math.max(blue, red), mirror);
  const loX = Math.min(leftX, rightX);
  const hiX = Math.max(leftX, rightX);

  const height = noteThicknessPx * (note.isWide ? 1 : 0.9);
  if (note.isWide) {
    return { x: loX, y, width: hiX - loX, height, color: NOTE_COLOR.wideHead };
  }
  const projected = projectLaneLayout(laneLayoutAt(geometry, note.startTick));
  const segment = laneSegment(loX, hiX, projected, note.lane);
  const pad = segment.width * 0.05;
  return {
    x: segment.x + pad,
    y,
    width: segment.width - pad * 2,
    height,
    color: NOTE_COLOR.normalHead,
  };
}

export function drawNoteHead(ctx: DrawContext, note: NoteRect): void {
  ctx.fillStyle = note.color;
  ctx.fillRect(note.x, note.y - note.height / 2, note.width, note.height);
}

// ── 판정선(idle 트랙) ───────────────────────────────────────

/**
 * 게이지 값이 없을 때(=아직 M2-5 배선 전)의 판정선. 빈 트랙(6px) + 흰
 * baseline(1px) — 라이브 게이지가 붙어도 두께가 그대로라 재생 시작 시 안
 * 튄다. 글로우 그라디언트(`render/theme.md` §3)는 M2-5에서 게이지 채색과
 * 함께 붙인다 — `DrawContext`가 아직 `createLinearGradient`를 안 받는다.
 */
export function drawJudgeTrack(ctx: DrawContext, rect: PlayfieldRect, jY: number): void {
  const half = JUDGE_TRACK.thicknessPx / 2;
  ctx.fillStyle = JUDGE_TRACK.trackColor;
  ctx.fillRect(rect.gx, jY - half, rect.gw, JUDGE_TRACK.thicknessPx);
  ctx.strokeStyle = JUDGE_TRACK.baselineColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rect.gx, jY);
  ctx.lineTo(rect.gx + rect.gw, jY);
  ctx.stroke();
}

/**
 * 라이브 게이지 바(=판정선 겸용). `drawPlayfield`가 그린 idle 트랙 위에 이
 * 함수를 덧그려 채운다 — 같은 6px 두께 트랙에 값만큼 채우고 baseline은
 * 그대로다. `hard`는 항상 빨강, `normal`은 75%(`NORMAL_CLEAR_PCT`) 미만
 * 초록 → 이상 하늘색으로 반전(`render/theme.md` §1 gauge).
 */
export function drawGaugeBar(
  ctx: DrawContext,
  rect: PlayfieldRect,
  jY: number,
  gaugeValue: number,
  mode: 'hard' | 'normal',
): void {
  const half = JUDGE_TRACK.thicknessPx / 2;
  ctx.fillStyle = JUDGE_TRACK.trackColor;
  ctx.fillRect(rect.gx, jY - half, rect.gw, JUDGE_TRACK.thicknessPx);

  const frac = Math.max(0, Math.min(1, gaugeValue / 100));
  const fill =
    mode === 'hard'
      ? GAUGE_COLOR.hard
      : gaugeValue >= NORMAL_CLEAR_PCT
        ? GAUGE_COLOR.normalCleared
        : GAUGE_COLOR.normalBelowClear;
  ctx.fillStyle = fill;
  ctx.fillRect(rect.gx, jY - half, rect.gw * frac, JUDGE_TRACK.thicknessPx);

  ctx.strokeStyle = JUDGE_TRACK.baselineColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rect.gx, jY);
  ctx.lineTo(rect.gx + rect.gw, jY);
  ctx.stroke();
}

// ── 한 프레임 ───────────────────────────────────────────────

/**
 * 한 프레임의 playfield 전체. draw order(`render/theme.md` §2)를 따른다 —
 * 배경 → shape 경계 → lane 구분선 → notes → 판정선. M2-2 범위 밖(jacket·키
 * 빔·마디선·sudden·hit effect·HUD)은 없다.
 */
export function drawPlayfield(
  ctx: DrawContext,
  canvasWidth: number,
  canvasHeight: number,
  rect: PlayfieldRect,
  jY: number,
  geometry: FieldGeometry,
  timeline: Timeline,
  notes: readonly Note[],
  curMs: number,
  scrollSpeed: number,
  mirror: boolean,
  noteThicknessPx: number,
  sampleCount = 64,
): void {
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = PLAYFIELD_BG;
  ctx.fillRect(rect.gx, rect.gy, rect.gw, rect.gh);

  const samples = buildFieldSamplePoints(
    geometry,
    timeline,
    rect,
    jY,
    curMs,
    scrollSpeed,
    mirror,
    sampleCount,
  );
  drawShapeBoundary(ctx, samples);
  drawLaneDividers(ctx, samples);

  const visMs = SCROLL_VIEW_MS / scrollSpeed;
  for (const note of notes) {
    const noteMs = tickToMs(timeline, note.startTick);
    if (noteMs < curMs - NOTE_VISIBILITY_MARGIN_MS) continue;
    if (noteMs > curMs + visMs + NOTE_VISIBILITY_MARGIN_MS) continue;
    drawNoteHead(
      ctx,
      computeNoteHeadRect(
        note,
        geometry,
        timeline,
        rect,
        jY,
        curMs,
        scrollSpeed,
        mirror,
        noteThicknessPx,
      ),
    );
  }

  drawJudgeTrack(ctx, rect, jY);
}

// ── 판정 표시(M2-4) ─────────────────────────────────────────
//
// 이 절의 함수들은 game 레이어(`game-judge-display.ts`)가 만든 상태를
// 그린다. render는 그 아래층이라(architecture §1) 그 파일을 import하지
// 않는다 — 구조가 같은 값(judgment·atMs 등)을 인자로 받을 뿐이다.

export interface JudgmentTextView {
  readonly judgment: Judgment;
  readonly atMs: number;
}

export interface FastSlowView {
  readonly side: 'FAST' | 'SLOW';
  readonly atMs: number;
}

export interface HitEffectView {
  readonly note: Note;
  readonly judgment: Judgment;
  readonly atMs: number;
}

/** `combo > 0`일 때만 그린다 — 0콤보를 화면에 반복해서 띄우지 않는다. */
export function drawCombo(ctx: DrawContext, rect: PlayfieldRect, jY: number, combo: number): void {
  if (combo <= 0) return;
  const comboSz = rect.gw * HUD_TEXT.comboSizeFactor;
  const comboY = jY - rect.gh * (JUDGE_LINE_DEFAULT_FRAC - HUD_TEXT.comboOffsetFrac);
  ctx.font = `bold ${Math.round(comboSz)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = HUD_TEXT.comboColor;
  ctx.fillText(String(combo), rect.gx + rect.gw / 2, comboY);
}

/**
 * 마지막 판정 텍스트. 콤보 블록 바로 아래(`render/theme.md` §3 HUD) — 카운터·
 * 정확도 행이 아직 없어(M2-5) 그 자리를 당겨 쓴다.
 */
export function drawJudgmentText(
  ctx: DrawContext,
  rect: PlayfieldRect,
  jY: number,
  flash: JudgmentTextView,
): void {
  const comboSz = rect.gw * HUD_TEXT.comboSizeFactor;
  const judgeSz = rect.gw * HUD_TEXT.judgmentSizeFactor;
  const gap = rect.gw * HUD_TEXT.gapFactor;
  const comboY = jY - rect.gh * (JUDGE_LINE_DEFAULT_FRAC - HUD_TEXT.comboOffsetFrac);
  const judgeY = comboY + comboSz / 2 + gap + judgeSz / 2;
  ctx.font = `bold ${Math.round(judgeSz)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = JUDGMENT_COLOR[flash.judgment];
  ctx.fillText(flash.judgment, rect.gx + rect.gw / 2, judgeY);
}

/** FAST/SLOW 플래시. `HUD_TEXT.fastSlowFlashMs` 안에서만 그린다. */
export function drawFastSlow(
  ctx: DrawContext,
  rect: PlayfieldRect,
  jY: number,
  flash: FastSlowView,
  nowMs: number,
): void {
  const age = nowMs - flash.atMs;
  if (age < 0 || age >= HUD_TEXT.fastSlowFlashMs) return;
  const comboSz = rect.gw * HUD_TEXT.comboSizeFactor;
  const judgeSz = rect.gw * HUD_TEXT.judgmentSizeFactor;
  const fsSz = rect.gw * HUD_TEXT.fastSlowSizeFactor;
  const gap = rect.gw * HUD_TEXT.gapFactor;
  const comboY = jY - rect.gh * (JUDGE_LINE_DEFAULT_FRAC - HUD_TEXT.comboOffsetFrac);
  const judgeY = comboY + comboSz / 2 + gap + judgeSz / 2;
  const fsY = judgeY + judgeSz / 2 + gap + fsSz / 2;
  ctx.font = `bold ${Math.round(fsSz)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = FAST_SLOW_COLOR[flash.side];
  ctx.fillText(flash.side, rect.gx + rect.gw / 2, fsY);
}

/**
 * hit effect(물결 반원) 하나의 중심·반지름·불투명도. `HIT_EFFECT.durationMs`
 * 지나면 `null` — 판정선 위 반원 하나로 단순화했다(원본은 위/아래를 note 쪽에
 * 따라 갈랐고 Hold는 tail까지 지속하는 별도 애니메이션이었다 — 배선은 M2-4,
 * 그 세부 연출은 후속 다듬기로 미룬다).
 */
export function computeHitEffectVisual(
  effect: HitEffectView,
  geometry: FieldGeometry,
  rect: PlayfieldRect,
  mirror: boolean,
  nowMs: number,
): {
  readonly cx: number;
  readonly radius: number;
  readonly alpha: number;
  readonly color: string;
} | null {
  const age = nowMs - effect.atMs;
  if (age < 0 || age >= HIT_EFFECT.durationMs) return null;

  const { blue, red } = shapeGeometryAt(geometry, effect.note.startTick);
  const leftX = shapeX(rect, Math.min(blue, red), mirror);
  const rightX = shapeX(rect, Math.max(blue, red), mirror);
  const loX = Math.min(leftX, rightX);
  const hiX = Math.max(leftX, rightX);

  let cx: number;
  if (effect.note.isWide) {
    cx = (loX + hiX) / 2;
  } else {
    const projected = projectLaneLayout(laneLayoutAt(geometry, effect.note.startTick));
    const segment = laneSegment(loX, hiX, projected, effect.note.lane);
    cx = segment.x + segment.width / 2;
  }

  const fixedR = rect.gw * HIT_EFFECT.radiusFactor;
  const radius = effect.note.isWide ? fixedR * HIT_EFFECT.wideRadiusMultiplier : fixedR;

  const t = age / HIT_EFFECT.durationMs;
  const alpha = t < 0.4 ? 0.8 : 0.8 * (1 - (t - 0.4) / 0.6);
  const size = 0.15 + Math.sqrt(t) * 0.85;

  return { cx, radius: radius * size, alpha, color: JUDGMENT_COLOR[effect.judgment] };
}

/** 판정선 위쪽 반원(above-only, 위 함수 docstring 참조)으로 hit effect를 그린다. */
export function drawHitEffect(
  ctx: DrawContext,
  jY: number,
  visual: {
    readonly cx: number;
    readonly radius: number;
    readonly alpha: number;
    readonly color: string;
  },
): void {
  ctx.globalAlpha = visual.alpha;
  ctx.fillStyle = visual.color;
  ctx.beginPath();
  ctx.arc(visual.cx, jY, visual.radius, Math.PI, 2 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
