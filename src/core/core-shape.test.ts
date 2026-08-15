/**
 * 체인 보간 — `core/shape.md` §4·§5와 `core/lane-events.md` §6의 검증.
 *
 * 골든 `shape.json`은 원본 `shape.js`의 관측 자료다. 좌표만 단위가 다르므로
 * (`내부 = (외부+8)×4`, 설계 대장 SH-1) 테스트가 변환해 대조한다 — 변환이
 * 성립하는지를 보는 것이 SH-1의 검증이다.
 *
 * 이전 판 골든은 픽스처 필드명이 원본과 어긋나 체인 보간을 재는 값이 0건이었다.
 * D-2026-043에서 다시 뽑았다.
 */
import { describe, expect, it } from 'vitest';
import {
  applyEasing,
  buildFieldGeometry,
  isStepTick,
  laneLayoutAt,
  resolveArcEasing,
  shapeGeometryAt,
  stepTicks,
  LANE_INIT_FALLBACK,
  SHAPE_INIT_FALLBACK,
} from './core-shape.js';
import type { FieldGeometrySource } from './core-shape.js';
import type { Easing, LaneEvent, ShapeEvent } from './core-chart.js';
import { loadGolden, realEquals } from '../../tests/support/golden.js';
import { expectDivergence, ledgerEntry } from '../../tests/support/divergences.js';

const T = 1920;

/** 원본 내부단위(0~64) → 재설계 외부단위(-8~+8). */
const toExternal = (internal: number): number => internal / 4 - 8;

function shapeEvent(
  isBlue: boolean,
  startTick: number,
  duration: number,
  targetPos: number,
  easing: Easing,
): ShapeEvent {
  return { isBlue, startTick, duration, targetPos, easing };
}

function laneEvent(
  lineNum: 1 | 2 | 3,
  startTick: number,
  duration: number,
  targetPos: number,
  easing: Easing,
): LaneEvent {
  return { lineNum, startTick, duration, targetPos, easing };
}

function source(
  shapeEvents: readonly ShapeEvent[] = [],
  laneEvents: readonly LaneEvent[] = [],
): FieldGeometrySource {
  return { shapeEvents, laneEvents };
}

const blueAt = (events: readonly ShapeEvent[], tick: number): number =>
  shapeGeometryAt(buildFieldGeometry(source(events)), tick).blue;

// ── §5. easing ──────────────────────────────────────────────

describe('§5 easing — 저장 3종 + null', () => {
  it('Linear는 진행률을 그대로 돌려준다', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(applyEasing(t, 'Linear')).toBeCloseTo(t, 12);
    }
  });

  it('In-Sine은 천천히 떠나고 Out-Sine은 천천히 닿는다', () => {
    expect(applyEasing(0.5, 'In-Sine')).toBeCloseTo(1 - Math.cos(Math.PI / 4), 12);
    expect(applyEasing(0.5, 'Out-Sine')).toBeCloseTo(Math.sin(Math.PI / 4), 12);
    // 반환값은 진행률이지 위치가 아니다 — 곡선 셋이 양 끝에서만 만난다.
    expect(applyEasing(0.5, 'In-Sine')).toBeLessThan(0.5);
    expect(applyEasing(0.5, 'Out-Sine')).toBeGreaterThan(0.5);
  });

  it('양 끝은 세 곡선이 모두 같다', () => {
    for (const easing of ['Linear', 'In-Sine', 'Out-Sine'] as const) {
      expect(applyEasing(0, easing)).toBe(0);
      expect(applyEasing(1, easing)).toBeCloseTo(1, 15);
    }
  });

  it('진행률이 범위를 벗어나면 자른다', () => {
    expect(applyEasing(-3, 'Out-Sine')).toBe(0);
    expect(applyEasing(9, 'In-Sine')).toBeCloseTo(1, 15);
  });

  it('In-Sine은 t=1에서 딱 1이 아니다 — 그런데 체인은 그 값을 쓰지 않는다', () => {
    // `1 − cos(π/2)`는 IEEE에서 0.9999999999999999다. 원본도 같은 식이라 값
    // 자체는 `[보존]`이고, 체인 평가는 `tick >= 끝`을 별도 가지로 처리해
    // 목표값을 그대로 확정하므로 이 오차가 화면에 닿지 않는다.
    expect(applyEasing(1, 'In-Sine')).not.toBe(1);

    const events = [shapeEvent(true, 0, 0, -8, null), shapeEvent(true, 0, T, 3.5, 'In-Sine')];
    expect(blueAt(events, T)).toBe(3.5);
    expect(blueAt(events, T * 9)).toBe(3.5);
  });

  it('모르는 easing은 Linear로 떨어진다 — 원본과 같다', () => {
    for (const t of [0.25, 0.5, 0.75]) {
      expect(applyEasing(t, 'Nonsense')).toBe(applyEasing(t, 'Linear'));
      expect(applyEasing(t, null)).toBe(applyEasing(t, 'Linear'));
    }
  });
});

