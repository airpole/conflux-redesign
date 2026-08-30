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
 * 여기서 다시 검사하지 않는다 — 입력 선택 단계에서 이미 `edit-chart-open`의
 * `openChartJson`(M3-2, `core-validate`)을 통과한 `Chart`만 후보로 들어온다고
 * 전제한다. 같은 검증을 두 번 하지 않는다.
 *
 * 패키징은 비파괴다(§11): 이 파일의 모든 함수는 입력 chart·asset을 읽기만
 * 하고 바꾸지 않는다 — 실제 디스크 쓰기는 `env-file.save`(주입된 콜백)가
 * 맡고, 검증 실패·취소는 아무 파일도 만들지 않는다.
 */
import { DIFFICULTIES, type Chart, type Difficulty } from '../core/core-chart.js';
import { createZipArchive, type ZipEntry } from '../env/env-file.js';
import { sanitizeFileNameSegment } from './edit-chart-save.js';

export interface CandidateChart {
  readonly chart: Chart;
  /** 이 chart가 선택된 원본 chart JSON 파일명(ZIP에 그대로 들어간다). */
  readonly fileName: string;
}

export interface SongGroup {
  readonly songId: string;
  readonly charts: readonly CandidateChart[];
}

/** 선택된 chart 전체를 `songId`별로 나눈다(§3·§9). */
export function groupBySongId(charts: readonly CandidateChart[]): readonly SongGroup[] {
  const bySongId = new Map<string, CandidateChart[]>();
  for (const candidate of charts) {
    const list = bySongId.get(candidate.chart.songId);
    if (list) list.push(candidate);
    else bySongId.set(candidate.chart.songId, [candidate]);
  }
  return [...bySongId.entries()].map(([songId, group]) => ({ songId, charts: group }));
}

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

/** `subtitle` 정규화(§5): 없음과 빈 문자열은 동일, 앞뒤 공백만 제거. */
function normalizeSubtitle(subtitle: string): string {
  return subtitle.trim();
}

/** `chartId 1~5`의 고정 difficulty 대응(§4). `DIFFICULTIES[chartId]`와 인덱스가 정확히 대응한다. */
function fixedDifficultyFor(chartId: number): Difficulty | null {
  return chartId >= 0 && chartId <= 5 ? DIFFICULTIES[chartId]! : null;
}

const PATH_COMPONENT = /[/\\]|\.\./;

