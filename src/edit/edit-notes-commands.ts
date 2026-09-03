/**
 * notes 탭 command 목록 — `editor/editor-commands.md` §6 중 note 관련 6개
 * (AddNotes/DeleteNotes/MoveNotes/MirrorNotes/SetNoteDuration/ReplaceNotes).
 * `edit-command.ts`(M5-2)의 chart-agnostic 엔진에 꽂는 첫 실제 command다.
 *
 * 전부 **snapshot 기반**이다 — apply()는 `notes` 배열을 "이후" 스냅샷으로,
 * undo()는 "이전" 스냅샷으로 그대로 교체한다(`session.updateChart`). 배열
 * 끝에서 개수만큼 잘라내는 식의 위치 추정을 하지 않는다 — 항상 정확히
 * 원래 배열로 되돌아간다는 게 이 방식의 장점이다(§1 "undo/redo가 원본과
 * 같은 단위로 되감긴다"가 스냅샷 비교만으로 자동 성립).
 *
 * `invalidates: ['notes']`뿐이라 전부 scope `n`이다(`edit-command.ts` §2).
 *
 * mirror는 `core-judge.ts`의 `MIRROR_LANE_MAP`(1↔4, 2↔3)을 그대로 쓴다 —
 * 플레이 mirror와 같은 매핑([[judge]] §3, editor-editing.md §4). wide
 * note는 제외한다(핸드 개념이 없다, §4 "노트: lane 1↔4, 2↔3(wide 제외)").
 */
import type { Chart, Note } from '../core/core-chart.js';
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