// ── §4. anchor ──────────────────────────────────────────────

describe('§4 anchor — 체인의 시작값 하나', () => {
  it('anchor가 없으면 대칭 기본 기하로 떨어진다', () => {
    const geometry = buildFieldGeometry(source());
    expect(shapeGeometryAt(geometry, 0)).toEqual({ blue: -2, red: 2 });
    expect(SHAPE_INIT_FALLBACK).toEqual({ blue: -2, red: 2 });
    expectDivergence('SH-2');
  });

  it('구분선은 균등 분할로 떨어진다', () => {
    const geometry = buildFieldGeometry(source());
    expect(laneLayoutAt(geometry, 0)).toEqual({ line1: 0.25, line2: 0.5, line3: 0.75 });
    expect(LANE_INIT_FALLBACK).toEqual({ line1: 0.25, line2: 0.5, line3: 0.75 });
  });

  it('anchor의 tick은 보지 않는다 — 시작값이 곡 시작 전에도 유효하다', () => {
    const events = [shapeEvent(true, T * 4, 0, 5, null)];
    expect(blueAt(events, -T * 100)).toBe(5);
    expect(blueAt(events, 0)).toBe(5);
    expect(blueAt(events, T * 10)).toBe(5);
  });

  it('체인 한가운데 anchor는 아무 일도 하지 않는다', () => {
    const events = [
      shapeEvent(true, 0, 0, -6, null),
      shapeEvent(true, T, T, 4, 'Linear'),
      shapeEvent(true, T * 3, 0, -8, null), // 중간 anchor
      shapeEvent(true, T * 4, T, 8, 'Linear'),
    ];
    // 중간 anchor가 값을 못박는다면 T*3에서 -8이 되고 T*4.5는 0이 된다.
    expect(blueAt(events, T * 3.5)).toBe(4);
    expect(blueAt(events, T * 4.5)).toBe(6);
  });

  it('anchor가 여럿이면 가장 이른 tick의 것이 이긴다 — 배열 순서가 아니다', () => {
    const late = shapeEvent(true, T * 8, 0, -7, null);
    const early = shapeEvent(true, 0, 0, 7, null);
    expect(blueAt([late, early], 0)).toBe(7);
    expect(blueAt([early, late], 0)).toBe(7);
    expectDivergence('SH-6');
  });

  it('두 체인은 서로의 anchor를 쓰지 않는다', () => {
    const geometry = buildFieldGeometry(source([shapeEvent(true, 0, 0, 6, null)]));
    expect(shapeGeometryAt(geometry, 0)).toEqual({ blue: 6, red: 2 });
  });
});

// ── §4. 평가 절차 ───────────────────────────────────────────

