/**
 * notes 탭 command 목록 — `editor/editor-commands.md` §6 중 note 관련 6개
 * (AddNotes/DeleteNotes/MoveNotes/MirrorNotes/SetNoteDuration/ReplaceNotes),
 * 그리고 `pasteNotesAndTextEventsCommand`(D-2026-123)·
 * `deleteNotesAndTextEventsCommand`(D-2026-124) — 각각 note·textEvent
 * 붙여넣기·삭제를 `notes`·`textEvents` 둘 다 건드리는 한 undo로 합친다,
 * `mirrorEventsCommand`가 shapeEvents·laneEvents를 합친 것과 같은 이유).
 * `edit-command.ts`(M5-2)의 chart-agnostic 엔진에 꽂는 첫 실제 command다.
 *
 * 전부 **snapshot 기반**이다 — apply()는 `notes` 배열을 "이후" 스냅샷으로,
 * undo()는 "이전" 스냅샷으로 그대로 교체한다(`session.updateChart`). 배열
 * 끝에서 개수만큼 잘라내는 식의 위치 추정을 하지 않는다 — 항상 정확히
 * 원래 배열로 되돌아간다는 게 이 방식의 장점이다(§1 "undo/redo가 원본과
 * 같은 단위로 되감긴다"가 스냅샷 비교만으로 자동 성립).
 *
 * `invalidates: ['notes']`뿐이라 전부 scope `n`이다(`edit-command.ts` §2) —
 * `pasteNotesAndTextEventsCommand`/`deleteNotesAndTextEventsCommand`만
 * 예외로 `['notes', 'textEvents']`다.
 *
 * mirror는 `core-judge.ts`의 `MIRROR_LANE_MAP`(1↔4, 2↔3)을 그대로 쓴다 —
 * 플레이 mirror와 같은 매핑([[judge]] §3, editor-editing.md §4). wide
 * note는 제외한다(핸드 개념이 없다, §4 "노트: lane 1↔4, 2↔3(wide 제외)").
 */
import type { Chart, Note, TextEvent } from '../core/core-chart.js';
import { MIRROR_LANE_MAP } from '../core/core-judge.js';
import type { Command } from './edit-command.js';

export interface NotesSessionLike {
  readonly chart: Chart;
  updateChart(chart: Chart): void;
}

function notesCommand(
  name: string,
  session: NotesSessionLike,
  before: readonly Note[],
  after: readonly Note[],
): Command {
  return {
    name,
    invalidates: ['notes'],
    apply: () => session.updateChart({ ...session.chart, notes: after }),
    undo: () => session.updateChart({ ...session.chart, notes: before }),
  };
}

/** 새 note 여러 개를 배열 끝에 추가한다(§6 AddNotes, 배열 순서 = 배치 순서). */
export function addNotesCommand(session: NotesSessionLike, notesToAdd: readonly Note[]): Command {
  const before = session.chart.notes;
  return notesCommand('AddNotes', session, before, [...before, ...notesToAdd]);
}

/** 순번(index) 집합을 삭제한다(§6 DeleteNotes — conflict 해소 삭제도 이걸 쓴다,
 *  [[editor-editing]] §1 "배치 역순으로 capacity 초과분만"은 호출측이 그
 *  index 집합을 골라 넘기는 문제다). */
export function deleteNotesCommand(session: NotesSessionLike, indices: readonly number[]): Command {
  const before = session.chart.notes;
  const removeSet = new Set(indices);
  const after = before.filter((_, i) => !removeSet.has(i));
  return notesCommand('DeleteNotes', session, before, after);
}

/** 선택된 note들을 tick(세로)·lane(가로)으로 함께 옮긴다(§6 MoveNotes, drag-end
 *  snapshot 1개 — `edit-command.ts` 헤더의 drag command 패턴). wide는 lane
 *  이동에서 제외한다([[editor-editing]] §1 "wide는 가로 이동 제외") — tick
 *  이동은 wide에도 적용된다. `startTick`은 0 미만으로 내려가지 않는다. */
export function moveNotesCommand(
  session: NotesSessionLike,
  indices: readonly number[],
  deltaTick: number,
  deltaLane: -1 | 0 | 1,
): Command {
  const before = session.chart.notes;
  const moveSet = new Set(indices);
  const after = before.map((note, i) => {
    if (!moveSet.has(i)) return note;
    const startTick = Math.max(0, note.startTick + deltaTick);
    if (deltaLane === 0 || note.isWide) return { ...note, startTick };
    const nextLane = Math.min(4, Math.max(1, note.lane + deltaLane)) as Note['lane'];
    return { ...note, startTick, lane: nextLane };
  });
  return notesCommand('MoveNotes', session, before, after);
}

/** 선택된 note들을 제자리 mirror한다(§6 MirrorNotes, editor-editing.md §4). */
export function mirrorNotesCommand(session: NotesSessionLike, indices: readonly number[]): Command {
  const before = session.chart.notes;
  const mirrorSet = new Set(indices);
  const after = before.map((note, i) => {
    if (!mirrorSet.has(i) || note.isWide) return note;
    return { ...note, lane: MIRROR_LANE_MAP[note.lane] };
  });
  return notesCommand('MirrorNotes', session, before, after);
}

