/**
 * `.cfx` packager — 입력 선택·전체 검증·상태 전이.
 *
 * 정의의 단일 출처는 `_meta/cfx.md` §4·§7~§11(과 `_meta/persistence.md` §11
 * UX 요약)이다.
 *
 * 흐름(§9): 사용자가 chart JSON을 다중 선택 → `songId`별 그룹화
 * (`groupBySongId`) → 그룹 안에서 `chartId`별 최고 version 추천
 * (`recommendCandidates`, 동률은 충돌로 표시하고 자동 선택하지 않음) →
 * 참조 asset 확인 → 최종 구성을 그룹별로 검증(`validatePackageGroup`,
 * §10 체크리스트 전부)하고 생성(`buildCfxPackage`)한다.
 *
 * chart JSON **구조** 유효성(§10 "chart JSON 구조 유효"·"지원 schemaVersion")은
 * 여기서 다시 검사하지 않는다 — 입력 선택 단계에서 이미 `format-chart-open`의
 * `openChartJson`(M3-2, `core-validate`)을 통과한 `Chart`만 후보로 들어온다고
 * 전제한다. 같은 검증을 두 번 하지 않는다.
 *
 * 패키징은 비파괴다(§11): 이 파일의 모든 함수는 입력 chart·asset을 읽기만
 * 하고 바꾸지 않는다 — 실제 디스크 쓰기는 `env-file.save`(주입된 콜백)가
 * 맡고, 검증 실패·취소는 아무 파일도 만들지 않는다.
 *
 * `groupBySongId`/`validatePackageGroup`과 그 타입(`CandidateChart` 등)은
 * `format/format-cfx-package.ts`로 옮겼다(D-2026-085, M4-3) — song-select
 * (game 레이어)도 같은 구조 검증이 필요해졌기 때문이다. 이 파일에는 **새
 * `.cfx`를 만드는** editor 전용 쓰기 로직만 남는다 — game은 패키징을 하지
 * 않으므로 여기를 import할 이유가 없다.
 */
import type { Chart } from '../core/core-chart.js';
import { createZipArchive, type ZipEntry } from '../env/env-file.js';
import { sanitizeFileNameSegment } from './edit-chart-save.js';
import {
  validatePackageGroup,
  type AssetFile,
  type CandidateChart,
  type PackageValidationIssue,
} from '../format/format-cfx-package.js';

export interface ChartIdCandidates {
  readonly chartId: number;
  /** 최고 version이 유일하면 그 chart. 동률 충돌이면 `null`(자동 선택하지 않음, §9). */
  readonly recommended: CandidateChart | null;
  /** 최고 version에서 동률인 후보들. 충돌이 없으면 빈 배열. */
  readonly conflicting: readonly CandidateChart[];
  readonly all: readonly CandidateChart[];
}

/**
 * 한 `songId` 그룹 안에서 `chartId`별 최고 `version`을 추천한다. 같은
 * `chartId`의 최고 version 후보가 둘 이상이면(같은 `songId+chartId+version`
 * 중복) 자동 선택하지 않고 충돌로 표시한다(§9 4번). 재스캔은 이 함수를 다시
 * 부르는 것으로 충분하다 — 내부 상태가 없어 수동 선택을 "기억"하지 않는다
 * (§9 "재스캔 시 다시 최고 version을 추천").
 */
export function recommendCandidates(
  charts: readonly CandidateChart[],
): readonly ChartIdCandidates[] {
  const byChartId = new Map<number, CandidateChart[]>();
  for (const candidate of charts) {
    const list = byChartId.get(candidate.chart.chartId);
    if (list) list.push(candidate);
    else byChartId.set(candidate.chart.chartId, [candidate]);
  }

  return [...byChartId.entries()]
    .sort(([a], [b]) => a - b)
    .map(([chartId, all]) => {
      const maxVersion = Math.max(...all.map((c) => c.chart.version));
      const winners = all.filter((c) => c.chart.version === maxVersion);
      return winners.length === 1
        ? { chartId, recommended: winners[0]!, conflicting: [], all }
        : { chartId, recommended: null, conflicting: winners, all };
    });
}

