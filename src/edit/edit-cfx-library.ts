/**
 * game library — 등록·같은 songId reimport 교체·삭제.
 *
 * 정의의 단일 출처는 `_meta/persistence.md` §12(과 D-2026-018 다운그레이드
 * 허용 확정)다. library value는 `.cfx` blob 통째, key는 `songId`다 — `env-storage`의
 * `library` store를 그대로 쓴다(M3-1).
 *
 * import 게이트(§12.2 "game/library import·load")는 M3-5가 명시적으로 이
 * step으로 미룬 것이다(D-2026-065) — `edit-cfx-load`의 `loadCfxPackage`가
 * 이미 한 구조 검증(§12.1) 위에, 여기서 **모든 playable music의 실제 decode
 * 검증**을 추가한다: 하나라도 실패하면 전체 거부. jacket decode 실패는
 * 차단하지 않고 경고만 남긴다(§12.2·§12 "jacket decode 실패는 placeholder와
 * 경고").
 *
 * 같은 songId reimport(§12 "같은 songId reimport")는 **비교(diff)**와
 * **실행(commit)**을 나눈다 — 확인 UI(추가·삭제·upgrade·downgrade 표시)는
 * scene 층이 아직 없어(M4/M5) 여기 없다. `planLibraryRegistration`이 비교를
 * 내고, 호출측이 사용자 확인을 받은 뒤 `commitLibraryRegistration`을 부른다.
 * reimport는 **songId blob 전체 교체**이며 chart 단위 부분 병합은 없다 —
 * `commitLibraryRegistration`은 change 종류를 따지지 않고 그대로 덮어쓴다.
 * 다운그레이드 포함 reimport도 호출측이 확인을 거쳤다는 전제로 그대로
 * 수행한다(D-2026-018) — **자동** overwrite가 아니라는 것은 plan 없이 바로
 * commit하지 않는다는 호출 규율로 지킨다(이 함수 자체가 강제하지는 않는다).
 *
 * 삭제·records 경계: 여기서는 library blob만 지운다. records의 고아 기록
 * 정책은 M3-7(records) 소관이라 건드리지 않는다(§12 "records 삭제 여부는
 * records의 고아 기록 정책을 따른다").
 */
import { loadCfxPackage, type CfxLoadResult } from './edit-cfx-load.js';
import type { AssetFile, CandidateChart } from './edit-cfx-package.js';
import type { StorageEnv } from '../env/env-storage.js';

// ── library store — 원시 연산 ───────────────────────────────────────

export async function readLibraryEntry(
  storage: StorageEnv,
  songId: string,
): Promise<Uint8Array | null> {
  const raw = await storage.read('library', songId);
  return (raw as Uint8Array | undefined) ?? null;
}

export async function writeLibraryEntry(
  storage: StorageEnv,
  songId: string,
  bytes: Uint8Array,
): Promise<void> {
  await storage.write('library', songId, bytes);
}

/** 삭제는 song-select에서 confirm 후 호출한다고 전제한다(§12) — 확인 UI는 여기 없다. */
export async function deleteLibraryEntry(storage: StorageEnv, songId: string): Promise<void> {
  await storage.remove('library', songId);
}

export function listLibrarySongIds(storage: StorageEnv): Promise<readonly string[]> {
  return storage.keys('library');
}

// ── import 게이트 — 구조 검증(M3-5) + playable music decode 검증(§12.2) ──

export interface ImportDecoders {
  /** playable chart의 musicFile을 decode한다. 실패하면 던진다 — 전체 import가 거부된다. */
  readonly decodeAudio: (data: ArrayBuffer) => Promise<unknown>;
  /**
   * jacketFile을 decode한다. 실패해도 import를 막지 않고 경고만 남긴다.
   * 주입하지 않으면 jacket decode 검증 자체를 건너뛴다 — 이 레포에 아직
   * 이미지 decode host가 없다(env에 `env-canvas` 이상의 이미지 디코더가
   * 없음). 결정 필요 항목으로 별도 보고한다.
   */
  readonly decodeJacket?: (data: ArrayBuffer) => Promise<unknown>;
}