describe('§4 평가 — 순회 규칙', () => {
  const anchor = shapeEvent(true, 0, 0, -8, null);

  it('시작 전에는 직전값을 유지한다', () => {
    const events = [anchor, shapeEvent(true, T, T, 8, 'Linear')];
    expect(blueAt(events, 0)).toBe(-8);
    expect(blueAt(events, T - 1)).toBe(-8);
  });

  it('진행 중이면 곡선을 탄다', () => {
    const events = [anchor, shapeEvent(true, T, T, 8, 'Linear')];
    expect(blueAt(events, T * 1.25)).toBe(-4);
    expect(blueAt(events, T * 1.5)).toBe(0);
    expect(blueAt(events, T * 1.75)).toBe(4);
  });

  it('끝난 뒤에는 목표값에 머문다', () => {
    const events = [anchor, shapeEvent(true, T, T, 8, 'Linear')];
    expect(blueAt(events, T * 2)).toBe(8);
    expect(blueAt(events, T * 100)).toBe(8);
  });

  it('duration 0은 순회를 끊지 않는다 — 잇단 점프가 차례로 다 걸린다', () => {
    const events = [
      anchor,
      shapeEvent(true, T, 0, -4, 'Linear'),
      shapeEvent(true, T * 2, 0, 0, 'Linear'),
      shapeEvent(true, T * 3, 0, 4, 'Linear'),
    ];
    expect(blueAt(events, T - 1)).toBe(-8);
    expect(blueAt(events, T)).toBe(-4);
    expect(blueAt(events, T * 2)).toBe(0);
    expect(blueAt(events, T * 3)).toBe(4);
    expect(blueAt(events, T * 9)).toBe(4);
  });

  it('진행 중인 이벤트를 만나면 거기서 끝낸다 — 겹친 안쪽은 바깥이 끝나야 값을 낸다', () => {
    const events = [
      anchor,
      shapeEvent(true, T, T * 4, 8, 'Linear'), // 길게
      shapeEvent(true, T * 2, T, 0, 'Linear'), // 안에 겹침
    ];
    // 바깥이 도는 동안 안쪽은 없는 것과 같다.
    expect(blueAt(events, T * 3)).toBe(0);
    // 바깥이 끝난 뒤에야 안쪽의 목표값이 확정된다 — 값이 되돌아간다.
    expect(blueAt(events, T * 5)).toBe(0);
    expect(blueAt(events, T * 6)).toBe(0);
  });

  it('from은 자기가 들지 않고 직전 문맥에서 상속한다', () => {
    const events = [
      anchor,
      shapeEvent(true, 0, T, 0, 'Linear'), // -8 → 0
      shapeEvent(true, T, T, 4, 'Linear'), // 0 → 4 (from을 0으로 물려받는다)
    ];
    expect(blueAt(events, T * 1.5)).toBe(2);
  });

  it('보간은 정수 tick이 아닌 지점에서도 성립한다', () => {
    const events = [anchor, shapeEvent(true, 0, T, 8, 'Linear')];
    expect(blueAt(events, T / 3)).toBeCloseTo(-8 + 16 / 3, 9);
  });
});

describe('§4 같은 tick 정렬 — 즉시 점프가 먼저 선다', () => {
  const anchor = shapeEvent(true, 0, 0, -8, null);
  const jump = shapeEvent(true, T, 0, 0, 'Linear');
  const glide = shapeEvent(true, T, T, 8, 'Linear');

  it('점프한 값에서 보간이 출발한다', () => {
    expect(blueAt([anchor, glide, jump], T)).toBe(0);
    expect(blueAt([anchor, glide, jump], T * 1.5)).toBe(4);
  });

  it('배열 순서를 바꿔도 같은 값이 나온다', () => {
    for (const events of [
      [anchor, glide, jump],
      [anchor, jump, glide],
      [jump, glide, anchor],
    ]) {
      expect(blueAt(events, T * 1.5)).toBe(4);
    }
  });
});

// ── 즉시 점프 tick 목록 ─────────────────────────────────────

