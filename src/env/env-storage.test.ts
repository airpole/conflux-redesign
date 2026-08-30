import { describe, expect, it, vi } from 'vitest';
import {
  createIndexedDbBackend,
  createStorageEnv,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
} from './env-storage.js';

function fakeBackend(): StorageBackend & { data: Map<StoreName, Map<string, unknown>> } {
  const data = new Map<StoreName, Map<string, unknown>>(STORE_NAMES.map((s) => [s, new Map()]));
  return {
    data,
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

describe('createStorageEnv — 다섯 store 분리', () => {
  it('같은 key라도 store가 다르면 독립적으로 읽고 쓰인다', async () => {
    const env = createStorageEnv(fakeBackend());

    await env.write('workspace', 'slot', { kind: 'workspace' });
    await env.write('settings', 'slot', { kind: 'settings' });

    expect(await env.read('workspace', 'slot')).toEqual({ kind: 'workspace' });
    expect(await env.read('settings', 'slot')).toEqual({ kind: 'settings' });
  });

  it('한 store를 지워도 다른 store는 영향받지 않는다', async () => {
    const env = createStorageEnv(fakeBackend());
    await env.write('library', 'song1', { blob: 'a' });
    await env.write('records', 'song1', { blob: 'b' });

    await env.remove('library', 'song1');

    expect(await env.read('library', 'song1')).toBeUndefined();
    expect(await env.read('records', 'song1')).toEqual({ blob: 'b' });
  });

  it('모든 store가 초기에는 실패 상태가 아니다', () => {
    const env = createStorageEnv(fakeBackend());
    for (const store of STORE_NAMES) {
      expect(env.getWriteStatus(store)).toEqual({ failed: false, lastError: undefined });
    }
  });
});

describe('createStorageEnv — 쓰기 실패 처리', () => {
  it('쓰기가 실패해도 write()는 던지지 않는다(편집 차단 없음)', async () => {
    const backend = fakeBackend();
    backend.set = vi.fn(async () => {
      throw new Error('quota exceeded');
    });
    const env = createStorageEnv(backend);

    await expect(env.write('viewState', 'song-select', { cursor: 0 })).resolves.toBeUndefined();
  });

  it('쓰기 실패는 조용히 삼켜지지 않고 지속 표시 상태로 남는다', async () => {
    const backend = fakeBackend();
    const error = new Error('write failed');
    backend.set = vi.fn(async () => {
      throw error;
    });
    const env = createStorageEnv(backend);

    await env.write('records', 'song1:normal', { cleared: true });

    expect(env.getWriteStatus('records')).toEqual({ failed: true, lastError: error });
  });

  it('실패는 실패한 store에만 표시되고 다른 store는 영향받지 않는다', async () => {
    const backend = fakeBackend();
    const original = backend.set.bind(backend);
    backend.set = vi.fn(async (store, key, value) => {
      if (store === 'records') throw new Error('records만 실패');
      return original(store, key, value);
    });
    const env = createStorageEnv(backend);

    await env.write('records', 'k', 1);
    await env.write('settings', 'k', 1);

    expect(env.getWriteStatus('records').failed).toBe(true);
    expect(env.getWriteStatus('settings').failed).toBe(false);
  });

  it('실패 후 다음 쓰기가 성공하면 재시도로 간주해 실패 표시가 풀린다', async () => {
    const backend = fakeBackend();
    const original = backend.set.bind(backend);
    let shouldFail = true;
    backend.set = vi.fn(async (store, key, value) => {
      if (shouldFail) throw new Error('일시 실패');
      return original(store, key, value);
    });
    const env = createStorageEnv(backend);

    await env.write('settings', 'k', 1);
    expect(env.getWriteStatus('settings').failed).toBe(true);

    shouldFail = false;
    await env.write('settings', 'k', 2);

    expect(env.getWriteStatus('settings')).toEqual({ failed: false, lastError: undefined });
    expect(await env.read('settings', 'k')).toBe(2);
  });

  it('삭제 실패도 같은 방식으로 표시된다', async () => {
    const backend = fakeBackend();
    backend.delete = vi.fn(async () => {
      throw new Error('삭제 실패');
    });
    const env = createStorageEnv(backend);

    await env.remove('library', 'song1');

    expect(env.getWriteStatus('library').failed).toBe(true);
  });

  it('retryWrite는 값 변경 없이 마지막 시도를 재실행해 성공하면 실패 표시를 지운다', async () => {
    const backend = fakeBackend();
    const original = backend.set.bind(backend);
    let shouldFail = true;
    backend.set = vi.fn(async (store, key, value) => {
      if (shouldFail) throw new Error('일시 실패');
      return original(store, key, value);
    });
    const env = createStorageEnv(backend);

    await env.write('settings', 'k', { v: 1 });
    expect(env.getWriteStatus('settings').failed).toBe(true);

    shouldFail = false;
    await env.retryWrite('settings');

    expect(env.getWriteStatus('settings')).toEqual({ failed: false, lastError: undefined });
    expect(await env.read('settings', 'k')).toEqual({ v: 1 });
    // 재시도는 write() 시점의 값을 그대로 다시 보낸다 — 새 값을 요구하지 않는다.
    expect(backend.set).toHaveBeenLastCalledWith('settings', 'k', { v: 1 });
  });

  it('retryWrite가 다시 실패하면 실패 표시가 계속 남는다', async () => {
    const backend = fakeBackend();
    const error = new Error('여전히 실패');
    backend.set = vi.fn(async () => {
      throw error;
    });
    const env = createStorageEnv(backend);

    await env.write('records', 'song1:normal', { cleared: true });
    await env.retryWrite('records');

    expect(env.getWriteStatus('records')).toEqual({ failed: true, lastError: error });
    expect(backend.set).toHaveBeenCalledTimes(2);
  });

  it('실패 이력이 없는 store에 retryWrite를 불러도 아무 일도 일어나지 않는다', async () => {
    const backend = fakeBackend();
    backend.set = vi.fn(backend.set);
    const env = createStorageEnv(backend);
    const events: Array<[StoreName, boolean]> = [];
    env.onWriteStatusChange((store, s) => events.push([store, s.failed]));

    await expect(env.retryWrite('library')).resolves.toBeUndefined();

    expect(backend.set).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(env.getWriteStatus('library')).toEqual({ failed: false, lastError: undefined });
  });

  it('retryWrite는 마지막 시도가 remove였다면 remove를 재시도한다', async () => {
    const backend = fakeBackend();
    await backend.set('library', 'song1', { blob: 'a' });
    const original = backend.delete.bind(backend);
    let shouldFail = true;
    backend.delete = vi.fn(async (store, key) => {
      if (shouldFail) throw new Error('삭제 실패');
      return original(store, key);
    });
    const env = createStorageEnv(backend);

    await env.remove('library', 'song1');
    expect(env.getWriteStatus('library').failed).toBe(true);

    shouldFail = false;
    await env.retryWrite('library');

    expect(env.getWriteStatus('library')).toEqual({ failed: false, lastError: undefined });
    expect(await env.read('library', 'song1')).toBeUndefined();
    expect(backend.delete).toHaveBeenCalledTimes(2);
  });

  it('onWriteStatusChange 구독자가 실패/복구를 store와 함께 통지받는다', async () => {
    const backend = fakeBackend();
    const original = backend.set.bind(backend);
    let shouldFail = true;
    backend.set = vi.fn(async (store, key, value) => {
      if (shouldFail) throw new Error('실패');
      return original(store, key, value);
    });
    const env = createStorageEnv(backend);
    const events: Array<[StoreName, boolean]> = [];
    const unsubscribe = env.onWriteStatusChange((store, status) => {
      events.push([store, status.failed]);
    });

    await env.write('workspace', 'slot', {});
    shouldFail = false;
    await env.write('workspace', 'slot', {});

    expect(events).toEqual([
      ['workspace', true],
      ['workspace', false],
    ]);

    unsubscribe();
    await env.write('workspace', 'slot', {});
    expect(events).toHaveLength(2);
  });
});

// ── createIndexedDbBackend — 최소 fake IDBFactory로 계약 검증 ──────────

interface FakeRequest<T> {
  result: T;
  error: Error | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

function makeRequest<T>(run: () => T): FakeRequest<T> {
  const req: FakeRequest<T> = {
    result: undefined as unknown as T,
    error: null,
    onsuccess: null,
    onerror: null,
  };
  queueMicrotask(() => {
    try {
      req.result = run();
      req.onsuccess?.();
    } catch (err) {
      req.error = err as Error;
      req.onerror?.();
    }
  });
  return req;
}

function createFakeIdbFactory(): IDBFactory {
  const stores = new Map<string, Map<string, unknown>>();
  const failingStores = new Set<string>();

  const objectStoreApi = (storeName: string) => ({
    get: (key: string) =>
      makeRequest(() => {
        if (failingStores.has(storeName)) throw new Error(`${storeName} 읽기 실패`);
        return stores.get(storeName)!.get(key);
      }),
    put: (value: unknown, key: string) =>
      makeRequest(() => {
        if (failingStores.has(storeName)) throw new Error(`${storeName} 쓰기 실패`);
        stores.get(storeName)!.set(key, value);
      }),
    delete: (key: string) =>
      makeRequest(() => {
        if (failingStores.has(storeName)) throw new Error(`${storeName} 삭제 실패`);
        stores.get(storeName)!.delete(key);
      }),
    getAllKeys: () => makeRequest(() => [...stores.get(storeName)!.keys()]),
  });

  const db = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => {
      stores.set(name, new Map());
      return objectStoreApi(name);
    },
    transaction: (storeName: string) => ({
      objectStore: () => objectStoreApi(storeName),
    }),
  };

  return {
    open: () => {
      const req = {
        result: db,
        error: null as Error | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onupgradeneeded: null as (() => void) | null,
      };
      queueMicrotask(() => {
        req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
    // 테스트 전용 훅 — 실제 IDBFactory에는 없다.
    _failStore: (name: string) => failingStores.add(name),
  } as unknown as IDBFactory & { _failStore: (name: string) => void };
}

describe('createIndexedDbBackend', () => {
  it('object store 별로 값을 독립적으로 읽고 쓴다', async () => {
    const backend = createIndexedDbBackend(createFakeIdbFactory());

    await backend.set('workspace', 'slot', { a: 1 });
    await backend.set('settings', 'slot', { a: 2 });

    expect(await backend.get('workspace', 'slot')).toEqual({ a: 1 });
    expect(await backend.get('settings', 'slot')).toEqual({ a: 2 });
  });

  it('키 목록을 store별로 돌려준다', async () => {
    const backend = createIndexedDbBackend(createFakeIdbFactory());
    await backend.set('library', 'song1', {});
    await backend.set('library', 'song2', {});

    expect(await backend.keys('library')).toEqual(['song1', 'song2']);
    expect(await backend.keys('records')).toEqual([]);
  });

  it('삭제 후에는 값이 사라진다', async () => {
    const backend = createIndexedDbBackend(createFakeIdbFactory());
    await backend.set('viewState', 'song-select', { cursor: 1 });

    await backend.delete('viewState', 'song-select');

    expect(await backend.get('viewState', 'song-select')).toBeUndefined();
  });

  it('백엔드 쓰기 실패는 그대로 reject되어 상위(createStorageEnv)가 잡을 수 있다', async () => {
    const factory = createFakeIdbFactory() as IDBFactory & { _failStore: (name: string) => void };
    factory._failStore('records');
    const backend = createIndexedDbBackend(factory);

    await expect(backend.set('records', 'k', 1)).rejects.toBeInstanceOf(Error);
  });
});
