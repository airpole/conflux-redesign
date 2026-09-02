/**
 * command/history 엔진 — `editor/editor-commands.md` §1~§5의 계약.
 *
 * `Command = { name, apply(), undo(), invalidates[] }`(§1)을 그대로
 * 구현한다. `apply()`/`undo()`는 순수 함수가 아니라 부수효과다 — 실제 chart
 * 배열을 어떻게 바꿀지는 이 파일이 모른다(§6의 구체 command 목록,
 * AddNotes/MoveNotes 등은 그 배열을 실제로 편집하는 M5-3~M5-5·M5-7의
 * 몫이다). 이 파일은 **scope 분할 stack + dispatch/undo/redo + listener**
 * 라는 chart-agnostic 엔진만 담는다 — `invalidates`가 어떤 chart 필드
 * 이름인지는 알아도, 그 필드를 실제로 어떻게 바꾸는지는 모른다.
 *
 * **scope 분할**(§2): `notes`/`textEvents` → `n`, `shapeEvents`/`laneEvents`
 * → `s`, `tempos`/`timeSignatures` → `m`. scope당 깊이 60(넘으면 가장
 * 오래된 항목을 버린다). 한 command의 `invalidates`가 서로 다른 scope에
 * 걸치면(예: notes와 tempos를 동시에 invalidate) §2 표가 그런 조합을
 * 예정하지 않으므로 에러로 막는다 — command 작성 실수를 조용히 넘기지
 * 않는다.
 *
 * **"cache invalidate" 단계는 이 코드베이스에 실제 캐시가 없어 자연히
 * 해소된다** — `core-timing.ts`(`buildTimeline`)·`core-shape.ts`
 * (`buildFieldGeometry`)는 이미 "캐시도 무효화도 없다, chart를 받아 매번
 * 다시 계산한다"는 설계다(두 파일 헤더). 그래서 §1 알고리즘의 "cache
 * invalidate" 자리는 `onDispatch` listener가 `invalidates`를 실어 나르는
 * 것으로 충분하다 — listener(§3, active scene redraw·dirty 표시·autosave
 * schedule을 구독하는 edit layer 조립부)가 "무엇이 바뀌었는지" 알아야
 * 할 자리이지, 이 엔진이 직접 캐시 객체를 들고 있을 이유가 없다.
 *
 * **drag command**(§4)도 이 엔진에 특별한 API가 없다 — "drag 중 live
 * mutate, drag-end에 old/new snapshot command 1개를 dispatch"는 보통
 * command 하나(apply=새 값 적용, undo=이전 값 복원)로 이미 표현되므로 새
 * 추상화가 필요 없다. drag 중 `dispatch()`를 부르지 않고 host가 직접
 * 값을 바꾸다가, drag가 끝나는 순간 딱 한 번 `dispatch()`하는 건 호출측
 * (M5-3·M5-4의 실제 드래그 인터랙션)의 책임이다.
 *
 * **"undo/redo 직전 해당 scope selection clear"**(§2)는 이 파일이 하지
 * 않는다 — selection은 scene 내부 상태이고(`song-select`의 `cursorTargetState`
 * 와 같은 자리) 이 엔진은 scene을 모른다. `onDispatch` listener로 그
 * scene이 직접 처리한다(M5-3+ 몫).
 *
 * **history baseline**(§5): 다른 chart로 session이 교체되면 모든 scope
 * stack을 비운다. `resetBaseline()`이 그 동작이다 — `app-main.ts`는 매번
 * 새 `WorkspaceSession`을 만들 때 새 `CommandHistory`도 함께 만들어(가장
 * 단순한 구현) 실질적으로 항상 빈 상태로 시작한다. 이 메서드는 그래도
 * 엔진 계약 자체를 단위 테스트하기 위해 남겨 뒀다.
 *
 * **chart field 편집은 command가 아니다**(§7) — `chartId`/`difficulty`/
 * `subtitle`/`level`/`chartBy`/metadata/asset 연결은 이 엔진을 거치지
 * 않고 `WorkspaceSession.updateChart()`를 직접 부른다(M5-1부터 이미 그
 * 경로만 있다). 이 파일은 그 경로를 막지도 관여하지도 않는다 — "history
 * 밖"이라는 건 이 엔진에 아예 닿지 않는다는 뜻이다.
 */