describe('즉시 점프 tick', () => {
  it('anchor는 즉시 점프가 아니다 — duration 0이어도 세지 않는다', () => {
    const geometry = buildFieldGeometry(source([shapeEvent(true, T, 0, 0, null)]));
    expect(isStepTick(geometry, T)).toBe(false);
  });

  it('duration 0 보간 이벤트만 센다', () => {
    const geometry = buildFieldGeometry(
      source([
        shapeEvent(true, 0, 0, -8, null),
        shapeEvent(true, T, 0, 0, 'Linear'),
        shapeEvent(false, T * 3, T, 4, 'Linear'),
      ]),
    );
    expect(isStepTick(geometry, T)).toBe(true);
    expect(isStepTick(geometry, T * 3)).toBe(false);
  });

  it('경계와 구분선의 점프를 한 목록에 모은다', () => {
    const geometry = buildFieldGeometry(
      source([shapeEvent(true, T * 2, 0, 0, 'Linear')], [laneEvent(2, T, 0, 0.4, 'Linear')]),
    );
    expect(stepTicks(geometry, 0, T * 4)).toEqual([T, T * 2]);
  });

  it('구간은 양 끝을 포함하고 시간순으로 나온다', () => {
    const geometry = buildFieldGeometry(
      source([
        shapeEvent(true, T * 3, 0, 0, 'Linear'),
        shapeEvent(true, T, 0, 4, 'Linear'),
        shapeEvent(true, T * 5, 0, -4, 'Linear'),
      ]),
    );
    expect(stepTicks(geometry, T, T * 3)).toEqual([T, T * 3]);
    expect(stepTicks(geometry, T + 1, T * 3 - 1)).toEqual([]);
  });
});

// ── lane 체인 ───────────────────────────────────────────────

describe('lane 체인 — shape와 같은 알고리즘, 선택자와 좌표계만 다르다', () => {
  it('구분선 셋이 각각 독립 체인이다', () => {
    const geometry = buildFieldGeometry(
      source([], [laneEvent(2, 0, 0, 0.9, null), laneEvent(2, T, T, 0.1, 'Linear')]),
    );
    expect(laneLayoutAt(geometry, 0)).toEqual({ line1: 0.25, line2: 0.9, line3: 0.75 });
    expect(laneLayoutAt(geometry, T * 1.5).line2).toBeCloseTo(0.5, 12);
    expect(laneLayoutAt(geometry, T * 2).line2).toBeCloseTo(0.1, 12);
  });

  it('0 미만·1 초과·순서 역전이 그대로 나온다 — 구속은 렌더 몫이다', () => {
    const geometry = buildFieldGeometry(
      source(
        [],
        [
          laneEvent(1, 0, 0, 1.8, null),
          laneEvent(2, 0, 0, -0.5, null),
          laneEvent(3, 0, 0, 0.5, null),
        ],
      ),
    );
    expect(laneLayoutAt(geometry, 0)).toEqual({ line1: 1.8, line2: -0.5, line3: 0.5 });
    expect(ledgerEntry('DM-4').relation).toBe('미커버');
  });

  it('같은 알고리즘이다 — 같은 이벤트 열이면 shape와 값이 같다', () => {
    const shapeChain = [
      shapeEvent(true, 0, 0, 0.25, null),
      shapeEvent(true, T, T * 2, 0.75, 'In-Sine'),
    ];
    const laneChain = [laneEvent(1, 0, 0, 0.25, null), laneEvent(1, T, T * 2, 0.75, 'In-Sine')];
    for (const tick of [0, T, T * 1.5, T * 2, T * 2.5, T * 3, T * 4]) {
      const shape = shapeGeometryAt(buildFieldGeometry(source(shapeChain)), tick);
      const lane = laneLayoutAt(buildFieldGeometry(source([], laneChain)), tick);
      expect(lane.line1).toBeCloseTo(shape.blue, 12);
    }
  });
});

// ── Arc — 저장되지 않는 입력 호칭 ───────────────────────────

