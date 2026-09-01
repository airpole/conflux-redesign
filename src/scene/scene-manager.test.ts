import { describe, expect, it } from 'vitest';
import { createSceneManager, type Scene } from './scene-manager.js';

function fakeScene(id: string): Scene & { calls: string[] } {
  const calls: string[] = [];
  return {
    id,
    calls,
    mount(): void {
      calls.push('mount');
    },
    onEnter(): void {
      calls.push('onEnter');
    },
    onExit(): void {
      calls.push('onExit');
    },
  };
}

describe('createSceneManager', () => {
  it('첫 진입에서 mount 후 onEnter만 부른다', () => {
    const a = fakeScene('a');
    const manager = createSceneManager([a]);
    manager.goScene('a');
    expect(a.calls).toEqual(['mount', 'onEnter']);
    expect(manager.currentSceneId).toBe('a');
  });

  it('두 번째 진입부터는 mount를 다시 부르지 않는다(lazy mount)', () => {
    const a = fakeScene('a');
    const b = fakeScene('b');
    const manager = createSceneManager([a, b]);
    manager.goScene('a');
    manager.goScene('b');
    manager.goScene('a');
    expect(a.calls).toEqual(['mount', 'onEnter', 'onExit', 'onEnter']);
  });

  it('같은 scene으로 다시 전환하면 no-op이다(§2)', () => {
    const a = fakeScene('a');
    const manager = createSceneManager([a]);
    manager.goScene('a');
    manager.goScene('a');
    expect(a.calls).toEqual(['mount', 'onEnter']);
  });

  it('전환 시 이전 scene의 onExit → 다음 scene의 onEnter 순서다', () => {
    const a = fakeScene('a');
    const b = fakeScene('b');
    const manager = createSceneManager([a, b]);
    manager.goScene('a');
    manager.goScene('b');
    expect(a.calls).toEqual(['mount', 'onEnter', 'onExit']);
    expect(b.calls).toEqual(['mount', 'onEnter']);
  });

  it('goBack이 스택을 pop해 이전 scene으로 돌아간다', () => {
    const a = fakeScene('a');
    const b = fakeScene('b');
    const c = fakeScene('c');
    const manager = createSceneManager([a, b, c]);
    manager.goScene('a');
    manager.goScene('b');
    manager.goScene('c');
    manager.goBack();
    expect(manager.currentSceneId).toBe('b');
    expect(c.calls).toEqual(['mount', 'onEnter', 'onExit']);
    expect(b.calls).toEqual(['mount', 'onEnter', 'onExit', 'onEnter']);
  });

  it('스택에 하나만 남으면 goBack이 no-op이다', () => {
    const a = fakeScene('a');
    const manager = createSceneManager([a]);
    manager.goScene('a');
    manager.goBack();
    expect(manager.currentSceneId).toBe('a');
    expect(a.calls).toEqual(['mount', 'onEnter']);
  });

  it('goScene(id, "replace")가 스택 맨 위를 대체한다(통과점 제거)', () => {
    const a = fakeScene('a');
    const b = fakeScene('b');
    const c = fakeScene('c');
    const manager = createSceneManager([a, b, c]);
    manager.goScene('a');
    manager.goScene('b');
    manager.goScene('c', 'replace');
    expect(manager.currentSceneId).toBe('c');
    manager.goBack();
    // b가 통과점으로 지워졌으므로 back은 a로 간다.
    expect(manager.currentSceneId).toBe('a');
  });

  it('resetSceneStack이 현재 scene은 유지하고 그 아래 history만 지운다', () => {
    const a = fakeScene('a');
    const b = fakeScene('b');
    const manager = createSceneManager([a, b]);
    manager.goScene('a');
    manager.goScene('b');
    manager.resetSceneStack();
    expect(manager.currentSceneId).toBe('b');
    // history가 비었으니 더 돌아갈 곳이 없다.
    manager.goBack();
    expect(manager.currentSceneId).toBe('b');
    // resetSceneStack 자체는 현재 scene의 onEnter/onExit를 다시 부르지 않는다.
    expect(b.calls).toEqual(['mount', 'onEnter']);
  });

  it('등록되지 않은 scene id로 전환하면 던진다', () => {
    const manager = createSceneManager([fakeScene('a')]);
    expect(() => manager.goScene('missing')).toThrow(/알 수 없는 scene id/);
  });

  it('꺼진 축의 scene은 목록에 없으므로 mount될 방법이 없다', () => {
    // FEATURES 필터링은 호출측(app) 몫이다 — 여기서는 그 결과(제외된
    // 목록)를 받았을 때 존재하지 않는 scene으로 갈 수 없음만 확인한다.
    const publicScenes = [fakeScene('title')]; // editor scene은 애초에 없음
    const manager = createSceneManager(publicScenes);
    expect(() => manager.goScene('editor-start')).toThrow();
  });

  it('현재 scene이 없을 때 currentSceneId는 null이다', () => {
    const manager = createSceneManager([fakeScene('a')]);
    expect(manager.currentSceneId).toBeNull();
  });
});
