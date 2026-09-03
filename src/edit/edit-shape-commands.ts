/**
 * shapes 씬(shape/lane 서브모드) command — `editor/editor-commands.md` §6
 * 중 `AddShapeEvents`/`DeleteShapeEvents`/`MutateShapeEvents`·
 * `AddLaneEvents`/`DeleteLaneEvents`/`MutateLaneEvents` 6개. `edit-command.ts`
 * (M5-2) 엔진에 꽂는다. `invalidates`가 `shapeEvents`/`laneEvents`뿐이라
 * 전부 scope `s`다(`edit-command.ts` §2).
 *
 * `MutateShapeEvents`/`MutateLaneEvents`(기존 점 드래그 이동)는 D-2026-100
 * (M5-4 후속)이 구현했다 — **위치(`targetPos`)만 바꾼다, tick은 안 바꾼다**
 * (`editor-editing.md` §2 "기존 이벤트 dot 드래그 = 위치 수정", 원본
 * `shape-input.js`의 `dragDot` 분기도 `targetPos`만 갱신하고 `startTick`/
 * `duration`은 건드리지 않는다 — 재확인은 `scene-editor-shapes.ts` 헤더).
 * anchor(`easing===null`)도 위치는 옮길 수 있다(삭제만 막는다, §2 "init 이동
 * = 드래그" — `deleteShapeEventsCommand`의 anchor 보호와 다른 규칙).
 *
 * `MirrorShapeEvents`(Ctrl+F)·`ApplyShapeOps`는 여전히 범위 밖이다 —
 * `scene-editor-shapes.ts` 헤더 docstring의 "이번 라운드가 단순화한 지점"
 * 참조. symmetry로 한 클릭에 여러 이벤트가 생기는 경우도 `add*Command`
 * 하나에 배열로 다 담아 한 undo 단위로 만든다 — 별도 `ApplyShapeOps`
 * 타입이 필요 없다(notes의 `AddNotesCommand`가 여러 note를 한 번에
 * 받는 것과 같은 패턴, `edit-notes-commands.ts` 참조).
 *
 * **chain normalize** — `editor-commands.md` §6 "shape/lane command는
 * apply·undo 양쪽에서 chain normalize"를 그대로 구현한다. 원본
 * `normalizeShapeChain(isBlue)`(`shape.js`)와 같은 알고리즘이지만, 배열
 * **순서는 바꾸지 않는다** — 원본은 체인별로 정렬해 다시 쌓았지만, 이
 * 재설계는 선택(`Set<number>` 인덱스, `edit-notes-commands.ts`와 같은
 * 패턴)이 배열 인덱스에 의존하므로 각 원소의 위치는 그대로 두고
 * `startTick`/`duration` 값만 옳게 고쳐 쓴다 — 평가 결과는 원본과 같다.
 */
import type { Chart, Easing, LaneEvent, ShapeEvent } from '../core/core-chart.js';
import type { Command } from './edit-command.js';

export interface ShapeSessionLike {
  readonly chart: Chart;
  updateChart(chart: Chart): void;
}

interface ChainEvent {
  readonly startTick: number;
  readonly duration: number;
  readonly easing: Easing;
}

/**
 * 한 체인(`belongs`가 true인 원소들)의 `startTick`/`duration`을 dest tick
 * 기준으로 다시 세운다 — `shape.js`의 `normalizeShapeChain` 그대로
 * (anchor는 건드리지 않고, 보간 이벤트만 dest 오름차순으로 훑으며 즉시
 * 점프는 `startTick=dest`, 나머지는 `startTick=prevEnd`로 고쳐 쓴다).
 * 배열 순서·길이는 바뀌지 않는다 — 값만 원소 자리에서 갈아치운다.
 */
function normalizeChain<T extends ChainEvent>(
  events: readonly T[],
  belongs: (event: T) => boolean,
): T[] {
  let prevEnd = 0;
  for (const event of events) {
    if (belongs(event) && event.easing === null) {
      prevEnd = Math.max(prevEnd, event.startTick + (event.duration || 0));
    }
  }

  const transitions = events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => belongs(event) && event.easing !== null)
    .map(({ event, index }) => ({
      index,
      dest: event.startTick + event.duration,
      isStep: event.duration === 0,
    }))
    .sort((a, b) => a.dest - b.dest);

  const out = events.slice();
  for (const { index, dest, isStep } of transitions) {
    if (isStep) {
      out[index] = { ...out[index]!, startTick: dest, duration: 0 };
      prevEnd = Math.max(prevEnd, dest);
    } else {
      out[index] = { ...out[index]!, startTick: prevEnd, duration: Math.max(0, dest - prevEnd) };
      prevEnd = dest;
    }
  }
  return out;
}

/** Blue·Red 두 체인을 각각 normalize한다. */
export function normalizeShapeEvents(events: readonly ShapeEvent[]): ShapeEvent[] {
  let out = normalizeChain(events, (e) => e.isBlue);
  out = normalizeChain(out, (e) => !e.isBlue);
  return out;
}

