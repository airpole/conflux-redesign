/**
 * player·editor settings의 기본값과 병합 규칙.
 *
 * 정의의 단일 출처는 `_meta/settings.md`다. settings는 chart 데이터가 아니라
 * 사람의 환경·취향이며, 로컬 영속 객체 하나로 산다.
 *
 * 병합 규칙 두 가지가 원본과 다르다(설계 대장 ST-2·ST-3):
 * - **알 수 없는 키는 버린다.** 원본은 `{...DEFAULT, ...saved}`라 폐기된 설정이
 *   저장본에 조용히 살아남았다. 폐기가 폐기이려면 실제로 사라져야 한다.
 * - **범위 밖·타입 불일치 값은 필드 단위로 기본값으로 떨어진다.** 객체 전체를
 *   버리지 않는다 — 한 필드가 깨졌다고 키 바인딩까지 날아가면 손해가 비대칭이다.
 */
import { SCROLL_SPEED_MAX, SCROLL_SPEED_MIN } from './core-constants.js';

export const NOTE_SKINS = ['bar', 'circle'] as const;
export type NoteSkin = (typeof NOTE_SKINS)[number];

export const GAUGE_MODES = ['normal', 'hard', 'fc', 'ap', 'as', 'cascade'] as const;
export type GaugeMode = (typeof GAUGE_MODES)[number];

export const FRAME_CAPS = [0, 30, 60] as const;
export type FrameCap = (typeof FRAME_CAPS)[number];

/** 판정선 기본 위치이자 **가장 낮은** 허용 위치. 올리기만 된다. */
export const JUDGE_LINE_DEFAULT = 8 / 9;

export const LANE_KEY_IDS = ['key1', 'key2', 'key3', 'key4', 'key5', 'key6'] as const;
export type LaneKeyId = (typeof LANE_KEY_IDS)[number];

/**
 * 물리 6키의 기본 바인딩과 lane 매핑.
 *
 * 바인딩은 rebinding으로 바뀌지만 **key → lane 매핑은 고정**이다. 이 표가
 * `laneOf(key)`의 단일 출처다(`_meta/settings.md` §2).
 */
export const DEFAULT_LANE_KEYS = {
  key1: { binding: 'KeyE', lane: 1 },
  key2: { binding: 'KeyR', lane: 2 },
  key3: { binding: 'Space', lane: 3 },
  key4: { binding: 'ArrowDown', lane: 2 },
  key5: { binding: 'Backslash', lane: 3 },
  key6: { binding: 'Numpad7', lane: 4 },
} as const;

export const DEFAULT_ACTION_KEYS = {
  speedDown: 'F1',
  speedUp: 'F2',
  restart: 'F5',
} as const;

export interface Settings {
  // PLAY
  scrollSpeed: number;
  audioOffset: number;
  visualOffset: number;
  volMaster: number;
  volMusic: number;
  volEffect: number;
  keyBindings: Record<LaneKeyId, string>;
  /** `true`면 창 focus를 잃을 때(`blur`, 탭이 계속 보여도)도 자동 pause한다
   *  — `visibilitychange`(탭이 실제로 안 보임)는 이 값과 무관하게 항상
   *  pause한다(D-2026-089, [[scene]] §9). */
  pauseOnBlur: boolean;

  // VISUAL
  noteSkin: NoteSkin;
  laneOpacity: number;
  jacketBrightness: number;
  sudden: number;
  hitEffect: boolean;
  frameCap: FrameCap;
  noteThickness: number;
  judgeLinePos: number;
  showCombo: boolean;
  showJudgment: boolean;
  showFastSlow: boolean;

  // GAUGE
  gaugeMode: GaugeMode;

  // OPTION
  mirror: boolean;
  autoplay: boolean;
  staticShape: boolean;

  // EDITOR
  measureLabelOffset: number;
}

/**
 * 기본값. 별도 표시가 없으면 원본 `settings.js` `DEFAULT_SETTINGS`의 `[보존]`이며
 * `core-settings.test.ts`가 골든과 대조한다.
 *
 * `volMusic`만 `[수정]`이다 — 원본 `0.7`에서 `1.0`으로. (설계 대장 ST-1)
 */
export const DEFAULT_SETTINGS: Settings = {
  scrollSpeed: 3.0,
  audioOffset: 0,
  visualOffset: 0,
  volMaster: 1.0,
  volMusic: 1.0,
  volEffect: 1.0,
  pauseOnBlur: true,
  keyBindings: {
    key1: DEFAULT_LANE_KEYS.key1.binding,
    key2: DEFAULT_LANE_KEYS.key2.binding,
    key3: DEFAULT_LANE_KEYS.key3.binding,
    key4: DEFAULT_LANE_KEYS.key4.binding,
    key5: DEFAULT_LANE_KEYS.key5.binding,
    key6: DEFAULT_LANE_KEYS.key6.binding,
  },

  noteSkin: 'bar',
  laneOpacity: 1.0,
  jacketBrightness: 100,
  sudden: 0,
  hitEffect: true,
  frameCap: 0,
  noteThickness: 15,
  judgeLinePos: JUDGE_LINE_DEFAULT,
  showCombo: true,
  showJudgment: true,
  showFastSlow: true,

  gaugeMode: 'normal',

  mirror: false,
  autoplay: false,
  staticShape: false,

  measureLabelOffset: 0,
};

// ── 필드별 허용 판정 ─────────────────────────────────────────

type Check = (value: unknown) => boolean;

