/**
 * chart JSON 저장 — version 저장 창의 결정 로직과 파일 쓰기 오케스트레이션.
 *
 * 정의의 단일 출처는 `_meta/persistence.md` §4다.
 *
 * - `Ctrl+S`는 매번 저장 창을 띄우고, 현재 열린 version보다 큰 다음 version을
 *   기본 제안한다.
 * - 신규(아직 파일로 저장된 적 없는) chart의 **첫** 저장만 예외다 — version을
 *   올리지 않고 메모리의 `version`(생성 즉시 `1`) 그대로 저장한다(§4 "신규
 *   chart 첫 저장").
 * - 파일 쓰기가 **성공한 경우에만** 메모리의 `version`·`updatedAt`을 확정한다.
 *   취소·실패는 아무것도 바꾸지 않는다.
 *
 * `currentlyOpenVersion`이 `null`이면 "아직 파일로 저장된 적 없음"
 * (workspace `baseVersion = null`과 같은 뜻, §4·§6)이다. `env-file`의
 * 계약대로 취소는 정상 흐름(`cancelled` outcome)이고 쓰기 실패는 던진다 —
 * 이 함수는 그 구분을 그대로 통과시킨다.
 */
import type { Chart } from '../core/core-chart.js';

export interface VersionProposal {
  readonly proposedVersion: number;
  /** true면 이 저장은 아직 파일이 없는 chart의 첫 저장이다(§4). */
  readonly isFirstSave: boolean;
}

/** 저장 창에 기본으로 채울 version. */
export function proposeSaveVersion(
  chart: Chart,
  currentlyOpenVersion: number | null,
): VersionProposal {
  if (currentlyOpenVersion === null) {
    return { proposedVersion: chart.version, isFirstSave: true };
  }
  return { proposedVersion: currentlyOpenVersion + 1, isFirstSave: false };
}

/**
 * 선택한 version이 유효한가. 첫 저장은 메모리 version과 정확히 같아야 하고
 * (§4 "version을 올리지 않고 v1로 저장"), 그 외에는 현재 열린 version보다
 * 커야 한다(과거 version에서 다시 시작해 더 큰 값을 직접 지정하는 것도 허용,
 * 예: v3을 열어 v6으로 저장).
 */
export function isSaveVersionValid(
  chart: Chart,
  chosenVersion: number,
  currentlyOpenVersion: number | null,
): boolean {
  if (currentlyOpenVersion === null) return chosenVersion === chart.version;
  return chosenVersion > currentlyOpenVersion;
}

export type SaveChartOutcome =
  | { readonly kind: 'saved'; readonly chart: Chart; readonly fileName: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'invalid-version' };

/**
 * 쓰기 결과. `writeFile`은 취소를 `'cancelled'`로 돌려주고, 실제 쓰기 실패는
 * 던진다(`env-file`의 계약) — 이 함수는 그 예외를 잡지 않고 그대로 전파한다.
 * chart 내용은 쓰기가 성공했을 때만 바뀐다.
 */
export async function saveChartVersion(
  chart: Chart,
  chosenVersion: number,
  currentlyOpenVersion: number | null,
  now: () => string,
  writeFile: (candidate: Chart) => Promise<{ kind: 'saved'; name: string } | { kind: 'cancelled' }>,
): Promise<SaveChartOutcome> {
  if (!isSaveVersionValid(chart, chosenVersion, currentlyOpenVersion)) {
    return { kind: 'invalid-version' };
  }

  const candidate: Chart = { ...chart, version: chosenVersion, updatedAt: now() };
  const result = await writeFile(candidate);

  if (result.kind === 'cancelled') return { kind: 'cancelled' };
  return { kind: 'saved', chart: candidate, fileName: result.name };
}

/**
 * 저장 창 기본 파일명. `_meta/cfx.md` §1: `{title}_{musicBy}_{difficulty}[_{subtitle}]_v{n}.json`.
 * 파일시스템에서 문제되는 문자만 최소로 걷어낸다 — 나머지 규칙(길이 제한,
 * 플랫폼별 예약어 등)은 실제 저장 창 구현체(브라우저 File System Access API)가
 * 스스로 처리하므로 여기서 흉내 내지 않는다.
 */
export function suggestChartFileName(chart: Chart, version: number): string {
  const sanitize = (s: string): string => s.replace(/[\\/:*?"<>|]/g, '').trim();

  const parts = [
    sanitize(chart.metadata.title),
    sanitize(chart.metadata.musicBy),
    chart.difficulty,
  ];
  if (chart.subtitle !== '') parts.push(sanitize(chart.subtitle));

  return `${parts.filter((p) => p !== '').join('_')}_v${version}.json`;
}
