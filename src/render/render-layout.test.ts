import { describe, expect, it } from 'vitest';
import {
  JUDGE_LINE_DEFAULT_FRAC,
  computePlayfieldRect,
  judgeLineY,
  projectLaneLayout,
  scrollYAt,
  shapePosToField,
  shapeX,
} from './render-layout.js';

describe('computePlayfieldRect', () => {
  it('와이드 캔버스는 높이에 맞춰 letterbox한다', () => {
    const rect = computePlayfieldRect(2000, 900);
    expect(rect.gh).toBe(900);
    expect(rect.gw).toBeCloseTo(1600, 5);
    expect(rect.gy).toBe(0);
    expect(rect.gx).toBeCloseTo((2000 - 1600) / 2, 5);
  });

  it('세로로 긴 캔버스는 폭에 맞춰 letterbox한다', () => {
    const rect = computePlayfieldRect(900, 2000);
    expect(rect.gw).toBe(900);
    expect(rect.gh).toBeCloseTo(900 / (16 / 9), 5);
    expect(rect.gx).toBe(0);
    expect(rect.gy).toBeCloseTo((2000 - rect.gh) / 2, 5);
  });

  it('정확히 16:9면 여백이 0이다', () => {
    const rect = computePlayfieldRect(1600, 900);
    expect(rect).toEqual({ gx: 0, gy: 0, gw: 1600, gh: 900 });
  });

  it('레이아웃이 아직 안 잡힌 프레임(크기 0)은 빈 사각형을 돌려준다', () => {
    expect(computePlayfieldRect(0, 900)).toEqual({ gx: 0, gy: 0, gw: 0, gh: 0 });
    expect(computePlayfieldRect(900, 0)).toEqual({ gx: 0, gy: 0, gw: 0, gh: 0 });
  });
});

describe('judgeLineY', () => {
  const rect = { gx: 0, gy: 0, gw: 1600, gh: 900 };

  it('judgeLinePos가 없으면 기본 8/9', () => {
    expect(judgeLineY(rect)).toBeCloseTo(900 * JUDGE_LINE_DEFAULT_FRAC, 5);
  });

  it('기본보다 낮추려는 값은 무시된다(raise-only)', () => {
    expect(judgeLineY(rect, 0.99)).toBeCloseTo(900 * JUDGE_LINE_DEFAULT_FRAC, 5);
  });

  it('기본보다 올리는 값은 반영된다', () => {
    expect(judgeLineY(rect, 0.5)).toBeCloseTo(450, 5);
  });
});

describe('shapePosToField · shapeX', () => {
  it('-8은 0, +8은 1, 0은 0.5', () => {
    expect(shapePosToField(-8)).toBe(0);
    expect(shapePosToField(8)).toBe(1);
    expect(shapePosToField(0)).toBe(0.5);
  });

  const rect = { gx: 100, gy: 0, gw: 800, gh: 450 };

  it('mirror 없으면 그대로', () => {
    expect(shapeX(rect, -8, false)).toBeCloseTo(100, 5);
    expect(shapeX(rect, 8, false)).toBeCloseTo(900, 5);
  });

  it('mirror면 좌우가 뒤집힌다', () => {
    expect(shapeX(rect, -8, true)).toBeCloseTo(900, 5);
    expect(shapeX(rect, 8, true)).toBeCloseTo(100, 5);
  });
});

describe('projectLaneLayout', () => {
  it('경계 안이고 순서가 맞으면 그대로 통과한다', () => {
    expect(projectLaneLayout({ line1: 0.25, line2: 0.5, line3: 0.75 })).toEqual({
      line1: 0.25,
      line2: 0.5,
      line3: 0.75,
    });
  });

  it('0 미만·1 초과는 경계로 clamp된다', () => {
    expect(projectLaneLayout({ line1: -0.5, line2: 0.5, line3: 1.5 })).toEqual({
      line1: 0,
      line2: 0.5,
      line3: 1,
    });
  });

  it('순서가 역전되면 뒤 값이 앞 값 밑으로 못 내려간다', () => {
    expect(projectLaneLayout({ line1: 0.6, line2: 0.4, line3: 0.5 })).toEqual({
      line1: 0.6,
      line2: 0.6,
      line3: 0.6,
    });
  });

  it('전부 같은 값이면 최소 간격 없이 붙는다(D-2026-048)', () => {
    expect(projectLaneLayout({ line1: 0.5, line2: 0.5, line3: 0.5 })).toEqual({
      line1: 0.5,
      line2: 0.5,
      line3: 0.5,
    });
  });
});

describe('scrollYAt', () => {
  const rect = { gx: 0, gy: 0, gw: 1600, gh: 900 };
  const jY = 800;

  it('progress 0이면 판정선 위치', () => {
    expect(scrollYAt(rect, jY, 0)).toBe(jY);
  });

  it('progress 1이면 playfield 최상단', () => {
    expect(scrollYAt(rect, jY, 1)).toBeCloseTo(rect.gy, 5);
  });

  it('progress가 음수(이미 지난 노트)면 판정선보다 아래', () => {
    expect(scrollYAt(rect, jY, -0.5)).toBeGreaterThan(jY);
  });
});