/** 구분선 1·2·3 세 체인을 각각 normalize한다. */
export function normalizeLaneEvents(events: readonly LaneEvent[]): LaneEvent[] {
  let out = normalizeChain(events, (e) => e.lineNum === 1);
  out = normalizeChain(out, (e) => e.lineNum === 2);
  out = normalizeChain(out, (e) => e.lineNum === 3);
  return out;
}

function shapeCommand(
  name: string,
  session: ShapeSessionLike,
  before: readonly ShapeEvent[],
  after: readonly ShapeEvent[],
): Command {
  return {
    name,
    invalidates: ['shapeEvents'],
    apply: () => session.updateChart({ ...session.chart, shapeEvents: after }),
    undo: () => session.updateChart({ ...session.chart, shapeEvents: before }),
  };
}

function laneCommand(
  name: string,
  session: ShapeSessionLike,
  before: readonly LaneEvent[],
  after: readonly LaneEvent[],
): Command {
  return {
    name,
    invalidates: ['laneEvents'],
    apply: () => session.updateChart({ ...session.chart, laneEvents: after }),
    undo: () => session.updateChart({ ...session.chart, laneEvents: before }),
  };
}

/** 새 shape 이벤트 여러 개를 추가한다(§6 AddShapeEvents) — symmetry로 생긴
 *  쌍도 배열에 함께 담아 한 undo 단위가 된다. */
export function addShapeEventsCommand(
  session: ShapeSessionLike,
  eventsToAdd: readonly ShapeEvent[],
): Command {
  const before = session.chart.shapeEvents;
  const after = normalizeShapeEvents([...before, ...eventsToAdd]);
  return shapeCommand('AddShapeEvents', session, before, after);
}

/** 순번(index) 집합을 삭제한다(§6 DeleteShapeEvents). anchor(`easing===null`)
 *  삭제 방지는 호출측(`scene-editor-shapes.ts`)의 몫이다 — 원본도 del
 *  tool이 init 점을 조용히 무시할 뿐, 데이터 계층엔 별도 방어가 없다. */
export function deleteShapeEventsCommand(
  session: ShapeSessionLike,
  indices: readonly number[],
): Command {
  const before = session.chart.shapeEvents;
  const removeSet = new Set(indices);
  const after = normalizeShapeEvents(before.filter((_, i) => !removeSet.has(i)));
  return shapeCommand('DeleteShapeEvents', session, before, after);
}

/** 기존 shape 이벤트 하나의 위치(`targetPos`)만 바꾼다(§6 MutateShapeEvents,
 *  드래그-end snapshot). tick은 그대로다 — normalize는 여전히 거치지만
 *  dest(=startTick+duration)가 안 바뀌었으니 값에 변화가 없다(호출측
 *  일관성용, 원본도 apply/undo 양쪽에서 normalize한다는 §6 규칙 그대로). */
export function mutateShapeEventCommand(
  session: ShapeSessionLike,
  index: number,
  targetPos: number,
): Command {
  const before = session.chart.shapeEvents;
  const after = normalizeShapeEvents(
    before.map((event, i) => (i === index ? { ...event, targetPos } : event)),
  );
  return shapeCommand('MutateShapeEvents', session, before, after);
}

/** 새 lane 이벤트 여러 개를 추가한다(§6 AddLaneEvents) — 그룹 배치·symmetry
 *  쌍도 한 undo 단위로 묶인다. */
export function addLaneEventsCommand(
  session: ShapeSessionLike,
  eventsToAdd: readonly LaneEvent[],
): Command {
  const before = session.chart.laneEvents;
  const after = normalizeLaneEvents([...before, ...eventsToAdd]);
  return laneCommand('AddLaneEvents', session, before, after);
}

/** 순번(index) 집합을 삭제한다(§6 DeleteLaneEvents). */
export function deleteLaneEventsCommand(
  session: ShapeSessionLike,
  indices: readonly number[],
): Command {
  const before = session.chart.laneEvents;
  const removeSet = new Set(indices);
  const after = normalizeLaneEvents(before.filter((_, i) => !removeSet.has(i)));
  return laneCommand('DeleteLaneEvents', session, before, after);
}

/** 기존 lane 이벤트 하나의 위치(`targetPos`)만 바꾼다(§6 MutateLaneEvents) —
 *  `mutateShapeEventCommand`와 같은 패턴, tick은 그대로다. */
export function mutateLaneEventCommand(
  session: ShapeSessionLike,
  index: number,
  targetPos: number,
): Command {
  const before = session.chart.laneEvents;
  const after = normalizeLaneEvents(
    before.map((event, i) => (i === index ? { ...event, targetPos } : event)),
  );
  return laneCommand('MutateLaneEvents', session, before, after);
}
