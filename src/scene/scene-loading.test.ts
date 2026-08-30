// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOADING_INDICATOR_DELAY_MS } from '../core/core-constants.js';
import { mountLoadingIndicator } from './scene-loading.js';

describe('mountLoadingIndicator (scene.md §9, core/constants.md §8)', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.append(target);
    vi.useFakeTimers();
  });

  afterEach(() => {
    target.remove();
    vi.useRealTimers();
  });

  function indicatorEl(): HTMLElement {
    return target.querySelector('.loading-indicator')!;
  }

  it('임계(LOADING_INDICATOR_DELAY_MS) 전에는 숨겨져 있다', () => {
    const handle = mountLoadingIndicator(target);
    handle.start();

    vi.advanceTimersByTime(LOADING_INDICATOR_DELAY_MS - 1);
    expect(indicatorEl().hidden).toBe(true);

    handle.destroy();
  });

  it('임계를 넘기면 표시가 뜬다', () => {
    const handle = mountLoadingIndicator(target);
    handle.start();

    vi.advanceTimersByTime(LOADING_INDICATOR_DELAY_MS);
    expect(indicatorEl().hidden).toBe(false);

    handle.destroy();
  });

  it('임계 전에 stop()하면 뜨지 않는다(빠른 작업은 깜빡이지 않는다)', () => {
    const handle = mountLoadingIndicator(target);
    handle.start();
    vi.advanceTimersByTime(LOADING_INDICATOR_DELAY_MS - 1);
    handle.stop();

    vi.advanceTimersByTime(1000);
    expect(indicatorEl().hidden).toBe(true);

    handle.destroy();
  });

  it('뜬 뒤 stop()하면 다시 숨는다', () => {
    const handle = mountLoadingIndicator(target);
    handle.start();
    vi.advanceTimersByTime(LOADING_INDICATOR_DELAY_MS);
    expect(indicatorEl().hidden).toBe(false);

    handle.stop();
    expect(indicatorEl().hidden).toBe(true);

    handle.destroy();
  });

  it('커스텀 delayMs를 받는다', () => {
    const handle = mountLoadingIndicator(target, 50);
    handle.start();

    vi.advanceTimersByTime(49);
    expect(indicatorEl().hidden).toBe(true);
    vi.advanceTimersByTime(1);
    expect(indicatorEl().hidden).toBe(false);

    handle.destroy();
  });

  it('destroy()는 DOM에서 지운다', () => {
    const handle = mountLoadingIndicator(target);
    handle.destroy();
    expect(target.querySelector('.loading-indicator')).toBeNull();
  });
});
