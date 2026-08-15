/**
 * 체인 보간 — 바깥 경계(Blue·Red)와 안쪽 구분선(1·2·3).
 *
 * 정의의 단일 출처는 `core/shape.md` §4다. `core/lane-events.md` §6이 같은 절을
 * 참조하므로 **구현도 한 파일이다** — 두 벌은 선택자(`isBlue` ↔ `lineNum`)와
 * 좌표계(외부단위 -8~+8 ↔ 상대 실수)만 다르고 평가는 글자 그대로 같다.
 *
 * `buildTimeline`과 같은 형태다 — `buildFieldGeometry(chart)`가 파생 객체를 한 번
 * 만들고 그 뒤의 함수는 전부 그것을 인자로 받는다. 캐시도 수동 무효화도 없다
 * (D-2026-037). 모든 함수는 순수하고 인자를 mutate하지 않는다.
 *
 * 판정 코어는 이 파일을 부르지 않는다. shape·laneEvents는 순수 시각이며 판정과
 * 무관하다(`shape.md` §1, `lane-events.md` §4).
 */

import type { Chart, Easing, LaneEvent, ShapeEvent } from './core-chart.js';

// ── easing ──────────────────────────────────────────────────

/**
 * 진행률 `t`에 곡선을 입힌 값. 보간은 `from + (to − from) × applyEasing(t, easing)`
 * 이다(`shape.md` §5).
 *
 * **모르는 이름은 `Linear`로 떨어진다** — 원본 `ease()`와 같다 `[보존]`. 다만
 * 원본은 그것으로 끝이고, 여기서는 `validateChartDomain`이 같은 값을 **보고**한다
 * (D-2026-043) — 모양은 같되 "이 이벤트의 easing이 이상하다"가 화면에 뜬다.
 * 거부하지 않는 것은 편집 중 chart가 잠깐 domain-invalid하기 때문이다
 * (`data-model.md` §11).
 *
 * 저장되는 easing은 3종 + `null`뿐이므로 타입이 맞는 호출에서는 이 폴백이 걸리지
 * 않는다. 검증을 거치지 않은 JSON에서만 닿는 자리다.
 */
export function applyEasing(t: number, easing: string | null): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  switch (easing) {
    case 'In-Sine':
      return 1 - Math.cos((clamped * Math.PI) / 2);
    case 'Out-Sine':
      return Math.sin((clamped * Math.PI) / 2);
    default:
      return clamped;
  }
}

// ── 체인 ────────────────────────────────────────────────────

/** 체인을 이루는 이벤트의 공통 모양. shape·lane 이벤트가 둘 다 이것을 만족한다. */
interface ChainEvent {
  readonly startTick: number;
  readonly duration: number;
  readonly targetPos: number;
  readonly easing: Easing;
}

/**
 * 한 체인의 평가 재료.
 *
 * `initPos`는 그 체인 anchor(`easing === null`)의 위치이고, `transitions`는 보간
 * 이벤트만 시간순으로 세운 것이다. **anchor는 `transitions`에 들어가지 않는다** —
 * anchor는 체인의 시작값 하나이지 중간에 값을 다시 세우는 사건이 아니다
 * (`shape.md` §4, D-2026-043).
 */
interface Chain {
  readonly initPos: number;
  readonly transitions: readonly ChainEvent[];
}

/**
 * 같은 tick의 두 이벤트 순서. `duration === 0`(즉시 점프)이 먼저 선다 `[보존]`.
 *
 * 이 순서가 값을 바꾼다 — tick T에 `duration 0 → 32`와 `duration T → 64`가 함께
 * 있으면, 즉시 점프가 먼저여야 보간이 32에서 출발한다. 규칙을 정해두지 않으면
 * 정렬이 배열 순서에 기대게 되어 같은 chart가 다른 모양을 낸다(D-2026-043).
 */
function chainOrder(a: ChainEvent, b: ChainEvent): number {
  if (a.startTick !== b.startTick) return a.startTick - b.startTick;
  return (a.duration === 0 ? 0 : 1) - (b.duration === 0 ? 0 : 1);
}

