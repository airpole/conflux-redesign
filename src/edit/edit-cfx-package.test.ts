import { describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart } from '../core/core-chart.js';
import {
  buildCfxPackage,
  groupBySongId,
  packageAndSaveCfx,
  recommendCandidates,
  suggestCfxFileName,
  validatePackageGroup,
  type AssetFile,
  type CandidateChart,
} from './edit-cfx-package.js';

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

describe('recommendCandidates', () => {
  it('chartId별 최고 version이 유일하면 그것을 추천한다', () => {
    const low = candidate({ chartId: 1, version: 2 });
    const high = candidate({ chartId: 1, version: 5 });

    const result = recommendCandidates([low, high]);

    expect(result).toEqual([{ chartId: 1, recommended: high, conflicting: [], all: [low, high] }]);
  });

  it('최고 version이 동률이면 자동 선택하지 않고 충돌로 표시한다', () => {
    const first = candidate({ chartId: 1, version: 3 }, 'a.json');
    const second = candidate({ chartId: 1, version: 3 }, 'b.json');

    const result = recommendCandidates([first, second]);

    expect(result[0]!.recommended).toBeNull();
    expect(result[0]!.conflicting).toEqual([first, second]);
  });

  it('chartId 오름차순으로 정렬해 돌려준다', () => {
    const c5 = candidate({ chartId: 5 });
    const c1 = candidate({ chartId: 1 });

    const result = recommendCandidates([c5, c1]);

    expect(result.map((r) => r.chartId)).toEqual([1, 5]);
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

describe('suggestCfxFileName', () => {
  it('{title}_{musicBy}_v{version}.cfx 형태를 만든다', () => {
    const chart = makeChart({
      metadata: {
        title: 'Aurora',
        musicBy: 'Some Artist',
        jacketBy: '',
        offset: 0,
        category: '',
        previewStartMs: 0,
      },
      version: 3,
    });
    expect(suggestCfxFileName(chart)).toBe('Aurora_Some Artist_v3.cfx');
  });
});

describe('buildCfxPackage', () => {
  it('검증 실패면 issues를 그대로 돌려주고 아무것도 만들지 않는다', () => {
    const result = buildCfxPackage({ selected: [traceChart()], assets: [musicAsset] });
    expect(result.ok).toBe(false);
  });

  it('검증을 통과하면 fileName·bytes·unusedAssets를 돌려준다', () => {
    const unused: AssetFile = { name: 'unused.png', bytes: new Uint8Array([7]) };
    const result = buildCfxPackage({
      selected: [initChart(), traceChart()],
      assets: [musicAsset, unused],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fileName).toMatch(/\.cfx$/);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.unusedAssets).toEqual(['unused.png']);
  });

  it('입력 chart·asset을 바꾸지 않는다(비파괴)', () => {
    const selected = [initChart(), traceChart()];
    const assets = [musicAsset];
    const selectedCopy = structuredClone(selected);
    const assetsCopy = structuredClone(assets);

    buildCfxPackage({ selected, assets });

    expect(selected).toEqual(selectedCopy);
    expect(assets).toEqual(assetsCopy);
  });
});

describe('packageAndSaveCfx', () => {
  it('검증 실패는 저장을 시도하지 않고 invalid를 돌려준다', async () => {
    const writeFile = vi.fn();
    const result = await packageAndSaveCfx(
      { selected: [traceChart()], assets: [musicAsset] },
      writeFile,
    );

    expect(result.kind).toBe('invalid');
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('저장 성공 시 saved를 돌려준다', async () => {
    const writeFile = vi.fn(async () => 'saved' as const);
    const result = await packageAndSaveCfx(
      { selected: [initChart(), traceChart()], assets: [musicAsset] },
      writeFile,
    );

    expect(result.kind).toBe('saved');
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it('취소되면 cancelled를 돌려준다', async () => {
    const writeFile = vi.fn(async () => 'cancelled' as const);
    const result = await packageAndSaveCfx(
      { selected: [initChart(), traceChart()], assets: [musicAsset] },
      writeFile,
    );

    expect(result).toEqual({ kind: 'cancelled' });
  });

  it('쓰기 실패는 던지고 이 함수는 삼키지 않는다', async () => {
    const writeFile = vi.fn(async () => {
      throw new Error('디스크 오류');
    });

    await expect(
      packageAndSaveCfx({ selected: [initChart(), traceChart()], assets: [musicAsset] }, writeFile),
    ).rejects.toThrow('디스크 오류');
  });
});
