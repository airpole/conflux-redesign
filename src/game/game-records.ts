/**
 * records store 배선 — `core-records.ts`(순수 병합·gate)를 `env-storage`
 * `records` store(M3-1)에 잇는다.
 *
 * 정의의 단일 출처는 `_meta/records.md`다. init(`chartId 0`)은 기록 대상이
 * 아니다(§1) — `saveRecordIfEligible`이 chartId로 걸러 store를 건드리지
 * 않는다.
 *
 * 실제 판 종료 지점(`game-session.ts`의 `finalize`)에서 이 파일의
 * `saveRecordIfEligible`을 부르는 배선, no-record 4조건(특히 `midStart`·
 * `editorOrigin`)을 실제로 판별하는 host 로직은 아직 없다 — `midStart`는
 * editor test scene(M5)이, `editorOrigin`은 그 host가 CTX를 어떻게
 * 채우는지가 정해져야 판별 가능하다(둘 다 아직 없는 scene/editor 층 몫).
 * 이 파일은 그 값들이 이미 정해졌다는 전제로 store 갱신 메커니즘만 만든다.
 *
 * `RecordCandidate.score`는 그 배선이 붙을 때 `PlayResult.score`
 * (`core-gauge.computeResult`, `game-session.ts`의 `finalize`가 이미
 * 계산해 둔 값)를 그대로 넘기면 된다 — `judgments`에서 다시 파생하지
 * 않는다(D-2026-069, `core-records.ts` 참조).
 */
import {
  isNoRecord,
  mergeRecord,
  recordKey,
  type ChartRecord,
  type NoRecordConditions,
  type RecordCandidate,
} from '../core/core-records.js';
import type { StorageEnv } from '../env/env-storage.js';

export async function readRecord(
  storage: StorageEnv,
  songId: string,
  chartId: number,
): Promise<ChartRecord | null> {
  const raw = await storage.read('records', recordKey(songId, chartId));
  return (raw as ChartRecord | undefined) ?? null;
}

async function writeRecord(
  storage: StorageEnv,
  songId: string,
  chartId: number,
  record: ChartRecord,
): Promise<void> {
  await storage.write('records', recordKey(songId, chartId), record);
}

/**
 * 기록 초기화(§4) — 선택한 chart의 record 1개를 지운다. confirm은 호출측
 * (song-select UI, 아직 없음)의 몫이다. `.cfx`·library blob·chart JSON은
 * 건드리지 않는다.
 */
export async function resetRecord(
  storage: StorageEnv,
  songId: string,
  chartId: number,
): Promise<void> {
  await storage.remove('records', recordKey(songId, chartId));
}

export type SaveRecordOutcome =
  | { readonly kind: 'saved'; readonly record: ChartRecord; readonly newBest: boolean }
  | { readonly kind: 'no-record' }
  | { readonly kind: 'skipped-init' };

/**
 * 판이 끝났을 때 기록 갱신을 시도한다.
 *
 * - `chartId === 0`(init)이면 store를 건드리지 않고 `skipped-init`.
 * - no-record 게이트에 걸리면 store를 건드리지 않고 `no-record`(§5 "무적격
 *   판은 result만 표시하고 record를 저장하지 않는다").
 * - 그 외에는 `mergeRecord`로 갱신한 결과를 쓰고 `saved`를 돌려준다.
 */
export async function saveRecordIfEligible(
  storage: StorageEnv,
  songId: string,
  chartId: number,
  candidate: RecordCandidate,
  conditions: NoRecordConditions,
): Promise<SaveRecordOutcome> {
  if (chartId === 0) return { kind: 'skipped-init' };
  if (isNoRecord(conditions)) return { kind: 'no-record' };

  const existing = await readRecord(storage, songId, chartId);
  const { record, judgmentsImproved } = mergeRecord(existing, candidate);
  await writeRecord(storage, songId, chartId, record);

  return { kind: 'saved', record, newBest: judgmentsImproved };
}
