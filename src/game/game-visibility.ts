/**
 * 탭 백그라운드 auto-pause — `scene.md` §9: "탭이 백그라운드로 전환되면
 * (`visibilitychange` hidden) gameplay는 자동으로 pause overlay를 연다.
 * 창 포커스만 잃은 경우(blur)에는 pause하지 않는다."
 *
 * `blur`를 듣지 않는 것이 핵심이다 — devtools를 열거나 다른 창을 클릭해도
 * `blur`는 뜨지만 탭 자체는 여전히 보이므로 그건 pause 대상이 아니다.
 * `document.hidden`만 판정 기준이다.
 */

export interface Pausable {
  pause(): void;
}

/** `session.pause()`는 이미 끝났거나 이미 pause 상태면 아무 일도 안 한다(멱등, `game-engine.ts`). */
export function attachAutoPause(session: Pausable, doc: Document = document): () => void {
  const onVisibilityChange = (): void => {
    if (doc.hidden) session.pause();
  };
  doc.addEventListener('visibilitychange', onVisibilityChange);
  return () => doc.removeEventListener('visibilitychange', onVisibilityChange);
}
