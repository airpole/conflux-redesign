/**
 * `.cfx` 그룹 형태 — song 그룹화(`groupBySongId`)와 §10 구조 검증
 * (`validatePackageGroup`)의 타입·순수 로직.
 *
 * 정의의 단일 출처는 `_meta/cfx.md` §4·§10이다.
 *
 * M3-4 때는 editor 패키징 워크플로(`edit-cfx-package.ts`)의 일부였다.
 * M4-3에서 song-select(game 레이어)가 library의 `.cfx`를 읽을 때도 같은
 * 구조 검증이 필요하다는 게 드러나 `format`(D-2026-085)으로 옮겼다 — 이
 * 파일은 **읽기/검증**만 다룬다. `.cfx`를 새로 **만드는**(`buildCfxPackage`
 * 등) editor 전용 쓰기 로직은 `edit/edit-cfx-package.ts`에 그대로 남아
 * 이 파일의 타입을 가져다 쓴다 — game은 패키징을 하지 않으므로 그쪽을
 * import할 이유가 없다.
 *
 * 브라우저 API를 직접 안 쓰는 순수 로직이다(env는 여기서 아예 안 쓴다 —
 * ZIP byte 조립은 편에서 안 하고, `format-cfx-load.ts`가 `readZipArchive`를
 * 부르는 쪽이다).
 */
import { DIFFICULTIES, type Chart, type Difficulty } from '../core/core-chart.js';

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
