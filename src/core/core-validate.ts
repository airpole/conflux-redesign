/**
 * chart 검증 — 두 층.
 *
 * 정의의 단일 출처는 `core/data-model.md` §11이다.
 *
 * - **structural** — 필수 필드 존재·타입·`schemaVersion`. 실패하면 chart로 취급하지
 *   않고 로드를 **거부**한다. 열 수 없는 파일이지 고칠 파일이 아니다.
 * - **domain** — 값 범위·논리. 거부하지 않고 **보고**한다. 편집 중 chart는 항상
 *   잠깐 domain-invalid하다(노트를 놓다 보면 conflict가 생긴다) — 여기서 거부하면
 *   에디터를 못 쓴다. 실행 여부는 호출측 정책이 정하고, 끝내 우회되면
 *   `core/judge.md` §12 런타임 폴백이 받는다.
 *
 * **두 함수 모두 chart를 건드리지 않는다.** 결측 필드를 채워 돌려주지 않는다 —
 * "검증했다"와 "고쳤다"가 한 호출에 섞이면, 골든 대조에서 무엇이 원본 데이터고
 * 무엇이 우리가 채운 값인지 구별이 사라진다. 정규화가 필요하면 호출측이 별도로 한다.
 */
import {
  DIFFICULTIES,
  EASINGS,
  SCHEMA_VERSION,
  TEXT_POSITIONS,
  type Chart,
  type Easing,
} from './core-chart.js';

export interface ValidationIssue {
  /** `notes[3].lane` 처럼 문제가 난 자리. */
  readonly path: string;
  readonly message: string;
}

export interface StructuralResult {
  readonly ok: boolean;
  readonly errors: readonly ValidationIssue[];
}

export interface DomainResult {
  readonly issues: readonly ValidationIssue[];
}

type Bag = Record<string, unknown>;

const isObject = (v: unknown): v is Bag => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === 'string';

// ── structural ───────────────────────────────────────────────

const REQUIRED_STRINGS = ['songId', 'difficulty', 'subtitle', 'chartBy', 'updatedAt'] as const;
const REQUIRED_NUMBERS = ['chartId', 'level', 'version'] as const;
const REQUIRED_ARRAYS = [
  'tempos',
  'timeSignatures',
  'notes',
  'shapeEvents',
  'laneEvents',
  'textEvents',
] as const;
const METADATA_STRINGS = ['title', 'musicBy', 'jacketBy', 'category'] as const;
const METADATA_NUMBERS = ['offset', 'previewStartMs'] as const;

/**
 * 파일이 chart인가. 통과하지 못하면 `Chart`로 다룰 수 없다.
 *
 * `schemaVersion`이 현재 판과 다르면 거부한다. 아직 두 번째 판이 없으므로 지금
 * 필요한 것은 거부 지점이 있다는 것뿐이고, 마이그레이션 체계는 실제로 판을 올릴 때
 * 설계한다.
 */
export function validateChartStructure(value: unknown): StructuralResult {
  const errors: ValidationIssue[] = [];
  const fail = (path: string, message: string): void => void errors.push({ path, message });

  if (!isObject(value)) {
    return { ok: false, errors: [{ path: '', message: 'chart가 객체가 아니다' }] };
  }

  if (value['schemaVersion'] !== SCHEMA_VERSION) {
    fail(
      'schemaVersion',
      `알 수 없는 스키마 판이다: ${JSON.stringify(value['schemaVersion'])} (지원: ${SCHEMA_VERSION})`,
    );
  }

  for (const key of REQUIRED_STRINGS) {
    if (!isString(value[key])) fail(key, '문자열이어야 한다');
  }
  for (const key of REQUIRED_NUMBERS) {
    if (!isNumber(value[key])) fail(key, '수여야 한다');
  }
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(value[key])) fail(key, '배열이어야 한다');
  }
  for (const key of ['musicFile', 'jacketFile'] as const) {
    const file = value[key];
    if (file !== null && !isString(file)) fail(key, '문자열이거나 null이어야 한다');
  }

  const metadata = value['metadata'];
  if (!isObject(metadata)) {
    fail('metadata', '객체여야 한다');
  } else {
    for (const key of METADATA_STRINGS) {
      if (!isString(metadata[key])) fail(`metadata.${key}`, '문자열이어야 한다');
    }
    for (const key of METADATA_NUMBERS) {
      if (!isNumber(metadata[key])) fail(`metadata.${key}`, '수여야 한다');
    }
  }

  return { ok: errors.length === 0, errors };
}

// ── domain ───────────────────────────────────────────────────

const isEasing = (v: unknown): v is Easing =>
  v === null || (isString(v) && (EASINGS as readonly string[]).includes(v));

