import { describe, expect, it, vi } from 'vitest';
import { createAudioEnv } from './env-audio.js';

function fakeGain() {
  return { gain: { value: 1 }, connect: vi.fn() };
}

function fakeSource() {
  return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

function fakeContext(initialState: 'running' | 'suspended') {
  let state = initialState;
  let currentTime = 0;
  const resume = vi.fn(async () => {
    state = 'running';
  });
  return {
    get state() {
      return state;
    },
    get currentTime() {
      return currentTime;
    },
    setCurrentTime(t: number) {
      currentTime = t;
    },
    destination: {},
    resume,
    decodeAudioData: vi.fn(async (data: ArrayBuffer) => ({
      duration: 1,
      byteLength: (data as ArrayBuffer).byteLength,
    })),
    createBufferSource: vi.fn(fakeSource),
    createGain: vi.fn(fakeGain),
  };
}

describe('env-audio 계약', () => {
  it('AudioContext가 suspended로 생성되면 decode 전에 resume을 시도한다', async () => {
    const ctx = fakeContext('suspended');
    const env = createAudioEnv(() => ctx as unknown as AudioContext);

    await env.decode(new ArrayBuffer(4));

    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('resume이 실패해도 decode 호출 자체는 던지지 않는다', async () => {
    const ctx = fakeContext('suspended');
    ctx.resume.mockRejectedValueOnce(new Error('resume 거부'));
    const env = createAudioEnv(() => ctx as unknown as AudioContext);

    await expect(env.decode(new ArrayBuffer(4))).resolves.toBeDefined();
  });

  it('running 상태에서는 resume을 부르지 않는다', async () => {
    const ctx = fakeContext('running');
    const env = createAudioEnv(() => ctx as unknown as AudioContext);

    await env.decode(new ArrayBuffer(4));

    expect(ctx.resume).not.toHaveBeenCalled();
  });

  it('play 전에는 position이 null이다', () => {
    const ctx = fakeContext('running');
    const env = createAudioEnv(() => ctx as unknown as AudioContext);

    expect(env.getPositionMs()).toBeNull();
  });

  it('play 이후 position이 fromMs 기준으로 흐른다', () => {
    const ctx = fakeContext('running');
    const env = createAudioEnv(() => ctx as unknown as AudioContext);
    const buffer = {} as AudioBuffer;

    ctx.setCurrentTime(10);
    env.play(buffer, 500);
    ctx.setCurrentTime(11);

    expect(env.getPositionMs()).toBeCloseTo(1500, 5);
  });

  it('연달아 play하면 이전 source를 정지시킨다', () => {
    const ctx = fakeContext('running');
    const env = createAudioEnv(() => ctx as unknown as AudioContext);
    const buffer = {} as AudioBuffer;

    env.play(buffer, 0);
    const firstSource = ctx.createBufferSource.mock.results[0]?.value;
    env.play(buffer, 0);

    expect(firstSource.stop).toHaveBeenCalledTimes(1);
  });

  it('stop 이후 source가 없는 것으로 간주해 position이 다시 null이다', () => {
    const ctx = fakeContext('running');
    const env = createAudioEnv(() => ctx as unknown as AudioContext);
    const buffer = {} as AudioBuffer;

    env.play(buffer, 0);
    env.stop();

    expect(env.getPositionMs()).toBeNull();
  });
});
