/**
 * store 5분리와 쓰기 실패 신호 — [[persistence]] §1.
 *
 * `workspace / library / records / settings / viewState` 다섯 store를
 * 독립적으로 읽고 쓴다. blob(music/jacket/`.cfx`)을 담아야 하는 store가
 * 있어 IndexedDB를 백엔드로 쓴다(`localStorage`는 Blob을 직접 못 담는다).
 *
 * 쓰기 실패는 조용히 삼키지 않는다([[persistence]] §1 "쓰기 실패"):
 * 실패하면 해당 store의 상태를 `failed`로 표시하고 `onWriteStatusChange`
 * 구독자에게 알린다 — 지속 표시(토스트 등 실제 UI)는 이 층의 소관이 아니라
 * 호출측(scene/app)이 이 상태를 구독해 그린다. 다음 쓰기가 그대로 재시도이며,
 * 성공하면 상태가 풀린다. `write`/`remove`는 실패해도 던지지 않는다 — 편집을
 * 차단하지 않는다는 계약을 호출측이 try/catch 없이 지킬 수 있게 한다.
 */

export const STORE_NAMES = ['workspace', 'library', 'records', 'settings', 'viewState'] as const;
export type StoreName = (typeof STORE_NAMES)[number];

export interface StoreWriteStatus {
  readonly failed: boolean;
  readonly lastError: unknown;
}

const CLEAR_STATUS: StoreWriteStatus = { failed: false, lastError: undefined };

/** store별 최소 영속 백엔드. 백엔드 자체는 실패 신호를 만들지 않고 그대로 던진다. */
export interface StorageBackend {
  get(store: StoreName, key: string): Promise<unknown>;
  set(store: StoreName, key: string, value: unknown): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
  keys(store: StoreName): Promise<string[]>;
}

export interface StorageEnv {
  read(store: StoreName, key: string): Promise<unknown>;
  /** 실패해도 던지지 않는다 — 실패는 `getWriteStatus`/`onWriteStatusChange`로 관찰한다. */
  write(store: StoreName, key: string, value: unknown): Promise<void>;
  remove(store: StoreName, key: string): Promise<void>;
  keys(store: StoreName): Promise<string[]>;
  getWriteStatus(store: StoreName): StoreWriteStatus;
  onWriteStatusChange(listener: (store: StoreName, status: StoreWriteStatus) => void): () => void;
}

export function createStorageEnv(backend: StorageBackend): StorageEnv {
  const status = new Map<StoreName, StoreWriteStatus>(STORE_NAMES.map((s) => [s, CLEAR_STATUS]));
  const listeners = new Set<(store: StoreName, status: StoreWriteStatus) => void>();

  function setStatus(store: StoreName, next: StoreWriteStatus): void {
    status.set(store, next);
    for (const listener of listeners) listener(store, next);
  }

  async function guardedWrite(store: StoreName, attempt: () => Promise<void>): Promise<void> {
    try {
      await attempt();
      setStatus(store, CLEAR_STATUS);
    } catch (err) {
      setStatus(store, { failed: true, lastError: err });
    }
  }

  return {
    read(store, key) {
      return backend.get(store, key);
    },

    write(store, key, value) {
      return guardedWrite(store, () => backend.set(store, key, value));
    },

    remove(store, key) {
      return guardedWrite(store, () => backend.delete(store, key));
    },

    keys(store) {
      return backend.keys(store);
    },

    getWriteStatus(store) {
      // STORE_NAMES 전체로 초기화했으므로 항상 존재한다.
      return status.get(store)!;
    },

    onWriteStatusChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 실제 IndexedDB 백엔드. 다섯 store를 같은 데이터베이스의 object store
 * 다섯 개로 만든다 — store별 독립 읽기/쓰기는 object store 분리로 확보된다.
 */
export function createIndexedDbBackend(
  idbFactory: IDBFactory,
  databaseName = 'conflux',
): StorageBackend {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function openDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = idbFactory.open(databaseName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const store of STORE_NAMES) {
            if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  }

  async function withStore<T>(
    store: StoreName,
    mode: IDBTransactionMode,
    run: (objectStore: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await openDb();
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    return requestToPromise(run(objectStore));
  }

  return {
    get(store, key) {
      return withStore(store, 'readonly', (objectStore) => objectStore.get(key));
    },

    async set(store, key, value) {
      await withStore(store, 'readwrite', (objectStore) => objectStore.put(value, key));
    },

    async delete(store, key) {
      await withStore(store, 'readwrite', (objectStore) => objectStore.delete(key));
    },

    keys(store) {
      return withStore(store, 'readonly', (objectStore) => objectStore.getAllKeys()) as Promise<
        string[]
      >;
    },
  };
}
