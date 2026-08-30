// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { attachPauseKeys } from './game-pause-keys.js';

function fire(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });
  document.dispatchEvent(event);
  return event;
}

describe('attachPauseKeys (D-2026-052 — Esc 전체화면 충돌과 Backspace 대체키)', () => {
  it('Escape와 Backspace 둘 다 pause()를 부른다', () => {
    const session = { pause: vi.fn() };
    const detach = attachPauseKeys(session);

    fire('Escape');
    fire('Backspace');
    expect(session.pause).toHaveBeenCalledTimes(2);

    detach();
  });

  it('다른 키는 무시한다(예: 곡 진행에 쓰이는 lane 키)', () => {
    const session = { pause: vi.fn() };
    const detach = attachPauseKeys(session);

    fire('KeyE');
    fire('Enter');
    expect(session.pause).not.toHaveBeenCalled();

    detach();
  });

  it('Escape/Backspace는 preventDefault된다 — keydown이 늦지 않게', () => {
    const session = { pause: vi.fn() };
    const detach = attachPauseKeys(session);

    const event = fire('Escape');
    expect(event.defaultPrevented).toBe(true);

    detach();
  });

  it('detach() 후에는 키 입력이 pause()를 부르지 않는다', () => {
    const session = { pause: vi.fn() };
    const detach = attachPauseKeys(session);
    detach();

    fire('Backspace');
    expect(session.pause).not.toHaveBeenCalled();
  });
});