/** 기존 note 하나의 duration을 바꾼다(§6 SetNoteDuration — hold 길이 조정). */
export function setNoteDurationCommand(
  session: NotesSessionLike,
  index: number,
  duration: number,
): Command {
  const before = session.chart.notes;
  const after = before.map((note, i) => (i === index ? { ...note, duration } : note));
  return notesCommand('SetNoteDuration', session, before, after);
}

/** 일부를 지우고 다른 일부를 더하는 걸 한 undo 단위로 묶는다(§6 ReplaceNotes —
 *  quick-hold가 기존 tap을 hold로 치환하는 경우, [[editor-editing]] §1). */
export function replaceNotesCommand(
  session: NotesSessionLike,
  removeIndices: readonly number[],
  notesToAdd: readonly Note[],
): Command {
  const before = session.chart.notes;
  const removeSet = new Set(removeIndices);
  const after = [...before.filter((_, i) => !removeSet.has(i)), ...notesToAdd];
  return notesCommand('ReplaceNotes', session, before, after);
}

/** note·textEvent를 함께 붙여넣는다(Ctrl+V, D-2026-123) — `notes`·`textEvents`
 *  둘 다 바꾸는 유일한 command다. `NotesSessionLike`와 `TextEventsSessionLike`
 *  (`edit-text-commands.ts`)는 둘 다 `{chart, updateChart}` 그대로라 구조가
 *  같다 — 여기서는 `NotesSessionLike`로 받고 `chart.textEvents`도 직접
 *  건드린다(`mirrorEventsCommand`가 `shapeEvents`·`laneEvents` 둘을 한
 *  command로 묶은 것과 같은 패턴, `edit-shape-commands.ts` 참조).
 *
 *  `editor-editing.md` §1 "선택에 textEvents가 포함돼 있으면 함께 복사·
 *  붙여넣기"와 `editor-commands.md` §2("notes, textEvents"가 같은 undo
 *  scope `n`)가 이미 "함께"를 말하지만, 지금까지는 note·text가 각각 별도
 *  dispatch였다 — 같은 스코프 스택에 두 항목을 쌓아 Ctrl+Z 한 번으로
 *  텍스트만 되돌리고 note는 남는 문제가 있었다(D-2026-123). 이 함수가
 *  한 undo로 합쳐 닫는다. 어느 한쪽이 비어 있어도(note만/text만 붙여넣기)
 *  안전하게 부른다 — 빈 배열은 그 배열을 그대로 둔다. */
export function pasteNotesAndTextEventsCommand(
  session: NotesSessionLike,
  notesToAdd: readonly Note[],
  textEventsToAdd: readonly TextEvent[],
): Command {
  const beforeNotes = session.chart.notes;
  const beforeTexts = session.chart.textEvents;
  const afterNotes = [...beforeNotes, ...notesToAdd];
  const afterTexts = [...beforeTexts, ...textEventsToAdd];
  return {
    name: 'PasteNotesAndTextEvents',
    invalidates: ['notes', 'textEvents'],
    apply: () =>
      session.updateChart({ ...session.chart, notes: afterNotes, textEvents: afterTexts }),
    undo: () =>
      session.updateChart({ ...session.chart, notes: beforeNotes, textEvents: beforeTexts }),
  };
}

/** note·textEvent 선택을 함께 지운다(Delete/D, D-2026-124) —
 *  `pasteNotesAndTextEventsCommand`와 똑같은 이유·패턴이다. 지금까지
 *  `deleteSelection`이 note·text를 각각 별도 dispatch로 내던 것을
 *  Ctrl+V와 같은 문제(같은 undo scope `n`에 두 항목이 쌓여 Ctrl+Z 한
 *  번에 하나만 되돌아감)로 보고 닫는다. 어느 한쪽이 비어 있어도(note만/
 *  text만 선택) 안전하다. */
export function deleteNotesAndTextEventsCommand(
  session: NotesSessionLike,
  noteIndices: readonly number[],
  textEventIndices: readonly number[],
): Command {
  const beforeNotes = session.chart.notes;
  const beforeTexts = session.chart.textEvents;
  const noteRemoveSet = new Set(noteIndices);
  const textRemoveSet = new Set(textEventIndices);
  const afterNotes = beforeNotes.filter((_, i) => !noteRemoveSet.has(i));
  const afterTexts = beforeTexts.filter((_, i) => !textRemoveSet.has(i));
  return {
    name: 'DeleteNotesAndTextEvents',
    invalidates: ['notes', 'textEvents'],
    apply: () =>
      session.updateChart({ ...session.chart, notes: afterNotes, textEvents: afterTexts }),
    undo: () =>
      session.updateChart({ ...session.chart, notes: beforeNotes, textEvents: beforeTexts }),
  };
}
