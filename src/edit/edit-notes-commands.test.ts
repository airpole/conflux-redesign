import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart, Note } from '../core/core-chart.js';
import { createCommandHistory } from './edit-command.js';
import {
  addNotesCommand,
  deleteNotesCommand,
  mirrorNotesCommand,
  moveNotesCommand,
  replaceNotesCommand,
  setNoteDurationCommand,
  type NotesSessionLike,
} from './edit-notes-commands.js';

function fakeSession(notes: readonly Note[] = []): NotesSessionLike {
  let chart: Chart = makeChart({ notes });
  return {
    get chart() {
      return chart;
    },
    updateChart(next) {
      chart = next;
    },
  };
}

const TAP: Note = { startTick: 100, duration: 0, lane: 1, isWide: false };
const HOLD: Note = { startTick: 200, duration: 480, lane: 2, isWide: false };
const WIDE: Note = { startTick: 300, duration: 0, lane: 3, isWide: true };

describe('addNotesCommand', () => {
  it('apply는 끝에 추가하고 undo는 정확히 되돌린다', () => {
    const session = fakeSession([TAP]);
    const history = createCommandHistory();
    history.dispatch(addNotesCommand(session, [HOLD]));
    expect(session.chart.notes).toEqual([TAP, HOLD]);
    history.undo('n');
    expect(session.chart.notes).toEqual([TAP]);
    history.redo('n');
    expect(session.chart.notes).toEqual([TAP, HOLD]);
  });
});

describe('deleteNotesCommand', () => {
  it('index 집합을 지우고 undo로 원래 순서까지 복원한다', () => {
    const session = fakeSession([TAP, HOLD, WIDE]);
    const history = createCommandHistory();
    history.dispatch(deleteNotesCommand(session, [1]));
    expect(session.chart.notes).toEqual([TAP, WIDE]);
    history.undo('n');
    expect(session.chart.notes).toEqual([TAP, HOLD, WIDE]);
  });
});

describe('moveNotesCommand', () => {
  it('tick·lane을 함께 옮긴다', () => {
    const session = fakeSession([TAP]);
    const history = createCommandHistory();
    history.dispatch(moveNotesCommand(session, [0], 480, 1));
    expect(session.chart.notes[0]).toEqual({ ...TAP, startTick: 580, lane: 2 });
    history.undo('n');
    expect(session.chart.notes[0]).toEqual(TAP);
  });

  it('startTick은 0 밑으로 안 내려간다', () => {
    const session = fakeSession([TAP]);
    const history = createCommandHistory();
    history.dispatch(moveNotesCommand(session, [0], -1000, 0));
    expect(session.chart.notes[0]!.startTick).toBe(0);
  });

  it('wide note는 lane 이동에서 제외된다', () => {
    const session = fakeSession([WIDE]);
    const history = createCommandHistory();
    history.dispatch(moveNotesCommand(session, [0], 100, 1));
    expect(session.chart.notes[0]!.lane).toBe(3); // 그대로.
    expect(session.chart.notes[0]!.startTick).toBe(400); // tick은 이동.
  });

  it('lane 이동은 1~4 범위로 clamp된다', () => {
    const session = fakeSession([{ ...TAP, lane: 4 }]);
    const history = createCommandHistory();
    history.dispatch(moveNotesCommand(session, [0], 0, 1));
    expect(session.chart.notes[0]!.lane).toBe(4); // 이미 최대, 못 넘어간다.
  });
});

describe('mirrorNotesCommand', () => {
  it('1↔4, 2↔3으로 lane을 뒤집는다', () => {
    const session = fakeSession([
      { ...TAP, lane: 1 },
      { ...HOLD, lane: 2 },
    ]);
    const history = createCommandHistory();
    history.dispatch(mirrorNotesCommand(session, [0, 1]));
    expect(session.chart.notes[0]!.lane).toBe(4);
    expect(session.chart.notes[1]!.lane).toBe(3);
    history.undo('n');
    expect(session.chart.notes[0]!.lane).toBe(1);
    expect(session.chart.notes[1]!.lane).toBe(2);
  });

  it('wide note는 mirror 대상에서 제외된다', () => {
    const session = fakeSession([WIDE]);
    const history = createCommandHistory();
    history.dispatch(mirrorNotesCommand(session, [0]));
    expect(session.chart.notes[0]!.lane).toBe(3); // 그대로.
  });
});

describe('setNoteDurationCommand', () => {
  it('duration을 바꾸고 undo로 되돌린다', () => {
    const session = fakeSession([HOLD]);
    const history = createCommandHistory();
    history.dispatch(setNoteDurationCommand(session, 0, 960));
    expect(session.chart.notes[0]!.duration).toBe(960);
    history.undo('n');
    expect(session.chart.notes[0]!.duration).toBe(480);
  });
});

describe('replaceNotesCommand', () => {
  it('일부를 지우고 다른 걸 더하는 걸 한 undo 단위로 묶는다', () => {
    const session = fakeSession([TAP]);
    const history = createCommandHistory();
    history.dispatch(replaceNotesCommand(session, [0], [HOLD]));
    expect(session.chart.notes).toEqual([HOLD]);
    history.undo('n');
    expect(session.chart.notes).toEqual([TAP]); // 한 번의 undo로 tap이 되돌아온다.
  });
});
