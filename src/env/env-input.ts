/**
 * keydown/keyup 원시 수신 + timestamp, focus·visibility 신호, preventDefault 정책.
 *
 * 여기서 끝나는 것과 game으로 넘어가는 것의 경계: 이 층은 **어떤 lane에
 * 매핑되는지도, held 상태를 어떻게 복구하는지도 모른다.** 원본
 * `keyboard.js`의 blur 핸들러가 눌린 채로 남은 채널 집합을 순회해 stuck key를
 * 복구하는 것은 game 상태를 아는 정책이라 여기 없다 — env는 "focus를
 * 잃었다"는 신호만 올리고, 그 신호로 무엇을 할지는 game이 정한다.
 */

export interface RawKeyboardEvent {
  readonly code: string;
  readonly repeat: boolean;
  preventDefault(): void;
}

export interface KeyEvent {
  readonly code: string;
  readonly repeat: boolean;
  readonly timestampMs: number;
}

export interface KeyboardHost {
  now(): number;
  onKeyDown(listener: (e: RawKeyboardEvent) => void): () => void;
  onKeyUp(listener: (e: RawKeyboardEvent) => void): () => void;
  onFocusLost(listener: () => void): () => void;
  onVisibilityHidden(listener: () => void): () => void;
}

export interface KeyInputHandlers {
  onKeyDown(e: KeyEvent): void;
  onKeyUp(e: KeyEvent): void;
  onFocusLost(): void;
  onVisibilityHidden(): void;
}

export function bindKeyInput(
  host: KeyboardHost,
  handlers: KeyInputHandlers,
  shouldPreventDefault: (code: string) => boolean,
): () => void {
  const offDown = host.onKeyDown((e) => {
    if (shouldPreventDefault(e.code)) e.preventDefault();
    handlers.onKeyDown({ code: e.code, repeat: e.repeat, timestampMs: host.now() });
  });
  const offUp = host.onKeyUp((e) => {
    if (shouldPreventDefault(e.code)) e.preventDefault();
    handlers.onKeyUp({ code: e.code, repeat: e.repeat, timestampMs: host.now() });
  });
  const offBlur = host.onFocusLost(handlers.onFocusLost);
  const offVis = host.onVisibilityHidden(handlers.onVisibilityHidden);

  return () => {
    offDown();
    offUp();
    offBlur();
    offVis();
  };
}
