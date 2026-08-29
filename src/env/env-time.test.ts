import { describe, expect, it, vi } from 'vitest';
import { startFrameLoop } from './env-time.js';
import type { TimeLoopHost } from './env-time.js';

function fakeTimeHost(): TimeLoopHost & { fire(nowMs: number): void } {
  let pending: ((nowMs: number) => void) | null = null;
  let nextId = 1;
  const cancelled = new Set<number>();
  return {
    requestAnimationFrame: (cb) => {
      pending = cb;
      return nextId++;
    },
    cancelAnimationFrame: (id) => {
      cancelled.add(id);
    },
    fire: (nowMs) => {
      const cb = pending;
      pending = null;
      cb?.(nowMs);
    },
  };
}

describe('env-time frameCap 계약', () => {
  it('frameCap 0이면 매 프레임을 그대로 통과시킨다', () => {
    const host = fakeTimeHost();
    const onFrame = vi.fn();
    startFrameLoop(host, 0, onFrame);

    host.fire(0);
    host.fire(1);
    host.fire(2);

    expect(onFrame).toHaveBeenCalledTimes(3);
  });

  it('frameCap 30이면 33.3ms 안의 연속 프레임을 걸러낸다', () => {
    const host = fakeTimeHost();
    const onFrame = vi.fn();
    startFrameLoop(host, 30, onFrame);

    host.fire(0);
    host.fire(10);
    host.fire(20);
    host.fire(40);

    expect(onFrame).toHaveBeenCalledTimes(2);
    expect(onFrame.mock.calls.map((c) => c[0])).toEqual([0, 40]);
  });

  it('stop 이후에는 다음 rAF 콜백이 잡혀도 onFrame을 부르지 않는다', () => {
    const host = fakeTimeHost();
    const onFrame = vi.fn();
    const stop = startFrameLoop(host, 0, onFrame);

    stop();
    host.fire(100);

    expect(onFrame).not.toHaveBeenCalled();
  });

  it('stop이 cancelAnimationFrame을 부른다', () => {
    const host = fakeTimeHost();
    const cancelSpy = vi.spyOn(host, 'cancelAnimationFrame');
    const stop = startFrameLoop(host, 0, vi.fn());

    stop();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