const isFiniteNumber: Check = (v) => typeof v === 'number' && Number.isFinite(v);
const isBoolean: Check = (v) => typeof v === 'boolean';
const inRange =
  (min: number, max: number): Check =>
  (v) =>
    isFiniteNumber(v) && (v as number) >= min && (v as number) <= max;
const oneOf =
  (allowed: readonly unknown[]): Check =>
  (v) =>
    allowed.includes(v);

const isKeyBindings: Check = (v) =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.keys(v).length === LANE_KEY_IDS.length &&
  LANE_KEY_IDS.every((id) => {
    const binding = (v as Record<string, unknown>)[id];
    return typeof binding === 'string' && binding.length > 0;
  });

/**
 * 각 필드가 무엇을 허용하는가. 기본값에 있는 키 전부에 검사가 하나씩 걸린다 —
 * 누락되면 `core-settings.test.ts`가 잡는다. 검사 없는 필드가 조용히 생기면
 * 그 자리에 검증 공백이 난다.
 */
export const SETTING_CHECKS: Record<keyof Settings, Check> = {
  scrollSpeed: inRange(SCROLL_SPEED_MIN, SCROLL_SPEED_MAX),
  audioOffset: isFiniteNumber,
  visualOffset: isFiniteNumber,
  volMaster: inRange(0, 1),
  volMusic: inRange(0, 1),
  volEffect: inRange(0, 1),
  pauseOnBlur: isBoolean,
  keyBindings: isKeyBindings,

  noteSkin: oneOf(NOTE_SKINS),
  laneOpacity: inRange(0, 1),
  jacketBrightness: inRange(0, 100),
  sudden: inRange(0, 90),
  hitEffect: isBoolean,
  frameCap: oneOf(FRAME_CAPS),
  noteThickness: (v) => isFiniteNumber(v) && (v as number) > 0,
  // raise-only — 기본값이 가장 낮은 허용 위치다.
  judgeLinePos: (v) =>
    isFiniteNumber(v) && (v as number) > 0 && (v as number) <= JUDGE_LINE_DEFAULT,
  showCombo: isBoolean,
  showJudgment: isBoolean,
  showFastSlow: isBoolean,

  gaugeMode: oneOf(GAUGE_MODES),

  mirror: isBoolean,
  autoplay: isBoolean,
  staticShape: isBoolean,

  measureLabelOffset: (v) => typeof v === 'number' && Number.isInteger(v),
};

/** 병합에서 버려지거나 되돌려진 자리. 호출측이 사용자에게 알릴 수 있다. */
export interface SettingsMergeReport {
  /** 기본값에 없는 키 — 버렸다. */
  readonly unknownKeys: readonly string[];
  /** 값이 허용 밖이라 기본값으로 되돌린 필드. */
  readonly rejectedKeys: readonly string[];
}

export interface MergedSettings {
  readonly settings: Settings;
  readonly report: SettingsMergeReport;
}

/**
 * 저장본을 기본값 위에 병합한다. 저장본이 무엇이든(파싱 실패한 `null`,
 * 배열, 문자열) 항상 온전한 settings 하나가 나온다.
 */
export function mergeSettings(saved: unknown): MergedSettings {
  const settings: Settings = structuredClone(DEFAULT_SETTINGS);
  const unknownKeys: string[] = [];
  const rejectedKeys: string[] = [];

  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) {
    return { settings, report: { unknownKeys, rejectedKeys } };
  }

  const source = saved as Record<string, unknown>;
  const known = new Set(Object.keys(DEFAULT_SETTINGS));

  for (const key of Object.keys(source)) {
    if (!known.has(key)) {
      unknownKeys.push(key);
      continue;
    }
    const field = key as keyof Settings;
    const value = source[key];
    if (SETTING_CHECKS[field](value)) {
      // 검사를 통과한 값만 들어온다 — 좁힘은 검사가 이미 했다.
      (settings as unknown as Record<string, unknown>)[field] = structuredClone(value);
    } else {
      rejectedKeys.push(key);
    }
  }

  return { settings, report: { unknownKeys, rejectedKeys } };
}

/** `key → lane` 매핑. 바인딩이 바뀌어도 이 매핑은 고정이다. */
export function laneOf(key: LaneKeyId): 1 | 2 | 3 | 4 {
  return DEFAULT_LANE_KEYS[key].lane;
}

/**
 * `candidateCode`가 `target` 아닌 다른 lane key에 이미 물려 있으면 그
 * lane key id를, 아니면 `null`을 돌려준다(M4-6, key rebinding UI의
 * conflict 판정 — `ui-design.md` §2.6.3 idle/capturing/**conflict** 3상태).
 *
 * `game-judge-input.ts`의 `codeToKey`가 물리 key(code) → lane key 1:1
 * map이라, 중복 바인딩을 그대로 커밋하면 먼저 등록된 쪽이 뒤 lane key로
 * 조용히 덮인다 — 이 함수가 그 충돌을 rebind 커밋 전에 미리 잡는다.
 * `target` 자신의 기존 바인딩과 같은 코드를 다시 누르는 것(무변화)은
 * 충돌이 아니다.
 */
export function conflictingLaneKey(
  bindings: Readonly<Record<LaneKeyId, string>>,
  target: LaneKeyId,
  candidateCode: string,
): LaneKeyId | null {
  for (const id of LANE_KEY_IDS) {
    if (id !== target && bindings[id] === candidateCode) return id;
  }
  return null;
}
