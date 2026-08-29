import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import { buildFieldGeometry } from '../core/core-shape.js';
import { buildTimeline } from '../core/core-timing.js';
import { computePlayfieldRect, judgeLineY } from './render-layout.js';
import {
  computeNoteHeadRect,
  drawJudgeTrack,
  drawLaneDividers,
  drawNoteHead,
  drawPlayfield,
  drawShapeBoundary,
  buildFieldSamplePoints,
  type DrawContext,
} from './render-playfield.js';

function fakeCtx(): DrawContext & { calls: string[] } {
  const calls: string[] = [];
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    calls,
    fillRect(x, y, w, h) {
      calls.push(`fillRect ${this.fillStyle} ${x},${y},${w},${h}`);
    },
    beginPath() {
      calls.push('beginPath');
    },
    moveTo(x, y) {
      calls.push(`moveTo ${x},${y}`);
    },
    lineTo(x, y) {
      calls.push(`lineTo ${x},${y}`);
    },
    closePath() {
      calls.push('closePath');
    },
    fill() {
      calls.push(`fill ${this.fillStyle}`);
    },
    stroke() {
      calls.push(`stroke ${this.strokeStyle} ${this.lineWidth}`);
    },
  };
}

const rect = computePlayfieldRect(1600, 900);
const jY = judgeLineY(rect);

describe('buildFieldSamplePoints', () => {
  it('경계 이벤트가 없는 chart는 init fallback(-2/+2)에서 시작해 fraction 0.375/0.625로 벌어진다', () => {
    const geometry = buildFieldGeometry(makeChart());
    const samples = buildFieldSamplePoints(
      geometry,
      buildTimeline(makeChart()),
      rect,
      jY,
      0,
      1,
      false,
      4,
    );
    const first = samples[0]!;
    expect(first.loX).toBeCloseTo(rect.gx + 0.375 * rect.gw, 5);
    expect(first.hiX).toBeCloseTo(rect.gx + 0.625 * rect.gw, 5);
  });

  it('scrollSpeed가 커지면 같은 sampleCount가 더 좁은 tick 구간을 담는다(밀도만 변화)', () => {
    const chart = makeChart();
    const timeline = buildTimeline(chart);
    const geometry = buildFieldGeometry(chart);
    const slow = buildFieldSamplePoints(geometry, timeline, rect, jY, 0, 1, false, 4);
    const fast = buildFieldSamplePoints(geometry, timeline, rect, jY, 0, 2, false, 4);
    // y 좌표(화면 배치)는 scrollSpeed와 무관 — 같은 sampleCount는 같은 y 격자를 낸다.
    expect(fast.map((s) => s.y)).toEqual(slow.map((s) => s.y));
  });
});

describe('drawShapeBoundary · drawLaneDividers', () => {
  it('좌우 경계선을 SHAPE_BOUNDARY 스타일로 두 번(왼쪽·오른쪽) 긋는다', () => {
    const geometry = buildFieldGeometry(makeChart());
    const timeline = buildTimeline(makeChart());
    const samples = buildFieldSamplePoints(geometry, timeline, rect, jY, 0, 1, false, 2);
    const ctx = fakeCtx();
    drawShapeBoundary(ctx, samples);
    const strokes = ctx.calls.filter((c) => c.startsWith('stroke'));
    expect(strokes).toHaveLength(2);
    expect(strokes[0]).toBe('stroke #ffffffc8 3');
  });

  it('lane 구분선 3개를 LANE_DIVIDER 스타일로 긋는다', () => {
    const geometry = buildFieldGeometry(makeChart());
    const timeline = buildTimeline(makeChart());
    const samples = buildFieldSamplePoints(geometry, timeline, rect, jY, 0, 1, false, 2);
    const ctx = fakeCtx();
    drawLaneDividers(ctx, samples);
    const strokes = ctx.calls.filter((c) => c.startsWith('stroke'));
    expect(strokes).toHaveLength(3);
    expect(strokes[0]).toBe('stroke #ffffff22 1.5');
  });
});