/**
 * 한 체인을 세운다. anchor가 여럿이면 **가장 이른 tick**의 것을 쓴다.
 *
 * 원본은 배열에 먼저 적힌 anchor를 골랐다. 그것을 계승하지 않는 이유는, 배열
 * 순서에 기대면 같은 chart를 다시 저장하는 것만으로 모양이 바뀔 수 있기
 * 때문이다 — 설계 대장 SH-6 `[수정]`. anchor가 둘 이상인 것 자체는
 * `validateChartDomain`이 보고한다.
 */
function buildChain(events: readonly ChainEvent[], fallback: number): Chain {
  let anchor: ChainEvent | undefined;
  const transitions: ChainEvent[] = [];

  for (const event of events) {
    if (event.easing === null) {
      if (anchor === undefined || event.startTick < anchor.startTick) anchor = event;
      continue;
    }
    transitions.push(event);
  }

  return {
    initPos: anchor?.targetPos ?? fallback,
    transitions: [...transitions].sort(chainOrder),
  };
}

/**
 * 그 tick의 체인 값.
 *
 * anchor의 `startTick`은 보지 않는다 — 시작값은 곡 시작 전(음수 tick)에도
 * 유효하다 `[보존]`. 그래서 pre-roll 구간의 모양이 tick 0에서 튀지 않는다.
 */
function chainValueAt(chain: Chain, tick: number): number {
  let value = chain.initPos;

  for (const event of chain.transitions) {
    // 아직 시작하지 않았다 — 뒤는 더 볼 것이 없다.
    if (tick < event.startTick) return value;

    // 즉시 점프. 값만 갈아치우고 **계속 훑는다** — 잇달아 놓인 점프가 차례로
    // 다 걸린다.
    if (event.duration <= 0) {
      value = event.targetPos;
      continue;
    }

    // 이미 끝났다 — 목표값을 확정하고 다음으로.
    if (tick >= event.startTick + event.duration) {
      value = event.targetPos;
      continue;
    }

    // 진행 중. 여기서 끝낸다 — 뒤 이벤트는 보지 않는다. 이벤트가 겹쳐 있으면
    // 바깥 것이 끝날 때까지 안쪽 것이 값을 내지 못한다 `[보존]`.
    const t = (tick - event.startTick) / event.duration;
    return value + (event.targetPos - value) * applyEasing(t, event.easing);
  }

  return value;
}

// ── 파생 객체 ───────────────────────────────────────────────

/**
 * anchor가 하나도 없는 체인의 기본 기하.
 *
 * 대칭이다 `[수정]` — 원본은 Blue 0 / Red +2로 비대칭이었다(설계 대장 SH-2).
 * 차트에는 보통 첫 이벤트로 anchor를 두므로 여기 떨어지는 것은 그것이 없을 때다.
 */
export const SHAPE_INIT_FALLBACK = { blue: -2, red: 2 } as const;

/** 구분선 1·2·3의 기본 위치. 경계 사이를 균등 분할한다(`lane-events.md` §1). */
export const LANE_INIT_FALLBACK = { line1: 0.25, line2: 0.5, line3: 0.75 } as const;

/**
 * chart에서 뜬 기하 파생 객체. 다섯 체인(Blue·Red·구분선 셋)과 즉시 점프 tick을
 * 함께 담는다 — 늘 짝으로 쓰이므로 호출자가 여러 개를 들고 다니게 하지 않는다.
 */
export interface FieldGeometry {
  readonly blue: Chain;
  readonly red: Chain;
  readonly line1: Chain;
  readonly line2: Chain;
  readonly line3: Chain;
  /** 즉시 점프가 일어나는 tick. 렌더가 90도 모서리를 그릴 때 쓴다. */
  readonly stepTicks: ReadonlySet<number>;
}

/** 기하 계산에 필요한 것만 추린 입력. */
export type FieldGeometrySource = Pick<Chart, 'shapeEvents' | 'laneEvents'>;

/**
 * 즉시 점프 tick은 **두 종류 이벤트를 합쳐** 모은다. 화면의 90도 모서리는 경계가
 * 튀든 구분선이 튀든 같은 자리에 생기므로 목록을 나누지 않는다.
 */
function collectStepTicks(source: FieldGeometrySource): ReadonlySet<number> {
  const ticks = new Set<number>();
  for (const event of [...source.shapeEvents, ...source.laneEvents]) {
    if (event.easing !== null && event.duration === 0) ticks.add(event.startTick);
  }
  return ticks;
}

