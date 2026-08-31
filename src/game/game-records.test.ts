import { describe, expect, it } from 'vitest';
import type { JudgmentCounts } from '../core/core-gauge.js';
import type { NoRecordConditions, RecordCandidate } from '../core/core-records.js';
import {
  createStorageEnv,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
} from '../env/env-storage.js';
import { readRecord, resetRecord, saveRecordIfEligible } from './game-records.js';

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

const counts = (overrides: Partial<JudgmentCounts> = {}): JudgmentCounts => ({
  SYNC: 0,
  PERFECT: 0,
  GOOD: 0,
  MISS: 0,
  ...overrides,
});

const eligible: NoRecordConditions = {
  autoplay: false,
  staticShape: false,
  midStart: false,
  editorOrigin: false,
};

const candidate = (overrides: Partial<RecordCandidate> = {}): RecordCandidate => ({
  judgments: counts({ SYNC: 10 }),
  state: 'AS',
  maxCombo: 10,
  ...overrides,
});

describe('readRecord', () => {
  it('없으면 null이다', async () => {
    const storage = createStorageEnv(fakeBackend());
    expect(await readRecord(storage, 'song-1', 1)).toBeNull();
  });
});

describe('saveRecordIfEligible', () => {
  it('init(chartId 0)은 store를 건드리지 않고 skipped-init을 돌려준다', async () => {
    const storage = createStorageEnv(fakeBackend());

    const outcome = await saveRecordIfEligible(storage, 'song-1', 0, candidate(), eligible);

    expect(outcome).toEqual({ kind: 'skipped-init' });
    expect(await readRecord(storage, 'song-1', 0)).toBeNull();
  });

  it('no-record 조건이면 store를 건드리지 않고 no-record를 돌려준다', async () => {
    const storage = createStorageEnv(fakeBackend());

    const outcome = await saveRecordIfEligible(storage, 'song-1', 1, candidate(), {
      ...eligible,
      autoplay: true,
    });

    expect(outcome).toEqual({ kind: 'no-record' });
    expect(await readRecord(storage, 'song-1', 1)).toBeNull();
  });

  it('적격 판은 저장하고 saved+newBest를 돌려준다', async () => {
    const storage = createStorageEnv(fakeBackend());

    const outcome = await saveRecordIfEligible(storage, 'song-1', 1, candidate(), eligible);

    expect(outcome.kind).toBe('saved');
    if (outcome.kind !== 'saved') return;
    expect(outcome.newBest).toBe(true);
    expect(await readRecord(storage, 'song-1', 1)).toEqual(outcome.record);
  });

  it('두 번째 판이 더 낮으면 저장은 되지만(state/maxCombo 독립 갱신 가능) newBest는 false일 수 있다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await saveRecordIfEligible(
      storage,
      'song-1',
      1,
      candidate({ judgments: counts({ SYNC: 10 }) }),
      eligible,
    );

    const outcome = await saveRecordIfEligible(
      storage,
      'song-1',
      1,
      candidate({ judgments: counts({ SYNC: 1, MISS: 9 }), state: 'F', maxCombo: 0 }),
      eligible,
    );

    expect(outcome.kind).toBe('saved');
    if (outcome.kind !== 'saved') return;
    expect(outcome.newBest).toBe(false);
    expect(outcome.record.bestState).toBe('AS'); // 1판의 AS가 유지된다.
  });

  it('같은 songId라도 chartId가 다르면 독립적으로 저장된다', async () => {
    const storage = createStorageEnv(fakeBackend());

    await saveRecordIfEligible(storage, 'song-1', 1, candidate(), eligible);
    await saveRecordIfEligible(storage, 'song-1', 2, candidate({ maxCombo: 999 }), eligible);

    const r1 = await readRecord(storage, 'song-1', 1);
    const r2 = await readRecord(storage, 'song-1', 2);
    expect(r1?.maxCombo).toBe(10);
    expect(r2?.maxCombo).toBe(999);
  });
});

describe('resetRecord', () => {
  it('선택한 chart의 기록만 지운다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await saveRecordIfEligible(storage, 'song-1', 1, candidate(), eligible);
    await saveRecordIfEligible(storage, 'song-1', 2, candidate(), eligible);

    await resetRecord(storage, 'song-1', 1);

    expect(await readRecord(storage, 'song-1', 1)).toBeNull();
    expect(await readRecord(storage, 'song-1', 2)).not.toBeNull();
  });
});
