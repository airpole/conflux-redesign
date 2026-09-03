import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart } from '../core/core-chart.js';
import {
  createStorageEnv,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
} from '../env/env-storage.js';
import { createZipArchive } from '../env/env-file.js';
import type { CandidateChart } from '../format/format-cfx-package.js';
import { loadCreditsRoleNames } from './game-credits.js';

function fakeBackend(): StorageBackend {
  const data = new Map<StoreName, Map<string, unknown>>(STORE_NAMES.map((s) => [s, new Map()]));
  return {
    async get(store, key) {
      return data.get(store)!.get(key);
    },
    async set(store, key, value) {
      data.get(store)!.set(key, value);
    },
    async delete(store, key) {
      data.get(store)!.delete(key);
    },
    async keys(store) {
      return [...data.get(store)!.keys()];
    },
  };
}

function candidate(overrides: Partial<Chart> = {}, fileName?: string): CandidateChart {
  const chart = makeChart(overrides);
  return { chart, fileName: fileName ?? `${chart.difficulty}_v${chart.version}.json` };
}

function buildCfx(
  songId: string,
  fields: { readonly musicBy: string; readonly chartBy: string; readonly jacketBy: string },
): Uint8Array {
  const init = candidate(
    {
      songId,
      chartId: 0,
      difficulty: 'init',
      musicFile: 'music.ogg',
      chartBy: fields.chartBy,
      metadata: { ...makeChart().metadata, musicBy: fields.musicBy, jacketBy: fields.jacketBy },
    },
    'init.json',
  );
  const trace = candidate(
    {
      songId,
      chartId: 1,
      difficulty: 'Trace',
      level: 5,
      musicFile: 'music.ogg',
      chartBy: fields.chartBy,
      metadata: { ...makeChart().metadata, musicBy: fields.musicBy, jacketBy: fields.jacketBy },
    },
    'trace.json',
  );
  return createZipArchive([
    { name: init.fileName, data: new TextEncoder().encode(JSON.stringify(init.chart)) },
    { name: trace.fileName, data: new TextEncoder().encode(JSON.stringify(trace.chart)) },
    { name: 'music.ogg', data: new Uint8Array([1, 2, 3]) },
  ]);
}

describe('loadCreditsRoleNames', () => {
  it('library가 비어 있으면 세 목록 다 비어 있다', async () => {
    const storage = createStorageEnv(fakeBackend());
    const result = await loadCreditsRoleNames(storage);
    expect(result).toEqual({ music: [], chart: [], jacket: [] });
  });

  it('필드별로 이름을 모으고 중복을 제거한다(같은 song 안의 여러 chart도 한 번만)', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write(
      'library',
      'song-x',
      buildCfx('song-x', { musicBy: 'Alice', chartBy: 'Bob', jacketBy: 'Carol' }),
    );

    const result = await loadCreditsRoleNames(storage);
    // buildCfx는 init·Trace 둘 다 같은 musicBy/chartBy를 쓴다 — song 안에서
    // 중복돼도 한 번만 나와야 한다.
    expect(result.music).toEqual(['Alice']);
    expect(result.chart).toEqual(['Bob']);
    expect(result.jacket).toEqual(['Carol']);
  });

  it('한 사람이 여러 역할을 겸하면 각 역할 섹션에 각각 나타난다(§2.8.1)', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write(
      'library',
      'song-x',
      buildCfx('song-x', { musicBy: 'Alice', chartBy: 'Alice', jacketBy: 'Alice' }),
    );

    const result = await loadCreditsRoleNames(storage);
    expect(result.music).toEqual(['Alice']);
    expect(result.chart).toEqual(['Alice']);
    expect(result.jacket).toEqual(['Alice']);
  });

  it('여러 song에 걸쳐 필드값 단위로 중복 제거하고 알파벳순 정렬한다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write(
      'library',
      'song-a',
      buildCfx('song-a', { musicBy: 'Zed', chartBy: '', jacketBy: '' }),
    );
    await storage.write(
      'library',
      'song-b',
      buildCfx('song-b', { musicBy: 'Amy', chartBy: '', jacketBy: '' }),
    );
    await storage.write(
      'library',
      'song-c',
      buildCfx('song-c', { musicBy: 'Zed', chartBy: '', jacketBy: '' }),
    ); // 중복.

    const result = await loadCreditsRoleNames(storage);
    expect(result.music).toEqual(['Amy', 'Zed']);
  });

  it('빈 문자열 필드는 목록에 넣지 않는다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write(
      'library',
      'song-x',
      buildCfx('song-x', { musicBy: '', chartBy: '', jacketBy: '' }),
    );

    const result = await loadCreditsRoleNames(storage);
    expect(result).toEqual({ music: [], chart: [], jacket: [] });
  });

  it('구조가 깨진 library entry는 그 songId만 건너뛴다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('library', 'broken', new Uint8Array([1, 2, 3])); // 유효한 ZIP이 아니다.
    await storage.write(
      'library',
      'song-x',
      buildCfx('song-x', { musicBy: 'Alice', chartBy: '', jacketBy: '' }),
    );

    const result = await loadCreditsRoleNames(storage);
    expect(result.music).toEqual(['Alice']);
  });
});
