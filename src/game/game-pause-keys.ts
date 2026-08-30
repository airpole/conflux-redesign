/**
 * gameplay의 Esc/Backspace → pause 바인딩 — `scene.md` §9, D-2026-052.
 *
 * 전체화면 중에는 Esc가 브라우저의 전체화면 탈출 단축키로 예약되어 앱에
 * 도달하지 않고 `preventDefault()`로도 막을 수 없다(D-2026-052) — 그래서
 * Escape가 안 먹는 상황이 정상이고, **Backspace**가 실제로 기댈 수 있는
 * 대체키다. 둘 다 등록하는 건 비전체화면일 때 Esc도 자연스럽게 동작하게
 * 두기 위해서이지, Esc가 항상 통한다고 가정해서가 아니다.
 */

import type { Pausable } from './game-visibility.js';

export function attachPauseKeys(session: Pausable, doc: Document = document): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' && event.key !== 'Backspace') return;
    event.preventDefault();
    session.pause();
  };
  doc.addEventListener('keydown', onKeyDown);
  return () => doc.removeEventListener('keydown', onKeyDown);
}
