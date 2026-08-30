import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import { openChartJson } from './edit-chart-open.js';

describe('openChartJson', () => {
  it('유효한 chart JSON을 연다', () => {
    const chart = makeChart();
    const outcome = openChartJson(JSON.stringify(chart));

    expect(outcome.kind).toBe('opened');
    if (outcome.kind === 'opened') {
      expect(outcome.chart).toEqual(chart);
      expect(outcome.domainIssues).toEqual([]);
    }
  });

  it('JSON으로 파싱할 수 없으면 invalid-json이다', () => {
    const outcome = openChartJson('{ not json');
    expect(outcome).toEqual({ kind: 'invalid-json' });
  });

  it('structural 실패(schemaVersion 불일치 등)는 거부한다', () => {
    const chart = makeChart({ schemaVersion: 999 });
    const outcome = openChartJson(JSON.stringify(chart));

    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.errors.length).toBeGreaterThan(0);
    }
  });

  it('domain 문제(예: lane 범위 밖)는 거부하지 않고 함께 돌려준다', () => {
    const chart = makeChart({
      notes: [{ startTick: 0, duration: 0, lane: 9 as never, isWide: false }],
    });
    const outcome = openChartJson(JSON.stringify(chart));

    expect(outcome.kind).toBe('opened');
    if (outcome.kind === 'opened') {
      expect(outcome.domainIssues.length).toBeGreaterThan(0);
    }
  });
});
