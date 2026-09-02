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
import { saveRecordIfEligible } from './game-records.js';
import { loadPlayableChart, loadSongSelectRows } from './game-song-select.js';

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

function buildCfx(songId: string, title: string): Uint8Array {
  const init = candidate(
    {
      songId,
      chartId: 0,
      difficulty: 'init',
      musicFile: 'music.ogg',
      metadata: { ...makeChart().metadata, title },
    },
    'init.json',
  );
  const trace = candidate(
    { songId, chartId: 1, difficulty: 'Trace', level: 5, musicFile: 'music.ogg' },
    'trace.json',
  );
  return createZipArchive([
    { name: init.fileName, data: new TextEncoder().encode(JSON.stringify(init.chart)) },
    { name: trace.fileName, data: new TextEncoder().encode(JSON.stringify(trace.chart)) },
    { name: 'music.ogg', data: new Uint8Array([1, 2, 3]) },
  ]);
}

describe('loadSongSelectRows', () => {
  it('library가 비어 있으면 빈 목록이다', async () => {
    const storage = createStorageEnv(fakeBackend());
    const result = await loadSongSelectRows(storage);
    expect(result.rows).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('library entry를 decode해 row로 만든다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('library', 'song-x', buildCfx('song-x', 'My Song'));

    const result = await loadSongSelectRows(storage);
    expect(result.warnings).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.songId).toBe('song-x');
    expect(result.rows[0]!.title).toBe('My Song');
    expect(result.rows[0]!.slots[0]?.difficulty).toBe('Trace');
    expect(result.rows[0]!.slots[0]?.state).toBe('N'); // 기록 없음
  });

  it('records store의 기록을 slot에 반영한다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('library', 'song-y', buildCfx('song-y', 'Recorded Song'));

    await saveRecordIfEligible(
      storage,
      'song-y',
      1,
      {
        judgments: { SYNC: 10, PERFECT: 0, GOOD: 0, MISS: 0 },
        totalUnits: 10,
        state: 'FC',
        maxCombo: 10,
      },
      { autoplay: false, staticShape: false, midStart: false, editorOrigin: false },
    );

    const result = await loadSongSelectRows(storage);
    expect(result.rows[0]!.slots[0]?.state).toBe('FC');
    expect(result.rows[0]!.slots[0]?.score).not.toBeNull();
  });

  it('손상된 library entry는 경고로 보고하고 건너뛴다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('library', 'broken', new Uint8Array([1, 2, 3])); // ZIP도 아닌 쓰레기

    const result = await loadSongSelectRows(storage);
    expect(result.rows).toEqual([]);
    expect(result.warnings).toEqual(['broken']);
  });
});

describe('loadPlayableChart', () => {
  it('songId+chartId로 chart 전체와 음원 bytes를 얻는다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('library', 'song-x', buildCfx('song-x', 'My Song'));

    const result = await loadPlayableChart(storage, 'song-x', 1);
    expect(result?.chart.difficulty).toBe('Trace');
    expect(result?.chart.songId).toBe('song-x');
    expect(result?.musicBytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('songId가 library에 없으면 null이다', async () => {
    const storage = createStorageEnv(fakeBackend());
    expect(await loadPlayableChart(storage, 'gone', 1)).toBeNull();
  });

  it('chartId가 그 song에 없으면 null이다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('library', 'song-x', buildCfx('song-x', 'My Song'));
    expect(await loadPlayableChart(storage, 'song-x', 99)).toBeNull();
  });
});
