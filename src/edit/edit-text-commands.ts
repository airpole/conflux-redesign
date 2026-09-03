/**
 * text 편집 command 3개 — `editor/editor-commands.md` §6
 * (AddTextEvents/DeleteTextEvents/EditTextEvent, M5-7).
 *
 * `edit-notes-commands.ts`와 같은 snapshot 패턴이다 — apply/undo가 `textEvents`
 * 배열 전체를 이후/이전 스냅샷으로 교체한다. `invalidates: ['textEvents']`이지만
 * scope는 notes와 같은 `n`이다(`editor-commands.md` §2 "notes, textEvents | n")
 * — 원본이 T 툴을 notes 탭 안에 두고 선택·클립보드를 note와 함께 다루는 것과
 * 같은 이유(`editor-editing.md` §1).
 */
import type { Chart, TextEvent } from '../core/core-chart.js';
import type { Command } from './edit-command.js';

export interface TextEventsSessionLike {
  readonly chart: Chart;
  updateChart(chart: Chart): void;
}

function textEventsCommand(
  name: string,
  session: TextEventsSessionLike,
  before: readonly TextEvent[],
  after: readonly TextEvent[],
): Command {
  return {
    name,
    invalidates: ['textEvents'],
    apply: () => session.updateChart({ ...session.chart, textEvents: after }),
    undo: () => session.updateChart({ ...session.chart, textEvents: before }),
  };
}

/** 새 textEvent 여러 개를 배열 끝에 추가한다(§6 AddTextEvents). */
export function addTextEventsCommand(
  session: TextEventsSessionLike,
  eventsToAdd: readonly TextEvent[],
): Command {
  const before = session.chart.textEvents;
  return textEventsCommand('AddTextEvents', session, before, [...before, ...eventsToAdd]);
}

/** 순번(index) 집합을 삭제한다(§6 DeleteTextEvents). */
export function deleteTextEventsCommand(
  session: TextEventsSessionLike,
  indices: readonly number[],
): Command {
  const before = session.chart.textEvents;
  const removeSet = new Set(indices);
  const after = before.filter((_, i) => !removeSet.has(i));
  return textEventsCommand('DeleteTextEvents', session, before, after);
}

/** 기존 textEvent 하나를 in-place로 고친다(§6 EditTextEvent — 원본 `text-events.js`
 *  `teSave()`의 편집 분기와 같다: content/tick 범위/position을 한 번에 바꾼다). */
export function editTextEventCommand(
  session: TextEventsSessionLike,
  index: number,
  fields: Partial<TextEvent>,
): Command {
  const before = session.chart.textEvents;
  const after = before.map((event, i) => (i === index ? { ...event, ...fields } : event));
  return textEventsCommand('EditTextEvent', session, before, after);
}
