/**
 * playfield 렌더 — shape 경계·lane 구분선·note·판정선(idle 트랙).
 *
 * M2-2 범위: "실측 레이아웃대로 판정선·lane·노트가 그려지고, scrollSpeed
 * 변경이 밀도만 바꾼다"(`_plan/build-order.md` M2-2). 게이지 채색(M2-5),
 * hit effect·sudden·key 빔·text event(M2-4·M2-5)는 없다 — 판정선은 항상
 * "idle" 트랙(빈 게이지)으로 그린다.
 *
 * canvas API는 함수 인자로 받는다(`DrawContext` — CanvasRenderingContext2D의
 * 부분집합) — env-*와 같은 이유로, jsdom 없이 Node에서 mock으로 계약을 검사한다.
 */

import { SCROLL_VIEW_MS } from '../core/core-constants.js';
import { laneLayoutAt, shapeGeometryAt, type FieldGeometry } from '../core/core-shape.js';
import { msToTick, scrollProgressAt, tickToMs, type Timeline } from '../core/core-timing.js';
import type { Note } from '../core/core-chart.js';
import {
  CANVAS_BG,
  JUDGE_TRACK,
  LANE_DIVIDER,
  NOTE_COLOR,
  PLAYFIELD_BG,
  SHAPE_BOUNDARY,
} from './render-theme.js';
import { projectLaneLayout, scrollYAt, shapeX, type PlayfieldRect } from './render-layout.js';

/** 노트 가시 구간 밖 여유폭(ms). 경계에 걸친 note가 프레임 경계에서 안 끊기게. */
const NOTE_VISIBILITY_MARGIN_MS = 300;

export interface DrawContext {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
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