/** `.cfx` 기본 파일명(§8): `{init.title}_{init.musicBy}_v{init.version}.cfx`. */
export function suggestCfxFileName(representative: Chart): string {
  const title = sanitizeFileNameSegment(representative.metadata.title);
  const musicBy = sanitizeFileNameSegment(representative.metadata.musicBy);
  return `${[title, musicBy].filter((p) => p !== '').join('_')}_v${representative.version}.cfx`;
}

export interface CfxPackageInput {
  /** chartId별로 정확히 하나씩, 같은 songId — `validatePackageGroup`이 어긋남을 잡는다. */
  readonly selected: readonly CandidateChart[];
  readonly assets: readonly AssetFile[];
}

export type CfxBuildResult =
  | {
      readonly ok: true;
      readonly fileName: string;
      readonly bytes: Uint8Array;
      /** 참조되지 않아 표시만 하고 package에서 제외한 asset 파일명(§8). */
      readonly unusedAssets: readonly string[];
    }
  | { readonly ok: false; readonly issues: readonly PackageValidationIssue[] };

/**
 * 검증을 통과한 선택으로 `.cfx` bytes를 만든다. 실패해도(검증 실패) 입력을
 * 건드리지 않는다 — 순수 함수다. 실제 디스크 쓰기는 호출측이
 * `packageAndSaveCfx`로 한다.
 */
export function buildCfxPackage(input: CfxPackageInput): CfxBuildResult {
  const validation = validatePackageGroup(input.selected, input.assets);
  if (!validation.ok) return { ok: false, issues: validation.issues };

  const representative = input.selected.find((c) => c.chart.chartId === 0)!.chart;

  const usedAssetNames = new Set<string>();
  for (const candidate of input.selected) {
    if (candidate.chart.musicFile !== null) usedAssetNames.add(candidate.chart.musicFile);
    if (candidate.chart.jacketFile !== null) usedAssetNames.add(candidate.chart.jacketFile);
  }

  const usedAssets: AssetFile[] = [];
  const seenAssetNames = new Set<string>();
  const unusedAssets: string[] = [];
  for (const asset of input.assets) {
    if (!usedAssetNames.has(asset.name)) {
      unusedAssets.push(asset.name);
      continue;
    }
    if (seenAssetNames.has(asset.name)) continue; // 동일 내용 중복(§7) — ZIP에는 한 번만.
    seenAssetNames.add(asset.name);
    usedAssets.push(asset);
  }

  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [
    ...input.selected.map((candidate) => ({
      name: candidate.fileName,
      data: encoder.encode(JSON.stringify(candidate.chart)),
    })),
    ...usedAssets.map((asset) => ({ name: asset.name, data: asset.bytes })),
  ];

  return {
    ok: true,
    fileName: suggestCfxFileName(representative),
    bytes: createZipArchive(entries),
    unusedAssets,
  };
}

export type PackageOutcome =
  | { readonly kind: 'saved'; readonly fileName: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'invalid'; readonly issues: readonly PackageValidationIssue[] };

/**
 * 검증 → 빌드 → 저장까지의 상태 전이(§11). 성공·취소·실패 모두 입력 chart·
 * asset을 바꾸지 않는다 — `writeFile`이 실제 디스크 쓰기(취소 가능, 실제
 * 쓰기 실패는 던진다 — `env-file`의 계약)를 맡는다.
 */
export async function packageAndSaveCfx(
  input: CfxPackageInput,
  writeFile: (fileName: string, bytes: Uint8Array) => Promise<'saved' | 'cancelled'>,
): Promise<PackageOutcome> {
  const built = buildCfxPackage(input);
  if (!built.ok) return { kind: 'invalid', issues: built.issues };

  const outcome = await writeFile(built.fileName, built.bytes);
  return outcome === 'saved' ? { kind: 'saved', fileName: built.fileName } : { kind: 'cancelled' };
}
