import { describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart } from '../core/core-chart.js';
import {
  createStorageEnv,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
} from '../env/env-storage.js';
import { buildCfxPackage, type AssetFile, type CandidateChart } from './edit-cfx-package.js';
import {
  commitLibraryRegistration,
  compareReimport,
  deleteLibraryEntry,
  listLibrarySongIds,
  planLibraryRegistration,
  readLibraryEntry,
  validateCfxForImport,
  writeLibraryEntry,
  type ImportDecoders,
} from './edit-cfx-library.js';

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

function buildValidCfx(
  overrides: {
    songId?: string;
    traceVersion?: number;
    jacketFile?: string | null;
  } = {},
): Uint8Array {
  const songId = overrides.songId ?? 'song-1';
  const assets = [musicAsset];
  const built = buildCfxPackage({
    selected: [
      initChart({ songId, jacketFile: overrides.jacketFile ?? null }),
      traceChart({
        songId,
        version: overrides.traceVersion ?? 1,
        jacketFile: overrides.jacketFile ?? null,
      }),
    ],
    assets,
  });
  if (!built.ok) throw new Error('테스트 fixture 자체가 무효하다');
  return built.bytes;
}

const okDecoders: ImportDecoders = { decodeAudio: vi.fn(async () => ({})) };

describe('library store 원시 연산', () => {
  it('쓰고 읽으면 같은 bytes가 나온다', async () => {
    const storage = createStorageEnv(fakeBackend());
    const bytes = new Uint8Array([1, 2, 3]);

    await writeLibraryEntry(storage, 'song-1', bytes);

    expect(await readLibraryEntry(storage, 'song-1')).toEqual(bytes);
  });

  it('없으면 null이다', async () => {
    const storage = createStorageEnv(fakeBackend());
    expect(await readLibraryEntry(storage, 'nope')).toBeNull();
  });

  it('삭제하면 다시 null이고, 다른 songId는 영향받지 않는다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await writeLibraryEntry(storage, 'song-1', new Uint8Array([1]));
    await writeLibraryEntry(storage, 'song-2', new Uint8Array([2]));

    await deleteLibraryEntry(storage, 'song-1');

    expect(await readLibraryEntry(storage, 'song-1')).toBeNull();
    expect(await readLibraryEntry(storage, 'song-2')).toEqual(new Uint8Array([2]));
  });

  it('key 목록을 돌려준다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await writeLibraryEntry(storage, 'song-1', new Uint8Array([1]));
    await writeLibraryEntry(storage, 'song-2', new Uint8Array([2]));

    expect(await listLibrarySongIds(storage)).toEqual(['song-1', 'song-2']);
  });
});

describe('validateCfxForImport — 구조 검증(재사용) + decode 게이트', () => {
  it('정상 .cfx + decode 성공이면 통과한다', async () => {
    const result = await validateCfxForImport(buildValidCfx(), okDecoders);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.charts).toHaveLength(2);
    expect(result.jacketWarnings).toEqual([]);
  });

  it('구조 검증 실패(손상)는 decode를 시도하지 않고 그대로 거부한다', async () => {
    const decodeAudio = vi.fn();
    const result = await validateCfxForImport(new Uint8Array(30).fill(0x41), { decodeAudio });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('corrupt-zip');
    expect(decodeAudio).not.toHaveBeenCalled();
  });

  it('playable music decode가 실패하면 전체를 거부한다(§12.2)', async () => {
    const decodeAudio = vi.fn(async () => {
      throw new Error('디코드 실패');
    });

    const result = await validateCfxForImport(buildValidCfx(), { decodeAudio });

    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'audio-decode-failed') {
      throw new Error('audio-decode-failed를 기대했다');
    }
    expect(result.fileName).toBe('music.ogg');
  });

  it('init(non-playable)의 music은 decode 검증 대상이 아니다', async () => {
    // trace만 decode 성공하고 init 몫은 애초에 호출되지 않는지는 파일명이
    // 같아 구분이 안 되므로, decodeAudio 호출 횟수가 파일명 유일 개수(1)와
    // 같은지로 "같은 파일을 두 번 안 부른다"를 함께 확인한다.
    const decodeAudio = vi.fn(async () => ({}));

    const result = await validateCfxForImport(buildValidCfx(), { decodeAudio });

    expect(result.ok).toBe(true);
    expect(decodeAudio).toHaveBeenCalledTimes(1);
  });

  it('jacket decode 실패는 차단하지 않고 경고로만 남는다', async () => {
    const built = buildCfxPackage({
      selected: [initChart({ jacketFile: 'jacket.png' }), traceChart({ jacketFile: 'jacket.png' })],
      assets: [musicAsset, { name: 'jacket.png', bytes: new Uint8Array([9, 9]) }],
    });
    if (!built.ok) throw new Error('fixture 무효');

    const decodeJacket = vi.fn(async () => {
      throw new Error('jacket 디코드 실패');
    });

    const result = await validateCfxForImport(built.bytes, {
      decodeAudio: okDecoders.decodeAudio,
      decodeJacket,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.jacketWarnings).toEqual(['jacket.png']);
  });

  it('decodeJacket을 안 주면 jacket 검증 자체를 건너뛴다', async () => {
    const built = buildCfxPackage({
      selected: [initChart({ jacketFile: 'jacket.png' }), traceChart({ jacketFile: 'jacket.png' })],
      assets: [musicAsset, { name: 'jacket.png', bytes: new Uint8Array([9, 9]) }],
    });
    if (!built.ok) throw new Error('fixture 무효');

    const result = await validateCfxForImport(built.bytes, okDecoders);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.jacketWarnings).toEqual([]);
  });
});

