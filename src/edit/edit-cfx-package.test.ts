import { describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart } from '../core/core-chart.js';
import {
  buildCfxPackage,
  packageAndSaveCfx,
  recommendCandidates,
  suggestCfxFileName,
} from './edit-cfx-package.js';
import type { AssetFile, CandidateChart } from '../format/format-cfx-package.js';

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
