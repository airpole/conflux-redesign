import { describe, expect, it, vi } from 'vitest';
import { isFullscreen, resizeCanvas, toggleFullscreen, watchResize } from './env-canvas.js';
import type { ResizeWatchHost, FullscreenHost } from './env-canvas.js';

function fakeCanvas() {
  return { width: 0, height: 0, style: { width: '', height: '' } };
}

describe('resizeCanvas 계약', () => {
  it('폭·높이가 1px 미만이면 아무 것도 하지 않는다', () => {
    const canvas = fakeCanvas();
    resizeCanvas(canvas as unknown as HTMLCanvasElement, 0, 500, 2);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('DPR을 곱해 픽셀 크기를 정하고 style은 CSS px로 둔다', () => {
    const canvas = fakeCanvas();
    resizeCanvas(canvas as unknown as HTMLCanvasElement, 300, 150, 2);
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(300);
    expect(canvas.style.width).toBe('300px');
    expect(canvas.style.height).toBe('150px');
  });
});

function fakeResizeHost(): ResizeWatchHost & { fireResize(): void } {
  let listener: (() => void) | null = null;
  const timers = new Map<number, () => void>();
  let nextId = 1;
  return {
    addEventListener: (_type, l) => {
      listener = l;
    },
    removeEventListener: () => {
      listener = null;
    },
    setTimeout: (cb) => {
      const id = nextId++;
      timers.set(id, cb);
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id);
    },
    fireResize: () => {
      listener?.();
      for (const cb of timers.values()) cb();
      timers.clear();
    },
  };
}

describe('watchResize 계약', () => {
  it('resize 신호가 오면 두 타이머 모두 onSettled를 부른다', () => {
    const host = fakeResizeHost();
    const onSettled = vi.fn();
    watchResize(host, onSettled);

    host.fireResize();

    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe 이후에는 이벤트를 받지 않는다', () => {
    const host = fakeResizeHost();
    const onSettled = vi.fn();
    const unsubscribe = watchResize(host, onSettled);
    unsubscribe();

    host.fireResize();

    expect(onSettled).not.toHaveBeenCalled();
  });
});

function fakeFullscreenHost(initial: Element | null = null): FullscreenHost & {
  setElement(el: Element | null): void;
} {
  let el = initial;
  return {
    get fullscreenElement() {
      return el;
    },
    requestFullscreen: vi.fn(async (target: Element) => {
      el = target;
    }),
    exitFullscreen: vi.fn(async () => {
      el = null;
    }),
    setElement(target) {
      el = target;
    },
  };
}

describe('fullscreen 계약', () => {
  it('fullscreenElement가 없으면 isFullscreen이 false다', () => {
    const host = fakeFullscreenHost();
    expect(isFullscreen(host)).toBe(false);
  });

  it('진입 상태가 아니면 toggle이 requestFullscreen을 부른다', async () => {
    const host = fakeFullscreenHost();
    const el = {} as Element;
    await toggleFullscreen(host, el);
    expect(host.requestFullscreen).toHaveBeenCalledWith(el);
  });

  it('이미 진입 상태면 toggle이 exitFullscreen을 부른다', async () => {
    const el = {} as Element;
    const host = fakeFullscreenHost(el);
    await toggleFullscreen(host, el);
    expect(host.exitFullscreen).toHaveBeenCalledTimes(1);
  });
});
