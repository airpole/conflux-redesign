// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import { DEFAULT_SETTINGS } from '../core/core-settings.js';
import type { AudioEnv } from '../env/env-audio.js';
import { mountEditorTestBody, type EditorTestApi } from './scene-editor-test.js';
import { createEditorViewState } from './scene-editor-view.js';

/** scene-gameplay.test.ts의 fakeAudio()와 같은 최소 fake — jsdom엔
 *  AudioContext가 없다. */
function fakeAudio(): AudioEnv {
  const fakeCtx = {
    createBuffer: (channels: number, length: number, sampleRate: number) => ({
      getChannelData: () => new Float32Array(length),
      length,
      sampleRate,
      numberOfChannels: channels,
    }),
    createBufferSource: () => ({
      connect: () => {},
      start: () => {},
      stop: () => {},
      buffer: null,
    }),
    createGain: () => ({ connect: () => {}, gain: { value: 0 } }),
    destination: {},
    currentTime: 0,
  } as unknown as AudioContext;

  return {
    async decode() {
      throw new Error('not used in these tests');
    },
    play() {},
    stop() {},
    getPositionMs: () => null,
    setVolume() {},
    getContext: () => fakeCtx,
  };
}

function fireKey(key: string): boolean {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });
  return controllerOnKeyDown(event);
}

let controllerOnKeyDown: (event: KeyboardEvent) => boolean;

describe('scene-editor-test', () => {
  let target: HTMLElement;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function setup(overrides: Partial<EditorTestApi> = {}) {
    target = document.createElement('div');
    document.body.append(target);
    const chart = makeChart({ notes: [{ startTick: 0, duration: 0, lane: 1, isWide: false }] });
    const view = createEditorViewState();
    const onQuickOptionsChange = vi.fn();
    const onEnterGameplay = vi.fn();
    const api: EditorTestApi = {
      session: { chart, musicBlob: null },
      view,
      settings: DEFAULT_SETTINGS,
      audio: fakeAudio(),
      onQuickOptionsChange,
      onEnterGameplay,
      ...overrides,
    };
    const controller = mountEditorTestBody(target, chart, api);
    controllerOnKeyDown = (e) => controller.onKeyDown(e);
    return { controller, view, onQuickOptionsChange, onEnterGameplay, chart };
  }

  it('mount 시 idle canvas·scrollbar·quick options 패널이 있다', () => {
    setup();
    expect(target.querySelector('.editor-test-canvas')).not.toBeNull();
    expect(target.querySelector('.editor-scrollbar-track')).not.toBeNull();
    expect(target.querySelectorAll('.quick-options-row')).toHaveLength(5);
  });

  it('Enter는 host의 onEnterGameplay를 현재 scrollMs로 부른다(3초 lead-in은 host 몫)', () => {
    const { view, onEnterGameplay } = setup();
    view.scrollMs = 1234;
    const consumed = fireKey('Enter');
    expect(consumed).toBe(true);
    expect(onEnterGameplay).toHaveBeenCalledWith(1234);
  });

  it('idle일 때 Space는 이 파일이 가로챈다(즉시 재생 시작, consumed=true)', () => {
    setup();
    const consumed = fireKey(' ');
    expect(consumed).toBe(true);
  });

  it('quick options ↑↓/←→/Enter가 core-quick-options 상태를 그대로 반영한다', () => {
    const { onQuickOptionsChange } = setup();
    expect(fireKey('ArrowDown')).toBe(true); // scrollSpeed → gaugeMode row.
    expect(fireKey('ArrowRight')).toBe(true); // gaugeMode draft를 한 칸 step.
    expect(fireKey('Enter')).toBe(true); // 확정 — onQuickOptionsChange가 불린다.
    expect(onQuickOptionsChange).toHaveBeenCalledTimes(1);
    const applied = onQuickOptionsChange.mock.calls[0]![0];
    expect(applied.gaugeMode).not.toBe(DEFAULT_SETTINGS.gaugeMode);
  });

  it('destroy()는 에러 없이 정리한다', () => {
    const { controller } = setup();
    expect(() => controller.destroy()).not.toThrow();
    expect(target.querySelector('.editor-test-body')).toBeNull();
  });

  it('update()는 새 chart로 다시 그려도 크래시하지 않는다', () => {
    const { controller, chart } = setup();
    const next = { ...chart, notes: [] };
    expect(() => controller.update(next)).not.toThrow();
  });
});
