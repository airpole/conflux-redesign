/**
 * quick options 패널의 조작 상태 — song-select overlay와 editor test embedded
 * panel이 공유하는 component의 **로직**(`scene.md` §5 "song-select와 editor
 * test가 같은 component를 사용한다"). 5개 필드(`scrollSpeed`·`gaugeMode`·
 * `mirror`·`staticShape`·`autoplay`, `scene.md` §5)만 다루고 배치·렌더는
 * host(M4-7 song-select overlay·M5-6 embedded panel)의 몫이다.
 *
 * core에 두는 이유: 이 조작은 브라우저 API를 하나도 안 쓰는 순수 값 계산이다
 * (row 이동, 값 step, 값 확정) — edit·game이 형제라 서로 못 보는데 이 패널은
 * 둘 다 쓰므로, 둘 다 아래로 보는 core가 공유 위치다.
 *
 * 조작(사용자 확인, D-2026-049):
 * - 위/아래 화살표 = row 이동.
 * - 왼쪽/오른쪽 화살표 = 그 필드에서 한 칸 step(감소/증가).
 * - 스크롤 휠 = 위/아래로 한 칸씩 — **위 = 오른쪽(증가)과 같은 방향으로
 *   맞췄다** `[신규 세부, 명시 확인 필요]`: 사용자 지시는 "스크롤은 위 아래로
 *   한 칸씩"까지만 정했고 부호(위=증가/감소)는 정하지 않았다. 스피너류
 *   관용(휠 위로 = 값 증가)을 따랐다 — 반대라면 뒤집는 건 이 파일 한 곳,
 *   `stepQuickOption`의 `direction` 매핑뿐이다.
 * - 마우스 클릭 = 그 값으로 즉시 점프(`jumpQuickOption`) — 클릭 위치→값
 *   환산은 패널 배치가 정해지는 host 몫이라 여기는 "이미 계산된 값"만 받는다.
 * - **Enter = 지금 선택된 row의 바뀐 값을 확정**한다 `[신규 세부, 명시 확인
 *   필요]`: row를 이동해도 그 전 row의 미확정 값은 원래 값으로 되돌아간다
 *   (한 번에 한 필드만 손보는 모델). 사용자 지시 "바뀐 값은 enter로 confirm"
 *   에서 "여러 row를 한꺼번에 confirm하는가"는 정하지 않아 더 단순한 쪽
 *   (row당 개별 확정)을 택했다.
 */

import { GAUGE_MODES, type GaugeMode } from './core-gauge.js';
import { SCROLL_SPEED_MAX, SCROLL_SPEED_MIN, SCROLL_SPEED_STEP } from './core-constants.js';
import type { Settings } from './core-settings.js';

export const QUICK_OPTION_FIELDS = [
  'scrollSpeed',
  'gaugeMode',
  'mirror',
  'staticShape',
  'autoplay',
] as const;
export type QuickOptionField = (typeof QUICK_OPTION_FIELDS)[number];

export type QuickOptionValues = Pick<Settings, QuickOptionField>;

export interface QuickOptionsState {
  readonly rowIndex: number;
  /** 확정된 값. `settings`에서 5필드만 뽑은 것 — 패널이 여는 순간의 스냅샷. */
  readonly committed: QuickOptionValues;
  /** 지금 row에서 아직 Enter로 안 넘어간 값. 없으면 `committed`와 같다. */
  readonly draft: QuickOptionValues[QuickOptionField];
}

export function openQuickOptions(settings: Settings): QuickOptionsState {
  const committed: QuickOptionValues = {
    scrollSpeed: settings.scrollSpeed,
    gaugeMode: settings.gaugeMode,
    mirror: settings.mirror,
    staticShape: settings.staticShape,
    autoplay: settings.autoplay,
  };
  return { rowIndex: 0, committed, draft: committed[QUICK_OPTION_FIELDS[0]] };
}

