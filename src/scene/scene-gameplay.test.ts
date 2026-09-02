// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import { DEFAULT_SETTINGS } from '../core/core-settings.js';
import type { AudioEnv } from '../env/env-audio.js';
import { mountGameplayScene, type GameplayStartInput } from './scene-gameplay.js';

/** jsdom엔 `AudioContext`가 없다 — `createHitBuffer`/`playHitSound`가
 *  요구하는 raw context 인자만 채우는 최소 fake. 실제로 호출되지 않게
 *  `hitVol`을 0으로 둔 `DEFAULT_SETTINGS`가 아니므로, 대신 `AudioBuffer`가
 *  필요한 지점(`createBuffer`)만 스텁한다. */
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

function fakeInput(overrides: Partial<GameplayStartInput> = {}): GameplayStartInput {
  return {
    chart: makeChart(),
    musicBuffer: null,
    settings: DEFAULT_SETTINGS,
    jacket: null,
    ...overrides,
  };
}

async function tick(): Promise<void> {
  // jsdom의 requestAnimationFrame이 실제로 한 번 콜백을 돌 때까지 기다린다
  // — startFrameLoop이 rAF로 도는 실제 루프라 fake timer가 아니라 실제
  // 프레임 하나를 기다려야 pause overlay 같은 draw()-driven 상태가 갱신된다.
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

describe('scene-gameplay', () => {
  let target: HTMLElement;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function setup() {
    target = document.createElement('div');
    document.body.append(target);
    const onFinished = vi.fn();
    const onExit = vi.fn();
    const handle = mountGameplayScene(target, fakeAudio(), { onFinished, onExit });
    return { handle, onFinished, onExit };
  }

  it('mount 시점에는 숨김 상태이고 canvas·pause overlay가 있다', () => {
    setup();
    const root = target.querySelector('.gameplay-scene') as HTMLElement;
    expect(root.hidden).toBe(true);
    expect(target.querySelector('.gameplay-canvas')).not.toBeNull();
    expect((target.querySelector('.pause-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('show()/hide()가 화면을 토글한다', () => {
    const { handle } = setup();
    handle.show();
    expect((target.querySelector('.gameplay-scene') as HTMLElement).hidden).toBe(false);
    handle.hide();
    expect((target.querySelector('.gameplay-scene') as HTMLElement).hidden).toBe(true);
  });

  it('start()가 pause overlay를 hidden 상태로 둔 채 세션을 만든다(2d context 없는 jsdom에서도 크래시하지 않는다)', () => {
    const { handle } = setup();
    handle.show();
    expect(() => handle.start(fakeInput())).not.toThrow();
    expect((target.querySelector('.pause-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('Escape가 세션을 pause하고, 한 프레임 뒤 pause overlay가 뜬다(§9)', async () => {
    const { handle } = setup();
    handle.show();
    handle.start(fakeInput());

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await tick();

    expect((target.querySelector('.pause-overlay') as HTMLElement).hidden).toBe(false);
  });

  it('canvas pause 아이콘 클릭이 pause overlay를 연다(M4.5-1)', async () => {
    const { handle } = setup();
    const root = target;
    handle.show();
    handle.start(fakeInput());

    const canvas = root.querySelector('.gameplay-canvas') as HTMLCanvasElement;
    canvas.width = 1600;
    canvas.height = 900;
    canvas.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: 1600,
        height: 900,
        right: 1600,
        bottom: 900,
      }) as DOMRect;

    // pause 아이콘은 playfield 좌상단 cell(gw/16) 안 — rect.gx+5, rect.gy+5는
    // 항상 그 영역 안이다(letterbox 여백보다 작다는 보장은 없지만 16:9
    // 캔버스라 gx=0이라 5,5는 확실히 cell 안).
    canvas.dispatchEvent(new MouseEvent('click', { clientX: 5, clientY: 5, bubbles: true }));
    await tick();

    expect((target.querySelector('.pause-overlay') as HTMLElement).hidden).toBe(false);
  });

  it('canvas의 pause 아이콘 밖을 클릭해도 pause되지 않는다', async () => {
    const { handle } = setup();
    const root = target;
    handle.show();
    handle.start(fakeInput());

    const canvas = root.querySelector('.gameplay-canvas') as HTMLCanvasElement;
    canvas.width = 1600;
    canvas.height = 900;
    canvas.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: 1600,
        height: 900,
        right: 1600,
        bottom: 900,
      }) as DOMRect;

    canvas.dispatchEvent(new MouseEvent('click', { clientX: 800, clientY: 450, bubbles: true }));
    await tick();

    expect((target.querySelector('.pause-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('Resume 버튼 클릭이 크래시 없이 카운트다운을 시작한다(정확한 재개 타이밍은 game-engine.test.ts가 단위 검증한다)', async () => {
    const { handle } = setup();
    handle.show();
    handle.start(fakeInput());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await tick();
    expect((target.querySelector('.pause-overlay') as HTMLElement).hidden).toBe(false);

    expect(() => (target.querySelector('.pause-btn') as HTMLButtonElement).click()).not.toThrow();
    await tick();
    // RESUME_LEAD_MS 카운트다운 중이라(`game-engine.ts`) 아직 paused 취급 —
    // resume() 직후 곧바로 풀리지 않는다.
    expect((target.querySelector('.pause-overlay') as HTMLElement).hidden).toBe(false);
  });

  it('settings.pauseOnBlur가 true(기본값)면 blur가 pause overlay를 연다(D-2026-089)', async () => {
    const { handle } = setup();
    handle.show();
    handle.start(fakeInput()); // DEFAULT_SETTINGS.pauseOnBlur === true

    window.dispatchEvent(new Event('blur'));
    await tick();

    expect((target.querySelector('.pause-overlay') as HTMLElement).hidden).toBe(false);
  });

  it('settings.pauseOnBlur가 false면 blur만으로는 pause overlay가 안 뜬다', async () => {
    const { handle } = setup();
    handle.show();
    handle.start(fakeInput({ settings: { ...DEFAULT_SETTINGS, pauseOnBlur: false } }));

    window.dispatchEvent(new Event('blur'));
    await tick();

    expect((target.querySelector('.pause-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('Exit 버튼 클릭이 onExit을 부른다(§9 "Exit: song-select")', () => {
    const { handle, onExit } = setup();
    handle.show();
    handle.start(fakeInput());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const buttons = target.querySelectorAll('.pause-btn');
    (buttons[2] as HTMLButtonElement).click(); // Resume/Retry/Exit 순서 중 Exit
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('hide()가 진행 중인 세션을 정리한다(다시 show()해도 크래시하지 않는다)', () => {
    const { handle } = setup();
    handle.show();
    handle.start(fakeInput());
    expect(() => handle.hide()).not.toThrow();
    expect(() => handle.show()).not.toThrow();
  });
});
