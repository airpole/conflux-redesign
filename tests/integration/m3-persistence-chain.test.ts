/**
 * M3 milestone Exit — `_plan/build-order.md` §6:
 *
 * "에디터에서 만든 chart를 저장 → `.cfx`로 묶기 → 다른 프로필에서 열기 →
 * 플레이 → 기록 저장 → 같은 songId reimport 후에도 기록 유지가 한 줄로
 * 이어진다."
 *
 * M3에는 아직 scene/UI가 없어(M4/M5) 사람이 브라우저에서 이 흐름을 눌러볼
 * 수 없다 — M2가 헤드리스 엔진 테스트로 milestone Exit을 검증한 것과 같은
 * 방식으로, M3-1~M3-7이 만든 메커니즘을 실제로 한 줄로 이어 붙여 검증한다.
 * 각 단계는 그 step의 실제 함수를 그대로 부른다(새 로직을 만들지 않는다).
 */
import { describe, expect, it } from 'vitest';
import { makeChart } from '../../src/core/core-chart-fixture.js';
import type { JudgmentCounts } from '../../src/core/core-gauge.js';
import { saveChartVersion } from '../../src/edit/edit-chart-save.js';
import { buildCfxPackage, type CandidateChart } from '../../src/edit/edit-cfx-package.js';
import { loadCfxPackage } from '../../src/edit/edit-cfx-load.js';
import {
  commitLibraryRegistration,
  compareReimport,
  planLibraryRegistration,
  readLibraryEntry,
  validateCfxForImport,
} from '../../src/edit/edit-cfx-library.js';
import { deriveScore } from '../../src/core/core-records.js';
import { readRecord, saveRecordIfEligible } from '../../src/game/game-records.js';
import {
  createStorageEnv,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
} from '../../src/env/env-storage.js';

