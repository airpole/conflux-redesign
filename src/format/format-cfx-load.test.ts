import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart } from '../core/core-chart.js';
import type { AssetFile, CandidateChart } from './format-cfx-package.js';
import { loadCfxPackage } from './format-cfx-load.js';
import { createZipArchive } from '../env/env-file.js';

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

describe('loadCfxPackage — 정상 .cfx', () => {
  it('정상 구성의 .cfx를 chart 집합과 asset으로 되돌린다', () => {
    const bytes = createZipArchive([
      { name: 'init.json', data: new TextEncoder().encode(JSON.stringify(initChart().chart)) },
      { name: 'trace.json', data: new TextEncoder().encode(JSON.stringify(traceChart().chart)) },
      { name: 'music.ogg', data: musicAsset.bytes },
    ]);

    const result = loadCfxPackage(bytes);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.charts).toHaveLength(2);
    expect(result.charts.map((c) => c.chart.chartId).sort()).toEqual([0, 1]);
    expect(result.assets).toEqual([musicAsset]);
  });

  it('.json이 아닌 항목은 전부 asset으로 취급한다', () => {
    const bytes = createZipArchive([
      { name: 'init.json', data: new TextEncoder().encode(JSON.stringify(initChart().chart)) },
      {
        name: 'trace.json',
        data: new TextEncoder().encode(JSON.stringify(traceChart().chart)),
      },
      { name: 'music.ogg', data: musicAsset.bytes },
    ]);

    const result = loadCfxPackage(bytes);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assets.map((a) => a.name)).toEqual(['music.ogg']);
  });
});

describe('loadCfxPackage — 손상 거부', () => {
  it('ZIP 자체가 손상되면(임의 바이트) corrupt-zip으로 명시적으로 거부한다', () => {
    const result = loadCfxPackage(new Uint8Array(50).fill(0x42));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('corrupt-zip');
  });

  it('.json 항목이 malformed JSON이면 invalid-chart로 거부하고 chart를 하나도 돌려주지 않는다', () => {
    const bytes = createZipArchive([
      { name: 'init.json', data: new TextEncoder().encode('{ not json') },
      { name: 'music.ogg', data: musicAsset.bytes },
    ]);

    const result = loadCfxPackage(bytes);

    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'invalid-chart') throw new Error('invalid-chart를 기대했다');
    expect(result.fileName).toBe('init.json');
  });

  it('.json 항목이 미지원 schemaVersion(구 포맷 등)이면 invalid-chart로 거부한다', () => {
    const oldFormat = { ...initChart().chart, schemaVersion: 999 };
    const bytes = createZipArchive([
      { name: 'init.json', data: new TextEncoder().encode(JSON.stringify(oldFormat)) },
      { name: 'music.ogg', data: musicAsset.bytes },
    ]);

    const result = loadCfxPackage(bytes);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('invalid-chart');
  });

  it('정상 chart 하나 + 손상 chart 하나가 섞이면 정상 쪽도 부분 로드하지 않는다(§12.1)', () => {
    const bytes = createZipArchive([
      { name: 'init.json', data: new TextEncoder().encode(JSON.stringify(initChart().chart)) },
      { name: 'broken.json', data: new TextEncoder().encode('not json at all') },
      { name: 'music.ogg', data: musicAsset.bytes },
    ]);

    const result = loadCfxPackage(bytes);

    expect(result.ok).toBe(false);
  });

  it('구조 관계가 무효(init 누락)면 invalid-package로 거부하고 이유를 담는다', () => {
    // buildCfxPackage를 거치지 않고 손으로 만든 "잘못된" .cfx — init 없이 playable만.
    const bytes = createZipArchive([
      { name: 'trace.json', data: new TextEncoder().encode(JSON.stringify(traceChart().chart)) },
      { name: 'music.ogg', data: musicAsset.bytes },
    ]);

    const result = loadCfxPackage(bytes);

    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'invalid-package') {
      throw new Error('invalid-package를 기대했다');
    }
    expect(result.issues.map((i) => i.code)).toContain('missing-init');
  });

  it('chartId 중복처럼 §10 체크리스트를 어긴 손으로 만든 .cfx도 거부한다', () => {
    const duplicate = candidate(
      { chartId: 1, difficulty: 'Trace', musicFile: 'music.ogg' },
      'trace2.json',
    );
    const bytes = createZipArchive([
      { name: 'init.json', data: new TextEncoder().encode(JSON.stringify(initChart().chart)) },
      { name: 'trace.json', data: new TextEncoder().encode(JSON.stringify(traceChart().chart)) },
      { name: 'trace2.json', data: new TextEncoder().encode(JSON.stringify(duplicate.chart)) },
      { name: 'music.ogg', data: musicAsset.bytes },
    ]);

    const result = loadCfxPackage(bytes);

    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'invalid-package') {
      throw new Error('invalid-package를 기대했다');
    }
    expect(result.issues.map((i) => i.code)).toContain('duplicate-chart-id');
  });
});