export type ImportValidationResult =
  | {
      readonly ok: true;
      readonly charts: readonly CandidateChart[];
      readonly assets: readonly AssetFile[];
      /** decode 실패한 jacket 파일명 — placeholder로 계속하되 호출측이 경고로 보여준다. */
      readonly jacketWarnings: readonly string[];
    }
  | Exclude<CfxLoadResult, { ok: true }>
  | {
      readonly ok: false;
      readonly reason: 'audio-decode-failed';
      readonly fileName: string;
      readonly message: string;
    };

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // 복사본을 만든다 — 원본 buffer가 다른 타입뷰와 공유될 수 있어(subarray 등) 슬라이스로 분리한다.
  return new Uint8Array(bytes).buffer;
}

/**
 * `.cfx` bytes를 라이브러리에 등록해도 되는지 검증한다. `loadCfxPackage`
 * (M3-5, 구조 검증)를 통과한 뒤에만 decode 검증으로 넘어간다 — 두 층을
 * 한 함수에서 순서대로 적용할 뿐 구조 검증을 다시 구현하지 않는다.
 *
 * 같은 파일명을 여러 chart가 참조할 수 있으므로([[cfx]] §7) 파일명별로
 * 한 번만 decode한다.
 */
export async function validateCfxForImport(
  bytes: Uint8Array,
  decoders: ImportDecoders,
): Promise<ImportValidationResult> {
  const loaded = loadCfxPackage(bytes);
  if (!loaded.ok) return loaded;

  const assetBytesByName = new Map(loaded.assets.map((a) => [a.name, a.bytes]));

  const decodedMusicNames = new Set<string>();
  for (const candidate of loaded.charts) {
    if (candidate.chart.chartId === 0) continue; // init은 non-playable — §12.2 "playable music"이 아니다.
    const musicFile = candidate.chart.musicFile;
    if (musicFile === null || decodedMusicNames.has(musicFile)) continue;
    const musicBytes = assetBytesByName.get(musicFile);
    if (musicBytes === undefined) continue; // 구조 검증이 이미 존재를 보장했다 — 방어적 스킵.
    try {
      await decoders.decodeAudio(toArrayBuffer(musicBytes));
    } catch (err) {
      return {
        ok: false,
        reason: 'audio-decode-failed',
        fileName: musicFile,
        message: err instanceof Error ? err.message : String(err),
      };
    }
    decodedMusicNames.add(musicFile);
  }

  const jacketWarnings: string[] = [];
  if (decoders.decodeJacket) {
    const decodeJacket = decoders.decodeJacket;
    const decodedJacketNames = new Set<string>();
    for (const candidate of loaded.charts) {
      const jacketFile = candidate.chart.jacketFile;
      if (jacketFile === null || decodedJacketNames.has(jacketFile)) continue;
      const jacketBytes = assetBytesByName.get(jacketFile);
      if (jacketBytes === undefined) continue;
      try {
        await decodeJacket(toArrayBuffer(jacketBytes));
      } catch {
        jacketWarnings.push(jacketFile);
      }
      decodedJacketNames.add(jacketFile);
    }
  }

  return { ok: true, charts: loaded.charts, assets: loaded.assets, jacketWarnings };
}

// ── 같은 songId reimport — 비교와 실행을 나눈다(§12) ─────────────────

export type ReimportChange =
  | { readonly kind: 'added'; readonly chartId: number; readonly newVersion: number }
  | { readonly kind: 'removed'; readonly chartId: number; readonly oldVersion: number }
  | {
      readonly kind: 'upgraded';
      readonly chartId: number;
      readonly oldVersion: number;
      readonly newVersion: number;
    }
  | {
      readonly kind: 'downgraded';
      readonly chartId: number;
      readonly oldVersion: number;
      readonly newVersion: number;
    }
  | { readonly kind: 'unchanged'; readonly chartId: number; readonly version: number };

