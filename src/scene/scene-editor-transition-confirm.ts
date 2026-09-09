/**
 * dirty 세션 전환 확인 창(W08) — `_meta/persistence.md` §5.
 *
 * editor에서 dirty 상태로 세션을 교체하거나 이탈할 때(Backspace/Esc로
 * mode-select 이탈이 이번 카드의 실제 경로 — Ctrl+O·새 난이도는 W18b/c)
 * 보여주는 최소 confirm 창이다. `edit-session-transition.ts`의
 * `resolveSessionTransition`은 이미 결정 로직을 갖고 있었지만 실제로
 * 선택을 물어볼 UI가 없어 `'cancel'`을 하드코딩해 왔다 — 이 파일이 그
 * 자리를 채운다.
 *
 * 이 파일은 사용자의 선택(`SessionTransitionChoice`)만 알린다 — 실제
 * 저장/폐기 실행은 host(`app-editor.ts`)가 `resolveSessionTransition`으로
 * 한다. `scene-editor-save.ts`와 같은 최소 트리트먼트를 그대로 따른다.
 */
import type { SessionTransitionChoice } from '../edit/edit-session-transition.js';
import './scene-editor-transition-confirm.css';

export interface TransitionConfirmHandlers {
  onChoice(choice: SessionTransitionChoice): void;
}

export interface TransitionConfirmHandle {
  open(): void;
  close(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

export function mountTransitionConfirmModal(
  target: HTMLElement,
  handlers: TransitionConfirmHandlers,
): TransitionConfirmHandle {
  const overlay = el('div', 'editor-transition-overlay');
  overlay.hidden = true;
  const panel = el('div', 'editor-transition-panel');
  const title = el('div', 'editor-transition-title');
  title.textContent = 'Unsaved Changes';
  const message = el('div', 'editor-transition-message');
  message.textContent = '저장하지 않은 변경이 있다. 어떻게 할까?';

  const buttons = el('div', 'editor-transition-buttons');
  const saveBtn = el('button', 'editor-transition-btn');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save New Version';
  const discardBtn = el('button', 'editor-transition-btn');
  discardBtn.type = 'button';
  discardBtn.textContent = 'Discard Changes';
  const cancelBtn = el('button', 'editor-transition-btn');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  buttons.append(saveBtn, discardBtn, cancelBtn);

  panel.append(title, message, buttons);
  overlay.append(panel);
  target.append(overlay);

  // 창이 열린 동안 중복 클릭이 선택을 두 번 알리지 않게 한다(AC "중복
  // 입력해도 전환·저장이 중복 실행되지 않음") — 첫 클릭이 곧바로
  // close()로 창을 닫으므로 hidden 상태에서의 재클릭은 자연히 막힌다.
  saveBtn.addEventListener('click', () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    handlers.onChoice('saveNewVersion');
  });
  discardBtn.addEventListener('click', () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    handlers.onChoice('discardChanges');
  });
  cancelBtn.addEventListener('click', () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    handlers.onChoice('cancel');
  });

  return {
    open(): void {
      overlay.hidden = false;
    },
    close(): void {
      overlay.hidden = true;
    },
  };
}
