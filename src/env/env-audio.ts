/**
 * WebAudio 래핑 — decode·재생·정지·position·볼륨·히트음.
 *
 * 실패 모드: AudioContext가 `suspended`로 생성되는 브라우저(모바일 Samsung
 * Internet 등)에서 decode 전에 resume을 시도한다 `[보존]` (원본 `audio.js`
 * `initAud`/`loadAud`의 방어). resume이 실패해도 여기서 던지지 않는다 —
 * 호출측이 이후 재생 실패로 관찰한다.
 *
 * 히트음은 asset 파일이 아니라 **원본이 절차적으로 합성한 소리**다(사용자
 * 확인: "히트음 효과음은 계승해서 사용" — build-order §2 gate 해소). 원본
 * `audio.js`의 `AS.hitBuf` 생성식을 `createHitBuffer`로 그대로 옮겼다 `[보존]`
 * — 25ms 버퍼에 지수 감쇠(`exp(-t×160)`)를 두른 세 배음(2400/4200/1200Hz,
 * 가중치 0.35/0.15/0.1)의 합이다. 볼륨 3계통(master/music/hit) 분리는 아직
 * 없다 — `hitVol` 하나로만 조절한다(CTX 정본 seam 필드, `architecture` §3).
 */

export interface AudioEnv {
  decode(data: ArrayBuffer): Promise<AudioBuffer>;
  play(buffer: AudioBuffer, fromMs: number): void;
  stop(): void;
  getPositionMs(): number | null;
  setVolume(gain: number): void;
  /** 내부 `AudioContext`(없으면 이 호출로 만든다 — `decode`/`play`와 같은
   *  lazy-create). `playHitSound`/`createHitBuffer`가 raw context를 요구해
   *  (M4-5, `game-session.ts`의 `HitSoundSource`) 히트음이 음악과 같은
   *  context를 쓰게 하려면 노출이 필요하다 — 없으면 host가 별도
   *  `AudioContext`를 또 만들어야 해 낭비다. */
  getContext(): AudioContext;
}

export function createAudioEnv(createContext: () => AudioContext): AudioEnv {
  let ctx: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let gainNode: GainNode | null = null;
  let startCtxTime = 0;
  let startSec = 0;

  function ensureContext(): AudioContext {
    if (!ctx) ctx = createContext();
    return ctx;
  }

  function ensureGain(context: AudioContext): GainNode {
    if (!gainNode) {
      gainNode = context.createGain();
      gainNode.connect(context.destination);
    }
    return gainNode;
  }

  async function resumeIfSuspended(context: AudioContext): Promise<void> {
    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        // 복구 불가 — 조용히 넘어간다. 이후 decode/play가 그 결과로 실패한다.
      }
    }
  }

  return {
    async decode(data) {
      const context = ensureContext();
      await resumeIfSuspended(context);
      return context.decodeAudioData(data);
    },

    play(buffer, fromMs) {
      const context = ensureContext();
      if (source) {
        try {
          source.stop();
        } catch {
          // 이미 끝난 source의 stop()은 무시한다.
        }
      }
      source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(ensureGain(context));
      const startSecLocal = Math.max(0, fromMs / 1000);
      source.start(0, startSecLocal);
      startCtxTime = context.currentTime;
      startSec = startSecLocal;
    },

    stop() {
      if (source) {
        try {
          source.stop();
        } catch {
          // 이미 끝난 source의 stop()은 무시한다.
        }
      }
      source = null;
    },

    getPositionMs() {
      if (!ctx || !source) return null;
      return (startSec + (ctx.currentTime - startCtxTime)) * 1000;
    },

    setVolume(gain) {
      const context = ensureContext();
      ensureGain(context).gain.value = gain;
    },

    getContext() {
      return ensureContext();
    },
  };
}

/**
 * 원본 `audio.js` `initAud`의 `AS.hitBuf` 생성식 `[보존]`. 25ms, 모노,
 * `ctx.sampleRate` 그대로 — 리샘플링 없이 콘텍스트 표본율을 쓴다.
 */
export function createHitBuffer(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 0.025);
  const buffer = ctx.createBuffer(1, len, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const envelope = Math.exp(-t * 160);
    data[i] =
      envelope *
      (Math.sin(2 * Math.PI * 2400 * t) * 0.35 +
        Math.sin(2 * Math.PI * 4200 * t) * 0.15 +
        Math.sin(2 * Math.PI * 1200 * t) * 0.1) *
      0.8;
  }
  return buffer;
}

/**
 * 히트음 한 번 재생. `atCtxTime`이 없으면 지금 즉시(수동 판정, 원본
 * `playHit()`) — 있으면 그 `AudioContext.currentTime`에 스케줄된다(원본
 * `playHitAt(when)`, autoplay lookahead). 과거 시각이 오면 지금으로
 * 당긴다 `[보존]`(`Math.max(ctx.currentTime, when)`).
 *
 * `gain <= 0`이면 아무 것도 안 한다 — 매 판정마다 소스·게인 노드를 새로
 * 만드는 fire-and-forget이라, 무음일 땐 그 비용도 안 쓴다.
 */
export function playHitSound(
  ctx: AudioContext,
  buffer: AudioBuffer,
  gain: number,
  atCtxTime?: number,
): void {
  if (gain <= 0) return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(atCtxTime === undefined ? undefined : Math.max(ctx.currentTime, atCtxTime));
}