/**
 * playable chart만 `chartId`로 비교한다 — init은 비교 대상에서 제외한다(§12
 * "init은 기록·버전 비교 대상에서 제외한다"). 버전 비교는 chart 내부
 * `version`을 쓴다.
 */
export function compareReimport(
  existing: readonly CandidateChart[],
  incoming: readonly CandidateChart[],
): readonly ReimportChange[] {
  const playable = (charts: readonly CandidateChart[]): Map<number, number> =>
    new Map(
      charts.filter((c) => c.chart.chartId !== 0).map((c) => [c.chart.chartId, c.chart.version]),
    );

  const oldByChartId = playable(existing);
  const newByChartId = playable(incoming);
  const chartIds = [...new Set([...oldByChartId.keys(), ...newByChartId.keys()])].sort(
    (a, b) => a - b,
  );

  const changes: ReimportChange[] = [];
  for (const chartId of chartIds) {
    const oldVersion = oldByChartId.get(chartId);
    const newVersion = newByChartId.get(chartId);
    if (oldVersion === undefined && newVersion !== undefined) {
      changes.push({ kind: 'added', chartId, newVersion });
    } else if (oldVersion !== undefined && newVersion === undefined) {
      changes.push({ kind: 'removed', chartId, oldVersion });
    } else if (oldVersion !== undefined && newVersion !== undefined) {
      if (newVersion > oldVersion)
        changes.push({ kind: 'upgraded', chartId, oldVersion, newVersion });
      else if (newVersion < oldVersion)
        changes.push({ kind: 'downgraded', chartId, oldVersion, newVersion });
      else changes.push({ kind: 'unchanged', chartId, version: oldVersion });
    }
  }
  return changes;
}

export type RegisterPlan =
  | { readonly kind: 'add' }
  | { readonly kind: 'reimport-confirm-needed'; readonly changes: readonly ReimportChange[] };

/**
 * 등록 전 계획을 세운다 — 같은 songId가 이미 있으면 확인이 필요하다는
 * 신호와 비교 결과를 낸다. 이 함수는 store를 바꾸지 않는다(읽기 전용).
 */
export async function planLibraryRegistration(
  storage: StorageEnv,
  songId: string,
  incoming: readonly CandidateChart[],
): Promise<RegisterPlan> {
  const existingBytes = await readLibraryEntry(storage, songId);
  if (existingBytes === null) return { kind: 'add' };

  const existingLoaded = loadCfxPackage(existingBytes);
  // 라이브러리에 이미 있는 blob은 등록 시점에 구조 검증을 통과했어야 하므로
  // 실패할 일이 없다 — 방어적으로 실패하면 "기존 chart 없음"으로 취급해
  // incoming 전부를 added로 비교한다(가진 정보만으로 최선의 비교).
  const existingCharts = existingLoaded.ok ? existingLoaded.charts : [];
  return { kind: 'reimport-confirm-needed', changes: compareReimport(existingCharts, incoming) };
}

/**
 * 실제 등록/교체 — `.cfx` bytes를 songId 슬롯에 그대로 덮어쓴다. **chart
 * 단위 부분 병합은 없다**(§12 "reimport는 songId blob 전체 교체"). 다운그레이드
 * 포함 reimport도 그대로 수행한다(D-2026-018) — 이 함수는 change 종류를
 * 따지지 않는다. 호출측이 `planLibraryRegistration`으로 미리 확인을 받은
 * 뒤에만 부르는 것이 계약이다.
 */
export async function commitLibraryRegistration(
  storage: StorageEnv,
  songId: string,
  bytes: Uint8Array,
): Promise<void> {
  await writeLibraryEntry(storage, songId, bytes);
}
