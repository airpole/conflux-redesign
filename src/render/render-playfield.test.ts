import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import { buildFieldGeometry } from '../core/core-shape.js';
import { buildTimeline } from '../core/core-timing.js';
import { computePlayfieldRect, judgeLineY } from './render-layout.js';
import {
  computeActiveTextEvents,
  computeHitEffectVisual,
  computeNoteHeadRect,
  drawCombo,
  drawCounterPercent,
  drawFastSlow,
  drawGaugeBar,
  drawHitEffect,
  drawJacketBackground,
  drawJudgeTrack,
  drawJudgmentText,
  drawKeyBeams,
  drawLaneDividers,
  drawMeasureLines,
  drawNoteHead,
  drawPauseIcon,
  drawPlayfield,
  drawShapeBoundary,
  drawSongInfoStrip,
  drawSuddenCover,
  drawTextEvent,
  buildFieldSamplePoints,
  pauseIconHitRegion,
  pauseIconHitTest,
  type DrawContext,
} from './render-playfield.js';

function fakeCtx(): DrawContext & { calls: string[] } {
  const calls: string[] = [];
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    calls,
    fillRect(x, y, w, h) {
      calls.push(`fillRect ${this.fillStyle} ${x},${y},${w},${h}`);
    },
    fillText(text, x, y) {
      calls.push(`fillText ${this.fillStyle} "${text}" ${x},${y}`);
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
    arc(x, y, radius, startAngle, endAngle) {
      calls.push(`arc ${x},${y},${radius},${startAngle},${endAngle}`);
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
    drawImage(_image, dx, dy, dw, dh) {
      calls.push(`drawImage ${dx},${dy},${dw},${dh}`);
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

describe('drawGaugeBar', () => {
  it('hard 모드는 값과 무관하게 항상 빨강이다', () => {
    const ctx = fakeCtx();
    drawGaugeBar(ctx, rect, jY, 90, 'hard');
    expect(ctx.calls).toContain(`fillRect #ff4a5a ${rect.gx},${jY - 3},${rect.gw * 0.9},6`);
  });

  it('normal 모드는 75% 미만이면 초록이다', () => {
    const ctx = fakeCtx();
    drawGaugeBar(ctx, rect, jY, 50, 'normal');
    expect(ctx.calls).toContain(`fillRect #4aff8a ${rect.gx},${jY - 3},${rect.gw * 0.5},6`);
  });

  it('normal 모드는 75% 이상이면 하늘색으로 반전한다', () => {
    const ctx = fakeCtx();
    drawGaugeBar(ctx, rect, jY, 80, 'normal');
    expect(ctx.calls).toContain(`fillRect #4ad6ff ${rect.gx},${jY - 3},${rect.gw * 0.8},6`);
  });

  it('75% 정확히는 반전된 쪽(하늘색)이다 — 경계 포함', () => {
    const ctx = fakeCtx();
    drawGaugeBar(ctx, rect, jY, 75, 'normal');
    expect(ctx.calls).toContain(`fillRect #4ad6ff ${rect.gx},${jY - 3},${rect.gw * 0.75},6`);
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

describe('drawCombo', () => {
  it('0콤보는 그리지 않는다', () => {
    const ctx = fakeCtx();
    drawCombo(ctx, rect, jY, 0);
    expect(ctx.calls).toHaveLength(0);
  });

  it('콤보 값을 판정선 위 고정 오프셋에 그린다', () => {
    const ctx = fakeCtx();
    drawCombo(ctx, rect, jY, 42);
    expect(ctx.calls.some((c) => c.includes('"42"'))).toBe(true);
  });
});

describe('drawJudgmentText', () => {
  it('판정 종류를 그 색으로 그린다', () => {
    const ctx = fakeCtx();
    drawJudgmentText(ctx, rect, jY, { judgment: 'PERFECT', atMs: 0 }, 0);
    expect(ctx.calls.some((c) => c.startsWith('fillText #ffe44a "PERFECT"'))).toBe(true);
  });

  it('judgmentFlashMs가 지나면 더 안 그린다(M4.5-1)', () => {
    const ctx = fakeCtx();
    drawJudgmentText(ctx, rect, jY, { judgment: 'PERFECT', atMs: 0 }, 500);
    expect(ctx.calls).toEqual([]);
  });
});

describe('drawFastSlow', () => {
  it('flashMs 안에서만 그린다', () => {
    const ctx = fakeCtx();
    drawFastSlow(ctx, rect, jY, { side: 'FAST', atMs: 0 }, 499);
    expect(ctx.calls.some((c) => c.startsWith('fillText'))).toBe(true);
  });

  it('flashMs가 지나면 그리지 않는다', () => {
    const ctx = fakeCtx();
    drawFastSlow(ctx, rect, jY, { side: 'FAST', atMs: 0 }, 500);
    expect(ctx.calls).toHaveLength(0);
  });
});

describe('computeHitEffectVisual · drawHitEffect', () => {
  it('durationMs가 지나면 null이다', () => {
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const geometry = buildFieldGeometry(chart);
    const visual = computeHitEffectVisual(
      { note: chart.notes[0]!, judgment: 'SYNC', atMs: 0 },
      geometry,
      rect,
      false,
      300,
    );
    expect(visual).toBeNull();
  });

  it('wide note는 normal보다 반지름이 크다', () => {
    const normalChart = makeChart({
      notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }],
    });
    const wideChart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: true }] });
    const normalVisual = computeHitEffectVisual(
      { note: normalChart.notes[0]!, judgment: 'SYNC', atMs: 0 },
      buildFieldGeometry(normalChart),
      rect,
      false,
      0,
    );
    const wideVisual = computeHitEffectVisual(
      { note: wideChart.notes[0]!, judgment: 'SYNC', atMs: 0 },
      buildFieldGeometry(wideChart),
      rect,
      false,
      0,
    );
    expect(wideVisual!.radius).toBeGreaterThan(normalVisual!.radius);
  });

  it('drawHitEffect는 판정선 위쪽 반원(π~2π)을 채운다', () => {
    const ctx = fakeCtx();
    drawHitEffect(ctx, jY, { cx: 100, radius: 20, alpha: 0.5, color: '#fff' });
    expect(ctx.calls).toContain(`arc 100,${jY},20,${Math.PI},${2 * Math.PI}`);
  });
});

// ── M4.5-1 HUD 나머지 ─────────────────────────────────────────

describe('drawJacketBackground', () => {
  it('brightnessPct가 0이면 아무것도 안 그린다', () => {
    const ctx = fakeCtx();
    drawJacketBackground(ctx, 1600, 900, {} as CanvasImageSource, 800, 450, 0);
    expect(ctx.calls).toEqual([]);
  });

  it('brightnessPct > 0이면 cover-fit으로 drawImage를 부른다', () => {
    const ctx = fakeCtx();
    drawJacketBackground(ctx, 1600, 900, {} as CanvasImageSource, 800, 450, 100);
    expect(ctx.calls.some((c) => c.startsWith('drawImage'))).toBe(true);
  });
});

describe('drawKeyBeams', () => {
  it('눌린 lane이 없으면 아무것도 안 그린다', () => {
    const ctx = fakeCtx();
    const geometry = buildFieldGeometry(makeChart());
    drawKeyBeams(ctx, rect, jY, geometry, buildTimeline(makeChart()), 0, false, new Set());
    expect(ctx.calls).toEqual([]);
  });

  it('눌린 lane이 있으면 헤드+빔을 채운다', () => {
    const ctx = fakeCtx();
    const chart = makeChart();
    const geometry = buildFieldGeometry(chart);
    drawKeyBeams(ctx, rect, jY, geometry, buildTimeline(chart), 0, false, new Set([1]));
    expect(ctx.calls.filter((c) => c.startsWith('fillRect')).length).toBeGreaterThanOrEqual(2);
  });
});

describe('drawMeasureLines', () => {
  it('보이는 구간의 마디 시작점마다 선을 긋는다', () => {
    const ctx = fakeCtx();
    const chart = makeChart();
    const geometry = buildFieldGeometry(chart);
    const timeline = buildTimeline(chart);
    drawMeasureLines(ctx, rect, jY, geometry, timeline, 0, 3, false);
    expect(ctx.calls.some((c) => c.startsWith('stroke'))).toBe(true);
  });
});

describe('drawSuddenCover', () => {
  it('0이면 안 그린다', () => {
    const ctx = fakeCtx();
    drawSuddenCover(ctx, rect, jY, 0);
    expect(ctx.calls).toEqual([]);
  });

  it('90이면 최대 95%까지만 덮는다', () => {
    const ctx = fakeCtx();
    drawSuddenCover(ctx, rect, jY, 90);
    const call = ctx.calls.find((c) => c.startsWith('fillRect'))!;
    const height = Number(call.split(',')[3]);
    expect(height).toBeLessThanOrEqual((jY - rect.gy) * 0.95 + 1e-9);
  });
});

describe('computeActiveTextEvents', () => {
  const chart = makeChart({
    textEvents: [{ startTick: 0, duration: 960, content: 'hello', position: 'left' }],
  });
  const timeline = buildTimeline(chart);

  it('구간 밖이면 안 뜬다', () => {
    expect(computeActiveTextEvents(chart.textEvents, timeline, -100_000)).toEqual([]);
  });

  it('구간 안이면 alpha 1로 뜬다(fade 경계 밖)', () => {
    const active = computeActiveTextEvents(chart.textEvents, timeline, 250);
    expect(active).toHaveLength(1);
    expect(active[0]!.alpha).toBe(1);
    expect(active[0]!.content).toBe('hello');
  });

  it('시작 직전(TEXT_FADE_MS 안)은 fade-in alpha가 1보다 작다', () => {
    const active = computeActiveTextEvents(chart.textEvents, timeline, -100);
    expect(active).toHaveLength(1);
    expect(active[0]!.alpha).toBeGreaterThan(0);
    expect(active[0]!.alpha).toBeLessThan(1);
  });
});

describe('drawTextEvent', () => {
  it('컬럼(left/middle/right) 텍스트는 세로 중앙에 그려진다', () => {
    const ctx = fakeCtx();
    const geometry = buildFieldGeometry(makeChart());
    drawTextEvent(ctx, rect, jY, geometry, 0, false, {
      content: 'hi',
      position: 'middle',
      alpha: 1,
    });
    expect(ctx.calls.some((c) => c.includes('"hi"'))).toBe(true);
  });

  it('lane1~4 텍스트는 판정선 위(삼각+하이라이트+텍스트)를 그린다', () => {
    const ctx = fakeCtx();
    const geometry = buildFieldGeometry(makeChart());
    drawTextEvent(ctx, rect, jY, geometry, 0, false, {
      content: 'go',
      position: 'lane1',
      alpha: 1,
    });
    expect(ctx.calls.some((c) => c.includes('"go"'))).toBe(true);
    expect(ctx.calls.some((c) => c.startsWith('fill '))).toBe(true); // 삼각형
  });
});

describe('drawCounterPercent', () => {
  it('총 판정 수와 accuracy%를 그린다', () => {
    const ctx = fakeCtx();
    drawCounterPercent(ctx, rect, jY, { SYNC: 3, PERFECT: 1, GOOD: 0, MISS: 1 }, 87.5);
    expect(ctx.calls.some((c) => c.includes('"5"'))).toBe(true);
    expect(ctx.calls.some((c) => c.includes('"87.50%"'))).toBe(true);
  });
});

describe('drawSongInfoStrip', () => {
  it('곡명·아티스트를 그린다', () => {
    const ctx = fakeCtx();
    drawSongInfoStrip(ctx, rect, jY, 'My Song', 'Composer');
    expect(ctx.calls.some((c) => c.includes('"My Song"'))).toBe(true);
    expect(ctx.calls.some((c) => c.includes('"Composer"'))).toBe(true);
  });
});

describe('pause 아이콘', () => {
  it('hit region 안쪽 좌표는 true다', () => {
    const region = pauseIconHitRegion(rect);
    expect(pauseIconHitTest(rect, region.x + 1, region.y + 1)).toBe(true);
  });

  it('hit region 밖 좌표는 false다', () => {
    expect(pauseIconHitTest(rect, rect.gx + rect.gw / 2, rect.gy + rect.gh / 2)).toBe(false);
  });

  it('drawPauseIcon이 두 막대를 채운다', () => {
    const ctx = fakeCtx();
    drawPauseIcon(ctx, rect);
    expect(ctx.calls.filter((c) => c.startsWith('fillRect')).length).toBe(2);
  });
});
