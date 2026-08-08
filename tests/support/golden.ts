/**
 * 골든 표 로더와 허용 오차 비교.
 *
 * `tests/golden/*.json`은 원본 `conflux-editor`를 Node에서 실행해 얻은 **관측 자료**다.
 * 사람이 쓴 코드가 아니므로 손으로 고치지 않고 재생성한다(`npm run golden`).
 *
 * 지원 코드가 `tests/golden/`이 아니라 여기 사는 이유: 그 폴더는 관측 자료만
 * 담는다는 선언이 있고, 코드가 섞이면 "손으로 고치지 않는다"의 경계가 흐려진다.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GOLDEN_DIR = fileURLToPath(new URL('../golden/', import.meta.url));

/** 실수 비교 허용 오차. 원본의 누산 순서에서 나온 IEEE 잡음을 흡수한다. */
export const REAL_TOLERANCE = 1e-9;

export interface GoldenTable<TCase = Record<string, unknown>> {
  readonly source: string;
  readonly sourceFingerprint: Readonly<Record<string, string>>;
  readonly extractedBy: string;
  readonly cases: readonly TCase[];
}

/**
 * 골든 표를 읽는다. 표가 비어 있으면 **던진다** — 원본 함수는 필드명이 어긋나도
 * 예외 대신 `null`을 조용히 돌려주므로, 빈 표가 조용히 통과하는 것이
 * 값이 틀린 것보다 위험하다(`tools/golden/README.md` 빈 표 방어와 같은 방침).
 */
export function loadGolden<TCase = Record<string, unknown>>(name: string): GoldenTable<TCase> {
  const path = `${GOLDEN_DIR}${name}.json`;
  const table = JSON.parse(readFileSync(path, 'utf8')) as GoldenTable<TCase>;

  if (!Array.isArray(table.cases) || table.cases.length === 0) {
    throw new Error(`골든 표가 비어 있다: ${name}.json — 재생성이 필요하다 (npm run golden)`);
  }
  return table;
}

/**
 * 실수 비교. 상대 오차 `1e-9`이되, 0 근방에서는 절대 오차로 떨어진다
 * (상대 오차는 기댓값이 0이면 의미를 잃는다).
 */
export function realEquals(actual: number, expected: number): boolean {
  if (Object.is(actual, expected)) return true;
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;

  const scale = Math.max(Math.abs(actual), Math.abs(expected));
  return Math.abs(actual - expected) <= REAL_TOLERANCE * Math.max(scale, 1);
}

/**
 * 정수형 결과(tick·카운트·판정 종류·state·rank)는 **완전 일치**다.
 * 실수 오차를 여기에 흘리지 않기 위해 별도 함수로 둔다.
 */
export function integerEquals(actual: number, expected: number): boolean {
  return Object.is(actual, expected);
}
