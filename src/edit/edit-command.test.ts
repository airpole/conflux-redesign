import { describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import {
  createStorageEnv,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
} from '../env/env-storage.js';
import { createWorkspaceSession, type AutosaveTimerHost } from './edit-workspace.js';
import {
  createCommandHistory,
  SCOPE_DEPTH,
  type Command,
  type DispatchEvent,
} from './edit-command.js';

function fakeBackend(): StorageBackend {
  const data = new Map<StoreName, Map<string, unknown>>(STORE_NAMES.map((s) => [s, new Map()]));
  return {
    async get(store, key) {
      return data.get(store)!.get(key);
    },
    async set(store, key, value) {
      data.get(store)!.set(key, value);
    },
    async delete(store, key) {
      data.get(store)!.delete(key);
    },
    async keys(store) {
      return [...data.get(store)!.keys()];
    },
  };
}

function inertTimerHost(): AutosaveTimerHost {
  return { setTimeout: () => 0, clearTimeout: () => {} };
}

function fakeCommand(overrides: Partial<Command> = {}): Command & {
  applyCalls: number;
  undoCalls: number;
} {
  const state = { applyCalls: 0, undoCalls: 0 };
  return {
    name: 'Test',
    invalidates: ['notes'],
    apply: vi.fn(() => {
      state.applyCalls++;
    }),
    undo: vi.fn(() => {
      state.undoCalls++;
    }),
    ...overrides,
    get applyCalls() {
      return state.applyCalls;
    },
    get undoCalls() {
      return state.undoCalls;
    },
  } as Command & { applyCalls: number; undoCalls: number };
}

describe('dispatch', () => {
  it('apply를 부르고 undo 가능 상태로 만든다', () => {
    const history = createCommandHistory();
    const command = fakeCommand();
    history.dispatch(command);
    expect(command.apply).toHaveBeenCalledTimes(1);
    expect(history.canUndo('n')).toBe(true);
    expect(history.canUndo('s')).toBe(false);
  });

  it('scope별로 독립된 stack이다', () => {
    const history = createCommandHistory();
    history.dispatch(fakeCommand({ invalidates: ['notes'] }));
    history.dispatch(fakeCommand({ invalidates: ['shapeEvents'] }));
    history.dispatch(fakeCommand({ invalidates: ['tempos'] }));
    expect(history.canUndo('n')).toBe(true);
    expect(history.canUndo('s')).toBe(true);
    expect(history.canUndo('m')).toBe(true);
  });

  it('textEvents도 scope n, laneEvents도 scope s, timeSignatures도 scope m이다', () => {
    const history = createCommandHistory();
    history.dispatch(fakeCommand({ invalidates: ['textEvents'] }));
    history.dispatch(fakeCommand({ invalidates: ['laneEvents'] }));
    history.dispatch(fakeCommand({ invalidates: ['timeSignatures'] }));
    expect(history.canUndo('n')).toBe(true);
    expect(history.canUndo('s')).toBe(true);
    expect(history.canUndo('m')).toBe(true);
  });

  it('새 dispatch는 그 scope의 redo stack을 지운다', () => {
    const history = createCommandHistory();
    const first = fakeCommand();
    history.dispatch(first);
    history.undo('n');
    expect(history.canRedo('n')).toBe(true);

    history.dispatch(fakeCommand());
    expect(history.canRedo('n')).toBe(false);
  });

  it('invalidates가 서로 다른 scope에 걸치면 던진다', () => {
    const history = createCommandHistory();
    const command = fakeCommand({ invalidates: ['notes', 'tempos'] });
    expect(() => history.dispatch(command)).toThrow();
  });

  it('invalidates가 비어 있으면 던진다', () => {
    const history = createCommandHistory();
    const command = fakeCommand({ invalidates: [] });
    expect(() => history.dispatch(command)).toThrow();
  });

  it('scope 깊이 60을 넘으면 가장 오래된 항목부터 버린다', () => {
    const history = createCommandHistory();
    const commands = Array.from({ length: SCOPE_DEPTH + 5 }, () => fakeCommand());
    for (const c of commands) history.dispatch(c);

    // 가장 오래된 5개는 버려졌으므로, 정확히 SCOPE_DEPTH번만 undo할 수 있다.
    let undoCount = 0;
    while (history.canUndo('n')) {
      history.undo('n');
      undoCount++;
    }
    expect(undoCount).toBe(SCOPE_DEPTH);
    // 버려진 5개 중 첫 번째(commands[0])는 undo 호출 대상이 아니었다.
    expect(commands[0]!.undo).not.toHaveBeenCalled();
    expect(commands[5]!.undo).toHaveBeenCalled();
  });
});

describe('undo/redo', () => {
  it('undo는 undo()를 부르고 redo stack으로 옮긴다', () => {
    const history = createCommandHistory();
    const command = fakeCommand();
    history.dispatch(command);
    history.undo('n');
    expect(command.undo).toHaveBeenCalledTimes(1);
    expect(history.canUndo('n')).toBe(false);
    expect(history.canRedo('n')).toBe(true);
  });

  it('redo는 apply()를 다시 부르고 undo stack으로 되돌린다', () => {
    const history = createCommandHistory();
    const command = fakeCommand();
    history.dispatch(command);
    history.undo('n');
    history.redo('n');
    expect(command.apply).toHaveBeenCalledTimes(2);
    expect(history.canUndo('n')).toBe(true);
    expect(history.canRedo('n')).toBe(false);
  });

  it('빈 scope에서 undo/redo는 아무 일도 하지 않는다', () => {
    const history = createCommandHistory();
    expect(() => history.undo('n')).not.toThrow();
    expect(() => history.redo('n')).not.toThrow();
  });

  it('여러 dispatch를 정확한 순서로 undo한다(LIFO)', () => {
    const history = createCommandHistory();
    const order: string[] = [];
    const first: Command = {
      name: 'first',
      invalidates: ['notes'],
      apply: () => {},
      undo: () => order.push('first'),
    };
    const second: Command = {
      name: 'second',
      invalidates: ['notes'],
      apply: () => {},
      undo: () => order.push('second'),
    };
    history.dispatch(first);
    history.dispatch(second);

    history.undo('n');
    history.undo('n');
    expect(order).toEqual(['second', 'first']);
  });
});

describe('resetBaseline', () => {
  it('모든 scope stack을 비운다(§5)', () => {
    const history = createCommandHistory();
    history.dispatch(fakeCommand({ invalidates: ['notes'] }));
    history.dispatch(fakeCommand({ invalidates: ['shapeEvents'] }));
    history.dispatch(fakeCommand({ invalidates: ['tempos'] }));
    history.undo('n');

    history.resetBaseline();

    expect(history.canUndo('n')).toBe(false);
    expect(history.canUndo('s')).toBe(false);
    expect(history.canUndo('m')).toBe(false);
    expect(history.canRedo('n')).toBe(false);
  });
});

describe('onDispatch', () => {
  it('dispatch/undo/redo마다 발화한다(§3)', () => {
    const history = createCommandHistory();
    const events: DispatchEvent['kind'][] = [];
    history.onDispatch((e) => events.push(e.kind));

    const command = fakeCommand();
    history.dispatch(command);
    history.undo('n');
    history.redo('n');

    expect(events).toEqual(['dispatch', 'undo', 'redo']);
  });

  it('unsubscribe 함수가 이후 이벤트를 막는다', () => {
    const history = createCommandHistory();
    const listener = vi.fn();
    const unsubscribe = history.onDispatch(listener);
    history.dispatch(fakeCommand());
    unsubscribe();
    history.dispatch(fakeCommand());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('event에 scope와 command를 실어 보낸다', () => {
    const history = createCommandHistory();
    let captured: DispatchEvent | undefined;
    history.onDispatch((e) => {
      captured = e;
    });
    const command = fakeCommand({ name: 'AddNotes', invalidates: ['notes'] });
    history.dispatch(command);
    expect(captured?.scope).toBe('n');
    expect(captured?.command).toBe(command);
  });
});

describe('M5-2 Exit — 모든 편집이 command로 들어가고, chart field 편집은 history 밖이다', () => {
  it('command로 들어간 편집(예: notes 추가)은 undo로 원본과 같은 단위로 되감긴다', () => {
    const history = createCommandHistory();
    const chart = makeChart();
    let notes = chart.notes;
    const addNote: Command = {
      name: 'AddNotes',
      invalidates: ['notes'],
      apply: () => {
        notes = [...notes, { startTick: 0, duration: 0, lane: 1, isWide: false }];
      },
      undo: () => {
        notes = notes.slice(0, -1);
      },
    };

    history.dispatch(addNote);
    expect(notes).toHaveLength(1);
    history.undo('n');
    expect(notes).toHaveLength(0); // 원본과 정확히 같은 단위(note 하나)로 되감긴다.
    history.redo('n');
    expect(notes).toHaveLength(1);
  });

  it('chart field 편집(WorkspaceSession.updateChart)은 command history를 전혀 거치지 않는다', async () => {
    const history = createCommandHistory();
    const session = createWorkspaceSession({
      storage: createStorageEnv(fakeBackend()),
      chart: makeChart({ level: 1 }),
      musicBlob: null,
      jacketBlob: null,
      baseVersion: null,
      timerHost: inertTimerHost(),
    });

    // chartId·difficulty·subtitle·level·chartBy·metadata·asset 연결(§7)은
    // session.updateChart를 직접 부른다 — command/dispatch가 아니다.
    session.updateChart({ ...session.chart, level: 7 });

    expect(session.chart.level).toBe(7);
    expect(session.dirty).toBe(true);
    // history는 이 편집을 전혀 몰라야 한다 — 세 scope 전부 여전히 비어 있다.
    expect(history.canUndo('n')).toBe(false);
    expect(history.canUndo('s')).toBe(false);
    expect(history.canUndo('m')).toBe(false);
  });
});
