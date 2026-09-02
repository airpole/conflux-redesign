import { describe, expect, it } from 'vitest';
import {
  createStorageEnv,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
} from '../env/env-storage.js';
import { DEFAULT_SETTINGS } from '../core/core-settings.js';
import { readSettings } from './game-settings.js';

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

describe('readSettings', () => {
  it('저장본이 없으면 DEFAULT_SETTINGS를 돌려준다', async () => {
    const storage = createStorageEnv(fakeBackend());
    expect(await readSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('저장본이 있으면 병합해 돌려준다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('settings', 'current', { scrollSpeed: 5 });
    const settings = await readSettings(storage);
    expect(settings.scrollSpeed).toBe(5);
    expect(settings.mirror).toBe(DEFAULT_SETTINGS.mirror);
  });

  it('저장본이 손상됐으면(배열 등) 기본값으로 떨어진다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('settings', 'current', [1, 2, 3]);
    expect(await readSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });
});
