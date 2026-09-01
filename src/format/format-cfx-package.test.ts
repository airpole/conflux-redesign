import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart } from '../core/core-chart.js';
import {
  groupBySongId,
  validatePackageGroup,
  type AssetFile,
  type CandidateChart,
} from './format-cfx-package.js';

function candidate(overrides: Partial<Chart> = {}, fileName?: string): CandidateChart {
  const chart = makeChart(overrides);
  return { chart, fileName: fileName ?? `${chart.difficulty}_v${chart.version}.json` };
}

function initChart(overrides: Partial<Chart> = {}): CandidateChart {
  return candidate(
    { chartId: 0, difficulty: 'init', musicFile: 'music.ogg', ...overrides },
    'init.json',
  );
}

function traceChart(overrides: Partial<Chart> = {}): CandidateChart {
  return candidate(
    { chartId: 1, difficulty: 'Trace', musicFile: 'music.ogg', ...overrides },
    'trace.json',
  );
}

const musicAsset: AssetFile = { name: 'music.ogg', bytes: new Uint8Array([1, 2, 3]) };

describe('groupBySongId', () => {
  it('songId별로 나눈다', () => {
    const a = candidate({ songId: 'song-a' });
    const b = candidate({ songId: 'song-b' });
    const a2 = candidate({ songId: 'song-a', chartId: 2 });

    const groups = groupBySongId([a, b, a2]);

    expect(groups).toHaveLength(2);
    const groupA = groups.find((g) => g.songId === 'song-a')!;
    expect(groupA.charts).toEqual([a, a2]);
  });
});

