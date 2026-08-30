/**
 * 로딩 표시 — `scene.md` §9: "`.cfx` decode·음원 로드 등 비동기 작업이
 * `LOADING_INDICATOR_DELAY_MS`를 넘기면 로딩 표시를 낸다." 임계값은
 * `core/constants.md` §8이 단일 출처다.
 *
 * 이 모듈은 특정 비동기 호출부(음원 decode 등)에 배선돼 있지 않다 — M2는
 * chart를 고정 입력으로 받아(파일 로드 host가 아직 없음, [[build-order]] §5),
 * 그 배선을 붙일 자리 자체가 이 milestone에 없다. 여기서는 표시 컴포넌트와
 * "지연 넘으면 뜬다"는 계약만 만든다 — 호출측이 붙을 때 `start`/`stop`을
 * 감싸는 자리가 된다.
 */

import { LOADING_INDICATOR_DELAY_MS } from '../core/core-constants.js';

export interface LoadingIndicatorHandle {
  /** 비동기 작업 시작 — `delayMs`가 지나도 `stop()`이 안 불리면 표시를 낸다. */
  start(): void;
  /** 작업 종료 — 아직 안 떴으면 타이머만 취소하고, 떴으면 숨긴다. */
  stop(): void;
  destroy(): void;
}

export function mountLoadingIndicator(
  target: HTMLElement,
  delayMs: number = LOADING_INDICATOR_DELAY_MS,
): LoadingIndicatorHandle {
  const el = document.createElement('div');
  el.className = 'loading-indicator';
  el.hidden = true;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = 'Loading…';
  target.append(el);

  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    start(): void {
      clearTimer(); // 겹친 start()는 이전 타이머를 대체한다 — 재는 시점을 새로 잡는다.
      timer = setTimeout(() => {
        timer = null;
        el.hidden = false;
      }, delayMs);
    },
    stop(): void {
      clearTimer();
      el.hidden = true;
    },
    destroy(): void {
      clearTimer();
      el.remove();
    },
  };
}
