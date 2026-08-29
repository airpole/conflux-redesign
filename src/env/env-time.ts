/**
 * rAF 루프 + `frameCap`.
 *
 * 원본 `settings.js`는 `frameCap`(0/30/60)을 필드로 두지만 어디서도 소비하지
 * 않는다 — rAF는 항상 무제한으로 돈다(`play.js` `requestAnimationFrame`).
 * `frameCap`을 실제로 적용하는 이 구현은 `[신규]`다: `_plan/architecture.md`
 * §1이 이미 `env-time`의 소관으로 명문화했으므로 새 제품 결정이 아니라
 * 명세가 원본의 미완성을 메우는 자리다.
 *
 * 실패 모드: `frameCap === 0`이면 매 rAF 콜백을 그대로 통과시킨다(무제한).
 * 0이 아니면 마지막 실행 이후 `1000/frameCap`ms가 지난 프레임만 통과시킨다.
 */

import type { FrameCap } from '../core/core-settings.js';

export interface TimeLoopHost {
  requestAnimationFrame(callback: (nowMs: number) => void): number;
  cancelAnimationFrame(id: number): void;
}

export function startFrameLoop(
  host: TimeLoopHost,
  frameCap: FrameCap,
  onFrame: (nowMs: number) => void,
): () => void {
  const minIntervalMs = frameCap > 0 ? 1000 / frameCap : 0;
  let rafId: number;
  let lastMs = -Infinity;
  let running = true;

  function tick(nowMs: number): void {
    if (!running) return;
    if (nowMs - lastMs >= minIntervalMs) {
      lastMs = nowMs;
      onFrame(nowMs);
    }
    rafId = host.requestAnimationFrame(tick);
  }

  rafId = host.requestAnimationFrame(tick);

  return () => {
    running = false;
    host.cancelAnimationFrame(rafId);
  };
}