/** 프로필 하나 = IndexedDB 하나. "다른 프로필에서 열기"는 별도 backend로 표현한다. */
function newProfileStorage() {
  const data = new Map<StoreName, Map<string, unknown>>(STORE_NAMES.map((s) => [s, new Map()]));
  const backend: StorageBackend = {
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
  return createStorageEnv(backend);
}

describe('M3 milestone Exit — 저장 → .cfx → 다른 프로필 → 플레이 → 기록 → reimport 후 기록 유지', () => {
  it('한 줄로 이어진다', async () => {
    const songId = 'song-integration-1';
    const musicAsset = { name: 'music.ogg', bytes: new Uint8Array([1, 2, 3, 4]) };

    // ── 1. 에디터에서 만든 chart를 저장한다(M3-2 saveChartVersion). ──
    const draft = makeChart({
      songId,
      chartId: 1,
      difficulty: 'Trace',
      version: 1,
      musicFile: 'music.ogg',
      metadata: {
        title: 'Integration Song',
        musicBy: 'Tester',
        jacketBy: '',
        offset: 0,
        category: '',
        previewStartMs: 0,
      },
    });
    const NOW = () => '2026-08-31T00:00:00Z';
    const traceSave = await saveChartVersion(draft, 1, null, NOW, async (candidate) => {
      expect(candidate.version).toBe(1); // 첫 저장은 version을 올리지 않는다(§4).
      return { kind: 'saved', name: 'trace_v1.json' };
    });
    expect(traceSave.kind).toBe('saved');
    if (traceSave.kind !== 'saved') return;
    const savedTrace = traceSave.chart;

    const initChart = makeChart({
      songId,
      chartId: 0,
      difficulty: 'init',
      version: 1,
      musicFile: 'music.ogg',
    });

    // ── 2. `.cfx`로 묶는다(M3-4 buildCfxPackage). ──
    const selected: readonly CandidateChart[] = [
      { chart: initChart, fileName: 'init.json' },
      { chart: savedTrace, fileName: 'trace_v1.json' },
    ];
    const built = buildCfxPackage({ selected, assets: [musicAsset] });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    // ── 3. 다른 프로필에서 연다(M3-5 loadCfxPackage + M3-6 등록). ──
    // 저장한 사람의 storage(profileA)와 완전히 별개인 profileB에서 import한다.
    const profileB = newProfileStorage();
    const loaded = loadCfxPackage(built.bytes);
    expect(loaded.ok).toBe(true);

    const decodeAudio = async () => ({}); // 실제 AudioContext 없이 항상 decode 성공을 가정.
    const validated = await validateCfxForImport(built.bytes, { decodeAudio });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const plan = await planLibraryRegistration(profileB, songId, validated.charts);
    expect(plan.kind).toBe('add'); // profileB엔 이 songId가 처음이다.
    await commitLibraryRegistration(profileB, songId, built.bytes);
    expect(await readLibraryEntry(profileB, songId)).toEqual(built.bytes);

    // ── 4. 플레이한다 — judge/gauge는 core 영역이라 이미 M1~M2에서 검증됐다.
    // 여기서는 "판이 끝나 판정 분포가 나왔다"는 결과만 있으면 된다. 10단위를
    // 전부 완주했으므로 실제 score(core-gauge.computeResult 기준)와 자기완결
    // 근사(deriveScore)가 정확히 같다 — D-2026-069가 다루는 갈림은 미완주
    // 판에서만 벌어진다. ──
    const judgments: JudgmentCounts = { SYNC: 8, PERFECT: 1, GOOD: 1, MISS: 0 };
    const score = deriveScore(judgments); // 완주 판이므로 실제 PlayResult.score와 동일하다.

    // ── 5. 기록을 저장한다(M3-7 saveRecordIfEligible). ──
    const saveOutcome = await saveRecordIfEligible(
      profileB,
      songId,
      1,
      { judgments, score, state: 'FC', maxCombo: 10 },
      { autoplay: false, staticShape: false, midStart: false, editorOrigin: false },
    );
    expect(saveOutcome.kind).toBe('saved');
    if (saveOutcome.kind !== 'saved') return;
    expect(saveOutcome.record.bestJudgments).toEqual(judgments);

    // ── 6. 같은 songId를 reimport한다(M3-6) — trace를 v2로 올린 새 .cfx. ──
    const upgradedTrace = { ...savedTrace, version: 2 };
    const reimportSelected: readonly CandidateChart[] = [
      { chart: initChart, fileName: 'init.json' },
      { chart: upgradedTrace, fileName: 'trace_v2.json' },
    ];
    const rebuilt = buildCfxPackage({ selected: reimportSelected, assets: [musicAsset] });
    expect(rebuilt.ok).toBe(true);
    if (!rebuilt.ok) return;

    const reimportValidated = await validateCfxForImport(rebuilt.bytes, { decodeAudio });
    expect(reimportValidated.ok).toBe(true);
    if (!reimportValidated.ok) return;

    const reimportPlan = await planLibraryRegistration(profileB, songId, reimportValidated.charts);
    expect(reimportPlan.kind).toBe('reimport-confirm-needed');
    if (reimportPlan.kind !== 'reimport-confirm-needed') return;
    expect(reimportPlan.changes).toContainEqual({
      kind: 'upgraded',
      chartId: 1,
      oldVersion: 1,
      newVersion: 2,
    });

    // 사용자가 확인했다고 가정하고 blob 전체를 교체한다(부분 병합 없음).
    await commitLibraryRegistration(profileB, songId, rebuilt.bytes);
    expect(await readLibraryEntry(profileB, songId)).toEqual(rebuilt.bytes);

    // 독립적으로 계산해도 같은 비교가 나온다는 것도 확인한다(§12 표시 요구).
    expect(
      compareReimport(
        [{ chart: savedTrace, fileName: 'x' }],
        [{ chart: upgradedTrace, fileName: 'y' }],
      ),
    ).toEqual([{ kind: 'upgraded', chartId: 1, oldVersion: 1, newVersion: 2 }]);

    // ── reimport 후에도 기록이 유지된다(§12 "records는 identity 기반이라
    // blob 교체와 무관하게 유지된다", records.md §1). ──
    const recordAfterReimport = await readRecord(profileB, songId, 1);
    expect(recordAfterReimport).toEqual(saveOutcome.record);
  });
});