/** 체인별 anchor 개수. 체인을 무엇으로 가르는지는 호출측이 정한다. */
function countAnchors<T extends { readonly easing: Easing }>(
  events: readonly T[],
  chainOf: (event: T) => string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.easing !== null) continue;
    const chain = chainOf(event);
    counts.set(chain, (counts.get(chain) ?? 0) + 1);
  }
  return counts;
}

/**
 * 값이 말이 되는가. **거부하지 않는다** — 보고만 한다.
 *
 * 겹침(overlap/conflict) 검출은 여기 없다. 그것은 파생 속성이고 sweep-line으로
 * 따로 계산한다(`core/data-model.md` §5.1, M1-8).
 */
export function validateChartDomain(chart: Chart): DomainResult {
  const issues: ValidationIssue[] = [];
  const flag = (path: string, message: string): void => void issues.push({ path, message });

  if (!(DIFFICULTIES as readonly string[]).includes(chart.difficulty)) {
    flag('difficulty', `알 수 없는 difficulty: ${chart.difficulty}`);
  }
  if (!Number.isInteger(chart.chartId) || chart.chartId < 0) {
    flag('chartId', '0 이상의 정수여야 한다');
  }
  if (chart.version < 1) flag('version', '1 이상이어야 한다');
  if (Number.isNaN(Date.parse(chart.updatedAt))) {
    flag('updatedAt', 'ISO 8601 시각으로 읽을 수 없다');
  }
  if (chart.metadata.previewStartMs < 0) flag('metadata.previewStartMs', '0 이상이어야 한다');

  if (chart.tempos.length === 0) flag('tempos', '적어도 하나 있어야 한다');
  chart.tempos.forEach((tempo, i) => {
    if (tempo.bpm <= 0) flag(`tempos[${i}].bpm`, '양수여야 한다');
  });

  if (chart.timeSignatures.length === 0) flag('timeSignatures', '적어도 하나 있어야 한다');
  chart.timeSignatures.forEach((sig, i) => {
    if (!Number.isInteger(sig.numerator) || sig.numerator <= 0) {
      flag(`timeSignatures[${i}].numerator`, '양의 정수여야 한다');
    }
    if (!Number.isInteger(sig.denominator) || sig.denominator <= 0) {
      flag(`timeSignatures[${i}].denominator`, '양의 정수여야 한다');
    }
  });

  chart.notes.forEach((note, i) => {
    if (![1, 2, 3, 4].includes(note.lane)) flag(`notes[${i}].lane`, '1~4여야 한다');
    if (note.duration < 0) flag(`notes[${i}].duration`, '음수일 수 없다');
  });

  chart.shapeEvents.forEach((event, i) => {
    if (event.duration < 0) flag(`shapeEvents[${i}].duration`, '음수일 수 없다');
    if (event.targetPos < -8 || event.targetPos > 8) {
      flag(`shapeEvents[${i}].targetPos`, '-8~+8 밖이다');
    }
    if (!isEasing(event.easing)) flag(`shapeEvents[${i}].easing`, '알 수 없는 easing이다');
  });

  // anchor(`easing === null`)는 체인의 **시작값 하나**다. 둘 이상이면 가장 이른
  // tick의 것만 쓰이고 나머지는 화면에 아무 흔적을 남기지 않는다 — 조용히
  // 사라지는 데이터이므로 여기서 말한다(`shape.md` §4, D-2026-043).
  countAnchors(chart.shapeEvents, (event) => (event.isBlue ? 'blue' : 'red')).forEach(
    (count, chain) => {
      if (count > 1) {
        flag('shapeEvents', `${chain} 체인에 anchor가 ${count}개다 — 가장 이른 것만 쓰인다`);
      }
    },
  );

  chart.laneEvents.forEach((event, i) => {
    if (event.duration < 0) flag(`laneEvents[${i}].duration`, '음수일 수 없다');
    if (![1, 2, 3].includes(event.lineNum)) flag(`laneEvents[${i}].lineNum`, '1~3이어야 한다');
    if (!isEasing(event.easing)) flag(`laneEvents[${i}].easing`, '알 수 없는 easing이다');
    // `targetPos`는 검사하지 않는다 — 저장 데이터는 무구속이고 구속은 gameplay
    // 투영이 맡는다. 역전·초과가 정상 값이다. (설계 대장 DM-4)
  });

  countAnchors(chart.laneEvents, (event) => `line${event.lineNum}`).forEach((count, chain) => {
    if (count > 1) {
      flag('laneEvents', `${chain} 체인에 anchor가 ${count}개다 — 가장 이른 것만 쓰인다`);
    }
  });

  chart.textEvents.forEach((event, i) => {
    if (event.duration < 0) flag(`textEvents[${i}].duration`, '음수일 수 없다');
    if (!(TEXT_POSITIONS as readonly string[]).includes(event.position)) {
      flag(`textEvents[${i}].position`, `알 수 없는 position: ${event.position}`);
    }
  });

  return { issues };
}
