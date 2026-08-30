// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { attachAutoPause } from './game-visibility.js';

function fireVisibilityChange(): void {
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('attachAutoPause (scene.md §9 — 탭 백그라운드 auto-pause)', () => {
  it('document.hidden이면 pause()를 부른다', () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    const session = { pause: vi.fn() };
    const detach = attachAutoPause(session);

    fireVisibilityChange();
    expect(session.pause).toHaveBeenCalledTimes(1);

    detach();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('document.hidden이 false면(탭이 다시 보이면) pause()를 부르지 않는다', () => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    const session = { pause: vi.fn() };
    const detach = attachAutoPause(session);

    fireVisibilityChange();
    expect(session.pause).not.toHaveBeenCalled();

    detach();
  });

  it('blur만으로는 pause()를 부르지 않는다 — visibilitychange만 듣는다', () => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    const session = { pause: vi.fn() };
    const detach = attachAutoPause(session);

    window.dispatchEvent(new Event('blur'));
    expect(session.pause).not.toHaveBeenCalled();

    detach();
  });

  it('detach() 후에는 visibilitychange가 더 이상 pause()를 부르지 않는다', () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    const session = { pause: vi.fn() };
    const detach = attachAutoPause(session);
    detach();

    fireVisibilityChange();
    expect(session.pause).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });
});