export interface AssetFile {
  /** package-local bare 파일명. */
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface PackageValidationIssue {
  /** 안정적인 기계 판별 코드 — 메시지 문자열보다 이것으로 분기한다. */
  readonly code:
    | 'no-playable-chart'
    | 'missing-init'
    | 'multiple-init'
    | 'playable-missing-music'
    | 'representative-missing-music'
    | 'unresolved-asset'
    | 'invalid-path-reference'
    | 'songid-mismatch'
    | 'duplicate-chart-id'
    | 'chart-id-difficulty-mismatch'
    | 'duplicate-difficulty-subtitle'
    | 'duplicate-file-name'
    | 'asset-content-mismatch';
  readonly message: string;
}

export interface PackageValidationResult {
  readonly ok: boolean;
  readonly issues: readonly PackageValidationIssue[];
}

/**
 * 한 `songId` 그룹의 최종 선택(chartId별 정확히 하나씩)을 §10 체크리스트
 * 전부로 검증한다. 거부하지 않고 문제를 전부 모아 보고한다 — 호출측이 이유를
 * 사용자에게 표시한다.
 */
export function validatePackageGroup(
  selected: readonly CandidateChart[],
  assets: readonly AssetFile[],
): PackageValidationResult {
  const issues: PackageValidationIssue[] = [];
  const flag = (code: PackageValidationIssue['code'], message: string): void => {
    issues.push({ code, message });
  };

  const charts = selected.map((c) => c.chart);
  const songIds = new Set(charts.map((c) => c.songId));
  if (songIds.size > 1) {
    flag('songid-mismatch', `그룹 안에 서로 다른 songId가 섞였다: ${[...songIds].join(', ')}`);
  }

  const initCharts = selected.filter((c) => c.chart.chartId === 0);
  const playableCharts = selected.filter((c) => c.chart.chartId !== 0);

  if (playableCharts.length === 0) flag('no-playable-chart', 'playable chart가 하나도 없다');
  if (initCharts.length === 0) flag('missing-init', 'init(Representative Chart)이 없다');
  if (initCharts.length > 1) flag('multiple-init', 'init이 둘 이상이다 — song당 최대 1개여야 한다');

  for (const candidate of playableCharts) {
    if (candidate.chart.musicFile === null) {
      flag(
        'playable-missing-music',
        `playable chart(chartId ${candidate.chart.chartId})에 musicFile이 없다`,
      );
    }
  }
  for (const candidate of initCharts) {
    if (candidate.chart.musicFile === null) {
      flag('representative-missing-music', 'init(Representative Chart)에 musicFile이 없다');
    }
  }

  // chartId 중복
  const chartIdCounts = new Map<number, number>();
  for (const chart of charts)
    chartIdCounts.set(chart.chartId, (chartIdCounts.get(chart.chartId) ?? 0) + 1);
  for (const [chartId, count] of chartIdCounts) {
    if (count > 1) flag('duplicate-chart-id', `chartId ${chartId}가 ${count}번 선택됐다`);
  }

  // 고정 chartId(0~5) ↔ difficulty 대응, 6+는 init이 아닌 유효 difficulty만
  for (const candidate of selected) {
    const fixed = fixedDifficultyFor(candidate.chart.chartId);
    if (fixed !== null) {
      if (candidate.chart.difficulty !== fixed) {
        flag(
          'chart-id-difficulty-mismatch',
          `chartId ${candidate.chart.chartId}는 difficulty가 "${fixed}"여야 하는데 "${candidate.chart.difficulty}"다`,
        );
      }
    } else if (candidate.chart.difficulty === 'init') {
      flag(
        'chart-id-difficulty-mismatch',
        `chartId ${candidate.chart.chartId}(6 이상)는 init일 수 없다`,
      );
    }
  }

  // playable difficulty + normalized subtitle 유일성(§5, init 제외)
  const seenDifficultySubtitle = new Map<string, number>();
  for (const candidate of playableCharts) {
    const key = `${candidate.chart.difficulty}::${normalizeSubtitle(candidate.chart.subtitle)}`;
    const prior = seenDifficultySubtitle.get(key);
    if (prior !== undefined) {
      flag(
        'duplicate-difficulty-subtitle',
        `difficulty+subtitle 조합이 중복된다(chartId ${prior}, ${candidate.chart.chartId})`,
      );
    } else {
      seenDifficultySubtitle.set(key, candidate.chart.chartId);
    }
  }

  // asset 참조 해소 + 경로 성분 없음
  const assetsByName = new Map(assets.map((a) => [a.name, a]));
  const referencedNames = new Set<string>();
  for (const candidate of selected) {
    for (const ref of [candidate.chart.musicFile, candidate.chart.jacketFile]) {
      if (ref === null) continue;
      if (PATH_COMPONENT.test(ref)) {
        flag('invalid-path-reference', `"${ref}"에 경로 성분이 있다`);
        continue;
      }
      referencedNames.add(ref);
      if (!assetsByName.has(ref)) {
        flag('unresolved-asset', `참조된 asset "${ref}"을 찾지 못했다`);
      }
    }
  }
  for (const asset of assets) {
    if (PATH_COMPONENT.test(asset.name)) {
      flag('invalid-path-reference', `asset 파일명 "${asset.name}"에 경로 성분이 있다`);
    }
  }

  // 전역 파일명 유일성: chart JSON 파일명끼리, asset 파일명끼리, 그리고 서로
  const chartFileNames = selected.map((c) => c.fileName);
  const allNames = [...chartFileNames, ...assets.map((a) => a.name)];
  const nameCounts = new Map<string, number>();
  for (const name of allNames) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  for (const [name, count] of nameCounts) {
    if (count > 1) flag('duplicate-file-name', `"${name}" 파일명이 ZIP root에서 중복된다`);
  }

  // 같은 이름 asset은 내용도 같아야 한다 — assets 입력 자체에 중복 이름이
  // 있을 수 있으므로(§7 "같은 파일명을 참조할 수 있다") 이름별로 묶어 비교한다.
  const byName = new Map<string, AssetFile[]>();
  for (const asset of assets) {
    const list = byName.get(asset.name);
    if (list) list.push(asset);
    else byName.set(asset.name, [asset]);
  }
  for (const [name, group] of byName) {
    if (group.length < 2) continue;
    const first = group[0]!;
    const identical = group.every((a) => bytesEqual(a.bytes, first.bytes));
    if (!identical)
      flag('asset-content-mismatch', `"${name}"으로 제공된 asset의 내용이 서로 다르다`);
  }

  return { ok: issues.length === 0, issues };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
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
