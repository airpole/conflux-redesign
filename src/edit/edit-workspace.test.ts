import { describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import {
  createStorageEnv,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
} from '../env/env-storage.js';
import {
  AUTOSAVE_DELAY_MS,
  createWorkspaceSession,
  deleteWorkspace,
  loadRecoverableWorkspace,
  readWorkspace,
  writeWorkspace,
  type AutosaveTimerHost,
  type WorkspaceSlot,
} from './edit-workspace.js';

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

function makeSlot(overrides: Partial<WorkspaceSlot> = {}): WorkspaceSlot {
  return {
    chart: makeChart(),
    musicBlob: null,
    jacketBlob: null,
    dirty: true,
    baseVersion: null,
    ...overrides,
  };
}

/** 실제로는 절대 안 불릴 타이머(수동 flush/onFileSaveSuccess 테스트용). */
function inertTimerHost(): AutosaveTimerHost {
  return { setTimeout: vi.fn(() => 0), clearTimeout: vi.fn() };
}

/** 콜백을 손으로 실행할 수 있게 잡아두는 타이머(autosave 발화 테스트용). */
function manualTimerHost(): AutosaveTimerHost & { fire(): void; pendingCount(): number } {
  const pending = new Map<number, () => void>();
  let nextId = 1;
  return {
    setTimeout: vi.fn((cb: () => void) => {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    }),
    clearTimeout: vi.fn((id: number) => {
      pending.delete(id);
    }),
    fire() {
      for (const cb of [...pending.values()]) cb();
      pending.clear();
    },
    pendingCount() {
      return pending.size;
    },
  };
}

describe('workspace store 원시 연산', () => {
  it('쓰고 읽으면 같은 슬롯이 나온다', async () => {
    const storage = createStorageEnv(fakeBackend());
    const slot = makeSlot();

    await writeWorkspace(storage, slot);

    expect(await readWorkspace(storage)).toEqual(slot);
  });

  it('아무것도 없으면 null이다', async () => {
    const storage = createStorageEnv(fakeBackend());
    expect(await readWorkspace(storage)).toBeNull();
  });

  it('지우면 다시 null이다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await writeWorkspace(storage, makeSlot());

    await deleteWorkspace(storage);

    expect(await readWorkspace(storage)).toBeNull();
  });
});

describe('loadRecoverableWorkspace', () => {
  it('워크스페이스가 없으면 null이다', async () => {
    const storage = createStorageEnv(fakeBackend());
    expect(await loadRecoverableWorkspace(storage)).toBeNull();
  });

  it('dirty=true인 워크스페이스는 그대로 돌려준다 — "이어서 편집" 대상', async () => {
    const storage = createStorageEnv(fakeBackend());
    const slot = makeSlot({ dirty: true });
    await writeWorkspace(storage, slot);

    expect(await loadRecoverableWorkspace(storage)).toEqual(slot);
  });

  it('dirty=false인 워크스페이스는 stale이라 정리하고 null을 돌려준다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await writeWorkspace(storage, makeSlot({ dirty: false }));

    const result = await loadRecoverableWorkspace(storage);

    expect(result).toBeNull();
    expect(await readWorkspace(storage)).toBeNull(); // 정리됐다
  });
});

describe('createWorkspaceSession — dirty 추적', () => {
  it('새 세션은 clean으로 시작한다', () => {
    const session = createWorkspaceSession({
      storage: createStorageEnv(fakeBackend()),
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost: inertTimerHost(),
    });

    expect(session.dirty).toBe(false);
  });

  it('recovered:true인 세션은 dirty로 시작한다(§6)', () => {
    const session = createWorkspaceSession({
      storage: createStorageEnv(fakeBackend()),
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: 2,
      recovered: true,
      timerHost: inertTimerHost(),
    });

    expect(session.dirty).toBe(true);
  });

  it('updateChart는 dirty를 켠다', () => {
    const session = createWorkspaceSession({
      storage: createStorageEnv(fakeBackend()),
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost: inertTimerHost(),
    });

    session.updateChart(makeChart({ level: 5 }));

    expect(session.dirty).toBe(true);
    expect(session.chart.level).toBe(5);
  });

  it('markDirty는 chart를 안 바꿔도 dirty를 켠다(command dispatch·undo/redo 대응 자리)', () => {
    const session = createWorkspaceSession({
      storage: createStorageEnv(fakeBackend()),
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost: inertTimerHost(),
    });

    session.markDirty();

    expect(session.dirty).toBe(true);
  });

  it('updateMusicBlob/updateJacketBlob도 dirty를 켠다', () => {
    const storage = createStorageEnv(fakeBackend());
    const musicBlob = new Blob(['music']);
    const jacketBlob = new Blob(['jacket']);

    const session = createWorkspaceSession({
      storage,
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost: inertTimerHost(),
    });
    session.updateMusicBlob(musicBlob);
    expect(session.dirty).toBe(true);
    expect(session.musicBlob).toBe(musicBlob);

    const session2 = createWorkspaceSession({
      storage,
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost: inertTimerHost(),
    });
    session2.updateJacketBlob(jacketBlob);
    expect(session2.dirty).toBe(true);
    expect(session2.jacketBlob).toBe(jacketBlob);
  });
});