export function buildFieldGeometry(source: FieldGeometrySource): FieldGeometry {
  const shapeOf = (isBlue: boolean): readonly ShapeEvent[] =>
    source.shapeEvents.filter((event) => event.isBlue === isBlue);
  const laneOf = (lineNum: 1 | 2 | 3): readonly LaneEvent[] =>
    source.laneEvents.filter((event) => event.lineNum === lineNum);

  return {
    blue: buildChain(shapeOf(true), SHAPE_INIT_FALLBACK.blue),
    red: buildChain(shapeOf(false), SHAPE_INIT_FALLBACK.red),
    line1: buildChain(laneOf(1), LANE_INIT_FALLBACK.line1),
    line2: buildChain(laneOf(2), LANE_INIT_FALLBACK.line2),
    line3: buildChain(laneOf(3), LANE_INIT_FALLBACK.line3),
    stepTicks: collectStepTicks(source),
  };
}

// ── 조회 ────────────────────────────────────────────────────

/** 그 tick의 두 바깥 경계. 외부단위 -8~+8이며 `blue > red`도 정상이다. */
export function shapeGeometryAt(
  geometry: FieldGeometry,
  tick: number,
): { readonly blue: number; readonly red: number } {
  return {
    blue: chainValueAt(geometry.blue, tick),
    red: chainValueAt(geometry.red, tick),
  };
}

/**
 * 그 tick의 구분선 셋. **상대 실수이며 구속이 없다** — 0 미만·1 초과·순서 역전이
 * 전부 유효한 값이다. px 변환과 경계·순서·최소 간격 구속은 gameplay 렌더의 투영
 * 단계 몫이다(`lane-events.md` §3·§4, 설계 대장 DM-4).
 */
export function laneLayoutAt(
  geometry: FieldGeometry,
  tick: number,
): { readonly line1: number; readonly line2: number; readonly line3: number } {
  return {
    line1: chainValueAt(geometry.line1, tick),
    line2: chainValueAt(geometry.line2, tick),
    line3: chainValueAt(geometry.line3, tick),
  };
}

/** 그 tick에서 값이 즉시 튀는가. */
export function isStepTick(geometry: FieldGeometry, tick: number): boolean {
  return geometry.stepTicks.has(tick);
}

/** 구간 안의 즉시 점프 tick, 시간순. 양 끝을 포함한다. */
export function stepTicks(geometry: FieldGeometry, fromTick: number, toTick: number): number[] {
  return [...geometry.stepTicks]
    .filter((tick) => tick >= fromTick && tick <= toTick)
    .sort((a, b) => a - b);
}

// ── Arc — 저장되지 않는 입력 호칭 ───────────────────────────

/**
 * "Arc"로 찍은 이벤트가 실제로 저장할 easing. Out→In→Out… 교번이 Arc가 만드는
 * 무늬다(`shape.md` §5) `[보존]`.
 *
 * 기준은 **직전 동색 보간 이벤트** — 도착 tick(`startTick + duration`)이 `tick`
 * 보다 **엄격히 작은** 것 중 도착이 가장 늦은 것이다. 직전이 없거나 Linear이거나
 * 즉시 점프이거나 In-Sine이면 Out-Sine, 직전이 Out-Sine이면 In-Sine이다.
 *
 * `Step`과 같은 부류다 — 사용자가 고르는 호칭이고 차트에는 `Linear`/`In-Sine`/
 * `Out-Sine` 셋만 남는다. 원본 `ease()`에는 `Arc` 가지(`sin(tπ)`)가 따로 있지만
 * 저장 경로가 전부 여기를 거치므로 실제 차트에 닿지 않는다 — 설계 대장 SH-5(`없음`).
 */
export function resolveArcEasing(
  shapeEvents: readonly ShapeEvent[],
  isBlue: boolean,
  tick: number,
): 'Out-Sine' | 'In-Sine' {
  let previous: ShapeEvent | undefined;
  let latestDest = -Infinity;

  for (const event of shapeEvents) {
    if (event.isBlue !== isBlue || event.easing === null) continue;
    const dest = event.startTick + event.duration;
    if (dest >= tick) continue;
    if (dest >= latestDest) {
      latestDest = dest;
      previous = event;
    }
  }

  if (previous === undefined) return 'Out-Sine';
  if (previous.duration === 0) return 'Out-Sine';
  return previous.easing === 'Out-Sine' ? 'In-Sine' : 'Out-Sine';
}