export type Scope = 'n' | 's' | 'm';
export const SCOPES: readonly Scope[] = ['n', 's', 'm'];

/** §2 표의 chart 필드 이름 — `Chart`의 실제 배열 필드명과 1:1이다. */
export type InvalidateField =
  'notes' | 'textEvents' | 'shapeEvents' | 'laneEvents' | 'tempos' | 'timeSignatures';

const FIELD_SCOPE: Record<InvalidateField, Scope> = {
  notes: 'n',
  textEvents: 'n',
  shapeEvents: 's',
  laneEvents: 's',
  tempos: 'm',
  timeSignatures: 'm',
};

export interface Command {
  readonly name: string;
  readonly invalidates: readonly InvalidateField[];
  apply(): void;
  undo(): void;
}

export type DispatchKind = 'dispatch' | 'undo' | 'redo';

export interface DispatchEvent {
  readonly kind: DispatchKind;
  readonly scope: Scope;
  readonly command: Command;
}

/** scope당 undo stack 최대 깊이(§2). */
export const SCOPE_DEPTH = 60;

export interface CommandHistory {
  /** apply → scope stack push(깊이 60 넘으면 가장 오래된 것부터 버림) →
   *  해당 scope redo clear → listener 발화, 이 순서대로(§1). */
  dispatch(command: Command): void;
  /** 그 scope의 맨 위 command를 undo하고 그 scope의 redo stack으로
   *  옮긴다. 비어 있으면 아무 것도 하지 않는다. */
  undo(scope: Scope): void;
  /** 그 scope의 redo stack 맨 위를 다시 apply하고 undo stack으로
   *  되돌린다. 비어 있으면 아무 것도 하지 않는다. */
  redo(scope: Scope): void;
  canUndo(scope: Scope): boolean;
  canRedo(scope: Scope): boolean;
  /** session 교체 시(§5) 모든 scope stack을 비운다. */
  resetBaseline(): void;
  /** dispatch/undo/redo마다 발화(§3). 구독 해제 함수를 돌려준다. */
  onDispatch(listener: (event: DispatchEvent) => void): () => void;
}

function scopeOf(command: Command): Scope {
  if (command.invalidates.length === 0) {
    throw new Error(`command '${command.name}'의 invalidates가 비어 있다`);
  }
  const scopes = new Set(command.invalidates.map((field) => FIELD_SCOPE[field]));
  if (scopes.size > 1) {
    throw new Error(
      `command '${command.name}'의 invalidates가 서로 다른 scope(${[...scopes].join(', ')})에 걸친다`,
    );
  }
  return [...scopes][0]!;
}

export function createCommandHistory(): CommandHistory {
  const undoStacks: Record<Scope, Command[]> = { n: [], s: [], m: [] };
  const redoStacks: Record<Scope, Command[]> = { n: [], s: [], m: [] };
  const listeners = new Set<(event: DispatchEvent) => void>();

  function notify(event: DispatchEvent): void {
    for (const listener of listeners) listener(event);
  }

  return {
    dispatch(command) {
      const scope = scopeOf(command);
      command.apply();
      const stack = undoStacks[scope];
      stack.push(command);
      if (stack.length > SCOPE_DEPTH) stack.shift();
      redoStacks[scope] = [];
      notify({ kind: 'dispatch', scope, command });
    },

    undo(scope) {
      const command = undoStacks[scope].pop();
      if (command === undefined) return;
      command.undo();
      redoStacks[scope].push(command);
      notify({ kind: 'undo', scope, command });
    },

    redo(scope) {
      const command = redoStacks[scope].pop();
      if (command === undefined) return;
      command.apply();
      undoStacks[scope].push(command);
      notify({ kind: 'redo', scope, command });
    },

    canUndo(scope) {
      return undoStacks[scope].length > 0;
    },
    canRedo(scope) {
      return redoStacks[scope].length > 0;
    },

    resetBaseline() {
      for (const scope of SCOPES) {
        undoStacks[scope] = [];
        redoStacks[scope] = [];
      }
    },

    onDispatch(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