describe('§5 Arc — 교번 규칙', () => {
  const events = [
    shapeEvent(true, 0, 0, -8, null),
    shapeEvent(true, T, T, -4, 'Out-Sine'), // 도착 T*2
    shapeEvent(true, T * 3, T, 0, 'In-Sine'), // 도착 T*4
  ];

  it('직전이 없으면 Out-Sine이다', () => {
    expect(resolveArcEasing([], true, T)).toBe('Out-Sine');
  });

  it('도착이 tick과 같으면 아직 직전이 아니다 — 엄격히 작아야 한다', () => {
    expect(resolveArcEasing(events, true, T * 2)).toBe('Out-Sine');
    expect(resolveArcEasing(events, true, T * 2 + 1)).toBe('In-Sine');
  });

  it('Out-Sine 다음은 In-Sine, In-Sine 다음은 Out-Sine이다', () => {
    expect(resolveArcEasing(events, true, T * 3)).toBe('In-Sine');
    expect(resolveArcEasing(events, true, T * 5)).toBe('Out-Sine');
  });

  it('직전이 Linear거나 즉시 점프면 Out-Sine이다', () => {
    const linear = [shapeEvent(true, 0, T, 0, 'Linear')];
    expect(resolveArcEasing(linear, true, T * 2)).toBe('Out-Sine');
    const jump = [shapeEvent(true, 0, 0, 0, 'Out-Sine')];
    expect(resolveArcEasing(jump, true, T)).toBe('Out-Sine');
  });

  it('다른 체인의 이벤트는 보지 않는다', () => {
    const red = [shapeEvent(false, T, T, -4, 'Out-Sine')];
    expect(resolveArcEasing(red, true, T * 5)).toBe('Out-Sine');
    expect(resolveArcEasing(red, false, T * 5)).toBe('In-Sine');
  });

  it('anchor는 직전 후보가 아니다', () => {
    const withAnchor = [
      shapeEvent(true, T, T, -4, 'Out-Sine'),
      shapeEvent(true, T * 2, 0, 0, null),
    ];
    expect(resolveArcEasing(withAnchor, true, T * 5)).toBe('In-Sine');
  });

  it('원본의 네 번째 곡선 Arc는 저장값이 아니다', () => {
    // `resolveArcEasing`이 낼 수 있는 값에 'Arc'가 없다는 것이 그 실체다.
    expect(ledgerEntry('SH-5').relation).toBe('없음');
  });
});

// ── 파생 객체 ───────────────────────────────────────────────

describe('파생 객체 — 캐시도 무효화도 없다', () => {
  it('입력을 mutate하지 않는다', () => {
    const shapeEvents = [shapeEvent(true, T, T, 4, 'Linear'), shapeEvent(true, 0, 0, -8, null)];
    const before = structuredClone(shapeEvents);
    const geometry = buildFieldGeometry(source(shapeEvents));
    shapeGeometryAt(geometry, T * 1.5);
    expect(shapeEvents).toEqual(before);
  });

  it('같은 입력이면 몇 번을 물어도 같은 값이다', () => {
    const geometry = buildFieldGeometry(
      source([shapeEvent(true, 0, 0, -8, null), shapeEvent(true, T, T, 8, 'Out-Sine')]),
    );
    const first = shapeGeometryAt(geometry, T * 1.5);
    expect(shapeGeometryAt(geometry, T * 1.5)).toEqual(first);
  });

  it('이벤트가 하나도 없어도 동작한다', () => {
    const geometry = buildFieldGeometry(source());
    expect(shapeGeometryAt(geometry, T * 7)).toEqual({ blue: -2, red: 2 });
    expect(stepTicks(geometry, 0, T * 9)).toEqual([]);
  });
});

// ── 골든 대조 ───────────────────────────────────────────────

interface GoldenCase {
  readonly group: string;
  readonly fixture?: string;
  readonly fn: string;
  readonly args: readonly unknown[];
  readonly expected: unknown;
}

