/**
 * canvas 크기·DPR 보정, resize 이벤트 debounce.
 *
 * 실패 모드: layout 계산이 아직 안 끝난 프레임(부모 요소 크기가 0)에서
 * `resizeCanvas`를 부르면 canvas 크기가 0으로 굳는다 — 폭·높이가 1px 미만이면
 * 아무 것도 하지 않는다 `[보존]` (원본 `canvas-resize.js` `rszActiveCanvas`).
 *
 * resize debounce는 **2단계**다 `[보존]` — orientation 전환 중 Samsung
 * Internet이 `resize`를 전환 도중에도 쏘므로, 한 번만 debounce하면 잘못된
 * 순간을 샘플링할 수 있다. 100ms/320ms 두 번 확정한다.
 */

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): void {
  if (cssWidth < 1 || cssHeight < 1) return;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
}

export interface ResizeWatchHost {
  addEventListener(type: 'resize', listener: () => void): void;
  removeEventListener(type: 'resize', listener: () => void): void;
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export function watchResize(host: ResizeWatchHost, onSettled: () => void): () => void {
  let timer1: number | null = null;
  let timer2: number | null = null;

  const listener = () => {
    if (timer1 !== null) host.clearTimeout(timer1);
    if (timer2 !== null) host.clearTimeout(timer2);
    timer1 = host.setTimeout(() => {
      timer1 = null;
      onSettled();
    }, 100);
    timer2 = host.setTimeout(() => {
      timer2 = null;
      onSettled();
    }, 320);
  };

  host.addEventListener('resize', listener);
  return () => {
    if (timer1 !== null) host.clearTimeout(timer1);
    if (timer2 !== null) host.clearTimeout(timer2);
    host.removeEventListener('resize', listener);
  };
}

/**
 * fullscreen 진입/이탈 원시 토글과 상태 조회만 맡는다. 전환 중 재조정(canvas
 * 재계산, play 세션과의 정합)은 게임 상태를 알아야 하는 정책이라 env가 아니라
 * 호스트(game/edit)의 몫이다 — 원본 `fullscreen.js`의 `onFullscreenChange`는
 * `PS.playFullscreen`·`PS.playActive`를 직접 읽어 이 둘이 뒤섞여 있었다.
 */
export interface FullscreenHost {
  readonly fullscreenElement: Element | null;
  requestFullscreen(el: Element): Promise<void>;
  exitFullscreen(): Promise<void>;
}

export function isFullscreen(host: FullscreenHost): boolean {
  return host.fullscreenElement !== null;
}

export function toggleFullscreen(host: FullscreenHost, el: Element): Promise<void> {
  return isFullscreen(host) ? host.exitFullscreen() : host.requestFullscreen(el);
}