describe('createWorkspaceSession — autosave', () => {
  it('변경 30초 후 autosave가 workspace에 쓴다', () => {
    const timerHost = manualTimerHost();
    const storage = createStorageEnv(fakeBackend());
    const session = createWorkspaceSession({
      storage,
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost,
    });

    session.updateChart(makeChart({ level: 9 }));

    expect(timerHost.setTimeout).toHaveBeenCalledWith(expect.any(Function), AUTOSAVE_DELAY_MS);
  });

  it('연달아 바뀌면 타이머가 매번 재설정된다(디바운스) — 하나만 남는다', () => {
    const timerHost = manualTimerHost();
    const session = createWorkspaceSession({
      storage: createStorageEnv(fakeBackend()),
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost,
    });

    session.markDirty();
    session.markDirty();
    session.markDirty();

    expect(timerHost.pendingCount()).toBe(1);
  });

  it('타이머가 발화하면 그 시점 chart로 workspace가 실제로 쓰인다', async () => {
    const timerHost = manualTimerHost();
    const storage = createStorageEnv(fakeBackend());
    const session = createWorkspaceSession({
      storage,
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost,
    });

    session.updateChart(makeChart({ level: 7 }));
    timerHost.fire();
    await Promise.resolve(); // writeWorkspace의 await가 마이크로태스크 큐를 한 바퀴 돈다

    const saved = await readWorkspace(storage);
    expect(saved?.chart.level).toBe(7);
    expect(saved?.dirty).toBe(true);
  });
});

describe('createWorkspaceSession — flush', () => {
  it('dirty면 즉시 workspace에 쓰고 대기 중인 타이머를 취소한다', async () => {
    const timerHost = manualTimerHost();
    const storage = createStorageEnv(fakeBackend());
    const session = createWorkspaceSession({
      storage,
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost,
    });
    session.updateChart(makeChart({ level: 3 }));

    await session.flush();

    expect(await readWorkspace(storage)).not.toBeNull();
    expect(timerHost.pendingCount()).toBe(0);
  });

  it('clean이면 아무 것도 쓰지 않는다(§6: clean 상태에서는 workspace를 유지하지 않는다)', async () => {
    const storage = createStorageEnv(fakeBackend());
    const session = createWorkspaceSession({
      storage,
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost: inertTimerHost(),
    });

    await session.flush();

    expect(await readWorkspace(storage)).toBeNull();
  });
});

describe('createWorkspaceSession — onFileSaveSuccess', () => {
  it('dirty 해제·baseVersion 갱신 후 workspace를 삭제한다', async () => {
    const storage = createStorageEnv(fakeBackend());
    const session = createWorkspaceSession({
      storage,
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: 3,
      timerHost: inertTimerHost(),
    });
    session.updateChart(makeChart({ version: 4 }));

    await session.onFileSaveSuccess(4);

    expect(session.dirty).toBe(false);
    expect(session.baseVersion).toBe(4);
    expect(await readWorkspace(storage)).toBeNull();
  });

  it('삭제 전에 먼저 dirty=false로 쓴다 — 삭제가 실패해도 stale로 남아 정리된다(§6)', async () => {
    const backend = fakeBackend();
    const writeOrder: string[] = [];
    const originalSet = backend.set.bind(backend);
    backend.set = vi.fn(async (store, key, value) => {
      writeOrder.push('set');
      return originalSet(store, key, value);
    });
    backend.delete = vi.fn(async () => {
      writeOrder.push('delete');
      throw new Error('삭제 실패');
    });
    const storage = createStorageEnv(backend);
    const session = createWorkspaceSession({
      storage,
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: 3,
      timerHost: inertTimerHost(),
    });
    session.markDirty();

    await session.onFileSaveSuccess(4);

    // 삭제가 (env-storage 계약대로) 실패해도 onFileSaveSuccess는 던지지 않는다.
    expect(writeOrder).toEqual(['set', 'delete']);
    const leftover = await readWorkspace(storage);
    expect(leftover?.dirty).toBe(false); // stale로 보여 다음 부팅 때 정리된다.
  });
});

describe('createWorkspaceSession — discard', () => {
  it('workspace를 지우고 dirty를 해제한다', async () => {
    const storage = createStorageEnv(fakeBackend());
    const session = createWorkspaceSession({
      storage,
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost: inertTimerHost(),
    });
    session.markDirty();
    await session.flush();

    await session.discard();

    expect(session.dirty).toBe(false);
    expect(await readWorkspace(storage)).toBeNull();
  });
});

describe('createWorkspaceSession — dispose', () => {
  it('대기 중인 autosave 타이머를 취소한다', () => {
    const timerHost = manualTimerHost();
    const session = createWorkspaceSession({
      storage: createStorageEnv(fakeBackend()),
      chart: makeChart(),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost,
    });
    session.markDirty();
    expect(timerHost.pendingCount()).toBe(1);

    session.dispose();

    expect(timerHost.pendingCount()).toBe(0);
  });
});

describe('M3-3 Exit — 새로고침해도 chart와 asset이 복구된다', () => {
  it('dirty 상태로 flush한 뒤 새 StorageEnv(=새로고침)로 다시 읽으면 chart와 asset이 복구된다', async () => {
    const backend = fakeBackend(); // 새로고침에도 살아남는 것은 backend(디스크)뿐이다.
    const musicBlob = new Blob(['music-bytes']);
    const jacketBlob = new Blob(['jacket-bytes']);
    const chart = makeChart({ level: 42 });

    const before = createWorkspaceSession({
      storage: createStorageEnv(backend),
      chart,
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost: inertTimerHost(),
    });
    before.updateChart(chart);
    before.updateMusicBlob(musicBlob);
    before.updateJacketBlob(jacketBlob);
    await before.flush();

    // "새로고침" — 완전히 새 StorageEnv 인스턴스로 부팅 시퀀스를 다시 탄다.
    const recovered = await loadRecoverableWorkspace(createStorageEnv(backend));

    expect(recovered).not.toBeNull();
    expect(recovered?.chart).toEqual(chart);
    expect(recovered?.musicBlob).toBe(musicBlob);
    expect(recovered?.jacketBlob).toBe(jacketBlob);
    expect(recovered?.dirty).toBe(true);
  });
});
