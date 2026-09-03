import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart, TextEvent } from '../core/core-chart.js';
import { createCommandHistory } from './edit-command.js';
import {
  addTextEventsCommand,
  deleteTextEventsCommand,
  editTextEventCommand,
  type TextEventsSessionLike,
} from './edit-text-commands.js';

function fakeSession(textEvents: readonly TextEvent[] = []): TextEventsSessionLike {
  let chart: Chart = makeChart({ textEvents });
  return {
    get chart() {
      return chart;
    },
    updateChart(next) {
      chart = next;
    },
  };
}

const GREETING: TextEvent = { startTick: 0, duration: 960, content: 'Hello', position: 'middle' };
const LANE_HINT: TextEvent = {
  startTick: 480,
  duration: 480,
  content: 'Watch!',
  position: 'lane2',
};

describe('addTextEventsCommand', () => {
  it('apply는 끝에 추가하고 undo는 정확히 되돌린다', () => {
    const session = fakeSession([GREETING]);
    const history = createCommandHistory();
    history.dispatch(addTextEventsCommand(session, [LANE_HINT]));
    expect(session.chart.textEvents).toEqual([GREETING, LANE_HINT]);
    history.undo('n');
    expect(session.chart.textEvents).toEqual([GREETING]);
    history.redo('n');
    expect(session.chart.textEvents).toEqual([GREETING, LANE_HINT]);
  });
});

describe('deleteTextEventsCommand', () => {
  it('index 집합을 지우고 undo로 원래 순서까지 복원한다', () => {
    const session = fakeSession([GREETING, LANE_HINT]);
    const history = createCommandHistory();
    history.dispatch(deleteTextEventsCommand(session, [0]));
    expect(session.chart.textEvents).toEqual([LANE_HINT]);
    history.undo('n');
    expect(session.chart.textEvents).toEqual([GREETING, LANE_HINT]);
  });
});

describe('editTextEventCommand', () => {
  it('content/tick 범위/position을 한 번에 바꾸고 undo로 되돌린다', () => {
    const session = fakeSession([GREETING]);
    const history = createCommandHistory();
    history.dispatch(
      editTextEventCommand(session, 0, { content: 'Bye', position: 'left', duration: 240 }),
    );
    expect(session.chart.textEvents[0]).toEqual({
      startTick: 0,
      duration: 240,
      content: 'Bye',
      position: 'left',
    });
    history.undo('n');
    expect(session.chart.textEvents[0]).toEqual(GREETING);
  });

  it('scope는 notes와 같은 n이다(editor-commands.md §2)', () => {
    const session = fakeSession([GREETING]);
    const history = createCommandHistory();
    const command = editTextEventCommand(session, 0, { content: 'Bye' });
    expect(command.invalidates).toEqual(['textEvents']);
    // dispatch가 예외 없이 n scope로 들어간다는 것 자체가 scope 매핑 검증이다
    // (edit-command.ts의 FIELD_SCOPE — 다른 scope와 섞이면 dispatch가 던진다).
    expect(() => history.dispatch(command)).not.toThrow();
  });
});
