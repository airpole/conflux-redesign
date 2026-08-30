import { describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import {
  isSaveVersionValid,
  proposeSaveVersion,
  saveChartVersion,
  suggestChartFileName,
} from './edit-chart-save.js';

const NOW = () => '2026-08-30T00:00:00Z';

describe('proposeSaveVersion', () => {
  it('아직 저장된 적 없으면(baseVersion=null) 메모리 version 그대로 제안한다 — 첫 저장', () => {
    const chart = makeChart({ version: 1 });
    expect(proposeSaveVersion(chart, null)).toEqual({ proposedVersion: 1, isFirstSave: true });
  });

  it('이미 열린 version이 있으면 그보다 큰 다음 version을 제안한다', () => {
    const chart = makeChart({ version: 3 });
    expect(proposeSaveVersion(chart, 3)).toEqual({ proposedVersion: 4, isFirstSave: false });
  });

  it('과거 version에서 다시 시작해도 그 version + 1을 제안한다', () => {
    const chart = makeChart({ version: 3 });
    expect(proposeSaveVersion(chart, 3).proposedVersion).toBe(4);
  });
});

describe('isSaveVersionValid', () => {
  it('첫 저장은 메모리 version과 정확히 같아야 유효하다', () => {
    const chart = makeChart({ version: 1 });
    expect(isSaveVersionValid(chart, 1, null)).toBe(true);
    expect(isSaveVersionValid(chart, 2, null)).toBe(false);
  });

  it('이후 저장은 현재 열린 version보다 커야 유효하다', () => {
    const chart = makeChart({ version: 3 });
    expect(isSaveVersionValid(chart, 4, 3)).toBe(true);
    expect(isSaveVersionValid(chart, 3, 3)).toBe(false);
    expect(isSaveVersionValid(chart, 2, 3)).toBe(false);
  });

  it('v3을 열어 v6으로 저장하는 것처럼 직접 지정한 더 큰 값도 유효하다', () => {
    const chart = makeChart({ version: 3 });
    expect(isSaveVersionValid(chart, 6, 3)).toBe(true);
  });
});

describe('saveChartVersion', () => {
  it('쓰기 성공 시에만 version과 updatedAt이 함께 확정된다', async () => {
    const chart = makeChart({ version: 3, updatedAt: '2020-01-01T00:00:00Z' });
    const writeFile = vi.fn(async () => ({ kind: 'saved' as const, name: 'chart_v4.json' }));

    const outcome = await saveChartVersion(chart, 4, 3, NOW, writeFile);

    expect(outcome).toEqual({
      kind: 'saved',
      chart: { ...chart, version: 4, updatedAt: NOW() },
      fileName: 'chart_v4.json',
    });
    expect(writeFile).toHaveBeenCalledWith({ ...chart, version: 4, updatedAt: NOW() });
  });

  it('취소되면 chart가 바뀌지 않는다', async () => {
    const chart = makeChart({ version: 3 });
    const writeFile = vi.fn(async () => ({ kind: 'cancelled' as const }));

    const outcome = await saveChartVersion(chart, 4, 3, NOW, writeFile);

    expect(outcome).toEqual({ kind: 'cancelled' });
  });

  it('쓰기 실패는 던지고, 이 함수는 그것을 잡지 않는다', async () => {
    const chart = makeChart({ version: 3 });
    const writeFile = vi.fn(async () => {
      throw new Error('디스크 오류');
    });

    await expect(saveChartVersion(chart, 4, 3, NOW, writeFile)).rejects.toThrow('디스크 오류');
  });

  it('선택 version이 유효 범위 밖이면 쓰기를 시도하지 않고 invalid-version을 돌려준다', async () => {
    const chart = makeChart({ version: 3 });
    const writeFile = vi.fn(async () => ({ kind: 'saved' as const, name: 'x.json' }));

    const outcome = await saveChartVersion(chart, 3, 3, NOW, writeFile);

    expect(outcome).toEqual({ kind: 'invalid-version' });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('내용 변경이 없어도 명시적으로 저장하면 새 version이 만들어진다', async () => {
    const chart = makeChart({ version: 3 });
    const writeFile = vi.fn(async () => ({ kind: 'saved' as const, name: 'x.json' }));

    const outcome = await saveChartVersion(chart, 4, 3, NOW, writeFile);

    expect(outcome.kind).toBe('saved');
    if (outcome.kind === 'saved') expect(outcome.chart.version).toBe(4);
  });
});

describe('suggestChartFileName', () => {
  it('title_musicBy_difficulty_v{n}.json 형태를 만든다', () => {
    const chart = makeChart({
      metadata: {
        title: 'Aurora',
        musicBy: 'Some Artist',
        jacketBy: '',
        offset: 0,
        category: '',
        previewStartMs: 0,
      },
      difficulty: 'Surge',
      subtitle: '',
    });

    expect(suggestChartFileName(chart, 4)).toBe('Aurora_Some Artist_Surge_v4.json');
  });

  it('subtitle이 있으면 뒤에 덧붙인다', () => {
    const chart = makeChart({
      metadata: {
        title: 'Aurora',
        musicBy: 'Artist',
        jacketBy: '',
        offset: 0,
        category: '',
        previewStartMs: 0,
      },
      difficulty: 'Surge',
      subtitle: 'Another Vision',
    });

    expect(suggestChartFileName(chart, 1)).toBe('Aurora_Artist_Surge_Another Vision_v1.json');
  });

  it('파일시스템에 문제되는 문자를 걷어낸다', () => {
    const chart = makeChart({
      metadata: {
        title: 'A/B:C',
        musicBy: 'D*E?F',
        jacketBy: '',
        offset: 0,
        category: '',
        previewStartMs: 0,
      },
      difficulty: 'Drift',
      subtitle: '',
    });

    expect(suggestChartFileName(chart, 1)).toBe('ABC_DEF_Drift_v1.json');
  });
});
