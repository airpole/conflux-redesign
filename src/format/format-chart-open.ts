/**
 * chart JSON 열기 — 텍스트를 파싱하고 두 층(`core-validate`)으로 검증한다.
 *
 * asset(music/jacket) 재연결은 여기 없다 — `_meta/persistence.md` §10의 그
 * 부분은 workspace가 있어야 성립하므로 M3-3(workspace) 소관이다. 이 함수는
 * "이 텍스트가 chart로 성립하는가"까지만 판단한다.
 *
 * M3-2 때는 editor 전용 워크플로였지만, M4-3에서 song-select(game 레이어)도
 * `.cfx` 안의 chart JSON을 같은 방식으로 파싱·검증해야 한다는 게 드러나
 * `format`(D-2026-085)으로 옮겼다 — 브라우저 API를 직접 안 쓰는 순수 로직인데
 * `edit`/`game` 형제 둘 다 읽어야 해서 어느 한쪽 소유가 될 수 없었다.
 */
import type { Chart } from '../core/core-chart.js';
import {
  validateChartDomain,
  validateChartStructure,
  type ValidationIssue,
} from '../core/core-validate.js';

export type OpenChartOutcome =
  | {
      readonly kind: 'opened';
      readonly chart: Chart;
      readonly domainIssues: readonly ValidationIssue[];
    }
  | { readonly kind: 'invalid-json' }
  | { readonly kind: 'rejected'; readonly errors: readonly ValidationIssue[] };

/**
 * JSON 파싱 실패·structural 실패는 **거부**(로드하지 않음). domain 문제는
 * `data-model.md` §11대로 거부하지 않고 함께 돌려준다 — 열기 자체는 성공하고
 * 호출측(호스트)이 문제를 표시할지 정한다.
 */
export function openChartJson(text: string): OpenChartOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: 'invalid-json' };
  }

  const structural = validateChartStructure(parsed);
  if (!structural.ok) return { kind: 'rejected', errors: structural.errors };

  const chart = parsed as Chart;
  const domain = validateChartDomain(chart);
  return { kind: 'opened', chart, domainIssues: domain.issues };
}
