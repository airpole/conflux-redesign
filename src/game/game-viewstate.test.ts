import { describe, expect, it } from 'vitest';
import {
  createStorageEnv,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
} from '../env/env-storage.js';
import {
  DEFAULT_SONG_SELECT_VIEW_STATE,
  readSongSelectViewState,
  writeSongSelectViewState,
} from './game-viewstate.js';

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

describe('song-select viewState', () => {
  it('저장본이 없으면 기본값을 돌려준다', async () => {
    const storage = createStorageEnv(fakeBackend());
    expect(await readSongSelectViewState(storage)).toEqual(DEFAULT_SONG_SELECT_VIEW_STATE);
  });

  it('쓰고 읽으면 그대로 돌아온다', async () => {
    const storage = createStorageEnv(fakeBackend());
    const state = {
      category: 'Original',
      groupBy: 'title' as const,
      sortKey: 'level' as const,
      sortDir: 'desc' as const,
      recordCellMode: 'judge' as const,
      lastSelected: { songId: 'song-a', chartId: 1 },
    };
    await writeSongSelectViewState(storage, state);
    expect(await readSongSelectViewState(storage)).toEqual(state);
  });

  it('알 수 없는 필드는 버리고 나머지는 유지한다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('viewState', 'song-select', { category: 'Foo', bogus: 'x' });
    const result = await readSongSelectViewState(storage);
    expect(result.category).toBe('Foo');
    expect(result).not.toHaveProperty('bogus');
  });

  it('허용 밖 값은 필드 단위로 기본값으로 되돌린다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('viewState', 'song-select', {
      groupBy: 'not-a-real-axis',
      sortDir: 'sideways',
    });
    const result = await readSongSelectViewState(storage);
    expect(result.groupBy).toBe('none');
    expect(result.sortDir).toBe('asc');
  });

  it('저장본이 통째로 손상(배열 등)돼도 기본값 하나로 떨어진다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await storage.write('viewState', 'song-select', ['not', 'an', 'object']);
    expect(await readSongSelectViewState(storage)).toEqual(DEFAULT_SONG_SELECT_VIEW_STATE);
  });
});
