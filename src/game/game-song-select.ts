/**
 * song-select 목록 로딩 — `env-storage` `library` store를 decode해
 * `core-song-select.ts`가 먹을 입력으로 바꾼다.
 *
 * `.cfx` decode(`loadCfxPackage`)는 `format/format-cfx-load.ts`(D-2026-085,
 * M4-3)를 쓴다 — `edit`↔`game`은 서로 import할 수 없어(architecture.md §1)
 * `edit/edit-cfx-load.ts`를 그대로 쓸 수 없었고, `format`이 그 문제를 풀려고
 * 신설된 공유 층이다.
 *
 * library entry 원시 읽기(`storage.keys('library')`/`storage.read('library',
 * songId)`)는 `edit/edit-cfx-library.ts`의 래퍼(`listLibrarySongIds` 등)를
 * 거치지 않고 `StorageEnv`를 직접 부른다 — 그 래퍼들은 한 줄짜리 pass-through라
 * 옮길 실익이 없고(`StorageEnv`는 이미 env 타입이라 game이 자유롭게 쓴다),
 * `edit-cfx-library.ts`의 나머지(쓰기·import 검증 워크플로)까지 옮길 이유도
 * 없었다 — 최소 범위로만 움직인다.
 *
 * library store는 이미 import 게이트(M3-6, `edit-cfx-library.ts`)를 통과한
 * `.cfx`만 담고 있다는 전제다 — 그래도 decode 실패는 방어적으로 건너뛰고
 * 경고로만 보고한다(저장소 손상 등 예외 상황, 크래시시키지 않는다).
 */
import { loadCfxPackage } from '../format/format-cfx-load.js';
import { readRecord } from './game-records.js';
import { buildSongRow, type SongChartInput, type SongRow } from '../core/core-song-select.js';
import type { Chart } from '../core/core-chart.js';
import type { ChartRecord } from '../core/core-records.js';
import type { StorageEnv } from '../env/env-storage.js';

export interface SongSelectLoadResult {
  readonly rows: readonly SongRow[];
  /** decode에 실패한 songId — 저장소 손상 등 예외 상황. UI가 경고로
   *  보여줄지는 호출측 재량. */
  readonly warnings: readonly string[];
}

export interface PreviewAsset {
  readonly bytes: Uint8Array;
  readonly previewStartMs: number;
}

/**
 * cursor가 멈춘 chart 하나의 preview 음원을 얻는다([[song-select]] §10).
 * `loadSongSelectRows`는 row를 만들고 나면 asset bytes를 들고 있지 않으므로
 * (모든 곡의 음원을 메모리에 올려두지 않는다) preview가 필요해진 chart만
 * 그때 다시 읽어 decode한다 — `loadSongSelectRows`와 같은 "필요할 때 다시
 * 읽는다" 관례.
 */
export async function loadPreviewAsset(
  storage: StorageEnv,
  songId: string,
  chartId: number,
): Promise<PreviewAsset | null> {
  const bytes = (await storage.read('library', songId)) as Uint8Array | undefined;
  if (bytes === undefined) return null;

  const loaded = loadCfxPackage(bytes);
  if (!loaded.ok) return null;

  const found = loaded.charts.find(({ chart }) => chart.chartId === chartId);
  if (found === undefined || found.chart.musicFile === null) return null;

  const asset = loaded.assets.find((a) => a.name === found.chart.musicFile);
  if (asset === undefined) return null;

  return { bytes: asset.bytes, previewStartMs: found.chart.metadata.previewStartMs };
}

export interface PlayableChart {
  readonly chart: Chart;
  /** `chart.musicFile`이 있고 asset도 있으면 그 bytes. 없으면 `null`(무음
   *  판 — 곡 종료 시각은 chart event만으로 정해진다, `songEndOf`). */
  readonly musicBytes: Uint8Array | null;
}

/**
 * gameplay 진입(M4-5, [[scene]] §5 "나가기: chart 선택 확정 + Enter →
 * song-credit")에 필요한 chart 하나 전체(notes 포함)와 그 음원을 얻는다.
 * `chartId 0`(init)은 재생 대상이 아니라 여기서 못 찾는다.
 */
export async function loadPlayableChart(
  storage: StorageEnv,
  songId: string,
  chartId: number,
): Promise<PlayableChart | null> {
  const bytes = (await storage.read('library', songId)) as Uint8Array | undefined;
  if (bytes === undefined) return null;

  const loaded = loadCfxPackage(bytes);
  if (!loaded.ok) return null;

  const found = loaded.charts.find((c) => c.chart.chartId === chartId);
  if (found === undefined) return null;

  const asset =
    found.chart.musicFile === null
      ? undefined
      : loaded.assets.find((a) => a.name === found.chart.musicFile);

  return { chart: found.chart, musicBytes: asset?.bytes ?? null };
}

export async function loadSongSelectRows(storage: StorageEnv): Promise<SongSelectLoadResult> {
  const songIds = await storage.keys('library');
  const warnings: string[] = [];
  const rows: SongRow[] = [];

  for (const songId of songIds) {
    const bytes = (await storage.read('library', songId)) as Uint8Array | undefined;
    if (bytes === undefined) continue; // 목록에는 있었는데 사라짐 — 경합, 조용히 건너뜀

    const loaded = loadCfxPackage(bytes);
    if (!loaded.ok) {
      warnings.push(songId);
      continue;
    }

    const inputs: SongChartInput[] = loaded.charts.map(({ chart }) => ({
      songId: chart.songId,
      chartId: chart.chartId,
      title: chart.metadata.title,
      musicBy: chart.metadata.musicBy,
      category: chart.metadata.category,
      difficulty: chart.difficulty,
      level: chart.level,
      updatedAt: chart.updatedAt,
    }));

    const records = await readRecordsForSong(storage, songId, inputs);
    const row = buildSongRow(inputs, records);
    if (row !== null) rows.push(row);
  }

  return { rows, warnings };
}

async function readRecordsForSong(
  storage: StorageEnv,
  songId: string,
  charts: readonly SongChartInput[],
): Promise<ReadonlyMap<string, ChartRecord>> {
  const chartIds = charts.map((c) => c.chartId).filter((chartId) => chartId >= 1 && chartId <= 5);

  const entries = await Promise.all(
    chartIds.map(async (chartId) => {
      const record = await readRecord(storage, songId, chartId);
      return [`${songId}:${chartId}`, record] as const;
    }),
  );

  const map = new Map<string, ChartRecord>();
  for (const [key, record] of entries) {
    if (record !== null) map.set(key, record);
  }
  return map;
}
