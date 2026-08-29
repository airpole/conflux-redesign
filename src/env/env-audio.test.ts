import { describe, expect, it, vi } from 'vitest';
import { createAudioEnv, createHitBuffer, playHitSound } from './env-audio.js';

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

function fakeBufferCtx(sampleRate: number) {
  return {
    sampleRate,
    createBuffer: vi.fn((_channels: number, length: number, sr: number) => {
      const data = new Float32Array(length);
      return {
        getChannelData: () => data,
        length,
        sampleRate: sr,
      };
    }),
  };
}

describe('createHitBuffer', () => {
  it('sampleRate × 25ms 길이의 모노 버퍼를 만든다', () => {
    const ctx = fakeBufferCtx(44100);
    const buffer = createHitBuffer(ctx as unknown as AudioContext);
    expect(ctx.createBuffer).toHaveBeenCalledWith(1, Math.floor(44100 * 0.025), 44100);
    expect(buffer.length).toBe(Math.floor(44100 * 0.025));
  });

  it('앞쪽 절반이 뒤쪽 절반보다 진폭이 크다(지수 감쇠)', () => {
    const ctx = fakeBufferCtx(44100);
    const buffer = createHitBuffer(ctx as unknown as AudioContext);
    const data = buffer.getChannelData(0) as Float32Array;
    const half = Math.floor(data.length / 2);
    const maxOf = (arr: Float32Array) => Math.max(...Array.from(arr, Math.abs));
    const firstHalfMax = maxOf(data.subarray(0, half));
    const secondHalfMax = maxOf(data.subarray(half));
    expect(firstHalfMax).toBeGreaterThan(secondHalfMax);
  });

  it('무음(전부 0)이 아니다', () => {
    const ctx = fakeBufferCtx(44100);
    const buffer = createHitBuffer(ctx as unknown as AudioContext);
    const data = buffer.getChannelData(0) as Float32Array;
    expect(data.some((v) => v !== 0)).toBe(true);
  });
});

describe('playHitSound', () => {
  it('gain이 0 이하면 아무 것도 안 한다', () => {
    const ctx = fakeContext('running');
    playHitSound(ctx as unknown as AudioContext, {} as AudioBuffer, 0);
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it('atCtxTime 없으면 즉시(인자 없이) start한다', () => {
    const ctx = fakeContext('running');
    playHitSound(ctx as unknown as AudioContext, {} as AudioBuffer, 1);
    const source = ctx.createBufferSource.mock.results[0]!.value;
    expect(source.start).toHaveBeenCalledWith(undefined);
  });

  it('atCtxTime이 미래면 그 시각에 스케줄한다', () => {
    const ctx = fakeContext('running');
    ctx.setCurrentTime(5);
    playHitSound(ctx as unknown as AudioContext, {} as AudioBuffer, 1, 10);
    const source = ctx.createBufferSource.mock.results[0]!.value;
    expect(source.start).toHaveBeenCalledWith(10);
  });

  it('atCtxTime이 과거면 지금 시각으로 당긴다', () => {
    const ctx = fakeContext('running');
    ctx.setCurrentTime(5);
    playHitSound(ctx as unknown as AudioContext, {} as AudioBuffer, 1, 1);
    const source = ctx.createBufferSource.mock.results[0]!.value;
    expect(source.start).toHaveBeenCalledWith(5);
  });

  it('gain 값을 게인 노드에 싣는다', () => {
    const ctx = fakeContext('running');
    playHitSound(ctx as unknown as AudioContext, {} as AudioBuffer, 0.7);
    const gainNode = ctx.createGain.mock.results[0]!.value;
    expect(gainNode.gain.value).toBe(0.7);
  });
});