function fieldAt(rowIndex: number): QuickOptionField {
  return QUICK_OPTION_FIELDS[rowIndex]!;
}

/**
 * row 이동. 이동하면 그 전 row의 미확정 draft는 버려진다(위 docstring 참조) —
 * 새 row는 그 필드의 확정값에서 다시 시작한다.
 */
export function moveQuickOptionsRow(
  state: QuickOptionsState,
  direction: 'up' | 'down',
): QuickOptionsState {
  const delta = direction === 'up' ? -1 : 1;
  const rowIndex = Math.max(0, Math.min(QUICK_OPTION_FIELDS.length - 1, state.rowIndex + delta));
  if (rowIndex === state.rowIndex) return state;
  return { rowIndex, committed: state.committed, draft: state.committed[fieldAt(rowIndex)] };
}

function clampScrollSpeed(value: number): number {
  return Math.max(SCROLL_SPEED_MIN, Math.min(SCROLL_SPEED_MAX, value));
}

function stepGaugeMode(current: GaugeMode, delta: -1 | 1): GaugeMode {
  const index = GAUGE_MODES.indexOf(current);
  const next = Math.max(0, Math.min(GAUGE_MODES.length - 1, index + delta));
  return GAUGE_MODES[next]!;
}

/**
 * 지금 row를 한 칸 step한다. 화살표(`'left' | 'right'`)와 스크롤
 * (`'scrollUp' | 'scrollDown'`)이 여기로 모인다 — `right`/`scrollUp`이 +1,
 * `left`/`scrollDown`이 -1(위 docstring의 스크롤 부호 결정 참조).
 *
 * bool 필드는 방향과 무관하게 토글이다 — 두 값뿐이라 "한 칸"이 곧 반대값이다.
 */
export function stepQuickOption(
  state: QuickOptionsState,
  direction: 'left' | 'right' | 'scrollUp' | 'scrollDown',
): QuickOptionsState {
  const delta: -1 | 1 = direction === 'left' || direction === 'scrollDown' ? -1 : 1;
  const field = fieldAt(state.rowIndex);
  const draft = stepValue(field, state.committed[field], delta);
  return { ...state, draft };
}

function stepValue(
  field: QuickOptionField,
  current: QuickOptionValues[QuickOptionField],
  delta: -1 | 1,
): QuickOptionValues[QuickOptionField] {
  switch (field) {
    case 'scrollSpeed':
      return clampScrollSpeed((current as number) + delta * SCROLL_SPEED_STEP);
    case 'gaugeMode':
      return stepGaugeMode(current as GaugeMode, delta);
    case 'mirror':
    case 'staticShape':
    case 'autoplay':
      return !(current as boolean);
  }
}

/**
 * 마우스로 그 값에 바로 점프한다. 클릭 위치→값 환산은 host(패널 배치를 아는
 * 쪽)가 하고 여기는 이미 계산된 값을 받아 그 필드의 타입에 맞게 clamp만 한다.
 */
export function jumpQuickOption(
  state: QuickOptionsState,
  value: QuickOptionValues[QuickOptionField],
): QuickOptionsState {
  const field = fieldAt(state.rowIndex);
  const draft = field === 'scrollSpeed' ? clampScrollSpeed(value as number) : value;
  return { ...state, draft };
}

/** Enter — 지금 row의 draft를 확정값으로 승격한다. */
export function confirmQuickOption(state: QuickOptionsState): QuickOptionsState {
  const field = fieldAt(state.rowIndex);
  if (state.draft === state.committed[field]) return state;
  return {
    ...state,
    committed: { ...state.committed, [field]: state.draft },
  };
}

/** 확정값 전체를 `Settings`에 얹어 돌려준다. `settings.md` D-2026-022 — 즉시 영속 필드다. */
export function applyQuickOptions(settings: Settings, state: QuickOptionsState): Settings {
  return { ...settings, ...state.committed };
}