describe('compareReimport', () => {
  it('init은 비교 대상에서 제외한다', () => {
    const existing = [initChart({ version: 1 })];
    const incoming = [initChart({ version: 2 })];

    expect(compareReimport(existing, incoming)).toEqual([]);
  });

  it('새 chartId는 added, 사라진 chartId는 removed', () => {
    const existing = [candidate({ chartId: 1, version: 1 })];
    const incoming = [candidate({ chartId: 2, version: 1 })];

    const changes = compareReimport(existing, incoming);

    expect(changes).toContainEqual({ kind: 'removed', chartId: 1, oldVersion: 1 });
    expect(changes).toContainEqual({ kind: 'added', chartId: 2, newVersion: 1 });
  });

  it('version이 오르면 upgraded, 내리면 downgraded, 같으면 unchanged', () => {
    const existing = [
      candidate({ chartId: 1, version: 2 }),
      candidate({ chartId: 2, version: 5 }),
      candidate({ chartId: 3, version: 3 }),
    ];
    const incoming = [
      candidate({ chartId: 1, version: 3 }),
      candidate({ chartId: 2, version: 2 }),
      candidate({ chartId: 3, version: 3 }),
    ];

    const changes = compareReimport(existing, incoming);

    expect(changes).toContainEqual({ kind: 'upgraded', chartId: 1, oldVersion: 2, newVersion: 3 });
    expect(changes).toContainEqual({
      kind: 'downgraded',
      chartId: 2,
      oldVersion: 5,
      newVersion: 2,
    });
    expect(changes).toContainEqual({ kind: 'unchanged', chartId: 3, version: 3 });
  });

  it('chartId 오름차순으로 돌려준다', () => {
    const existing: CandidateChart[] = [];
    const incoming = [candidate({ chartId: 5, version: 1 }), candidate({ chartId: 1, version: 1 })];

    expect(compareReimport(existing, incoming).map((c) => c.chartId)).toEqual([1, 5]);
  });
});

describe('planLibraryRegistration', () => {
  it('기존 songId가 없으면 add다', async () => {
    const storage = createStorageEnv(fakeBackend());

    const plan = await planLibraryRegistration(storage, 'song-1', [traceChart()]);

    expect(plan).toEqual({ kind: 'add' });
  });

  it('기존 songId가 있으면 reimport-confirm-needed와 비교 결과를 낸다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await writeLibraryEntry(
      storage,
      'song-1',
      buildValidCfx({ songId: 'song-1', traceVersion: 1 }),
    );

    const plan = await planLibraryRegistration(storage, 'song-1', [
      initChart({ songId: 'song-1' }),
      traceChart({ songId: 'song-1', version: 2 }),
    ]);

    expect(plan.kind).toBe('reimport-confirm-needed');
    if (plan.kind !== 'reimport-confirm-needed') return;
    expect(plan.changes).toContainEqual({
      kind: 'upgraded',
      chartId: 1,
      oldVersion: 1,
      newVersion: 2,
    });
  });

  it('다운그레이드도 비교 결과에 그대로 나타난다(자동 차단 없음, D-2026-018)', async () => {
    const storage = createStorageEnv(fakeBackend());
    await writeLibraryEntry(
      storage,
      'song-1',
      buildValidCfx({ songId: 'song-1', traceVersion: 5 }),
    );

    const plan = await planLibraryRegistration(storage, 'song-1', [
      initChart({ songId: 'song-1' }),
      traceChart({ songId: 'song-1', version: 2 }),
    ]);

    expect(plan.kind).toBe('reimport-confirm-needed');
    if (plan.kind !== 'reimport-confirm-needed') return;
    expect(plan.changes).toContainEqual({
      kind: 'downgraded',
      chartId: 1,
      oldVersion: 5,
      newVersion: 2,
    });
  });

  it('planLibraryRegistration은 store를 바꾸지 않는다(읽기 전용)', async () => {
    const storage = createStorageEnv(fakeBackend());
    const original = buildValidCfx({ songId: 'song-1', traceVersion: 1 });
    await writeLibraryEntry(storage, 'song-1', original);

    await planLibraryRegistration(storage, 'song-1', [
      traceChart({ songId: 'song-1', version: 9 }),
    ]);

    expect(await readLibraryEntry(storage, 'song-1')).toEqual(original);
  });
});

describe('commitLibraryRegistration', () => {
  it('blob 전체를 그대로 덮어쓴다(부분 병합 없음)', async () => {
    const storage = createStorageEnv(fakeBackend());
    await writeLibraryEntry(
      storage,
      'song-1',
      buildValidCfx({ songId: 'song-1', traceVersion: 1 }),
    );

    const replacement = buildValidCfx({ songId: 'song-1', traceVersion: 2 });
    await commitLibraryRegistration(storage, 'song-1', replacement);

    expect(await readLibraryEntry(storage, 'song-1')).toEqual(replacement);
  });

  it('다운그레이드 blob도 그대로 덮어쓴다', async () => {
    const storage = createStorageEnv(fakeBackend());
    await writeLibraryEntry(
      storage,
      'song-1',
      buildValidCfx({ songId: 'song-1', traceVersion: 5 }),
    );

    const downgraded = buildValidCfx({ songId: 'song-1', traceVersion: 2 });
    await commitLibraryRegistration(storage, 'song-1', downgraded);

    expect(await readLibraryEntry(storage, 'song-1')).toEqual(downgraded);
  });

  it('처음 등록(add)도 같은 함수로 쓸 수 있다', async () => {
    const storage = createStorageEnv(fakeBackend());
    const bytes = buildValidCfx({ songId: 'song-new' });

    await commitLibraryRegistration(storage, 'song-new', bytes);

    expect(await readLibraryEntry(storage, 'song-new')).toEqual(bytes);
  });
});
