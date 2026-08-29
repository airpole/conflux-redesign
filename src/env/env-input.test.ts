import { describe, expect, it, vi } from 'vitest';
import { bindKeyInput } from './env-input.js';
import type { KeyboardHost, RawKeyboardEvent } from './env-input.js';

function fakeRawEvent(code: string, repeat = false): RawKeyboardEvent {
  return { code, repeat, preventDefault: vi.fn() };
}

function fakeKeyboardHost() {
  const listeners: {
    keydown: ((e: RawKeyboardEvent) => void)[];
    keyup: ((e: RawKeyboardEvent) => void)[];
    focusLost: (() => void)[];
    visibilityHidden: (() => void)[];
  } = { keydown: [], keyup: [], focusLost: [], visibilityHidden: [] };
  let nowMs = 0;

  const host: KeyboardHost & { setNow(ms: number): void; fire: typeof listeners } = {
    now: () => nowMs,
    onKeyDown: (l) => {
      listeners.keydown.push(l);
      return () => {
        listeners.keydown = listeners.keydown.filter((x) => x !== l);
      };
    },
    onKeyUp: (l) => {
      listeners.keyup.push(l);
      return () => {
        listeners.keyup = listeners.keyup.filter((x) => x !== l);
      };
    },
    onFocusLost: (l) => {
      listeners.focusLost.push(l);
      return () => {
        listeners.focusLost = listeners.focusLost.filter((x) => x !== l);
      };
    },
    onVisibilityHidden: (l) => {
      listeners.visibilityHidden.push(l);
      return () => {
        listeners.visibilityHidden = listeners.visibilityHidden.filter((x) => x !== l);
      };
    },
    setNow: (ms) => {
      nowMs = ms;
    },
    fire: listeners,
  };
  return host;
}

describe('env-input 계약', () => {
  it('keydown이 timestamp와 함께 도착한다', () => {
    const host = fakeKeyboardHost();
    const onKeyDown = vi.fn();
    bindKeyInput(
      host,
      { onKeyDown, onKeyUp: vi.fn(), onFocusLost: vi.fn(), onVisibilityHidden: vi.fn() },
      () => false,
    );

    host.setNow(1234);
    host.fire.keydown.forEach((l) => l(fakeRawEvent('KeyD')));

    expect(onKeyDown).toHaveBeenCalledWith({ code: 'KeyD', repeat: false, timestampMs: 1234 });
  });

  it('keyup도 timestamp와 함께 도착한다', () => {
    const host = fakeKeyboardHost();
    const onKeyUp = vi.fn();
    bindKeyInput(
      host,
      { onKeyDown: vi.fn(), onKeyUp, onFocusLost: vi.fn(), onVisibilityHidden: vi.fn() },
      () => false,
    );

    host.setNow(5000);
    host.fire.keyup.forEach((l) => l(fakeRawEvent('KeyD')));

    expect(onKeyUp).toHaveBeenCalledWith({ code: 'KeyD', repeat: false, timestampMs: 5000 });
  });

  it('preventDefault 정책이 true를 돌려주는 code만 막는다', () => {
    const host = fakeKeyboardHost();
    bindKeyInput(
      host,
      { onKeyDown: vi.fn(), onKeyUp: vi.fn(), onFocusLost: vi.fn(), onVisibilityHidden: vi.fn() },
      (code) => code === 'KeyD',
    );

    const blocked = fakeRawEvent('KeyD');
    const allowed = fakeRawEvent('Tab');
    host.fire.keydown.forEach((l) => {
      l(blocked);
      l(allowed);
    });

    expect(blocked.preventDefault).toHaveBeenCalledTimes(1);
    expect(allowed.preventDefault).not.toHaveBeenCalled();
  });

  it('focus를 잃으면 lane 상태를 모른 채 신호만 올린다', () => {
    const host = fakeKeyboardHost();
    const onFocusLost = vi.fn();
    bindKeyInput(
      host,
      { onKeyDown: vi.fn(), onKeyUp: vi.fn(), onFocusLost, onVisibilityHidden: vi.fn() },
      () => false,
    );

    host.fire.focusLost.forEach((l) => l());

    expect(onFocusLost).toHaveBeenCalledTimes(1);
    expect(onFocusLost).toHaveBeenCalledWith();
  });

  it('탭이 숨겨지면 visibility 신호가 온다', () => {
    const host = fakeKeyboardHost();
    const onVisibilityHidden = vi.fn();
    bindKeyInput(
      host,
      { onKeyDown: vi.fn(), onKeyUp: vi.fn(), onFocusLost: vi.fn(), onVisibilityHidden },
      () => false,
    );

    host.fire.visibilityHidden.forEach((l) => l());

    expect(onVisibilityHidden).toHaveBeenCalledTimes(1);
  });

  it('unbind 이후 모든 리스너가 해제된다', () => {
    const host = fakeKeyboardHost();
    const onKeyDown = vi.fn();
    const unbind = bindKeyInput(
      host,
      { onKeyDown, onKeyUp: vi.fn(), onFocusLost: vi.fn(), onVisibilityHidden: vi.fn() },
      () => false,
    );

    unbind();
    host.fire.keydown.forEach((l) => l(fakeRawEvent('KeyD')));

    expect(onKeyDown).not.toHaveBeenCalled();
  });
});