describe('validatePackageGroup', () => {
  it('init + playable + 자산이 모두 갖춰지면 통과한다', () => {
    const result = validatePackageGroup([initChart(), traceChart()], [musicAsset]);
    expect(result).toEqual({ ok: true, issues: [] });
  });

  it('init이 없으면 missing-init', () => {
    const result = validatePackageGroup([traceChart()], [musicAsset]);
    expect(result.issues.map((i) => i.code)).toContain('missing-init');
  });

  it('init이 둘이면 multiple-init', () => {
    const secondInit = candidate(
      { chartId: 0, difficulty: 'init', musicFile: 'music.ogg' },
      'init2.json',
    );
    const result = validatePackageGroup([initChart(), secondInit, traceChart()], [musicAsset]);
    expect(result.issues.map((i) => i.code)).toContain('multiple-init');
  });

  it('playable chart가 하나도 없으면 no-playable-chart', () => {
    const result = validatePackageGroup([initChart()], [musicAsset]);
    expect(result.issues.map((i) => i.code)).toContain('no-playable-chart');
  });

  it('playable chart에 musicFile이 없으면 playable-missing-music', () => {
    const result = validatePackageGroup(
      [initChart(), traceChart({ musicFile: null })],
      [musicAsset],
    );
    expect(result.issues.map((i) => i.code)).toContain('playable-missing-music');
  });

  it('init에 musicFile이 없으면 representative-missing-music', () => {
    const result = validatePackageGroup(
      [initChart({ musicFile: null }), traceChart()],
      [musicAsset],
    );
    expect(result.issues.map((i) => i.code)).toContain('representative-missing-music');
  });

  it('참조 asset을 찾지 못하면 unresolved-asset', () => {
    const result = validatePackageGroup([initChart(), traceChart()], []);
    expect(result.issues.map((i) => i.code)).toContain('unresolved-asset');
  });

  it('asset 파일명에 경로 성분이 있으면 invalid-path-reference', () => {
    const result = validatePackageGroup(
      [initChart({ musicFile: '../evil.ogg' }), traceChart({ musicFile: '../evil.ogg' })],
      [{ name: '../evil.ogg', bytes: new Uint8Array() }],
    );
    expect(result.issues.map((i) => i.code)).toContain('invalid-path-reference');
  });

  it('서로 다른 songId가 섞이면 songid-mismatch', () => {
    const result = validatePackageGroup(
      [initChart({ songId: 'a' }), traceChart({ songId: 'b' })],
      [musicAsset],
    );
    expect(result.issues.map((i) => i.code)).toContain('songid-mismatch');
  });

  it('chartId가 중복되면 duplicate-chart-id', () => {
    const duplicate = candidate(
      { chartId: 1, difficulty: 'Trace', musicFile: 'music.ogg' },
      'trace2.json',
    );
    const result = validatePackageGroup([initChart(), traceChart(), duplicate], [musicAsset]);
    expect(result.issues.map((i) => i.code)).toContain('duplicate-chart-id');
  });

  it('chartId 1~5의 difficulty가 고정 대응과 다르면 chart-id-difficulty-mismatch', () => {
    const result = validatePackageGroup(
      [initChart(), candidate({ chartId: 1, difficulty: 'Drift', musicFile: 'music.ogg' })],
      [musicAsset],
    );
    expect(result.issues.map((i) => i.code)).toContain('chart-id-difficulty-mismatch');
  });

  it('chartId 6 이상은 init일 수 없다', () => {
    const result = validatePackageGroup(
      [initChart(), candidate({ chartId: 6, difficulty: 'init', musicFile: 'music.ogg' })],
      [musicAsset],
    );
    expect(result.issues.map((i) => i.code)).toContain('chart-id-difficulty-mismatch');
  });

  it('chartId 6 이상은 difficulty만 맞으면 통과한다', () => {
    const result = validatePackageGroup(
      [
        initChart(),
        candidate(
          { chartId: 6, difficulty: 'Trace', subtitle: 'Another', musicFile: 'music.ogg' },
          'six.json',
        ),
      ],
      [musicAsset],
    );
    expect(result.issues.map((i) => i.code)).not.toContain('chart-id-difficulty-mismatch');
  });

  it('같은 difficulty+subtitle 조합이 중복되면 duplicate-difficulty-subtitle', () => {
    const result = validatePackageGroup(
      [
        initChart(),
        candidate(
          { chartId: 6, difficulty: 'Trace', subtitle: 'X', musicFile: 'music.ogg' },
          'a.json',
        ),
        candidate(
          { chartId: 7, difficulty: 'Trace', subtitle: ' X ', musicFile: 'music.ogg' },
          'b.json',
        ),
      ],
      [musicAsset],
    );
    expect(result.issues.map((i) => i.code)).toContain('duplicate-difficulty-subtitle');
  });

  it('파일명이 전역에서 중복되면 duplicate-file-name', () => {
    const a = candidate({ chartId: 1, difficulty: 'Trace', musicFile: 'music.ogg' }, 'same.json');
    const b = candidate({ chartId: 2, difficulty: 'Drift', musicFile: 'music.ogg' }, 'same.json');
    const result = validatePackageGroup([initChart(), a, b], [musicAsset]);
    expect(result.issues.map((i) => i.code)).toContain('duplicate-file-name');
  });

  it('같은 파일명 asset의 내용이 다르면 asset-content-mismatch', () => {
    const result = validatePackageGroup(
      [initChart(), traceChart()],
      [
        { name: 'music.ogg', bytes: new Uint8Array([1, 2, 3]) },
        { name: 'music.ogg', bytes: new Uint8Array([9, 9, 9]) },
      ],
    );
    expect(result.issues.map((i) => i.code)).toContain('asset-content-mismatch');
  });

  it('같은 파일명 asset의 내용이 같으면 문제없다', () => {
    const result = validatePackageGroup(
      [initChart(), traceChart()],
      [
        { name: 'music.ogg', bytes: new Uint8Array([1, 2, 3]) },
        { name: 'music.ogg', bytes: new Uint8Array([1, 2, 3]) },
      ],
    );
    expect(result.issues.map((i) => i.code)).not.toContain('asset-content-mismatch');
  });

  it('문제를 첫 하나에서 멈추지 않고 전부 모아 보고한다', () => {
    const result = validatePackageGroup([traceChart({ musicFile: null })], []);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('missing-init');
    expect(codes).toContain('playable-missing-music');
  });
});
