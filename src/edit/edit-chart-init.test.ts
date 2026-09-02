import { describe, expect, it } from 'vitest';
import { validateChartDomain, validateChartStructure } from '../core/core-validate.js';
import { createInitChart } from './edit-chart-init.js';

describe('createInitChart', () => {
  it('chartId 0·difficulty init·전달한 songId로 만든다', () => {
    const chart = createInitChart('song-x', () => '2026-01-01T00:00:00Z');
    expect(chart.chartId).toBe(0);
    expect(chart.difficulty).toBe('init');
    expect(chart.songId).toBe('song-x');
    expect(chart.version).toBe(1);
    expect(chart.notes).toEqual([]);
    expect(chart.shapeEvents).toEqual([]);
    expect(chart.laneEvents).toEqual([]);
    expect(chart.textEvents).toEqual([]);
  });

  it('구조·domain 검증을 통과하는 최소 chart다', () => {
    const chart = createInitChart('song-x', () => '2026-01-01T00:00:00Z');
    expect(validateChartStructure(chart).ok).toBe(true);
    expect(validateChartDomain(chart).issues).toEqual([]);
  });
});
