/**
 * 탭 백그라운드·창 focus 상실 auto-pause — `scene.md` §9: "탭이 백그라운드로
 * 전환되면(`visibilitychange` hidden) gameplay는 자동으로 pause overlay를
 * 연다."
 *
 * `visibilitychange`(탭이 실제로 안 보임)는 **항상** pause한다 — 이 값은
 * 설정과 무관한 정본 동작이다(원래 D-2026-052/M2-7이 정한 그대로).
 *
 * `blur`(창 focus 상실, 탭은 계속 보임 — devtools를 열거나 다른 창을
 * 클릭해도 뜬다)는 `Settings.pauseOnBlur`가 켜졌을 때만 pause한다
 * (D-2026-089, 기본값 `true`) — **M2-7이 "blur는 pause 대상이 아니다"라고
 * 판단한 근거(devtools 오탐)를 뒤집는 결정이다**: 기본값을 켜두면 devtools를
 * 여는 것도 이제 pause를 유발하지만, 플레이어 보호(자리를 비우거나 다른
 * 창을 봐도 진행 중인 판이 안전하게 멈춘다)가 개발 편의보다 우선한다고
 * 판단했다 — 개발자는 이 설정을 끄면 devtools-safe 동작으로 쉽게 되돌릴 수
 * 있어 트레이드오프가 비대칭적으로 싸다. 자세한 근거는 DECISION_LOG
 * D-2026-089.
 */

export interface Pausable {
  pause(): void;
}

/**
 * `session.pause()`는 이미 끝났거나 이미 pause 상태면 아무 일도 안 한다
 * (멱등, `game-engine.ts`). `pauseOnBlur`(기본 `false`, 호출측이
 * `Settings.pauseOnBlur`를 명시적으로 넘긴다 — 이 함수 자체는 settings를
 * 모른다)가 `true`일 때만 `blur`도 pause를 유발한다.
 */
export function attachAutoPause(
  session: Pausable,
  pauseOnBlur = false,
  doc: Document = document,
  win: Window = window,
): () => void {
  const onVisibilityChange = (): void => {
    if (doc.hidden) session.pause();
  };
  const onBlur = (): void => {
    if (pauseOnBlur) session.pause();
  };
  doc.addEventListener('visibilitychange', onVisibilityChange);
  win.addEventListener('blur', onBlur);
  return () => {
    doc.removeEventListener('visibilitychange', onVisibilityChange);
    win.removeEventListener('blur', onBlur);
  };
}
