/**
 * chart 저장 창(M5-8) — `Ctrl+S`. 단일 출처 `editor/editor-editing.md` §7
 * ("현재 chart를 새 version JSON 파일로 저장 — 저장 창 매번 표시")·
 * `_meta/persistence.md` §4(version 제안·검증 규칙, `edit-chart-save.ts`가
 * 이미 순수 로직으로 구현해 뒀다).
 *
 * 이 파일은 그 결정 로직(`proposeSaveVersion`/`isSaveVersionValid`) 위에
 * 얇은 폼 하나만 얹는다 — version 숫자 입력(제안값 프리필)·파일명 표시
 * (읽기전용)·Save/Cancel. 실제 파일 쓰기·`WorkspaceSession` 갱신은 host
 * (`app-main.ts`)가 `onConfirm(chosenVersion)`에서 한다 — 이 파일은
 * DOM과 입력값 읽기만 안다(다른 editor scene들과 같은 경계).
 *
 * host가 `showError(message)`를 부르면(예: `isSaveVersionValid` 실패) 폼을
 * 닫지 않고 인라인 에러만 보여준다 — 사용자가 값을 고쳐 다시 Save를 누를 수
 * 있게.
 */
import type { VersionProposal } from '../edit/edit-chart-save.js';
import './scene-editor-save.css';

export interface EditorSaveModalHandlers {
  onConfirm(chosenVersion: number): void;
  onCancel(): void;
}

export interface EditorSaveModalHandle {
  open(proposal: VersionProposal, suggestedFileName: string): void;
  showError(message: string): void;
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

export function mountEditorSaveModal(
  target: HTMLElement,
  handlers: EditorSaveModalHandlers,
): EditorSaveModalHandle {
  const overlay = el('div', 'editor-save-overlay');
  overlay.hidden = true;
  const panel = el('div', 'editor-save-panel');
  const title = el('div', 'editor-save-title');
  title.textContent = 'Save Chart';

  const versionRow = el('label', 'editor-save-row');
  versionRow.textContent = 'Version';
  const versionInput = el('input', 'editor-save-version');
  versionInput.type = 'number';
  versionRow.append(versionInput);

  const fileNameRow = el('div', 'editor-save-row');
  const fileNameLabel = el('span');
  fileNameLabel.textContent = 'File name';
  const fileNameValue = el('span', 'editor-save-filename');
  fileNameRow.append(fileNameLabel, fileNameValue);

  const errorEl = el('div', 'editor-save-error');
  errorEl.hidden = true;

  const buttons = el('div', 'editor-save-buttons');
  const saveBtn = el('button', 'editor-save-btn');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';
  const cancelBtn = el('button', 'editor-save-btn');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  buttons.append(saveBtn, cancelBtn);

  panel.append(title, versionRow, fileNameRow, errorEl, buttons);
  overlay.append(panel);
  target.append(overlay);

  saveBtn.addEventListener('click', () => {
    const chosen = Number(versionInput.value);
    handlers.onConfirm(chosen);
  });
  cancelBtn.addEventListener('click', () => handlers.onCancel());

  return {
    open(proposal, suggestedFileName): void {
      errorEl.hidden = true;
      versionInput.value = String(proposal.proposedVersion);
      fileNameValue.textContent = suggestedFileName;
      overlay.hidden = false;
      versionInput.focus();
      versionInput.select();
    },
    showError(message): void {
      errorEl.textContent = message;
      errorEl.hidden = false;
    },
    close(): void {
      overlay.hidden = true;
    },
  };
}
