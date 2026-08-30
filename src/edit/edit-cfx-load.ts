/**
 * `.cfx` loader — 구조 검증·decode(ZIP 압축 해제).
 *
 * 정의의 단일 출처는 `_meta/cfx.md` §12(loader)·§15(구 포맷 비호환)다.
 *
 * §12.1: "포함 chart 또는 구조 관계 하나라도 무효면 package 전체를 거부한다
 * ... 정상 chart만 부분 로드하지 않는다." 이 파일의 `loadCfxPackage`는 그
 * 규칙을 그대로 따른다 — 성공(`ok: true`)이 아니면 chart를 하나도 돌려주지
 * 않는다.
 *
 * §12.1의 구조 검증 체크리스트(중복 chartId·고정 chartId-difficulty 불일치·
 * missing asset·same-name different-content asset·invalid path·Representative
 * Chart 결정 불가)는 M3-4 `edit-cfx-package`의 `validatePackageGroup`이 이미
 * 구현한 §10 체크리스트와 **글자 그대로 같다** — `.cfx`는 "이미 충돌이 해소된
 * 최종 배포물"([[cfx]] §10)이라 패키징이 강제한 것과 같은 조건을 로더가 다시
 * 확인하는 것뿐이다. 여기서 다시 구현하지 않고 그대로 재사용한다.
 *
 * chart JSON 하나하나의 malformed JSON·미지원 schemaVersion 거부는 `edit-chart-open`의
 * `openChartJson`(M3-2)을 재사용한다 — 구 conflux-editor v1~v3 JSON(§15)도
 * 이 경로로 거부된다: 옛 스키마는 `schemaVersion`이 안 맞거나 필수 필드가
 * 달라 structural 검증을 통과하지 못한다. 별도 변환기는 두지 않는다(§15).
 *
 * `.cfx`를 에디터에서 열 때의 chart 선택·workspace 복원·history 기준선
 * clear(§13 3~5단계)는 scene/워크스페이스 UI가 있어야 성립하므로 여기 없다
 * — `loadCfxPackage`의 산출물(`charts`+`assets`)을 그 UI가 나중에 소비한다.
 * game/library import에서 요구하는 playable music 실제 decode 검증(§12.2
 * "game/library import·load")도 이 함수의 범위 밖이다 — 그건 "로드했다"가
 * 아니라 "등록해도 되는가"의 정책이라 M3-6(game library) 소관이다.
 */
import type { AssetFile, CandidateChart, PackageValidationIssue } from './edit-cfx-package.js';
import { validatePackageGroup } from './edit-cfx-package.js';
import { openChartJson } from './edit-chart-open.js';
import { readZipArchive } from '../env/env-file.js';

export type CfxLoadResult =
  | {
      readonly ok: true;
      readonly charts: readonly CandidateChart[];
      readonly assets: readonly AssetFile[];
    }
  | { readonly ok: false; readonly reason: 'corrupt-zip'; readonly message: string }
  | {
      readonly ok: false;
      readonly reason: 'invalid-chart';
      readonly fileName: string;
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'invalid-package';
      readonly issues: readonly PackageValidationIssue[];
    };

/**
 * `.cfx` bytes를 chart 집합과 asset으로 푼다. 아래 순서로 **명시적으로
 * 거부**한다(부분 로드 없음, §12.1):
 *
 * 1. ZIP 자체가 손상됐으면(EOCD/central directory/local header 불일치,
 *    잘린 데이터, store가 아닌 압축, CRC-32 불일치) `corrupt-zip`.
 * 2. `.json`으로 끝나는 항목 중 파싱·structural 검증을 통과하지 못하는 것이
 *    있으면(malformed JSON, 미지원 schemaVersion, 구 포맷 등) `invalid-chart`.
 * 3. 통과한 chart+asset 전체가 `validatePackageGroup`(§10=§12.1)을 만족하지
 *    못하면 `invalid-package`.
 *
 * `.json`이 아닌 항목은 전부 asset으로 취급한다 — `.cfx`는 flat ZIP이라
 * 확장자 외에 chart JSON과 asset을 가르는 구조적 신호가 없다([[cfx]] §1의
 * 파일명 관례를 따른 것으로, 결정 필요 항목으로 별도 보고한다).
 */
export function loadCfxPackage(bytes: Uint8Array): CfxLoadResult {
  let entries;
  try {
    entries = readZipArchive(bytes);
  } catch (err) {
    return {
      ok: false,
      reason: 'corrupt-zip',
      message: err instanceof Error ? err.message : String(err),
    };
  }

  const decoder = new TextDecoder();
  const charts: CandidateChart[] = [];
  const assets: AssetFile[] = [];

  for (const entry of entries) {
    if (!entry.name.endsWith('.json')) {
      assets.push({ name: entry.name, bytes: entry.data });
      continue;
    }

    const outcome = openChartJson(decoder.decode(entry.data));
    if (outcome.kind !== 'opened') {
      return {
        ok: false,
        reason: 'invalid-chart',
        fileName: entry.name,
        message:
          outcome.kind === 'invalid-json'
            ? 'JSON으로 파싱할 수 없다'
            : '구조 검증을 통과하지 못했다(미지원 schemaVersion이거나 구 포맷일 수 있다)',
      };
    }
    charts.push({ chart: outcome.chart, fileName: entry.name });
  }

  const validation = validatePackageGroup(charts, assets);
  if (!validation.ok) return { ok: false, reason: 'invalid-package', issues: validation.issues };

  return { ok: true, charts, assets };
}
