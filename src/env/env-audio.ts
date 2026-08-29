/**
 * WebAudio 래핑 — decode·재생·정지·position·볼륨.
 *
 * 실패 모드: AudioContext가 `suspended`로 생성되는 브라우저(모바일 Samsung
 * Internet 등)에서 decode 전에 resume을 시도한다 `[보존]` (원본 `audio.js`
 * `initAud`/`loadAud`의 방어). resume이 실패해도 여기서 던지지 않는다 —
 * 호출측이 이후 재생 실패로 관찰한다.
 *
 * 히트음 스케줄링(`playHitAt` lookahead)과 볼륨 3계통(master/music/hit) 분리는
 * 이 값이 실제로 쓰이는 판정 결선 시점(M2-4)으로 미룬다 — D-2026-046과 같은
 * 이유로, 재는 시점과 쓰는 시점을 붙인다.
 */

export interface AudioEnv {
  decode(data: ArrayBuffer): Promise<AudioBuffer>;
  play(buffer: AudioBuffer, fromMs: number): void;
  stop(): void;
  getPositionMs(): number | null;
  setVolume(gain: number): void;
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
  };
}