/** 골든 픽스처와 같은 이벤트 열을 재설계 좌표로 다시 적은 것. */
const FIXTURES: Readonly<Record<string, FieldGeometrySource>> = {
  chain: source([
    shapeEvent(true, 0, 0, toExternal(24), null),
    shapeEvent(false, 0, 0, toExternal(44), null),
    shapeEvent(true, T, T, toExternal(8), 'Out-Sine'),
    shapeEvent(true, T * 3, T, toExternal(40), 'In-Sine'),
    shapeEvent(false, T, T * 2, toExternal(60), 'Linear'),
    shapeEvent(false, T * 4, 0, toExternal(32), 'Linear'),
  ]),
  noAnchor: source([shapeEvent(true, T, T, toExternal(0), 'Linear')]),
  midAnchor: source([
    shapeEvent(true, 0, 0, toExternal(10), null),
    shapeEvent(true, T, T, toExternal(50), 'Linear'),
    shapeEvent(true, T * 3, 0, toExternal(0), null),
    shapeEvent(true, T * 4, T, toExternal(64), 'Linear'),
  ]),
  anchorOrder: source([
    shapeEvent(true, T * 8, 0, toExternal(5), null),
    shapeEvent(true, 0, 0, toExternal(60), null),
  ]),
  sameTick: source([
    shapeEvent(true, 0, 0, toExternal(0), null),
    shapeEvent(true, T, T, toExternal(64), 'Linear'),
    shapeEvent(true, T, 0, toExternal(32), 'Linear'),
  ]),
  steps: source([
    shapeEvent(true, 0, 0, toExternal(0), null),
    shapeEvent(true, T, 0, toExternal(20), 'Linear'),
    shapeEvent(true, T * 2, 0, toExternal(40), 'Linear'),
    shapeEvent(true, T * 3, 0, toExternal(60), 'Linear'),
  ]),
  overlapping: source([
    shapeEvent(true, 0, 0, toExternal(0), null),
    shapeEvent(true, T, T * 4, toExternal(64), 'Linear'),
    shapeEvent(true, T * 2, T, toExternal(32), 'Linear'),
  ]),
  arc: source([
    shapeEvent(true, 0, 0, toExternal(0), null),
    shapeEvent(true, T, T, toExternal(20), 'Out-Sine'),
    shapeEvent(true, T * 3, T, toExternal(40), 'In-Sine'),
  ]),
};

/**
 * 골든과 갈리는 자리. 값이 다른 것 자체가 등재된 설계 차이의 증거다.
 *
 * - `noAnchor` — 원본은 Blue 32(외부 0)/Red 40(외부 +2)로 비대칭, 재설계는 -2/+2.
 * - `anchorOrder` — 원본은 배열에 먼저 적힌 anchor, 재설계는 가장 이른 tick.
 */
const DIVERGENT_FIXTURES: Readonly<Record<string, string>> = {
  noAnchor: 'SH-2',
  anchorOrder: 'SH-6',
};