describe('computeNoteHeadRect', () => {
  it('normal note는 lane 구간 안에 5% 패딩을 두고 그려진다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const geometry = buildFieldGeometry(chart);
    const timeline = buildTimeline(chart);
    const note = computeNoteHeadRect(
      chart.notes[0]!,
      geometry,
      timeline,
      rect,
      jY,
      0,
      1,
      false,
      15,
    );
    // lane 1은 [loX, line1] 구간 — init fallback line1=0.25, shape span [0.375,0.625].
    const loX = rect.gx + 0.375 * rect.gw;
    const hiX = rect.gx + 0.625 * rect.gw;
    const laneW = (hiX - loX) * 0.25;
    expect(note.width).toBeCloseTo(laneW * 0.9, 5);
    expect(note.height).toBeCloseTo(15 * 0.9, 5);
    expect(note.color).toBe('#ffffff');
  });

  it('wide note는 shape 전체 폭을 패딩 없이 채운다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: true }] });
    const geometry = buildFieldGeometry(chart);
    const timeline = buildTimeline(chart);
    const note = computeNoteHeadRect(
      chart.notes[0]!,
      geometry,
      timeline,
      rect,
      jY,
      0,
      1,
      false,
      15,
    );
    const loX = rect.gx + 0.375 * rect.gw;
    const hiX = rect.gx + 0.625 * rect.gw;
    expect(note.width).toBeCloseTo(hiX - loX, 5);
    expect(note.height).toBeCloseTo(15, 5);
    expect(note.color).toBe('#4AE8FF');
  });

  it('startTick의 진행도가 0이면(=지금이 판정 시각) 판정선 위치에 그려진다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const geometry = buildFieldGeometry(chart);
    const timeline = buildTimeline(chart);
    const note = computeNoteHeadRect(
      chart.notes[0]!,
      geometry,
      timeline,
      rect,
      jY,
      0,
      1,
      false,
      15,
    );
    expect(note.y).toBeCloseTo(jY, 5);
  });
});

describe('drawJudgeTrack', () => {
  it('gy 기준이 아니라 jY를 중심으로 6px 트랙 + baseline을 그린다', () => {
    const ctx = fakeCtx();
    drawJudgeTrack(ctx, rect, jY);
    expect(ctx.calls).toContain(
      `fillRect rgba(255,255,255,0.10) ${rect.gx},${jY - 3},${rect.gw},6`,
    );
    expect(ctx.calls.some((c) => c === `moveTo ${rect.gx},${jY}`)).toBe(true);
  });
});

describe('drawNoteHead', () => {
  it('세로 중앙 정렬로 fillRect한다', () => {
    const ctx = fakeCtx();
    drawNoteHead(ctx, { x: 10, y: 100, width: 20, height: 8, color: '#fff' });
    expect(ctx.calls).toContain('fillRect #fff 10,96,20,8');
  });
});

describe('drawPlayfield — 통합', () => {
  it('scrollSpeed를 바꿔도 그려지는 note 개수(밀도)만 바뀌고 재생 위치 기준은 그대로다', () => {
    const chart = makeChart({
      notes: [
        { startTick: 0, duration: 0, lane: 1, isWide: false },
        { startTick: 480 * 8, duration: 0, lane: 2, isWide: false }, // 한참 뒤 — 느린 스크롤에서만 보임
      ],
    });
    const geometry = buildFieldGeometry(chart);
    const timeline = buildTimeline(chart);

    const slowCtx = fakeCtx();
    drawPlayfield(slowCtx, 1600, 900, rect, jY, geometry, timeline, chart.notes, 0, 0.3, false, 15);
    const fastCtx = fakeCtx();
    drawPlayfield(fastCtx, 1600, 900, rect, jY, geometry, timeline, chart.notes, 0, 5, false, 15);

    const countFillRects = (ctx: typeof slowCtx) =>
      ctx.calls.filter(
        (c) => c.startsWith('fillRect #ffffff ') || c.startsWith('fillRect #4AE8FF '),
      ).length;

    expect(countFillRects(slowCtx)).toBeGreaterThan(countFillRects(fastCtx));
  });

  it('배경을 캔버스 전체 → playfield 순으로 채운다(draw order)', () => {
    const chart = makeChart();
    const geometry = buildFieldGeometry(chart);
    const timeline = buildTimeline(chart);
    const ctx = fakeCtx();
    drawPlayfield(ctx, 1600, 900, rect, jY, geometry, timeline, chart.notes, 0, 1, false, 15);
    const bgCalls = ctx.calls.filter(
      (c) => c.startsWith('fillRect #000') || c.startsWith('fillRect #050508'),
    );
    expect(bgCalls[0]).toBe('fillRect #000 0,0,1600,900');
    expect(bgCalls[1]).toBe(`fillRect #050508 ${rect.gx},${rect.gy},${rect.gw},${rect.gh}`);
  });
});