describe('골든 대조 — 원본 shape.js', () => {
  const table = loadGolden<GoldenCase>('shape');
  const cases = table.cases;

  it('표가 이전 판의 빈 값을 담고 있지 않다', () => {
    // 이전 판은 `getShape` 아홉 건이 전부 `{left: 32, right: null}`이었다.
    const chainCases = cases.filter((c) => c.fn === 'getShape');
    expect(chainCases.length).toBeGreaterThan(0);
    for (const c of chainCases) {
      const value = c.expected as { left: unknown; right: unknown };
      expect(value.left, `getShape${JSON.stringify(c.args)}`).toEqual(expect.any(Number));
      expect(value.right, `getShape${JSON.stringify(c.args)}`).toEqual(expect.any(Number));
    }
  });

  it('easing 세 곡선이 서로 다른 값을 낸다 — 표가 곡선을 실제로 갈랐다', () => {
    const midpoint = (type: string): number =>
      cases.find((c) => c.fn === 'ease' && c.args[3] === type && c.args[2] === 0.5)
        ?.expected as number;
    expect(midpoint('Linear')).toBe(50);
    expect(midpoint('In-Sine')).toBeLessThan(50);
    expect(midpoint('Out-Sine')).toBeGreaterThan(50);
  });

  it('easing 3종은 이름도 값도 원본과 같다', () => {
    const easeCases = cases.filter(
      (c) => c.fn === 'ease' && ['Linear', 'In-Sine', 'Out-Sine'].includes(c.args[3] as string),
    );
    expect(easeCases.length).toBe(21);
    for (const c of easeCases) {
      const t = c.args[2] as number;
      const easing = c.args[3] as string;
      // 원본은 `ease(from, to, t, type)`로 위치를, 재설계는 진행률을 돌려준다.
      const ours = 0 + (100 - 0) * applyEasing(t, easing);
      expect(realEquals(ours, c.expected as number), `${easing} t=${t}`).toBe(true);
    }
  });

  it('모르는 easing이 Linear로 떨어지는 것도 원본과 같다', () => {
    for (const c of cases.filter((x) => x.fn === 'ease' && x.args[3] === 'Nonsense')) {
      const ours = 100 * applyEasing(c.args[2] as number, 'Nonsense');
      expect(realEquals(ours, c.expected as number)).toBe(true);
    }
    // 값이 같은 데까지가 골든의 몫이다. 재설계가 여기에 더한 것은 domain 검증의
    // 보고이고, 원본에 대응물이 없어 골든이 닿지 않는다.
    expect(ledgerEntry('SH-3').relation).toBe('미커버');
  });

  it('체인 값이 단위 변환 뒤 원본과 일치한다', () => {
    let compared = 0;

    for (const c of cases.filter((x) => x.fn === 'getShape')) {
      const fixture = FIXTURES[c.fixture!]!;
      const tick = c.args[0] as number;
      const expected = c.expected as { left: number; right: number };
      const ours = shapeGeometryAt(buildFieldGeometry(fixture), tick);
      const divergence = DIVERGENT_FIXTURES[c.fixture!];

      if (divergence !== undefined) {
        expectDivergence(divergence);
        continue;
      }

      const label = `${c.fixture} tick=${tick}`;
      expect(realEquals(ours.blue, toExternal(expected.left)), `${label} blue`).toBe(true);
      expect(realEquals(ours.red, toExternal(expected.right)), `${label} red`).toBe(true);
      compared += 1;
    }

    // 대조가 실제로 일어났는지 — 필터가 어긋나 0건을 통과시키는 것을 막는다.
    expect(compared).toBeGreaterThan(30);
  });

  it('기본 기하는 원본과 갈린다 — 대칭으로 바꾼 자리다', () => {
    const initCase = cases.find((c) => c.fn === 'getShapeInit' && c.fixture === 'noAnchor')!;
    const expected = initCase.expected as { left: number; right: number };
    expect(toExternal(expected.left)).toBe(0);
    expect(toExternal(expected.right)).toBe(2);
    expect(SHAPE_INIT_FALLBACK).toEqual({ blue: -2, red: 2 });
    expectDivergence('SH-2');
  });

  it('즉시 점프 판정이 원본과 일치한다', () => {
    let compared = 0;
    for (const c of cases.filter((x) => x.fn === 'isStepTick')) {
      const geometry = buildFieldGeometry(FIXTURES[c.fixture!]!);
      expect(isStepTick(geometry, c.args[0] as number), `${c.fixture} ${c.args[0]}`).toBe(
        c.expected,
      );
      compared += 1;
    }
    expect(compared).toBeGreaterThan(15);
  });

  it('즉시 점프 tick 목록이 원본과 일치한다', () => {
    for (const c of cases.filter((x) => x.fn === 'getStepTicks')) {
      const geometry = buildFieldGeometry(FIXTURES[c.fixture!]!);
      const [from, to] = c.args as [number, number];
      expect(stepTicks(geometry, from, to), `${c.fixture}`).toEqual(c.expected);
    }
  });

  it('Arc 교번이 원본과 일치한다', () => {
    let compared = 0;
    for (const c of cases.filter((x) => x.fn === 'resolveArcEasing')) {
      const [isBlue, tick] = c.args as [boolean, number];
      const events = FIXTURES[c.fixture!]!.shapeEvents;
      expect(resolveArcEasing(events, isBlue, tick), `tick=${tick}`).toBe(c.expected);
      compared += 1;
    }
    expect(compared).toBeGreaterThan(5);
  });

  it('좌표 단위 변환이 성립한다 — SH-1의 실체', () => {
    for (const c of cases.filter((x) => x.fn === 'sp2f')) {
      const internal = c.args[0] as number;
      // 원본 `sp2f`는 내부단위를 0~1 비율로 옮긴다. 재설계는 외부단위에서
      // 출발하므로 변환식이 성립하는지를 본다.
      const fraction = (toExternal(internal) + 8) / 16;
      expect(realEquals(fraction, c.expected as number), `sp2f(${internal})`).toBe(true);
    }
    expectDivergence('SH-1');
  });
});
